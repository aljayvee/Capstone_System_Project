import { useEffect, useState } from "react";
import {
  apiService,
  type ApiDateRange,
  type ApiSalesReport,
  type ApiRiderPerformanceReport,
  type ApiCommissionReport,
  type ApiSettlementReport,
  type ApiTransactionSummaryReport,
  type ApiExceptionReport,
} from "../../../services/apiService";

export interface DashboardReportMetrics {
  sales: {
    totalRevenue: number;
    totalOrders: number;
    topCategory: string | null;
    topCategoryRevenue: number;
    categoryBreakdown: Array<{ name: string; revenue: number; orders: number }>;
  } | null;
  riders: {
    completedCount: number;
    riderCount: number;
    onTimeRate: number | null;
    avgDeliveryMinutes: number | null;
    totalRiderShare: number;
  } | null;
  commission: {
    businessShare: number;
    riderShare: number;
    totalDeliveryFees: number;
    commissionRate: number;
  } | null;
  settlement: {
    collectedTotal: number;
    expectedTotal: number;
    varianceTotal: number;
    shortageCount: number;
    settlementCount: number;
  } | null;
  transactions: {
    totalCount: number;
    totalAmount: number;
    deliveryFee: number;
    paymentMethods: Array<{ name: string; count: number; amount: number }>;
  } | null;
  conflicts: {
    openCount: number;
    resolvedCount: number;
    totalAtRisk: number;
  } | null;
}

export interface UseDashboardReportsSummaryResult {
  metrics: DashboardReportMetrics;
  isLoading: boolean;
  errors: Record<string, string | null>;
  reload: () => void;
}

/**
 * Parallel-fetches aggregate summaries for all 6 report domains.
 * Uses Promise.allSettled to ensure that a failure in one report does not
 * break or block the remaining 5 reports on the dashboard.
 */
