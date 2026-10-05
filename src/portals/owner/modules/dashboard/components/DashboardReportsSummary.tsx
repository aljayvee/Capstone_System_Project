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
import { CategorySalesChart } from "./CategorySalesChart";
import { FinancialChannelMixChart } from "./FinancialChannelMixChart";
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
  timeframe: string;
  onNavigateToReport?: (tab: ReportTab) => void;
}

function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-US")}`;
}

export const DashboardReportsSummary: React.FC<DashboardReportsSummaryProps> = ({
  range,
  timeframe,
  onNavigateToReport,
}) => {
  const { metrics, isLoading } = useDashboardReportsSummary(range);

  const placeholder = isLoading ? "…" : "--";

  // Category data for Chart 1
  const categoryChartData = metrics.sales?.categoryBreakdown || [];

  // Computed values
  const onTimeText =
    metrics.riders?.onTimeRate != null
      ? `${Math.round(metrics.riders.onTimeRate * 100)}% on-time`
      : "ETA unrecorded";

  return (
    <section className="space-y-4 pt-2">
      {/* Unified Flat Executive Summary Plate */}
      <div className="rounded-plate border border-edge bg-board-plate overflow-hidden">
        <header className="px-5 py-3 border-b border-edge flex items-center justify-between">
          <div>
            <h3 className="text-panel text-ink">Reports & Analytics Overview</h3>
            <p className="text-micro text-ink-muted mt-0.5">
              High-level domain telemetry and operational reconciliation ({timeframe.toLowerCase()})
            </p>
          </div>
        </header>

        <div className="divide-y divide-hairline">
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
                    ? `${metrics.sales.totalOrders} total orders${
                        metrics.sales.topCategory ? ` · Top: ${metrics.sales.topCategory}` : ""
                      }`
                    : "Gross merchandise revenue"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0">
              <div className="text-right">
                <div className="font-mono text-base font-bold text-ink tabular-nums">
                  {metrics.sales ? formatPeso(metrics.sales.totalRevenue) : placeholder}
                </div>
                <div className="text-[11px] text-ink-muted">Gross Revenue</div>
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
                    ? `${onTimeText} · ${metrics.riders.riderCount} active riders`
                    : "Fleet fulfillment throughput"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0">
              <div className="text-right">
                <div className="font-mono text-base font-bold text-ink tabular-nums">
                  {metrics.riders ? `${metrics.riders.completedCount} Deliveries` : placeholder}
                </div>
                <div className="text-[11px] text-ink-muted">Fulfillment Volume</div>
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
                    ? `From ${formatPeso(metrics.commission.totalDeliveryFees)} total delivery fees`
                    : "Platform earnings split"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0">
              <div className="text-right">
                <div className="font-mono text-base font-bold text-board-field tabular-nums">
                  {metrics.commission ? formatPeso(metrics.commission.businessShare) : placeholder}
                </div>
                <div className="text-[11px] text-ink-muted">Business Net Share</div>
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
                    ? `Variance: ${formatPeso(metrics.settlement.varianceTotal)} · ${
                        metrics.settlement.shortageCount
                      } shortage flags`
                    : "Cash collected & reconciled"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0">
              <div className="text-right">
                <div className="font-mono text-base font-bold text-ink tabular-nums">
                  {metrics.settlement ? formatPeso(metrics.settlement.collectedTotal) : placeholder}
                </div>
                <div className="text-[11px] text-ink-muted">Cash Reconciled</div>
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
                    ? `${formatPeso(metrics.transactions.totalAmount)} gross settled transaction volume`
                    : "Payment gateway & COD orders"}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0">
              <div className="text-right">
                <div className="font-mono text-base font-bold text-ink tabular-nums">
                  {metrics.transactions ? `${metrics.transactions.totalCount} Settled` : placeholder}
                </div>
                <div className="text-[11px] text-ink-muted">Settled Errands</div>
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

          {/* 6. Conflict Report */}
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
                  <span className="text-label font-semibold text-ink">Conflict Report</span>
                  {metrics.conflicts && metrics.conflicts.openCount > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-status-act-fill text-status-act-ink">
                      Needs Review
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {metrics.conflicts
                    ? `${formatPeso(metrics.conflicts.totalAtRisk)} at risk · ${
                        metrics.conflicts.resolvedCount
                      } cleared`
                    : "Disputes & unreconciled runs"}
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
                  {metrics.conflicts ? `${metrics.conflicts.openCount} Open` : placeholder}
                </div>
                <div className="text-[11px] text-ink-muted">Unresolved Conflicts</div>
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
        </div>
      </div>

      {/* Dual Professional Standard UI Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-2">
        <CategorySalesChart
          data={categoryChartData}
          timeframe={timeframe}
          isLoading={isLoading}
        />
        <FinancialChannelMixChart
          commission={metrics.commission}
          transactions={metrics.transactions}
          timeframe={timeframe}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
};
