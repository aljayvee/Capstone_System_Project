import React, { useState } from "react";
import { ReportState } from "./ReportState";
import { AlertTriangle, ShieldCheck, Banknote, UserSearch } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { PeriodBreakdownTable } from "./PeriodBreakdownTable";
import { useReport } from "../../../hooks/useReport";
import { useReportPrint } from "../../../hooks/useReportPrint";
import {
  apiService,
  type ApiExceptionReport,
  type ExceptionKind,
} from "../../../../../services/apiService";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { formatErrandId } from "../../../../../utils/formatErrandId";
import { toApiRange, type RangePreset } from "../../../../../components/RangeSelector";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatPeso } from "../../../../../utils/format";
import { MobileResponsiveTable, TablePagination } from "../../../../../components/table";
import { usePagination } from "../../../../../hooks/usePagination";

/**
 * Plain names, because a reader should not need the enum to read the report.
 * The printed report uses the same words (server reportPdfService KIND_LABEL).
 */
const KIND_LABEL: Record<ExceptionKind, string> = {
  CASH_VARIANCE: "Cash short or over",
  RECEIPT_DIVERGENCE: "Receipt amount does not match",
  UNVERIFIED_PURCHASE: "Purchase with no receipt",
  WRONG_BRANCH: "Bought at a different store",
  MISSING_RECEIPT: "No receipt for a stop",
  STALLED_STOP: "Rider stayed too long at a store",
  // Named for what the reader has to do about it. "Items held" says a rider is
  // waiting; "Balance never collected" says the money is simply gone.
  OVERAGE_PENDING: "Items held: extra cost not approved yet",
  UNPAID_BALANCE: "Balance not paid",
  CANCELLED_AFTER_PURCHASE: "Cancelled after items were bought",
};

type ProblemPoint = NonNullable<ApiExceptionReport["timelineBreakdown"]>[number];

/**
 * The details are written for the dispatcher's queue and join their clauses
 * with " — ". The report reads them with a comma, the same as its printout.
 */
const plainDetail = (detail: string) => detail.replace(/\s+—\s+/g, ", ");

/**
 * Errands that did not reconcile, across a period.
 *
 * Where the dispatcher's queue is today's work, this is the pattern: what was
 * raised, what was cleared, by whom, and what is still open weeks later. The
 * resolved ones stay deliberately — "who cleared this and what did they say" is
 * the part that has teeth in a dispute.
 */
