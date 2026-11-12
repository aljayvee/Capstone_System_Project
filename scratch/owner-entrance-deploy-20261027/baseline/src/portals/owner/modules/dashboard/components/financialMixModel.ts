// Recharts-free on purpose: DeferredSummaryCharts reads this copy for its
// placeholders without pulling the lazy chart chunk into the dashboard bundle.

export type Commission = {
  businessShare: number;
  riderShare: number;
} | null;

export type Transactions = {
  paymentMethods: Array<{ name: string; count: number; amount: number }>;
} | null;

export type FinancialChartView = "fees" | "payments";

export interface MixBar {
  name: string;
  amount: number;
  fill: string;
}

export function feeBars(commission: Commission): MixBar[] {
  return [
    { name: "Sugo's share", amount: commission?.businessShare ?? 0, fill: "#1E3A5F" },
    { name: "Rider's share", amount: commission?.riderShare ?? 0, fill: "#10B981" },
  ];
}

export function paymentBars(transactions: Transactions): MixBar[] {
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

  return [
    { name: "Cash on delivery", amount: codAmount, fill: "#D97706" },
    { name: "GCash or Maya", amount: digitalAmount, fill: "#2563EB" },
  ];
}

export const FINANCIAL_CHART_COPY: Record<FinancialChartView, {
  title: string;
  loading: string;
  emptyTitle: string;
  emptyDetail: string;
}> = {
  fees: {
    title: "Sugo and Rider Shares",
    loading: "Loading delivery fees...",
    emptyTitle: "No delivery fees in these dates",
    emptyDetail: "No delivery was completed in these dates.",
  },
  payments: {
    title: "Payment Method",
    loading: "Loading payments...",
    emptyTitle: "No payments in these dates",
    emptyDetail: "No order was paid for in these dates.",
  },
};
