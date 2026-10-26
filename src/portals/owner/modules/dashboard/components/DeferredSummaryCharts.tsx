import React, { Suspense, useEffect, useRef, useState } from "react";
import { lazyWithRetry } from "../../../../../utils/lazyWithRetry";
import { useDeviceTier } from "../../../../../hooks/useDeviceTier";
import type { DashboardReportMetrics } from "../../../hooks/useDashboardReportsSummary";
import { SummaryChartSkeleton } from "../../../components/OwnerSkeletons";
import { FINANCIAL_CHART_COPY, feeBars, paymentBars, type FinancialChartView } from "./financialMixModel";

const CategorySalesChart = lazyWithRetry(() =>
  import("./CategorySalesChart").then((m) => ({ default: m.CategorySalesChart }))
);
const FinancialChannelMixChart = lazyWithRetry(() =>
  import("./FinancialChannelMixChart").then((m) => ({ default: m.FinancialChannelMixChart }))
);

interface DeferredSummaryChartsProps {
  metrics: Pick<DashboardReportMetrics, "sales" | "commission" | "transactions">;
  isLoading: boolean;
}

function ChartPlaceholder({ title, height, message, detail, loading, type = "bars" }: {
  title: string;
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

export function DeferredSummaryCharts({ metrics, isLoading }: DeferredSummaryChartsProps) {
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
    title="Sales by Merchant Categories"
    height={!isLoading && hasSalesData && isPhone ? 280 : 240}
    loading={isLoading || hasSalesData}
    type="bars"
    message={isLoading ? "Loading sales by merchant category..." : hasSalesData ? "Loading chart..." : "No sales in these dates"}
    detail={!isLoading && !hasSalesData ? "No store orders were placed in these dates." : undefined}
  />;
  const financialChart = (view: FinancialChartView) => {
    const copy = FINANCIAL_CHART_COPY[view];
    const bars = view === "fees" ? feeBars(metrics.commission) : paymentBars(metrics.transactions);
    const hasData = bars.some((bar) => bar.amount > 0);
    const placeholder = <ChartPlaceholder
      title={copy.title}
      height={!isLoading && hasData && isPhone ? 270 : 240}
      loading={isLoading || hasData}
      type="mix"
      message={isLoading ? copy.loading : hasData ? "Loading chart..." : copy.emptyTitle}
      detail={!isLoading && !hasData ? copy.emptyDetail : undefined}
    />;
    return isNearViewport && !isLoading && hasData ? (
      <Suspense fallback={placeholder}>
        <FinancialChannelMixChart view={view} commission={metrics.commission} transactions={metrics.transactions} isLoading={isLoading} />
      </Suspense>
    ) : placeholder;
  };

  // Sales keeps half the row on wide screens; the fee split and the payment
  // split each take a quarter beside it, and drop below it on narrower ones.
  return (
    <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 pt-2">
      <div className="sm:col-span-2 [&>*]:h-full">
        {isNearViewport && !isLoading && hasSalesData ? (
          <Suspense fallback={salesPlaceholder}>
            <CategorySalesChart data={metrics.sales?.categoryBreakdown ?? []} isLoading={isLoading} />
          </Suspense>
        ) : salesPlaceholder}
      </div>
      {financialChart("fees")}
      {financialChart("payments")}
    </div>
  );
}
