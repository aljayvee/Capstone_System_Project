import React, { useState } from "react";
import { ReportState } from "./ReportState";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { PeriodBreakdownTable } from "./PeriodBreakdownTable";
import { useReport } from "../../../hooks/useReport";
import { useReportPrint } from "../../../hooks/useReportPrint";
import { apiService, type ApiSalesTimelinePoint } from "../../../../../services/apiService";
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
  const [preset, setPreset] = useState<RangePreset>("TODAY");
  const [range, setRange] = useState<DateRange | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = toApiRange(preset, range);
  const { data, isLoading, error, reload } = useReport(apiService.getSalesReport, apiRange);
  const printer = useReportPrint("sales", apiRange);

  // Retained and still wired, though the button that calls it is hidden — see
  // SHOW_CSV_EXPORT in ReportPeriodToolbar.
  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Sales_Report_${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      [
        "Merchant Category",
        "Errands",
        "Items Cost (PHP)",
        "Service Fees (PHP)",
        "Tips (PHP)",
        "Total Sales (PHP)",
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
        onPrint={printer.print}
        onExportCSV={handleExportCSV}
        exportDisabled={!data}
        isPreparingPrint={printer.isPreparing}
        printError={printer.error}
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
          <p className="text-label text-ink-muted">{data.coverageLabel ?? data.rangeLabel}</p>

          {/* 1. PERIOD BREAKDOWN: Sunday to Saturday for Daily, and so on.
              The same rows the printout opens with. */}
          <PeriodBreakdownTable<ApiSalesTimelinePoint>
            subject="Sales"
            unit={data.breakdownUnit}
            points={data.timelineBreakdown}
            figures={[
              { header: "Errands", format: "count", value: (t) => t.orderCount },
              { header: "Items Cost", format: "money", value: (t) => t.itemCost },
              { header: "Service fees", format: "money", value: (t) => t.deliveryFee },
              { header: "Tips", format: "money", value: (t) => t.tip },
              { header: "Total sales", format: "money", value: (t) => t.revenue, primary: true },
            ]}
          />

          {/* 2. CATEGORY BREAKDOWN SECTION */}
          <div className="space-y-3 pt-2">
            <h3 className="text-panel text-ink">Sales by Merchant Category</h3>

            {data.byCategory.length === 0 ? (
              <div className="bg-board-plate rounded-plate p-8 border border-edge text-center text-label text-ink-muted">
                No sales were recorded for these dates.
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
                    <Tooltip formatter={(v: number) => [formatPeso(v), "Total sales"]} />
                    <Bar
                      dataKey="revenue"
                      name="Total sales"
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
                              Merchant Category
                            </th>
                            <th scope="col" className="text-right px-5 py-2 font-semibold">
                              Errands
                            </th>
                            <th scope="col" className="text-right px-5 py-2 font-semibold">
                              Items Cost
                            </th>
                            <th scope="col" className="text-right px-5 py-2 font-semibold">
                              Service fees
                            </th>
                            <th scope="col" className="text-right px-5 py-2 font-semibold">
                              Tips
                            </th>
                            <th scope="col" className="text-right px-5 py-2 font-semibold">
                              Total sales
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
                                    title={`${c.touchedOrderCount} errands bought something from this merchant category. ${c.orderCount} are counted here, because each errand is counted once, under the merchant category where most of its money went.`}
                                  >
                                    {c.touchedOrderCount} errands bought here
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
                    secondaryHeader="Total sales and errands"
                    renderPrimary={(c) => (
                      <div className="min-w-0">
                        <div className="font-semibold text-ink text-xs truncate">
                          {c.category}
                        </div>
                        {c.touchedOrderCount > c.orderCount && (
                          <div className="text-[10px] text-ink-muted">
                            {c.touchedOrderCount} errands bought here
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
                          {c.orderCount} errand{c.orderCount === 1 ? "" : "s"}
                        </div>
                      </div>
                    )}
                    renderPreview={(c) => (
                      <div className="space-y-1.5 pt-1 text-ink-muted">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Items Cost</span>
                          <span className="font-mono font-medium text-ink tabular-nums">{formatPeso(c.itemCost)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Service fees</span>
                          <span className="font-mono font-medium text-ink tabular-nums">{formatPeso(c.deliveryFee)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Tips</span>
                          <span className="font-mono font-medium text-ink tabular-nums">{formatPeso(c.tip)}</span>
                        </div>
                      </div>
                    )}
                    inspectorTitle={(c) => c.category}
                    inspectorSubtitle={(c) => `${c.orderCount} errand${c.orderCount === 1 ? "" : "s"}`}
                    inspectorStatusBadge={(c) => (
                      <span className="font-mono font-bold text-xs text-ink">
                        {formatPeso(c.revenue)}
                      </span>
                    )}
                    inspectorSections={(c) => [
                      {
                        title: "Sales",
                        items: [
                          { label: "Merchant Category", value: c.category },
                          { label: "Errands", value: `${c.orderCount}` },
                          { label: "Errands that bought here", value: `${c.touchedOrderCount}` },
                          { label: "Total sales", value: formatPeso(c.revenue) },
                        ],
                      },
                      {
                        title: "Costs and fees",
                        items: [
                          { label: "Items Cost", value: formatPeso(c.itemCost) },
                          { label: "Service fees", value: formatPeso(c.deliveryFee) },
                          { label: "Tips", value: formatPeso(c.tip) },
                        ],
                      },
                    ]}
                  />
                );
              })()}

              {/* Surfaced rather than asserted internally: if the allocation ever
                  stops reconciling, it shows up here instead of in an audit.
                  Only the mismatch speaks; a clean match says nothing. */}
              {data.reconciliation.difference !== 0 && (
                <p className="text-label text-status-act-ink" role="alert">
                  The merchant category amounts are off by {formatPeso(data.reconciliation.difference)} from
                  the total sales. Treat this report as unconfirmed.
                </p>
              )}
            </>
          )}
          </div>
        </>
      )}

    </div>
  );
};
