import * as React from "react";
import { cn } from "@/lib/utils";
import type { DispatcherDashboardSummary } from "@/types/errand";
import { ClipboardList, Bike, AlertTriangle, CheckCircle2 } from "lucide-react";

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
  const helpDesk = summary?.helpDeskCount ?? 0;
  const delivered = summary?.deliveredTodayCount ?? 0;

  return (
    <div
      className="shrink-0 rounded-plate border border-edge bg-board-plate px-3 py-2.5 sm:px-4"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-0 lg:divide-x lg:divide-hairline">
        {/* 1. Waiting Claim */}
        <button
          type="button"
          onClick={() => onNavigateTab("queue")}
          className="flex items-center justify-between lg:justify-center lg:flex-col lg:px-4 py-1.5 px-3 rounded-trim hover:bg-board-ground transition-colors cursor-pointer text-left lg:text-center group"
          title="Orders sitting in queue waiting for dispatcher claim"
        >
          <div className="flex items-center gap-1.5 text-ink-muted group-hover:text-ink transition-colors">
            <ClipboardList size={14} className={urgent > 0 ? "text-status-act-ink" : "text-ink-muted"} />
            <span className="text-micro uppercase tracking-[0.06em] font-semibold">
              Unclaimed
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              data-figure
              className={cn(
                "font-mono text-title font-bold tabular-nums",
                urgent > 0 ? "text-status-act-ink" : unclaimed > 0 ? "text-status-waiting-ink" : "text-ink"
              )}
            >
              {unclaimed}
            </span>
            {urgent > 0 && (
              <span className="font-mono text-micro px-1.5 py-0.5 rounded-full bg-status-act-fill text-status-act-ink font-bold animate-pulse">
                {urgent} urgent
              </span>
            )}
          </div>
        </button>

        {/* 3. Fleet Duty */}
        <button
          type="button"
          onClick={() => onNavigateTab("riders")}
          className="flex items-center justify-between lg:justify-center lg:flex-col lg:px-4 py-1.5 px-3 rounded-trim hover:bg-board-ground transition-colors cursor-pointer text-left lg:text-center group"
          title="On-duty active riders vs registered fleet"
        >
          <div className="flex items-center gap-1.5 text-ink-muted group-hover:text-ink transition-colors">
            <Bike size={14} className="text-board-field" />
            <span className="text-micro uppercase tracking-[0.06em] font-semibold">
              Available Riders
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              data-figure
              className={cn(
                "font-mono text-title font-bold tabular-nums",
                onlineRidersCount > 0 ? "text-status-done-ink" : "text-status-waiting-ink"
              )}
            >
              {onlineRidersCount}
            </span>
            <span className="font-mono text-label text-ink-muted tabular-nums">
              /{totalRidersCount || 0}
            </span>
          </div>
        </button>

        {/* 4. Help Desk Blockers */}
        <button
          type="button"
          onClick={() => onNavigateTab("exceptions")}
          className="flex items-center justify-between lg:justify-center lg:flex-col lg:px-4 py-1.5 px-3 rounded-trim hover:bg-board-ground transition-colors cursor-pointer text-left lg:text-center group"
          title="Open reconciliation exceptions and disputes"
        >
          <div className="flex items-center gap-1.5 text-ink-muted group-hover:text-ink transition-colors">
            <AlertTriangle
              size={14}
              className={helpDesk > 0 ? "text-status-act-ink" : "text-ink-muted"}
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
                helpDesk > 0 ? "text-status-act-ink" : "text-ink"
              )}
            >
              {helpDesk}
            </span>
          </div>
        </button>

        {/* 5. Delivered Today */}
        <button
          type="button"
          onClick={() => onNavigateTab("history")}
          className="flex items-center justify-between lg:justify-center lg:flex-col lg:px-4 py-1.5 px-3 rounded-trim hover:bg-board-ground transition-colors cursor-pointer text-left lg:text-center group"
          title="Errands delivered and completed today"
        >
          <div className="flex items-center gap-1.5 text-ink-muted group-hover:text-ink transition-colors">
            <CheckCircle2 size={14} className="text-status-done-ink" />
            <span className="text-micro uppercase tracking-[0.06em] font-semibold">
              Delivered Today
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              data-figure
              className="font-mono text-title font-bold tabular-nums text-ink"
            >
              {delivered}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
