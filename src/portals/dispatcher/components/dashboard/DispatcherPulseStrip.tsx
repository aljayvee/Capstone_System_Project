import * as React from "react";
import { cn } from "@/lib/utils";
import type { DispatcherDashboardSummary } from "@/types/errand";
import { ClipboardList, Activity, Bike, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DispatcherPulseStripProps {
  summary: DispatcherDashboardSummary | null;
  onlineRidersCount: number;
  totalRidersCount: number;
  onNavigateTab: (tab: string) => void;
}

export const DispatcherPulseStrip: React.FC<DispatcherPulseStripProps> = ({
  summary,
  onlineRidersCount,
  totalRidersCount,
  onNavigateTab,
}) => {
  const unclaimed = summary?.unclaimedCount ?? 0;
  const urgent = summary?.urgentUnclaimedCount ?? 0;
  const active = summary?.activeInMotionCount ?? 0;
  const helpDesk = summary?.helpDeskCount ?? 0;
  const delivered = summary?.deliveredTodayCount ?? 0;

  return (
    <div
      data-on-field
      className="shrink-0 rounded-plate bg-board-field-deep border border-white/10 px-3 py-2.5 shadow-field sm:px-4"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-0 lg:divide-x lg:divide-white/10">
        {/* 1. Waiting Claim */}
        <button
          type="button"
          onClick={() => onNavigateTab("queue")}
          className="flex items-center justify-between lg:justify-center lg:flex-col lg:px-4 py-1.5 px-3 rounded-trim hover:bg-white/5 transition-colors cursor-pointer text-left lg:text-center group"
          title="Orders sitting in queue waiting for dispatcher claim"
        >
          <div className="flex items-center gap-1.5 text-board-trim group-hover:text-board-plate transition-colors">
            <ClipboardList size={14} className={urgent > 0 ? "text-signal-on-field" : "text-board-trim"} />
            <span className="text-micro uppercase tracking-[0.06em] font-semibold">
              Waiting Claim
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              data-figure
              className={cn(
                "font-mono text-title font-bold tabular-nums",
                urgent > 0 ? "text-signal-on-field" : unclaimed > 0 ? "text-amber-400" : "text-board-plate"
              )}
            >
              {unclaimed}
            </span>
            {urgent > 0 && (
              <span className="font-mono text-micro px-1.5 py-0.5 rounded-full bg-signal/20 text-signal-on-field border border-signal/30 font-bold animate-pulse">
                {urgent} urgent
              </span>
            )}
          </div>
        </button>

        {/* 2. Active in Motion */}
        <button
          type="button"
          onClick={() => onNavigateTab("active_errands")}
          className="flex items-center justify-between lg:justify-center lg:flex-col lg:px-4 py-1.5 px-3 rounded-trim hover:bg-white/5 transition-colors cursor-pointer text-left lg:text-center group"
          title="Active errands in transit across Tacurong"
        >
          <div className="flex items-center gap-1.5 text-board-trim group-hover:text-board-plate transition-colors">
            <Activity size={14} className="text-emerald-400" />
            <span className="text-micro uppercase tracking-[0.06em] font-semibold">
              In Motion
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              data-figure
              className="font-mono text-title font-bold tabular-nums text-board-plate"
            >
              {active}
            </span>
            <span className="text-micro text-board-trim">active</span>
          </div>
        </button>

        {/* 3. Fleet Duty */}
        <button
          type="button"
          onClick={() => onNavigateTab("riders")}
          className="flex items-center justify-between lg:justify-center lg:flex-col lg:px-4 py-1.5 px-3 rounded-trim hover:bg-white/5 transition-colors cursor-pointer text-left lg:text-center group"
          title="On-duty active riders vs registered fleet"
        >
          <div className="flex items-center gap-1.5 text-board-trim group-hover:text-board-plate transition-colors">
            <Bike size={14} className="text-sky-400" />
            <span className="text-micro uppercase tracking-[0.06em] font-semibold">
              Fleet Online
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              data-figure
              className={cn(
                "font-mono text-title font-bold tabular-nums",
                onlineRidersCount > 0 ? "text-emerald-400" : "text-amber-400"
              )}
            >
              {onlineRidersCount}
            </span>
            <span className="font-mono text-label text-board-trim tabular-nums">
              /{totalRidersCount || 0}
            </span>
          </div>
        </button>

        {/* 4. Help Desk Blockers */}
        <button
          type="button"
          onClick={() => onNavigateTab("exceptions")}
          className="flex items-center justify-between lg:justify-center lg:flex-col lg:px-4 py-1.5 px-3 rounded-trim hover:bg-white/5 transition-colors cursor-pointer text-left lg:text-center group"
          title="Open reconciliation exceptions and disputes"
        >
          <div className="flex items-center gap-1.5 text-board-trim group-hover:text-board-plate transition-colors">
            <AlertTriangle
              size={14}
              className={helpDesk > 0 ? "text-signal-on-field" : "text-board-trim"}
            />
            <span className="text-micro uppercase tracking-[0.06em] font-semibold">
              Help Desk
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              data-figure
              className={cn(
                "font-mono text-title font-bold tabular-nums",
                helpDesk > 0 ? "text-signal-on-field" : "text-board-plate"
              )}
            >
              {helpDesk}
            </span>
            {helpDesk > 0 && (
              <span className="font-mono text-micro px-1.5 py-0.5 rounded-full bg-signal/20 text-signal-on-field border border-signal/30 font-bold">
                blocker
              </span>
            )}
          </div>
        </button>

        {/* 5. Delivered Today */}
        <button
          type="button"
          onClick={() => onNavigateTab("history")}
          className="flex items-center justify-between lg:justify-center lg:flex-col lg:px-4 py-1.5 px-3 rounded-trim hover:bg-white/5 transition-colors cursor-pointer text-left lg:text-center group col-span-2 sm:col-span-1"
          title="Errands delivered and completed today"
        >
          <div className="flex items-center gap-1.5 text-board-trim group-hover:text-board-plate transition-colors">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-micro uppercase tracking-[0.06em] font-semibold">
              Done Today
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              data-figure
              className="font-mono text-title font-bold tabular-nums text-board-plate"
            >
              {delivered}
            </span>
            <span className="text-micro text-board-trim">delivered</span>
          </div>
        </button>
      </div>
    </div>
  );
};
