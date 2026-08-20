import React, { useState } from "react";
import { Navigation, Bike, Radio, Signal, BatteryLow } from "lucide-react";
import LiveFleetMap from "../../../../components/LiveFleetMap";
import { useRiderFleetPresence } from "../../../../hooks/useRiderFleetPresence";
import { RIDER_STATUS_THEMES } from "../../../../constants/riderPresence";
import { ServerStatusBadge } from "../../../../components/ServerStatusBadge";
import { NotificationBell } from "../../../../components/NotificationBell";

const TACURONG_CENTER = { lat: 6.671, lng: 124.6644 };

export const RiderTrackingModule: React.FC = () => {
  const { riders, isLoading } = useRiderFleetPresence();
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);

  const selectedRider = riders.find((r) => r.id === selectedRiderId) || riders[0];
  const selectedTheme = selectedRider
    ? RIDER_STATUS_THEMES[selectedRider.presence] || RIDER_STATUS_THEMES.AVAILABLE
    : RIDER_STATUS_THEMES.AVAILABLE;

  const countReady = riders.filter((r) => r.presence === "AVAILABLE").length;
  const countBusy = riders.filter((r) => r.presence === "BUSY").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HERO HEADER & ACTIONS                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Navigation size={20} />
            </span>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <span>Live Fleet Map</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Live real-time telemetry and GPS locations of riders across Tacurong City.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl">
            <Radio size={14} className="animate-pulse" /> {countReady} Ready • {countBusy} Delivering
          </span>
          <NotificationBell />
          <ServerStatusBadge />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. FLEET MAP & RIDER DETAIL DRAWER                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[500px] relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
          <LiveFleetMap
            riders={riders}
            center={TACURONG_CENTER}
            selectedRiderId={selectedRider?.id}
            onSelectRider={(id) => setSelectedRiderId(id)}
          />

          {selectedRider && (
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 max-w-sm w-full space-y-2 shadow-lg z-10">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Bike size={16} style={{ color: selectedTheme.primaryColor }} />
                  {selectedRider.name}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${selectedTheme.badgeClassName}`}
                >
                  {selectedTheme.badgeLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400">Phone:</span> {selectedRider.phone || "—"}
                </div>
                <div>
                  <span className="text-slate-400">Active:</span> {selectedRider.activeOrdersCount} errand(s)
                </div>
              </div>

              {selectedRider.batteryLevel !== null && selectedRider.batteryLevel !== undefined && (
                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                  <span className="flex items-center gap-1">
                    {(() => {
                      const pct =
                        selectedRider.batteryLevel <= 1
                          ? Math.round(selectedRider.batteryLevel * 100)
                          : Math.round(selectedRider.batteryLevel);
                      return pct <= 20 ? <BatteryLow size={13} className="text-red-500" /> : null;
                    })()}
                    <span>Battery:</span>
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      (() => {
                        const pct =
                          selectedRider.batteryLevel <= 1
                            ? Math.round(selectedRider.batteryLevel * 100)
                            : Math.round(selectedRider.batteryLevel);
                        return pct <= 20 ? "text-red-600 font-black" : "text-slate-700";
                      })()
                    }`}
                  >
                    {selectedRider.batteryLevel <= 1
                      ? `${Math.round(selectedRider.batteryLevel * 100)}%`
                      : `${Math.round(selectedRider.batteryLevel)}%`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rider List Side Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs flex flex-col h-[500px]">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center justify-between">
            <span>Riders on Map</span>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {riders.length} Registered
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <p className="text-xs text-slate-400 p-4 text-center">Loading live tracking...</p>
            ) : riders.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">No riders currently streaming GPS.</p>
            ) : (
              riders.map((r) => {
                const isSelected = r.id === selectedRider?.id;
                const theme = RIDER_STATUS_THEMES[r.presence] || RIDER_STATUS_THEMES.AVAILABLE;

                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRiderId(r.id)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-100"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-xs"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        {r.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 truncate max-w-[120px]">{r.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">#{r.id}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${theme.badgeClassName}`}
                    >
                      {theme.badgeLabel}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
