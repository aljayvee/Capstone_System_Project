import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase/config";
import {
  ensureRealtimeSession,
  onRealtimeAuthChange,
  realtimeAuthState,
  type RealtimeAuthState,
} from "../firebase/realtimeSession";
import {
  apiService,
  type ApiRider,
  type RiderAvailabilityState,
  type ApiRiderStatus,
  type RiderImpediment,
} from "../services/apiService";
import {
  ACTIVE_DELIVERY_INTERVAL_MS,
  IDLE_INTERVAL_MS,
  STALE_GRACE_MULTIPLIER,
  SIGNAL_LOST_THRESHOLD_MS,
  PLOT_HIDE_AFTER_MS,
  RiderPresenceState,
  RIDER_STATUS_THEMES,
} from "../constants/riderPresence";
import { getMemoryAccessToken, onMemoryAccessTokenChange } from "../services/apiClient";

export { RIDER_STATUS_THEMES };
export type { RiderPresenceState };

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

/**
 * How often the authoritative roster is re-fetched.
 *
 * This carries the presence state now, not just names, so the cadence has to be
 * short enough that the map is never far behind the server's own view. The
 * server declares SIGNAL_LOST after 2.5 missed beacons — 25s for a rider on an
 * errand, 75s idle — so polling at 15s keeps the worst-case display lag under
 * the 60s the old Firebase freshness check used to give.
 *
 * It was five minutes when this only fetched names and Firebase decided
 * liveness. Leaving it there would have put a five-minute-old answer on a
 * real-time map.
 */
const ROSTER_REFRESH_INTERVAL_MS = 5 * 1000;

/**
 * How often buffered socket fixes are committed to state.
 *
 * The server sends at most one fix per rider per second, which with a full
 * fleet is dozens of events a second. Rendering each one would re-run the map's
 * marker pass that often; committing them in batches keeps the pins moving
 * without spending a slow machine's frame budget on bookkeeping.
 */
const SOCKET_FLUSH_INTERVAL_MS = 400;

/**
 * Least time between roster fetches triggered by socket events. The status
 * itself is applied from the event at once; this only reconciles the rest.
 */
const RECONCILE_MIN_INTERVAL_MS = 5 * 1000;

/** How long a pushed status is protected from an older in-flight fetch. */
const STATUS_PATCH_TTL_MS = 60 * 1000;

/** The server's `rider:status_changed` (riderStatusWatchService.ts). */
interface StatusChangedEvent {
  riderId: number;
  riderStatus: ApiRiderStatus;
  riderStatusReason?: string;
  reasonText?: string;
  lastBeaconAt?: number | null;
  activeOrdersCount?: number;
}

/** Least time between forced re-handshakes to pick up a refreshed token. */
const SOCKET_REAUTH_MIN_INTERVAL_MS = 30 * 1000;

/**
 * Whether the Socket.IO position feed is flowing.
 *
 * `live` means connected AND authorized for staff events. A socket that
 * connected with an expired token is connected but hears nothing, so it
 * reports `connecting` until it has re-handshaken.
 */
export type FleetLiveLink = "connecting" | "live" | "offline";

/** The server's `rider:location` event. See riderLocationBroadcast.ts. */
interface SocketRiderLocation {
  riderId: number;
  latitude: number;
  longitude: number;
  heading: number | null;
  recordedAt: number;
}

// One socket for every mounted consumer of this hook.
//
// The dispatcher portal mounts this hook twice at once (the portal shell and
// the dispatch workspace), and each instance used to open its own connection:
// two handshakes, two heartbeats and every event delivered twice, on exactly
// the links that can least afford it.
let sharedSocket: Socket | null = null;
let sharedSocketUsers = 0;
let stopWaitingForToken: (() => void) | null = null;

