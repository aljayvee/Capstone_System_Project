import React, { useState, useMemo } from "react";
import { Bike, BatteryLow, Phone, Package, WifiOff, Moon, Eye, EyeOff, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import LiveFleetMap from "../../../components/LiveFleetMap";
import type { RiderFleetMember, RiderPresenceState } from "../../../hooks/useRiderFleetPresence";
import { RIDER_STATUS_THEMES } from "../../../constants/riderPresence";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelState } from "@/components/panel/PanelState";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherSearchField } from "@/components/panel/DispatcherSearchField";

interface RiderFleetRosterProps {
  riders: RiderFleetMember[];
}

const TACURONG_CENTER = { lat: 6.671, lng: 124.6644 };

/**
 * One row per filter instead of five hand-written buttons.
 *
 * The originals were 13 near-identical lines each, differing only in colour,
 * icon, label and count, and four of them carried a coloured circle emoji
 * (green, orange, red, white) beside a lucide icon that already said the same
 * thing. Emoji as structural icons is banned outright by CLAUDE.md, and the
 * presence colour is already carried by RIDER_STATUS_THEMES.
 */
const FILTERS: { id: RiderPresenceState | "ALL"; label: string; icon: React.ReactNode }[] = [
  { id: "ALL", label: "All riders", icon: <Users size={14} /> },
  { id: "AVAILABLE", label: "Ready", icon: <Bike size={14} /> },
  { id: "BUSY", label: "Delivering", icon: <Package size={14} /> },
  { id: "DISCONNECTED", label: "No signal", icon: <WifiOff size={14} /> },
  { id: "OFF_DUTY", label: "Off duty", icon: <Moon size={14} /> },
];

function batteryPercent(level: number | null | undefined): number | null {
  if (level === null || level === undefined) return null;
  return level <= 1 ? Math.round(level * 100) : Math.round(level);
}