export const ExceptionReportView: React.FC = () => {
  const [preset, setPreset] = useState<RangePreset>("TODAY");
  const [range, setRange] = useState<DateRange | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = toApiRange(preset, range);
  const { data, isLoading, error, reload } = useReport(apiService.getExceptionReport, apiRange);
  const printer = useReportPrint("exceptions", apiRange);
  const exceptionsPagination = usePagination(data?.exceptions, 25, [preset, range]);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      // Exceptions nests its window under `meta`, unlike the other five.
      `Sugo_Help_Desk_Report_${(data.meta?.rangeLabel ?? "report").replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      ["Order", "Problem", "Money Involved (PHP)", "Rider", "When", "What Happened", "Cleared By", "Reason"],
      data.exceptions.map((e) => [
        e.errandId,
        KIND_LABEL[e.kind],
        e.amountAtRisk,
        e.riderName ?? "--",
        new Date(e.occurredAt).toLocaleString(),
        e.detail,
        e.resolvedBy ?? "",
        e.resolutionReason ?? "",
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
        title="The Help Desk report did not load"
        loadingRows={4}
      />

      {data && (
        <>
          {/* Exceptions nests its window under `meta`, unlike the other five. */}
          {data.meta && (
            <p className="text-label text-ink-muted">
              {data.meta.coverageLabel ?? data.meta.rangeLabel}
            </p>
          )}

          <div className="bg-board-plate border border-edge rounded-plate divide-y sm:divide-y-0 sm:divide-x divide-hairline grid grid-cols-1 sm:grid-cols-3">
            <div className="p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-status-act-fill text-status-act-ink shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-body text-ink-muted">Still open</div>
                <div className="text-xl font-bold font-mono text-status-act-ink mt-1 tabular-nums">
                  {data.summary.openCount}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  Someone needs to decide
                </div>
              </div>
            </div>

            <div className="p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-status-done-fill text-status-done-ink shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-body text-ink-muted">Cleared</div>
                <div className="text-xl font-bold font-mono text-status-done-ink mt-1 tabular-nums">
                  {data.summary.resolvedCount}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  Checked and closed
                </div>
              </div>
            </div>

            <div className="p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-status-waiting-fill text-status-waiting-ink shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <div className="text-body text-ink-muted">Money involved</div>
                <div className="text-xl font-bold font-mono text-status-waiting-ink mt-1 tabular-nums">
                  {formatPeso(data.summary.totalAtRisk)}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  Amount in question
                </div>
              </div>
            </div>
          </div>

          <PeriodBreakdownTable<ProblemPoint>
            subject="Problems"
            unit={data.meta?.breakdownUnit}
            points={data.timelineBreakdown}
            figures={[
              { header: "Problems", format: "count", value: (p) => p.count, primary: true },
              { header: "Still open", format: "count", value: (p) => p.openCount },
              { header: "Cleared", format: "count", value: (p) => p.resolvedCount },
              { header: "Money involved", format: "money", value: (p) => p.atRisk },
            ]}
          />

          {data.summary.openCount === 0 && data.summary.resolvedCount === 0 ? (
            <div
              className="rounded-plate border border-status-done-ink/20 bg-status-done-fill p-6 text-body text-status-done-ink"
              data-testid="exceptions-all-clear"
            >
              Every order in these dates checked out. Nothing needed a decision.
            </div>
          ) : (
            <>
              {data.summary.byKind.length > 0 && (
                <div className="bg-board-plate border border-edge rounded-plate p-6">
                  <div className="text-body font-semibold text-ink mb-4">
                    Problems by type
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={data.summary.byKind.map((k) => ({
                        kind: KIND_LABEL[k.kind] ?? k.kind,
                        count: k.count,
                        atRisk: k.atRisk,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
                      <XAxis
                        dataKey="kind"
                        tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
                        interval={0}
                        height={50}
                        angle={-12}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} />
                      <Tooltip formatter={(v: number) => [v, "Problems"]} />
                      <Bar
                        dataKey="count"
                        name="Problems"
                        radius={[4, 4, 0, 0]}
                      >
                        {data.summary.byKind.map((k, idx) => (
                          <Cell
                            key={`cell-${k.kind}-${idx}`}
                            fill={["#EF4444", "#F59E0B", "#F97316", "#8B5CF6", "#06B6D4"][idx % 5]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── by kind ─────────────────────────────────────────────── */}
              <section className="bg-board-plate border border-edge rounded-plate overflow-hidden">
                <header className="px-5 py-3 border-b border-edge">
                  <h3 className="text-label text-ink">What went wrong</h3>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full text-label">
                    <thead className="bg-board-ground text-ink-muted">
                      <tr>
                        <th scope="col" className="text-left px-5 py-2 font-semibold">
                          Problem
                        </th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">
                          Count
                        </th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">
                          Money involved
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.summary.byKind.map((k) => (
                        <tr key={k.kind} className="border-t border-hairline">
                          <td className="px-5 py-2.5 font-semibold text-ink">
                            {KIND_LABEL[k.kind]}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {k.count}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {k.atRisk > 0 ? formatPeso(k.atRisk) : "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── per rider, as a rate ────────────────────────────────── */}
              {data.riders.length > 0 && (
                <section className="bg-board-plate border border-edge rounded-plate overflow-hidden">
                  <header className="px-5 py-3 border-b border-edge flex items-center gap-2">
                    <UserSearch size={14} className="text-ink-muted" />
                    <div>
                      <h3 className="text-label text-ink">By rider</h3>
                    </div>
                  </header>
                  <MobileResponsiveTable<typeof data.riders[number]>
                    data={data.riders}
                    keyExtractor={(r) => String(r.riderId)}
                    primaryHeader="Rider and orders"
                    secondaryHeader="Money involved and problems"
                    renderPrimary={(r) => (
                      <div className="min-w-0">
                        <div className="font-semibold text-ink text-xs truncate">
                          {r.riderName ?? `Rider ${r.riderId}`}
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          {r.errandCount} order{r.errandCount === 1 ? "" : "s"}
                        </div>
                      </div>
                    )}
                    renderSecondary={(r) => (
                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-semibold text-ink tabular-nums">
                          {r.atRisk > 0 ? formatPeso(r.atRisk) : "--"}
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          {r.exceptionCount} problem{r.exceptionCount === 1 ? "" : "s"}, {r.rate.toFixed(2)} per order
                        </div>
                      </div>
                    )}
                    renderPreview={(r) => (
                      <div className="space-y-1.5 pt-1 text-ink-muted">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Orders</span>
                          <span className="font-mono text-ink font-medium">{r.errandCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Problems</span>
                          <span className="font-mono text-ink font-medium">{r.exceptionCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Problems per order</span>
                          <span className="font-mono text-ink font-medium">{r.rate.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    inspectorTitle={(r) => r.riderName ?? `Rider ${r.riderId}`}
                    inspectorSubtitle={(r) => `${r.errandCount} orders · ${r.exceptionCount} problems`}
                    inspectorSections={(r) => [
                      {
                        title: "Rider",
                        items: [
                          { label: "Rider ID", value: `#${r.riderId}` },
                          { label: "Name", value: r.riderName ?? `Rider ${r.riderId}` },
                          { label: "Orders", value: String(r.errandCount) },
                        ],
                      },
                      {
                        title: "Problems",
                        items: [
                          { label: "Problems", value: String(r.exceptionCount) },
                          { label: "Problems per order", value: r.rate.toFixed(2) },
                          { label: "Money involved", value: r.atRisk > 0 ? formatPeso(r.atRisk) : "₱0.00" },
                        ],
                      },
                    ]}
                    desktopView={
                      <div className="overflow-x-auto">
                        <table className="w-full text-label">
                          <thead className="bg-board-ground text-ink-muted">
                            <tr>
                              <th scope="col" className="text-left px-5 py-2 font-semibold">
                                Rider
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Orders
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Problems
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Per order
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Money involved
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.riders.map((r) => (
                              <tr key={r.riderId} className="border-t border-hairline">
                                <td className="px-5 py-2.5 font-semibold text-ink">
                                  {r.riderName ?? `Rider ${r.riderId}`}
                                </td>
                                <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                                  {r.errandCount}
                                </td>
                                <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                                  {r.exceptionCount}
                                </td>
                                <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                                  {r.rate.toFixed(2)}
                                </td>
                                <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                                  {r.atRisk > 0 ? formatPeso(r.atRisk) : "--"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    }
                  />
                </section>
              )}

              {/* ── every exception ─────────────────────────────────────── */}
              <section className="bg-board-plate border border-edge rounded-plate overflow-hidden">
                <header className="px-5 py-3 border-b border-edge">
                  <h3 className="text-label text-ink">Every problem in these dates</h3>
                </header>
                <MobileResponsiveTable<typeof data.exceptions[number]>
                  data={exceptionsPagination.paginatedItems}
                  keyExtractor={(e, i) => `${e.errandId}-${e.kind}-${i}`}
                  primaryHeader="Order and problem"
                  secondaryHeader="Status and money involved"
                  renderPrimary={(e) => (
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-ink text-xs">
                        {formatErrandId(e.errandId)}
                      </div>
                      <div className="text-[10px] text-ink-muted truncate">
                        {KIND_LABEL[e.kind]}
                      </div>
                    </div>
                  )}
                  renderSecondary={(e) => (
                    <div className="text-right shrink-0">
                      {e.resolvedAt ? (
                        <span className="inline-block px-1.5 py-0.5 rounded-trim bg-status-done-fill text-status-done-ink text-[10px] uppercase font-semibold">
                          Cleared
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded-trim bg-status-act-fill text-status-act-ink text-[10px] uppercase font-semibold">
                          Open
                        </span>
                      )}
                      <div className="font-mono text-xs font-semibold text-ink mt-0.5 tabular-nums">
                        {e.amountAtRisk > 0 ? formatPeso(e.amountAtRisk) : "--"}
                      </div>
                    </div>
                  )}
                  renderPreview={(e) => (
                    <div className="space-y-1.5 pt-1 text-ink-muted">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Money involved</span>
                        <span className="font-mono text-ink font-medium">{e.amountAtRisk > 0 ? formatPeso(e.amountAtRisk) : "None"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Status</span>
                        <span className="text-ink">{e.resolvedAt ? `Cleared by ${e.resolvedBy}` : "Open"}</span>
                      </div>
                      <div className="text-[11px] text-ink-muted line-clamp-1">
                        <span className="text-ink-muted">What happened:</span> <span className="text-ink">{plainDetail(e.detail)}</span>
                      </div>
                    </div>
                  )}
                  inspectorTitle={(e) => formatErrandId(e.errandId)}
                  inspectorSubtitle={(e) => `${KIND_LABEL[e.kind]} · ${e.resolvedAt ? "Cleared" : "Open"}`}
                  inspectorSections={(e) => [
                    {
                      title: "Problem",
                      items: [
                        { label: "Order number", value: formatErrandId(e.errandId), copyable: true, copyValue: e.errandId },
                        { label: "Type", value: KIND_LABEL[e.kind] },
                        { label: "Money involved", value: e.amountAtRisk > 0 ? formatPeso(e.amountAtRisk) : "None" },
                        { label: "When it happened", value: new Date(e.occurredAt).toLocaleString() },
                      ],
                    },
                    {
                      title: "What happened",
                      items: [
                        { label: "Details", value: plainDetail(e.detail), fullWidth: true },
                      ],
                    },
                    {
                      title: "How it was cleared",
                      items: e.resolvedAt ? [
                        { label: "Cleared by", value: e.resolvedBy ?? "N/A" },
                        { label: "Cleared on", value: new Date(e.resolvedAt).toLocaleString() },
                        { label: "Reason given", value: e.resolutionReason || "N/A", fullWidth: true },
                      ] : [
                        { label: "Status", value: "Still open: someone needs to decide", fullWidth: true },
                      ],
                    },
                  ]}
                  desktopView={
                    <div className="overflow-x-auto">
                      <table className="w-full text-label" data-testid="exception-report-table">
                        <thead className="bg-board-ground text-ink-muted">
                          <tr>
                            <th scope="col" className="text-left px-5 py-2 font-semibold">
                              Order
                            </th>
                            <th scope="col" className="text-left px-5 py-2 font-semibold">
                              Problem
                            </th>
                            <th scope="col" className="text-right px-5 py-2 font-semibold">
                              Money involved
                            </th>
                            <th scope="col" className="text-left px-5 py-2 font-semibold">
                              What happened
                            </th>
                            <th scope="col" className="text-left px-5 py-2 font-semibold">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {exceptionsPagination.paginatedItems.map((e, i) => (
                            <tr
                              key={`${e.errandId}-${e.kind}-${i}`}
                              className="border-t border-hairline align-top"
                            >
                              <td className="px-5 py-2.5 font-mono text-label text-ink-muted">
                                {formatErrandId(e.errandId)}
                              </td>
                              <td className="px-5 py-2.5 font-semibold text-ink whitespace-nowrap">
                                {KIND_LABEL[e.kind]}
                              </td>
                              <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                                {e.amountAtRisk > 0 ? formatPeso(e.amountAtRisk) : "--"}
                              </td>
                              <td className="px-5 py-2.5 text-ink-muted max-w-md">{plainDetail(e.detail)}</td>
                              <td className="px-5 py-2.5">
                                {e.resolvedAt ? (
                                   <div className="space-y-0.5">
                                    <span className="inline-block px-2 py-0.5 rounded-trim bg-status-done-fill text-status-done-ink font-semibold">
                                      Cleared by {e.resolvedBy}
                                    </span>
                                    <p className="text-label text-ink-muted">{e.resolutionReason}</p>
                                  </div>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded-trim bg-status-act-fill text-status-act-ink font-semibold">
                                    Open
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  }
                />
                <TablePagination
                  currentPage={exceptionsPagination.currentPage}
                  totalPages={exceptionsPagination.totalPages}
                  totalItems={exceptionsPagination.totalItems}
                  startIndex={exceptionsPagination.startIndex}
                  endIndex={exceptionsPagination.endIndex}
                  onPageChange={exceptionsPagination.setCurrentPage}
                  itemName="problems"
                />
              </section>
            </>
          )}
        </>
      )}

    </div>
  );
};