function acquireFleetSocket(): Socket {
  if (!sharedSocket) {
    const socket = io(BACKEND_URL, {
      // A function, not a value. It is re-read on every reconnect; a token
      // captured once at mount had expired 15 minutes later, so every
      // reconnect after that came back anonymous and heard no staff events.
      auth: (cb) => cb({ token: getMemoryAccessToken() ?? undefined }),
      // Not until there is a token. At page load the access token is still
      // being restored, so connecting straight away produced an anonymous
      // socket that was then torn down to re-authenticate, often in the middle
      // of its polling-to-WebSocket upgrade. The browser logged each of those
      // as "WebSocket is closed before the connection is established".
      autoConnect: false,
    });
    sharedSocket = socket;
    if (getMemoryAccessToken()) socket.connect();
    stopWaitingForToken = onMemoryAccessTokenChange((token) => {
      // `active` covers connecting and reconnecting, so a token rotation on a
      // live socket changes nothing: auth is read only at the handshake.
      if (token && !socket.active) socket.connect();
    });
  }
  sharedSocketUsers += 1;
  return sharedSocket;
}

function releaseFleetSocket(): void {
  sharedSocketUsers -= 1;
  if (sharedSocketUsers <= 0 && sharedSocket) {
    stopWaitingForToken?.();
    stopWaitingForToken = null;
    sharedSocket.disconnect();
    sharedSocket = null;
    sharedSocketUsers = 0;
  }
}

/**
 * Runs `fn` once the connection has settled on its transport. Tearing a socket
 * down while it is upgrading from polling to WebSocket aborts the upgrade,
 * which is harmless but logs a browser error each time.
 */
function whenTransportSettled(socket: Socket, fn: () => void): void {
  const engine = (socket.io as any)?.engine;
  if (engine?.upgrading) {
    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      fn();
    };
    engine.once("upgrade", once);
    engine.once("upgradeError", once);
    return;
  }
  fn();
}

// One roster request in flight at a time, shared by every consumer. On a slow
// link a 15 s poll can take longer than 15 s to answer, and without this the
// requests stacked up behind each other.
let rosterInFlight: Promise<ApiRider[] | null> | null = null;

function fetchRosterShared(): Promise<ApiRider[] | null> {
  if (!rosterInFlight) {
    rosterInFlight = apiService.getRiders().finally(() => {
      rosterInFlight = null;
    });
  }
  return rosterInFlight;
}

export interface RiderFleetLocation {
  lat: number;
  lng: number;
  heading: number | null;
  updatedAt: number;
}

export interface RiderFleetMember {
  id: number;
  name: string;
  phone: string;
  avatar: string | null;
  adminStatus: "Active" | "Inactive";
  activeOrdersCount: number;
  activeErrandId?: string | null;
  online: boolean;
  onDuty: boolean;
  /** The server's beacon-derived state — the authority on reachability. */
  availability: RiderAvailabilityState;
  /** True when OFFLINE was inferred from silence rather than reported. */
  presumed: boolean;
  /** Present but unable to take work: a permission, not a connection. */
  impediments: RiderImpediment[];
  batteryLevel: number | null;
  location: RiderFleetLocation | null;
  plottableLocation: RiderFleetLocation | null;
  presence: RiderPresenceState;
  gpsStale: boolean;
  /**
   * ADDITIVE, 2026-09-23: why the rider has this status, in words from the
   * server ("Shift ended at 12:00 AM", "Background location not allowed").
   */
  statusText: string;
  /** When the server last heard from the rider, epoch ms. */
  lastBeaconAt: number | null;
}

export interface FirebaseRiderEntry {
  latitude: number;
  longitude: number;
  heading?: number | null;
  updatedAt: number;
  onDuty?: boolean;
  online?: boolean;
  status?: "AVAILABLE" | "BUSY" | "DISCONNECTED" | "OFF_DUTY";
  activeErrandId?: string | null;
  batteryLevel?: number | null;
}

