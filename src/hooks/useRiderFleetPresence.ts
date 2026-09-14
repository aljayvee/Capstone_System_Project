import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase/config";
import {
  apiService,
  type ApiRider,
  type RiderAvailabilityState,
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
import { getMemoryAccessToken } from "../services/apiClient";

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
const ROSTER_REFRESH_INTERVAL_MS = 15 * 1000;

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
 * NEEDS_PERMISSIONS maps to a present state on purpose. That rider IS reachable;
 * they are missing a toggle. Painting them red would put a permissions problem on
 * the map wearing a connectivity label, which is the confusion riderAvailability
 * was written to prevent.
 */
function derivePresence(
  availability: RiderAvailabilityState,
  activeOrdersCount: number,
  isGpsStale: boolean
): RiderPresenceState {
  switch (availability) {
    // The rider's own decisions. Reporting these as a fault would send someone
    // chasing a connectivity problem that does not exist.
    case "OFF_DUTY":
    case "LOGGED_OUT":
      return "OFF_DUTY";

    // On duty, not heard from. OFFLINE is the same condition past a longer
    // grace window — they never signed off, so it is not OFF_DUTY.
    case "SIGNAL_LOST":
    case "OFFLINE":
      return "DISCONNECTED";

    case "AVAILABLE":
    case "NEEDS_PERMISSIONS": {
      // A pin frozen while the server still hears beacons: telemetry and
      // presence disagree, and the conservative reading is the honest one. This
      // can only ever downgrade — it must never promote a rider the server has
      // given up on, which is the direction the old `||` failed in.
      if (isGpsStale) return "DISCONNECTED";
      return activeOrdersCount > 0 ? "BUSY" : "AVAILABLE";
    }
  }
}

function expectedIntervalMs(presence: RiderPresenceState): number | null {
  if (presence === "BUSY") return ACTIVE_DELIVERY_INTERVAL_MS;
  if (presence === "AVAILABLE") return IDLE_INTERVAL_MS;
  return null;
}

export function useRiderFleetPresence(): { riders: RiderFleetMember[]; isLoading: boolean } {
  const [roster, setRoster] = useState<ApiRider[]>([]);
  const [fleetLocations, setFleetLocations] = useState<Record<string, FirebaseRiderEntry>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Bumped to force an out-of-band roster re-fetch when the socket says a
  // rider's presence moved, so a shift starting or ending shows up immediately
  // rather than waiting out the poll.
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadRoster = async () => {
      const riders = await apiService.getRiders();
      if (!cancelled && riders) setRoster(riders);
      if (!cancelled) setIsLoading(false);
    };

    loadRoster();
    const interval = setInterval(loadRoster, ROSTER_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshToken]);

  useEffect(() => {
    const ridersRef = ref(database, "riders");
    const unsubscribe = onValue(ridersRef, (snapshot) => {
      setFleetLocations(snapshot.exists() ? snapshot.val() : {});
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Authenticated so this connection joins the staff role room and receives
    // scoped events, not just the legacy global broadcasts.
    const socket: Socket = io(BACKEND_URL, {
      auth: { token: getMemoryAccessToken() ?? undefined },
    });
    socket.on("rider:presence_changed", (payload: { riderId?: number; online?: boolean }) => {
      if (!payload || payload.riderId === undefined) return;
      // Re-fetch rather than patching `online` in place. This event reports a
      // SOCKET connecting or dropping, which is a weaker signal than a beacon —
      // the server only falls back to it for riders whose app predates beacons.
      // Writing it straight into the roster would leave `availability` saying one
      // thing and `online` another, and presence reads `availability`.
      setRefreshToken((n) => n + 1);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const now = Date.now();
  const riders: RiderFleetMember[] = roster.map((r) => {
    const fbEntry = fleetLocations[String(r.id)];

    // Position only. Liveness comes from the server — see derivePresence.
    const location: RiderFleetLocation | null = fbEntry
      ? {
          lat: fbEntry.latitude,
          lng: fbEntry.longitude,
          heading: fbEntry.heading ?? null,
          updatedAt: fbEntry.updatedAt,
        }
      : null;

    const timeSinceUpdate = location ? now - location.updatedAt : Infinity;

    // Only meaningful when a position exists and has since frozen. A rider with
    // NO telemetry at all is not evidence of a dead connection — the handset may
    // simply never have written RTDB — and treating absence as staleness would
    // reintroduce the same false reading in the opposite direction.
    const gpsStale = location !== null && timeSinceUpdate > SIGNAL_LOST_THRESHOLD_MS;

    const isOnline = r.online;
    const onDuty = r.availability !== "OFF_DUTY" && r.availability !== "LOGGED_OUT";

    const presence = derivePresence(r.availability, r.activeOrdersCount, gpsStale);

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
    };
  });

  return { riders, isLoading };
}
