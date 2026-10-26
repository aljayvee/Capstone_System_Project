import React, { useEffect, useState } from "react";
import { ReportState } from "./ReportState";
import { Wallet, Banknote, HandCoins, TrendingDown, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { ReportNotes } from "./ReportNotes";
import { PeriodBreakdownTable } from "./PeriodBreakdownTable";
import { useReport } from "../../../hooks/useReport";
import { useReportPrint } from "../../../hooks/useReportPrint";
import { apiService, type ApiSettlementLine, type ApiSettlementReport } from "../../../../../services/apiService";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { toApiRange, type RangePreset } from "../../../../../components/RangeSelector";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatPeso } from "../../../../../utils/format";
import { formatErrandId } from "../../../../../utils/formatErrandId";
import { MobileResponsiveTable, TablePagination } from "../../../../../components/table";
import { usePagination } from "../../../../../hooks/usePagination";
import { RiderSearchPicker, type RiderOption } from "./RiderSearchPicker";

type CashPoint = NonNullable<ApiSettlementReport["timelineBreakdown"]>[number];

/** MATCHED -> Matched: the handover result, in words. */
const plainStatus = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, " ");

const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" });

/**
 * What became of a short since the handover, in the printout's words:
 * "Rider paid back ₱25.00 (Oct 22, Rose Santos)". Empty for a handover that
 * was not short; the handover's own figures never change.
 */
function whatHappenedSince(l: ApiSettlementLine): string {
  if (!l.short || l.short <= 0) return "";
  const followUps = l.followUps ?? [];
  if (followUps.length === 0) return "Not paid yet";
  return followUps
    .map((u) => {
      const who = [shortDay(u.recordedAt), u.recordedBy, u.reference ? `ref ${u.reference}` : null]
        .filter(Boolean)
        .join(", ");
      return `${u.label} ${formatPeso(u.amount)} (${who})`;
    })
    .join("; ");
}