export function useDashboardReportsSummary(
  range: ApiDateRange
): UseDashboardReportsSummaryResult {
  const [metrics, setMetrics] = useState<DashboardReportMetrics>({
    sales: null,
    riders: null,
    commission: null,
    settlement: null,
    transactions: null,
    conflicts: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Key by values to prevent infinite fetch loop from object reference rebuilding
  const cacheKey = `${range.period ?? ""}|${range.date ?? ""}|${range.start ?? ""}|${range.end ?? ""}|${refreshTrigger}`;

  useEffect(() => {
    let isCancelled = false;

    async function fetchAllReports() {
      setIsLoading(true);

      const [
        salesResult,
        ridersResult,
        commissionResult,
        settlementResult,
        transactionsResult,
        conflictsResult,
      ] = await Promise.allSettled([
        apiService.getSalesReport(range),
        apiService.getRiderPerformanceReport(range),
        apiService.getCommissionReport(range),
        apiService.getSettlementReport(range),
        apiService.getTransactionSummary(range),
        apiService.getExceptionReport(range),
      ]);

      if (isCancelled) return;

      const newErrors: Record<string, string | null> = {};

      // 1. Process Sales Report
      let salesData: DashboardReportMetrics["sales"] = null;
      if (salesResult.status === "fulfilled" && salesResult.value) {
        const report = salesResult.value as ApiSalesReport;
        const sortedCategories = [...(report.byCategory || [])].sort((a, b) => b.revenue - a.revenue);
        const top = sortedCategories[0] || null;

        salesData = {
          totalRevenue: report.totalRevenue ?? 0,
          totalOrders: report.totalOrders ?? 0,
          topCategory: top ? top.category : null,
          topCategoryRevenue: top ? top.revenue : 0,
          categoryBreakdown: sortedCategories.map((c) => ({
            name: c.category,
            revenue: c.revenue,
            orders: c.orderCount,
          })),
        };
      } else {
        newErrors.sales = "Sales report unavailable";
      }

      // 2. Process Rider Performance Report
      let ridersData: DashboardReportMetrics["riders"] = null;
      if (ridersResult.status === "fulfilled" && ridersResult.value) {
        const report = ridersResult.value as ApiRiderPerformanceReport;
        ridersData = {
          completedCount: report.fleet?.completedCount ?? 0,
          riderCount: report.fleet?.riderCount ?? 0,
          onTimeRate: report.fleet?.onTimeRate ?? null,
          avgDeliveryMinutes: report.fleet?.avgDeliveryMinutes ?? null,
          totalRiderShare: report.fleet?.riderShareEarned ?? 0,
        };
      } else {
        newErrors.riders = "Rider performance report unavailable";
      }

      // 3. Process Commission Report
      let commissionData: DashboardReportMetrics["commission"] = null;
      if (commissionResult.status === "fulfilled" && commissionResult.value) {
        const report = commissionResult.value as ApiCommissionReport;
        const businessShare = (report.byCategory || []).reduce((sum, c) => sum + (c.businessShare || 0), 0);
        const riderShare = (report.byCategory || []).reduce((sum, c) => sum + (c.riderShare || 0), 0);

        commissionData = {
          businessShare,
          riderShare,
          totalDeliveryFees: report.totalDeliveryFees ?? 0,
          commissionRate: report.commissionRate ?? 0.2,
        };
      } else {
        newErrors.commission = "Commission report unavailable";
      }

      // 4. Process Settlement Report
      let settlementData: DashboardReportMetrics["settlement"] = null;
      if (settlementResult.status === "fulfilled" && settlementResult.value) {
        const report = settlementResult.value as ApiSettlementReport;
        settlementData = {
          collectedTotal: report.cash?.collectedTotal ?? 0,
          expectedTotal: report.cash?.expectedTotal ?? 0,
          varianceTotal: report.cash?.varianceTotal ?? 0,
          shortageCount: report.cash?.shortageCount ?? 0,
          settlementCount: report.cash?.settlementCount ?? 0,
        };
      } else {
        newErrors.settlement = "Settlement report unavailable";
      }

      // 5. Process Transactions Report
      let transactionsData: DashboardReportMetrics["transactions"] = null;
      if (transactionsResult.status === "fulfilled" && transactionsResult.value) {
        const report = transactionsResult.value as ApiTransactionSummaryReport;
        transactionsData = {
          totalCount: report.totals?.count ?? 0,
          totalAmount: report.totals?.amount ?? 0,
          deliveryFee: report.totals?.deliveryFee ?? 0,
          paymentMethods: (report.byPaymentMethod || []).map((p) => ({
            name: p.paymentMethod || (p as unknown as { name?: string })?.name || "Other",
            count: p.count,
            amount: p.amount,
          })),
        };
      } else {
        newErrors.transactions = "Transactions report unavailable";
      }

      // 6. Process Conflict Report (Exceptions)
      let conflictsData: DashboardReportMetrics["conflicts"] = null;
      if (conflictsResult.status === "fulfilled" && conflictsResult.value) {
        const report = conflictsResult.value as ApiExceptionReport;
        conflictsData = {
          openCount: report.summary?.openCount ?? 0,
          resolvedCount: report.summary?.resolvedCount ?? 0,
          totalAtRisk: report.summary?.totalAtRisk ?? 0,
        };
      } else {
        newErrors.conflicts = "Conflict report unavailable";
      }

      setMetrics({
        sales: salesData,
        riders: ridersData,
        commission: commissionData,
        settlement: settlementData,
        transactions: transactionsData,
        conflicts: conflictsData,
      });
      setErrors(newErrors);
      setIsLoading(false);
    }

    fetchAllReports();

    return () => {
      isCancelled = true;
    };
  }, [cacheKey]);

  const reload = () => setRefreshTrigger((prev) => prev + 1);

  return {
    metrics,
    isLoading,
    errors,
    reload,
  };
}
