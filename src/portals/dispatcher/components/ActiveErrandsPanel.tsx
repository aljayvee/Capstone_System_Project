import React, { useState } from "react";
import { Errand } from "../../../types/errand";
import { formatErrandId } from "../../../utils/formatErrandId";
import { summarizeEta } from "../../../utils/eta";
import {
  MapPin,
  Search,
  CheckCircle2,
  Phone,
  Bike,
  Clock,
  MessageSquare,
  Copy,
  Check,
  ShoppingBag,
  Store,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";

interface ActiveErrandsPanelProps {
  errands: Errand[];
  onOpenChat: (orderId: string) => void;
}

// 5 Milestone Progress Steps as shown in design reference
const TRACKING_STEPS = [
  { step: 1, label: "Assigned", key: "Assigned" },
  { step: 2, label: "Traveling", key: "Traveling" },
  { step: 3, label: "At Store", key: "At Store" },
  { step: 4, label: "Purchased", key: "Purchased" },
  { step: 5, label: "En Route", key: "In Route" },
];

function getActiveStepIndex(status: string): number {
  const s = String(status || "").toUpperCase();
  if (s === "ASSIGNED" || s === "ACCEPTED" || s === "PENDING") return 1;
  if (s === "TRAVELING") return 2;
  if (s === "AT STORE") return 3;
  if (s === "PURCHASED") return 4;
  if (s === "IN ROUTE" || s === "EN ROUTE" || s === "DOING ERRAND") return 5;
  if (s === "DELIVERED" || s === "COMPLETED") return 6;
  return 1;
}

export const ActiveErrandsPanel: React.FC<ActiveErrandsPanelProps> = ({
  errands,
  onOpenChat,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active errands that have progressed beyond initial AVAILABLE status and are not cancelled/completed/delivered
  const activeErrands = errands.filter((e) => {
    const s = String(e.status || "").toUpperCase();
    return (
      s !== "AVAILABLE" &&
      s !== "CANCELLED" &&
      s !== "COMPLETED" &&
      s !== "DELIVERED" &&
      s !== "PASSING BY"
    );
  });

  const filteredErrands = activeErrands.filter((e) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      String(e.id).toLowerCase().includes(query) ||
      String(e.customerName || "").toLowerCase().includes(query) ||
      String(e.customerPhone || "").toLowerCase().includes(query) ||
      String(e.riderName || "").toLowerCase().includes(query) ||
      String(e.category || "").toLowerCase().includes(query) ||
      String(e.deliveryAddress || "").toLowerCase().includes(query) ||
      String(e.description || "").toLowerCase().includes(query);

    const s = String(e.status || "").toUpperCase();
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ASSIGNED" && (s === "ASSIGNED" || s === "ACCEPTED" || s === "PENDING")) ||
      (statusFilter === "STORE" && (s === "TRAVELING" || s === "AT STORE" || s === "PURCHASED")) ||
      (statusFilter === "EN_ROUTE" && (s === "IN ROUTE" || s === "EN ROUTE" || s === "DOING ERRAND"));

    return matchesSearch && matchesStatus;
  });

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(formatErrandId(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* ─── 1. ACTIVE HEADER & FILTER BAR ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Bike size={18} />
            </span>
            <h3 className="text-base font-extrabold text-slate-800">
              Active Errands Live Mission Control
            </h3>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search active order, customer, rider, or stop..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 font-medium outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { label: "All Active", key: "ALL", count: activeErrands.length },
          {
            label: "🛵 Pending / Assigned",
            key: "ASSIGNED",
            count: activeErrands.filter((e) => {
              const s = String(e.status).toUpperCase();
              return s === "ASSIGNED" || s === "ACCEPTED" || s === "PENDING";
            }).length,
          },
          {
            label: "🏪 Purchasing at Store",
            key: "STORE",
            count: activeErrands.filter((e) => {
              const s = String(e.status).toUpperCase();
              return s === "TRAVELING" || s === "AT STORE" || s === "PURCHASED";
            }).length,
          },
          {
            label: "🚀 Out for Delivery",
            key: "EN_ROUTE",
            count: activeErrands.filter((e) => {
              const s = String(e.status).toUpperCase();
              return s === "IN ROUTE" || s === "EN ROUTE" || s === "DOING ERRAND";
            }).length,
          },
        ].map((tab) => {
          const isSelected = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? "bg-[#1E3A5F] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── 2. ACTIVE ERRANDS CARD LIST ───────────────────────────────────── */}
      <div className="space-y-4">
        {filteredErrands.map((e) => {
          const currentStep = getActiveStepIndex(e.status);
          const feeAmount = e.deliveryFee ? `₱${Math.round(e.deliveryFee)}` : "₱85";
          const eta = summarizeEta(e.etaLowAt, e.etaHighAt);

          const items = (e.pabiliDetails && e.pabiliDetails.length > 0)
            ? e.pabiliDetails
            : (e.pabiliItemRequests && e.pabiliItemRequests.length > 0)
            ? e.pabiliItemRequests
            : [];

          return (
            <div
              key={e.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-5"
            >
              {/* Top Row: Errand ID, Badges, Customer & Rider Details, Fee */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  {/* ID + Category + Status Pills */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-[#1E3A5F] text-sm tracking-tight flex items-center gap-1">
                      {formatErrandId(e.id)}
                      <button
                        type="button"
                        onClick={() => handleCopyId(e.id)}
                        className="text-slate-400 hover:text-blue-600 transition"
                        title="Copy Errand ID"
                      >
                        {copiedId === e.id ? (
                          <Check size={12} className="text-emerald-500" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </span>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {e.category || "Pabili"}
                    </span>
                    <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      {e.status}
                    </span>
                    {eta && (
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                          eta.isLate
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <Clock size={11} /> {eta.label}
                      </span>
                    )}
                  </div>

                  {/* Customer & Rider Info */}
                  <div className="text-xs text-slate-600 flex items-center gap-2.5 flex-wrap font-medium pt-0.5">
                    <span className="font-extrabold text-slate-900">{e.customerName || "Customer"}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                      <Phone size={11} /> {e.customerPhone || "09123456789"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-700 flex items-center gap-1">
                      <Bike size={13} className="text-emerald-600" />
                      Rider:{" "}
                      <strong className="font-extrabold text-slate-900">
                        {e.riderName || "Pending Assignment"}
                      </strong>
                    </span>
                  </div>

                  {/* Pickup / Delivery Address */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                    <MapPin size={13} className="text-rose-500 shrink-0" />
                    <span className="truncate">
                      {e.deliveryAddress || "Tacurong City"}
                      {e.description ? ` — "${e.description}"` : ""}
                    </span>
                  </div>

                  {/* Requested Items Pill Snapshot */}
                  {items.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 max-w-xl">
                      <ShoppingBag size={13} className="text-[#1E3A5F] shrink-0" />
                      <span className="font-extrabold text-slate-800 shrink-0">
                        Items ({items.length}):
                      </span>
                      <span className="truncate text-slate-600">
                        {items.map((it) => `${it.itemName}${it.quantity ? ` (×${it.quantity})` : ""}`).join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Side: Fee & Cockpit Action Button */}
                <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-600 font-mono">
                      Fee: {feeAmount}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {e.riderName ? "Rider Dispatched" : "Pending Selection"}
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenChat(e.id)}
                    className="flex items-center gap-1.5 text-xs bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-extrabold px-4 py-2 rounded-xl shadow-sm hover:shadow transition mt-1 cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    <span>Open Chat</span>
                    <ChevronRight size={13} className="opacity-70" />
                  </button>
                </div>
              </div>

              {/* Middle Section: 5-Step Goal Gradient Milestone Tracker */}
              <div className="py-2.5 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <div className="relative flex items-center justify-between w-full">
                  {/* Background Track Line */}
                  <div className="absolute top-3.5 left-6 right-6 h-0.5 bg-slate-200 z-0" />

                  {/* Active Progress Line with Gradient */}
                  <div
                    className="absolute top-3.5 left-6 h-0.5 bg-gradient-to-r from-blue-600 to-emerald-600 transition-all duration-500 z-0"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((currentStep - 1) / (TRACKING_STEPS.length - 1)) * 100))}%`,
                    }}
                  />

                  {/* Step Nodes */}
                  {TRACKING_STEPS.map((s) => {
                    const isCompleted = currentStep > s.step;
                    const isCurrent = currentStep === s.step;

                    return (
                      <div key={s.step} className="flex flex-col items-center z-10 space-y-1.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                            isCurrent
                              ? "bg-[#1E3A5F] text-white ring-4 ring-blue-100 shadow-md scale-110"
                              : isCompleted
                              ? "bg-emerald-600 text-white"
                              : "bg-white border-2 border-slate-300 text-slate-400"
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 size={14} /> : s.step}
                        </div>
                        <span
                          className={`text-[11px] font-bold transition-all ${
                            isCurrent
                              ? "text-[#1E3A5F]"
                              : isCompleted
                              ? "text-slate-800"
                              : "text-slate-400 font-medium"
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Footer: GPS Status & Signal */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-slate-700">GPS Signal Live</span>
                  <span className="text-slate-300">•</span>
                  <span>Dispatcher: <strong className="text-slate-800">{e.dispatcherName || "You"}</strong></span>
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  Last Updated: {new Date(e.updatedAt || e.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}

        {filteredErrands.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Bike size={24} />
            </div>
            <h4 className="text-sm font-extrabold text-slate-800">No Active Errands In Progress</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {activeErrands.length === 0
                ? "Accepted and ongoing delivery errands will appear here with live milestone tracking."
                : "No active errands match your search query."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
