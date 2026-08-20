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

export type RiderPresenceState =
  | "AVAILABLE"      // State 1: 🟢 Online & Available (No task, ready for dispatch)
  | "BUSY"           // State 2: 🟠 Online & On Active Mission (Doing errand)
  | "DISCONNECTED"   // State 3: 🔴 Offline - Lost Internet / Stale GPS (>60s)
  | "OFF_DUTY";      // State 4: ⚪ Offline - Shift Ended / Logged Out

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
  AVAILABLE: {
    label: "Online & Ready",
    shortLabel: "Ready",
    badgeLabel: "Available",
    primaryColor: "#10B981", // Emerald 500
    secondaryColor: "#059669", // Emerald 600
    backgroundColor: "#ECFDF5", // Emerald 50
    borderColor: "#10B981",
    textColor: "#065F46",
    glowColor: "rgba(16, 185, 129, 0.4)",
    badgeClassName: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-100",
    hasPulse: true,
    description: "Online, on duty, and ready for immediate errand assignment",
  },
  BUSY: {
    label: "On Active Delivery",
    shortLabel: "On Errand",
    badgeLabel: "Delivering",
    primaryColor: "#F59E0B", // Amber 500
    secondaryColor: "#D97706", // Amber 600
    backgroundColor: "#FFFBEB", // Amber 50
    borderColor: "#F59E0B",
    textColor: "#92400E",
    glowColor: "rgba(245, 158, 11, 0.4)",
    badgeClassName: "bg-amber-50 text-amber-800 border-amber-300 ring-amber-100",
    hasPulse: false,
    description: "Currently handling an active errand (heading to store / out for delivery)",
  },
  DISCONNECTED: {
    label: "Offline — Signal Lost",
    shortLabel: "No Signal",
    badgeLabel: "Signal Lost",
    primaryColor: "#EF4444", // Red 500
    secondaryColor: "#DC2626", // Red 600
    backgroundColor: "#FEF2F2", // Red 50
    borderColor: "#EF4444",
    textColor: "#991B1B",
    glowColor: "rgba(239, 68, 68, 0.3)",
    badgeClassName: "bg-red-50 text-red-700 border-red-300 ring-red-100",
    hasPulse: false,
    description: "On-duty rider whose GPS/network heartbeat dropped (> 60s without update)",
  },
  OFF_DUTY: {
    label: "Offline — Shift Ended",
    shortLabel: "Off Duty",
    badgeLabel: "Offline",
    primaryColor: "#64748B", // Slate 500
    secondaryColor: "#475569", // Slate 600
    backgroundColor: "#F8FAFC", // Slate 50
    borderColor: "#94A3B8",
    textColor: "#334155",
    glowColor: "rgba(100, 116, 139, 0.2)",
    badgeClassName: "bg-slate-100 text-slate-600 border-slate-300 ring-slate-100",
    hasPulse: false,
    description: "Logged out or off duty (not actively accepting tasks)",
  },
};
