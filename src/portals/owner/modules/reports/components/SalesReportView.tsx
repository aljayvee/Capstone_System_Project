import React, { useState } from "react";
import { TrendingUp, ShoppingBag } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MetricCard } from "../../dashboard/components/MetricCard";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { useReport } from "../../../hooks/useReport";
import { apiService, type ReportPeriod } from "../../../../../services/apiService";
import { downloadCSV } from "../../../../../utils/downloadCSV";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export const SalesReportView: React.FC = () => {
  const [period, setPeriod] = useState<ReportPeriod>("MONTHLY");
  const [date, setDate] = useState(todayISO());
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error } = useReport(apiService.getSalesReport, period, date);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Sales_Report_${data.period}_${date}.csv`,
      ["Category", "Revenue (PHP)", "Order Count"],
      data.byCategory.map((c) => [c.category, c.revenue, c.count])
    );
  };

  return (
    <div className="space-y-6">
      <ReportPeriodToolbar
        period={period}
        onPeriodChange={setPeriod}
        date={date}
        onDateChange={setDate}
        onPrint={() => setReviewOpen(true)}
        onExportCSV={handleExportCSV}
        exportDisabled={!data}
      />

      {error && <p className="text-xs text-rose-600">{error}</p>}
      {isLoading && <p className="text-xs text-slate-400">Loading sales report...</p>}

      {data && (
        <>
          <p className="text-xs text-slate-500 font-semibold">{data.rangeLabel}</p>
          <div className="grid grid-cols-2 gap-6">
            <MetricCard
              title="Total Revenue"
              value={`₱${data.totalRevenue.toLocaleString()}`}
              sub={data.rangeLabel}
              icon={TrendingUp}
              color="#1E3A5F"
            />
            <MetricCard
              title="Total Orders"
              value={String(data.totalOrders)}
              sub="Errands placed"
              icon={ShoppingBag}
              color="#10B981"
            />
          </div>

          {data.byCategory.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center text-sm text-slate-400">
              No sales recorded for this period.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.byCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                  <Tooltip formatter={(v: number) => [`₱${v.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" name="Revenue" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      <DigitalReportReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        reportName="Sales Report"
        rangeLabel={data?.rangeLabel ?? ""}
        onPrintNow={() => window.print()}
      >
        {data && (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2">Category</th>
                <th className="py-2 text-right">Orders</th>
                <th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.byCategory.map((c) => (
                <tr key={c.category} className="border-b border-slate-50">
                  <td className="py-2">{c.category}</td>
                  <td className="py-2 text-right">{c.count}</td>
                  <td className="py-2 text-right">₱{c.revenue.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="font-bold text-slate-800">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">{data.totalOrders}</td>
                <td className="py-2 text-right">₱{data.totalRevenue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        )}
      </DigitalReportReviewModal>
    </div>
  );
};
