import React, { useState, useEffect } from "react";
import { Errand } from "../../../types/errand";
import { formatErrandId } from "../../../utils/formatErrandId";
import { apiClient } from "../../../services/apiClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatPeso } from "../../../utils/format";
import {
  ShoppingBag,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Store,
  FileText,
  DollarSign,
  ArrowRight,
  Package,
} from "lucide-react";

interface ReviewErrandModalProps {
  errand: Errand | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (errandId: string) => void;
  onDecline: (errandId: string, reason?: string) => void;
  currentUser?: any;
}

const DECLINE_REASONS = [
  "Stores currently closed or unavailable",
  "Delivery destination outside service area",
  "Requested items cannot be procured / out of stock",
  "Customer duplicate / accidental request",
  "Unable to assign rider at this time",
  "Other operational reason",
];

export const ReviewErrandModal: React.FC<ReviewErrandModalProps> = ({
  errand,
  isOpen,
  onClose,
  onAccept,
  onDecline,
  currentUser,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [selectedDeclineReason, setSelectedDeclineReason] = useState(DECLINE_REASONS[0]);
  const [customDeclineReason, setCustomDeclineReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateConfig, setRateConfig] = useState<any>(null);

  useEffect(() => {
    async function loadRateConfig() {
      try {
        const res = await apiClient.get("/rate-config");
        if (res.data) setRateConfig(res.data);
      } catch (err) {
        console.warn("Failed to load rate config in review modal:", err);
      }
    }
    loadRateConfig();
  }, []);

  if (!errand) return null;

  // Extract items established by the customer
  const items = (errand.pabiliDetails && errand.pabiliDetails.length > 0)
    ? errand.pabiliDetails
    : (errand.pabiliItemRequests && errand.pabiliItemRequests.length > 0)
    ? errand.pabiliItemRequests
    : [];

  const handleCopy = (text: string, type: "phone" | "id") => {
    navigator.clipboard.writeText(text);
    if (type === "phone") {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleAcceptClick = async () => {
    setIsSubmitting(true);
    try {
      await onAccept(errand.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDecline = async () => {
    setIsSubmitting(true);
    const finalReason =
      selectedDeclineReason === "Other operational reason" && customDeclineReason.trim()
        ? customDeclineReason.trim()
        : selectedDeclineReason;

    try {
      await onDecline(errand.id, finalReason);
      setShowDeclineConfirm(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute time waiting
  const createdAtDate = errand.createdAt ? new Date(errand.createdAt) : new Date();
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - createdAtDate.getTime()) / 60000));
  const waitingLabel =
    elapsedMinutes < 1 ? "Just now" : `${elapsedMinutes}m ago in queue`;

  const totalItemsCount = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

  // The fee to preview before this errand has been priced: the errand's own
  // delivery fee once it has one, otherwise the owner's configured base fare.
  // Deliberately no literal fallback — if the rate config has not loaded we do
  // not know the base fare, and showing an invented one is worse than showing
  // nothing. Both figures below render "—" until it arrives.
  const previewFee: number | null =
    Number(errand.deliveryFee) || (rateConfig ? Number(rateConfig.baseFee) : null);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[#F8FAFC] border-slate-200 shadow-2xl rounded-2xl">
        {/* ─── 1. MODAL HEADER WITH AMBER REVIEW BANNER ─────────────────── */}
        <div className="bg-[#162D4A] text-white p-5 sm:p-6 border-b border-white/10 relative shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                  Reviewing Request
                </span>
                <span className="bg-white/10 text-white/90 text-xs font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  {formatErrandId(errand.id)}
                  <button
                    onClick={() => handleCopy(formatErrandId(errand.id), "id")}
                    className="hover:text-blue-300 transition"
                    title="Copy Errand ID"
                  >
                    {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </span>
                <span className="text-xs text-blue-200/80 font-medium flex items-center gap-1">
                  <Clock size={13} /> {waitingLabel}
                </span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 pt-1">
                <span>{errand.category || "Pabili"} Errand Inspection</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-blue-200/70 font-normal">
                Carefully review the customer's shopping checklist, delivery pinpoint, and instructions before accepting or declining this order.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* ─── 2. SCROLLABLE INSPECTION CONTENT BODY ───────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* A. Customer & Destination Profile Card */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-black text-sm flex items-center justify-center border border-blue-200 shrink-0">
                  {(errand.customerName || "C")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">
                    {errand.customerName || "Customer"}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <Phone size={12} className="text-slate-400" />
                    <span className="font-mono">{errand.customerPhone || "09123456789"}</span>
                    <button
                      onClick={() => handleCopy(errand.customerPhone || "09123456789", "phone")}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-0.5 ml-1"
                    >
                      {copiedPhone ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                          <Check size={11} /> Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <Copy size={11} /> Copy
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Category</span>
                <span className="text-xs font-black text-[#1E3A5F] bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 inline-block mt-0.5">
                  {errand.category || "Pabili Request"}
                </span>
              </div>
            </div>

            {/* Delivery Destination */}
            <div className="flex items-start gap-2.5 text-xs bg-slate-50/80 p-3 rounded-lg border border-slate-200/70">
              <MapPin size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-extrabold text-slate-800">Deliver To:</p>
                <p className="text-slate-600 mt-0.5 break-words">
                  {errand.deliveryAddress || "Tacurong City Center"}
                </p>
                {errand.pickupAddress && errand.pickupAddress !== "Store" && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    <strong className="text-slate-700">Pickup:</strong> {errand.pickupAddress}
                  </p>
                )}
              </div>
            </div>

            {/* Customer Special Notes / Instructions if any */}
            {errand.description && (
              <div className="flex items-start gap-2.5 text-xs bg-amber-50/80 p-3 rounded-lg border border-amber-200/80 text-amber-900">
                <FileText size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-extrabold block text-amber-950">Customer Instructions & Notes:</strong>
                  <p className="mt-0.5 text-amber-900 leading-relaxed italic">
                    "{errand.description}"
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* B. ITEM DETAIL CHECKLIST (Core Review Item) */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <ShoppingBag size={15} className="text-[#1E3A5F]" />
                <span>Customer Requested Items</span>
              </h4>
              <span className="text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
                {items.length > 0 ? `${items.length} Unique Items (${totalItemsCount} Total Units)` : "General Errand Description"}
              </span>
            </div>

            {items.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="py-3 flex items-start justify-between gap-3 group hover:bg-slate-50/60 rounded-lg px-2 transition -mx-2"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 leading-tight">
                          {item.itemName}
                        </p>
                        {item.storeCategory && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Store size={11} className="text-slate-400" />
                            <span className="truncate">{item.storeCategory}</span>
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block bg-[#1E3A5F] text-white font-mono font-bold text-xs px-2 py-0.5 rounded-md">
                        × {item.quantity || 1}
                      </span>
                      {item.estimatedSubtotal ? (
                        <p className="text-[11px] font-mono text-slate-500 mt-1">
                          ~{formatPeso(Number(item.estimatedSubtotal))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-center space-y-1.5">
                <Package size={24} className="text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Custom Errand Request</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {errand.description || "The customer placed an errand request without a split item checklist. Please review instructions above and coordinate specific items in chat."}
                </p>
              </div>
            )}
          </div>

          {/* C. FINANCIAL BREAKDOWN & COD SUMMARY */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-xs space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <DollarSign size={15} className="text-emerald-600" />
              <span>Financial & COD Rate Estimation</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Est. Items Cost</span>
                <p className="text-sm font-black text-slate-800 font-mono mt-0.5">
                  {formatPeso(Number(errand.estimatedCost || 0))}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Base Delivery Fee</span>
                <p className="text-sm font-black text-slate-800 font-mono mt-0.5">
                  {previewFee === null ? "—" : formatPeso(previewFee)}
                </p>
              </div>

              <div className="bg-emerald-50/80 p-3 rounded-lg border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Est. Grand Total</span>
                <p className="text-sm font-black text-emerald-800 font-mono mt-0.5">
                  {Number(errand.totalCost)
                    ? formatPeso(Number(errand.totalCost))
                    : previewFee === null
                      ? "—"
                      : formatPeso(Number(errand.estimatedCost || 0) + previewFee)}
                </p>
              </div>
            </div>
          </div>

          {/* D. DECLINE CONFIRMATION SUB-FORM (If user taps Decline) */}
          {showDeclineConfirm && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4.5 space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-2 text-rose-900 font-extrabold text-xs">
                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span>Decline & Cancel Errand Confirmation</span>
              </div>
              <p className="text-xs text-rose-700">
                Declining this request will cancel the order in the system and immediately notify the customer. Please specify a reason:
              </p>

              <div className="space-y-2">
                <select
                  value={selectedDeclineReason}
                  onChange={(e) => setSelectedDeclineReason(e.target.value)}
                  className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {DECLINE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                {selectedDeclineReason === "Other operational reason" && (
                  <input
                    type="text"
                    value={customDeclineReason}
                    onChange={(e) => setCustomDeclineReason(e.target.value)}
                    placeholder="Enter specific decline reason..."
                    className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeclineConfirm(false)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecline}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1.5"
                >
                  <XCircle size={13} />
                  <span>{isSubmitting ? "Cancelling..." : "Confirm Decline & Notify Customer"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── 3. ACTION FOOTER (UX PSYCHOLOGY CONTRAST & DECISION CONTROL) ─── */}
        <div className="bg-white border-t border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* 1. Pass / Close (Leaves order available for other dispatchers) */}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
            >
              Pass (Keep in Queue)
            </button>

            {/* 2. Decline Request Button */}
            {!showDeclineConfirm && (
              <button
                type="button"
                onClick={() => setShowDeclineConfirm(true)}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle size={14} />
                <span>Decline Request</span>
              </button>
            )}
          </div>

          {/* 3. Primary Accept CTA (Dominant visual weight & clear action) */}
          <button
            type="button"
            onClick={handleAcceptClick}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-md shadow-emerald-700/20 hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{isSubmitting ? "Accepting & Loading..." : "Accept & Start Dispatch"}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
