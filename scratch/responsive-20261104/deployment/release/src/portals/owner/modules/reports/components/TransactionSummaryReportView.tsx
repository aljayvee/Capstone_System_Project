import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronsLeftRight, Image as ImageIcon, Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { ReportState } from "./ReportState";
import { ReportPeriodToolbar } from "./ReportPeriodToolbar";
import { PeriodBreakdownTable } from "./PeriodBreakdownTable";
import { useReport } from "../../../hooks/useReport";
import { useReportPrint } from "../../../hooks/useReportPrint";
import { apiService, type ApiTransactionSummaryReport } from "../../../../../services/apiService";
import type { DateRange } from "../../../../../components/DateRangePicker";
import { toApiRange, type RangePreset } from "../../../../../components/RangeSelector";
import { downloadCSV } from "../../../../../utils/downloadCSV";
import { formatErrandId } from "../../../../../utils/formatErrandId";
import { formatPeso } from "../../../../../utils/format";
import { MobileResponsiveTable, TablePagination } from "../../../../../components/table";
import { usePagination } from "../../../../../hooks/usePagination";
import { RiderSearchPicker, type RiderOption } from "./RiderSearchPicker";

type Transaction = ApiTransactionSummaryReport["transactions"][number];
type TransactionPoint = NonNullable<ApiTransactionSummaryReport["timelineBreakdown"]>[number];

/** DELIVERED -> Delivered, IN_TRANSIT -> In transit. */
const plainStatus = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, " ");

const proofFrom = (source: Transaction["paymentEvidenceSource"]) =>
  source === "customer" ? "Customer's upload" : source === "rider" ? "Rider's photo" : "—";

/**
 * "Customer's upload" / "Rider's photo", and the photo itself one click away
 * (owner, 2026-10-27). Fetched only when asked for, through the same endpoint
 * the dispatcher's viewers use, so a page of rows pulls no image bytes.
 *
 * The viewer is portalled to <body> above everything: it can open from the
 * record inspector or the full-screen table, both of which close on Escape.
 * Its own Escape listener runs first (capture) and stops there, so Escape
 * closes the photo and leaves the inspector open.
 */
