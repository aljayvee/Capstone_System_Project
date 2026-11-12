import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { useDeviceTier } from "../../../../../hooks/useDeviceTier";
import { SummaryChartSkeleton } from "../../../components/OwnerSkeletons";

interface CategorySalesChartProps {
  data: Array<{ name: string; revenue: number; orders: number }>;
  isLoading?: boolean;
}

function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-US")}`;
}

const CATEGORY_COLORS = ["#F59E0B", "#10B981", "#06B6D4", "#2563EB", "#6366F1", "#EC4899", "#8B5CF6"];

const getCategoryColor = (name: string, index: number) => {
  const lower = name.toLowerCase();
  if (lower.includes("food") || lower.includes("resto") || lower.includes("dine") || lower.includes("bever")) return "#F59E0B";
  if (lower.includes("groc") || lower.includes("market") || lower.includes("super")) return "#10B981";
  if (lower.includes("pharm") || lower.includes("drug") || lower.includes("med")) return "#06B6D4";
  if (lower.includes("retail") || lower.includes("shop") || lower.includes("cloth")) return "#2563EB";
  if (lower.includes("serv") || lower.includes("pabili") || lower.includes("errand")) return "#6366F1";
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
};

export const CategorySalesChart: React.FC<CategorySalesChartProps> = ({
  data,
  isLoading = false,
}) => {
  const { isPhone } = useDeviceTier();
  const hasData = data.length > 0;

  return (
    <div className="space-y-3 rounded-plate border border-edge bg-board-plate p-3.5 sm:p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-panel text-ink">Sales by Merchant Categories</h3>
        </div>
      </div>

      {isLoading ? (
        <SummaryChartSkeleton type="bars" />
      ) : !hasData ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-1.5 px-6 text-center">
          <p className="text-label text-ink font-semibold">No sales in these dates</p>
          <p className="text-micro text-ink-muted">
            No store orders were placed in these dates.
          </p>
        </div>
      ) : (
        <div className={cn("w-full", isPhone ? "h-[280px]" : "h-[240px]")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout={isPhone ? "vertical" : "horizontal"}
              margin={
                isPhone
                  ? { top: 10, right: 15, left: 10, bottom: 10 }
                  : { top: 10, right: 10, left: -15, bottom: 25 }
              }
            >
              <CartesianGrid
                strokeDasharray="2 2"
                vertical={isPhone}
                horizontal={!isPhone}
                stroke="var(--color-hairline)"
              />
              {isPhone ? (
                <>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "var(--color-ink-muted)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-hairline)" }}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={75}
                    tick={{ fontSize: 10, fill: "var(--color-ink-muted)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--color-ink-muted)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-hairline)" }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-ink-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                  />
                </>
              )}
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as {
                    name: string;
                    revenue: number;
                    orders: number;
                  };
                  return (
                    <div className="rounded-trim border border-edge bg-board-plate p-2.5 shadow-plate text-xs">
                      <p className="font-bold text-ink">{item.name}</p>
                      <p className="mt-1 font-mono text-ink text-sm font-semibold">
                        {formatPeso(item.revenue)}
                      </p>
                      <p className="text-ink-muted text-micro mt-0.5">
                        {item.orders} {item.orders === 1 ? "order" : "orders"}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="revenue" isAnimationActive={false} radius={isPhone ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}-${index}`}
                    fill={getCategoryColor(entry.name, index)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
