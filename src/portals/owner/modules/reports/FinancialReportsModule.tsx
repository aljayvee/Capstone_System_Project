import React, { useState } from "react";
import { BarChart2, Bike, Percent, Wallet, Receipt, FileText } from "lucide-react";
import { SalesReportView } from "./components/SalesReportView";
import { RiderPerformanceReportView } from "./components/RiderPerformanceReportView";
import { CommissionReportView } from "./components/CommissionReportView";
import { SettlementReportView } from "./components/SettlementReportView";
import { TransactionSummaryReportView } from "./components/TransactionSummaryReportView";
import { ServerStatusBadge } from "../../../../components/ServerStatusBadge";
import { NotificationBell } from "../../../../components/NotificationBell";

type ReportTab = "sales" | "rider-performance" | "commission" | "settlement" | "transactions";

const REPORT_TABS: Array<{ id: ReportTab; label: string; icon: typeof BarChart2 }> = [
  { id: "sales", label: "Sales Report", icon: BarChart2 },
  { id: "rider-performance", label: "Rider Performance", icon: Bike },
  { id: "commission", label: "Commission", icon: Percent },
  { id: "settlement", label: "Settlement", icon: Wallet },
  { id: "transactions", label: "Transaction Summary", icon: Receipt },
];

export const FinancialReportsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HERO HEADER & TABS                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
              <BarChart2 size={20} />
            </span>
            <h2 className="text-xl font-extrabold text-slate-800">Reports</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            View sales, rider earnings, and delivery summary.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <NotificationBell />
          <ServerStatusBadge />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. REPORT TYPE TAB SELECTOR                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap bg-slate-100 p-1.5 rounded-2xl">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                isActive
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon size={14} className={isActive ? "text-[#1E3A5F]" : "text-slate-400"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ACTIVE REPORT VIEW                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "sales" && <SalesReportView />}
      {activeTab === "rider-performance" && <RiderPerformanceReportView />}
      {activeTab === "commission" && <CommissionReportView />}
      {activeTab === "settlement" && <SettlementReportView />}
      {activeTab === "transactions" && <TransactionSummaryReportView />}
    </div>
  );
};
