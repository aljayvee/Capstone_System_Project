import React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import type { MaintenanceType } from "../types/sysAdmin";

interface MaintenanceWarningBannerProps {
  portal: string;
  maintenanceType?: MaintenanceType;
  countdownSeconds: number;
  header?: string;
  customColor?: string;
}

const TYPE_THEMES: Record<
  MaintenanceType,
  {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    label: string;
  }
> = {
  SCHEDULED: {
    bg: "bg-amber-950/95",
    border: "border-amber-700/80",
    text: "text-amber-200",
    badgeBg: "bg-amber-900/80 border-amber-600 text-amber-300",
    badgeText: "text-amber-300",
    label: "Scheduled Maintenance",
  },
  EMERGENCY: {
    bg: "bg-rose-950/95",
    border: "border-rose-700/80",
    text: "text-rose-200",
    badgeBg: "bg-rose-900/80 border-rose-600 text-rose-300",
    badgeText: "text-rose-300",
    label: "Emergency Outage",
  },
  UPGRADE: {
    bg: "bg-blue-950/95",
    border: "border-blue-700/80",
    text: "text-blue-200",
    badgeBg: "bg-blue-900/80 border-blue-600 text-blue-300",
    badgeText: "text-blue-300",
    label: "System Upgrade",
  },
  SECURITY: {
    bg: "bg-purple-950/95",
    border: "border-purple-700/80",
    text: "text-purple-200",
    badgeBg: "bg-purple-900/80 border-purple-600 text-purple-300",
    badgeText: "text-purple-300",
    label: "Security Protocol",
  },
};

export const MaintenanceWarningBanner: React.FC<MaintenanceWarningBannerProps> = ({
  portal,
  maintenanceType = "SCHEDULED",
  countdownSeconds,
  header,
  customColor,
}) => {
  const theme = TYPE_THEMES[maintenanceType] || TYPE_THEMES.SCHEDULED;

  return (
    <div
      role="alert"
      className={`fixed top-0 left-0 right-0 z-[9998] px-4 py-2.5 border-b backdrop-blur-md shadow-lg transition-all duration-300 ${theme.bg} ${theme.border}`}
      style={
        customColor
          ? {
              borderBottomColor: customColor,
            }
          : undefined
      }
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded border tracking-wider bg-black/40 text-white border-white/20">
              {portal.toUpperCase()}
            </span>
            <span
              className={`text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded border tracking-wider ${theme.badgeBg}`}
            >
              {theme.label}
            </span>
            <span className="text-xs font-semibold text-white">
              {header || "System Downtime Imminent"}
            </span>
            <span className="text-xs text-slate-300 hidden md:inline">
              — Please save active changes and conclude tasks.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Lockdown in:</span>
          </span>
          <span
            className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/20 font-mono text-sm font-black tabular-nums text-white"
            style={customColor ? { color: customColor } : undefined}
          >
            {countdownSeconds}s
          </span>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceWarningBanner;
