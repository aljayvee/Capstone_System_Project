import React from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useDeviceTier } from "../../../../../hooks/useDeviceTier";
import { SummaryChartSkeleton } from "../../../components/OwnerSkeletons";
import {
  FINANCIAL_CHART_COPY,
  feeBars,
  paymentBars,
  type Commission,
  type FinancialChartView,
  type MixBar,
  type Transactions,
} from "./financialMixModel";

interface FinancialChannelMixChartProps {
  view: FinancialChartView;
  commission: Commission;
  transactions: Transactions;
  isLoading?: boolean;
}

function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-US")}`;
}

export const FinancialChannelMixChart: React.FC<FinancialChannelMixChartProps> = ({
  view,
  commission,
  transactions,
  isLoading = false,
}) => {
  const { isPhone } = useDeviceTier();
  const copy = FINANCIAL_CHART_COPY[view];
  const chartData = view === "fees" ? feeBars(commission) : paymentBars(transactions);
  const total = chartData.reduce((sum, bar) => sum + bar.amount, 0);
  const hasData = chartData.some((bar) => bar.amount > 0);

  return (
    <div className="space-y-3 rounded-plate border border-edge bg-board-plate p-3.5 sm:p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-panel text-ink">{copy.title}</h3>
        </div>
      </div>

      {isLoading ? (
        <SummaryChartSkeleton type="mix" />
      ) : !hasData ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-1.5 px-6 text-center">
          <p className="text-label text-ink font-semibold">{copy.emptyTitle}</p>
          <p className="text-micro text-ink-muted">{copy.emptyDetail}</p>
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
                stroke="var(--color-hairline)"
              />
              <XAxis
                dataKey="name"
                interval={0}
                tick={{ fontSize: isPhone ? 10 : 12, fill: "var(--color-ink)", fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-hairline)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-ink-muted)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₱${v >= 1000 ? `${Number((v / 1000).toFixed(1))}k` : v}`}
              />
              <Tooltip
                cursor={{ fill: "var(--color-board-ground)" }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const bar = payload[0].payload as MixBar;
                  const share = total > 0 ? Math.round((bar.amount / total) * 100) : 0;
                  return (
                    <div className="rounded-trim border border-edge bg-board-plate p-2.5 shadow-plate text-xs space-y-1.5 min-w-[170px]">
                      <p className="flex items-center gap-1.5 font-bold text-ink border-b border-hairline pb-1">
                        <span
                          className="size-2 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: bar.fill }}
                        />
                        {bar.name}
                      </p>
                      <div className="flex items-center justify-between gap-3 text-label">
                        <span className="font-mono font-semibold text-ink">{formatPeso(bar.amount)}</span>
                        <span className="text-ink-muted text-micro">{share}% of {formatPeso(total)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="amount" isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={72}>
                {chartData.map((bar) => (
                  <Cell key={bar.name} fill={bar.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