export const RiderFleetRoster: React.FC<RiderFleetRosterProps> = ({ riders }) => {
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<RiderPresenceState | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hideOffline, setHideOffline] = useState<boolean>(false);

  const filteredRiders = useMemo(() => {
    return riders.filter((r) => {
      if (statusFilter !== "ALL" && r.presence !== statusFilter) return false;
      if (hideOffline && r.presence === "OFF_DUTY") return false;
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

  const counts: Record<string, number> = {
    ALL: riders.length,
    AVAILABLE: riders.filter((r) => r.presence === "AVAILABLE").length,
    BUSY: riders.filter((r) => r.presence === "BUSY").length,
    DISCONNECTED: riders.filter((r) => r.presence === "DISCONNECTED").length,
    OFF_DUTY: riders.filter((r) => r.presence === "OFF_DUTY").length,
  };

  const hasFilters = statusFilter !== "ALL" || hideOffline || searchQuery.trim().length > 0;

  // Only ever a rider the current filter admits. The old fallback chain ended
  // in `riders[0]`, so the floating detail card could describe a rider the
  // filter had excluded while the roster beside it said "no riders match your
  // criteria". Two regions of one panel disagreeing about the same fleet.
  const selectedRider =
    filteredRiders.find((r) => r.id === selectedRiderId) || filteredRiders[0] || null;

  const selectedTheme = selectedRider
    ? RIDER_STATUS_THEMES[selectedRider.presence] || RIDER_STATUS_THEMES.AVAILABLE
    : RIDER_STATUS_THEMES.AVAILABLE;

  const resetFilters = () => {
    setStatusFilter("ALL");
    setHideOffline(false);
    setSearchQuery("");
  };

  return (
    <PanelShell
      title="Fleet tracking"
      figure={{
        label: "Ready",
        value: `${counts.AVAILABLE}/${counts.ALL}`,
      }}
      detail={`${counts.AVAILABLE} of ${counts.ALL} ready for dispatch`}
      controls={
        <div className="flex flex-col gap-2 rounded-plate border border-edge bg-board-plate p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
              const isActive = statusFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex min-h-9 cursor-pointer items-center gap-1.5 rounded-trim px-3 text-micro uppercase transition-colors",
                    isActive
                      ? "bg-board-field text-board-plate"
                      : "bg-board-ground text-ink-muted hover:text-ink"
                  )}
                >
                  {f.icon}
                  <span>{f.label}</span>
                  <span data-figure className="tabular-nums">
                    {counts[f.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 md:w-72">
            <DispatcherSearchField
              aria-label="Search riders by name, phone or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rider or phone"
            />
            <DispatcherButton
              variant={hideOffline ? "field" : "secondary"}
              size="sm"
              iconOnly
              aria-label={hideOffline ? "Show off-duty riders" : "Hide off-duty riders"}
              icon={hideOffline ? <EyeOff size={15} /> : <Eye size={15} />}
              onClick={() => setHideOffline(!hideOffline)}
            />
          </div>
        </div>
      }
    >
      <div className="grid h-full min-h-0 gap-3 lg:grid-cols-3">
        {/* The map. A concrete height below lg, where the grid stacks, and the
            flex chain above it. Both columns used to be h-[560px] regardless
            of the window. */}
        <div className="relative min-h-[320px] overflow-hidden rounded-plate border border-edge bg-board-plate lg:col-span-2 lg:min-h-0">
          <LiveFleetMap
            riders={riders}
            center={TACURONG_CENTER}
            selectedRiderId={selectedRider?.id}
            onSelectRider={(riderId) => setSelectedRiderId(riderId)}
            hideOffline={hideOffline}
            filterStatus={statusFilter}
          />

          {selectedRider && (
            // `left-4` with `w-full` made this 100% of the map's width starting
            // 16px in, so it overflowed the map by 16px on every screen. Pinned
            // on both edges and capped instead.
            <div className="absolute bottom-3 left-3 right-3 z-20 max-w-sm space-y-2 rounded-plate border border-edge bg-board-plate p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-trim text-board-plate"
                    style={{ backgroundColor: selectedTheme.primaryColor }}
                  >
                    <Bike size={16} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-panel text-ink">{selectedRider.name}</h3>
                    <p data-figure className="font-mono text-label text-ink-muted">
                      #{selectedRider.id}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-0.5 text-micro uppercase",
                    selectedTheme.badgeClassName
                  )}
                >
                  {selectedTheme.badgeLabel}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-2 border-t border-hairline pt-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Phone size={12} className="shrink-0 text-ink-muted" />
                  <dd data-figure className="truncate text-label text-ink">
                    {selectedRider.phone || "No number"}
                  </dd>
                </div>
                <div className="min-w-0 text-right">
                  <dt className="sr-only">Active errands</dt>
                  <dd data-figure className="text-label text-ink">
                    {selectedRider.activeOrdersCount} on hand
                  </dd>
                </div>
              </dl>

              {(() => {
                const pct = batteryPercent(selectedRider.batteryLevel);
                if (pct === null) return null;
                const low = pct <= 20;
                return (
                  <div className="flex items-center justify-between border-t border-hairline pt-2">
                    <span className="flex items-center gap-1.5 text-label text-ink-muted">
                      {low ? <BatteryLow size={14} className="text-status-act-ink" /> : null}
                      Battery
                    </span>
                    <span
                      data-figure
                      className={cn(
                        "font-mono text-label",
                        low ? "text-status-act-ink" : "text-ink"
                      )}
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* The roster */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-plate border border-edge bg-board-plate">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-hairline px-3 py-2.5">
            <h3 className="text-panel text-ink">Roster</h3>
            <span data-figure className="text-label text-ink-muted tabular-nums">
              {filteredRiders.length} of {counts.ALL}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <PanelState
              isEmpty={filteredRiders.length === 0}
              hasFilters={hasFilters}
              onResetFilters={resetFilters}
              emptyTitle="No riders registered"
              emptyBody="Riders appear here once they are added and their handset checks in."
              loadingRows={4}
            >
              <div className="space-y-1.5">
                {filteredRiders.map((r) => {
                  const isSelected = r.id === selectedRider?.id;
                  const theme = RIDER_STATUS_THEMES[r.presence] || RIDER_STATUS_THEMES.AVAILABLE;
                  const pct = batteryPercent(r.batteryLevel);

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRiderId(r.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-trim p-2.5 text-left transition-colors",
                        isSelected ? "bg-board-field" : "hover:bg-board-ground"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-trim text-micro text-board-plate"
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          {r.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate text-body",
                              isSelected ? "text-board-plate" : "text-ink"
                            )}
                          >
                            {r.name}
                          </p>
                          <p
                            data-figure
                            className={cn(
                              "truncate font-mono text-label",
                              isSelected ? "text-board-trim" : "text-ink-muted"
                            )}
                          >
                            #{r.id}
                            {r.phone ? ` · ${r.phone}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-micro uppercase",
                            theme.badgeClassName
                          )}
                        >
                          {theme.badgeLabel}
                        </span>
                        {pct !== null ? (
                          <span
                            data-figure
                            className={cn(
                              "font-mono text-label",
                              pct <= 20
                                ? "text-status-act-ink"
                                : isSelected
                                  ? "text-board-trim"
                                  : "text-ink-muted"
                            )}
                          >
                            {pct}%
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </PanelState>
          </div>
        </div>
      </div>
    </PanelShell>
  );
};
