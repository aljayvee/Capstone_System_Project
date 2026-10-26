import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../../../utils/lazyWithRetry";
import { RevenuePlotSkeleton } from "../../../components/OwnerSkeletons";

const RevenuePlot = lazyWithRetry(() => import("./RevenuePlot"));

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
          <h3 className="text-panel text-ink">Sales ({timeframe})</h3>
          <p className="text-micro text-ink-muted mt-0.5">
            How much customers paid, and how much of it goes to riders, in these dates
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 self-start sm:self-auto divide-x divide-hairline">
          <div>
            <div className="text-micro uppercase text-ink-muted">Total sales</div>
            <div
              className="text-lg font-bold font-mono text-ink tabular-nums mt-0.5"
              title={grossRevenue !== undefined ? undefined : placeholderWhy}
            >
              {grossRevenue !== undefined ? formatPeso(grossRevenue) : placeholder}
            </div>
          </div>
          <div className="pl-4 sm:pl-6">
            <div className="text-micro uppercase text-ink-muted">Rider's share</div>
            <div
              className="text-lg font-bold font-mono text-status-done-ink tabular-nums mt-0.5"
              title={estimatedPayouts !== undefined ? undefined : placeholderWhy}
            >
              {estimatedPayouts !== undefined ? formatPeso(estimatedPayouts) : placeholder}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <RevenuePlotSkeleton />
      ) : !hasData ? (
        // Ordered error-first, like every other state in this portal: a failed
        // request is not a quiet trading period.
        <div className="flex h-[240px] flex-col items-center justify-center gap-1.5 px-6 text-center">
          <p className="text-label text-ink">
            {error ? "The sales chart did not load" : "No sales in these dates"}
          </p>
          <p className="max-w-xs text-label text-ink-muted">
            {error
              ? "The chart is empty because the numbers did not arrive, not because nothing was sold."
              : "No order was paid for in these dates."}
          </p>
        </div>
      ) : (
        <Suspense fallback={<RevenuePlotSkeleton />}>
          <RevenuePlot data={data} />
        </Suspense>
      )}
    </div>
  );
};
