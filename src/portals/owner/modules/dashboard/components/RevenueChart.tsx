import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueChartProps {
  data: Array<{ x: string; revenue: number }>;
  timeframe: string;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, timeframe }) => {
  return (
    <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900">{timeframe} Revenue Overview</h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold tracking-wider uppercase">
          Live Sync
        </span>
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="x" tick={{ fontSize: 10, fill: "#64748B" }} />
          <YAxis tick={{ fontSize: 10, fill: "#64748B" }} />
          <Tooltip formatter={(v: any) => [`₱${v.toLocaleString()}`, "Revenue"]} />
          <Area type="monotone" dataKey="revenue" stroke="#1E3A5F" fill="url(#colorRevenue)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
