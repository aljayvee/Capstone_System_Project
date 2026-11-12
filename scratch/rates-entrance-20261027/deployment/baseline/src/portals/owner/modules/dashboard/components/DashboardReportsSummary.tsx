import React from "react";
import {
  BarChart2,
  Bike,
  Percent,
  Wallet,
  Receipt,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useDashboardReportsSummary } from "../../../hooks/useDashboardReportsSummary";
import { DeferredSummaryCharts } from "./DeferredSummaryCharts";
import { ReportsSummarySkeleton } from "../../../components/OwnerSkeletons";
import type { ApiDateRange } from "../../../../../services/apiService";

export type ReportTab =
  | "sales"
  | "rider-performance"
  | "commission"
  | "settlement"
  | "transactions"
  | "exceptions";

interface DashboardReportsSummaryProps {
  range: ApiDateRange;
  onNavigateToReport?: (tab: ReportTab) => void;
}

function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-US")}`;
}

export const DashboardReportsSummary: React.FC<DashboardReportsSummaryProps> = ({
  range,
  onNavigateToReport,
}) => {
  const { metrics, isLoading } = useDashboardReportsSummary(range);

  const placeholder = isLoading ? "…" : "--";

  // Computed values
  const onTimeText =
    metrics.riders?.onTimeRate != null
      ? `${Math.round(metrics.riders.onTimeRate * 100)}% on time`
      : "On time not checked yet";

  return (
    <section className="space-y-4 pt-2">
      {/* Unified Flat Executive Summary Plate */}
      <div className="rounded-plate border border-edge bg-board-plate overflow-hidden">
        <header className="px-5 py-3 border-b border-edge flex items-center justify-between">
          <div>
            <h3 className="text-panel text-ink">Summary Reports</h3>
          </div>
        </header>

        <div className="divide-y divide-hairline">
          {isLoading ? (
            <ReportsSummarySkeleton count={6} />
          ) : (
            <>
              {/* 1. Sales Report */}
          <div className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-board-ground/40 transition-colors">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-board-ground text-ink-muted shrink-0">
                <BarChart2 size={18} />
              </span>
              <div className="min-w-0">
                <div className="text-label font-semibold text-ink">Sales Report</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {metrics.sales
                    ? `${metrics.sales.totalOrders} orders${
                        metrics.sales.topCategory ? ` · Best seller: ${metrics.sales.topCategory}` : ""
                      }`
                    : "What customers paid"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0">
              <div className="text-right">
                <div className="font-mono text-base font-bold text-ink tabular-nums">
                  {metrics.sales ? formatPeso(metrics.sales.totalRevenue) : placeholder}
                </div>
                <div className="text-[11px] text-ink-muted">Total sales</div>
              </div>
              {onNavigateToReport && (
                <button
                  type="button"
                  onClick={() => onNavigateToReport("sales")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-edge bg-board-ground hover:bg-board-ground/80 text-xs font-medium text-ink transition-colors cursor-pointer"
                >
                  <span>View</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* 2. Rider Performance */}
          <div className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-board-ground/40 transition-colors">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-board-ground text-ink-muted shrink-0">
                <Bike size={18} />
              </span>
              <div className="min-w-0">
                <div className="text-label font-semibold text-ink">Rider Performance</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {metrics.riders
                    ? `${onTimeText} · ${metrics.riders.riderCount} riders worked`
                    : "How riders did"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0">
              <div className="text-right">
                <div className="font-mono text-base font-bold text-ink tabular-nums">
                  {metrics.riders ? `${metrics.riders.completedCount} delivered` : placeholder}
                </div>
                <div className="text-[11px] text-ink-muted">Orders delivered</div>
              </div>
              {onNavigateToReport && (
                <button
                  type="button"
                  onClick={() => onNavigateToReport("rider-performance")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-edge bg-board-ground hover:bg-board-ground/80 text-xs font-medium text-ink transition-colors cursor-pointer"
                >
                  <span>View</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* 3. Commission */}
          <div className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-board-ground/40 transition-colors">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-board-ground text-ink-muted shrink-0">
                <Percent size={18} />
              </span>
              <div className="min-w-0">
                <div className="text-label font-semibold text-ink">Commission</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {metrics.commission
                    ? `Taken from ${formatPeso(metrics.commission.totalDeliveryFees)} in delivery fees`
                    : "How delivery fees are split"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0">
              <div className="text-right">
                <div className="font-mono text-base font-bold text-board-field tabular-nums">
                  {metrics.commission ? formatPeso(metrics.commission.businessShare) : placeholder}
                </div>
                <div className="text-[11px] text-ink-muted">Sugo's share</div>
              </div>
              {onNavigateToReport && (
                <button
                  type="button"
                  onClick={() => onNavigateToReport("commission")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-edge bg-board-ground hover:bg-board-ground/80 text-xs font-medium text-ink transition-colors cursor-pointer"
                >
                  <span>View</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* 4. Settlement */}
          <div className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-board-ground/40 transition-colors">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-board-ground text-ink-muted shrink-0">
                <Wallet size={18} />
              </span>
              <div className="min-w-0">
                <div className="text-label font-semibold text-ink">Settlement</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {metrics.settlement
                    ? [
                        metrics.settlement.varianceTotal < 0
                          ? `${formatPeso(-metrics.settlement.varianceTotal)} short`
                          : metrics.settlement.varianceTotal > 0
                            ? `${formatPeso(metrics.settlement.varianceTotal)} over`
                            : "Cash matched",
                        `${metrics.settlement.shortageCount} ${metrics.settlement.shortageCount === 1 ? "time" : "times"} short`,
                        ...(metrics.settlement.stillOwed > 0
                          ? [`${formatPeso(metrics.settlement.stillOwed)} still owed`]
                          : []),
                      ].join(" · ")
                    : "Cash riders handed over"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0">
              <div className="text-right">
                <div className="font-mono text-base font-bold text-ink tabular-nums">
                  {metrics.settlement ? formatPeso(metrics.settlement.collectedTotal) : placeholder}
                </div>
                <div className="text-[11px] text-ink-muted">Cash collected</div>
              </div>
              {onNavigateToReport && (
                <button
                  type="button"
                  onClick={() => onNavigateToReport("settlement")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-edge bg-board-ground hover:bg-board-ground/80 text-xs font-medium text-ink transition-colors cursor-pointer"
                >
                  <span>View</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* 5. Transactions */}
          <div className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-board-ground/40 transition-colors">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-board-ground text-ink-muted shrink-0">
                <Receipt size={18} />
              </span>
              <div className="min-w-0">
                <div className="text-label font-semibold text-ink">Transactions</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {metrics.transactions
                    ? `${formatPeso(metrics.transactions.totalAmount)} paid in all`
                    : "Orders paid by cash or GCash"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0">
              <div className="text-right">
                <div className="font-mono text-base font-bold text-ink tabular-nums">
                  {metrics.transactions ? `${metrics.transactions.totalCount} paid` : placeholder}
                </div>
                <div className="text-[11px] text-ink-muted">Orders paid</div>
              </div>
              {onNavigateToReport && (
                <button
                  type="button"
                  onClick={() => onNavigateToReport("transactions")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-edge bg-board-ground hover:bg-board-ground/80 text-xs font-medium text-ink transition-colors cursor-pointer"
                >
                  <span>View</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* 6. Help Desk Report */}
          <div className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-board-ground/40 transition-colors">
            <div className="flex items-center gap-3">
              <span
                className={`p-2 rounded-lg shrink-0 ${
                  metrics.conflicts && metrics.conflicts.openCount > 0
                    ? "bg-status-act-fill text-status-act-ink"
                    : "bg-board-ground text-ink-muted"
                }`}
              >
                <AlertTriangle size={18} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-label font-semibold text-ink">Help Desk Report</span>
                  {metrics.conflicts && metrics.conflicts.openCount > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-status-act-fill text-status-act-ink">
                      Needs a look
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {metrics.conflicts
                    ? `${formatPeso(metrics.conflicts.totalAtRisk)} involved · ${
                        metrics.conflicts.resolvedCount
                      } cleared`
                    : "Problems with orders and cash"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0">
              <div className="text-right">
                <div
                  className={`font-mono text-base font-bold tabular-nums ${
                    metrics.conflicts && metrics.conflicts.openCount > 0
                      ? "text-status-act-ink"
                      : "text-ink"
                  }`}
                >
                  {metrics.conflicts ? `${metrics.conflicts.openCount} open` : placeholder}
                </div>
                <div className="text-[11px] text-ink-muted">Problems not cleared</div>
              </div>
              {onNavigateToReport && (
                <button
                  type="button"
                  onClick={() => onNavigateToReport("exceptions")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-edge bg-board-ground hover:bg-board-ground/80 text-xs font-medium text-ink transition-colors cursor-pointer"
                >
                  <span>View</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
            </>
          )}
        </div>
      </div>

      {/* The two charts under the summary */}
      <DeferredSummaryCharts metrics={metrics} isLoading={isLoading} />
    </section>
  );
};
