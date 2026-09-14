import React, { useState } from "react";
import { Errand, ErrandStatus } from "../../../../types/errand";
import { formatErrandId } from "../../../../utils/formatErrandId";
import { formatPeso } from "../../../../utils/format";
import {
  CheckCircle2,
  Copy,
  Check,
  Phone,
  Store,
  MapPin,
  ShoppingBag,
  Clock,
  ArrowRight,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";

interface DispatchDetailInspectorProps {
  errand: Errand | null;
  currentUser: any;
  onClaimAndReview: (errand: Errand) => void;
  onDecline?: (orderId: string, reason?: string) => void;
  onOpenChat: (orderId: string) => void;
  onUpdateStatus: (errandId: string, newStatus: ErrandStatus) => void;
  isClaiming: boolean;
  claimError: string | null;
  onDismissClaimError: () => void;
}

export const DispatchDetailInspector: React.FC<DispatchDetailInspectorProps> = ({
  errand,
  currentUser,
  onClaimAndReview,
  onDecline,
  onOpenChat,
  onUpdateStatus,
  isClaiming,
  claimError,
  onDismissClaimError,
}) => {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "CHAT">("OVERVIEW");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [declineReason, setDeclineReason] = useState("Out of service range / unavailable rider");

  if (!errand) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[480px] bg-white border border-slate-200/90 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-4 shadow-2xs">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
          All Caught Up
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
          No errand currently selected. Choose an errand from the list on the left to inspect itemized requests, store pickup, customer destination, and dispatch actions.
        </p>
      </div>
    );
  }

  const isAvailable = String(errand.status).toUpperCase() === "AVAILABLE";
  const items = errand.pabiliDetails || errand.pabiliItemRequests || [];
  const primaryStore =
    errand.pinpoints?.[0]?.storeName ||
    items[0]?.storeCategory ||
    errand.category ||
    "Store";

  const totalDisplay =
    errand.totalCost ||
    Number(errand.estimatedCost || 0) + Number(errand.deliveryFee || 0);

  // The mode the customer actually confirmed, where they have. Null before the
  // choice is made, which the fee note says plainly rather than assuming COD.
  const paymentModeName: string | null =
    (errand as any).paymentSelection?.paymentMode?.name ?? null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(formatErrandId(errand.id));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyPhone = () => {
    if (!errand.customerPhone) return;
    navigator.clipboard.writeText(errand.customerPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-left relative">
      {/* Inline Conflict / Claim Error Alert */}
      {claimError && (
        <div
          role="alert"
          className="m-3 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-2 shadow-xs shrink-0"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <span className="font-medium">{claimError}</span>
          </div>
          <button
            type="button"
            onClick={onDismissClaimError}
            className="text-amber-700 hover:text-amber-900 font-bold text-xs shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP INSPECTOR HEADER: Order ID, Status & Customer Contact   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-white/90 backdrop-blur-xs shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Errand ID + Copy Badge */}
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-mono">
              {formatErrandId(errand.id)}
            </h3>
            <button
              type="button"
              onClick={handleCopyId}
              title="Copy Errand ID"
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
            >
              {copiedId ? (
                <Check size={14} className="text-emerald-600" />
              ) : (
                <Copy size={14} />
              )}
            </button>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {errand.category || "Pabili"}
            </span>
          </div>

          {/* Right: Status Capsule */}
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isAvailable
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : String(errand.status).toUpperCase() === "IN_TRANSIT"
                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              {isAvailable ? "Awaiting Claim" : String(errand.status)}
            </span>
          </div>
        </div>

        {/* Customer & Store Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-700 shrink-0">
              {(errand.customerName || "C").charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-slate-800 truncate">
              {errand.customerName || "Customer"}
            </span>
            {errand.customerPhone && (
              <button
                type="button"
                onClick={handleCopyPhone}
                className="text-[11px] font-mono text-blue-600 hover:underline flex items-center gap-1"
                title="Copy phone"
              >
                <Phone size={10} />
                <span>{errand.customerPhone}</span>
                {copiedPhone && <Check size={10} className="text-emerald-600" />}
              </button>
            )}
          </div>

          <div className="flex items-center sm:justify-end gap-1.5 text-slate-500">
            <Store size={13} className="text-slate-400" />
            <span className="font-semibold text-slate-700 truncate">{primaryStore}</span>
          </div>
        </div>

        {/* Apple Segmented Inspector Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl w-full sm:w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === "OVERVIEW"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Order Overview & Items
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CHAT")}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "CHAT"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquare size={13} />
            <span>Live Customer Chat</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SCROLLABLE TAB CONTENT BODY                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 pb-24">
        {activeTab === "OVERVIEW" ? (
          <>
            {/* 1. Itemized Shopping Checklist */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={15} className="text-blue-600" />
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Requested Items ({items.length})
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-500 font-semibold">
                  Est. Subtotal: {formatPeso(errand.estimatedCost || 0)}
                </span>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No individual items listed. General errand requested:{" "}
                  <span className="text-slate-600 font-medium">
                    "{errand.description || "General errand"}"
                  </span>
                </p>
              ) : (
                <div className="space-y-2 divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="w-4 h-4 rounded bg-white border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {item.itemName}
                          </p>
                          {item.notes && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-800">
                          {formatPeso(item.estimatedSubtotal || (Number(item.unitPrice || 0) * Number(item.quantity || 1)))}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Qty: {item.quantity || 1} {item.unitPrice ? `@ ${formatPeso(item.unitPrice)}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Route & Location Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pickup Location */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                  <Store size={14} className="text-amber-600" />
                  <span>Pickup Location</span>
                </div>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {primaryStore}
                </p>
                <p className="text-[11px] text-slate-500 line-clamp-2">
                  {errand.pickupAddress || "Verified Tacurong Store"}
                </p>
              </div>

              {/* Delivery Destination */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                  <MapPin size={14} className="text-blue-600" />
                  <span>Delivery Destination</span>
                </div>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {errand.customerName}
                </p>
                <p className="text-[11px] text-slate-500 line-clamp-2">
                  {errand.deliveryAddress || "Tacurong City"}
                </p>
              </div>
            </div>

            {/* 3. Transparent Fee Breakdown */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                Cost & Fee Computation
              </h4>
              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className="flex justify-between">
                  <span>Item Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatPeso(errand.estimatedCost || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Base Delivery Fee:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatPeso(errand.deliveryFee || 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Estimated Total Amount:</span>
                  <span className="font-mono font-black text-sm text-blue-700">
                    {formatPeso(totalDisplay)}
                  </span>
                </div>
                {/* The payment mode, not an assumption about it. This line
                    read "Customer pays via Cash on Delivery (COD)" on every
                    errand — including one the customer had explicitly put on the
                    50% downpayment plan, where half the money has already
                    arrived and the rider collects only the balance. */}
                <p className="text-[10px] text-slate-400 pt-1">
                  *Delivery fee realized upon completion.{" "}
                  {paymentModeName
                    ? `Customer pays via ${paymentModeName}.`
                    : "Payment mode not chosen yet."}
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Live Customer Chat Tab */
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto">
              <MessageSquare size={22} />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-800">
                Customer Live Conversation
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Communicate directly with {errand.customerName || "the customer"} to confirm item availability, adjust substitute brands, and guide the 5 dispatch stages.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenChat(errand.id)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition cursor-pointer"
            >
              <span>Launch Multi-Stage Dispatch Console</span>
              <ExternalLink size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. FLOATING ACTION FOOTER (Sticky Bottom)                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex items-center justify-between gap-3 shadow-lg">
        {isAvailable ? (
          <>
            <button
              type="button"
              disabled={isClaiming}
              onClick={() => onClaimAndReview(errand)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm hover:shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClaiming ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Claiming Request...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Check the Order & Start Review ➔</span>
                </>
              )}
            </button>

            {onDecline && (
              <button
                type="button"
                onClick={() => setShowDeclineConfirm(true)}
                className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs font-bold transition cursor-pointer"
              >
                Decline
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => onOpenChat(errand.id)}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#1E3A5F] hover:bg-[#162D4A] text-white text-xs font-black rounded-xl shadow-sm transition cursor-pointer"
          >
            <span>Open Multi-Stage Dispatch Console</span>
            <ChevronRight size={15} />
          </button>
        )}
      </div>

      {/* Quick Decline Confirmation Dialog */}
      {showDeclineConfirm && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600" />
                Decline Request
              </h4>
              <button
                type="button"
                onClick={() => setShowDeclineConfirm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Are you sure you want to decline this request from {errand.customerName}?
            </p>
            <input
              type="text"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason for declining..."
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeclineConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeclineConfirm(false);
                  if (onDecline) onDecline(errand.id, declineReason);
                }}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
