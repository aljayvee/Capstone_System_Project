import React, { useEffect, useState } from "react";
import { ReportState } from "./ReportState";
import { Star, Bike, Timer, Wallet, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { PeriodBreakdownTable } from "./PeriodBreakdownTable";
import { useReport } from "../../../hooks/useReport";
import { useReportPrint } from "../../../hooks/useReportPrint";
import {
  apiService,
  type ApiDeliveryCheck,
  type ApiRiderDecline,
  type ApiRiderDelivery,
  type ApiRiderMetrics,
  type ApiRiderPerformanceReport,
} from "../../../../../services/apiService";
import { formatErrandId } from "../../../../../utils/formatErrandId";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { toApiRange, type RangePreset } from "../../../../../components/RangeSelector";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatPeso } from "../../../../../utils/format";
import { MobileResponsiveTable, TablePagination } from "../../../../../components/table";
import { usePagination } from "../../../../../hooks/usePagination";
import { RiderSearchPicker } from "./RiderSearchPicker";

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

const mins = (v: number | null, why: string) =>
  v === null ? <Absent why={why} /> : `${v.toFixed(1)} min`;

// A server from before declines were recorded sends no count at all; that is
// shown as a dash, not as a rider who never declined.
const DECLINES_ABSENT = "This server does not record declined offers yet.";
const count = (v: number | undefined, why: string) => (v === undefined ? <Absent why={why} /> : v);

// No cash short / cash over / handovers on this report: cash handed over is
// the Settlement report's subject (owner, 2026-10-27). The API still sends them.

type MetricGroup = "all" | "throughput" | "reliability" | "earnings" | "quality";

const GROUPS: Array<{ id: MetricGroup; label: string }> = [
  { id: "all", label: "All" },
  { id: "throughput", label: "Work done" },
  { id: "reliability", label: "Cancellations and declines" },
  { id: "earnings", label: "Pay" },
  { id: "quality", label: "Ratings" },
];

type FleetPoint = NonNullable<ApiRiderPerformanceReport["timelineBreakdown"]>[number];

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

