import React, { Suspense, useEffect, useRef, useState } from "react";
import { lazyWithRetry } from "../../../../../utils/lazyWithRetry";
import { useDeviceTier } from "../../../../../hooks/useDeviceTier";
import type { DashboardReportMetrics } from "../../../hooks/useDashboardReportsSummary";
import { SummaryChartSkeleton } from "../../../components/OwnerSkeletons";

const CategorySalesChart = lazyWithRetry(() =>
  import("./CategorySalesChart").then((m) => ({ default: m.CategorySalesChart }))
);
const FinancialChannelMixChart = lazyWithRetry(() =>
  import("./FinancialChannelMixChart").then((m) => ({ default: m.FinancialChannelMixChart }))
);

interface DeferredSummaryChartsProps {
  metrics: Pick<DashboardReportMetrics, "sales" | "commission" | "transactions">;
  timeframe: string;
  isLoading: boolean;
}

function ChartPlaceholder({ title, description, height, message, detail, loading, type = "bars" }: {
  title: string;
  description: string;
  height: number;
  message: string;
  detail?: string;
  loading: boolean;
  type?: "bars" | "mix";
}) {
  return (
    <div className="space-y-3 rounded-plate border border-edge bg-board-plate p-3.5 sm:p-4">
      <div>
        <h3 className="text-panel text-ink">{title}</h3>
        <p className="text-micro text-ink-muted mt-0.5">{description}</p>
      </div>
      {loading ? (
        <SummaryChartSkeleton type={type} />
      ) : (
        <div style={{ height }} className="flex flex-col items-center justify-center gap-1.5 px-6 text-center text-label text-ink-muted">
          <p>{message}</p>
          {detail && <p className="text-micro">{detail}</p>}
        </div>
      )}
    </div>
  );
}

export function DeferredSummaryCharts({ metrics, timeframe, isLoading }: DeferredSummaryChartsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const { isPhone } = useDeviceTier();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setIsNearViewport(true);
        observer.disconnect();
      }
    }, {
      root: containerRef.current?.closest(".overflow-y-auto") ?? null,
      rootMargin: "200px 0px",
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const hasSalesData = Boolean(metrics.sales?.categoryBreakdown.length);
  const salesPlaceholder = <ChartPlaceholder
    title="Sales by store type"
    description={`How much was sold from each kind of store (${timeframe})`}
    height={!isLoading && hasSalesData && isPhone ? 280 : 240}
    loading={isLoading || hasSalesData}
    type="bars"
    message={isLoading ? "Loading sales by store type..." : hasSalesData ? "Loading chart..." : "No sales in these dates"}
    detail={!isLoading && !hasSalesData ? "No store orders were placed in these dates." : undefined}
  />;
  const hasFinancialData = Boolean(
    metrics.commission && (metrics.commission.businessShare > 0 || metrics.commission.riderShare > 0)
  ) || Boolean(metrics.transactions?.paymentMethods.some((method) => method.amount > 0));
  const financialPlaceholder = <ChartPlaceholder
    title="Who gets the fees, and how customers paid"
    description={`The delivery fee split, and cash against GCash or Maya (${timeframe})`}
    height={!isLoading && hasFinancialData && isPhone ? 270 : 240}
    loading={isLoading || hasFinancialData}
    type="mix"
    message={isLoading ? "Loading fees and payments..." : hasFinancialData ? "Loading chart..." : "No fees or payments in these dates"}
    detail={!isLoading && !hasFinancialData ? "No order was paid for in these dates." : undefined}
  />;

  return (
    <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-2">
      {isNearViewport && !isLoading && hasSalesData ? (
        <Suspense fallback={salesPlaceholder}>
          <CategorySalesChart data={metrics.sales?.categoryBreakdown ?? []} timeframe={timeframe} isLoading={isLoading} />
        </Suspense>
      ) : salesPlaceholder}
      {isNearViewport && !isLoading && hasFinancialData ? (
        <Suspense fallback={financialPlaceholder}>
          <FinancialChannelMixChart commission={metrics.commission} transactions={metrics.transactions} timeframe={timeframe} isLoading={isLoading} />
        </Suspense>
      ) : financialPlaceholder}
    </div>
  );
}
