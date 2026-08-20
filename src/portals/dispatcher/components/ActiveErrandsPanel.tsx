import React, { useState } from "react";
import { Errand } from "../../../types/errand";
import { formatErrandId } from "../../../utils/formatErrandId";
import { MapPin, Search, CheckCircle2, Phone, User, Bike, Clock, ArrowRight, MessageSquare } from "lucide-react";

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

export const ActiveErrandsPanel: React.FC<ActiveErrandsPanelProps> = ({ errands, onOpenChat }) => {
  const [search, setSearch] = useState("");

  // Active errands that have progressed beyond initial AVAILABLE status and are not cancelled/completed/delivered
  const activeErrands = errands.filter((e) => {
    const s = String(e.status || "").toUpperCase();
    return s !== "AVAILABLE" && s !== "CANCELLED" && s !== "COMPLETED" && s !== "DELIVERED" && s !== "PASSING BY";
  });

  const filteredErrands = activeErrands.filter((e) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      String(e.id).toLowerCase().includes(query) ||
      String(e.customerName || "").toLowerCase().includes(query) ||
      String(e.riderName || "").toLowerCase().includes(query) ||
      String(e.category || "").toLowerCase().includes(query) ||
      String(e.deliveryAddress || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Bike size={18} className="text-[#1E3A5F]" />
            <span>Active Errands Live Progress</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-step lifecycle progress of all ongoing deliveries in Tacurong City.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search active errand, rider, or address..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 font-medium outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Active Errands Card List */}
      <div className="space-y-4">
        {filteredErrands.map((e) => {
          const currentStep = getActiveStepIndex(e.status);
          const feeAmount = e.deliveryFee ? `₱${Math.round(e.deliveryFee)}` : "₱85";

          return (
            <div
              key={e.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all space-y-6"
            >
              {/* Top Row: Errand ID, Badges, Customer & Rider Details, Fee */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  {/* ID + Category + Status Pills */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-slate-900 text-sm tracking-tight">
                      {formatErrandId(e.id)}
                    </span>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {e.category || "Pabili"}
                    </span>
                    <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                      {e.status}
                    </span>
                  </div>

                  {/* Customer & Rider Info */}
                  <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap font-medium pt-0.5">
                    <span className="font-extrabold text-slate-900">{e.customerName || "Customer"}</span>
                    <span className="text-slate-300">—</span>
                    <span className="text-slate-500 font-mono text-[11px]">{e.customerPhone || "09501234567"}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-700">
                      Rider: <strong className="font-extrabold text-slate-900">{e.riderName || "Pending Assignment"}</strong>
                    </span>
                  </div>

                  {/* Pickup / Delivery Address */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">
                      {e.pickupAddress || e.deliveryAddress || "Maharlika Highway, Brgy Calean — Tacurong City"}
                      {e.description ? ` — ${e.description}` : ""}
                    </span>
                  </div>
                </div>

                {/* Right Side: Fee & Status */}
                <div className="flex md:flex-col items-center md:items-end justify-between gap-1 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-600 font-mono">
                      Fee: {feeAmount}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {e.riderName ? "Rider Dispatched" : "Pending Selection"}
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenChat(e.id)}
                    className="flex items-center gap-1.5 text-xs bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition mt-2"
                  >
                    <MessageSquare size={13} />
                    <span>Open Chat</span>
                  </button>
                </div>
              </div>

              {/* Middle Section: 5-Step Horizontal Milestone Tracker */}
              <div className="py-2">
                <div className="relative flex items-center justify-between w-full">
                  {/* Background Track Line */}
                  <div className="absolute top-3.5 left-6 right-6 h-0.5 bg-slate-200 z-0" />

                  {/* Active Progress Line */}
                  <div
                    className="absolute top-3.5 left-6 h-0.5 bg-[#1E3A5F] transition-all duration-500 z-0"
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
                              ? "bg-[#1E3A5F] text-white ring-4 ring-blue-100 shadow-md"
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
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-700">GPS Signal Active</span>
                  <span className="text-slate-300">•</span>
                  <span>Status: <strong className="text-slate-800 font-bold">{e.status}</strong></span>
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  Updated: {new Date(e.updatedAt || e.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
