import React, { useState } from "react";
import { ReportState } from "./ReportState";
import { AlertTriangle, ShieldCheck, Banknote, UserSearch } from "lucide-react";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { MetricCard } from "../../dashboard/components/MetricCard";
import { useReport } from "../../../hooks/useReport";
import { useReportPdf } from "../../../hooks/useReportPdf";
import { apiService, type ExceptionKind } from "../../../../../services/apiService";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { toApiRange, type RangePreset } from "../../../../../components/RangeSelector";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatPeso } from "../../../../../utils/format";

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
  const [preset, setPreset] = useState<RangePreset>("TODAY");
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
      `Sugo_Exception_Report_${(data.meta?.rangeLabel ?? "report").replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
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
        title="The exception report did not load"
        loadingRows={4}
      />

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title="Still open"
              tone="act"
              value={String(data.summary.openCount)}
              icon={AlertTriangle}
            />
            <MetricCard
              title="Cleared"
              tone="done"
              value={String(data.summary.resolvedCount)}
              icon={ShieldCheck}
            />
            <MetricCard
              title="Total at risk"
              tone="waiting"
              value={formatPeso(data.summary.totalAtRisk)}
              icon={Banknote}
            />
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
                </section>
              )}

              {/* ── every exception ─────────────────────────────────────── */}
              <section className="bg-board-plate border border-edge rounded-plate overflow-hidden">
                <header className="px-5 py-3 border-b border-edge">
                  <h3 className="text-label text-ink">Every exception in this period</h3>
                </header>
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
