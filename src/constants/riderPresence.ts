// Thresholds for deriving a rider's on-map presence state (see
// src/hooks/useRiderFleetPresence.ts).
export const ACTIVE_DELIVERY_INTERVAL_MS = 5 * 1000;
export const IDLE_INTERVAL_MS = 30 * 1000;

// How many missed ticks before a pin's GPS is flagged stale (> 60s without ping)
export const STALE_GRACE_MULTIPLIER = 3;
export const SIGNAL_LOST_THRESHOLD_MS = 60 * 1000;

// Maximum age before a completely stale offline pin is hidden from map (unless explicitly shown)
export const PLOT_HIDE_AFTER_MS = 24 * 60 * 60 * 1000; // Keep available for historical shift viewing

export const LOW_BATTERY_THRESHOLD = 0.2;

/**
 * The rider statuses on the dispatcher and owner screens (2026-09-23).
 *
 * Three come from the server (riderStatusOf in server/src/lib/riderAvailability.ts):
 * Available Online, Available Signal Lost and Offline. ON_DELIVERY is not a
 * fourth status: it is an Available Online rider who is carrying an errand,
 * kept visually apart because dispatch reads that difference at a glance.
 */
export type RiderPresenceState =
  | "AVAILABLE_ONLINE"
  | "ON_DELIVERY"
  | "AVAILABLE_SIGNAL_LOST"
  | "OFFLINE";

export interface RiderStatusTheme {
  label: string;
  shortLabel: string;
  badgeLabel: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
  badgeClassName: string;
  hasPulse: boolean;
  description: string;
}

export const RIDER_STATUS_THEMES: Record<RiderPresenceState, RiderStatusTheme> = {
  AVAILABLE_ONLINE: {
    label: "Available Online",
    shortLabel: "Online",
    badgeLabel: "Available Online",
    primaryColor: "#10B981", // Emerald 500
    secondaryColor: "#059669", // Emerald 600
    backgroundColor: "#ECFDF5", // Emerald 50
    borderColor: "#10B981",
    textColor: "#065F46",
    glowColor: "rgba(16, 185, 129, 0.4)",
    badgeClassName: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-100",
    hasPulse: true,
    description:
      "Logged in with background location allowed, so the app keeps reporting even when closed. Can be assigned.",
  },
  ON_DELIVERY: {
    label: "Available Online, on delivery",
    shortLabel: "On delivery",
    badgeLabel: "On delivery",
    primaryColor: "#F59E0B", // Amber 500
    secondaryColor: "#D97706", // Amber 600
    backgroundColor: "#FFFBEB", // Amber 50
    borderColor: "#F59E0B",
    textColor: "#92400E",
    glowColor: "rgba(245, 158, 11, 0.4)",
    badgeClassName: "bg-amber-50 text-amber-800 border-amber-300 ring-amber-100",
    hasPulse: false,
    description: "Online and currently working an errand.",
  },
  AVAILABLE_SIGNAL_LOST: {
    label: "Available Signal Lost",
    shortLabel: "Signal lost",
    badgeLabel: "Signal Lost",
    primaryColor: "#EF4444", // Red 500
    secondaryColor: "#DC2626", // Red 600
    backgroundColor: "#FEF2F2", // Red 50
    borderColor: "#EF4444",
    textColor: "#991B1B",
    glowColor: "rgba(239, 68, 68, 0.3)",
    badgeClassName: "bg-red-50 text-red-700 border-red-300 ring-red-100",
    hasPulse: false,
    description:
      "On duty, but the phone has stopped reporting. Cannot be assigned until it reconnects. Consider calling the rider.",
  },
  OFFLINE: {
    label: "Offline",
    shortLabel: "Offline",
    badgeLabel: "Offline",
    primaryColor: "#64748B", // Slate 500
    secondaryColor: "#475569", // Slate 600
    backgroundColor: "#F8FAFC", // Slate 50
    borderColor: "#94A3B8",
    textColor: "#334155",
    glowColor: "rgba(100, 116, 139, 0.2)",
    badgeClassName: "bg-slate-100 text-slate-600 border-slate-300 ring-slate-100",
    hasPulse: false,
    description:
      "Logged out, went offline, background service stopped, or the shift ended at 12:00 AM.",
  },
};

/** "under a minute", "4 min", "2 h 5 min". */
function formatAge(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/**
 * The one line under a rider's status: why they have it. Shared by the
 * dispatcher roster and the owner screens so both say the same thing.
 */
export function describeRiderStatus(
  rider: {
    presence: RiderPresenceState;
    statusText?: string | null;
    lastBeaconAt?: number | null;
    activeOrdersCount: number;
  },
  now: number = Date.now()
): string {
  switch (rider.presence) {
    case "AVAILABLE_ONLINE":
      return "Can be assigned";
    case "ON_DELIVERY":
      return `${rider.activeOrdersCount} active errand${rider.activeOrdersCount === 1 ? "" : "s"}`;
    case "AVAILABLE_SIGNAL_LOST":
      return rider.lastBeaconAt
        ? `No signal for ${formatAge(Math.max(0, now - rider.lastBeaconAt))}`
        : rider.statusText || "No signal";
    case "OFFLINE":
      return rider.statusText || "Offline";
  }
}
