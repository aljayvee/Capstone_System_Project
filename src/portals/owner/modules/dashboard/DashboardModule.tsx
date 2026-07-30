import React, { useState } from "react";
import { Bike, Clock, Package, CheckCircle, TrendingUp, DollarSign } from "lucide-react";
import { MetricCard } from "./components/MetricCard";
import { RevenueChart } from "./components/RevenueChart";

export const DashboardModule: React.FC = () => {
  const [frequency, setFrequency] = useState<"Today" | "Week" | "Month" | "Year">("Today");

  const revenueMockData = {
    Today: [
      { x: "8 AM", revenue: 1200 },
      { x: "10 AM", revenue: 2400 },
      { x: "12 PM", revenue: 4800 },
      { x: "2 PM", revenue: 3600 },
      { x: "4 PM", revenue: 5200 },
      { x: "6 PM", revenue: 6100 },
    ],
    Week: [
      { x: "Mon", revenue: 14200 },
      { x: "Tue", revenue: 18500 },
      { x: "Wed", revenue: 16800 },
      { x: "Thu", revenue: 21000 },
      { x: "Fri", revenue: 24500 },
      { x: "Sat", revenue: 29000 },
      { x: "Sun", revenue: 22000 },
    ],
    Month: [
      { x: "Week 1", revenue: 62000 },
      { x: "Week 2", revenue: 78000 },
      { x: "Week 3", revenue: 84000 },
      { x: "Week 4", revenue: 91000 },
    ],
    Year: [
      { x: "Q1", revenue: 240000 },
      { x: "Q2", revenue: 310000 },
      { x: "Q3", revenue: 290000 },
      { x: "Q4", revenue: 420000 },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <MetricCard title="Active Riders" value="18" sub="6 riders offline" icon={Bike} color="#3B82F6" />
        <MetricCard title="Pending Errands" value="4" sub="Awaiting dispatch" icon={Clock} color="#F59E0B" />
        <MetricCard title="Active Errands" value="12" sub="In progress" icon={Package} color="#8B5CF6" />
        <MetricCard title="Completed Errands" value="1,240" sub="Fulfillments" icon={CheckCircle} color="#10B981" />
        <MetricCard title="System Share" value="₱28,450" sub="Commissions & Surcharges" icon={TrendingUp} color="#1E3A5F" />
        <MetricCard title="Rider Payouts" value="₱98,000" sub="Delivery Fees" icon={DollarSign} color="#10B981" />
      </div>

      <div className="flex items-center gap-2">
        {(["Today", "Week", "Month", "Year"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFrequency(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              frequency === f
                ? "bg-[#1E3A5F] text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <RevenueChart data={revenueMockData[frequency]} timeframe={frequency} />
    </div>
  );
};
