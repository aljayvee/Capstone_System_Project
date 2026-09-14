import React, { useState } from "react";
import { TrendingUp, Truck } from "lucide-react";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { ReportNotes } from "./ReportNotes";
import { MetricCard } from "../../dashboard/components/MetricCard";
import { useReport } from "../../../hooks/useReport";
import { useReportPdf } from "../../../hooks/useReportPdf";
import { apiService } from "../../../../../services/apiService";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { toApiRange, type RangePreset } from "../../../../../components/RangeSelector";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatPeso } from "../../../../../utils/format";

export const CommissionReportView: React.FC = () => {
  const [preset, setPreset] = useState<RangePreset>("MONTH");
  const [range, setRange] = useState<DateRange | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = toApiRange(preset, range);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error } = useReport(apiService.getCommissionReport, apiRange);
  const pdf = useReportPdf("commission", apiRange);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Commission_Report_${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      ["Category", "Orders", "Revenue (PHP)", "Delivery Fees (PHP)", "Business Share (PHP)", "Rider Share (PHP)"],
      data.byCategory.map((c) => [
        c.category,
        c.orderCount,
        c.revenue,
        c.deliveryFee,
        c.businessShare,
        c.riderShare,
      ])
    );
  };

  // Derived from the rate the server actually split at, never hardcoded.
  const businessPct = data ? Math.round((1 - data.commissionRate) * 100) : 0;

  return (
    <div className="space-y-6">
      <ReportPeriodToolbar
        preset={preset}
        onPresetChange={setPreset}
        range={range}
        onRangeChange={setRange}
        onPreview={() => setReviewOpen(true)}
        onExportCSV={handleExportCSV}
        exportDisabled={!data}
        isGeneratingPdf={pdf.isGenerating}
      />

      {error && <p className="text-xs text-rose-600">{error}</p>}
      {isLoading && <p className="text-xs text-slate-400">Loading commission report...</p>}

      {data && (
        <>
          <p className="text-xs text-slate-500 font-semibold">{data.rangeLabel}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <MetricCard
              title="Estimated Commission"
              value={formatPeso(data.estimatedCommission)}
              sub={`${businessPct}% of delivery fees · ${data.orderCount} orders`}
              icon={TrendingUp}
              color="#1E3A5F"
            />
            <MetricCard
              title="Total Delivery Fees"
              value={formatPeso(data.totalDeliveryFees)}
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
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left px-5 py-2 font-semibold">Merchant category</th>
                      <th className="text-right px-5 py-2 font-semibold">Orders</th>
                      <th className="text-right px-5 py-2 font-semibold">Revenue</th>
                      <th className="text-right px-5 py-2 font-semibold">Delivery fees</th>
                      <th className="text-right px-5 py-2 font-semibold">Business share</th>
                      <th className="text-right px-5 py-2 font-semibold">Rider share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCategory.map((c) => (
                      <tr key={c.category} className="border-t border-slate-100">
                        <td className="px-5 py-2.5 font-semibold text-slate-800">{c.category}</td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums">{c.orderCount}</td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums">{formatPeso(c.revenue)}</td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                          {formatPeso(c.deliveryFee)}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums font-semibold text-[#1E3A5F]">
                          {formatPeso(c.businessShare)}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums text-emerald-700">
                          {formatPeso(c.riderShare)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
                      <td className="px-5 py-2.5">Total</td>
                      <td className="px-5 py-2.5 text-right font-mono tabular-nums">{data.orderCount}</td>
                      <td />
                      <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                        {formatPeso(data.totalDeliveryFees)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                        {formatPeso(data.estimatedCommission)}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <ReportNotes notes={data.notes} />
        </>
      )}

      <DigitalReportReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        reportName="Commission Report"
        rangeLabel={data?.rangeLabel ?? ""}
        onDownloadPdf={pdf.generate}
        isGenerating={pdf.isGenerating}
        generateError={pdf.error}
      >
        {data && (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2">Merchant category</th>
                <th className="py-2 text-right">Orders</th>
                <th className="py-2 text-right">Business share</th>
              </tr>
            </thead>
            <tbody>
              {data.byCategory.map((c) => (
                <tr key={c.category} className="border-b border-slate-50">
                  <td className="py-2">{c.category}</td>
                  <td className="py-2 text-right">{c.orderCount}</td>
                  <td className="py-2 text-right">{formatPeso(c.businessShare)}</td>
                </tr>
              ))}
              <tr className="font-bold text-slate-800">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">{data.orderCount}</td>
                <td className="py-2 text-right">{formatPeso(data.estimatedCommission)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </DigitalReportReviewModal>
    </div>
  );
};
