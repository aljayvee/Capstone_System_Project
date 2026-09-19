import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { MetricCard } from "./components/MetricCard";
import { RevenueChart } from "./components/RevenueChart";
import { useDashboardMetrics } from "../../hooks/useDashboardMetrics";
import {
  formatRangeLabel,
  toApiDate,
  type DateRange,
} from "../../../../components/DateRangePicker";
import { RangeSelector, PRESET_OPTIONS } from "../../../../components/RangeSelector";
import type { DashboardFrequency } from "../../../../services/apiService";
import { OwnerPanelShell } from "../../components/OwnerPanelShell";
import { StandingFigures } from "../../components/StandingFigures";

function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * The dashboard, split by time base rather than into tiles.
 *
 * What this replaces: six instances of one generic metric card in two grids,
 * each differentiated only by a hex passed as a prop (#3B82F6, #F59E0B,
 * #10B981, #10B981, #8B5CF6, #059669). Violet on "Gross Revenue" meant
 * nothing, and the arrangement flattened three genuinely different kinds of
 * fact into one visual class.
 *
 * The three kinds, which are now three regions:
 *
 *   RIGHT NOW     riders on duty, errands pending, errands active. A snapshot
 *                 of this minute, read together as one band on the field.
 *   THIS PERIOD   revenue and payouts, set beside the trend that produced
 *                 them, because the money and its shape are one reading.
 *   ALL TIME      completed errands. A footnote, not a peer: it does not
 *                 change with the period selector above it, and standing it
 *                 next to period figures invited exactly that misreading.
 *
 * The period selector re-reads all three at once, which is the signature
 * interaction the direction contract names.
 */
export const DashboardModule: React.FC = () => {
  // The dashboard's frequency enum and RangeSelector's preset enum are the same
  // four values, so the pills drive this directly.
  const [frequency, setFrequency] = useState<DashboardFrequency>("TODAY");

  // The presets and the calendar are two ways to ask, and only one can be in
  // force. RangeSelector owns that coordination for both this page and the
  // reports, so the rule is written once.
  const [customRange, setCustomRange] = useState<DateRange | null>(null);

  const { data, isLoading, error } = useDashboardMetrics(
    frequency,
    customRange
      ? { start: toApiDate(customRange.start), end: toApiDate(customRange.end) }
      : undefined,
  );

  const activeLabel = customRange
    ? formatRangeLabel(customRange)
    : (PRESET_OPTIONS.find((f) => f.value === frequency)?.label ?? "Today");

  // Two glyphs for two different absences, which was already correct here and
  // stays: an ellipsis means the request is still in flight, a dash means
  // nobody received a number. A zero would claim the operation did nothing.
  const placeholder = isLoading ? "…" : "--";
  // The glyph says a figure is absent; this says which kind of absent. Without
  // it a dash is ambiguous between "still arriving" and "never arrived", and
  // those call for opposite reactions from a reader.
  const placeholderWhy = isLoading
    ? "Still reading this figure from the server."
    : "No figure arrived. This is not a zero.";

  const chartData = (data?.trend ?? []).map((t) => ({
    x: t.label,
    revenue: t.revenue,
  }));

  return (
    <OwnerPanelShell
      title="Dashboard"
      // Period presets + calendar, the same control the reports use.
      aside={
        <RangeSelector
          preset={frequency}
          onPresetChange={setFrequency}
          range={customRange}
          onRangeChange={setCustomRange}
        />
      }
      // Pinned, not scrolled: a warning about every figure on the page should
      // not be something you can scroll away from the figures it is about.
      controls={
        error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-plate bg-status-waiting-fill px-4 py-2.5 text-label text-status-waiting-ink"
          >
            <AlertTriangle size={15} className="shrink-0" />
            {/* No longer "may be stale": the hook clears the figures on every
                read, so nothing below this line is a leftover from another
                period. Every figure is a dash, and a dash means nobody
                received a number. */}
            <span>{error} Every figure below reads as a dash because none arrived.</span>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {/* RIGHT NOW. One band, three readings, divided by column rules. */}
        <StandingFigures
          label="The operation right now"
          figures={[
            {
              label: "Riders on duty",
              value: data ? String(data.riders.active) : placeholder,
              valueTitle: data ? undefined : placeholderWhy,
              // Says what it counted. "Active Riders / N inactive" read as
              // presence but counted enabled ACCOUNTS, so it showed the full
              // roster while the map showed every one of them signal-lost.
              // Falls back to what the number MEANS rather than to nothing.
              // The breakdown is data-derived and genuinely cannot be shown
              // when the fetch failed, but its two neighbours carry static
              // descriptions, so an undefined sub left one cell of the band
              // short and the row read as ragged rather than as incomplete.
              sub: data
                ? [
                    `${data.riders.signalLost + data.riders.offline} no signal`,
                    `${data.riders.offDuty} off duty`,
                  ].join(" · ")
                : "On shift now",
            },
            {
              label: "Errands pending",
              value: data ? String(data.errands.pending) : placeholder,
              valueTitle: data ? undefined : placeholderWhy,
              sub: "Awaiting dispatch",
              // The only figure on this page that means somebody must act, so
              // the only one allowed to spend the signal red.
              urgent: Boolean(data && data.errands.pending > 0),
            },
            {
              label: "Errands active",
              value: data ? String(data.errands.active) : placeholder,
              valueTitle: data ? undefined : placeholderWhy,
              sub: "In transit",
            },
          ]}
        />

        {/* THIS PERIOD. The money and the shape it made, as one reading. */}
        <section className="space-y-3">
          <h2 className="text-micro uppercase text-ink-muted">This period</h2>
          <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <RevenueChart
                data={chartData}
                timeframe={activeLabel}
                isLoading={isLoading}
                error={error}
              />
            </div>
            <div className="space-y-3 lg:col-span-4">
              <MetricCard
                title="Gross revenue"
                value={data ? formatPeso(data.revenue.gross) : placeholder}
                valueTitle={data ? undefined : placeholderWhy}
                sub={`Earnings (${activeLabel.toLowerCase()})`}
              />
              <MetricCard
                title="Estimated payouts"
                value={data ? formatPeso(data.revenue.estimatedRiderPayouts) : placeholder}
                valueTitle={data ? undefined : placeholderWhy}
                sub="Rider payout pool"
              />
            </div>
          </div>
        </section>

        {/* ALL TIME. A footnote, because it ignores the selector above. */}
        <p className="border-t border-hairline pt-3 text-label text-ink-muted">
          <span
            data-figure
            title={data ? undefined : placeholderWhy}
            className="text-data text-ink"
          >
            {data ? String(data.errands.completedAllTime) : placeholder}
          </span>{" "}
          errands completed all time. This figure does not follow the period selector.
        </p>
      </div>
    </OwnerPanelShell>
  );
};
