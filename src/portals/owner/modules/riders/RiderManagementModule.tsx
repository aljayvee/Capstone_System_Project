import React from "react";
import { Bike, CheckCircle, XCircle, Star, Phone, ShieldCheck } from "lucide-react";
import { MetricCard } from "../dashboard/components/MetricCard";
import { useRiderFleetPresence, RIDER_STATUS_THEMES } from "../../../../hooks/useRiderFleetPresence";
import { NotificationBell } from "../../../../components/NotificationBell";
import { HeaderClock } from "../../../../components/HeaderClock";

export const RiderManagementModule: React.FC = () => {
  const { riders, isLoading } = useRiderFleetPresence();

  // Counted from `presence` — the same state the Live Map paints its pins from.
  //
  // These used to be derived from `online` and `activeOrdersCount` directly,
  // which is how this board could report three Available riders while the map
  // showed the same three as signal-lost: two derivations of one fact, from a
  // hook that returns both.
  const availableCount = riders.filter((r) => r.presence === "AVAILABLE").length;
  const onErrandCount = riders.filter((r) => r.presence === "BUSY").length;
  const offlineCount = riders.filter(
    (r) => r.presence === "DISCONNECTED" || r.presence === "OFF_DUTY"
  ).length;

  return (
    <div className="flex flex-col h-full space-y-3 max-w-7xl mx-auto w-full overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HERO HEADER & ACTIONS (PINNED)                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
              <Bike size={18} />
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Riders</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <HeaderClock />
          <NotificationBell />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. RIDER FLEET STATUS OVERVIEW (PINNED)                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <MetricCard
          title="Available Riders"
          value={String(availableCount)}
          icon={CheckCircle}
          color="#10B981"
        />
        <MetricCard
          title="On Errand"
          value={String(onErrandCount)}
          icon={Bike}
          color="#3B82F6"
        />
        <MetricCard
          title="Offline Riders"
          value={String(offlineCount)}
          icon={XCircle}
          color="#94A3B8"
        />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. REGISTERED RIDER ROSTER (SCROLLABLE GRID)                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <h3 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider">Rider Roster</h3>
          <span className="text-xs font-mono font-bold text-slate-500">{riders.length} registered</span>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-2 scrollbar-thin">
          {isLoading ? (
            <p className="text-xs text-slate-400 py-8 text-center">Loading riders...</p>
          ) : riders.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No riders registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {riders.map((r) => (
                <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-2xs hover:bg-slate-100/70 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{r.name}</h4>
                      <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">Rider ID: #{r.id}</p>
                    </div>
                    {/* Same theme table the map's pins and legend read, so a
                        rider's badge here and their pin colour there can never
                        say different things. */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                        RIDER_STATUS_THEMES[r.presence].badgeClassName
                      }`}
                      title={
                        r.presence === "DISCONNECTED" && r.presumed
                          ? "Presumed offline — no beacon received. A powered-off handset and one in a dead zone send identically nothing."
                          : RIDER_STATUS_THEMES[r.presence].description
                      }
                    >
                      {RIDER_STATUS_THEMES[r.presence].badgeLabel}
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Phone size={12} className="text-slate-400" />
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
    </div>
  );
};