const ProofFrom: React.FC<{ t: Transaction }> = ({ t }) => {
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const [src, setSrc] = useState<string | null>(null);
  const label = proofFrom(t.paymentEvidenceSource);

  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setSrc(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [src]);

  if (!t.paymentProofImageId) return <>{label}</>;
  const imageId = t.paymentProofImageId;

  const open = async () => {
    setState("loading");
    const full = await apiService.getProofImage(t.errandId, imageId);
    if (!full) {
      setState("failed");
      return;
    }
    setState("idle");
    setSrc(`data:${full.mimeType};base64,${full.imageData}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void open()}
        disabled={state === "loading"}
        className="inline-flex items-center gap-1.5 text-ink underline underline-offset-2 hover:text-field-ink cursor-pointer disabled:cursor-wait"
        aria-label={`View the payment proof: ${label}`}
      >
        {state === "loading" ? (
          <Loader2 size={13} className="shrink-0 animate-spin" />
        ) : (
          <ImageIcon size={13} className="shrink-0" />
        )}
        {label}
      </button>
      {state === "failed" ? (
        <span role="alert" className="ml-2 text-status-act-ink">
          Could not open the photo.{" "}
          <button type="button" onClick={() => void open()} className="underline underline-offset-2 cursor-pointer">
            Try again
          </button>
        </span>
      ) : null}
      {src
        ? createPortal(
            <div
              className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/70 p-6"
              onClick={() => setSrc(null)}
              role="dialog"
              aria-modal="true"
              aria-label={`Payment proof, ${label}, ${formatErrandId(t.errandId)}`}
            >
              <button
                type="button"
                onClick={() => setSrc(null)}
                className="absolute right-5 top-5 grid size-9 cursor-pointer place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close the photo"
              >
                <X size={18} />
              </button>
              <img
                src={src}
                alt={`Payment proof for ${formatErrandId(t.errandId)}`}
                className="max-h-[85%] max-w-full rounded-lg object-contain"
                onClick={(event) => event.stopPropagation()}
              />
              <p className="text-label text-white/80">
                {label} · {formatErrandId(t.errandId)}
                {t.paymentReferenceNo ? ` · ref ${t.paymentReferenceNo}` : ""}
              </p>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

const TransactionTable: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => (
  <table className="w-full text-label min-w-[1100px] border-collapse">
    <thead>
      <tr className="text-left text-ink-muted border-b border-hairline">
        <th scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap">
          Order
        </th>
        <th scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap">
          Store type
        </th>
        <th scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap">
          Rider
        </th>
        <th scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap">
          Customer
        </th>
        <th scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap">
          Location
        </th>
        <th scope="col" className="px-3 py-2.5 font-medium text-right whitespace-nowrap">
          Amount
        </th>
        <th scope="col" className="px-3 py-2.5 font-medium text-right whitespace-nowrap">
          Service fee
        </th>
        <th scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap">
          Payment
        </th>
        {/* The GCash/Maya reference read off whichever photo backed the
            payment, and whose photo it was — the customer's own upload, or a
            rider's door-side photo. Null on COD, where there's no receipt to
            reference at all. */}
        <th scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap">
          Payment reference
        </th>
        <th scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap">
          Proof from
        </th>
        <th scope="col" className="px-3 py-2.5 font-medium text-center whitespace-nowrap">
          Status
        </th>
      </tr>
    </thead>
    <tbody>
      {transactions.map((t) => (
        <tr key={t.transactionId} className="border-b border-hairline hover:bg-board-ground/40 transition-colors">
          <td className="px-3 py-2.5 font-mono text-ink-muted whitespace-nowrap">{formatErrandId(t.errandId)}</td>
          <td className="px-3 py-2.5 whitespace-nowrap">
            {t.category}
            {/* A multi-stop errand is one transaction but several shops. The
                badge keeps the column readable while the title carries the rest. */}
            {t.categories.length > 1 && (
              <span
                className="ml-1 px-1 py-0.5 rounded bg-board-ground text-ink-muted text-label cursor-help"
                title={t.categories.join(" · ")}
              >
                +{t.categories.length - 1}
              </span>
            )}
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap">{t.riderName ?? "Not assigned"}</td>
          <td className="px-3 py-2.5 whitespace-nowrap">{t.customerName ?? "--"}</td>
          <td className="px-3 py-2.5 text-ink-muted max-w-[180px] truncate" title={t.deliveryAddress}>
            {t.deliveryAddress}
          </td>
          <td className="px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap font-medium text-ink">
            {formatPeso(t.amount)}
          </td>
          <td className="px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap font-medium text-ink">
            {formatPeso(t.deliveryFee)}
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap">{t.paymentMethod}</td>
          <td className="px-3 py-2.5 font-mono text-ink-muted whitespace-nowrap">{t.paymentReferenceNo ?? "—"}</td>
          <td className="px-3 py-2.5 text-ink-muted whitespace-nowrap">
            <ProofFrom t={t} />
          </td>
          <td className="px-3 py-2.5 text-center whitespace-nowrap">
            <span className="px-2 py-0.5 rounded-full bg-board-ground text-ink-muted text-label">
              {plainStatus(t.errandStatus)}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** A compact subtotal block — same shape for payment method and order status. */
const SubtotalTable: React.FC<{
  title: string;
  rows: Array<{ name: string; count: number; amount: number }>;
}> = ({ title, rows }) => (
  <div className="bg-board-plate border border-edge rounded-plate overflow-hidden">
    <header className="px-5 py-2.5 border-b border-edge">
      <h4 className="text-label text-ink">{title}</h4>
    </header>
    <table className="w-full text-label">
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="border-t border-hairline first:border-t-0">
            <td className="px-5 py-2 text-ink-muted font-medium">{r.name}</td>
            <td className="px-5 py-2 text-right font-mono tabular-nums text-ink-muted">
              {r.count}
            </td>
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
  // One rider, or null for every rider (owner, 2026-10-27). Carried in the
  // report query, so the screen and the printout are narrowed by the same call.
  const [riderId, setRiderId] = useState<number | null>(null);
  // Rebuilt each render; the hooks key on its values, not its identity.
  const apiRange = { ...toApiRange(preset, range), ...(riderId ? { riderId } : {}) };
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { data, isLoading, error, reload } = useReport(apiService.getTransactionSummary, apiRange);
  const printer = useReportPrint("transactions", apiRange);
  // Kept across reloads, so the picker does not vanish while a new window loads.
  const [riderOptions, setRiderOptions] = useState<RiderOption[]>([]);
  useEffect(() => {
    if (data?.riderOptions) setRiderOptions(data.riderOptions);
  }, [data]);

  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((t) => {
      const matchesSearch =
        !tableSearch ||
        t.errandId.toLowerCase().includes(tableSearch.toLowerCase()) ||
        formatErrandId(t.errandId).toLowerCase().includes(tableSearch.toLowerCase()) ||
        t.category.toLowerCase().includes(tableSearch.toLowerCase()) ||
        (t.riderName && t.riderName.toLowerCase().includes(tableSearch.toLowerCase())) ||
        (t.customerName && t.customerName.toLowerCase().includes(tableSearch.toLowerCase())) ||
        (t.deliveryAddress && t.deliveryAddress.toLowerCase().includes(tableSearch.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || t.errandStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, tableSearch, statusFilter]);

  const txPagination = usePagination(filteredTransactions, 25, [preset, range, riderId, statusFilter, tableSearch]);

  useEffect(() => {
    if (!isFullScreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen]);

  const handleExportCSV = () => {
    if (!data) return;
    const exportList =
      filteredTransactions.length > 0 || statusFilter !== "ALL" || tableSearch
        ? filteredTransactions
        : data.transactions;
    const who = data.rider ? `${data.rider.name.replace(/[^A-Za-z0-9]+/g, "_")}_` : "";
    downloadCSV(
      `Sugo_Transaction_Summary_${who}${data.rangeLabel.replace(/[^A-Za-z0-9]+/g, "_")}.csv`,
      [
        "Order Number",
        "Store Type",
        "Rider",
        "Customer",
        "Location",
        "Amount (PHP)",
        "Service Fee (PHP)",
        "Payment Method",
        "Payment Reference",
        "Proof From",
        "Order Status",
        "Date",
      ],
      exportList.map((t) => [
        t.errandId,
        t.categories.join(" | "),
        t.riderName ?? "",
        t.customerName ?? "",
        t.deliveryAddress,
        t.amount,
        t.deliveryFee,
        t.paymentMethod,
        t.paymentReferenceNo ?? "",
        t.paymentEvidenceSource === "customer"
          ? "Customer upload"
          : t.paymentEvidenceSource === "rider"
            ? "Rider photo"
            : "",
        t.errandStatus,
        t.createdAt,
      ]),
    );
  };

  return (
    <div className="space-y-6">
      <ReportPeriodToolbar
        preset={preset}
        onPresetChange={setPreset}
        range={range}
        onRangeChange={setRange}
        onPrint={printer.print}
        onExportCSV={handleExportCSV}
        exportDisabled={!data}
        isPreparingPrint={printer.isPreparing}
        printError={printer.error}
        filters={<RiderSearchPicker options={riderOptions} value={riderId} onChange={setRiderId} />}
        printLabel={riderId ? "Print rider report" : "Print"}
      />
      <ReportState
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        title="The transaction summary did not load"
        loadingRows={6}
      />

      {data && (
        <>
          {data.rider && (
            <p className="text-label text-ink-muted" data-testid="transactions-rider">
              <span className="font-semibold text-ink">{data.rider.name}</span>
              {" · only this rider's transactions · "}
              <button
                type="button"
                onClick={() => setRiderId(null)}
                className="underline underline-offset-2 hover:text-ink"
              >
                Show all riders
              </button>
            </p>
          )}

          <p className="text-label text-ink-muted">
            {data.coverageLabel ?? data.rangeLabel} · {data.totals.count} transaction
            {data.totals.count === 1 ? "" : "s"} · {formatPeso(data.totals.amount)}
          </p>

          <PeriodBreakdownTable<TransactionPoint>
            subject="Transactions"
            unit={data.breakdownUnit}
            points={data.timelineBreakdown}
            figures={[
              { header: "Transactions", format: "count", value: (p) => p.count },
              { header: "Amount", format: "money", value: (p) => p.amount, primary: true },
              { header: "Service fees", format: "money", value: (p) => p.deliveryFee },
            ]}
          />

          {data.transactions.length === 0 ? (
            <div className="bg-board-plate rounded-plate p-8 border border-edge text-center text-label text-ink-muted">
              No transactions were recorded for these dates.
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
                  title="By order status"
                  rows={data.byErrandStatus.map((r) => ({
                    name: plainStatus(r.status),
                    count: r.count,
                    amount: r.amount,
                  }))}
                />
              </div>

              {(() => {
                const desktopTable = (
                  <div className="bg-board-plate border border-edge rounded-plate overflow-hidden">
                    <div className="px-5 py-3 border-b border-edge flex items-center justify-between bg-board-plate">
                      <div className="flex items-center gap-2">
                        <h4 className="text-label text-ink font-semibold">Every transaction</h4>
                        <span className="text-label text-ink-muted">
                          ({filteredTransactions.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsFullScreen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-plate border border-edge bg-board-ground hover:bg-board-ground/70 text-label text-ink transition-colors text-xs"
                        title="Open Full Screen"
                      >
                        <ChevronsLeftRight size={13} className="text-ink-muted" />
                        <span>Full Screen</span>
                      </button>
                    </div>
                    <div className="p-6 overflow-x-auto">
                      <TransactionTable transactions={txPagination.paginatedItems} />
                    </div>
                    <TablePagination
                      currentPage={txPagination.currentPage}
                      totalPages={txPagination.totalPages}
                      totalItems={txPagination.totalItems}
                      startIndex={txPagination.startIndex}
                      endIndex={txPagination.endIndex}
                      onPageChange={txPagination.setCurrentPage}
                      itemName="transactions"
                    />
                  </div>
                );

                return (
                  <div className="space-y-3">
                    <MobileResponsiveTable<Transaction>
                      data={txPagination.paginatedItems}
                      keyExtractor={(t) => t.transactionId}
                      desktopView={desktopTable}
                    primaryHeader="Order and store type"
                    secondaryHeader="Amount and status"
                    renderPrimary={(t) => (
                      <div className="min-w-0">
                        <div className="font-mono font-medium text-ink text-xs flex items-center gap-1.5">
                          <span>{formatErrandId(t.errandId)}</span>
                          {t.categories.length > 1 && (
                            <span className="px-1 py-0.5 rounded bg-board-ground text-ink-muted text-[10px]">
                              +{t.categories.length - 1}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-ink-muted mt-0.5 truncate">
                          {t.category}
                        </div>
                      </div>
                    )}
                    renderSecondary={(t) => (
                      <div className="text-right shrink-0">
                        <div className="font-mono font-semibold text-ink text-xs tabular-nums">
                          {formatPeso(t.amount)}
                        </div>
                        <span className="inline-block px-2 py-0.5 mt-0.5 rounded-full bg-board-ground text-ink-muted text-[10px] font-medium">
                          {plainStatus(t.errandStatus)}
                        </span>
                      </div>
                    )}
                    renderPreview={(t) => (
                      <div className="space-y-1.5 pt-1 text-ink-muted">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Rider</span>
                          <span className="font-medium text-ink">{t.riderName ?? "Not assigned"}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Customer</span>
                          <span className="text-ink">{t.customerName ?? "--"}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-ink-muted">Service fee</span>
                          <span className="font-mono font-medium text-ink tabular-nums">
                            {formatPeso(t.deliveryFee)} ({t.paymentMethod})
                          </span>
                        </div>
                      </div>
                    )}
                    inspectorTitle={(t) => formatErrandId(t.errandId)}
                    inspectorSubtitle={(t) => `${t.category} · ${t.paymentMethod}`}
                    inspectorStatusBadge={(t) => (
                      <span className="px-2.5 py-0.5 rounded-full bg-board-ground text-ink text-xs font-medium">
                        {plainStatus(t.errandStatus)}
                      </span>
                    )}
                    inspectorSections={(t) => [
                      {
                        title: "Order",
                        items: [
                          { label: "Order number", value: formatErrandId(t.errandId), copyable: true, copyValue: t.errandId },
                          { label: "Store type", value: t.categories.join(", ") },
                          { label: "Customer", value: t.customerName ?? "—" },
                          { label: "Rider", value: t.riderName ?? "Not assigned" },
                          { label: "Delivered to", value: t.deliveryAddress, fullWidth: true },
                        ],
                      },
                      {
                        title: "Payment",
                        items: [
                          { label: "Amount", value: formatPeso(t.amount) },
                          { label: "Service fee", value: formatPeso(t.deliveryFee) },
                          { label: "Paid by", value: t.paymentMethod },
                          {
                            label: "Payment reference",
                            value: t.paymentReferenceNo ?? "—",
                            copyable: !!t.paymentReferenceNo,
                            copyValue: t.paymentReferenceNo ?? "",
                          },
                          { label: "Proof from", value: <ProofFrom t={t} /> },
                        ],
                      },
                    ]}
                    searchPlaceholder="Search transactions..."
                    searchValue={tableSearch}
                    onSearchChange={setTableSearch}
                    filterDrawerTitle="Filter Transactions"
                    activeFilterCount={statusFilter !== "ALL" ? 1 : 0}
                    onResetFilters={() => setStatusFilter("ALL")}
                    filterDrawerContent={
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                            Order status
                          </label>
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:border-red-500 focus:outline-hidden"
                          >
                            <option value="ALL">All statuses</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="IN_TRANSIT">In transit</option>
                            <option value="ASSIGNED">Assigned</option>
                            <option value="PENDING">Pending</option>
                          </select>
                        </div>
                      </div>
                    }
                  />
                  <div className="md:hidden">
                    <TablePagination
                      currentPage={txPagination.currentPage}
                      totalPages={txPagination.totalPages}
                      totalItems={txPagination.totalItems}
                      startIndex={txPagination.startIndex}
                      endIndex={txPagination.endIndex}
                      onPageChange={txPagination.setCurrentPage}
                      itemName="transactions"
                    />
                  </div>
                </div>
                );
              })()}
            </>
          )}

          {/* No "About these numbers" block on this report (owner, 2026-10-27). */}
        </>
      )}

      {isFullScreen && data && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col p-4 sm:p-6 lg:p-8 animate-in fade-in duration-150"
        >
          <div className="flex-1 flex flex-col bg-board-plate border border-edge rounded-plate shadow-2xl overflow-hidden w-full max-w-[96vw] mx-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-edge flex items-center justify-between bg-board-plate">
              <div className="flex items-center gap-3">
                <h3 className="text-body font-semibold text-ink">Transaction Summary</h3>
                <span className="text-label px-2.5 py-0.5 rounded-full bg-board-ground text-ink font-medium">
                  {data.coverageLabel ?? data.rangeLabel}
                </span>
                <span className="text-label text-ink-muted">
                  {data.totals.count} transaction{data.totals.count === 1 ? "" : "s"} · {formatPeso(data.totals.amount)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-plate border border-edge text-label text-ink hover:bg-board-ground transition flex items-center gap-1.5"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullScreen(false)}
                  className="px-3 py-1.5 rounded-plate border border-edge bg-board-ground text-label text-ink hover:bg-board-ground/70 transition flex items-center gap-1.5"
                  title="Exit Full Screen (Esc)"
                >
                  <Minimize2 size={14} />
                  <span>Exit Full Screen</span>
                  <kbd className="font-mono text-[10px] text-ink-muted bg-board-plate px-1.5 py-0.5 rounded border border-edge">Esc</kbd>
                </button>
              </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-auto p-6 bg-board-plate">
              <TransactionTable transactions={txPagination.paginatedItems} />
            </div>

            {/* Footer with Pagination */}
            <div className="border-t border-edge bg-board-plate flex flex-col sm:flex-row items-center justify-between">
              <div className="flex-1 w-full">
                <TablePagination
                  currentPage={txPagination.currentPage}
                  totalPages={txPagination.totalPages}
                  totalItems={txPagination.totalItems}
                  startIndex={txPagination.startIndex}
                  endIndex={txPagination.endIndex}
                  onPageChange={txPagination.setCurrentPage}
                  itemName="transactions"
                  className="border-t-0"
                />
              </div>
              <div className="hidden lg:flex items-center gap-2 pr-6 text-label text-ink-muted shrink-0">
                <span>Press</span>
                <kbd className="font-mono text-xs bg-board-ground px-1.5 py-0.5 rounded border border-edge">Esc</kbd>
                <span>or click Exit to return</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
