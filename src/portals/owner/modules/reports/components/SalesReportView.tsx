import React, { useState } from "react";
import { ReportState } from "./ReportState";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
  const [preset, setPreset] = useState<RangePreset>("TODAY");
  const [range, setRange] = useState<DateRange | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = toApiRange(preset, range);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error, reload } = useReport(apiService.getSalesReport, apiRange);
  const pdf = useReportPdf("sales", apiRange);

  // Retained and still wired, though the button that calls it is hidden — see
  // SHOW_CSV_EXPORT in ReportPeriodToolbar.
  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Sales_Report_${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      [
        "Category",
        "Orders",
        "Item Cost (PHP)",
        "Delivery Fees (PHP)",
        "Tips (PHP)",
        "Revenue (PHP)",
      ],
      data.byCategory.map((c) => [
        c.category,
        c.orderCount,
        c.itemCost,
        c.deliveryFee,
        c.tip,
        c.revenue,
      ]),
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
      <ReportState
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        title="The sales report did not load"
        loadingRows={5}
      />

      {data && (
        <>
          {/* The three tiles that opened this report stated Total Revenue,
              Total Orders and a count of categories - and BOTH tables below
              already end in a bold Total row carrying the first two, so those
              figures printed three times on one screen. The third was the
              length of the list immediately underneath it. A row of figure
              plates above a table that computes the same totals is the
              arrangement this redesign refuses; the totals belong to the
              tables that add them up. */}
          <p className="text-label text-ink-muted">{data.rangeLabel}</p>

          {data.byCategory.length === 0 ? (
            <div className="bg-board-plate rounded-plate p-8 border border-edge text-center text-label text-ink-muted">
              No sales recorded for this period.
            </div>
          ) : (
            <>
              <div className="bg-board-plate border border-edge rounded-plate p-6">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
                      interval={0}
                      height={50}
                      angle={-12}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} />
                    <Tooltip formatter={(v: number) => [formatPeso(v), "Revenue"]} />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="var(--color-board-field)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-board-plate border border-edge rounded-plate overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-label">
                    <thead className="bg-board-ground text-ink-muted">
                      <tr>
                        <th scope="col" className="text-left px-5 py-2 font-semibold">
                          Merchant category
                        </th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">
                          Orders
                        </th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">
                          Item cost
                        </th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">
                          Delivery fees
                        </th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">
                          Tips
                        </th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byCategory.map((c) => (
                        <tr key={c.category} className="border-t border-hairline">
                          <td className="px-5 py-2.5 font-semibold text-ink">
                            {c.category}
                            {c.touchedOrderCount > c.orderCount && (
                              <span
                                className="ml-1.5 text-body text-ink-muted"
                                title={`${c.touchedOrderCount} errands touched this category; ${c.orderCount} are counted here, each errand counting once in the category holding most of its money.`}
                              >
                                touched by {c.touchedOrderCount}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {c.orderCount}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {formatPeso(c.itemCost)}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {formatPeso(c.deliveryFee)}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {formatPeso(c.tip)}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums font-semibold">
                            {formatPeso(c.revenue)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-edge font-bold text-ink">
                        <td className="px-5 py-2.5">Total</td>
                        <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                          {data.totalOrders}
                        </td>
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
                <p className="text-body text-status-done-ink">
                  Category revenue reconciles exactly to the total above.
                </p>
              ) : (
                <p className="text-label text-status-act-ink" role="alert">
                  Category revenue is out by {formatPeso(data.reconciliation.difference)} against
                  the total. Treat this report as provisional.
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
          <table className="w-full text-label">
            <thead>
              <tr className="text-left text-ink-muted border-b border-hairline">
                <th scope="col" className="py-2">
                  Merchant category
                </th>
                <th scope="col" className="py-2 text-right">
                  Orders
                </th>
                <th scope="col" className="py-2 text-right">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {data.byCategory.map((c) => (
                <tr key={c.category} className="border-b border-hairline">
                  <td className="py-2">{c.category}</td>
                  <td className="py-2 text-right">{c.orderCount}</td>
                  <td className="py-2 text-right">{formatPeso(c.revenue)}</td>
                </tr>
              ))}
              <tr className="font-bold text-ink">
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
