import React, { useState } from "react";
import { TrendingUp, Truck } from "lucide-react";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { MetricCard } from "../../dashboard/components/MetricCard";
import { useReport } from "../../../hooks/useReport";
import { apiService, type ReportPeriod } from "../../../../../services/apiService";
import { downloadCSV } from "../../../../../utils/downloadCSV";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export const CommissionReportView: React.FC = () => {
  const [period, setPeriod] = useState<ReportPeriod>("MONTHLY");
  const [date, setDate] = useState(todayISO());
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error } = useReport(apiService.getCommissionReport, period, date);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Commission_Report_${data.period}_${date}.csv`,
      ["Category", "Orders", "Revenue (PHP)"],
      data.byCategory.map((c) => [c.category, c.orderCount, c.revenue])
    );
  };

  return (
    <div className="space-y-6">
      <ReportPeriodToolbar
        period={period}
        onPeriodChange={setPeriod}
        date={date}
        onDateChange={setDate}
        onPrint={() => setReviewOpen(true)}
        onExportCSV={handleExportCSV}
        exportDisabled={!data}
      />

      {error && <p className="text-xs text-rose-600">{error}</p>}
      {isLoading && <p className="text-xs text-slate-400">Loading commission report...</p>}

      {data && (
        <>
          <p className="text-xs text-slate-500 font-semibold">{data.rangeLabel}</p>
          <p className="text-xs text-slate-400 italic -mt-1">
            Commission is a fixed 30% of this period's order value — the rider retains the remaining 70%.
          </p>
          <div className="grid grid-cols-2 gap-6">
            <MetricCard
              title="Estimated Commission"
              value={`₱${data.estimatedCommission.toLocaleString()}`}
              sub={`${data.orderCount} orders`}
              icon={TrendingUp}
              color="#1E3A5F"
            />
            <MetricCard
              title="Total Delivery Fees"
              value={`₱${data.totalDeliveryFees.toLocaleString()}`}
              sub="Charged to customers"
              icon={Truck}
              color="#10B981"
            />
          </div>

          {data.byCategory.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center text-sm text-slate-400">
              No commission activity for this period.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2">Category</th>
                    <th className="py-2 text-right">Orders</th>
                    <th className="py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((c) => (
                    <tr key={c.category} className="border-b border-slate-50">
                      <td className="py-2">{c.category}</td>
                      <td className="py-2 text-right">{c.orderCount}</td>
                      <td className="py-2 text-right">₱{c.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <DigitalReportReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        reportName="Commission Report"
        rangeLabel={data?.rangeLabel ?? ""}
        onPrintNow={() => window.print()}
      >
        {data && (
          <div className="space-y-3 text-xs">
            <p>
              Estimated Commission: <span className="font-bold">₱{data.estimatedCommission.toLocaleString()}</span>
            </p>
            <p>
              Total Delivery Fees: <span className="font-bold">₱{data.totalDeliveryFees.toLocaleString()}</span>
            </p>
            <p>
              Orders: <span className="font-bold">{data.orderCount}</span>
            </p>
          </div>
        )}
      </DigitalReportReviewModal>
    </div>
  );
};
