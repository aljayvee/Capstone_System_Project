import React, { useState } from "react";
import { ReportState } from "./ReportState";
import { AlertTriangle, ShieldCheck, Banknote, UserSearch } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { useReport } from "../../../hooks/useReport";
import { useReportPdf } from "../../../hooks/useReportPdf";
import { apiService, type ExceptionKind } from "../../../../../services/apiService";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { toApiRange, type RangePreset } from "../../../../../components/RangeSelector";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatPeso } from "../../../../../utils/format";
import { MobileResponsiveTable } from "../../../../../components/table";

/** Plain names, because a reader should not need the enum to read the report. */
const KIND_LABEL: Record<ExceptionKind, string> = {
  CASH_VARIANCE: "Cash variance",
  RECEIPT_DIVERGENCE: "Receipt divergence",
  UNVERIFIED_PURCHASE: "Unverified purchase",
  WRONG_BRANCH: "Wrong branch",
  MISSING_RECEIPT: "No receipt at a stop",
  STALLED_STOP: "Long stop",
  // Named for what the reader has to do about it. "Goods held" says a rider is
  // waiting; "Balance never collected" says the money is simply gone.
  OVERAGE_PENDING: "Goods held, overage unapproved",
  UNPAID_BALANCE: "Balance never collected",
};

/**
 * Errands that did not reconcile, across a period.
 *
 * Where the dispatcher's queue is today's work, this is the pattern: what was
 * raised, what was cleared, by whom, and what is still open weeks later. The
 * resolved ones stay deliberately — "who cleared this and what did they say" is
 * the part that has teeth in a dispute.
 */
