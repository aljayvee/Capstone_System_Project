import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { useDeviceTier } from "../../../../../hooks/useDeviceTier";

interface FinancialChannelMixChartProps {
  commission: {
    businessShare: number;
    riderShare: number;
  } | null;
  transactions: {
    paymentMethods: Array<{ name: string; count: number; amount: number }>;
  } | null;
  timeframe: string;
  isLoading?: boolean;
}

function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-US")}`;
}

export const FinancialChannelMixChart: React.FC<FinancialChannelMixChartProps> = ({
  commission,
  transactions,
  timeframe,
  isLoading = false,
}) => {
  const { isPhone } = useDeviceTier();
  // 1. Calculate Delivery Share Split
  const businessShare = commission?.businessShare ?? 0;
  const riderShare = commission?.riderShare ?? 0;

  // 2. Calculate Payment Channels: COD vs Digital
  let codAmount = 0;
  let digitalAmount = 0;

  (transactions?.paymentMethods || []).forEach((p) => {
    const rawName = p.name || (p as unknown as { paymentMethod?: string })?.paymentMethod || "";
    const nameLower = rawName.toLowerCase().trim();

    // Critical: Check digital payment methods (GCash, PayMaya, etc.) first.
    // "gcash" contains "cash", so checking for "cash" first mistakenly classifies GCash as COD!
    const isDigital =
      nameLower.includes("gcash") ||
      nameLower.includes("maya") ||
      nameLower.includes("online") ||
      nameLower.includes("digital") ||
      nameLower.includes("bank") ||
      nameLower.includes("card") ||
      nameLower.includes("wallet");

    if (isDigital) {
      digitalAmount += p.amount;
    } else {
      codAmount += p.amount;
    }
  });

  const chartData = [
    {
      domain: "Fee Allocation",
      "Business Share": businessShare,
      "Rider Payout": riderShare,
    },
    {
      domain: "Payment Channels",
      "Cash (COD)": codAmount,
      "Digital (GCash/Maya)": digitalAmount,
    },
  ];

  const hasData = businessShare > 0 || riderShare > 0 || codAmount > 0 || digitalAmount > 0;

  return (
    <div className="space-y-3 rounded-plate border border-edge bg-board-plate p-3.5 sm:p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-panel text-ink">Financial & Channel Allocation</h3>
          <p className="text-micro text-ink-muted mt-0.5">
            Fee splits and payment collection channels ({timeframe.toLowerCase()})
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-1.5 px-6 text-center">
          <p className="text-label text-ink-muted">Loading financial allocation data…</p>
        </div>
      ) : !hasData ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-1.5 px-6 text-center">
          <p className="text-label text-ink font-semibold">No allocation data recorded</p>
          <p className="text-micro text-ink-muted">
            No fee settlements or transactions occurred during this period.
          </p>
        </div>
      ) : (
        <div className={cn("w-full", isPhone ? "h-[270px]" : "h-[240px]")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="2 2"
                vertical={false}
                stroke="#E2E8F0"
              />
              <XAxis
                dataKey="domain"
                tick={{ fontSize: isPhone ? 10 : 12, fill: "#1E293B", fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: "#E2E8F0" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₱${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="rounded-trim border border-edge bg-board-plate p-2.5 shadow-plate text-xs space-y-1.5 min-w-[170px]">
                      <p className="font-bold text-ink border-b border-hairline pb-1">
                        {label}
                      </p>
                      {payload.map((entry, idx) => (
                        <div
                          key={`tooltip-entry-${idx}`}
                          className="flex items-center justify-between gap-3 text-label"
                        >
                          <span className="flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-ink-muted text-micro">{entry.name}:</span>
                          </span>
                          <span className="font-mono font-semibold text-ink">
                            {formatPeso(Number(entry.value) || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "8px", fontSize: "11px" }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="Business Share" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Rider Payout" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Cash (COD)" fill="#D97706" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Digital (GCash/Maya)" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
