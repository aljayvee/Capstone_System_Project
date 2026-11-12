import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RevenuePlotProps {
  data: Array<{ x: string; revenue: number }>;
}

export default function RevenuePlot({ data }: RevenuePlotProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
        <XAxis dataKey="x" tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
          tickFormatter={(v: number) => `₱${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
        />
        <Tooltip formatter={(v: number | string) => [`₱${Number(v).toLocaleString()}`, "Sales"]} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-field-ink)"
          fill="var(--color-field-ink)"
          fillOpacity={0.12}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
