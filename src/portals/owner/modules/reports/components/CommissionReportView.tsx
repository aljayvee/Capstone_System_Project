import React, { useEffect, useState } from "react";
import { ReportState } from "./ReportState";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { ReportNotes } from "./ReportNotes";
import { PeriodBreakdownTable } from "./PeriodBreakdownTable";
import { useReport } from "../../../hooks/useReport";
import { useReportPrint } from "../../../hooks/useReportPrint";
import { apiService, type ApiCommissionReport } from "../../../../../services/apiService";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { toApiRange, type RangePreset } from "../../../../../components/RangeSelector";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatPeso } from "../../../../../utils/format";
import { MobileResponsiveTable, TablePagination } from "../../../../../components/table";
import { usePagination } from "../../../../../hooks/usePagination";
import { formatErrandId } from "../../../../../utils/formatErrandId";
import { RiderSearchPicker, type RiderOption } from "./RiderSearchPicker";

type CommissionPoint = NonNullable<ApiCommissionReport["timelineBreakdown"]>[number];

export const CommissionReportView: React.FC = () => {
  const [preset, setPreset] = useState<RangePreset>("TODAY");
  const [range, setRange] = useState<DateRange | null>(null);
  // One rider, or null for every rider. Carried in the report query, so the
  // screen and the printout are narrowed by the same server call.
  const [riderId, setRiderId] = useState<number | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = { ...toApiRange(preset, range), ...(riderId ? { riderId } : {}) };
  const { data, isLoading, error, reload } = useReport(apiService.getCommissionReport, apiRange);
  const printer = useReportPrint("commission", apiRange);
  const ordersPagination = usePagination(data?.orders ?? [], 25, [preset, range, riderId]);
  // Kept across reloads, so the picker does not vanish while a new window loads.
  const [riderOptions, setRiderOptions] = useState<RiderOption[]>([]);
  useEffect(() => {
    if (data?.riderOptions) setRiderOptions(data.riderOptions);
  }, [data]);

  const handleExportCSV = () => {
    if (!data) return;
    if (data.rider) {
      // One rider: their orders, the same lines as the printout.
      downloadCSV(
        `Sugo_Commission_${data.rider.name.replace(/[^A-Za-z0-9]+/g, "_")}_${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
        ["Order", "Placed", "Delivery Fee (PHP)", "Tip (PHP)", "Sugo's Share (PHP)", "Rider's Share (PHP)"],
        (data.orders ?? []).map((o) => [
          o.referenceNo ?? formatErrandId(o.errandId),
          o.placedAt,
          o.deliveryFee,
          o.tip,
          o.businessShare,
          o.riderShare,
        ]),
      );
      return;
    }
    downloadCSV(
      `Sugo_Commission_Report_${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      [
        "Store Type",
        "Orders",
        "Total Sales (PHP)",
        "Delivery Fees (PHP)",
        "Sugo's Share (PHP)",
        "Rider's Share (PHP)",
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
        onPrint={printer.print}
        onExportCSV={handleExportCSV}
        exportDisabled={!data}
        isPreparingPrint={printer.isPreparing}
        printError={printer.error}
        filters={<RiderSearchPicker options={riderOptions} value={riderId} onChange={setRiderId} />}
        printLabel={riderId ? "Print rider report" : "Print"}
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
            {data.rider && <span className="font-semibold text-ink">{data.rider.name} · </span>}
            {data.coverageLabel ?? data.rangeLabel} · Sugo keeps {businessPct}% of each delivery
            fee, from {data.orderCount} {data.orderCount === 1 ? "order" : "orders"}
            {data.rider && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => setRiderId(null)}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Show all riders
                </button>
              </>
            )}
          </p>

          <PeriodBreakdownTable<CommissionPoint>
            subject="Sugo's earnings"
            unit={data.breakdownUnit}
            points={data.timelineBreakdown}
            figures={[
              { header: "Orders", format: "count", value: (p) => p.orderCount },
              { header: "Delivery fees", format: "money", value: (p) => p.deliveryFee },
              { header: "Sugo's share", format: "money", value: (p) => p.businessShare, primary: true },
              { header: "Rider's share", format: "money", value: (p) => p.riderShare },
            ]}
          />

          {data.byCategory.length === 0 ? (
            <div className="bg-board-plate rounded-plate p-8 border border-edge text-center text-label text-ink-muted">
              No earnings were recorded for these dates.
            </div>
          ) : (
            <>
              <div className="bg-board-plate border border-edge rounded-plate p-6">
                <div className="text-body font-semibold text-ink mb-4">
                  How each store type's delivery fees were split
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
                      name="Sugo's share"
                      fill="#1E3A5F"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="riderShare"
                      name="Rider's share"
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
                            Store type
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Orders
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Total sales
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Delivery fees
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Sugo's share
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Rider's share
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
                  primaryHeader="Store type and orders"
                  secondaryHeader="Sugo's and rider's share"
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
                        Rider's: {formatPeso(c.riderShare)}
                      </div>
                    </div>
                  )}
                  renderPreview={(c) => (
                    <div className="space-y-1.5 pt-1 text-ink-muted">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Delivery fees</span>
                        <span className="font-mono font-medium text-ink tabular-nums">{formatPeso(c.deliveryFee)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Sugo's share</span>
                        <span className="font-mono font-medium text-board-field tabular-nums">{formatPeso(c.businessShare)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Rider's share</span>
                        <span className="font-mono font-medium text-status-done-ink tabular-nums">{formatPeso(c.riderShare)}</span>
                      </div>
                    </div>
                  )}
                  inspectorTitle={(c) => c.category}
                  inspectorSubtitle={(c) => `${c.orderCount} orders · ${formatPeso(c.deliveryFee)} in delivery fees`}
                  inspectorStatusBadge={(c) => (
                    <span className="font-mono font-semibold text-xs text-board-field">
                      Sugo's: {formatPeso(c.businessShare)}
                    </span>
                  )}
                  inspectorSections={(c) => [
                    {
                      title: "Orders and fees",
                      items: [
                        { label: "Store type", value: c.category },
                        { label: "Orders", value: `${c.orderCount}` },
                        { label: "Total sales", value: formatPeso(c.revenue) },
                        { label: "Delivery fees", value: formatPeso(c.deliveryFee) },
                      ],
                    },
                    {
                      title: "How the fees were split",
                      items: [
                        { label: "Sugo's share", value: formatPeso(c.businessShare) },
                        { label: "Rider's share", value: formatPeso(c.riderShare) },
                      ],
                    },
                  ]}
                />
              );
            })()}
            </>
          )}

          {data.rider && (
            <div className="bg-board-plate border border-edge rounded-plate overflow-hidden" data-testid="commission-rider-orders">
              <header className="px-5 py-3 border-b border-edge">
                <h4 className="text-label text-ink">Every order {data.rider.name} delivered in these dates</h4>
              </header>
              {(data.orders ?? []).length === 0 ? (
                <p className="p-6 text-center text-label text-ink-muted">
                  {data.rider.name} delivered no orders in these dates.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                  <table className="w-full text-label">
                    <thead className="bg-board-ground text-ink-muted">
                      <tr>
                        <th scope="col" className="text-left px-5 py-2 font-semibold">Order</th>
                        <th scope="col" className="text-left px-5 py-2 font-semibold">Placed</th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">Delivery fee</th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">Tip</th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">Sugo's share</th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">Rider's share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersPagination.paginatedItems.map((o) => (
                        <tr key={o.errandId} className="border-t border-hairline">
                          <td className="px-5 py-2.5 font-mono text-ink whitespace-nowrap">
                            {o.referenceNo ?? formatErrandId(o.errandId)}
                          </td>
                          <td className="px-5 py-2.5 text-ink-muted whitespace-nowrap">
                            {new Date(o.placedAt).toLocaleString("en-PH", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              timeZone: "Asia/Manila",
                            })}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">{formatPeso(o.deliveryFee)}</td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">{formatPeso(o.tip)}</td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">{formatPeso(o.businessShare)}</td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">{formatPeso(o.riderShare)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-edge font-bold text-ink">
                        <td className="px-5 py-2.5" colSpan={2}>Total</td>
                        {(["deliveryFee", "tip", "businessShare", "riderShare"] as const).map((k) => (
                          <td key={k} className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {formatPeso((data.orders ?? []).reduce((s, o) => s + o[k], 0))}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  currentPage={ordersPagination.currentPage}
                  totalPages={ordersPagination.totalPages}
                  totalItems={ordersPagination.totalItems}
                  startIndex={ordersPagination.startIndex}
                  endIndex={ordersPagination.endIndex}
                  onPageChange={ordersPagination.setCurrentPage}
                  itemName="orders"
                />
              </>
              )}
            </div>
          )}

          <ReportNotes notes={data.notes} />
        </>
      )}

    </div>
  );
};
