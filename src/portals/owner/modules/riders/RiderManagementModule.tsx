import React from "react";
import { Bike, CheckCircle, XCircle, Star, Phone, ShieldCheck } from "lucide-react";
import { MetricCard } from "../dashboard/components/MetricCard";
import { useRiderFleetPresence } from "../../../../hooks/useRiderFleetPresence";
import { ServerStatusBadge } from "../../../../components/ServerStatusBadge";
import { NotificationBell } from "../../../../components/NotificationBell";

export const RiderManagementModule: React.FC = () => {
  const { riders, isLoading } = useRiderFleetPresence();

  const availableCount = riders.filter((r) => r.online && r.activeOrdersCount === 0).length;
  const onErrandCount = riders.filter((r) => r.online && r.activeOrdersCount > 0).length;
  const offlineCount = riders.filter((r) => !r.online).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HERO HEADER & ACTIONS                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Bike size={20} />
            </span>
            <h2 className="text-xl font-extrabold text-slate-800">Riders</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            View active delivery riders, contact info, and status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <NotificationBell />
          <ServerStatusBadge />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. RIDER FLEET STATUS OVERVIEW                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Available Riders"
          value={String(availableCount)}
          sub="Ready for dispatch"
          icon={CheckCircle}
          color="#10B981"
        />
        <MetricCard
          title="On Errand"
          value={String(onErrandCount)}
          sub="Active on delivery"
          icon={Bike}
          color="#3B82F6"
        />
        <MetricCard
          title="Offline Riders"
          value={String(offlineCount)}
          sub="Not currently connected"
          icon={XCircle}
          color="#94A3B8"
        />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. REGISTERED RIDER ROSTER                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-extrabold uppercase text-slate-800 tracking-wider">Rider List</h3>
        {isLoading ? (
          <p className="text-xs text-slate-400">Loading riders...</p>
        ) : riders.length === 0 ? (
          <p className="text-xs text-slate-400">No riders registered yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {riders.map((r) => (
              <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{r.name}</h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">Rider ID: #{r.id}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                      r.online
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {r.online ? (r.activeOrdersCount > 0 ? "On Errand" : "Available") : "Offline"}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Phone size={13} className="text-slate-400" />
                    <span>{r.phone || "—"}</span>
                  </span>
                  <span className="font-bold text-[11px] text-[#1E3A5F]">
                    {r.activeOrdersCount} Active Order(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
