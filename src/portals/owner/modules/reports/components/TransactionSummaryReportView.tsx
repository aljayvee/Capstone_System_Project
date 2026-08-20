import React, { useState } from "react";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { useReport } from "../../../hooks/useReport";
import { apiService, type ReportPeriod } from "../../../../../services/apiService";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatErrandId } from "../../../../../utils/formatErrandId";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const TransactionTable: React.FC<{
  transactions: Array<{
    transactionId: number;
    errandId: string;
    riderName: string | null;
    customerName: string | null;
    deliveryAddress: string;
    amount: number;
    deliveryFee: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
  }>;
}> = ({ transactions }) => (
  <table className="w-full text-xs">
    <thead>
      <tr className="text-left text-slate-500 border-b border-slate-100">
        <th className="py-2">Errand</th>
        <th className="py-2">Rider</th>
        <th className="py-2">Customer</th>
        <th className="py-2">Location</th>
        <th className="py-2 text-right">Amount</th>
        <th className="py-2 text-right">Delivery Fee</th>
        <th className="py-2">Payment</th>
        <th className="py-2">Status</th>
      </tr>
    </thead>
    <tbody>
      {transactions.map((t) => (
        <tr key={t.transactionId} className="border-b border-slate-50">
          <td className="py-2 font-mono text-slate-500">{formatErrandId(t.errandId)}</td>
          <td className="py-2">{t.riderName ?? "Unassigned"}</td>
          <td className="py-2">{t.customerName ?? "—"}</td>
          <td className="py-2 text-slate-500 max-w-[160px] truncate">{t.deliveryAddress}</td>
          <td className="py-2 text-right">₱{t.amount.toLocaleString()}</td>
          <td className="py-2 text-right">₱{t.deliveryFee.toLocaleString()}</td>
          <td className="py-2">{t.paymentMethod}</td>
          <td className="py-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
              {t.status}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const TransactionSummaryReportView: React.FC = () => {
  const [period, setPeriod] = useState<ReportPeriod>("DAILY");
  const [date, setDate] = useState(todayISO());
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error } = useReport(apiService.getTransactionSummary, period, date);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Transaction_Summary_${data.period}_${date}.csv`,
      ["Errand ID", "Rider", "Customer", "Location", "Amount (PHP)", "Delivery Fee (PHP)", "Payment Method", "Status", "Date"],
      data.transactions.map((t) => [
        t.errandId,
        t.riderName ?? "",
        t.customerName ?? "",
        t.deliveryAddress,
        t.amount,
        t.deliveryFee,
        t.paymentMethod,
        t.status,
        t.createdAt,
      ])
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
      {isLoading && <p className="text-xs text-slate-400">Loading transaction summary...</p>}

      {data && (
        <>
          <p className="text-xs text-slate-500 font-semibold">
            {data.rangeLabel} · {data.transactions.length} transaction{data.transactions.length === 1 ? "" : "s"}
          </p>

          {data.transactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center text-sm text-slate-400">
              No transactions recorded for this period.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
              <TransactionTable transactions={data.transactions} />
            </div>
          )}
        </>
      )}

      <DigitalReportReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        reportName="Transaction Summary"
        rangeLabel={data?.rangeLabel ?? ""}
        onPrintNow={() => window.print()}
      >
        {data && (
          <div className="overflow-x-auto">
            <TransactionTable transactions={data.transactions} />
          </div>
        )}
      </DigitalReportReviewModal>
    </div>
  );
};
