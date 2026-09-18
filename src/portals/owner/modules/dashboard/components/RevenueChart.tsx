import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RevenueChartProps {
  data: Array<{ x: string; revenue: number }>;
  timeframe: string;
  /** True while the period's figures are still in flight. */
  isLoading?: boolean;
  /** Set when the request failed, so the chart does not imply a quiet period. */
  error?: string | null;
}

/**
 * The shape of the period's revenue.
 *
 * Two things this fixes.
 *
 * THE "LIVE SYNC" BADGE IS GONE. It was a lit blue pill rendered
 * unconditionally in the header, so it announced a live feed over an empty
 * chart whenever the dashboard request had failed. Nothing about this
 * component ever checked a connection. Staleness is reported once, by the
 * pinned banner on the dashboard that actually knows whether the fetch
 * succeeded, rather than twice and inconsistently.
 *
 * NO GRADIENT FILL. The `<linearGradient>` here was the portal's only
 * arguably legitimate gradient, since a fading area fill is a real data-viz
 * convention rather than decoration. It still goes: AGENT_HANDSHAKE's [LOCKED]
 * Flat Design Surface Purity invariant reads "pure solid flat fills only", and
 * a flat wash at low opacity reads the same at a glance while keeping the
 * surface honest to its own rule.
 *
 * An empty series now says which of the two things it is: no revenue in this
 * period, or no answer from the server.
 */
export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  timeframe,
  isLoading = false,
  error = null,
}) => {
  const hasData = data.length > 0;

  return (
    <div className="space-y-3 rounded-plate border border-edge bg-board-plate p-3.5 sm:p-4">
      <h3 className="text-panel text-ink">{timeframe} Revenue Overview</h3>

      {!hasData ? (
        // Ordered error-first, like every other state in this portal: a failed
        // request is not a quiet trading period.
        <div className="flex h-[210px] flex-col items-center justify-center gap-1.5 px-6 text-center">
          <p className="text-label text-ink">
            {error
              ? "The revenue trend did not load"
              : isLoading
                ? "Reading the period"
                : "No revenue in this period"}
          </p>
          <p className="max-w-xs text-label text-ink-muted">
            {error
              ? "Nothing is plotted because nothing arrived, not because nothing was earned."
              : isLoading
                ? " "
                : "Nothing was earned in the selected window."}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
            <XAxis dataKey="x" tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} />
            <YAxis tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} />
            <Tooltip formatter={(v: any) => [`₱${v.toLocaleString()}`, "Revenue"]} />
            {/* A flat fill at low opacity, not a gradient. */}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-board-field)"
              fill="var(--color-board-field)"
              fillOpacity={0.12}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
