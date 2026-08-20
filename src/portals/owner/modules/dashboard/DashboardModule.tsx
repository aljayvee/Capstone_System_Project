import React, { useState } from "react";
import { Bike, Clock, Package, CheckCircle, TrendingUp, DollarSign, AlertTriangle, LayoutDashboard } from "lucide-react";
import { MetricCard } from "./components/MetricCard";
import { RevenueChart } from "./components/RevenueChart";
import { useDashboardMetrics } from "../../hooks/useDashboardMetrics";
import { ServerStatusBadge } from "../../../../components/ServerStatusBadge";
import { NotificationBell } from "../../../../components/NotificationBell";
import type { DashboardFrequency } from "../../../../services/apiService";

const FREQUENCY_OPTIONS: Array<{ label: string; value: DashboardFrequency }> = [
  { label: "Today", value: "TODAY" },
  { label: "Week", value: "WEEK" },
  { label: "Month", value: "MONTH" },
  { label: "Year", value: "YEAR" },
];

function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-US")}`;
}

export const DashboardModule: React.FC = () => {
  const [frequency, setFrequency] = useState<DashboardFrequency>("TODAY");
  const { data, isLoading, error } = useDashboardMetrics(frequency);
  const activeLabel = FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label ?? "Today";

  const placeholder = isLoading ? "…" : "—";

  const chartData = (data?.trend ?? []).map((t) => ({
    x: t.label,
    revenue: t.revenue,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HERO HEADER WITH TIMEFRAME SWITCHER & STATUS           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <LayoutDashboard size={20} />
            </span>
            <h2 className="text-xl font-extrabold text-slate-800">Dashboard</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Overview of today's errands, active riders, and earnings.
          </p>
        </div>

        {/* Timeframe & System Tools */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Frequency Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {FREQUENCY_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFrequency(f.value)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  frequency === f.value
                    ? "bg-[#1E3A5F] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <NotificationBell />
          <ServerStatusBadge />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-4 py-3 rounded-2xl">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error} Figures below may be stale or unavailable.</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. OPERATIONAL METRIC CARDS                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Active Riders"
          value={data ? String(data.riders.active) : placeholder}
          sub={data ? `${data.riders.inactive} riders inactive` : "Loading..."}
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. REVENUE CHART & PERFORMANCE CARD                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={chartData} timeframe={activeLabel} />
        </div>
        <div className="space-y-4">
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
  );
};
