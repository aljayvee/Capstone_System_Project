import React, { useState } from "react";
import { ReportState } from "./ReportState";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
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

export const CommissionReportView: React.FC = () => {
  const [preset, setPreset] = useState<RangePreset>("MONTH");
  const [range, setRange] = useState<DateRange | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = toApiRange(preset, range);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error, reload } = useReport(apiService.getCommissionReport, apiRange);
  const pdf = useReportPdf("commission", apiRange);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Commission_Report_${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      [
        "Category",
        "Orders",
        "Revenue (PHP)",
        "Delivery Fees (PHP)",
        "Business Share (PHP)",
        "Rider Share (PHP)",
      ],
      data.byCategory.map((c) => [
        c.category,
        c.orderCount,
        c.revenue,
        c.deliveryFee,
        c.businessShare,
        c.riderShare,
      ]),
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
      <ReportState
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        title="The commission report did not load"
        loadingRows={4}
      />

      {data && (
        <>
          {/* Both figures these two tiles carried are in the table's own bold
              Total row below, so each printed twice on one screen. The
              percentage and the order count the tiles explained have moved to
              the line under the heading, where they read as the denominator
              of the whole report rather than as a caption on a plate. */}
          <p className="text-label text-ink-muted">
            {data.rangeLabel} · commission is {businessPct}% of delivery fees, over{" "}
            {data.orderCount} {data.orderCount === 1 ? "order" : "orders"}
          </p>

          {data.byCategory.length === 0 ? (
            <div className="bg-board-plate rounded-plate p-8 border border-edge text-center text-label text-ink-muted">
              No commission activity for this period.
            </div>
          ) : (
            <>
              <div className="bg-board-plate border border-edge rounded-plate p-6">
                <div className="text-body font-semibold text-ink mb-4">
                  Fee Split by Merchant Category
                </div>
                <ResponsiveContainer width="100%" height={260}>
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
                    <Tooltip formatter={(v: number, name: string) => [formatPeso(v), name]} />
                    <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
                    <Bar
                      dataKey="businessShare"
                      name="Business Share"
                      fill="#1E3A5F"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="riderShare"
                      name="Rider Share"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                    />
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
                            Revenue
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Delivery fees
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Business share
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Rider share
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byCategory.map((c) => (
                          <tr key={c.category} className="border-t border-hairline">
                            <td className="px-5 py-2.5 font-semibold text-ink">{c.category}</td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {c.orderCount}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {formatPeso(c.revenue)}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {formatPeso(c.deliveryFee)}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums font-semibold text-board-field">
                              {formatPeso(c.businessShare)}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums text-status-done-ink">
                              {formatPeso(c.riderShare)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-edge font-bold text-ink">
                          <td className="px-5 py-2.5">Total</td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {data.orderCount}
                          </td>
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
              );

              return (
                <MobileResponsiveTable<typeof data.byCategory[number]>
                  data={data.byCategory}
                  keyExtractor={(c) => c.category}
                  desktopView={desktopTable}
                  primaryHeader="Category & Orders"
                  secondaryHeader="Business vs Rider Share"
                  renderPrimary={(c) => (
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-xs truncate">
                        {c.category}
                      </div>
                      <div className="text-[10px] text-ink-muted">
                        {c.orderCount} order{c.orderCount === 1 ? "" : "s"} · {formatPeso(c.revenue)}
                      </div>
                    </div>
                  )}
                  renderSecondary={(c) => (
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold text-board-field text-xs tabular-nums">
                        {formatPeso(c.businessShare)}
                      </div>
                      <div className="text-[10px] font-mono text-status-done-ink tabular-nums">
                        Rider: {formatPeso(c.riderShare)}
                      </div>
                    </div>
                  )}
                  renderPreview={(c) => (
                    <div className="space-y-1.5 pt-1 text-ink-muted">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Delivery Fees:</span>
                        <span className="font-mono font-medium text-ink tabular-nums">{formatPeso(c.deliveryFee)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Business Net Share:</span>
                        <span className="font-mono font-medium text-board-field tabular-nums">{formatPeso(c.businessShare)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Rider Payout Share:</span>
                        <span className="font-mono font-medium text-status-done-ink tabular-nums">{formatPeso(c.riderShare)}</span>
                      </div>
                    </div>
                  )}
                  inspectorTitle={(c) => c.category}
                  inspectorSubtitle={(c) => `${c.orderCount} Orders · ${formatPeso(c.deliveryFee)} Delivery Fees`}
                  inspectorStatusBadge={(c) => (
                    <span className="font-mono font-semibold text-xs text-board-field">
                      Biz: {formatPeso(c.businessShare)}
                    </span>
                  )}
                  inspectorSections={(c) => [
                    {
                      title: "Commission Allocation",
                      items: [
                        { label: "Merchant Category", value: c.category },
                        { label: "Order Count", value: `${c.orderCount}` },
                        { label: "Gross Revenue", value: formatPeso(c.revenue) },
                        { label: "Total Delivery Fees", value: formatPeso(c.deliveryFee) },
                      ],
                    },
                    {
                      title: "Revenue Split Breakdown",
                      items: [
                        { label: "Business Net Share", value: formatPeso(c.businessShare) },
                        { label: "Rider Payout Share", value: formatPeso(c.riderShare) },
                      ],
                    },
                  ]}
                />
              );
            })()}
            </>
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
                  Business share
                </th>
              </tr>
            </thead>
            <tbody>
              {data.byCategory.map((c) => (
                <tr key={c.category} className="border-b border-hairline">
                  <td className="py-2">{c.category}</td>
                  <td className="py-2 text-right">{c.orderCount}</td>
                  <td className="py-2 text-right">{formatPeso(c.businessShare)}</td>
                </tr>
              ))}
              <tr className="font-bold text-ink">
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