export const SettlementReportView: React.FC = () => {
  const [preset, setPreset] = useState<RangePreset>("TODAY");
  const [range, setRange] = useState<DateRange | null>(null);
  // One rider, or null for every rider. Carried in the report query, so the
  // screen and the printout are narrowed by the same server call.
  const [riderId, setRiderId] = useState<number | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = { ...toApiRange(preset, range), ...(riderId ? { riderId } : {}) };
  const { data, isLoading, error, reload } = useReport(apiService.getSettlementReport, apiRange);
  const printer = useReportPrint("settlement", apiRange);
  const byRiderPagination = usePagination(data?.cash.byRider, 25, [preset, range, riderId]);
  const linesPagination = usePagination(data?.cash.lines, 25, [preset, range, riderId]);
  // Kept across reloads, so the picker does not vanish while a new window loads.
  const [riderOptions, setRiderOptions] = useState<RiderOption[]>([]);
  useEffect(() => {
    if (data?.riderOptions) setRiderOptions(data.riderOptions);
  }, [data]);

  const handleExportCSV = () => {
    if (!data) return;
    const who = data.rider ? `${data.rider.name.replace(/[^A-Za-z0-9]+/g, "_")}_` : "";
    downloadCSV(
      `Sugo_Settlement_Report_${who}${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      [
        "Rider",
        "Cash Handovers",
        "Should Collect (PHP)",
        "Collected (PHP)",
        "Short or Over (PHP)",
        "Times Short",
        "Paid Back Later (PHP)",
        "Written Off (PHP)",
        "Still Owed Today (PHP)",
      ],
      data.cash.byRider.map((r) => [
        r.riderName ?? `Rider ${r.riderId}`,
        r.settlementCount,
        r.expected,
        r.collected,
        r.variance,
        r.shortageCount,
        r.paidBackLater ?? 0,
        r.writtenOff ?? 0,
        r.stillOwed ?? 0,
      ]),
    );
  };

  // Derived from the rate the split was actually taken at. The old captions read
  // "Fixed 30% / 70% of revenue", which was wrong twice over: the number was
  // hardcoded, and the split is taken on DELIVERY FEES only — never on the money
  // fronted for the goods, which is the whole point of commissionSplit.ts.
  const riderPct = data ? Math.round(data.commissionRate * 100) : 0;
  const lines = data?.cash.lines ?? [];
  const shortTotal =
    data?.cash.shortTotal ?? lines.reduce((s, l) => s + Math.max(0, -l.variance), 0);
  const overTotal = data?.cash.overTotal ?? lines.reduce((s, l) => s + Math.max(0, l.variance), 0);
  const overCount = data?.cash.overCount ?? lines.filter((l) => l.variance > 0).length;
  const businessPct = 100 - riderPct;

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
        title="The settlement report did not load"
        loadingRows={6}
      />

      {data && (
        <>
          {data.rider && (
            <p className="text-label text-ink-muted" data-testid="settlement-rider">
              <span className="font-semibold text-ink">{data.rider.name}</span>
              {" · only this rider's orders and cash handovers · "}
              <button
                type="button"
                onClick={() => setRiderId(null)}
                className="underline underline-offset-2 hover:text-ink"
              >
                Show all riders
              </button>
            </p>
          )}

          {/* ── revenue, windowed on when errands were placed ──────────── */}
          <section className="space-y-3">
            <header>
              <h3 className="text-label text-ink">Sales</h3>
              <p className="text-label text-ink-muted">
                {data.coverageLabel ?? data.rangeLabel} · counted on the day each order was placed
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
                      Total sales
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
                    <td className="py-2 pl-8 text-ink-muted">cash handed over and counted</td>
                    <td className="py-2 text-right font-mono tabular-nums text-ink-muted">
                      {formatPeso(data.revenue.collectedRevenue ?? 0)}
                    </td>
                  </tr>
                  <tr className="border-b border-hairline">
                    <td className="py-2 pl-4 text-ink-muted">
                      not handed over yet
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
                    <td className="py-2 text-ink-muted">Delivery fees</td>
                    <td className="py-2 text-right font-semibold font-mono tabular-nums">
                      {formatPeso(data.revenue.totalDeliveryFees)}
                    </td>
                  </tr>
                  <tr className="border-b border-hairline">
                    <td className="py-2 text-ink-muted">
                      Sugo's share ({businessPct}% of delivery fees)
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
                      Rider's share ({riderPct}% of delivery fees, plus all tips)
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
              <h3 className="text-label text-ink">Cash handed over</h3>
              <p className="text-label text-ink-muted">
                Counted on the day the rider handed the cash over, so it does not have to match the
                sales above
              </p>
            </header>

            <div className="bg-hairline border border-edge rounded-plate overflow-hidden grid grid-cols-1 gap-px sm:grid-cols-2 xl:grid-cols-5">
              <div className="bg-board-plate p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-board-ground text-ink-muted shrink-0">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-body text-ink-muted">Cash collected</div>
                  <div className="text-xl font-bold font-mono text-ink mt-1 tabular-nums">
                    {formatPeso(data.cash.collectedTotal)}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {data.cash.settlementCount} cash handovers
                  </div>
                </div>
              </div>
              <div className="bg-board-plate p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-board-ground text-ink-muted shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-body text-ink-muted">Should collect</div>
                  <div className="text-xl font-bold font-mono text-ink mt-1 tabular-nums">
                    {formatPeso(data.cash.expectedTotal)}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    What should have come back
                  </div>
                </div>
              </div>
              {/* Short and over apart: netted, a ₱60 short and a ₱60 over read
                  as nothing wrong. */}
              <div className="bg-board-plate p-5 flex items-start gap-4" data-testid="short-tile">
                <div className={`p-2.5 rounded-lg shrink-0 ${shortTotal > 0 ? "bg-status-act-fill text-status-act-ink" : "bg-board-ground text-ink-muted"}`}>
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-body text-ink-muted">Short</div>
                  <div className={`text-xl font-bold font-mono mt-1 tabular-nums ${shortTotal > 0 ? "text-status-act-ink" : "text-ink"}`}>
                    {formatPeso(shortTotal)}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {data.cash.shortageCount} {data.cash.shortageCount === 1 ? "time" : "times"} less cash than expected
                  </div>
                </div>
              </div>
              <div className="bg-board-plate p-5 flex items-start gap-4" data-testid="over-tile">
                <div className="p-2.5 rounded-lg shrink-0 bg-board-ground text-ink-muted">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-body text-ink-muted">Over</div>
                  <div className="text-xl font-bold font-mono mt-1 tabular-nums text-ink">
                    {formatPeso(overTotal)}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {overCount} {overCount === 1 ? "time" : "times"} more cash than expected
                  </div>
                </div>
              </div>
              {/* The short as counted stays above. This is what is left of it
                  today, after money that came in later or was written off. */}
              <div className="bg-board-plate p-5 flex items-start gap-4 sm:col-span-2 xl:col-span-1" data-testid="still-owed-tile">
                <div className={`p-2.5 rounded-lg shrink-0 ${(data.cash.stillOwedTotal ?? 0) > 0 ? "bg-status-act-fill text-status-act-ink" : "bg-board-ground text-ink-muted"}`}>
                  <HandCoins className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-body text-ink-muted">Still owed (today)</div>
                  <div className={`text-xl font-bold font-mono mt-1 tabular-nums ${(data.cash.stillOwedTotal ?? 0) > 0 ? "text-status-act-ink" : "text-ink"}`}>
                    {formatPeso(data.cash.stillOwedTotal ?? 0)}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {formatPeso(data.cash.paidBackLaterTotal ?? 0)} paid back later,{" "}
                    {formatPeso(data.cash.writtenOffTotal ?? 0)} written off
                  </div>
                </div>
              </div>
            </div>

            <PeriodBreakdownTable<CashPoint>
              subject="Cash handed over"
              unit={data.breakdownUnit}
              points={data.timelineBreakdown}
              figures={[
                { header: "Handovers", format: "count", value: (p) => p.settlementCount },
                { header: "Should collect", format: "money", value: (p) => p.expected },
                { header: "Collected", format: "money", value: (p) => p.collected, primary: true },
                { header: "Short or over", format: "money", value: (p) => p.variance, signed: true },
                { header: "Times short", format: "count", value: (p) => p.shortageCount },
                { header: "Still owed", format: "money", value: (p) => p.stillOwed ?? 0 },
              ]}
            />

            {data.cash.byRider.length === 0 ? (
              <div className="bg-board-plate rounded-plate p-8 border border-edge text-center text-label text-ink-muted">
                No cash was handed over in these dates.
              </div>
            ) : (
              <>
                <div className="bg-board-plate border border-edge rounded-plate p-6">
                  <div className="text-body font-semibold text-ink mb-4">
                    Cash by rider: should collect and collected
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.cash.byRider}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
                      <XAxis
                        dataKey="riderName"
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
                        dataKey="expected"
                        name="Should collect"
                        fill="#2563EB"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="collected"
                        name="Collected"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-board-plate border border-edge rounded-plate overflow-hidden">
                  <header className="px-5 py-3 border-b border-edge">
                    <h4 className="text-label text-ink">By rider</h4>
                  </header>
                  <MobileResponsiveTable<typeof data.cash.byRider[number]>
                    data={byRiderPagination.paginatedItems}
                    keyExtractor={(r) => String(r.riderId)}
                    primaryHeader="Rider and handovers"
                    secondaryHeader="Short or over"
                    renderPrimary={(r) => (
                      <div className="min-w-0">
                        <div className="font-semibold text-ink text-xs truncate">
                          {r.riderName ?? `Rider ${r.riderId}`}
                        </div>
                        <div className="text-[10px] text-ink-muted">
                          {r.settlementCount} handover{r.settlementCount === 1 ? "" : "s"}
                        </div>
                      </div>
                    )}
                    renderSecondary={(r) => (
                      <div className="text-right shrink-0">
                        <div className={`font-mono text-xs font-semibold tabular-nums ${r.variance < 0 ? "text-status-act-ink" : "text-ink"}`}>
                          {formatPeso(r.variance)}
                        </div>
                        {r.variance < 0 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-status-act-fill text-status-act-ink">
                            Short
                          </span>
                        ) : (
                          <span className="text-[10px] text-ink-muted">Balanced</span>
                        )}
                      </div>
                    )}
                    renderPreview={(r) => (
                      <div className="space-y-1.5 pt-1 text-ink-muted">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Should collect</span>
                          <span className="font-mono text-ink font-medium">{formatPeso(r.expected)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Collected</span>
                          <span className="font-mono text-ink font-medium">{formatPeso(r.collected)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Times short</span>
                          <span className={`font-mono font-medium ${r.shortageCount > 0 ? "text-status-act-ink" : "text-ink"}`}>
                            {r.shortageCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Still owed</span>
                          <span className={`font-mono font-medium ${(r.stillOwed ?? 0) > 0 ? "text-status-act-ink" : "text-ink"}`}>
                            {formatPeso(r.stillOwed ?? 0)}
                          </span>
                        </div>
                      </div>
                    )}
                    inspectorTitle={(r) => r.riderName ?? `Rider ${r.riderId}`}
                    inspectorSubtitle={(r) => `${r.settlementCount} cash handovers`}
                    inspectorSections={(r) => [
                      {
                        title: "Rider",
                        items: [
                          { label: "Rider ID", value: `#${r.riderId}` },
                          { label: "Name", value: r.riderName ?? `Rider ${r.riderId}` },
                          { label: "Cash handovers", value: String(r.settlementCount) },
                        ],
                      },
                      {
                        title: "Cash check",
                        items: [
                          { label: "Should collect", value: formatPeso(r.expected) },
                          { label: "Collected", value: formatPeso(r.collected) },
                          { label: "Short or over", value: formatPeso(r.variance) },
                          { label: "Times short", value: String(r.shortageCount) },
                        ],
                      },
                      {
                        title: "Since the handover",
                        items: [
                          { label: "Paid back later", value: formatPeso(r.paidBackLater ?? 0) },
                          { label: "Written off", value: formatPeso(r.writtenOff ?? 0) },
                          { label: "Still owed (today)", value: formatPeso(r.stillOwed ?? 0) },
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
                                Handovers
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Should collect
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Collected
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Short or over
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Times short
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Paid back later
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Written off
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Still owed
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {byRiderPagination.paginatedItems.map((r) => (
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
                                <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                                  {formatPeso(r.paidBackLater ?? 0)}
                                </td>
                                <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                                  {formatPeso(r.writtenOff ?? 0)}
                                </td>
                                <td
                                  className={`px-5 py-2.5 text-right font-mono tabular-nums ${
                                    (r.stillOwed ?? 0) > 0 ? "text-status-act-ink font-semibold" : ""
                                  }`}
                                >
                                  {formatPeso(r.stillOwed ?? 0)}
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
                              <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                                {formatPeso(data.cash.paidBackLaterTotal ?? 0)}
                              </td>
                              <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                                {formatPeso(data.cash.writtenOffTotal ?? 0)}
                              </td>
                              <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                                {formatPeso(data.cash.stillOwedTotal ?? 0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    }
                  />
                  <TablePagination
                    currentPage={byRiderPagination.currentPage}
                    totalPages={byRiderPagination.totalPages}
                    totalItems={byRiderPagination.totalItems}
                    startIndex={byRiderPagination.startIndex}
                    endIndex={byRiderPagination.endIndex}
                    onPageChange={byRiderPagination.setCurrentPage}
                    itemName="riders"
                  />
                </div>

                <div className="bg-board-plate border border-edge rounded-plate overflow-hidden">
                  <header className="px-5 py-3 border-b border-edge">
                    <h4 className="text-label text-ink">Every cash handover</h4>
                  </header>
                  <MobileResponsiveTable<typeof data.cash.lines[number]>
                    data={linesPagination.paginatedItems}
                    keyExtractor={(l) => l.errandId}
                    primaryHeader="Order and rider"
                    secondaryHeader="Result and short or over"
                    renderPrimary={(l) => (
                      <div className="min-w-0">
                        <div className="font-mono font-semibold text-ink text-xs">
                          {formatErrandId(l.errandId)}
                        </div>
                        <div className="text-[10px] text-ink-muted truncate">
                          {l.riderName ?? "Not assigned"}
                        </div>
                      </div>
                    )}
                    renderSecondary={(l) => (
                      <div className="text-right shrink-0">
                        <span className="inline-block px-1.5 py-0.5 rounded-full bg-board-ground text-ink-muted text-[10px] font-semibold">
                          {plainStatus(l.status)}
                        </span>
                        <div className={`font-mono text-xs mt-0.5 tabular-nums ${l.variance < 0 ? "text-status-act-ink font-semibold" : "text-ink"}`}>
                          {formatPeso(l.variance)}
                        </div>
                      </div>
                    )}
                    renderPreview={(l) => (
                      <div className="space-y-1.5 pt-1 text-ink-muted">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Should collect</span>
                          <span className="font-mono text-ink font-medium">{formatPeso(l.expected)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Collected</span>
                          <span className="font-mono text-ink font-medium">{formatPeso(l.collected)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Reason given</span>
                          <span className="text-ink truncate max-w-[180px]">{l.shortReason || "None"}</span>
                        </div>
                        {(l.short ?? 0) > 0 ? (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-ink-muted">Still owed</span>
                            <span className={`font-mono font-medium ${(l.stillOwed ?? 0) > 0 ? "text-status-act-ink" : "text-ink"}`}>
                              {formatPeso(l.stillOwed ?? 0)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}
                    inspectorTitle={(l) => formatErrandId(l.errandId)}
                    inspectorSubtitle={(l) => `${l.riderName ?? "Not assigned"} · ${plainStatus(l.status)}`}
                    inspectorSections={(l) => [
                      {
                        title: "Cash handover",
                        items: [
                          { label: "Order number", value: formatErrandId(l.errandId), copyable: true, copyValue: l.errandId },
                          { label: "Rider", value: l.riderName ?? "--" },
                          { label: "Result", value: plainStatus(l.status) },
                        ],
                      },
                      {
                        title: "Amounts",
                        items: [
                          { label: "Should collect", value: formatPeso(l.expected) },
                          { label: "Collected", value: formatPeso(l.collected) },
                          { label: "Short or over", value: formatPeso(l.variance) },
                          { label: "Reason given", value: l.shortReason || "None", fullWidth: true },
                        ],
                      },
                      ...((l.short ?? 0) > 0
                        ? [
                            {
                              title: "Since the handover",
                              items: [
                                { label: "Still owed (today)", value: formatPeso(l.stillOwed ?? 0) },
                                { label: "What happened", value: whatHappenedSince(l), fullWidth: true },
                              ],
                            },
                          ]
                        : []),
                    ]}
                    desktopView={
                      <div className="overflow-x-auto">
                        <table className="w-full text-label">
                          <thead className="bg-board-ground text-ink-muted">
                            <tr>
                              <th scope="col" className="text-left px-5 py-2 font-semibold">
                                Order
                              </th>
                              <th scope="col" className="text-left px-5 py-2 font-semibold">
                                Rider
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Should collect
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Collected
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Short or over
                              </th>
                              <th scope="col" className="text-left px-5 py-2 font-semibold">
                                Result
                              </th>
                              <th scope="col" className="text-left px-5 py-2 font-semibold">
                                Reason given
                              </th>
                              <th scope="col" className="text-left px-5 py-2 font-semibold">
                                What happened since
                              </th>
                              <th scope="col" className="text-right px-5 py-2 font-semibold">
                                Still owed
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {linesPagination.paginatedItems.map((l) => (
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
                                    {plainStatus(l.status)}
                                  </span>
                                </td>
                                <td className="px-5 py-2.5 text-ink-muted max-w-[200px]">
                                  {l.shortReason ?? ""}
                                </td>
                                <td className="px-5 py-2.5 text-ink-muted min-w-[180px] max-w-[260px]">
                                  {whatHappenedSince(l)}
                                </td>
                                <td
                                  className={`px-5 py-2.5 text-right font-mono tabular-nums ${
                                    (l.stillOwed ?? 0) > 0 ? "text-status-act-ink font-semibold" : ""
                                  }`}
                                >
                                  {(l.short ?? 0) > 0 ? formatPeso(l.stillOwed ?? 0) : ""}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    }
                  />
                  <TablePagination
                    currentPage={linesPagination.currentPage}
                    totalPages={linesPagination.totalPages}
                    totalItems={linesPagination.totalItems}
                    startIndex={linesPagination.startIndex}
                    endIndex={linesPagination.endIndex}
                    onPageChange={linesPagination.setCurrentPage}
                    itemName="cash handovers"
                  />
                </div>
              </>
            )}
          </section>

          <ReportNotes notes={data.notes} />
        </>
      )}

    </div>
  );
};
