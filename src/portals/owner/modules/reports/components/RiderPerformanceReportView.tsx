import React, { useState } from "react";
import { Star } from "lucide-react";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { useReport } from "../../../hooks/useReport";
import { apiService, type ReportPeriod } from "../../../../../services/apiService";
import { downloadCSV } from "../../../../../utils/downloadCSV";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const RiderTable: React.FC<{ riders: Array<{ riderId: number; name: string; completedCount: number; avgDeliveryMinutes: number | null; averageRating: number | null }> }> = ({ riders }) => (
  <table className="w-full text-xs">
    <thead>
      <tr className="text-left text-slate-500 border-b border-slate-100">
        <th className="py-2">Rider</th>
        <th className="py-2 text-right">Completed</th>
        <th className="py-2 text-right">Avg. Delivery Time</th>
        <th className="py-2 text-right">Rating</th>
      </tr>
    </thead>
    <tbody>
      {riders.map((r) => (
        <tr key={r.riderId} className="border-b border-slate-50">
          <td className="py-2 font-semibold text-slate-700">{r.name}</td>
          <td className="py-2 text-right">{r.completedCount}</td>
          <td className="py-2 text-right">{r.avgDeliveryMinutes !== null ? `${r.avgDeliveryMinutes} min` : "—"}</td>
          <td className="py-2 text-right">
            {r.averageRating !== null ? (
              <span className="inline-flex items-center gap-1">
                <Star size={12} className="text-amber-400 fill-amber-400" /> {r.averageRating.toFixed(1)}
              </span>
            ) : (
              <span className="text-slate-400">Not yet collected</span>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const RiderPerformanceReportView: React.FC = () => {
  const [period, setPeriod] = useState<ReportPeriod>("MONTHLY");
  const [date, setDate] = useState(todayISO());
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error } = useReport(apiService.getRiderPerformanceReport, period, date);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Rider_Performance_${data.period}_${date}.csv`,
      ["Rider", "Completed Errands", "Avg Delivery Minutes", "Average Rating"],
      data.riders.map((r) => [r.name, r.completedCount, r.avgDeliveryMinutes ?? "", r.averageRating ?? ""])
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
      {isLoading && <p className="text-xs text-slate-400">Loading rider performance report...</p>}

      {data && (
        <>
          <p className="text-xs text-slate-500 font-semibold">{data.rangeLabel}</p>
          {data.riders.every((r) => r.completedCount === 0) ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center text-sm text-slate-400">
              No completed errands for this period yet.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <RiderTable riders={data.riders} />
            </div>
          )}
          {data.riders.some((r) => r.averageRating !== null) === false && (
            <p className="text-xs text-slate-400 italic">
              Ratings aren't collected by the app yet — this column will populate once customers can rate riders.
            </p>
          )}
        </>
      )}

      <DigitalReportReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        reportName="Rider Performance Report"
        rangeLabel={data?.rangeLabel ?? ""}
        onPrintNow={() => window.print()}
      >
        {data && <RiderTable riders={data.riders} />}
      </DigitalReportReviewModal>
    </div>
  );
};
