import React, { useState } from "react";
import { ReportState } from "./ReportState";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
import { MobileResponsiveTable } from "../../../../../components/table";

const CATEGORY_COLORS = ["#F59E0B", "#10B981", "#06B6D4", "#2563EB", "#6366F1", "#EC4899", "#8B5CF6"];

const getCategoryColor = (name: string, index: number) => {
  const lower = name.toLowerCase();
  if (lower.includes("food") || lower.includes("resto") || lower.includes("dine") || lower.includes("bever")) return "#F59E0B";
  if (lower.includes("groc") || lower.includes("market") || lower.includes("super")) return "#10B981";
  if (lower.includes("pharm") || lower.includes("drug") || lower.includes("med")) return "#06B6D4";
  if (lower.includes("retail") || lower.includes("shop") || lower.includes("cloth")) return "#2563EB";
  if (lower.includes("serv") || lower.includes("pabili") || lower.includes("errand")) return "#6366F1";
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
};

export const SalesReportView: React.FC = () => {
  const [preset, setPreset] = useState<RangePreset>("MONTH");
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
                      radius={[4, 4, 0, 0]}
                    >
                      {data.byCategory.map((c, index) => (
                        <Cell key={`cell-${c.category}-${index}`} fill={getCategoryColor(c.category, index)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {(() => {
                const desktopTable = (
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
                );

                return (
                  <MobileResponsiveTable<typeof data.byCategory[number]>
                    data={data.byCategory}
                    keyExtractor={(c) => c.category}
                    desktopView={desktopTable}
                    primaryHeader="Merchant Category"
                    secondaryHeader="Revenue & Orders"
                    renderPrimary={(c) => (
                      <div className="min-w-0">
                        <div className="font-semibold text-ink text-xs truncate">
                          {c.category}
                        </div>
                        {c.touchedOrderCount > c.orderCount && (
                          <div className="text-[10px] text-ink-muted">
                            touched by {c.touchedOrderCount} errands
                          </div>
                        )}
                      </div>
                    )}
                    renderSecondary={(c) => (
                      <div className="text-right shrink-0">
                        <div className="font-mono font-semibold text-ink text-xs tabular-nums">
                          {formatPeso(c.revenue)}
                        </div>
                        <div className="text-[10px] text-ink-muted tabular-nums">
                          {c.orderCount} order{c.orderCount === 1 ? "" : "s"}
                        </div>
                      </div>
                    )}
                    renderPreview={(c) => (
                      <div className="space-y-1.5 pt-1 text-ink-muted">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Item Cost:</span>
                          <span className="font-mono font-medium text-ink tabular-nums">{formatPeso(c.itemCost)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Delivery Fees:</span>
                          <span className="font-mono font-medium text-ink tabular-nums">{formatPeso(c.deliveryFee)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Tips:</span>
                          <span className="font-mono font-medium text-ink tabular-nums">{formatPeso(c.tip)}</span>
                        </div>
                      </div>
                    )}
                    inspectorTitle={(c) => c.category}
                    inspectorSubtitle={(c) => `${c.orderCount} Total Orders`}
                    inspectorStatusBadge={(c) => (
                      <span className="font-mono font-bold text-xs text-ink">
                        {formatPeso(c.revenue)}
                      </span>
                    )}
                    inspectorSections={(c) => [
                      {
                        title: "Category Sales Performance",
                        items: [
                          { label: "Merchant Category", value: c.category },
                          { label: "Total Orders", value: `${c.orderCount}` },
                          { label: "Touched Orders", value: `${c.touchedOrderCount}` },
                          { label: "Total Revenue", value: formatPeso(c.revenue) },
                        ],
                      },
                      {
                        title: "Cost & Fee Allocation",
                        items: [
                          { label: "Item Cost Subtotal", value: formatPeso(c.itemCost) },
                          { label: "Delivery Fees", value: formatPeso(c.deliveryFee) },
                          { label: "Tips Collected", value: formatPeso(c.tip) },
                        ],
                      },
                    ]}
                  />
                );
              })()}

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
