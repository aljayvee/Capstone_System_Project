import React, { useState } from "react";
import { ReportState } from "./ReportState";
import { Star, Bike, Timer, Target, Wallet, ChevronRight } from "lucide-react";
import { MetricCard } from "../../dashboard/components/MetricCard";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { ReportNotes } from "./ReportNotes";
import { useReport } from "../../../hooks/useReport";
import { useReportPdf } from "../../../hooks/useReportPdf";
import { apiService, type ApiRiderMetrics } from "../../../../../services/apiService";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { toApiRange, type RangePreset } from "../../../../../components/RangeSelector";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatPeso } from "../../../../../utils/format";

/**
 * An absent metric, with the reason attached.
 *
 * A dash and a zero are different facts — "delivered nothing late" versus "no
 * errand in this period carried an ETA to be late against" — and a performance
 * table that renders the second as 0% gets a rider disciplined for a column the
 * system never filled in.
 */
const Absent: React.FC<{ why: string }> = ({ why }) => (
  <span className="text-ink-muted cursor-help" title={why}>
    —
  </span>
);

const pct = (v: number | null, why: string) =>
  v === null ? <Absent why={why} /> : `${(v * 100).toFixed(1)}%`;

const mins = (v: number | null, why: string) =>
  v === null ? <Absent why={why} /> : `${v.toFixed(1)} min`;

type MetricGroup = "all" | "throughput" | "reliability" | "earnings" | "quality";

const GROUPS: Array<{ id: MetricGroup; label: string }> = [
  { id: "all", label: "All" },
  { id: "throughput", label: "Throughput" },
  { id: "reliability", label: "Reliability" },
  { id: "earnings", label: "Earnings" },
  { id: "quality", label: "Quality" },
];

/** One labelled figure inside an expanded rider panel, with its denominator. */
const Stat: React.FC<{ label: string; value: React.ReactNode; context?: string }> = ({
  label,
  value,
  context,
}) => (
  <div className="min-w-0">
    <p className="text-micro uppercase text-ink-muted">{label}</p>
    <p className="text-label text-ink tabular-nums">{value}</p>
    {context && <p className="text-label text-ink-muted leading-tight mt-0.5">{context}</p>}
  </div>
);

