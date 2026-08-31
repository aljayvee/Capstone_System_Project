import React from "react";
import { ShieldAlert, ArrowLeft, Layers, Lock, Check, Copy, SearchX, Info } from "lucide-react";
import { formatErrandId } from "../../../utils/formatErrandId";

interface UnauthorizedErrandScreenProps {
  errandId: string;
  variant?: "unauthorized" | "not_found";
  claimantName?: string;
  reason?: string;
  onReturnToQueue: () => void;
  onViewMyErrands?: () => void;
}

export const UnauthorizedErrandScreen: React.FC<UnauthorizedErrandScreenProps> = ({
  errandId,
  variant = "unauthorized",
  claimantName = "Another Dispatcher",
  reason,
  onReturnToQueue,
  onViewMyErrands,
}) => {
  const [copied, setCopied] = React.useState(false);
  const formattedId = formatErrandId(errandId);
  const isNotFound = variant === "not_found";

  const defaultReason = isNotFound
    ? "We couldn't find this order. It may have been removed, or the link may be incorrect."
    : "Another dispatcher is currently handling this order.";

  const displayReason = reason || defaultReason;

  const handleCopyId = () => {
    navigator.clipboard.writeText(errandId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6 text-center animate-scale-up">
        {/* TOP SECURITY / STATUS BADGE */}
        <div className="flex justify-center">
          <div className="relative">
            {isNotFound ? (
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner ring-8 ring-amber-50/60">
                <SearchX size={32} strokeWidth={2.2} />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-inner ring-8 ring-rose-50/60">
                <ShieldAlert size={32} strokeWidth={2.2} />
              </div>
            )}
            {!isNotFound && (
              <span className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-white rounded-full shadow-xs">
                <Lock size={12} strokeWidth={3} />
              </span>
            )}
          </div>
        </div>

        {/* HEADER TEXT */}
        <div className="space-y-1.5">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {isNotFound ? "Order not found" : "Already being handled"}
          </h3>
          <p
            className={`text-xs font-semibold ${
              isNotFound ? "text-amber-600" : "text-rose-600"
            }`}
          >
            {isNotFound
              ? "This link doesn't match any order"
              : "Only the assigned dispatcher can open this"}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto pt-1 leading-relaxed">
            {displayReason}
          </p>
        </div>

        {/* TRANSACTION METADATA CARD */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Order:
            </span>
            <button
              onClick={handleCopyId}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-dispatcher-navy bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-400 transition"
              title="Copy order ID"
              aria-label={copied ? "Order ID copied" : `Copy order ID ${formattedId}`}
            >
              #{formattedId}
              {copied ? (
                <Check size={12} className="text-emerald-600" />
              ) : (
                <Copy size={12} className="text-slate-400" />
              )}
            </button>
          </div>

          {!isNotFound && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Assigned Dispatcher:
              </span>
              <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                <ShieldAlert size={12} />
                <span>{claimantName}</span>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200/60">
            <p className="text-[11px] text-slate-500 leading-normal flex items-start gap-1.5">
              <Info size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <span>
                {isNotFound
                  ? "Check the link from the customer chat, or return to the queue to pick an active order."
                  : "This keeps two dispatchers from editing the same order at once."}
              </span>
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={onReturnToQueue}
            className="w-full sm:flex-1 bg-dispatcher-navy hover:bg-dispatcher-navy-dark text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <ArrowLeft size={15} /> Return to Queue
          </button>

          {onViewMyErrands && (
            <button
              onClick={onViewMyErrands}
              className="w-full sm:flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-300 flex items-center justify-center gap-2 shadow-2xs transition"
            >
              <Layers size={15} /> My Active Errands
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