const RiderDetail: React.FC<{ rider: ApiRiderMetrics; onOpenReport?: () => void }> = ({
  rider,
  onOpenReport,
}) => {
  const { throughput: t, reliability: r, earnings: e, quality: q } = rider;

  return (
    <div className="bg-board-ground border-t border-hairline px-5 py-4 space-y-4">
      <div>
        <h5 className="text-micro uppercase text-ink-muted mb-2">Work done</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Delivered" value={t.completedCount} />
          <Stat
            label="Average delivery time"
            value={mins(
              t.avgDeliveryMinutes,
              "No order in these dates has both an accepted time and a delivered time.",
            )}
            context={t.deliveryTimedCount > 0 ? `from ${t.deliveryTimedCount} orders` : undefined}
          />
          <Stat
            label="Average time to accept"
            value={mins(
              t.avgAcceptMinutes,
              "No order in these dates has both an assigned time and an accepted time.",
            )}
            context={t.acceptTimedCount > 0 ? `from ${t.acceptTimedCount} orders` : undefined}
          />
          <Stat
            label="Errands per hour online"
            value={
              t.errandsPerActiveHour === null ? (
                <Absent why="This rider was not online in these dates." />
              ) : (
                t.errandsPerActiveHour.toFixed(2)
              )
            }
            context={t.activeHours > 0 ? `${t.activeHours.toFixed(1)} h online` : undefined}
          />
        </div>
      </div>

      <div>
        <h5 className="text-micro uppercase text-ink-muted mb-2">Cancellations and time offline</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat
            label="Cancelled"
            value={r.cancelledCount}
            context={r.reachedCount > 0 ? `of ${r.reachedCount} given to them` : undefined}
          />
          <Stat label="Times offline" value={r.connectivityDrops} />
          <Stat
            label="Still offline"
            value={r.unresolvedDrops}
            context={r.unresolvedDrops > 0 ? "not back online yet" : undefined}
          />
        </div>
      </div>

      <div>
        <h5 className="text-micro uppercase text-ink-muted mb-2">Offers turned down</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat
            label="Declined"
            value={count(r.declinedCount, DECLINES_ABSENT)}
            context={r.declinedCount !== undefined ? "pressed Decline" : undefined}
          />
          <Stat
            label="Let lapse"
            value={count(r.expiredOfferCount, DECLINES_ABSENT)}
            context={r.expiredOfferCount !== undefined ? "did not answer in time" : undefined}
          />
        </div>
      </div>

      <div>
        <h5 className="text-micro uppercase text-ink-muted mb-2">Pay</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat
            label="Pay"
            value={formatPeso(e.riderShareEarned)}
            context={e.commissionCount > 0 ? `from ${e.commissionCount} orders` : undefined}
          />
        </div>
      </div>

      <div>
        {/* No Problems figures on this report (owner, 2026-10-27); the Help
            Desk report still lists every problem. */}
        <h5 className="text-micro uppercase text-ink-muted mb-2">Ratings</h5>
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
        </div>
      </div>

      {onOpenReport && (
        <button
          type="button"
          onClick={onOpenReport}
          className="inline-flex items-center gap-1.5 rounded-plate border border-edge bg-board-plate px-3 py-1.5 text-label text-ink hover:bg-board-ground transition"
        >
          Open {rider.name}'s report <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
};

const NOT_CHECKED_REASON: Record<string, string> = {
  NO_PROMISE: "no target deadline set",
  PROMISE_TOO_LATE: "deadline set too late into trip",
  PROMISE_TOO_CLOSE: "deadline set at doorstep (< 2 min)",
  TIME_DOES_NOT_ADD_UP: "delivery time does not add up",
  NO_GPS_AT_DELIVERY: "missing GPS proof at address",
  FAR_FROM_ADDRESS: "marked delivered away from address",
};

/** The same words the printout uses for each verdict. */
function deliveryResult(check: ApiDeliveryCheck | null): { text: string; tone: string } {
  if (!check) return { text: "-", tone: "text-ink-muted" };
  if (check.result === "ON_TIME") return { text: "On time", tone: "text-status-done-ink" };
  if (check.result === "LATE") return { text: `Late by ${check.minutesLate} min`, tone: "text-status-act-ink" };
  if (check.reason === "FAR_FROM_ADDRESS" && typeof check.nearestMeters === "number") {
    const far =
      check.nearestMeters >= 1000
        ? `${(check.nearestMeters / 1000).toFixed(1)} km`
        : `${Math.round(check.nearestMeters)} m`;
    return { text: `Unverified: marked delivered ${far} from address`, tone: "text-ink-muted" };
  }
  return { text: `Unverified: ${NOT_CHECKED_REASON[check.reason] ?? "no reason recorded"}`, tone: "text-ink-muted" };
}

const stamp = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

/** One rider's deliveries, each with its On Time verdict: what the rate rests on. */
const RiderDeliveries: React.FC<{ deliveries: ApiRiderDelivery[] }> = ({ deliveries }) => {
  if (deliveries.length === 0) {
    return (
      <div className="bg-board-plate rounded-plate p-8 border border-edge text-center text-label text-ink-muted">
        No deliveries in these dates.
      </div>
    );
  }

  const desktopTable = (
    <div className="bg-board-plate border border-edge rounded-plate overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-label">
          <thead className="bg-board-ground text-ink-muted">
            <tr>
              <th scope="col" className="text-left px-5 py-2 font-semibold">Order</th>
              <th scope="col" className="text-left px-5 py-2 font-semibold">Accepted</th>
              <th scope="col" className="text-left px-5 py-2 font-semibold">Delivered</th>
              <th scope="col" className="text-left px-5 py-2 font-semibold">Target Deadline</th>
              <th scope="col" className="text-left px-5 py-2 font-semibold">Punctuality Status</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => {
              const verdict = deliveryResult(d.check);
              return (
                <tr key={d.errandId} className="border-t border-hairline">
                  <td className="px-5 py-2.5 font-mono text-ink whitespace-nowrap">
                    {d.referenceNo ?? formatErrandId(d.errandId)}
                  </td>
                  <td className="px-5 py-2.5 text-ink-muted whitespace-nowrap">{stamp(d.acceptedAt)}</td>
                  <td className="px-5 py-2.5 text-ink whitespace-nowrap">{stamp(d.deliveredAt)}</td>
                  <td className="px-5 py-2.5 text-ink-muted whitespace-nowrap">{stamp(d.promisedBy)}</td>
                  <td className={`px-5 py-2.5 font-semibold ${verdict.tone}`}>{verdict.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <MobileResponsiveTable<ApiRiderDelivery>
      data={deliveries}
      keyExtractor={(d) => d.errandId}
      desktopView={desktopTable}
      primaryHeader="Order"
      secondaryHeader="Punctuality Status"
      renderPrimary={(d) => (
        <div className="min-w-0">
          <div className="font-mono font-semibold text-ink text-xs truncate">
            {d.referenceNo ?? formatErrandId(d.errandId)}
          </div>
          <div className="text-[10px] text-ink-muted">Delivered {stamp(d.deliveredAt)}</div>
        </div>
      )}
      renderSecondary={(d) => {
        const verdict = deliveryResult(d.check);
        return (
          <div className={`text-right shrink-0 text-xs font-semibold max-w-[9rem] ${verdict.tone}`}>
            {verdict.text}
          </div>
        );
      }}
      renderPreview={(d) => (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-ink-muted">Accepted</span>
            <span className="text-ink">{stamp(d.acceptedAt)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-ink-muted">Target Deadline</span>
            <span className="text-ink">{stamp(d.promisedBy)}</span>
          </div>
        </div>
      )}
      inspectorTitle={(d) => d.referenceNo ?? formatErrandId(d.errandId)}
      inspectorSubtitle={(d) => deliveryResult(d.check).text}
      inspectorSections={(d) => [
        {
          title: "Delivery",
          items: [
            { label: "Accepted", value: stamp(d.acceptedAt) },
            { label: "Delivered", value: stamp(d.deliveredAt) },
            { label: "Target Deadline", value: stamp(d.promisedBy) },
            { label: "Punctuality Status", value: deliveryResult(d.check).text, fullWidth: true },
          ],
        },
      ]}
    />
  );
};

const declineHow = (d: ApiRiderDecline) => (d.kind === "EXPIRED" ? "Let lapse" : "Declined");
const declineReason = (d: ApiRiderDecline) => (d.kind === "EXPIRED" ? "No answer before the timer ran out" : d.reason ?? "No reason given");

/** One rider's declined and lapsed offers: what their decline count rests on. */
const RiderDeclines: React.FC<{ declines: ApiRiderDecline[] }> = ({ declines }) => {
  if (declines.length === 0) {
    return (
      <div className="bg-board-plate rounded-plate p-8 border border-edge text-center text-label text-ink-muted">
        No offers declined or let lapse in these dates.
      </div>
    );
  }

  const desktopTable = (
    <div className="bg-board-plate border border-edge rounded-plate overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-label">
          <thead className="bg-board-ground text-ink-muted">
            <tr>
              <th scope="col" className="text-left px-5 py-2 font-semibold">Order</th>
              <th scope="col" className="text-left px-5 py-2 font-semibold">Offered</th>
              <th scope="col" className="text-left px-5 py-2 font-semibold">Turned down</th>
              <th scope="col" className="text-left px-5 py-2 font-semibold">How</th>
              <th scope="col" className="text-left px-5 py-2 font-semibold">Reason given</th>
            </tr>
          </thead>
          <tbody>
            {declines.map((d) => (
              <tr key={d.id} className="border-t border-hairline">
                <td className="px-5 py-2.5 font-mono text-ink whitespace-nowrap">
                  {d.referenceNo ?? formatErrandId(d.errandId)}
                </td>
                <td className="px-5 py-2.5 text-ink-muted whitespace-nowrap">{stamp(d.offeredAt)}</td>
                <td className="px-5 py-2.5 text-ink whitespace-nowrap">{stamp(d.declinedAt)}</td>
                <td className="px-5 py-2.5 font-semibold text-ink whitespace-nowrap">{declineHow(d)}</td>
                <td className="px-5 py-2.5 text-ink-muted break-words">{declineReason(d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <MobileResponsiveTable<ApiRiderDecline>
      data={declines}
      keyExtractor={(d) => d.id}
      desktopView={desktopTable}
      primaryHeader="Order"
      secondaryHeader="How"
      renderPrimary={(d) => (
        <div className="min-w-0">
          <div className="font-mono font-semibold text-ink text-xs truncate">
            {d.referenceNo ?? formatErrandId(d.errandId)}
          </div>
          <div className="text-[10px] text-ink-muted">Turned down {stamp(d.declinedAt)}</div>
        </div>
      )}
      renderSecondary={(d) => (
        <div className="text-right shrink-0 text-xs font-semibold text-ink">{declineHow(d)}</div>
      )}
      renderPreview={(d) => (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-start justify-between gap-3 text-[11px]">
            <span className="text-ink-muted shrink-0">Reason</span>
            <span className="text-ink text-right break-words min-w-0">{declineReason(d)}</span>
          </div>
        </div>
      )}
      inspectorTitle={(d) => d.referenceNo ?? formatErrandId(d.errandId)}
      inspectorSubtitle={(d) => declineHow(d)}
      inspectorSections={(d) => [
        {
          title: "Offer",
          items: [
            { label: "Offered", value: stamp(d.offeredAt) },
            { label: "Turned down", value: stamp(d.declinedAt) },
            { label: "Reason given", value: declineReason(d), fullWidth: true },
          ],
        },
      ]}
    />
  );
};

export const RiderPerformanceReportView: React.FC = () => {
  const [preset, setPreset] = useState<RangePreset>("TODAY");
  const [range, setRange] = useState<DateRange | null>(null);
  // One rider, or null for the whole fleet. Carried in the report query, so
  // the screen and the printout are narrowed by the same server call.
  const [riderId, setRiderId] = useState<number | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = { ...toApiRange(preset, range), ...(riderId ? { riderId } : {}) };
  const [group, setGroup] = useState<MetricGroup>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  // Kept across reloads: the report empties while a new window loads, and the
  // picker must not vanish under the owner's hand while it does.
  const [riderOptions, setRiderOptions] = useState<Array<{ riderId: number; name: string }>>([]);

  const { data, isLoading, error, reload } = useReport(
    apiService.getRiderPerformanceReport,
    apiRange,
  );
  const printer = useReportPrint("rider-performance", apiRange);
  const ridersPagination = usePagination(data?.riders, 25, [preset, range, riderId, group]);

  useEffect(() => {
    if (data?.riderOptions) setRiderOptions(data.riderOptions);
  }, [data]);

  const chooseRider = (id: number | null) => {
    setRiderId(id);
    setExpanded(null);
  };

  const riderPicker = <RiderSearchPicker options={riderOptions} value={riderId} onChange={chooseRider} />;

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Rider_Performance_${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      [
        "Rider",
        "Errands Delivered",
        "Avg Delivery Minutes",
        "Avg Accept Minutes",
        "Errands Per Active Hour",
        "Cancelled",
        "Offers Declined",
        "Offers Let Lapse",
        "Rider Share Earned",
        "Average Rating",
        "Rating Count",
      ],
      data.riders.map((r) => [
        r.name,
        r.throughput.completedCount,
        r.throughput.avgDeliveryMinutes ?? "",
        r.throughput.avgAcceptMinutes ?? "",
        r.throughput.errandsPerActiveHour ?? "",
        r.reliability.cancelledCount,
        r.reliability.declinedCount ?? "",
        r.reliability.expiredOfferCount ?? "",
        r.earnings.riderShareEarned,
        r.quality.averageRatingAllTime ?? "",
        r.quality.ratingCountAllTime,
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
        onPrint={printer.print}
        onExportCSV={handleExportCSV}
        exportDisabled={!data}
        isPreparingPrint={printer.isPreparing}
        printError={printer.error}
        filters={riderPicker}
        printLabel={riderId ? "Print rider report" : "Print"}
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
          <p className="text-label text-ink-muted">
            {data.rider && <span className="font-semibold text-ink">{data.rider.name} · </span>}
            {data.coverageLabel ?? data.rangeLabel}
            {data.rider && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => chooseRider(null)}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Show all riders
                </button>
              </>
            )}
          </p>

          <div className="bg-board-plate border border-edge rounded-plate divide-y sm:divide-y-0 sm:divide-x divide-hairline grid grid-cols-1 sm:grid-cols-3">
            <div className="p-5 flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-board-ground text-ink-muted shrink-0">
                <Bike className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-body text-ink-muted">Errands Delivered</div>
                <div className="text-xl font-bold font-mono text-ink mt-1 tabular-nums">
                  {data.fleet.completedCount}
                </div>
                <div className="text-xs text-ink-muted mt-0.5 truncate">
                  {data.rider ? data.rider.name : `${data.fleet.riderCount} riders`}
                </div>
              </div>
            </div>

            <div className="p-5 flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-board-ground text-ink-muted shrink-0">
                <Timer className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-body text-ink-muted">Average delivery time</div>
                <div className="text-xl font-bold font-mono text-ink mt-1 tabular-nums">
                  {data.fleet.avgDeliveryMinutes === null
                    ? "--"
                    : `${data.fleet.avgDeliveryMinutes.toFixed(1)} min`}
                </div>
                <div className="text-xs text-ink-muted mt-0.5 truncate">
                  {data.fleet.deliveryTimedCount > 0
                    ? `from ${data.fleet.deliveryTimedCount} timed orders`
                    : "no timed orders"}
                </div>
              </div>
            </div>

            <div className="p-5 flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-board-ground text-ink-muted shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-body text-ink-muted">Rider pay</div>
                <div className="text-xl font-bold font-mono text-ink mt-1 tabular-nums">
                  {formatPeso(data.fleet.riderShareEarned)}
                </div>
                <div className="text-xs text-ink-muted mt-0.5 truncate">
                  the riders' share of delivery fees
                </div>
              </div>
            </div>
          </div>

          <PeriodBreakdownTable<FleetPoint>
            subject={data.rider ? "Work" : "Riders' work"}
            unit={data.breakdownUnit}
            points={data.timelineBreakdown}
            figures={[
              { header: "Errands Delivered", format: "count", value: (p) => p.completedCount, primary: true },
              { header: "Cancelled", format: "count", value: (p) => p.cancelledCount },
              { header: "Rider pay", format: "money", value: (p) => p.riderShareEarned },
            ]}
          />

          {data.rider ? (
            <>
              {data.riders[0] && (
                <section className="space-y-3">
                  <h3 className="text-panel text-ink">{data.rider.name}: all figures</h3>
                  <div className="rounded-plate border border-edge overflow-hidden">
                    <RiderDetail rider={data.riders[0]} />
                  </div>
                </section>
              )}
              <section className="space-y-3">
                <h3 className="text-panel text-ink">Every delivery in these dates</h3>
                <RiderDeliveries deliveries={data.deliveries ?? []} />
              </section>
              {data.declines && (
                <section className="space-y-3">
                  <h3 className="text-panel text-ink">Every offer declined or let lapse in these dates</h3>
                  <RiderDeclines declines={data.declines} />
                </section>
              )}
            </>
          ) : (
          <>
          {data.riders.length > 0 && (
            <div className="bg-board-plate border border-edge rounded-plate p-6">
              <div className="text-body font-semibold text-ink mb-4">
                Errands Delivered and pay, by rider
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data.riders.map((r) => ({
                    name: r.name ?? `Rider ${r.riderId}`,
                    completed: r.throughput.completedCount,
                    earned: r.earnings.riderShareEarned,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
                    interval={0}
                    height={50}
                    angle={-12}
                    textAnchor="end"
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      name === "Pay (PHP)" ? formatPeso(v) : v,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
                  <Bar
                    yAxisId="left"
                    dataKey="completed"
                    name="Errands Delivered"
                    fill="#2563EB"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="earned"
                    name="Pay (PHP)"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

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
            (() => {
              const desktopTable = (
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
                                Delivered
                              </th>
                              <th scope="col" className="text-right px-4 py-2 font-semibold">
                                Avg delivery time
                              </th>
                              <th scope="col" className="text-right px-4 py-2 font-semibold">
                                Errands per hour online
                              </th>
                            </>
                          )}
                          {showReliability && (
                            <>
                              <th scope="col" className="text-right px-4 py-2 font-semibold">
                                Cancelled
                              </th>
                              <th scope="col" className="text-right px-4 py-2 font-semibold">
                                Declined
                              </th>
                            </>
                          )}
                          {showEarnings && (
                            <>
                              <th scope="col" className="text-right px-4 py-2 font-semibold">
                                Pay
                              </th>
                            </>
                          )}
                          {showQuality && (
                            <>
                              <th scope="col" className="text-right px-4 py-2 font-semibold">
                                Rating
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
                        {ridersPagination.paginatedItems.map((r) => {
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
                                        "No order in these dates has both an accepted time and a delivered time.",
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                      {r.throughput.errandsPerActiveHour === null ? (
                                        <Absent why="This rider was not online in these dates." />
                                      ) : (
                                        r.throughput.errandsPerActiveHour.toFixed(2)
                                      )}
                                    </td>
                                  </>
                                )}
                                {showReliability && (
                                  <>
                                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                      {r.reliability.cancelledCount}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                      {count(r.reliability.declinedCount, DECLINES_ABSENT)}
                                      {(r.reliability.expiredOfferCount ?? 0) > 0 && (
                                        <span
                                          className="ml-1 text-label text-ink-muted"
                                          title="Offers this rider let run out without answering"
                                        >
                                          +{r.reliability.expiredOfferCount} lapsed
                                        </span>
                                      )}
                                    </td>
                                  </>
                                )}
                                {showEarnings && (
                                  <>
                                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                      {formatPeso(r.earnings.riderShareEarned)}
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
                                    <RiderDetail rider={r} onOpenReport={() => chooseRider(r.riderId)} />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    currentPage={ridersPagination.currentPage}
                    totalPages={ridersPagination.totalPages}
                    totalItems={ridersPagination.totalItems}
                    startIndex={ridersPagination.startIndex}
                    endIndex={ridersPagination.endIndex}
                    onPageChange={ridersPagination.setCurrentPage}
                    itemName="riders"
                  />
                </div>
              );

              return (
                <div className="space-y-3">
                  <MobileResponsiveTable<ApiRiderMetrics>
                    data={ridersPagination.paginatedItems}
                    keyExtractor={(r) => r.riderId}
                    desktopView={desktopTable}
                  primaryHeader="Rider"
                  secondaryHeader="Delivered and pay"
                  renderPrimary={(r) => (
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-xs truncate">
                        {r.name}
                      </div>
                      <div className="text-[10px] text-ink-muted">
                        {r.throughput.completedCount} delivered · {r.quality.averageRatingAllTime ? `${r.quality.averageRatingAllTime.toFixed(1)} ★` : "No rating"}
                      </div>
                    </div>
                  )}
                  renderSecondary={(r) => (
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold text-ink text-xs tabular-nums">
                        {formatPeso(r.earnings.riderShareEarned)}
                      </div>
                      <div className="text-[10px] text-ink-muted">
                        {r.reliability.cancelledCount} cancelled
                      </div>
                    </div>
                  )}
                  renderPreview={(r) => (
                    <div className="space-y-1.5 pt-1 text-ink-muted">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Average delivery time</span>
                        <span className="font-mono font-medium text-ink tabular-nums">
                          {r.throughput.avgDeliveryMinutes !== null ? `${r.throughput.avgDeliveryMinutes.toFixed(1)} min` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Cancelled</span>
                        <span className="font-mono font-medium text-ink tabular-nums">
                          {r.reliability.cancelledCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Declined / let lapse</span>
                        <span className="font-mono font-medium text-ink tabular-nums">
                          {r.reliability.declinedCount ?? "—"} / {r.reliability.expiredOfferCount ?? "—"}
                        </span>
                      </div>
                    </div>
                  )}
                  inspectorTitle={(r) => r.name}
                  inspectorSubtitle={() => "Rider summary"}
                  inspectorStatusBadge={(r) => (
                    <span className="font-mono font-bold text-xs text-ink">
                      {r.throughput.completedCount} delivered
                    </span>
                  )}
                  inspectorSections={(r) => [
                    {
                      title: "Work done",
                      items: [
                        { label: "Errands Delivered", value: `${r.throughput.completedCount}` },
                        { label: "Average delivery time", value: r.throughput.avgDeliveryMinutes !== null ? `${r.throughput.avgDeliveryMinutes.toFixed(1)} mins` : "—" },
                        { label: "Average time to accept", value: r.throughput.avgAcceptMinutes !== null ? `${r.throughput.avgAcceptMinutes.toFixed(1)} mins` : "—" },
                        { label: "Errands per hour online", value: r.throughput.errandsPerActiveHour !== null ? r.throughput.errandsPerActiveHour.toFixed(2) : "—" },
                      ],
                    },
                    {
                      title: "Cancellations and ratings",
                      items: [
                        { label: "Cancelled", value: `${r.reliability.cancelledCount}` },
                        { label: "Offers declined", value: r.reliability.declinedCount !== undefined ? `${r.reliability.declinedCount}` : "—" },
                        { label: "Offers let lapse", value: r.reliability.expiredOfferCount !== undefined ? `${r.reliability.expiredOfferCount}` : "—" },
                        { label: "Average rating", value: r.quality.averageRatingAllTime !== null ? `${r.quality.averageRatingAllTime.toFixed(1)} ★ (${r.quality.ratingCountAllTime} ratings)` : "No ratings" },                      ],
                    },
                    {
                      title: "Pay",
                      items: [
                        { label: "Pay", value: formatPeso(r.earnings.riderShareEarned) },
                      ],
                    },
                  ]}
                />
                <div className="md:hidden">
                  <TablePagination
                    currentPage={ridersPagination.currentPage}
                    totalPages={ridersPagination.totalPages}
                    totalItems={ridersPagination.totalItems}
                    startIndex={ridersPagination.startIndex}
                    endIndex={ridersPagination.endIndex}
                    onPageChange={ridersPagination.setCurrentPage}
                    itemName="riders"
                  />
                </div>
              </div>
            );
          })()
          )}
          </>
          )}
        </>
      )}

    </div>
  );
};
