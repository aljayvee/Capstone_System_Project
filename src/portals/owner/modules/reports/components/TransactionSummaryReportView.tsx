import React, { useState } from "react";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { DigitalReportReviewModal } from "./DigitalReportReviewModal";
import { ReportNotes } from "./ReportNotes";
import { useReport } from "../../../hooks/useReport";
import { useReportPdf } from "../../../hooks/useReportPdf";
import { apiService, type ApiTransactionSummaryReport } from "../../../../../services/apiService";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { toApiRange, type RangePreset } from "../../../../../components/RangeSelector";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatErrandId } from "../../../../../utils/formatErrandId";
import { formatPeso } from "../../../../../utils/format";

type Transaction = ApiTransactionSummaryReport["transactions"][number];

const TransactionTable: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => (
  <table className="w-full text-xs">
    <thead>
      <tr className="text-left text-slate-500 border-b border-slate-100">
        <th className="py-2">Errand</th>
        <th className="py-2">Category</th>
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
          <td className="py-2">
            {t.category}
            {/* A multi-stop errand is one transaction but several shops. The
                badge keeps the column readable while the title carries the rest. */}
            {t.categories.length > 1 && (
              <span
                className="ml-1 px-1 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold cursor-help"
                title={t.categories.join(" · ")}
              >
                +{t.categories.length - 1}
              </span>
            )}
          </td>
          <td className="py-2">{t.riderName ?? "Unassigned"}</td>
          <td className="py-2">{t.customerName ?? "—"}</td>
          <td className="py-2 text-slate-500 max-w-[160px] truncate">{t.deliveryAddress}</td>
          <td className="py-2 text-right font-mono tabular-nums">{formatPeso(t.amount)}</td>
          <td className="py-2 text-right font-mono tabular-nums">{formatPeso(t.deliveryFee)}</td>
          <td className="py-2">{t.paymentMethod}</td>
          <td className="py-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
              {t.errandStatus}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** A compact subtotal block — same shape for payment method and errand status. */
const SubtotalTable: React.FC<{
  title: string;
  rows: Array<{ name: string; count: number; amount: number }>;
}> = ({ title, rows }) => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
    <header className="px-5 py-2.5 border-b border-slate-200">
      <h4 className="text-xs font-extrabold text-slate-800">{title}</h4>
    </header>
    <table className="w-full text-xs">
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="border-t border-slate-50 first:border-t-0">
            <td className="px-5 py-2 text-slate-600 font-medium">{r.name}</td>
            <td className="px-5 py-2 text-right font-mono tabular-nums text-slate-500">{r.count}</td>
            <td className="px-5 py-2 text-right font-mono tabular-nums font-semibold">
              {formatPeso(r.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const TransactionSummaryReportView: React.FC = () => {
  const [preset, setPreset] = useState<RangePreset>("TODAY");
  const [range, setRange] = useState<DateRange | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = toApiRange(preset, range);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { data, isLoading, error } = useReport(apiService.getTransactionSummary, apiRange);
  const pdf = useReportPdf("transactions", apiRange);

  const handleExportCSV = () => {
    if (!data) return;
    downloadCSV(
      `Sugo_Transaction_Summary_${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      [
        "Errand ID",
        "Category",
        "Rider",
        "Customer",
        "Location",
        "Amount (PHP)",
        "Delivery Fee (PHP)",
        "Payment Method",
        "Errand Status",
        "Date",
      ],
      data.transactions.map((t) => [
        t.errandId,
        t.categories.join(" | "),
        t.riderName ?? "",
        t.customerName ?? "",
        t.deliveryAddress,
        t.amount,
        t.deliveryFee,
        t.paymentMethod,
        t.errandStatus,
        t.createdAt,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <ReportPeriodToolbar
        preset={preset}
        onPresetChange={setPreset}
        range={range}
        onRangeChange={setRange}
        onPreview={() => setReviewOpen(true)}
        onExportCSV={handleExportCSV}
        exportDisabled={!data}
        isGeneratingPdf={pdf.isGenerating}
      />

      {error && <p className="text-xs text-rose-600">{error}</p>}
      {isLoading && <p className="text-xs text-slate-400">Loading transaction summary...</p>}

      {data && (
        <>
          <p className="text-xs text-slate-500 font-semibold">
            {data.rangeLabel} · {data.totals.count} transaction{data.totals.count === 1 ? "" : "s"} ·{" "}
            {formatPeso(data.totals.amount)}
          </p>

          {data.transactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center text-sm text-slate-400">
              No transactions recorded for this period.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SubtotalTable
                  title="By payment method"
                  rows={data.byPaymentMethod.map((r) => ({
                    name: r.paymentMethod,
                    count: r.count,
                    amount: r.amount,
                  }))}
                />
                <SubtotalTable
                  title="By errand status"
                  rows={data.byErrandStatus.map((r) => ({
                    name: r.status,
                    count: r.count,
                    amount: r.amount,
                  }))}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
                <TransactionTable transactions={data.transactions} />
              </div>
            </>
          )}

          <ReportNotes notes={data.notes} />
        </>
      )}

      <DigitalReportReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        reportName="Transaction Summary"
        rangeLabel={data?.rangeLabel ?? ""}
        onDownloadPdf={pdf.generate}
        isGenerating={pdf.isGenerating}
        generateError={pdf.error}
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
