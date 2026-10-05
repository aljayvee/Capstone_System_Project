import React, { useState, useMemo } from "react";
import {
  Bike,
  Radio,
  BatteryLow,
  Battery,
  Search,
  X,
  Check,
  Copy,
  WifiOff,
  Phone,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import LiveFleetMap from "../../../../components/LiveFleetMap";
import { StandingFigures } from "../../components/StandingFigures";
import { useRiderFleetPresence, RiderFleetMember } from "../../../../hooks/useRiderFleetPresence";
import { RIDER_STATUS_THEMES, describeRiderStatus, RiderPresenceState } from "../../../../constants/riderPresence";
import { useRiderActiveRoute } from "../../../../hooks/useRiderActiveRoute";
import { NotificationBell } from "../../../../components/NotificationBell";
import { HeaderClock } from "../../../../components/HeaderClock";
import { cn } from "@/lib/utils";

const TACURONG_CENTER = { lat: 6.671, lng: 124.6644 };

export const RiderTrackingModule: React.FC = () => {
  const { riders, isLoading, loadError, telemetryError, reload, liveLink } = useRiderFleetPresence();
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

  // The owner portal holds no errand list, so this fetches the one route.
  const selectedRoute = useRiderActiveRoute(selectedRider);

  const selectedTheme = selectedRider
    ? RIDER_STATUS_THEMES[selectedRider.presence] || RIDER_STATUS_THEMES.AVAILABLE_ONLINE
    : RIDER_STATUS_THEMES.AVAILABLE_ONLINE;

  // Fleet presence counts
  const totalRiders = riders.length;
  const countReady = useMemo(
    () => riders.filter((r) => r.presence === "AVAILABLE_ONLINE").length,
    [riders],
  );
  const countBusy = useMemo(() => riders.filter((r) => r.presence === "ON_DELIVERY").length, [riders]);
  const countDisconnected = useMemo(
    () => riders.filter((r) => r.presence === "AVAILABLE_SIGNAL_LOST").length,
    [riders],
  );
  const countOffDuty = useMemo(
    () => riders.filter((r) => r.presence === "OFFLINE").length,
    [riders],
  );

  /**
   * Every count on this screen reads from one judgement.
   *
   * The presence chip in the header now reports "presence unknown" on a failed
   * fetch, and without this the four tiles under it, the map badge and the
   * roster filters all carried on printing a confident 0. A screen that
   * contradicts itself is worse than one that is uniformly wrong, because the
   * reader cannot tell which half to trust.
   *
   * Unknown means the request failed AND nothing had arrived. A stale count
   * from a previous poll is still worth showing under the warning.
   */
  const unknown = loadError !== null && riders.length === 0;
  const fig = (n: number) => (unknown ? "--" : String(n));

  // Filtered roster
  const filteredRoster = useMemo(() => {
    return riders.filter((r) => {
      if (hideOffline && r.presence === "OFFLINE") return false;
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
      {/* 1. TOP HERO HEADER & QUICK TELEMETRY ACTIONS (PINNED) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-hairline pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            {/* The pulsing green dot that used to sit here is gone. It was
                painted unconditionally, so it announced a live feed even while
                /riders was returning 401 and every count below it read zero.
                An indicator that never checks the thing it indicates is not an
                indicator. Presence is now reported by the chip on the right,
                which reads the hook's error channel. */}
            <div className="flex items-center gap-2">
              <h1 className="truncate text-title uppercase text-ink">Tracking</h1>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Three states, not one. This chip was a single emerald pill with
              an animating radio icon that rendered whatever the counts were,
              so "0 Ready, 0 Delivering" over a dead endpoint looked exactly
              like a quiet afternoon. */}
          {loadError ? (
            <button
              type="button"
              onClick={reload}
              className="flex items-center gap-1.5 rounded-trim bg-status-act-fill px-3 py-1.5 text-micro uppercase text-status-act-ink transition-opacity hover:opacity-80"
            >
              <WifiOff size={13} className="shrink-0" />
              <span>Presence unknown, retry</span>
            </button>
          ) : isLoading ? (
            <span className="flex items-center gap-1.5 rounded-trim bg-status-closed-fill px-3 py-1.5 text-micro uppercase text-status-closed-ink">
              <Radio size={13} className="shrink-0" />
              <span>Reading presence</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-trim bg-status-done-fill px-3 py-1.5 text-micro uppercase text-status-done-ink">
              <Radio size={13} className="shrink-0" />
              <span data-figure>
                {countReady} Online, {countBusy} On delivery
              </span>
            </span>
          )}
          <HeaderClock />
          <NotificationBell />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. THE FLEET RIGHT NOW                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* This was four identical metric tiles, each carrying a 40px tinted
          icon chip, above the map and the roster - the exact arrangement the
          direction contract refuses by name, and the chip that MetricCard's
          own docstring calls the most category-generic element in this
          codebase. These four were the ones that rewrite could not reach,
          because this screen kept its own header instead of the shell.

          They were also a SECOND copy of a control the screen already has:
          all four called setSelectedPresence with the same values as the
          roster's filter strip below, so one screen shipped two controls for
          one job. Reading and filtering are now separated - this band states
          what is true right now, in the same device the dashboard uses for
          the same kind of fact, and the roster strip remains the one place
          the presence filter is set. */}
      <StandingFigures
        label="The fleet right now"
        columns={4}
        className="shrink-0"
        figures={[
          {
            label: "Available Online",
            value: fig(countReady),
            sub: "Can be assigned",
            active: selectedPresence === "AVAILABLE_ONLINE",
            onClick: () =>
              setSelectedPresence((prev) =>
                prev === "AVAILABLE_ONLINE" ? "ALL" : "AVAILABLE_ONLINE",
              ),
          },
          {
            label: "On delivery",
            value: fig(countBusy),
            sub: "Online, carrying an errand",
            active: selectedPresence === "ON_DELIVERY",
            onClick: () =>
              setSelectedPresence((prev) => (prev === "ON_DELIVERY" ? "ALL" : "ON_DELIVERY")),
          },
          {
            label: "Available Signal Lost",
            value: fig(countDisconnected),
            sub: "On duty, phone not reporting",
            urgent: !unknown && countDisconnected > 0,
            active: selectedPresence === "AVAILABLE_SIGNAL_LOST",
            onClick: () =>
              setSelectedPresence((prev) =>
                prev === "AVAILABLE_SIGNAL_LOST" ? "ALL" : "AVAILABLE_SIGNAL_LOST",
              ),
          },
          {
            label: "Offline",
            value: fig(countOffDuty),
            sub: "Logged out or shift ended",
            active: selectedPresence === "OFFLINE",
            onClick: () =>
              setSelectedPresence((prev) => (prev === "OFFLINE" ? "ALL" : "OFFLINE")),
          },
        ]}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MOBILE VIEW SWITCHER (Visible on Mobile only) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex sm:hidden bg-board-ground p-1 rounded-plate border border-edge">
        <button
          type="button"
          onClick={() => setMobileTab("map")}
          className={`flex-1 py-1.5 rounded-plate text-label transition flex items-center justify-center gap-1.5 ${
            mobileTab === "map" ? "bg-board-plate text-board-field" : "text-ink-muted"
          }`}
        >
          <MapPin size={13} />
          <span>Map View</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("roster")}
          className={`flex-1 py-1.5 rounded-plate text-label transition flex items-center justify-center gap-1.5 ${
            mobileTab === "roster" ? "bg-board-plate text-board-field" : "text-ink-muted"
          }`}
        >
          <Bike size={13} />
          <span>Fleet Roster ({fig(filteredRoster.length)})</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MAIN 12-COLUMN RESPONSIVE SECTION (Map + Sidebar Roster) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-[360px] grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-stretch overflow-hidden">
        {/* Left Column: Interactive Map (8 cols on desktop) */}
        <div
          className={`lg:col-span-8 h-full min-h-[320px] relative rounded-plate overflow-hidden border border-edge ${
            mobileTab === "roster" ? "hidden sm:block" : "block"
          }`}
        >
          <LiveFleetMap
            presenceUnknown={unknown}
            telemetryError={telemetryError}
            liveLink={liveLink}
            routeGeometry={selectedRoute.routeGeometry}
            routeStops={selectedRoute.routeStops}
            routeDestination={selectedRoute.routeDestination}
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
            <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-auto bg-board-plate border border-edge rounded-plate p-4 max-w-sm sm:max-w-md w-auto sm:w-full space-y-3 z-20 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-150">
              {/* Header: Rider Name, ID, Badge, Close */}
              <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-hairline">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0",
                      selectedRider.presence === "AVAILABLE_ONLINE" && "bg-status-done-ink",
                      selectedRider.presence === "ON_DELIVERY" && "bg-status-waiting-ink",
                      selectedRider.presence === "AVAILABLE_SIGNAL_LOST" && "bg-signal animate-pulse",
                      selectedRider.presence === "OFFLINE" && "bg-ink-muted/40",
                    )}
                  />
                  <div className="min-w-0">
                    <h4 className="text-ink text-label font-medium truncate flex items-center gap-1.5">
                      <span>{selectedRider.name}</span>
                      <span className="text-ink-muted font-mono text-body">
                        #{selectedRider.id}
                      </span>
                    </h4>
                    <p className="text-body text-ink-muted">
                      {selectedRider.plottableLocation
                        ? "GPS Location Stream Active"
                        : "No recent GPS coordinates"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-micro px-2.5 py-0.5 rounded-full uppercase border",
                      selectedTheme.badgeClassName,
                    )}
                  >
                    {selectedTheme.badgeLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedRiderId(null)}
                    className="p-1 rounded-trim text-ink-muted hover:text-ink hover:bg-board-ground transition"
                    title="Close selection"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Detail Telemetry: Clean tabular rows without nested card boxes */}
              <div className="space-y-2 text-label">
                {/* Phone */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-ink-muted">Contact Phone</span>
                  <button
                    type="button"
                    onClick={() =>
                      selectedRider.phone &&
                      handleCopy(selectedRider.phone, `floating-phone-${selectedRider.id}`)
                    }
                    className="flex items-center gap-1.5 font-mono text-ink hover:text-board-field transition font-medium"
                    title="Click to copy phone"
                  >
                    <Phone size={12} className="text-ink-muted" />
                    <span>{selectedRider.phone || "--"}</span>
                    {selectedRider.phone && (
                      <span className="text-ink-muted">
                        {copiedId === `floating-phone-${selectedRider.id}` ? (
                          <Check size={11} className="text-status-done-ink" />
                        ) : (
                          <Copy size={11} />
                        )}
                      </span>
                    )}
                  </button>
                </div>

                {/* Active Errand Status */}
                <div className="flex items-center justify-between py-1 border-t border-hairline">
                  <span className="text-ink-muted">Active Mission</span>
                  <div className="font-medium text-ink flex items-center gap-1.5">
                    {selectedRider.activeOrdersCount > 0 ? (
                      <>
                        <span className="w-2 h-2 shrink-0 rounded-full bg-status-waiting-ink" />
                        <span>{selectedRider.activeOrdersCount} in progress</span>
                      </>
                    ) : (
                      <span className="text-ink-muted">0 active orders</span>
                    )}
                  </div>
                </div>

                {/* Battery Telemetry */}
                {selectedRider.batteryLevel !== null && selectedRider.batteryLevel !== undefined && (
                  <div className="flex items-center justify-between py-1 border-t border-hairline">
                    <span className="flex items-center gap-1.5 text-ink-muted">
                      {(() => {
                        const pct =
                          selectedRider.batteryLevel <= 1
                            ? Math.round(selectedRider.batteryLevel * 100)
                            : Math.round(selectedRider.batteryLevel);
                        return pct <= 20 ? (
                          <BatteryLow size={14} className="text-signal" />
                        ) : (
                          <Battery size={14} className="text-ink-muted" />
                        );
                      })()}
                      <span>Battery Level</span>
                    </span>
                    <span
                      className={cn(
                        "font-mono font-medium",
                        (() => {
                          const pct =
                            selectedRider.batteryLevel <= 1
                              ? Math.round(selectedRider.batteryLevel * 100)
                              : Math.round(selectedRider.batteryLevel);
                          return pct <= 20 ? "text-status-act-ink font-bold" : "text-ink";
                        })(),
                      )}
                    >
                      {selectedRider.batteryLevel <= 1
                        ? `${Math.round(selectedRider.batteryLevel * 100)}%`
                        : `${Math.round(selectedRider.batteryLevel)}%`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Fleet Roster Sidebar (4 cols on desktop) */}
        <div
          className={`lg:col-span-4 bg-board-plate border border-edge rounded-plate flex flex-col h-full min-h-0 overflow-hidden ${
            mobileTab === "map" ? "hidden sm:flex" : "flex"
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-3 sm:p-3.5 border-b border-hairline shrink-0 space-y-2.5 bg-board-plate">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-label font-medium text-ink flex items-center gap-2">
                  <Bike size={16} className="text-board-field" />
                  <span>Fleet Roster</span>
                </h3>
                {selectedPresence !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setSelectedPresence("ALL")}
                    className="text-micro text-board-field hover:underline"
                    title="Clear status filter"
                  >
                    Reset
                  </button>
                )}
              </div>
              <span className="text-label font-mono text-ink-muted bg-board-ground px-2 py-0.5 rounded-trim border border-edge">
                {unknown ? "-- of --" : `${filteredRoster.length} of ${totalRiders}`}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                size={14}
              />
              <input
                type="text"
                aria-label="Search the rider roster"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search riders by name, ID, or phone..."
                className="w-full pl-9 pr-8 py-1.5 bg-board-ground border border-edge rounded-plate text-body text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-board-field/20 focus:border-board-field focus:bg-board-plate transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Roster Scrollable Plate: Single continuous list with hairlines */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-hairline">
            {isLoading ? (
              <div className="p-8 text-center text-ink-muted space-y-2">
                <RefreshCw size={22} className="animate-spin text-board-field mx-auto" />
                <p className="text-label text-ink-muted">Streaming live rider fleet...</p>
              </div>
            ) : unknown ? (
              <div className="p-6 text-center space-y-2.5 my-auto">
                <WifiOff size={22} className="mx-auto text-status-act-ink" />
                <p className="text-panel text-ink">The roster did not load</p>
                <p className="text-body text-ink-muted">
                  {loadError} Nobody is listed because nothing arrived.
                </p>
                <button
                  type="button"
                  onClick={reload}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-plate bg-signal px-4 text-micro uppercase text-board-plate transition-colors hover:bg-signal-deep"
                >
                  <RefreshCw size={14} />
                  <span>Try again</span>
                </button>
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="p-6 text-center text-ink-muted space-y-2.5 my-auto">
                <Bike size={28} className="mx-auto text-ink-muted" />
                <p className="text-label text-ink">No riders found</p>
                <p className="text-label text-ink-muted">
                  {search || selectedPresence !== "ALL" || hideOffline
                    ? "No riders match your search or presence filter."
                    : "No riders are currently registered in the system."}
                </p>
                {(search || selectedPresence !== "ALL" || hideOffline) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-trim bg-board-ground hover:bg-board-ground text-ink text-label transition"
                  >
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>
            ) : (
              filteredRoster.map((r) => {
                const isSelected = r.id === selectedRiderId;
                const theme = RIDER_STATUS_THEMES[r.presence] || RIDER_STATUS_THEMES.AVAILABLE_ONLINE;

                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedRiderId(r.id);
                      if (mobileTab === "roster") setMobileTab("map");
                    }}
                    className={cn(
                      "px-3.5 py-3 transition-colors cursor-pointer text-left relative",
                      isSelected
                        ? "bg-board-ground border-l-2 border-board-field"
                        : "hover:bg-board-ground/60 bg-board-plate",
                    )}
                  >
                    {/* Row 1: Name, Status Pill */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            r.presence === "AVAILABLE_ONLINE" && "bg-status-done-ink",
                            r.presence === "ON_DELIVERY" && "bg-status-waiting-ink",
                            r.presence === "AVAILABLE_SIGNAL_LOST" && "bg-signal animate-pulse",
                            r.presence === "OFFLINE" && "bg-ink-muted/40",
                          )}
                        />
                        <span className="text-label font-medium text-ink truncate">{r.name}</span>
                        <span className="text-body font-mono text-ink-muted">#{r.id}</span>
                      </div>

                      <span
                        className={cn(
                          "text-micro px-2 py-0.5 rounded-full uppercase border shrink-0",
                          theme.badgeClassName,
                        )}
                      >
                        {theme.badgeLabel}
                      </span>
                    </div>

                    {/* Row 2: Telemetry details (Phone, Battery, Active orders) */}
                    <div className="flex items-center justify-between text-body text-ink-muted mt-1.5 pl-4">
                      <div className="flex items-center gap-3">
                        {/* Phone */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (r.phone) handleCopy(r.phone, `roster-phone-${r.id}`);
                          }}
                          className="flex items-center gap-1 hover:text-ink transition font-mono"
                          title="Click to copy phone"
                        >
                          <Phone size={11} className="text-ink-muted" />
                          <span>{r.phone || "--"}</span>
                          {r.phone && copiedId === `roster-phone-${r.id}` && (
                            <Check size={10} className="text-status-done-ink" />
                          )}
                        </button>

                        {/* Battery */}
                        {r.batteryLevel !== null && r.batteryLevel !== undefined && (
                          <span className="flex items-center gap-1 font-mono">
                            {r.batteryLevel <= 0.2 ? (
                              <BatteryLow size={12} className="text-signal" />
                            ) : (
                              <Battery size={12} className="text-ink-muted" />
                            )}
                            <span className={r.batteryLevel <= 0.2 ? "text-status-act-ink font-semibold" : ""}>
                              {r.batteryLevel <= 1
                                ? `${Math.round(r.batteryLevel * 100)}%`
                                : `${Math.round(r.batteryLevel)}%`}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Active Orders */}
                      {r.activeOrdersCount > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-micro font-medium bg-status-waiting-fill text-status-waiting-ink border border-status-waiting-ink/20">
                          {r.activeOrdersCount} active
                        </span>
                      ) : (
                        <span className="text-micro text-ink-muted">Idle</span>
                      )}
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
