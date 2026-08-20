import React, { useState } from "react";
import { Wallet, Building2, Bike } from "lucide-react";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { MetricCard } from "../../dashboard/components/MetricCard";
import { useReport } from "../../../hooks/useReport";
import { apiService, type ReportPeriod } from "../../../../../services/apiService";
import { downloadCSV } from "../../../../../utils/downloadCSV";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export const SettlementReportView: React.FC = () => {
  const [period, setPeriod] = useState<ReportPeriod>("DAILY");
  const [date, setDate] = useState(todayISO());
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error } = useReport(apiService.getSettlementReport, period, date);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(`Sugo_Settlement_Report_${data.period}_${date}.csv`, ["Line Item", "Amount (PHP)"], [
      ["Gross Revenue", data.grossRevenue],
      ["Total Delivery Fees", data.totalDeliveryFees],
      ["Business Share", data.businessShare],
      ["Rider Share", data.riderShare],
      ["Order Count", data.orderCount],
    ]);
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
      {isLoading && <p className="text-xs text-slate-400">Loading settlement report...</p>}

      {data && (
        <>
          <p className="text-xs text-slate-500 font-semibold">{data.rangeLabel} Settlement</p>
          <p className="text-xs text-slate-400 italic -mt-1">
            Rider share is a fixed 70% of gross revenue; the business retains the remaining 30% — see the
            Commission Report for the same split.
          </p>

          <div className="grid grid-cols-3 gap-6">
            <MetricCard
              title="Gross Revenue"
              value={`₱${data.grossRevenue.toLocaleString()}`}
              sub={`${data.orderCount} orders`}
              icon={Wallet}
              color="#1E3A5F"
            />
            <MetricCard
              title="Business Share"
              value={`₱${data.businessShare.toLocaleString()}`}
              sub="Fixed 30% of revenue"
              icon={Building2}
              color="#8B5CF6"
            />
            <MetricCard
              title="Rider Share"
              value={`₱${data.riderShare.toLocaleString()}`}
              sub="Fixed 70% of revenue"
              icon={Bike}
              color="#10B981"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-slate-50">
                  <td className="py-2 text-slate-500">Gross Revenue</td>
                  <td className="py-2 text-right font-semibold">₱{data.grossRevenue.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-slate-50">
                  <td className="py-2 text-slate-500">Total Delivery Fees Collected</td>
                  <td className="py-2 text-right font-semibold">₱{data.totalDeliveryFees.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-slate-50">
                  <td className="py-2 text-slate-500">Business Share</td>
                  <td className="py-2 text-right font-semibold text-[#1E3A5F]">
                    ₱{data.businessShare.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-500">Rider Share</td>
                  <td className="py-2 text-right font-semibold text-emerald-600">
                    ₱{data.riderShare.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      <DigitalReportReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        reportName="Settlement Report"
        rangeLabel={data?.rangeLabel ?? ""}
        onPrintNow={() => window.print()}
      >
        {data && (
          <div className="space-y-3 text-xs">
            <p>
              Gross Revenue: <span className="font-bold">₱{data.grossRevenue.toLocaleString()}</span>
            </p>
            <p>
              Business Share: <span className="font-bold">₱{data.businessShare.toLocaleString()}</span>
            </p>
            <p>
              Rider Share: <span className="font-bold">₱{data.riderShare.toLocaleString()}</span>
            </p>
          </div>
        )}
      </DigitalReportReviewModal>
    </div>
  );
};
