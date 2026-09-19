import React, { useState } from "react";
import { BarChart2, Bike, Percent, Wallet, Receipt, AlertTriangle } from "lucide-react";
import { SalesReportView } from "./components/SalesReportView";
import { RiderPerformanceReportView } from "./components/RiderPerformanceReportView";
import { CommissionReportView } from "./components/CommissionReportView";
import { SettlementReportView } from "./components/SettlementReportView";
import { TransactionSummaryReportView } from "./components/TransactionSummaryReportView";
import { ExceptionReportView } from "./components/ExceptionReportView";
import { OwnerPanelShell } from "../../components/OwnerPanelShell";
import { OwnerTabs, type OwnerTab } from "../../components/OwnerTabs";

type ReportTab =
  "sales" | "rider-performance" | "commission" | "settlement" | "transactions" | "exceptions";

const REPORT_TABS: ReadonlyArray<OwnerTab<ReportTab>> = [
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
    <OwnerPanelShell
      title="Reports & Analytics"
      controls={
        <OwnerTabs
          label="Report type"
          idPrefix="reports"
          tabs={REPORT_TABS}
          active={activeTab}
          // Wrapped rather than passed as the setter directly: a
          // Dispatch<SetStateAction<T>> accepts an updater function too, and
          // offering that as an inference site widens OwnerTabs' generic to
          // plain `string`, which loses the union the tab ids are checked
          // against.
          onChange={(id) => setActiveTab(id)}
        />
      }
    >
      {/* One panel per tab, each labelled by the tab that selects it. The
          strip above was a plain div of six buttons with no tab semantics at
          all, so this is the first time the relationship is expressed. */}
      <div
        role="tabpanel"
        id={`reports-panel-${activeTab}`}
        aria-labelledby={`reports-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === "sales" && <SalesReportView />}
        {activeTab === "rider-performance" && <RiderPerformanceReportView />}
        {activeTab === "commission" && <CommissionReportView />}
        {activeTab === "settlement" && <SettlementReportView />}
        {activeTab === "transactions" && <TransactionSummaryReportView />}
        {activeTab === "exceptions" && <ExceptionReportView />}
      </div>
    </OwnerPanelShell>
  );
};
