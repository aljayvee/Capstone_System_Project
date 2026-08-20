import React from "react";
import { Printer, Download, CalendarDays } from "lucide-react";
import type { ReportPeriod } from "../../../../../services/apiService";

const PERIODS: Array<{ label: string; value: ReportPeriod }> = [
  { label: "Daily", value: "DAILY" },
  { label: "Weekly", value: "WEEKLY" },
  { label: "Monthly", value: "MONTHLY" },
  { label: "Yearly", value: "YEARLY" },
];

interface ReportPeriodToolbarProps {
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
  date: string;
  onDateChange: (date: string) => void;
  onPrint: () => void;
  onExportCSV: () => void;
  exportDisabled?: boolean;
}

// Shared by all 5 report views — period selection, date filtration, and the
// Print/Export actions look and behave identically everywhere they appear.
export const ReportPeriodToolbar: React.FC<ReportPeriodToolbarProps> = ({
  period,
  onPeriodChange,
  date,
  onDateChange,
  onPrint,
  onExportCSV,
  exportDisabled,
}) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
      <div className="flex items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              period === p.value ? "bg-[#1E3A5F] text-white" : "bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            {p.label}
          </button>
        ))}
        <label className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-1.5 ml-1">
          <CalendarDays size={14} className="text-slate-500" />
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
            aria-label="Date filtration"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onPrint}
          disabled={exportDisabled}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer size={15} /> Print
        </button>
        <button
          onClick={onExportCSV}
          disabled={exportDisabled}
          className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>
    </div>
  );
};
