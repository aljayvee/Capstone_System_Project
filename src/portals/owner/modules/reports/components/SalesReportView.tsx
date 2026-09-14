import React, { useState } from "react";
import { TrendingUp, ShoppingBag, Store } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MetricCard } from "../../dashboard/components/MetricCard";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { ReportNotes } from "./ReportNotes";
import { useReport } from "../../../hooks/useReport";
import { useReportPdf } from "../../../hooks/useReportPdf";
import { apiService } from "../../../../../services/apiService";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { toApiRange, type RangePreset } from "../../../../../components/RangeSelector";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatPeso } from "../../../../../utils/format";

export const SalesReportView: React.FC = () => {
  const [preset, setPreset] = useState<RangePreset>("MONTH");
  const [range, setRange] = useState<DateRange | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = toApiRange(preset, range);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error } = useReport(apiService.getSalesReport, apiRange);
  const pdf = useReportPdf("sales", apiRange);

  // Retained and still wired, though the button that calls it is hidden — see
  // SHOW_CSV_EXPORT in ReportPeriodToolbar.
  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Sales_Report_${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      ["Category", "Orders", "Item Cost (PHP)", "Delivery Fees (PHP)", "Tips (PHP)", "Revenue (PHP)"],
      data.byCategory.map((c) => [c.category, c.orderCount, c.itemCost, c.deliveryFee, c.tip, c.revenue])
    );
  };

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
      {isLoading && <p className="text-xs text-slate-400">Loading sales report...</p>}

      {data && (
        <>
          <p className="text-xs text-slate-500 font-semibold">{data.rangeLabel}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <MetricCard
              title="Total Revenue"
              value={formatPeso(data.totalRevenue)}
              sub={data.rangeLabel}
              icon={TrendingUp}
              color="#1E3A5F"
            />
            <MetricCard
              title="Total Orders"
              value={String(data.totalOrders)}
              sub="Errands placed"
              icon={ShoppingBag}
              color="#10B981"
            />
            <MetricCard
              title="Merchant Categories"
              value={String(data.byCategory.length)}
              sub="With sales this period"
              icon={Store}
              color="#8B5CF6"
            />
          </div>

          {data.byCategory.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center text-sm text-slate-400">
              No sales recorded for this period.
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 10, fill: "#64748B" }}
                      interval={0}
                      height={50}
                      angle={-12}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip formatter={(v: number) => [formatPeso(v), "Revenue"]} />
                    <Bar dataKey="revenue" name="Revenue" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="text-left px-5 py-2 font-semibold">Merchant category</th>
                        <th className="text-right px-5 py-2 font-semibold">Orders</th>
                        <th className="text-right px-5 py-2 font-semibold">Item cost</th>
                        <th className="text-right px-5 py-2 font-semibold">Delivery fees</th>
                        <th className="text-right px-5 py-2 font-semibold">Tips</th>
                        <th className="text-right px-5 py-2 font-semibold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byCategory.map((c) => (
                        <tr key={c.category} className="border-t border-slate-100">
                          <td className="px-5 py-2.5 font-semibold text-slate-800">
                            {c.category}
                            {c.touchedOrderCount > c.orderCount && (
                              <span
                                className="ml-1.5 text-[10px] font-medium text-slate-400"
                                title={`${c.touchedOrderCount} errands touched this category; ${c.orderCount} are counted here, each errand counting once in the category holding most of its money.`}
                              >
                                touched by {c.touchedOrderCount}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">{c.orderCount}</td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">{formatPeso(c.itemCost)}</td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {formatPeso(c.deliveryFee)}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">{formatPeso(c.tip)}</td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums font-semibold">
                            {formatPeso(c.revenue)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
                        <td className="px-5 py-2.5">Total</td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums">{data.totalOrders}</td>
                        <td colSpan={3} />
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                          {formatPeso(data.totalRevenue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Surfaced rather than asserted internally: if the allocation ever
                  stops reconciling, it shows up here instead of in an audit. */}
              {data.reconciliation.difference === 0 ? (
                <p className="text-[11px] text-emerald-700 font-medium">
                  Category revenue reconciles exactly to the total above.
                </p>
              ) : (
                <p className="text-xs text-rose-700 font-semibold" role="alert">
                  Category revenue is out by {formatPeso(data.reconciliation.difference)} against the total.
                  Treat this report as provisional.
                </p>
              )}
            </>
          )}

          <ReportNotes notes={data.notes} />
        </>
      )}

      <DigitalReportReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        reportName="Sales Report"
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
                <th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.byCategory.map((c) => (
                <tr key={c.category} className="border-b border-slate-50">
                  <td className="py-2">{c.category}</td>
                  <td className="py-2 text-right">{c.orderCount}</td>
                  <td className="py-2 text-right">{formatPeso(c.revenue)}</td>
                </tr>
              ))}
              <tr className="font-bold text-slate-800">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">{data.totalOrders}</td>
                <td className="py-2 text-right">{formatPeso(data.totalRevenue)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </DigitalReportReviewModal>
    </div>
  );
};
