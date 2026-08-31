import React, { useState } from "react";
import { AlertTriangle, ShieldCheck, Banknote, UserSearch } from "lucide-react";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { MetricCard } from "../../dashboard/components/MetricCard";
import { useReport } from "../../../hooks/useReport";
import { apiService, type ExceptionKind, type ReportPeriod } from "../../../../../services/apiService";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatPeso } from "../../../../../utils/format";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Plain names, because a reader should not need the enum to read the report. */
const KIND_LABEL: Record<ExceptionKind, string> = {
  CASH_VARIANCE: "Cash variance",
  RECEIPT_DIVERGENCE: "Receipt divergence",
  UNVERIFIED_PURCHASE: "Unverified purchase",
  WRONG_BRANCH: "Wrong branch",
  MISSING_RECEIPT: "No receipt at a stop",
  STALLED_STOP: "Long stop",
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
  const [period, setPeriod] = useState<ReportPeriod>("MONTHLY");
  const [date, setDate] = useState(todayISO());
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error } = useReport(apiService.getExceptionReport, period, date);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Exception_Report_${period}_${date}.csv`,
      ["Errand", "Kind", "At Risk (PHP)", "Rider", "Occurred", "Detail", "Resolved By", "Reason"],
      data.exceptions.map((e) => [
        e.errandId,
        KIND_LABEL[e.kind],
        e.amountAtRisk,
        e.riderName ?? "—",
        new Date(e.occurredAt).toLocaleString(),
        e.detail,
        e.resolvedBy ?? "",
        e.resolutionReason ?? "",
      ])
    );
  };

  return (
    <div className="space-y-6">
      <ReportPeriodToolbar
        period={period}
        onPeriodChange={setPeriod}
        date={date}
        onDateChange={setDate}
        onPrint={() => setReviewOpen(true)}
        onExportCSV={handleExportCSV}
        exportDisabled={!data}
      />

      {isLoading && <p className="text-sm text-slate-500">Loading exceptions…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title="Still open"
              value={String(data.summary.openCount)}
              icon={AlertTriangle}
              color="#B91C1C"
            />
            <MetricCard
              title="Cleared"
              value={String(data.summary.resolvedCount)}
              icon={ShieldCheck}
              color="#15803D"
            />
            <MetricCard
              title="Total at risk"
              value={formatPeso(data.summary.totalAtRisk)}
              icon={Banknote}
              color="#B45309"
            />
          </div>

          {data.summary.openCount === 0 && data.summary.resolvedCount === 0 ? (
            <div
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm font-medium text-emerald-900"
              data-testid="exceptions-all-clear"
            >
              Every errand in this period reconciled. Nothing needed a decision.
            </div>
          ) : (
            <>
              {/* ── by kind ─────────────────────────────────────────────── */}
              <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <header className="px-5 py-3 border-b border-slate-200">
                  <h3 className="text-sm font-extrabold text-slate-800">What went wrong</h3>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="text-left px-5 py-2 font-semibold">Kind</th>
                        <th className="text-right px-5 py-2 font-semibold">Count</th>
                        <th className="text-right px-5 py-2 font-semibold">At risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.summary.byKind.map((k) => (
                        <tr key={k.kind} className="border-t border-slate-100">
                          <td className="px-5 py-2.5 font-semibold text-slate-800">{KIND_LABEL[k.kind]}</td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">{k.count}</td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {k.atRisk > 0 ? formatPeso(k.atRisk) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── per rider, as a rate ────────────────────────────────── */}
              {data.riders.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <header className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                    <UserSearch size={14} className="text-slate-500" />
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">By rider</h3>
                    </div>
                  </header>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="text-left px-5 py-2 font-semibold">Rider</th>
                          <th className="text-right px-5 py-2 font-semibold">Errands</th>
                          <th className="text-right px-5 py-2 font-semibold">Exceptions</th>
                          <th className="text-right px-5 py-2 font-semibold">Per errand</th>
                          <th className="text-right px-5 py-2 font-semibold">At risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.riders.map((r) => (
                          <tr key={r.riderId} className="border-t border-slate-100">
                            <td className="px-5 py-2.5 font-semibold text-slate-800">{r.riderName ?? `Rider ${r.riderId}`}</td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">{r.errandCount}</td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">{r.exceptionCount}</td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">{r.rate.toFixed(2)}</td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {r.atRisk > 0 ? formatPeso(r.atRisk) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* ── every exception ─────────────────────────────────────── */}
              <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <header className="px-5 py-3 border-b border-slate-200">
                  <h3 className="text-sm font-extrabold text-slate-800">Every exception in this period</h3>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" data-testid="exception-report-table">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="text-left px-5 py-2 font-semibold">Errand</th>
                        <th className="text-left px-5 py-2 font-semibold">Kind</th>
                        <th className="text-right px-5 py-2 font-semibold">At risk</th>
                        <th className="text-left px-5 py-2 font-semibold">What happened</th>
                        <th className="text-left px-5 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.exceptions.map((e, i) => (
                        <tr key={`${e.errandId}-${e.kind}-${i}`} className="border-t border-slate-100 align-top">
                          <td className="px-5 py-2.5 font-mono text-[11px] text-slate-500">
                            {e.errandId.slice(0, 8)}
                          </td>
                          <td className="px-5 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                            {KIND_LABEL[e.kind]}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {e.amountAtRisk > 0 ? formatPeso(e.amountAtRisk) : "—"}
                          </td>
                          <td className="px-5 py-2.5 text-slate-600 max-w-md">{e.detail}</td>
                          <td className="px-5 py-2.5">
                            {e.resolvedAt ? (
                              <div className="space-y-0.5">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold">
                                  Cleared by {e.resolvedBy}
                                </span>
                                <p className="text-[11px] text-slate-500">{e.resolutionReason}</p>
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 font-semibold">
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
        onPrintNow={() => window.print()}
      >
        {data && (
          <div className="space-y-2 text-xs">
            <p>
              Still open: <span className="font-bold">{data.summary.openCount}</span>
            </p>
            <p>
              Cleared: <span className="font-bold">{data.summary.resolvedCount}</span>
            </p>
            <p>
              Total at risk: <span className="font-bold">{formatPeso(data.summary.totalAtRisk)}</span>
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
