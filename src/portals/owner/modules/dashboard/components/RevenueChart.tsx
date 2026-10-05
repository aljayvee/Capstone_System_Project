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
  grossRevenue?: number;
  estimatedPayouts?: number;
  placeholder?: string;
  placeholderWhy?: string;
  /** True while the period's figures are still in flight. */
  isLoading?: boolean;
  /** Set when the request failed, so the chart does not imply a quiet period. */
  error?: string | null;
}

function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * The shape of the period's revenue with integrated financial telemetry header.
 */
export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  timeframe,
  grossRevenue,
  estimatedPayouts,
  placeholder = "--",
  placeholderWhy,
  isLoading = false,
  error = null,
}) => {
  const hasData = data.length > 0;

  return (
    <div className="space-y-4 rounded-plate border border-edge bg-board-plate p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-hairline pb-3.5">
        <div>
          <h3 className="text-panel text-ink">{timeframe} Revenue Trend</h3>
          <p className="text-micro text-ink-muted mt-0.5">
            Gross revenue generated and rider payout pool in selected window
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 self-start sm:self-auto divide-x divide-hairline">
          <div>
            <div className="text-micro uppercase text-ink-muted">Gross Revenue</div>
            <div
              className="text-lg font-bold font-mono text-ink tabular-nums mt-0.5"
              title={grossRevenue !== undefined ? undefined : placeholderWhy}
            >
              {grossRevenue !== undefined ? formatPeso(grossRevenue) : placeholder}
            </div>
          </div>
          <div className="pl-4 sm:pl-6">
            <div className="text-micro uppercase text-ink-muted">Estimated Payouts</div>
            <div
              className="text-lg font-bold font-mono text-status-done-ink tabular-nums mt-0.5"
              title={estimatedPayouts !== undefined ? undefined : placeholderWhy}
            >
              {estimatedPayouts !== undefined ? formatPeso(estimatedPayouts) : placeholder}
            </div>
          </div>
        </div>
      </div>

      {!hasData ? (
        // Ordered error-first, like every other state in this portal: a failed
        // request is not a quiet trading period.
        <div className="flex h-[240px] flex-col items-center justify-center gap-1.5 px-6 text-center">
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
                ? " "
                : "Nothing was earned in the selected window."}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
            <XAxis dataKey="x" tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
              tickFormatter={(v: number) => `₱${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
            />
            <Tooltip formatter={(v: any) => [`₱${Number(v).toLocaleString()}`, "Revenue"]} />
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
