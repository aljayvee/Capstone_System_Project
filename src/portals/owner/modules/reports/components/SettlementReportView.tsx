import React, { useState } from "react";
import { ReportState } from "./ReportState";
import { Wallet, Building2, Banknote } from "lucide-react";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { ReportNotes } from "./ReportNotes";
import { MetricCard } from "../../dashboard/components/MetricCard";
import { useReport } from "../../../hooks/useReport";
import { useReportPdf } from "../../../hooks/useReportPdf";
import { apiService } from "../../../../../services/apiService";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { toApiRange, type RangePreset } from "../../../../../components/RangeSelector";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatPeso } from "../../../../../utils/format";
import { formatErrandId } from "../../../../../utils/formatErrandId";

export const SettlementReportView: React.FC = () => {
  const [preset, setPreset] = useState<RangePreset>("TODAY");
  const [range, setRange] = useState<DateRange | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = toApiRange(preset, range);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error, reload } = useReport(apiService.getSettlementReport, apiRange);
  const pdf = useReportPdf("settlement", apiRange);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Settlement_Report_${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      [
        "Rider",
        "Settlements",
        "Expected (PHP)",
        "Collected (PHP)",
        "Variance (PHP)",
        "Short Count",
      ],
      data.cash.byRider.map((r) => [
        r.riderName ?? `Rider ${r.riderId}`,
        r.settlementCount,
        r.expected,
        r.collected,
        r.variance,
        r.shortageCount,
      ]),
    );
  };

  // Derived from the rate the split was actually taken at. The old captions read
  // "Fixed 30% / 70% of revenue", which was wrong twice over: the number was
  // hardcoded, and the split is taken on DELIVERY FEES only — never on the money
  // fronted for the goods, which is the whole point of commissionSplit.ts.
  const riderPct = data ? Math.round(data.commissionRate * 100) : 0;
  const businessPct = 100 - riderPct;

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
        title="The settlement report did not load"
        loadingRows={6}
      />

      {data && (
        <>
          {/* ── revenue, windowed on when errands were placed ──────────── */}
          <section className="space-y-3">
            <header>
              <h3 className="text-label text-ink">Revenue</h3>
              <p className="text-label text-ink-muted">
                {data.rangeLabel} · counted by when each errand was placed
              </p>
            </header>

            {/* The three tiles that used to sit here stated Gross Revenue,
                Business Share and Rider Share - every one of which the table
                below already states, with the composition and the
                awaiting-collection flag the tiles could not show. Two rows of
                three tiles on one screen was also the arrangement this
                redesign refuses. The percentages the tiles carried have moved
                into the labels so nothing was lost with them. */}

            <div className="bg-board-plate border border-edge rounded-plate p-6">
              <table className="w-full text-label">
                <tbody>
                  <tr className="border-b border-hairline">
                    <td className="py-2 text-ink-muted">
                      Gross Revenue
                      {data.revenue.orderCount ? ` (${data.revenue.orderCount} orders)` : ""}
                    </td>
                    <td className="py-2 text-right font-semibold font-mono tabular-nums">
                      {formatPeso(data.revenue.grossRevenue)}
                    </td>
                  </tr>
                  {/* What that headline is actually made of. Gross Revenue used
                      to blend cash somebody counted with cash nobody has seen,
                      and nothing on screen said which was which. */}
                  <tr className="border-b border-hairline">
                    <td className="py-2 pl-8 text-ink-muted">reconciled by a rider</td>
                    <td className="py-2 text-right font-mono tabular-nums text-ink-muted">
                      {formatPeso(data.revenue.collectedRevenue ?? 0)}
                    </td>
                  </tr>
                  <tr className="border-b border-hairline">
                    <td className="py-2 pl-4 text-ink-muted">
                      priced, not yet counted
                      {data.revenue.awaitingCount ? ` (${data.revenue.awaitingCount} orders)` : ""}
                    </td>
                    <td
                      className={`py-2 text-right font-mono tabular-nums ${
                        (data.revenue.awaitingCollection ?? 0) > 0
                          ? "text-status-waiting-ink font-semibold"
                          : "text-ink-muted"
                      }`}
                    >
                      {formatPeso(data.revenue.awaitingCollection ?? 0)}
                    </td>
                  </tr>
                  <tr className="border-b border-hairline">
                    <td className="py-2 text-ink-muted">Total Delivery Fees Collected</td>
                    <td className="py-2 text-right font-semibold font-mono tabular-nums">
                      {formatPeso(data.revenue.totalDeliveryFees)}
                    </td>
                  </tr>
                  <tr className="border-b border-hairline">
                    <td className="py-2 text-ink-muted">
                      Business Share ({businessPct}% of delivery fees)
                    </td>
                    {/* Neutral ink. Navy for the business and the DONE green for
                        the rider was colour standing for a party, and green
                        already means "finished well" on this surface. */}
                    <td className="py-2 text-right font-semibold font-mono tabular-nums text-ink">
                      {formatPeso(data.revenue.businessShare)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-ink-muted">
                      Rider Share ({riderPct}% of delivery fees, plus all tips)
                    </td>
                    <td className="py-2 text-right font-semibold font-mono tabular-nums text-ink">
                      {formatPeso(data.revenue.riderShare)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── cash, on a different clock, and labelled as such ───────── */}
          <section className="space-y-3">
            <header>
              <h3 className="text-label text-ink">Cash reconciled</h3>
              <p className="text-label text-ink-muted">
                {data.rangeLabel} · counted by when cash was settled, so this will not tie to the
                revenue above
              </p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <MetricCard
                title="Cash Collected"
                value={formatPeso(data.cash.collectedTotal)}
                sub={`${data.cash.settlementCount} settlements`}
                icon={Banknote}
              />
              <MetricCard
                title="Expected"
                value={formatPeso(data.cash.expectedTotal)}
                sub="What should have come back"
                icon={Wallet}
              />
              {/* The one MetricCard colour in this portal that already meant
                  something: red on a negative variance, which is a cash
                  shortage somebody has to chase. It keeps that meaning,
                  expressed as a tone from the status law rather than as two
                  raw hexes. */}
              <MetricCard
                title="Variance"
                value={formatPeso(data.cash.varianceTotal)}
                sub={`${data.cash.shortageCount} short`}
                icon={Building2}
                tone={data.cash.varianceTotal < 0 ? "act" : "done"}
              />
            </div>

            {data.cash.byRider.length === 0 ? (
              <div className="bg-board-plate rounded-plate p-8 border border-edge text-center text-label text-ink-muted">
                No cash was settled in this period.
              </div>
            ) : (
              <>
                <div className="bg-board-plate border border-edge rounded-plate overflow-hidden">
                  <header className="px-5 py-3 border-b border-edge">
                    <h4 className="text-label text-ink">By rider</h4>
                  </header>
                  <div className="overflow-x-auto">
                    <table className="w-full text-label">
                      <thead className="bg-board-ground text-ink-muted">
                        <tr>
                          <th scope="col" className="text-left px-5 py-2 font-semibold">
                            Rider
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Settlements
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Expected
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Collected
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Variance
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Short
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.cash.byRider.map((r) => (
                          <tr key={r.riderId} className="border-t border-hairline">
                            <td className="px-5 py-2.5 font-semibold text-ink">
                              {r.riderName ?? `Rider ${r.riderId}`}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {r.settlementCount}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {formatPeso(r.expected)}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {formatPeso(r.collected)}
                            </td>
                            <td
                              className={`px-5 py-2.5 text-right font-mono tabular-nums ${
                                r.variance < 0 ? "text-status-act-ink font-semibold" : ""
                              }`}
                            >
                              {formatPeso(r.variance)}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {r.shortageCount}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-edge font-bold text-ink">
                          <td className="px-5 py-2.5">Total</td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {data.cash.settlementCount}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {formatPeso(data.cash.expectedTotal)}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {formatPeso(data.cash.collectedTotal)}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {formatPeso(data.cash.varianceTotal)}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                            {data.cash.shortageCount}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-board-plate border border-edge rounded-plate overflow-hidden">
                  <header className="px-5 py-3 border-b border-edge">
                    <h4 className="text-label text-ink">Every settlement</h4>
                  </header>
                  <div className="overflow-x-auto">
                    <table className="w-full text-label">
                      <thead className="bg-board-ground text-ink-muted">
                        <tr>
                          <th scope="col" className="text-left px-5 py-2 font-semibold">
                            Errand
                          </th>
                          <th scope="col" className="text-left px-5 py-2 font-semibold">
                            Rider
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Expected
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Collected
                          </th>
                          <th scope="col" className="text-right px-5 py-2 font-semibold">
                            Variance
                          </th>
                          <th scope="col" className="text-left px-5 py-2 font-semibold">
                            Status
                          </th>
                          <th scope="col" className="text-left px-5 py-2 font-semibold">
                            Reason
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.cash.lines.map((l) => (
                          <tr key={l.errandId} className="border-t border-hairline">
                            <td className="px-5 py-2.5 font-mono text-ink-muted">
                              {formatErrandId(l.errandId)}
                            </td>
                            <td className="px-5 py-2.5">{l.riderName ?? "--"}</td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {formatPeso(l.expected)}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {formatPeso(l.collected)}
                            </td>
                            <td
                              className={`px-5 py-2.5 text-right font-mono tabular-nums ${
                                l.variance < 0 ? "text-status-act-ink font-semibold" : ""
                              }`}
                            >
                              {formatPeso(l.variance)}
                            </td>
                            <td className="px-5 py-2.5">
                              <span className="px-2 py-0.5 rounded-full bg-board-ground text-ink-muted text-label">
                                {l.status}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-ink-muted max-w-[200px]">
                              {l.shortReason ?? ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>

          <ReportNotes notes={data.notes} />
        </>
      )}

      <DigitalReportReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        reportName="Settlement Report"
        rangeLabel={data?.rangeLabel ?? ""}
        onDownloadPdf={pdf.generate}
        isGenerating={pdf.isGenerating}
        generateError={pdf.error}
      >
        {data && (
          <div className="space-y-3 text-label">
            <p className="font-semibold text-ink">Revenue (by when errands were placed)</p>
            <p>
              Gross Revenue:{" "}
              <span className="font-bold">{formatPeso(data.revenue.grossRevenue)}</span>
            </p>
            <p>
              Business Share:{" "}
              <span className="font-bold">{formatPeso(data.revenue.businessShare)}</span>
            </p>
            <p>
              Rider Share: <span className="font-bold">{formatPeso(data.revenue.riderShare)}</span>
            </p>
            <p className="font-semibold text-ink pt-2">Cash (by when it was settled)</p>
            <p>
              Collected: <span className="font-bold">{formatPeso(data.cash.collectedTotal)}</span>{" "}
              of {formatPeso(data.cash.expectedTotal)} expected
            </p>
            <p>
              Variance: <span className="font-bold">{formatPeso(data.cash.varianceTotal)}</span>{" "}
              across {data.cash.settlementCount} settlements, {data.cash.shortageCount} short
            </p>
          </div>
        )}
      </DigitalReportReviewModal>
    </div>
  );
};