const RiderDetail: React.FC<{ rider: ApiRiderMetrics }> = ({ rider }) => {
  const { throughput: t, reliability: r, earnings: e, quality: q } = rider;

  return (
    <div className="bg-board-ground border-t border-hairline px-5 py-4 space-y-4">
      <div>
        <h5 className="text-micro uppercase text-ink-muted mb-2">Throughput</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Completed" value={t.completedCount} />
          <Stat
            label="Accepted to delivered"
            value={mins(
              t.avgDeliveryMinutes,
              "No errand in this period recorded both an accept and a delivery time.",
            )}
            context={t.deliveryTimedCount > 0 ? `over ${t.deliveryTimedCount} errands` : undefined}
          />
          <Stat
            label="Assigned to accepted"
            value={mins(
              t.avgAcceptMinutes,
              "No errand in this period recorded both an assign and an accept time.",
            )}
            context={t.acceptTimedCount > 0 ? `over ${t.acceptTimedCount} errands` : undefined}
          />
          <Stat
            label="Per active hour"
            value={
              t.errandsPerActiveHour === null ? (
                <Absent why="This rider recorded no signed-in time in this period." />
              ) : (
                t.errandsPerActiveHour.toFixed(2)
              )
            }
            context={t.activeHours > 0 ? `${t.activeHours.toFixed(1)} h signed in` : undefined}
          />
        </div>
      </div>

      <div>
        <h5 className="text-micro uppercase text-ink-muted mb-2">Reliability</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat
            label="On time"
            value={pct(r.onTimeRate, "No errand in this period carried an ETA to measure against.")}
            context={
              r.onTimeDenominator > 0
                ? `over ${r.onTimeDenominator} with an ETA` +
                  (r.degradedEtaCount > 0 ? ` · ${r.degradedEtaCount} estimated` : "")
                : undefined
            }
          />
          <Stat
            label="Cancelled"
            value={pct(r.cancellationRate, "No errand reached this rider in this period.")}
            context={
              r.reachedCount > 0 ? `${r.cancelledCount} of ${r.reachedCount} reached` : undefined
            }
          />
          <Stat label="Signal drops" value={r.connectivityDrops} />
          <Stat
            label="Never reconnected"
            value={r.unresolvedDrops}
            context={r.unresolvedDrops > 0 ? "still open" : undefined}
          />
        </div>
      </div>

      <div>
        <h5 className="text-micro uppercase text-ink-muted mb-2">Earnings and cash</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat
            label="Earned"
            value={formatPeso(e.riderShareEarned)}
            context={e.commissionCount > 0 ? `${e.commissionCount} payouts` : undefined}
          />
          <Stat
            label="Cash variance"
            value={
              <span className={e.settlementVarianceTotal < 0 ? "text-status-act-ink" : undefined}>
                {formatPeso(e.settlementVarianceTotal)}
              </span>
            }
            context={e.settlementCount > 0 ? `over ${e.settlementCount} settlements` : undefined}
          />
          <Stat label="Short settlements" value={e.shortageCount} />
          <Stat label="Settlements" value={e.settlementCount} />
        </div>
      </div>

      <div>
        <h5 className="text-micro uppercase text-ink-muted mb-2">Service quality</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat
            label="Rating (all time)"
            value={
              q.averageRatingAllTime === null ? (
                <Absent why="No customer has rated this rider yet." />
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Star size={12} className="text-status-waiting-ink fill-amber-400" />
                  {q.averageRatingAllTime.toFixed(1)}
                </span>
              )
            }
            context={q.ratingCountAllTime > 0 ? `from ${q.ratingCountAllTime} ratings` : undefined}
          />
          <Stat label="Exceptions" value={q.exceptionCount} />
          <Stat
            label="Per errand"
            value={
              q.exceptionRate === null ? (
                <Absent why="This rider has no errands with reconciliation evidence in this period." />
              ) : (
                q.exceptionRate.toFixed(2)
              )
            }
            context={
              q.exceptionErrandCount > 0 ? `over ${q.exceptionErrandCount} errands` : undefined
            }
          />
          <Stat label="At risk" value={formatPeso(q.exceptionsAtRisk)} />
        </div>
      </div>
    </div>
  );
};