/**
 * The map's four states, derived from the server's beacon state.
 *
 * ## Why Firebase no longer decides liveness
 *
 * This used to read `onDuty` and `online` straight off the RTDB entry and OR the
 * result with the server's answer:
 *
 *     const isOnline = r.online || (fbEntry?.online ?? false);
 *
 * Nothing ever clears an RTDB record. The RiderMobileApp writes it and the
 * server never touches that node, so a rider whose handset was killed four days
 * ago still has `online: true` and `onDuty: true` sitting there. `false || true`
 * is `true`, so the Riders board counted three long-dead riders as Available
 * while the map — which happened to check `updatedAt` freshness separately —
 * painted the same three as signal-lost. Two answers from one hook.
 *
 * The server's state is authoritative because it is the one dispatch already
 * asks, and it counts staleness in beacons at the cadence the device reports
 * rather than a flat 60s. RTDB now supplies position, heading and battery — the
 * things only the handset knows — and nothing about whether anyone is there.
 *
 * Since 2026-09-23 the server also names the status itself (riderStatus:
 * Available Online, Available Signal Lost, Offline), and that is used as is.
 * The map no longer downgrades a rider whose pin looks frozen: the same status
 * decides who the dispatcher can assign, and a board that disagreed with the
 * assign list would be two answers from one screen again. A rider without
 * background location is Offline by the business rule, with the reason shown.
 */
function derivePresence(
  riderStatus: ApiRiderStatus | undefined,
  availability: RiderAvailabilityState,
  activeOrdersCount: number
): RiderPresenceState {
  // Fallback for a server that predates riderStatus, mapped the same way.
  const status: ApiRiderStatus =
    riderStatus ??
    (availability === "AVAILABLE"
      ? "AVAILABLE_ONLINE"
      : availability === "SIGNAL_LOST"
        ? "AVAILABLE_SIGNAL_LOST"
        : "OFFLINE");

  if (status === "AVAILABLE_ONLINE") return activeOrdersCount > 0 ? "ON_DELIVERY" : "AVAILABLE_ONLINE";
  return status;
}

/**
 * ADDITIVE, 2026-09-17: `loadError` and `reload`.
 *
 * This hook returned `{ riders, isLoading }` and had no error channel at all,
 * while `loadRoster` discarded the null that `apiService.getRiders()` resolves
 * on failure. Both consumers were therefore structurally unable to tell "no
 * riders are registered" from "the roster endpoint is down", and the Owner
 * Portal's tracking screen rendered "0 Ready, 0 Delivering" beside a pulsing
 * green dot and an animated radio icon whenever /riders was unreachable. The
 * interface asserted liveness it had never checked.
 *
 * Nothing else changes. The Socket.io listener, the Firebase subscription and
 * the 15s roster poll are untouched, existing consumers that destructure
 * `{ riders, isLoading }` keep working, and a transient failure still leaves
 * the last roster on screen rather than blanking it: stale data under an
 * honest warning beats an empty list that looks like an answer.
 */
/** The server's `rider:connectivity_alert` (riderStatusWatchService.ts). */
interface ConnectivityAlert {
  riderId: number;
  name: string;
  lastBeaconAt: number | null;
  activeOrdersCount: number;
  reminder: boolean;
}

