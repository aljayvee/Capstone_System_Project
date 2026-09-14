import React from "react";
import { Errand } from "../../../../types/errand";
import { formatErrandId } from "../../../../utils/formatErrandId";
import { formatPeso } from "../../../../utils/format";
import {
  Clock,
  Store,
  MapPin,
  ShoppingBag,
  Bike,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface DispatchErrandCardProps {
  errand: Errand;
  isSelected: boolean;
  onClick: () => void;
}

function getRelativeTime(createdAtString: string): { label: string; isUrgent: boolean } {
  if (!createdAtString) return { label: "Just now", isUrgent: false };
  const created = new Date(createdAtString).getTime();
  const now = Date.now();
  const diffMinutes = Math.floor((now - created) / 60000);

  if (diffMinutes < 1) return { label: "Just now", isUrgent: false };
  if (diffMinutes < 60) {
    return {
      label: `${diffMinutes}m ago`,
      isUrgent: diffMinutes >= 5,
    };
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return {
      label: `${diffHours}h ago`,
      isUrgent: true,
    };
  }
  return { label: "1d+ ago", isUrgent: true };
}

export const DispatchErrandCard: React.FC<DispatchErrandCardProps> = ({
  errand,
  isSelected,
  onClick,
}) => {
  const isAvailable = String(errand.status).toUpperCase() === "AVAILABLE";
  const { label: timeLabel, isUrgent } = getRelativeTime(errand.createdAt);

  // Store name resolution
  const primaryStoreName =
    errand.pinpoints?.[0]?.storeName ||
    errand.pabiliDetails?.[0]?.storeCategory ||
    errand.category ||
    "Custom Store";

  const itemCount =
    errand.pabiliDetails?.length ||
    errand.pabiliItemRequests?.length ||
    0;

  const totalDisplay = errand.totalCost || (Number(errand.estimatedCost || 0) + Number(errand.deliveryFee || 0));

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none text-left ${
        isSelected
          ? "bg-blue-50/80 border-blue-500/50 shadow-xs ring-2 ring-blue-500/20"
          : "bg-white hover:bg-slate-50/80 border-slate-200/80 shadow-2xs hover:shadow-xs"
      }`}
    >
      {/* 1. Header Row: Store Name & Urgency Timer */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              isSelected
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors"
            }`}
          >
            <Store size={14} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-900 truncate tracking-tight">
              {primaryStoreName}
            </h4>
            <span className="text-[10px] font-mono font-semibold text-slate-500">
              {formatErrandId(errand.id)}
            </span>
          </div>
        </div>

        {/* Time Elapsed Pill */}
        <span
          className={`shrink-0 flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
            isAvailable && isUrgent
              ? "bg-amber-50 text-amber-700 border-amber-300 animate-pulse"
              : isSelected
              ? "bg-blue-100/70 text-blue-800 border-blue-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}
        >
          <Clock size={10} />
          <span>{timeLabel}</span>
        </span>
      </div>

      {/* 2. Middle Row: Customer Name & Items Preview */}
      <div className="flex items-center justify-between text-xs text-slate-600 my-1.5">
        <span className="font-semibold text-slate-700 truncate mr-2">
          {errand.customerName || "Customer"}
        </span>
        <span className="shrink-0 text-slate-500 font-medium text-[11px]">
          {itemCount > 0 ? `${itemCount} item${itemCount > 1 ? "s" : ""}` : "General Errand"} •{" "}
          <strong className="text-slate-900 font-extrabold font-mono">
            {formatPeso(totalDisplay)}
          </strong>
        </span>
      </div>

      {/* 3. Bottom Row: Route Snapshot & Status Capsule */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
        <div className="flex items-center gap-1 text-slate-500 truncate">
          <MapPin size={11} className="shrink-0 text-slate-400" />
          <span className="truncate max-w-[170px]">
            {errand.deliveryAddress || "Tacurong City"}
          </span>
        </div>

        {/* Status Indicator */}
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
            isAvailable
              ? "bg-amber-100 text-amber-800"
              : String(errand.status).toUpperCase() === "IN_TRANSIT" || String(errand.status).toUpperCase() === "IN ROUTE"
              ? "bg-blue-100 text-blue-800"
              : String(errand.status).toUpperCase() === "DELIVERED"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {isAvailable ? "Ready to Claim" : String(errand.status)}
        </span>
      </div>
    </div>
  );
};
