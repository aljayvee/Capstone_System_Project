import React, { useState, useMemo } from "react";
import {
  Navigation,
  Bike,
  Radio,
  BatteryLow,
  Battery,
  Search,
  X,
  Check,
  Copy,
  Moon,
  WifiOff,
  Package,
  Target,
  Phone,
  Layers,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import LiveFleetMap from "../../../../components/LiveFleetMap";
import { useRiderFleetPresence, RiderFleetMember } from "../../../../hooks/useRiderFleetPresence";
import { RIDER_STATUS_THEMES, RiderPresenceState } from "../../../../constants/riderPresence";
import { NotificationBell } from "../../../../components/NotificationBell";
import { HeaderClock } from "../../../../components/HeaderClock";

const TACURONG_CENTER = { lat: 6.671, lng: 124.6644 };

export const RiderTrackingModule: React.FC = () => {
  const { riders, isLoading } = useRiderFleetPresence();
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPresence, setSelectedPresence] = useState<"ALL" | RiderPresenceState>("ALL");
  const [hideOffline, setHideOffline] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"map" | "roster">("map");

  // Selected rider resolution
  const selectedRider: RiderFleetMember | undefined = useMemo(() => {
    if (selectedRiderId !== null) {
      return riders.find((r) => r.id === selectedRiderId);
    }
    return undefined;
  }, [riders, selectedRiderId]);

  const selectedTheme = selectedRider
    ? RIDER_STATUS_THEMES[selectedRider.presence] || RIDER_STATUS_THEMES.AVAILABLE
    : RIDER_STATUS_THEMES.AVAILABLE;

  // Fleet presence counts
  const totalRiders = riders.length;
  const countReady = useMemo(() => riders.filter((r) => r.presence === "AVAILABLE").length, [riders]);
  const countBusy = useMemo(() => riders.filter((r) => r.presence === "BUSY").length, [riders]);
  const countDisconnected = useMemo(
    () => riders.filter((r) => r.presence === "DISCONNECTED").length,
    [riders]
  );
  const countOffDuty = useMemo(() => riders.filter((r) => r.presence === "OFF_DUTY").length, [riders]);

  // Filtered roster
  const filteredRoster = useMemo(() => {
    return riders.filter((r) => {
      if (hideOffline && r.presence === "OFF_DUTY") return false;
      if (selectedPresence !== "ALL" && r.presence !== selectedPresence) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;

      return (
        r.name.toLowerCase().includes(q) ||
        String(r.id).includes(q) ||
        (r.phone && r.phone.includes(q))
      );
    });
  }, [riders, hideOffline, selectedPresence, search]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedPresence("ALL");
    setHideOffline(false);
  };

  return (
    <div className="flex flex-col h-full space-y-3 sm:space-y-3.5 max-w-7xl mx-auto w-full overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HERO HEADER & QUICK TELEMETRY ACTIONS (PINNED)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
              <Navigation size={18} />
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Live Fleet Map</h2>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto">
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl shadow-2xs">
            <Radio size={13} className="text-emerald-600 animate-pulse" />
            <span className="text-[11px] sm:text-xs">
              {countReady} Ready • {countBusy} Delivering
            </span>
          </span>
          <HeaderClock />
          <NotificationBell />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. FLEET 4-STATE PRESENCE METRICS GRID (Psychological Cards)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Ready & Available */}
        <button
          type="button"
          onClick={() => setSelectedPresence(selectedPresence === "AVAILABLE" ? "ALL" : "AVAILABLE")}
          className={`text-left rounded-2xl p-2.5 sm:p-3 border transition shadow-2xs flex items-center gap-2.5 sm:gap-3 ${
            selectedPresence === "AVAILABLE"
              ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-200"
              : "bg-white border-slate-200/80 hover:bg-slate-50 hover:shadow-xs"
          }`}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shrink-0">
            <Bike size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Online & Ready
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-base sm:text-xl font-black text-slate-900">{countReady}</p>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            </div>
          </div>
        </button>

        {/* On Active Delivery */}
        <button
          type="button"
          onClick={() => setSelectedPresence(selectedPresence === "BUSY" ? "ALL" : "BUSY")}
          className={`text-left rounded-2xl p-2.5 sm:p-3 border transition shadow-2xs flex items-center gap-2.5 sm:gap-3 ${
            selectedPresence === "BUSY"
              ? "bg-amber-50/90 border-amber-400 ring-2 ring-amber-200"
              : "bg-white border-slate-200/80 hover:bg-slate-50 hover:shadow-xs"
          }`}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold shrink-0">
            <Package size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              On Active Mission
            </p>
            <p className="text-base sm:text-xl font-black text-slate-900 mt-0.5">{countBusy}</p>
          </div>
        </button>

        {/* Signal Lost */}
        <button
          type="button"
          onClick={() => setSelectedPresence(selectedPresence === "DISCONNECTED" ? "ALL" : "DISCONNECTED")}
          className={`text-left rounded-2xl p-2.5 sm:p-3 border transition shadow-2xs flex items-center gap-2.5 sm:gap-3 ${
            selectedPresence === "DISCONNECTED"
              ? "bg-red-50/90 border-red-400 ring-2 ring-red-200"
              : "bg-white border-slate-200/80 hover:bg-slate-50 hover:shadow-xs"
          }`}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold shrink-0">
            <WifiOff size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Signal Lost (&gt;60s)
            </p>
            <p className="text-base sm:text-xl font-black text-slate-900 mt-0.5">{countDisconnected}</p>
          </div>
        </button>

        {/* Off Duty */}
        <button
          type="button"
          onClick={() => setSelectedPresence(selectedPresence === "OFF_DUTY" ? "ALL" : "OFF_DUTY")}
          className={`text-left rounded-2xl p-2.5 sm:p-3 border transition shadow-2xs flex items-center gap-2.5 sm:gap-3 ${
            selectedPresence === "OFF_DUTY"
              ? "bg-slate-100 border-slate-400 ring-2 ring-slate-200"
              : "bg-white border-slate-200/80 hover:bg-slate-50 hover:shadow-xs"
          }`}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold shrink-0">
            <Moon size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Offline / Off Duty
            </p>
            <p className="text-base sm:text-xl font-black text-slate-900 mt-0.5">{countOffDuty}</p>
          </div>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MOBILE VIEW SWITCHER (Visible on Mobile only)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex sm:hidden bg-slate-100 p-1 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setMobileTab("map")}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobileTab === "map" ? "bg-white text-[#1E3A5F] shadow-xs" : "text-slate-600"
          }`}
        >
          <MapPin size={13} />
          <span>Map View</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("roster")}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobileTab === "roster" ? "bg-white text-[#1E3A5F] shadow-xs" : "text-slate-600"
          }`}
        >
          <Bike size={13} />
          <span>Fleet Roster ({filteredRoster.length})</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MAIN 12-COLUMN RESPONSIVE SECTION (Map + Sidebar Roster)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-[360px] grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-stretch overflow-hidden">
        {/* Left Column: Interactive Map (8 cols on desktop) */}
        <div
          className={`lg:col-span-8 h-full min-h-[320px] relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs ${
            mobileTab === "roster" ? "hidden sm:block" : "block"
          }`}
        >
          <LiveFleetMap
            riders={riders}
            center={TACURONG_CENTER}
            selectedRiderId={selectedRiderId}
            onSelectRider={(id) => setSelectedRiderId(id)}
            hideOffline={hideOffline}
            onToggleHideOffline={() => setHideOffline((prev) => !prev)}
            filterStatus={selectedPresence}
          />

          {/* Selected Rider Floating Mission Control Card */}
          {selectedRider && (
            <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 max-w-sm sm:max-w-md w-auto sm:w-full space-y-3 shadow-xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Card Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs"
                    style={{ backgroundColor: selectedTheme.primaryColor }}
                  >
                    {selectedRider.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-900 text-sm truncate flex items-center gap-1.5">
                      <span>{selectedRider.name}</span>
                      <span className="text-slate-400 font-mono text-[11px] font-semibold">#{selectedRider.id}</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {selectedRider.plottableLocation
                        ? "GPS Location Stream Active"
                        : "No recent GPS coordinates"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${selectedTheme.badgeClassName}`}
                  >
                    {selectedTheme.badgeLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedRiderId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    title="Close selection"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Detail Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-slate-100">
                {/* Phone */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Contact Phone
                  </span>
                  <button
                    type="button"
                    onClick={() => selectedRider.phone && handleCopy(selectedRider.phone, `floating-phone-${selectedRider.id}`)}
                    className="flex items-center gap-1.5 font-mono font-bold text-slate-800 hover:text-blue-700 transition mt-0.5"
                    title="Click to copy phone"
                  >
                    <Phone size={12} className="text-slate-400" />
                    <span className="truncate">{selectedRider.phone || "—"}</span>
                    {selectedRider.phone && (
                      <span className="text-slate-400">
                        {copiedId === `floating-phone-${selectedRider.id}` ? (
                          <Check size={11} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} />
                        )}
                      </span>
                    )}
                  </button>
                </div>

                {/* Active Errand Status */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Active Mission
                  </span>
                  <p className="font-bold text-slate-800 mt-0.5 truncate flex items-center gap-1.5">
                    {selectedRider.activeOrdersCount > 0 ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                        <span>{selectedRider.activeOrdersCount} in progress</span>
                      </>
                    ) : (
                      <span className="text-slate-500">0 active orders</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Battery Telemetry Bar */}
              {selectedRider.batteryLevel !== null && selectedRider.batteryLevel !== undefined && (
                <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                    {(() => {
                      const pct =
                        selectedRider.batteryLevel <= 1
                          ? Math.round(selectedRider.batteryLevel * 100)
                          : Math.round(selectedRider.batteryLevel);
                      return pct <= 20 ? (
                        <BatteryLow size={14} className="text-red-500" />
                      ) : (
                        <Battery size={14} className="text-slate-500" />
                      );
                    })()}
                    <span>Battery Telemetry:</span>
                  </span>
                  <span
                    className={`font-mono font-extrabold ${
                      (() => {
                        const pct =
                          selectedRider.batteryLevel <= 1
                            ? Math.round(selectedRider.batteryLevel * 100)
                            : Math.round(selectedRider.batteryLevel);
                        return pct <= 20 ? "text-red-600 font-black" : "text-slate-800";
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

        {/* Right Column: Fleet Roster Sidebar (4 cols on desktop) */}
        <div
          className={`lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col h-full min-h-0 space-y-2.5 overflow-hidden ${
            mobileTab === "map" ? "hidden sm:flex" : "flex"
          }`}
        >
          {/* Sidebar Header */}
          <div className="border-b border-slate-100 pb-2.5 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Bike size={16} className="text-[#1E3A5F]" />
                <span>Fleet Roster</span>
              </h3>
              <span className="text-[10.5px] font-bold font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60">
                {filteredRoster.length} of {totalRiders}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search riders by name, ID, or phone..."
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] focus:bg-white transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Status Filter Capsules */}
            <div className="flex items-center gap-1 overflow-x-auto pt-2 pb-0.5 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedPresence("ALL")}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                  selectedPresence === "ALL"
                    ? "bg-[#1E3A5F] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({totalRiders})
              </button>
              <button
                type="button"
                onClick={() => setSelectedPresence("AVAILABLE")}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
                  selectedPresence === "AVAILABLE"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <span>Ready ({countReady})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPresence("BUSY")}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
                  selectedPresence === "BUSY"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                <span>Busy ({countBusy})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPresence("DISCONNECTED")}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
                  selectedPresence === "DISCONNECTED"
                    ? "bg-red-600 text-white shadow-2xs"
                    : "bg-red-50 text-red-700 hover:bg-red-100"
                }`}
              >
                <span>Signal ({countDisconnected})</span>
              </button>
            </div>
          </div>

          {/* Roster Scrollable Cards */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <RefreshCw size={22} className="animate-spin text-[#1E3A5F] mx-auto" />
                <p className="text-xs font-bold text-slate-600">Streaming live rider fleet...</p>
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-2.5 my-auto">
                <Bike size={28} className="mx-auto text-slate-300" />
                <p className="text-xs font-extrabold text-slate-700">No riders found</p>
                <p className="text-[11px] text-slate-500">
                  {search || selectedPresence !== "ALL" || hideOffline
                    ? "No riders match your search or presence filter."
                    : "No riders are currently registered in the system."}
                </p>
                {(search || selectedPresence !== "ALL" || hideOffline) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>
            ) : (
              filteredRoster.map((r) => {
                const isSelected = r.id === selectedRiderId;
                const theme = RIDER_STATUS_THEMES[r.presence] || RIDER_STATUS_THEMES.AVAILABLE;

                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedRiderId(r.id);
                      if (mobileTab === "roster") setMobileTab("map");
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-100 shadow-xs"
                        : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    {/* Top Row: Avatar, Name, Presence Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs"
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          {r.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{r.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono font-medium">#{r.id}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border shrink-0 ${theme.badgeClassName}`}
                      >
                        {theme.badgeLabel}
                      </span>
                    </div>

                    {/* Bottom Row: Phone, Battery, Errand Pill */}
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-200/50">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (r.phone) handleCopy(r.phone, `roster-phone-${r.id}`);
                        }}
                        className="flex items-center gap-1 text-slate-600 hover:text-blue-700 transition"
                        title="Click to copy phone"
                      >
                        <Phone size={11} className="text-slate-400" />
                        <span className="font-mono">{r.phone || "—"}</span>
                        {r.phone && (
                          <span className="text-slate-400">
                            {copiedId === `roster-phone-${r.id}` ? (
                              <Check size={10} className="text-emerald-600" />
                            ) : (
                              <Copy size={10} />
                            )}
                          </span>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        {r.batteryLevel !== null && r.batteryLevel !== undefined && (
                          <span className="flex items-center gap-0.5 font-mono text-[10px] text-slate-500 font-semibold">
                            {r.batteryLevel <= 0.2 ? (
                              <BatteryLow size={12} className="text-red-500" />
                            ) : (
                              <Battery size={12} className="text-slate-400" />
                            )}
                            <span>
                              {r.batteryLevel <= 1
                                ? `${Math.round(r.batteryLevel * 100)}%`
                                : `${Math.round(r.batteryLevel)}%`}
                            </span>
                          </span>
                        )}

                        {r.activeOrdersCount > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-bold text-[9px]">
                            {r.activeOrdersCount} active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

