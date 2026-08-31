import React, { useState } from "react";
import { BarChart2, Bike, Percent, Wallet, Receipt, FileText, AlertTriangle } from "lucide-react";
import { SalesReportView } from "./components/SalesReportView";
import { RiderPerformanceReportView } from "./components/RiderPerformanceReportView";
import { CommissionReportView } from "./components/CommissionReportView";
import { SettlementReportView } from "./components/SettlementReportView";
import { TransactionSummaryReportView } from "./components/TransactionSummaryReportView";
import { ExceptionReportView } from "./components/ExceptionReportView";
import { NotificationBell } from "../../../../components/NotificationBell";
import { HeaderClock } from "../../../../components/HeaderClock";

type ReportTab = "sales" | "rider-performance" | "commission" | "settlement" | "transactions" | "exceptions";

const REPORT_TABS: Array<{ id: ReportTab; label: string; icon: typeof BarChart2 }> = [
  { id: "sales", label: "Sales Report", icon: BarChart2 },
  { id: "rider-performance", label: "Rider Performance", icon: Bike },
  { id: "commission", label: "Commission", icon: Percent },
  { id: "settlement", label: "Settlement", icon: Wallet },
  { id: "transactions", label: "Transaction Summary", icon: Receipt },
  // Last, because it is the one read after the numbers rather than instead of them.
  { id: "exceptions", label: "Exceptions", icon: AlertTriangle },
];

export const FinancialReportsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");

  return (
    <div className="flex flex-col h-full space-y-3 max-w-7xl mx-auto w-full overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HERO HEADER & TABS (PINNED)                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
              <BarChart2 size={18} />
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Reports & Analytics</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <HeaderClock />
          <NotificationBell />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. REPORT TYPE TAB SELECTOR (PINNED)                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1.5 flex-wrap bg-slate-100 p-1 rounded-xl">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                isActive
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon size={13} className={isActive ? "text-[#1E3A5F]" : "text-slate-400"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ACTIVE REPORT VIEW (SCROLLABLE CONTAINER)                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin">
        {activeTab === "sales" && <SalesReportView />}
        {activeTab === "rider-performance" && <RiderPerformanceReportView />}
        {activeTab === "commission" && <CommissionReportView />}
        {activeTab === "settlement" && <SettlementReportView />}
        {activeTab === "transactions" && <TransactionSummaryReportView />}
        {activeTab === "exceptions" && <ExceptionReportView />}
      </div>
    </div>
  );
};
