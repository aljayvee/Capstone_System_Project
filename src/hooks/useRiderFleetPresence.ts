import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase/config";
import { apiService, ApiRider } from "../services/apiService";
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

const ROSTER_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

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
 * Derives the exact 4-state presence based on saved Firebase & MariaDB state:
 * - AVAILABLE: Online & On Duty with 0 active tasks
 * - BUSY: Online & On Duty with 1+ active tasks
 * - DISCONNECTED: On Duty but GPS timestamp > 60s stale or connection lost
 * - OFF_DUTY: Clocked out, off duty, or logged off
 */
function derivePresence(
  online: boolean,
  onDuty: boolean,
  activeOrdersCount: number,
  isGpsStale: boolean,
  savedFirebaseStatus?: string
): RiderPresenceState {
  if (!onDuty && !online) {
    return "OFF_DUTY";
  }
  if (onDuty && isGpsStale) {
    return "DISCONNECTED";
  }
  if (!online && onDuty) {
    return "DISCONNECTED";
  }
  if (savedFirebaseStatus === "BUSY" || activeOrdersCount > 0) {
    return "BUSY";
  }
  return "AVAILABLE";
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
  }, []);

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
      if (!payload || payload.riderId === undefined || payload.online === undefined) return;
      const { riderId, online } = payload;
      setRoster((prev) => prev.map((r) => (r.id === riderId ? { ...r, online } : r)));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const now = Date.now();
  const riders: RiderFleetMember[] = roster.map((r) => {
    const fbEntry = fleetLocations[String(r.id)];
    const onDuty = fbEntry?.onDuty ?? false;
    const isOnline = r.online || (fbEntry?.online ?? false);

    const location: RiderFleetLocation | null = fbEntry
      ? {
          lat: fbEntry.latitude,
          lng: fbEntry.longitude,
          heading: fbEntry.heading ?? null,
          updatedAt: fbEntry.updatedAt,
        }
      : null;

    const timeSinceUpdate = location ? now - location.updatedAt : Infinity;
    const gpsStale = onDuty && (timeSinceUpdate > SIGNAL_LOST_THRESHOLD_MS || !location);

    const presence = derivePresence(
      isOnline,
      onDuty,
      r.activeOrdersCount,
      gpsStale,
      fbEntry?.status
    );

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
      batteryLevel: fbEntry?.batteryLevel ?? null,
      location,
      plottableLocation,
      presence,
      gpsStale,
    };
  });

  return { riders, isLoading };
}
