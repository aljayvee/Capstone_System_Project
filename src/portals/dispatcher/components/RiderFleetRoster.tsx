import React, { useState, useMemo } from "react";
import {
  Bike,
  Search,
  BatteryLow,
  Target,
  Phone,
  Radio,
  Package,
  WifiOff,
  Moon,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";
import LiveFleetMap from "../../../components/LiveFleetMap";
import type { RiderFleetMember, RiderPresenceState } from "../../../hooks/useRiderFleetPresence";
import { RIDER_STATUS_THEMES } from "../../../constants/riderPresence";

interface RiderFleetRosterProps {
  riders: RiderFleetMember[];
}

const TACURONG_CENTER = { lat: 6.671, lng: 124.6644 };

export const RiderFleetRoster: React.FC<RiderFleetRosterProps> = ({ riders }) => {
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<RiderPresenceState | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hideOffline, setHideOffline] = useState<boolean>(false);

  // Filtered riders for the roster list & map
  const filteredRiders = useMemo(() => {
    return riders.filter((r) => {
      // 1. Status Filter
      if (statusFilter !== "ALL" && r.presence !== statusFilter) {
        return false;
      }
      // 2. Hide Offline Toggle
      if (hideOffline && r.presence === "OFF_DUTY") {
        return false;
      }
      // 3. Search Query (Name or Phone)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = r.name.toLowerCase().includes(query);
        const matchPhone = r.phone.toLowerCase().includes(query);
        const matchId = String(r.id).includes(query);
        if (!matchName && !matchPhone && !matchId) return false;
      }
      return true;
    });
  }, [riders, statusFilter, hideOffline, searchQuery]);

  // Counts for each status tab
  const countAll = riders.length;
  const countReady = riders.filter((r) => r.presence === "AVAILABLE").length;
  const countBusy = riders.filter((r) => r.presence === "BUSY").length;
  const countDisconnected = riders.filter((r) => r.presence === "DISCONNECTED").length;
  const countOffDuty = riders.filter((r) => r.presence === "OFF_DUTY").length;

  const selectedRider =
    riders.find((r) => r.id === selectedRiderId) ||
    filteredRiders[0] ||
    riders[0];

  const selectedTheme = selectedRider
    ? RIDER_STATUS_THEMES[selectedRider.presence] || RIDER_STATUS_THEMES.AVAILABLE
    : RIDER_STATUS_THEMES.AVAILABLE;

  return (
    <div className="space-y-4">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP OPERATIONS CONTROLS & FILTER BAR                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* ALL */}
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <span>All Riders</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {countAll}
              </span>
            </button>

            {/* READY (AVAILABLE) */}
            <button
              onClick={() => setStatusFilter("AVAILABLE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "AVAILABLE"
                  ? "bg-emerald-600 text-white shadow-xs shadow-emerald-700/30"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>🟢 Ready</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {countReady}
              </span>
            </button>

            {/* ON ERRAND (BUSY) */}
            <button
              onClick={() => setStatusFilter("BUSY")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "BUSY"
                  ? "bg-amber-500 text-white shadow-xs shadow-amber-600/30"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              <Package size={13} />
              <span>🟠 Delivering</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {countBusy}
              </span>
            </button>

            {/* SIGNAL LOST (DISCONNECTED) */}
            <button
              onClick={() => setStatusFilter("DISCONNECTED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "DISCONNECTED"
                  ? "bg-red-600 text-white shadow-xs shadow-red-700/30"
                  : "bg-red-50 hover:bg-red-100 text-red-800 border border-red-200"
              }`}
            >
              <WifiOff size={13} />
              <span>🔴 No Signal</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {countDisconnected}
              </span>
            </button>

            {/* OFF DUTY */}
            <button
              onClick={() => setStatusFilter("OFF_DUTY")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "OFF_DUTY"
                  ? "bg-slate-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              <Moon size={13} />
              <span>⚪ Off Duty</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {countOffDuty}
              </span>
            </button>
          </div>

          {/* Search & Hide-Offline Controls */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[180px] sm:min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search rider or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white transition"
              />
            </div>

            {/* Hide Offline Toggle */}
            <button
              onClick={() => setHideOffline(!hideOffline)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                hideOffline
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
              title="Toggle visibility of off-duty riders"
            >
              {hideOffline ? <EyeOff size={13} /> : <Eye size={13} />}
              <span className="hidden sm:inline">Hide Off-Duty</span>
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SPLIT LAYOUT: MAP + SIDEBAR ROSTER                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Google Map with 4-State Markers & 2-Way Sync */}
        <div className="lg:col-span-2 h-[560px] relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-white">
          <LiveFleetMap
            riders={riders}
            center={TACURONG_CENTER}
            selectedRiderId={selectedRider?.id}
            onSelectRider={(riderId) => setSelectedRiderId(riderId)}
            hideOffline={hideOffline}
            filterStatus={statusFilter}
          />

          {/* Floating Selected Rider Details Card */}
          {selectedRider && (
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 max-w-sm w-full space-y-2.5 shadow-xl z-20 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs"
                    style={{ backgroundColor: selectedTheme.primaryColor }}
                  >
                    <Bike size={16} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm leading-tight">
                      {selectedRider.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">ID: #{selectedRider.id}</p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${selectedTheme.badgeClassName}`}
                >
                  {selectedTheme.badgeLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Phone size={12} className="text-slate-400" />
                  <span className="truncate">{selectedRider.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400">Active Tasks:</span>{" "}
                  <span className="font-bold text-slate-800">
                    {selectedRider.activeOrdersCount} errand(s)
                  </span>
                </div>
              </div>

              {/* Battery & GPS Telemetry */}
              {selectedRider.batteryLevel !== null && selectedRider.batteryLevel !== undefined && (
                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    {(() => {
                      const pct =
                        selectedRider.batteryLevel <= 1
                          ? Math.round(selectedRider.batteryLevel * 100)
                          : Math.round(selectedRider.batteryLevel);
                      return pct <= 20 ? <BatteryLow size={14} className="text-red-500" /> : null;
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

        {/* Rider Selection Side Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs flex flex-col h-[560px]">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Bike size={16} className="text-blue-600" />
              <span>Roster ({filteredRiders.length})</span>
            </h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              {countReady} Ready for Dispatch
            </span>
          </div>

          {/* Scrollable Rider List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredRiders.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bike size={32} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-500">No riders match your criteria</p>
                <p className="text-[11px] text-slate-400">
                  Try adjusting status filters or clearing search.
                </p>
              </div>
            ) : (
              filteredRiders.map((r) => {
                const isSelected = r.id === selectedRider?.id;
                const theme = RIDER_STATUS_THEMES[r.presence] || RIDER_STATUS_THEMES.AVAILABLE;
                const pct =
                  r.batteryLevel !== null
                    ? r.batteryLevel <= 1
                      ? Math.round(r.batteryLevel * 100)
                      : Math.round(r.batteryLevel)
                    : null;

                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRiderId(r.id)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between group ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-100 shadow-xs"
                        : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar with Status Dot Ring */}
                      <div className="relative">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs"
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          {r.name.slice(0, 2).toUpperCase()}
                        </div>
                        {theme.hasPulse && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-800 truncate group-hover:text-blue-700 transition">
                          {r.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          ID: #{r.id} {r.phone ? `• ${r.phone}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${theme.badgeClassName}`}
                      >
                        {theme.badgeLabel}
                      </span>
                      {pct !== null && (
                        <span
                          className={`text-[10px] font-mono ${
                            pct <= 20 ? "text-red-600 font-bold" : "text-slate-500"
                          }`}
                        >
                          ⚡ {pct}%
                        </span>
                      )}
                    </div>
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