export const ExceptionReportView: React.FC = () => {
  const [preset, setPreset] = useState<RangePreset>("MONTH");
  const [range, setRange] = useState<DateRange | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = toApiRange(preset, range);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error, reload } = useReport(apiService.getExceptionReport, apiRange);
  const pdf = useReportPdf("exceptions", apiRange);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      // Exceptions nests its window under `meta`, unlike the other five.
      `Sugo_Conflict_Report_${(data.meta?.rangeLabel ?? "report").replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      ["Errand", "Kind", "At Risk (PHP)", "Rider", "Occurred", "Detail", "Resolved By", "Reason"],
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
        onPreview={() => setReviewOpen(true)}
        onExportCSV={handleExportCSV}
        exportDisabled={!data}
        isGeneratingPdf={pdf.isGenerating}
      />
      <ReportState
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        title="The conflict report did not load"
        loadingRows={4}
      />

      {data && (
        <>
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
                  Requires action / decision
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
                  Resolved & reconciled
                </div>
              </div>
            </div>

            <div className="p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-status-waiting-fill text-status-waiting-ink shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <div className="text-body text-ink-muted">Total at risk</div>
                <div className="text-xl font-bold font-mono text-status-waiting-ink mt-1 tabular-nums">
                  {formatPeso(data.summary.totalAtRisk)}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  Disputed amount
                </div>
              </div>
            </div>
          </div>

          {data.summary.openCount === 0 && data.summary.resolvedCount === 0 ? (
            <div
              className="rounded-plate border border-status-done-ink/20 bg-status-done-fill p-6 text-body text-status-done-ink"
              data-testid="exceptions-all-clear"
            >
              Every errand in this period reconciled. Nothing needed a decision.
            </div>
          ) : (
            <>
              {data.summary.byKind.length > 0 && (
                <div className="bg-board-plate border border-edge rounded-plate p-6">
                  <div className="text-body font-semibold text-ink mb-4">
                    Exceptions by Category
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
                      <Tooltip formatter={(v: number, name: string) => [v, "Exceptions"]} />
                      <Bar
                        dataKey="count"
                        name="Exceptions"
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
                          Kind
                        </th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">
                          Count
                        </th>
                        <th scope="col" className="text-right px-5 py-2 font-semibold">
                          At risk
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
                    primaryHeader="Rider & Volume"
                    secondaryHeader="At Risk & Frequency"
                    renderPrimary={(r) => (
                      <div className="min-w-0">
                        <div className="font-semibold text-ink text-xs truncate">
                          {r.riderName ?? `Rider ${r.riderId}`}
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          {r.errandCount} errand{r.errandCount === 1 ? "" : "s"}
                        </div>
                      </div>
                    )}
                    renderSecondary={(r) => (
                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-semibold text-ink tabular-nums">
                          {r.atRisk > 0 ? formatPeso(r.atRisk) : "--"}
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          {r.exceptionCount} exc ({r.rate.toFixed(2)}/run)
                        </div>
                      </div>
                    )}
                    renderPreview={(r) => (
                      <div className="space-y-1.5 pt-1 text-ink-muted">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Errands:</span>
                          <span className="font-mono text-ink font-medium">{r.errandCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Exceptions:</span>
                          <span className="font-mono text-ink font-medium">{r.exceptionCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Rate:</span>
                          <span className="font-mono text-ink font-medium">{r.rate.toFixed(2)}/errand</span>
                        </div>
                      </div>
                    )}
                    inspectorTitle={(r) => r.riderName ?? `Rider ${r.riderId}`}
                    inspectorSubtitle={(r) => `${r.errandCount} errands · ${r.exceptionCount} exceptions`}
                    inspectorSections={(r) => [
                      {
                        title: "Rider Details",
                        items: [
                          { label: "Rider ID", value: `#${r.riderId}` },
                          { label: "Rider Name", value: r.riderName ?? `Rider ${r.riderId}` },
                          { label: "Completed Errands", value: String(r.errandCount) },
                        ],
                      },
                      {
                        title: "Exception Metrics",
                        items: [
                          { label: "Total Exceptions", value: String(r.exceptionCount) },
                          { label: "Exceptions per Errand", value: r.rate.toFixed(2) },
                          { label: "Total at Risk", value: r.atRisk > 0 ? formatPeso(r.atRisk) : "₱0.00" },
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
                                Errands
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Exceptions
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Per errand
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                At risk
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
                  <h3 className="text-label text-ink">Every exception in this period</h3>
                </header>
                <MobileResponsiveTable<typeof data.exceptions[number]>
                  data={data.exceptions}
                  keyExtractor={(e, i) => `${e.errandId}-${e.kind}-${i}`}
                  primaryHeader="Errand & Kind"
                  secondaryHeader="Status & At Risk"
                  renderPrimary={(e) => (
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-ink text-xs">
                        {e.errandId.slice(0, 8)}
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
                        <span className="text-ink-muted">At Risk:</span>
                        <span className="font-mono text-ink font-medium">{e.amountAtRisk > 0 ? formatPeso(e.amountAtRisk) : "None"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Status:</span>
                        <span className="text-ink">{e.resolvedAt ? `Cleared by ${e.resolvedBy}` : "Open"}</span>
                      </div>
                      <div className="text-[11px] text-ink-muted line-clamp-1">
                        <span className="text-ink-muted">Detail:</span> <span className="text-ink">{e.detail}</span>
                      </div>
                    </div>
                  )}
                  inspectorTitle={(e) => e.errandId}
                  inspectorSubtitle={(e) => `${KIND_LABEL[e.kind]} · ${e.resolvedAt ? "Resolved" : "Open"}`}
                  inspectorSections={(e) => [
                    {
                      title: "Exception Summary",
                      items: [
                        { label: "Errand ID", value: e.errandId, copyable: true, copyValue: e.errandId },
                        { label: "Category / Kind", value: KIND_LABEL[e.kind] },
                        { label: "Amount at Risk", value: e.amountAtRisk > 0 ? formatPeso(e.amountAtRisk) : "None" },
                        { label: "Occurred At", value: new Date(e.occurredAt).toLocaleString() },
                      ],
                    },
                    {
                      title: "Incident Detail",
                      items: [
                        { label: "Detail", value: e.detail, fullWidth: true },
                      ],
                    },
                    {
                      title: "Resolution Information",
                      items: e.resolvedAt ? [
                        { label: "Resolved By", value: e.resolvedBy ?? "N/A" },
                        { label: "Resolved At", value: new Date(e.resolvedAt).toLocaleString() },
                        { label: "Resolution Reason", value: e.resolutionReason || "N/A", fullWidth: true },
                      ] : [
                        { label: "Status", value: "Unresolved — Pending Action", fullWidth: true },
                      ],
                    },
                  ]}
                  desktopView={
                    <div className="overflow-x-auto">
                      <table className="w-full text-label" data-testid="exception-report-table">
                        <thead className="bg-board-ground text-ink-muted">
                          <tr>
                            <th scope="col" className="text-left px-5 py-2 font-semibold">
                              Errand
                            </th>
                            <th scope="col" className="text-left px-5 py-2 font-semibold">
                              Kind
                            </th>
                            <th scope="col" className="text-right px-5 py-2 font-semibold">
                              At risk
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
                          {data.exceptions.map((e, i) => (
                            <tr
                              key={`${e.errandId}-${e.kind}-${i}`}
                              className="border-t border-hairline align-top"
                            >
                              <td className="px-5 py-2.5 font-mono text-label text-ink-muted">
                                {e.errandId.slice(0, 8)}
                              </td>
                              <td className="px-5 py-2.5 font-semibold text-ink whitespace-nowrap">
                                {KIND_LABEL[e.kind]}
                              </td>
                              <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                                {e.amountAtRisk > 0 ? formatPeso(e.amountAtRisk) : "--"}
                              </td>
                              <td className="px-5 py-2.5 text-ink-muted max-w-md">{e.detail}</td>
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
              </section>
            </>
          )}
        </>
      )}

      <DigitalReportReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        reportName="Exception Report"
        rangeLabel={data?.meta?.rangeLabel ?? ""}
        onDownloadPdf={pdf.generate}
        isGenerating={pdf.isGenerating}
        generateError={pdf.error}
      >
        {data && (
          <div className="space-y-2 text-label">
            <p>
              Still open: <span className="font-bold">{data.summary.openCount}</span>
            </p>
            <p>
              Cleared: <span className="font-bold">{data.summary.resolvedCount}</span>
            </p>
            <p>
              Total at risk:{" "}
              <span className="font-bold">{formatPeso(data.summary.totalAtRisk)}</span>
            </p>
            {data.summary.byKind.map((k) => (
              <p key={k.kind}>
                {KIND_LABEL[k.kind]}: <span className="font-bold">{k.count}</span>
                {k.atRisk > 0 && <> · {formatPeso(k.atRisk)}</>}
              </p>
            ))}
          </div>
        )}
      </DigitalReportReviewModal>
    </div>
  );
};