export function useRiderFleetPresence(options: {
  /**
   * ADDITIVE, 2026-09-23: toast when an Available Online rider loses signal,
   * with reminders at 5 and 15 minutes. Opt-in so only the screen that owns
   * the alert raises it; the dispatcher portal mounts this hook twice.
   */
  alertOnSignalLost?: boolean;
} = {}): {
  riders: RiderFleetMember[];
  isLoading: boolean;
  loadError: string | null;
  /** Set when the Firebase position feed itself is refusing or failing. */
  telemetryError: string | null;
  reload: () => void;
  /** ADDITIVE, 2026-09-23: state of the Socket.IO position feed. */
  liveLink: FleetLiveLink;
} {
  const [roster, setRoster] = useState<ApiRider[]>([]);
  // Statuses pushed over the socket, newest per rider, with when they landed.
  // A roster fetch that STARTED before a push can arrive after it carrying the
  // older status, and would otherwise flip a rider back for a poll interval.
  const statusPatchesRef = useRef(new Map<number, { at: number; fields: Partial<ApiRider> }>());
  const [fleetLocations, setFleetLocations] = useState<Record<string, FirebaseRiderEntry>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Separate from `loadError` on purpose: the roster and the telemetry feed are
  // two different services, and they fail independently. Collapsing them would
  // make a working roster look broken, or a broken feed look fine.
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  // Bumped to force an out-of-band roster re-fetch when the socket says a
  // rider's presence moved, so a shift starting or ending shows up immediately
  // rather than waiting out the poll.
  const [refreshToken, setRefreshToken] = useState(0);

  // Positions pushed over Socket.IO, keyed like the RTDB node. Merged with the
  // RTDB feed below, newest fix wins.
  const [socketLocations, setSocketLocations] = useState<Record<string, SocketRiderLocation>>({});
  const [liveLink, setLiveLink] = useState<FleetLiveLink>("connecting");
  const alertsRef = useRef(Boolean(options.alertOnSignalLost));
  alertsRef.current = Boolean(options.alertOnSignalLost);

  useEffect(() => {
    let cancelled = false;

    const loadRoster = async () => {
      // A hidden tab polls nothing. It catches up the moment it is shown
      // (see the visibility listener below), and in the meantime its requests
      // are not competing with the tab someone is actually looking at.
      if (typeof document !== "undefined" && document.hidden) return;
      const fetchStartedAt = Date.now();
      const fetched = await fetchRosterShared();
      if (cancelled) return;
      // Pushed statuses newer than this fetch win over what it brought back.
      const patches = statusPatchesRef.current;
      for (const [id, patch] of patches) {
        if (Date.now() - patch.at > STATUS_PATCH_TTL_MS) patches.delete(id);
      }
      const riders = fetched
        ? fetched.map((r) => {
            const patch = patches.get(r.id);
            return patch && patch.at > fetchStartedAt ? { ...r, ...patch.fields } : r;
          })
        : fetched;
      // apiService.getRiders catches its own error and resolves null
      // (apiService.ts:705-713). Null is the failure; an empty array is a
      // genuinely empty roster. Discarding the null, as this did, collapsed
      // those two into the same screen.
      if (riders) {
        setRoster(riders);
        setLoadError(null);
      } else {
        setLoadError("The rider roster did not load.");
      }
      setIsLoading(false);
    };

    loadRoster();
    const interval = setInterval(loadRoster, ROSTER_REFRESH_INTERVAL_MS);
    // Catch up at once when the tab is shown again or the network comes back,
    // rather than showing a stale roster for up to one more poll interval.
    const catchUp = () => {
      if (!document.hidden) void loadRoster();
    };
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("online", catchUp);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("online", catchUp);
    };
  }, [refreshToken]);

  // The feed follows the Firebase session rather than mounting once and hoping.
  //
  // `riders` is readable only by an authenticated client now, so a subscription
  // opened before sign-in completes is rejected, and — since a rejected RTDB
  // listener never retries on its own — it would stay rejected for the life of
  // the page. Tracking down that failure mode is the whole reason this hook now
  // has an error channel; re-subscribing when the session arrives is what stops
  // it happening in the first place.
  const [realtimeAuth, setRealtimeAuth] = useState<RealtimeAuthState>(realtimeAuthState());

  useEffect(() => onRealtimeAuthChange(setRealtimeAuth), []);

  // Covers the tab that loads straight onto a tracking screen with a session
  // already restored: nothing else would ask for a Firebase identity.
  useEffect(() => {
    void ensureRealtimeSession();
  }, []);

  useEffect(() => {
    if (realtimeAuth === "unavailable") {
      setTelemetryError(
        "Live rider positions are unavailable: this session could not authenticate to the telemetry database."
      );
      setFleetLocations({});
      return;
    }

    // Still opening the session. Deliberately silent rather than reporting a
    // failure that has not happened yet — an error shown during normal startup
    // is how a screen teaches people to ignore its errors.
    if (realtimeAuth !== "signed-in") return;

    const ridersRef = ref(database, "riders");
    const unsubscribe = onValue(
      ridersRef,
      (snapshot) => {
        setFleetLocations(snapshot.exists() ? snapshot.val() : {});
        setTelemetryError(null);
      },
      // ADDITIVE, 2026-09-18: the error callback this subscription never had.
      //
      // `onValue` was called with a value handler and nothing else, so a
      // REJECTED subscription resolved to silence: `fleetLocations` stayed
      // `{}`, every rider mapped to `location: null`, and the map plotted an
      // empty fleet underneath a roster that listed those same riders as
      // AVAILABLE. Two answers from one screen again, and the failing half
      // was the half with no voice.
      //
      // This is not hypothetical. The RTDB now answers an unauthenticated
      // read of `riders` with PERMISSION_DENIED, and neither portal said so —
      // the pins simply stopped appearing, which looks exactly like a fleet
      // that is not sharing GPS.
      (error) => {
        const code = String((error as { code?: string }).code || "").toUpperCase();
        const denied = code.includes("PERMISSION_DENIED") || /permission[_ ]denied/i.test(error.message);
        setTelemetryError(
          denied
            ? "Live rider positions are being refused by the telemetry database's security rules."
            : "Live rider positions are unavailable."
        );
        // Drop the cache rather than leaving the last pins frozen on screen.
        // A position from before the feed broke is not evidence of where
        // anyone is now, and the map has no way to caveat an individual pin.
        setFleetLocations({});
      }
    );
    return () => unsubscribe();
  }, [realtimeAuth]);

  useEffect(() => {
    // Authenticated so this connection joins the staff role room and receives
    // scoped events, not just the legacy global broadcasts.
    const socket: Socket = acquireFleetSocket();
    let disposed = false;

    // Fixes are buffered and committed in batches (SOCKET_FLUSH_INTERVAL_MS).
    const buffer: Record<string, SocketRiderLocation> = {};
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      flushTimer = null;
      if (disposed) return;
      const batch = { ...buffer };
      for (const key of Object.keys(buffer)) delete buffer[key];
      if (Object.keys(batch).length === 0) return;
      setSocketLocations((prev) => {
        const next = { ...prev };
        for (const [key, fix] of Object.entries(batch)) {
          // Never let a late-arriving fix drag a pin backwards.
          if (!next[key] || next[key].recordedAt < fix.recordedAt) next[key] = fix;
        }
        return next;
      });
    };
    const accept = (fix: SocketRiderLocation) => {
      if (!fix || typeof fix.riderId !== "number") return;
      if (!Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) return;
      const key = String(fix.riderId);
      if (!buffer[key] || buffer[key].recordedAt < fix.recordedAt) buffer[key] = fix;
      if (!flushTimer) flushTimer = setTimeout(flush, SOCKET_FLUSH_INTERVAL_MS);
    };

    // Seed every known position in one round trip after each (re)connect, so a
    // map coming back from a dropped link is not empty until each rider's next
    // fix. The reply also says whether this socket is authorized for staff
    // events; if not, its token had expired when it connected.
    let lastReauthAt = 0;
    const requestSnapshot = () => {
      socket.emit(
        "fleet:snapshot",
        async (reply: { ok?: boolean; riders?: SocketRiderLocation[] } | undefined) => {
          if (disposed) return;
          if (reply?.ok) {
            (reply.riders ?? []).forEach(accept);
            setLiveLink("live");
            return;
          }
          // Connected but anonymous. Any authenticated request makes the
          // HTTP client's silent refresh renew the token; re-handshake with it.
          setLiveLink("connecting");
          if (Date.now() - lastReauthAt < SOCKET_REAUTH_MIN_INTERVAL_MS) return;
          lastReauthAt = Date.now();
          await fetchRosterShared();
          if (!disposed && getMemoryAccessToken()) {
            whenTransportSettled(socket, () => {
              if (!disposed) socket.disconnect().connect();
            });
          }
        }
      );
    };

    const onConnect = () => requestSnapshot();
    const onDisconnect = () => {
      if (!disposed) setLiveLink("offline");
    };
    // Reconciling with the server is throttled: at most one roster fetch per
    // RECONCILE_MIN_INTERVAL_MS however many events arrive. A rider on a flaky
    // connection can flap several times a minute, and a fetch per flap is
    // exactly the load the API rate limiter exists to refuse.
    let reconcileTimer: ReturnType<typeof setTimeout> | null = null;
    let lastReconcileAt = 0;
    const reconcileSoon = () => {
      if (reconcileTimer) return;
      const wait = Math.max(0, lastReconcileAt + RECONCILE_MIN_INTERVAL_MS - Date.now());
      reconcileTimer = setTimeout(() => {
        reconcileTimer = null;
        lastReconcileAt = Date.now();
        setRefreshToken((n) => n + 1);
      }, wait);
    };

    const onPresenceChanged = (payload: { riderId?: number; online?: boolean }) => {
      if (!payload || payload.riderId === undefined) return;
      // Reconciled rather than patched. This event reports a SOCKET connecting
      // or dropping, which is a weaker signal than a beacon, and writing it into
      // the roster would leave `availability` saying one thing and `online`
      // another.
      reconcileSoon();
    };

    // The server's own status decision, pushed the moment it changes (within
    // about three seconds of a rider's heartbeat stopping). Applied to the
    // roster directly, so the board changes when the event lands rather than
    // after an HTTP round trip.
    const onStatusChanged = (payload: StatusChangedEvent) => {
      if (!payload || typeof payload.riderId !== "number" || !payload.riderStatus) return;
      const fields: Partial<ApiRider> = {
        riderStatus: payload.riderStatus,
        online: payload.riderStatus === "AVAILABLE_ONLINE",
        ...(payload.riderStatusReason ? { riderStatusReason: payload.riderStatusReason } : {}),
        ...(payload.reasonText ? { riderStatusText: payload.reasonText } : {}),
        ...(payload.lastBeaconAt !== undefined ? { lastBeaconAt: payload.lastBeaconAt } : {}),
        ...(typeof payload.activeOrdersCount === "number" ? { activeOrdersCount: payload.activeOrdersCount } : {}),
      };
      statusPatchesRef.current.set(payload.riderId, { at: Date.now(), fields });
      setRoster((prev) => prev.map((r) => (r.id === payload.riderId ? { ...r, ...fields } : r)));
      reconcileSoon();
    };
    // The browser knows the network is back before Socket.IO's backoff timer
    // does; reconnect now instead of waiting out up to five seconds.
    // The reminder the dispatcher asked for: a rider who was assignable has
    // gone quiet. Said once, then again at 5 and 15 minutes by the server; the
    // roster keeps showing the status for as long as it lasts.
    const onConnectivityAlert = (alert: ConnectivityAlert) => {
      if (!alertsRef.current || !alert || typeof alert.riderId !== "number") return;
      const minutes = alert.lastBeaconAt
        ? Math.max(1, Math.round((Date.now() - alert.lastBeaconAt) / 60000))
        : null;
      const carrying =
        alert.activeOrdersCount > 0
          ? ` They are carrying ${alert.activeOrdersCount} errand${alert.activeOrdersCount === 1 ? "" : "s"}.`
          : "";
      toast.warning(alert.reminder ? `Still no signal from ${alert.name}` : `${alert.name} lost signal`, {
        id: `rider-signal-${alert.riderId}`,
        description:
          (minutes ? `Not reporting for ${minutes} min. ` : "") +
          "They cannot be assigned until the phone reconnects. Consider calling them." +
          carrying,
        duration: 15000,
      });
    };

    const onOnline = () => {
      if (!socket.active && getMemoryAccessToken()) socket.connect();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("rider:location", accept);
    socket.on("rider:presence_changed", onPresenceChanged);
    // A status change (online, signal lost, offline, midnight reset) refetches
    // at once rather than waiting out the 15 s poll.
    socket.on("rider:status_changed", onStatusChanged);
    socket.on("rider:connectivity_alert", onConnectivityAlert);
    window.addEventListener("online", onOnline);
    // The shared socket may already be up when a second consumer mounts.
    if (socket.connected) requestSnapshot();

    return () => {
      disposed = true;
      if (flushTimer) clearTimeout(flushTimer);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("rider:location", accept);
      socket.off("rider:presence_changed", onPresenceChanged);
      socket.off("rider:status_changed", onStatusChanged);
      if (reconcileTimer) clearTimeout(reconcileTimer);
      socket.off("rider:connectivity_alert", onConnectivityAlert);
      window.removeEventListener("online", onOnline);
      releaseFleetSocket();
    };
  }, []);

  const now = Date.now();
  const riders: RiderFleetMember[] = roster.map((r) => {
    const fbEntry = fleetLocations[String(r.id)];
    const socketFix = socketLocations[String(r.id)];

    // Position only. Liveness comes from the server — see derivePresence.
    //
    // Two feeds carry it, RTDB and Socket.IO, and whichever fix is NEWER is
    // drawn. They are independent paths from the handset, so on a slow or
    // lossy link one usually arrives while the other is stuck, and a refused
    // RTDB no longer blanks the map on its own. Battery and the active errand
    // stay RTDB-only; the socket carries position.
    const fbLocation: RiderFleetLocation | null = fbEntry
      ? {
          lat: fbEntry.latitude,
          lng: fbEntry.longitude,
          heading: fbEntry.heading ?? null,
          updatedAt: fbEntry.updatedAt,
        }
      : null;
    const socketLocation: RiderFleetLocation | null = socketFix
      ? {
          lat: socketFix.latitude,
          lng: socketFix.longitude,
          heading: socketFix.heading ?? null,
          updatedAt: socketFix.recordedAt,
        }
      : null;
    const location: RiderFleetLocation | null =
      fbLocation && socketLocation
        ? socketLocation.updatedAt > fbLocation.updatedAt
          ? socketLocation
          : fbLocation
        : fbLocation ?? socketLocation;

    const timeSinceUpdate = location ? now - location.updatedAt : Infinity;

    // Only meaningful when a position exists and has since frozen. A rider with
    // NO telemetry at all is not evidence of a dead connection — the handset may
    // simply never have written RTDB — and treating absence as staleness would
    // reintroduce the same false reading in the opposite direction.
    const gpsStale = location !== null && timeSinceUpdate > SIGNAL_LOST_THRESHOLD_MS;

    // RTDB Hybrid Fast-Path:
    // If the rider toggled duty in the mobile app, Firebase RTDB updates within milliseconds.
    // If the RTDB entry is fresh (< 15s old), trust its live onDuty/status immediately so the
    // map reflects changes in real time rather than waiting up to 5s for the MariaDB poll.
    const fbIsFresh = fbEntry !== undefined && (now - fbEntry.updatedAt) < 15 * 1000;

    let isOnline = r.online;
    let onDuty = r.availability !== "OFF_DUTY" && r.availability !== "LOGGED_OUT";
    let basePresence = derivePresence(r.riderStatus, r.availability, r.activeOrdersCount);

    if (fbIsFresh && typeof fbEntry.onDuty === "boolean") {
      if (!fbEntry.onDuty) {
        onDuty = false;
        isOnline = false;
        basePresence = "OFFLINE";
      } else {
        onDuty = true;
        isOnline = true;
        if (basePresence === "OFFLINE") {
          basePresence =
            (fbEntry.status === "BUSY" || (r.activeOrdersCount ?? 0) > 0)
              ? "ON_DELIVERY"
              : "AVAILABLE_ONLINE";
        }
      }
    }

    const presence = basePresence;

    // Any rider with a recorded location within 24h is plottable (filters on the map control visibility)
    const plottableLocation =
      location && timeSinceUpdate < PLOT_HIDE_AFTER_MS
        ? location
        : null;

    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      avatar: r.avatar,
      adminStatus: r.status,
      activeOrdersCount: r.activeOrdersCount,
      activeErrandId: fbEntry?.activeErrandId ?? null,
      online: isOnline,
      onDuty,
      availability: r.availability,
      presumed: r.presumed,
      impediments: r.impediments,
      batteryLevel: fbEntry?.batteryLevel ?? null,
      location,
      plottableLocation,
      presence,
      gpsStale,
      statusText: r.riderStatusText ?? RIDER_STATUS_THEMES[presence].label,
      lastBeaconAt: r.lastBeaconAt ?? null,
    };
  });

  // `reload` reuses the refresh token the socket listener already bumps, so a
  // retry button and a presence event take the same path.
  const reload = useCallback(() => setRefreshToken((n) => n + 1), []);

  // The RTDB error is reported only while the socket feed is down too. With
  // the socket live, the pins it describes as missing are on the map, and a
  // banner saying none can be drawn would be the false statement.
  const effectiveTelemetryError = liveLink === "live" ? null : telemetryError;

  return { riders, isLoading, loadError, telemetryError: effectiveTelemetryError, reload, liveLink };
}
