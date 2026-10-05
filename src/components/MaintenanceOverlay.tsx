import React from "react";
import { Wrench, AlertTriangle, RefreshCw, ShieldAlert, LifeBuoy } from "lucide-react";
import type { MaintenanceType } from "../types/sysAdmin";

export interface MaintenanceOverlayProps {
  portal: string;
  header?: string;
  message?: string;
  notice?: string; // backwards compatibility
  maintenanceType?: MaintenanceType;
  supportContact?: string;
  customColor?: string;
}

const PORTAL_LABELS: Record<string, string> = {
  owner: "Owner Portal",
  dispatcher: "Dispatcher Portal",
  rider: "Rider Mobile App",
  customer: "Customer Mobile App",
};

interface ThemeConfig {
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
  badgeLabel: string;
  typeLabel: string;
}

const THEME_MAP: Record<MaintenanceType, ThemeConfig> = {
  SCHEDULED: {
    icon: Wrench,
    accentColor: "#F59E0B",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-400",
    dotColor: "bg-amber-400",
    badgeLabel: "SCHEDULED MAINTENANCE",
    typeLabel: "Scheduled Upkeep",
  },
  EMERGENCY: {
    icon: AlertTriangle,
    accentColor: "#EF4444",
    badgeBg: "bg-rose-500/10",
    badgeBorder: "border-rose-500/30",
    badgeText: "text-rose-400",
    dotColor: "bg-rose-400",
    badgeLabel: "EMERGENCY OUTAGE",
    typeLabel: "Unplanned Incident",
  },
  UPGRADE: {
    icon: RefreshCw,
    accentColor: "#3B82F6",
    badgeBg: "bg-blue-500/10",
    badgeBorder: "border-blue-500/30",
    badgeText: "text-blue-400",
    dotColor: "bg-blue-400",
    badgeLabel: "SYSTEM UPGRADE",
    typeLabel: "Platform Upgrade",
  },
  SECURITY: {
    icon: ShieldAlert,
    accentColor: "#8B5CF6",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-400",
    dotColor: "bg-purple-400",
    badgeLabel: "SECURITY LOCKDOWN",
    typeLabel: "Security Maintenance",
  },
};

export const MaintenanceOverlay: React.FC<MaintenanceOverlayProps> = ({
  portal,
  header,
  message,
  notice,
  maintenanceType = "SCHEDULED",
  supportContact,
  customColor,
}) => {
  const portalLabel = PORTAL_LABELS[portal] ?? portal.toUpperCase();
  const theme = THEME_MAP[maintenanceType] || THEME_MAP.SCHEDULED;
  const IconComponent = theme.icon;

  const displayHeader = header || "System Under Maintenance";
  const displayMessage =
    message || notice || "Scheduled system maintenance in progress. Services will resume shortly.";

  const effectiveAccent = customColor || theme.accentColor;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070D1B] text-white p-4 sm:p-6 select-none">
      <div className="w-full max-w-lg bg-[#0B132B] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Sleek Top Accent Line */}
        <div
          className="h-1 w-full transition-colors"
          style={{ backgroundColor: effectiveAccent }}
        />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Top Header Row: System Identity & Static Status Badge */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                SUGO System
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-xs font-semibold text-white">
                {portalLabel}
              </span>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono font-semibold tracking-wider ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
              style={
                customColor
                  ? {
                      borderColor: `${customColor}40`,
                      color: customColor,
                      backgroundColor: `${customColor}15`,
                    }
                  : undefined
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dotColor}`}
                style={customColor ? { backgroundColor: customColor } : undefined}
              />
              <span>{theme.badgeLabel}</span>
            </div>
          </div>

          {/* Main Notice Content */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"
                style={customColor ? { color: customColor } : undefined}
              >
                <IconComponent
                  className={`w-4 h-4 ${!customColor ? theme.badgeText : ""}`}
                />
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                {displayHeader}
              </h1>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-normal whitespace-pre-line pl-12">
              {displayMessage}
            </p>
          </div>

          {/* Clean Structured Metadata Grid */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#070D1B] border border-slate-800/80">
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
                Target
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {portalLabel}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
                Type
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {theme.typeLabel}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">
                Operations
              </span>
              <span className="text-xs font-semibold text-amber-400">
                Paused
              </span>
            </div>
          </div>

          {/* Support Contact Row */}
          {supportContact && (
            <div className="flex items-center justify-between gap-3 text-xs pt-1 text-slate-400">
              <div className="flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5 text-slate-400" />
                <span>Need assistance?</span>
              </div>
              <a
                href={supportContact.includes("@") ? `mailto:${supportContact}` : `tel:${supportContact}`}
                className="font-medium text-slate-200 hover:text-white transition-colors underline decoration-slate-700 underline-offset-2 font-mono text-[11px]"
              >
                {supportContact}
              </a>
            </div>
          )}

          {/* Quiet Reassurance Footer */}
          <div className="pt-4 border-t border-slate-800/80">
            <p className="text-[11px] text-slate-400 font-mono text-center leading-relaxed">
              Services will automatically resume upon completion. You do not need to refresh this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceOverlay;

