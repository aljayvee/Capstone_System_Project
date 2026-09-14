import React, { useState } from "react";
import { Wallet, Building2, Bike, Banknote } from "lucide-react";
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
  const { data, isLoading, error } = useReport(apiService.getSettlementReport, apiRange);
  const pdf = useReportPdf("settlement", apiRange);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Settlement_Report_${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      ["Rider", "Settlements", "Expected (PHP)", "Collected (PHP)", "Variance (PHP)", "Short Count"],
      data.cash.byRider.map((r) => [
        r.riderName ?? `Rider ${r.riderId}`,
        r.settlementCount,
        r.expected,
        r.collected,
        r.variance,
        r.shortageCount,
      ])
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

      {error && <p className="text-xs text-rose-600">{error}</p>}
      {isLoading && <p className="text-xs text-slate-400">Loading settlement report...</p>}

      {data && (
        <>
          {/* ── revenue, windowed on when errands were placed ──────────── */}
          <section className="space-y-3">
            <header>
              <h3 className="text-sm font-extrabold text-slate-800">Revenue</h3>
              <p className="text-[11px] text-slate-500">
                {data.rangeLabel} · counted by when each errand was placed
              </p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <MetricCard
                title="Gross Revenue"
                value={formatPeso(data.revenue.grossRevenue)}
                sub={`${data.revenue.orderCount} orders`}
                icon={Wallet}
                color="#1E3A5F"
              />
              <MetricCard
                title="Business Share"
                value={formatPeso(data.revenue.businessShare)}
                sub={`${businessPct}% of delivery fees`}
                icon={Building2}
                color="#8B5CF6"
              />
              <MetricCard
                title="Rider Share"
                value={formatPeso(data.revenue.riderShare)}
                sub={`${riderPct}% of delivery fees, plus all tips`}
                icon={Bike}
                color="#10B981"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-500">Gross Revenue</td>
                    <td className="py-2 text-right font-semibold font-mono tabular-nums">
                      {formatPeso(data.revenue.grossRevenue)}
                    </td>
                  </tr>
                  {/* What that headline is actually made of. Gross Revenue used
                      to blend cash somebody counted with cash nobody has seen,
                      and nothing on screen said which was which. */}
                  <tr className="border-b border-slate-50">
                    <td className="py-2 pl-4 text-slate-400">— reconciled by a rider</td>
                    <td className="py-2 text-right font-mono tabular-nums text-slate-500">
                      {formatPeso(data.revenue.collectedRevenue ?? 0)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 pl-4 text-slate-400">
                      — priced, not yet counted
                      {data.revenue.awaitingCount ? ` (${data.revenue.awaitingCount} orders)` : ""}
                    </td>
                    <td
                      className={`py-2 text-right font-mono tabular-nums ${
                        (data.revenue.awaitingCollection ?? 0) > 0
                          ? "text-amber-600 font-semibold"
                          : "text-slate-500"
                      }`}
                    >
                      {formatPeso(data.revenue.awaitingCollection ?? 0)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-500">Total Delivery Fees Collected</td>
                    <td className="py-2 text-right font-semibold font-mono tabular-nums">
                      {formatPeso(data.revenue.totalDeliveryFees)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-500">Business Share</td>
                    <td className="py-2 text-right font-semibold font-mono tabular-nums text-[#1E3A5F]">
                      {formatPeso(data.revenue.businessShare)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">Rider Share</td>
                    <td className="py-2 text-right font-semibold font-mono tabular-nums text-emerald-600">
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
              <h3 className="text-sm font-extrabold text-slate-800">Cash reconciled</h3>
              <p className="text-[11px] text-slate-500">
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
                color="#0EA5E9"
              />
              <MetricCard
                title="Expected"
                value={formatPeso(data.cash.expectedTotal)}
                sub="What should have come back"
                icon={Wallet}
                color="#64748B"
              />
              <MetricCard
                title="Variance"
                value={formatPeso(data.cash.varianceTotal)}
                sub={`${data.cash.shortageCount} short`}
                icon={Building2}
                color={data.cash.varianceTotal < 0 ? "#B91C1C" : "#10B981"}
              />
            </div>

            {data.cash.byRider.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center text-sm text-slate-400">
                No cash was settled in this period.
              </div>
            ) : (
              <>
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <header className="px-5 py-3 border-b border-slate-200">
                    <h4 className="text-xs font-extrabold text-slate-800">By rider</h4>
                  </header>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="text-left px-5 py-2 font-semibold">Rider</th>
                          <th className="text-right px-5 py-2 font-semibold">Settlements</th>
                          <th className="text-right px-5 py-2 font-semibold">Expected</th>
                          <th className="text-right px-5 py-2 font-semibold">Collected</th>
                          <th className="text-right px-5 py-2 font-semibold">Variance</th>
                          <th className="text-right px-5 py-2 font-semibold">Short</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.cash.byRider.map((r) => (
                          <tr key={r.riderId} className="border-t border-slate-100">
                            <td className="px-5 py-2.5 font-semibold text-slate-800">
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
                                r.variance < 0 ? "text-rose-700 font-semibold" : ""
                              }`}
                            >
                              {formatPeso(r.variance)}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {r.shortageCount}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
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

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <header className="px-5 py-3 border-b border-slate-200">
                    <h4 className="text-xs font-extrabold text-slate-800">Every settlement</h4>
                  </header>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="text-left px-5 py-2 font-semibold">Errand</th>
                          <th className="text-left px-5 py-2 font-semibold">Rider</th>
                          <th className="text-right px-5 py-2 font-semibold">Expected</th>
                          <th className="text-right px-5 py-2 font-semibold">Collected</th>
                          <th className="text-right px-5 py-2 font-semibold">Variance</th>
                          <th className="text-left px-5 py-2 font-semibold">Status</th>
                          <th className="text-left px-5 py-2 font-semibold">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.cash.lines.map((l) => (
                          <tr key={l.errandId} className="border-t border-slate-100">
                            <td className="px-5 py-2.5 font-mono text-slate-500">
                              {formatErrandId(l.errandId)}
                            </td>
                            <td className="px-5 py-2.5">{l.riderName ?? "—"}</td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {formatPeso(l.expected)}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              {formatPeso(l.collected)}
                            </td>
                            <td
                              className={`px-5 py-2.5 text-right font-mono tabular-nums ${
                                l.variance < 0 ? "text-rose-700 font-semibold" : ""
                              }`}
                            >
                              {formatPeso(l.variance)}
                            </td>
                            <td className="px-5 py-2.5">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                {l.status}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-slate-500 max-w-[200px]">
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
          <div className="space-y-3 text-xs">
            <p className="font-semibold text-slate-700">Revenue (by when errands were placed)</p>
            <p>
              Gross Revenue: <span className="font-bold">{formatPeso(data.revenue.grossRevenue)}</span>
            </p>
            <p>
              Business Share: <span className="font-bold">{formatPeso(data.revenue.businessShare)}</span>
            </p>
            <p>
              Rider Share: <span className="font-bold">{formatPeso(data.revenue.riderShare)}</span>
            </p>
            <p className="font-semibold text-slate-700 pt-2">Cash (by when it was settled)</p>
            <p>
              Collected: <span className="font-bold">{formatPeso(data.cash.collectedTotal)}</span> of{" "}
              {formatPeso(data.cash.expectedTotal)} expected
            </p>
            <p>
              Variance: <span className="font-bold">{formatPeso(data.cash.varianceTotal)}</span> across{" "}
              {data.cash.settlementCount} settlements, {data.cash.shortageCount} short
            </p>
          </div>
        )}
      </DigitalReportReviewModal>
    </div>
  );
};
