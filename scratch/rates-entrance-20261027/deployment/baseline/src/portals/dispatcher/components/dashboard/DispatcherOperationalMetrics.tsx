import * as React from "react";
import { cn } from "@/lib/utils";
import { Store, XCircle, Timer, Award } from "lucide-react";

interface DispatcherOperationalMetricsProps {
  topMerchantsToday: Array<{ name: string; count: number }>;
  todayDeclines: Array<{ reason: string; count: number }>;
  myShiftStats: {
    myHandledToday: number;
    myAvgClaimLatencySeconds: number | null;
  };
}

function formatLatency(seconds: number | null): string {
  if (seconds == null || isNaN(seconds)) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = (seconds / 60).toFixed(1);
  return `${mins}m`;
}

export const DispatcherOperationalMetrics: React.FC<DispatcherOperationalMetricsProps> = ({
  topMerchantsToday,
  todayDeclines,
  myShiftStats,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* 1. Top Visited Merchants */}
      <div className="bg-board-plate border border-edge rounded-plate p-4 shadow-plate">
        <div className="flex items-center gap-2 pb-2.5 border-b border-hairline mb-2.5">
          <Store size={15} className="text-ink-muted" />
          <h3 className="text-label uppercase tracking-[0.06em] font-bold text-ink">
            Store Visits Today
          </h3>
        </div>

        {topMerchantsToday.length === 0 ? (
          <p className="text-label text-ink-muted py-4 text-center">No store visits today</p>
        ) : (
          <div className="space-y-1.5">
            {topMerchantsToday.map((merchant, idx) => (
              <div
                key={merchant.name}
                className="flex items-center justify-between text-label py-1 px-1.5 rounded hover:bg-board-ground/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-micro text-ink-muted font-bold w-4">
                    #{idx + 1}
                  </span>
                  <span className="truncate text-ink font-medium">{merchant.name}</span>
                </div>
                <span className="font-mono text-micro font-bold px-2 py-0.5 rounded bg-board-ground text-ink shrink-0 ml-2">
                  {merchant.count} {merchant.count === 1 ? "stop" : "stops"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Today's Decline Reasons */}
      <div className="bg-board-plate border border-edge rounded-plate p-4 shadow-plate">
        <div className="flex items-center gap-2 pb-2.5 border-b border-hairline mb-2.5">
          <XCircle size={15} className="text-rose-500" />
          <h3 className="text-label uppercase tracking-[0.06em] font-bold text-ink">
            Decline Reasons Today
          </h3>
        </div>

        {todayDeclines.length === 0 ? (
          <p className="text-label text-ink-muted py-4 text-center">No declined orders today</p>
        ) : (
          <div className="space-y-1.5">
            {todayDeclines.map((decline) => (
              <div
                key={decline.reason}
                className="flex items-center justify-between text-label py-1 px-1.5 rounded hover:bg-board-ground/50 transition-colors"
              >
                <span className="truncate text-ink font-medium">{decline.reason}</span>
                <span className="font-mono text-micro font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 shrink-0 ml-2">
                  {decline.count} {decline.count === 1 ? "time" : "times"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. My Shift Velocity */}
      <div className="bg-board-plate border border-edge rounded-plate p-4 shadow-plate flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 pb-2.5 border-b border-hairline mb-3">
            <Award size={15} className="text-signal" />
            <h3 className="text-label uppercase tracking-[0.06em] font-bold text-ink">
              My Shift
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="p-3 rounded-trim bg-board-ground/60 border border-hairline">
              <p className="text-micro uppercase tracking-wider text-ink-muted font-semibold">
                Orders Verified
              </p>
              <p data-figure className="font-mono text-title font-bold tabular-nums text-ink mt-1">
                {myShiftStats.myHandledToday}
              </p>
            </div>

            <div className="p-3 rounded-trim bg-board-ground/60 border border-hairline">
              <p className="text-micro uppercase tracking-wider text-ink-muted font-semibold">
                Average Claim Time
              </p>
              <p
                data-figure
                className="font-mono text-title font-bold tabular-nums text-emerald-700 mt-1"
              >
                {formatLatency(myShiftStats.myAvgClaimLatencySeconds)}
              </p>
            </div>
          </div>
        </div>

        <p className="text-micro text-ink-muted mt-3 pt-2 border-t border-hairline">
          Resets daily at midnight (Manila time).
        </p>
      </div>
    </div>
  );
};
