import React, { useState } from "react";
import { BarChart2, Download, Printer, TrendingUp, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MetricCard } from "../dashboard/components/MetricCard";

export const FinancialReportsModule: React.FC = () => {
  const [reportRange, setReportRange] = useState<"This Week" | "This Month" | "This Year">("This Month");

  const reportData = {
    "This Week": [
      { label: "Mon", sugoShare: 2400, riderPayouts: 11800 },
      { label: "Tue", sugoShare: 3100, riderPayouts: 15400 },
      { label: "Wed", sugoShare: 2800, riderPayouts: 14000 },
      { label: "Thu", sugoShare: 3500, riderPayouts: 17500 },
      { label: "Fri", sugoShare: 4200, riderPayouts: 20300 },
      { label: "Sat", sugoShare: 5100, riderPayouts: 23900 },
      { label: "Sun", sugoShare: 3800, riderPayouts: 18200 },
    ],
    "This Month": [
      { label: "Week 1", sugoShare: 14500, riderPayouts: 48000 },
      { label: "Week 2", sugoShare: 18200, riderPayouts: 56000 },
      { label: "Week 3", sugoShare: 16900, riderPayouts: 52000 },
      { label: "Week 4", sugoShare: 21400, riderPayouts: 64000 },
    ],
    "This Year": [
      { label: "Q1", sugoShare: 58000, riderPayouts: 182000 },
      { label: "Q2", sugoShare: 72000, riderPayouts: 238000 },
      { label: "Q3", sugoShare: 66000, riderPayouts: 224000 },
      { label: "Q4", sugoShare: 94000, riderPayouts: 326000 },
    ],
  };

  const handleExportCSV = () => {
    const currentData = reportData[reportRange];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Period,Sugo System Share (PHP),Rider Payouts (PHP)"]
        .concat(currentData.map((row) => `${row.label},${row.sugoShare},${row.riderPayouts}`))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sugo_Financial_Report_${reportRange.replace(" ", "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalSugoShare = reportData[reportRange].reduce((acc, r) => acc + r.sugoShare, 0);
  const totalRiderPayouts = reportData[reportRange].reduce((acc, r) => acc + r.riderPayouts, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Financial Reports & Audits</h2>
          <p className="text-xs text-slate-500 mt-0.5">Exportable revenue reports, commission splits, and payouts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <Printer size={15} /> Print Report
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <MetricCard
          title="Total System Share"
          value={`₱${totalSugoShare.toLocaleString()}`}
          sub={`${reportRange} Platform Earnings`}
          icon={TrendingUp}
          color="#1E3A5F"
        />
        <MetricCard
          title="Total Rider Payouts"
          value={`₱${totalRiderPayouts.toLocaleString()}`}
          sub={`${reportRange} Fleet Delivery Earnings`}
          icon={DollarSign}
          color="#10B981"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <BarChart2 size={18} className="text-[#1E3A5F]" /> System Financial Performance
          </h3>
          <div className="flex items-center gap-2">
            {(["This Week", "This Month", "This Year"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setReportRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  reportRange === r ? "bg-[#1E3A5F] text-white" : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={reportData[reportRange]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
            <Tooltip formatter={(v: any) => [`₱${v.toLocaleString()}`, ""]} />
            <Bar dataKey="sugoShare" name="Sugo System Share" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
            <Bar dataKey="riderPayouts" name="Rider Payouts" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
