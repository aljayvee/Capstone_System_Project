import React, { useState } from "react";
import { Bike, Clock, Package, CheckCircle, TrendingUp, DollarSign, AlertTriangle, LayoutDashboard } from "lucide-react";
import { MetricCard } from "./components/MetricCard";
import { RevenueChart } from "./components/RevenueChart";
import { useDashboardMetrics } from "../../hooks/useDashboardMetrics";
import { NotificationBell } from "../../../../components/NotificationBell";
import { HeaderClock } from "../../../../components/HeaderClock";
import { formatRangeLabel, toApiDate, type DateRange } from "../../../../components/DateRangePicker";
import { RangeSelector, PRESET_OPTIONS } from "../../../../components/RangeSelector";
import type { DashboardFrequency } from "../../../../services/apiService";

function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-US")}`;
}

export const DashboardModule: React.FC = () => {
  // The dashboard's frequency enum and RangeSelector's preset enum are the same
  // four values, so the pills drive this directly.
  const [frequency, setFrequency] = useState<DashboardFrequency>("TODAY");

  // The presets and the calendar are two ways to ask, and only one can be in
  // force — RangeSelector owns that coordination for both this page and the
  // reports, so the rule is written once.
  const [customRange, setCustomRange] = useState<DateRange | null>(null);

  const { data, isLoading, error } = useDashboardMetrics(
    frequency,
    customRange ? { start: toApiDate(customRange.start), end: toApiDate(customRange.end) } : undefined
  );

  const activeLabel = customRange
    ? formatRangeLabel(customRange)
    : PRESET_OPTIONS.find((f) => f.value === frequency)?.label ?? "Today";

  const placeholder = isLoading ? "…" : "—";

  const chartData = (data?.trend ?? []).map((t) => ({
    x: t.label,
    revenue: t.revenue,
  }));

  return (
    <div className="flex flex-col h-full space-y-3.5 max-w-7xl mx-auto w-full overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HERO HEADER WITH TIMEFRAME SWITCHER & STATUS (PINNED)  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              <LayoutDashboard size={18} />
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Dashboard</h2>
          </div>
        </div>

        {/* Timeframe & System Tools */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 flex-wrap">
          {/* Period presets + calendar — the same control the reports use. */}
          <RangeSelector
            preset={frequency}
            onPresetChange={setFrequency}
            range={customRange}
            onRangeChange={setCustomRange}
          />

          <HeaderClock />
          <NotificationBell />
        </div>
      </div>

      {error && (
        <div className="shrink-0 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-4 py-2.5 rounded-2xl">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{error} Figures below may be stale or unavailable.</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SCROLLABLE DASHBOARD BODY - Pinned Header Stays in View       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1 pb-4 scrollbar-thin">
        {/* 2. OPERATIONAL METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
          <MetricCard
            title="Riders On Duty"
            value={data ? String(data.riders.active) : placeholder}
            // Says what it counted. "Active Riders / N inactive" read as presence
            // but counted enabled ACCOUNTS, so it showed the full roster while
            // the map showed every one of them signal-lost.
            sub={
              data
                ? [
                    `${data.riders.signalLost + data.riders.offline} no signal`,
                    `${data.riders.offDuty} off duty`,
                  ].join(" · ")
                : "Loading..."
            }
            icon={Bike}
            color="#3B82F6"
          />
          <MetricCard
            title="Pending Errands"
            value={data ? String(data.errands.pending) : placeholder}
            sub="Awaiting dispatch"
            icon={Clock}
            color="#F59E0B"
          />
          <MetricCard
            title="Active Errands"
            value={data ? String(data.errands.active) : placeholder}
            sub="In transit"
            icon={Package}
            color="#10B981"
          />
        </div>

        {/* 3. REVENUE CHART & PERFORMANCE CARD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start">
          <div className="lg:col-span-8">
            <RevenueChart data={chartData} timeframe={activeLabel} />
          </div>
          <div className="lg:col-span-4 space-y-3">
            <MetricCard
              title="Completed Errands"
              value={data ? String(data.errands.completedAllTime) : placeholder}
              sub="All time completed"
              icon={CheckCircle}
              color="#10B981"
            />
            <MetricCard
              title="Gross Revenue"
              value={data ? formatPeso(data.revenue.gross) : placeholder}
              sub={`Earnings (${activeLabel.toLowerCase()})`}
              icon={TrendingUp}
              color="#8B5CF6"
            />
            <MetricCard
              title="Estimated Payouts"
              value={data ? formatPeso(data.revenue.estimatedRiderPayouts) : placeholder}
              sub="Rider payout pool"
              icon={DollarSign}
              color="#059669"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