export const RiderPerformanceReportView: React.FC = () => {
  const [preset, setPreset] = useState<RangePreset>("TODAY");
  const [range, setRange] = useState<DateRange | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = toApiRange(preset, range);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [group, setGroup] = useState<MetricGroup>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading, error, reload } = useReport(
    apiService.getRiderPerformanceReport,
    apiRange,
  );
  const pdf = useReportPdf("rider-performance", apiRange);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Rider_Performance_${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      [
        "Rider",
        "Completed",
        "Avg Delivery Minutes",
        "Avg Accept Minutes",
        "Errands Per Active Hour",
        "On-Time Rate",
        "On-Time Denominator",
        "Cancellation Rate",
        "Rider Share Earned",
        "Settlement Variance",
        "Average Rating",
        "Rating Count",
        "Exceptions",
      ],
      data.riders.map((r) => [
        r.name,
        r.throughput.completedCount,
        r.throughput.avgDeliveryMinutes ?? "",
        r.throughput.avgAcceptMinutes ?? "",
        r.throughput.errandsPerActiveHour ?? "",
        r.reliability.onTimeRate ?? "",
        r.reliability.onTimeDenominator,
        r.reliability.cancellationRate ?? "",
        r.earnings.riderShareEarned,
        r.earnings.settlementVarianceTotal,
        r.quality.averageRatingAllTime ?? "",
        r.quality.ratingCountAllTime,
        r.quality.exceptionCount,
      ]),
    );
  };

  const showThroughput = group === "all" || group === "throughput";
  const showReliability = group === "all" || group === "reliability";
  const showEarnings = group === "all" || group === "earnings";
  const showQuality = group === "all" || group === "quality";

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
        title="The rider performance report did not load"
        loadingRows={6}
      />

      {data && (
        <>
          <p className="text-label text-ink-muted">{data.rangeLabel}</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Completed Errands"
              value={String(data.fleet.completedCount)}
              sub={`${data.fleet.riderCount} riders`}
              icon={Bike}
            />
            <MetricCard
              title="Avg Delivery Time"
              value={
                data.fleet.avgDeliveryMinutes === null
                  ? "--"
                  : `${data.fleet.avgDeliveryMinutes.toFixed(1)} min`
              }
              sub={
                data.fleet.deliveryTimedCount > 0
                  ? `over ${data.fleet.deliveryTimedCount} timed errands`
                  : "no timed errands"
              }
              icon={Timer}
            />
            <MetricCard
              title="On-Time Rate"
              value={
                data.fleet.onTimeRate === null
                  ? "--"
                  : `${(data.fleet.onTimeRate * 100).toFixed(1)}%`
              }
              sub={
                data.fleet.onTimeDenominator > 0
                  ? `over ${data.fleet.onTimeDenominator} with an ETA`
                  : "no errand carried an ETA"
              }
              icon={Target}
            />
            <MetricCard
              title="Rider Earnings"
              value={formatPeso(data.fleet.riderShareEarned)}
              sub={`${formatPeso(data.fleet.settlementVarianceTotal)} cash variance`}
              icon={Wallet}
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap bg-board-ground p-1 rounded-plate w-fit">
            {GROUPS.map((g) => (
              <button
                key={g.id}
                onClick={() => setGroup(g.id)}
                className={`px-3 py-1.5 rounded-trim text-label transition ${
                  group === g.id ? "bg-board-plate text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {data.riders.length === 0 ? (
            <div className="bg-board-plate rounded-plate p-8 border border-edge text-center text-label text-ink-muted">
              No riders on record.
            </div>
          ) : (
            <div className="bg-board-plate border border-edge rounded-plate overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-label">
                  <thead className="bg-board-ground text-ink-muted">
                    <tr>
                      <th scope="col" className="text-left px-5 py-2 font-semibold">
                        Rider
                      </th>
                      {showThroughput && (
                        <>
                          <th scope="col" className="text-right px-4 py-2 font-semibold">
                            Completed
                          </th>
                          <th scope="col" className="text-right px-4 py-2 font-semibold">
                            Avg delivery
                          </th>
                          <th scope="col" className="text-right px-4 py-2 font-semibold">
                            Per active hr
                          </th>
                        </>
                      )}
                      {showReliability && (
                        <>
                          <th scope="col" className="text-right px-4 py-2 font-semibold">
                            On time
                          </th>
                          <th scope="col" className="text-right px-4 py-2 font-semibold">
                            Cancelled
                          </th>
                        </>
                      )}
                      {showEarnings && (
                        <>
                          <th scope="col" className="text-right px-4 py-2 font-semibold">
                            Earned
                          </th>
                          <th scope="col" className="text-right px-4 py-2 font-semibold">
                            Cash variance
                          </th>
                        </>
                      )}
                      {showQuality && (
                        <>
                          <th scope="col" className="text-right px-4 py-2 font-semibold">
                            Rating
                          </th>
                          <th scope="col" className="text-right px-4 py-2 font-semibold">
                            Exceptions
                          </th>
                        </>
                      )}
                      {/* Was an empty <th> with no content and no label. */}
                      <th scope="col" className="w-8">
                        <span className="sr-only">Show breakdown</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.riders.map((r) => {
                      const isOpen = expanded === r.riderId;
                      return (
                        <React.Fragment key={r.riderId}>
                          {/* The <tr> was the control: cursor-pointer and an
                              onClick, with no tabIndex, role or key handler, so
                              expanding a rider's detail was mouse-only. The
                              chevron cell now holds a real button and the row
                              is just a row. */}
                          <tr className="border-t border-hairline hover:bg-board-ground">
                            <td className="px-5 py-2.5 font-semibold text-ink">{r.name}</td>
                            {showThroughput && (
                              <>
                                <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                  {r.throughput.completedCount}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                  {mins(
                                    r.throughput.avgDeliveryMinutes,
                                    "No errand in this period recorded both an accept and a delivery time.",
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                  {r.throughput.errandsPerActiveHour === null ? (
                                    <Absent why="This rider recorded no signed-in time in this period." />
                                  ) : (
                                    r.throughput.errandsPerActiveHour.toFixed(2)
                                  )}
                                </td>
                              </>
                            )}
                            {showReliability && (
                              <>
                                <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                  {pct(
                                    r.reliability.onTimeRate,
                                    "No errand in this period carried an ETA to measure against.",
                                  )}
                                  {r.reliability.onTimeDenominator > 0 && (
                                    <span className="ml-1 text-label text-ink-muted">
                                      ({r.reliability.onTimeDenominator})
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                  {pct(
                                    r.reliability.cancellationRate,
                                    "No errand reached this rider in this period.",
                                  )}
                                </td>
                              </>
                            )}
                            {showEarnings && (
                              <>
                                <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                  {formatPeso(r.earnings.riderShareEarned)}
                                </td>
                                <td
                                  className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                                    r.earnings.settlementVarianceTotal < 0
                                      ? "text-status-act-ink font-semibold"
                                      : ""
                                  }`}
                                >
                                  {formatPeso(r.earnings.settlementVarianceTotal)}
                                </td>
                              </>
                            )}
                            {showQuality && (
                              <>
                                <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                  {r.quality.averageRatingAllTime === null ? (
                                    <Absent why="No customer has rated this rider yet." />
                                  ) : (
                                    <span className="inline-flex items-center gap-1">
                                      <Star
                                        size={11}
                                        className="text-status-waiting-ink fill-amber-400"
                                      />
                                      {r.quality.averageRatingAllTime.toFixed(1)}
                                      <span className="text-label text-ink-muted">
                                        ({r.quality.ratingCountAllTime})
                                      </span>
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                  {r.quality.exceptionCount}
                                </td>
                              </>
                            )}
                            <td className="px-2 py-2.5 text-ink-muted">
                              <button
                                type="button"
                                onClick={() => setExpanded(isOpen ? null : r.riderId)}
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? "Hide" : "Show"} the breakdown for ${r.name}`}
                                className="grid size-7 place-items-center rounded-trim transition-colors hover:bg-board-ground"
                              >
                                <ChevronRight
                                  size={14}
                                  className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                                />
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td colSpan={12} className="p-0">
                                <RiderDetail rider={r} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <ReportNotes notes={data.notes} />
        </>
      )}

      <DigitalReportReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        reportName="Rider Performance Report"
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
                  Rider
                </th>
                <th scope="col" className="py-2 text-right">
                  Completed
                </th>
                <th scope="col" className="py-2 text-right">
                  Avg delivery
                </th>
                <th scope="col" className="py-2 text-right">
                  On time
                </th>
                <th scope="col" className="py-2 text-right">
                  Earned
                </th>
              </tr>
            </thead>
            <tbody>
              {data.riders.map((r) => (
                <tr key={r.riderId} className="border-b border-hairline">
                  <td className="py-2 font-semibold text-ink">{r.name}</td>
                  <td className="py-2 text-right">{r.throughput.completedCount}</td>
                  <td className="py-2 text-right">
                    {r.throughput.avgDeliveryMinutes === null
                      ? "--"
                      : `${r.throughput.avgDeliveryMinutes.toFixed(1)} min`}
                  </td>
                  <td className="py-2 text-right">
                    {r.reliability.onTimeRate === null
                      ? "--"
                      : `${(r.reliability.onTimeRate * 100).toFixed(0)}% (${r.reliability.onTimeDenominator})`}
                  </td>
                  <td className="py-2 text-right">{formatPeso(r.earnings.riderShareEarned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DigitalReportReviewModal>
    </div>
  );
};
