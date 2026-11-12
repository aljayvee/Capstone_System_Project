import * as React from "react";
import { cn } from "@/lib/utils";
import type { RiderFleetMember } from "@/hooks/useRiderFleetPresence";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { Bike, Battery, BatteryLow, WifiOff, ArrowRight, ShieldAlert, Circle } from "lucide-react";

interface DispatcherFleetMatrixProps {
  riders: RiderFleetMember[];
  onNavigateTab: (tab: string) => void;
}

function formatElapsedBeacon(lastBeaconAt: number | null): string {
  if (!lastBeaconAt) return "No beacon";
  const elapsedSecs = Math.max(0, Math.round((Date.now() - lastBeaconAt) / 1000));
  if (elapsedSecs < 60) return `${elapsedSecs}s ago`;
  const elapsedMins = Math.round(elapsedSecs / 60);
  if (elapsedMins < 60) return `${elapsedMins}m ago`;
  const elapsedHours = Math.round(elapsedMins / 60);
  return `${elapsedHours}h ago`;
}

function parseBattery(level: number | null | undefined): number | null {
  if (level == null) return null;
  return level <= 1 ? Math.round(level * 100) : Math.round(level);
}

export const DispatcherFleetMatrix: React.FC<DispatcherFleetMatrixProps> = ({
  riders,
  onNavigateTab,
}) => {
  // Prioritize active & online riders first
  const sortedRiders = React.useMemo(() => {
    return [...riders].sort((a, b) => {
      const rank = (r: RiderFleetMember) => {
        if (r.presence === "AVAILABLE_SIGNAL_LOST") return 1;
        if (r.presence === "ON_DELIVERY") return 2;
        if (r.presence === "AVAILABLE_ONLINE") return 3;
        return 4;
      };
      return rank(a) - rank(b);
    });
  }, [riders]);

  return (
    <div className="flex flex-col h-full bg-board-plate border border-edge rounded-plate p-4 shadow-plate">
      <div className="flex items-center justify-between pb-3 border-b border-hairline">
        <div>
          <h2 className="text-label uppercase tracking-[0.06em] font-bold text-ink">
            Riders
          </h2>
        </div>
        <span className="font-mono text-micro px-2 py-0.5 rounded-full bg-board-ground text-ink font-bold border border-edge">
          {riders.length} total
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-3 space-y-2">
        {riders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <Bike size={24} className="text-ink-muted mb-2 opacity-50" />
            <p className="text-label font-medium text-ink-muted">No riders registered</p>
          </div>
        ) : (
          sortedRiders.slice(0, 8).map((rider) => {
            const battery = parseBattery(rider.batteryLevel);
            const isLowBattery = battery != null && battery <= 20;
            const isSignalLost = rider.presence === "AVAILABLE_SIGNAL_LOST";
            const isOnDelivery = rider.presence === "ON_DELIVERY";
            const isAvailable = rider.presence === "AVAILABLE_ONLINE";

            return (
              <div
                key={rider.id}
                className={cn(
                  "flex items-center justify-between gap-2.5 p-2.5 rounded-trim border transition-colors",
                  isSignalLost
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-board-ground/60 border-hairline hover:border-board-trim"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="size-8 rounded-full bg-board-ground border border-edge flex items-center justify-center text-label font-bold text-ink">
                      {rider.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white ring-1",
                        isAvailable
                          ? "bg-emerald-500 ring-emerald-500"
                          : isOnDelivery
                            ? "bg-blue-500 ring-blue-500"
                            : isSignalLost
                              ? "bg-amber-500 ring-amber-500 animate-pulse"
                              : "bg-slate-400 ring-slate-400"
                      )}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-label font-bold text-ink truncate leading-tight">
                      {rider.name}
                    </p>
                    <p className="text-micro text-ink-muted flex items-center gap-1.5 mt-0.5">
                      <span>{rider.phone || "No phone"}</span>
                      <span>•</span>
                      <span className="font-mono tabular-nums">
                        {formatElapsedBeacon(rider.lastBeaconAt)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {/* Presence Capsule */}
                  <span
                    className={cn(
                      "text-micro font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                      isAvailable
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                        : isOnDelivery
                          ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
                          : isSignalLost
                            ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                    )}
                  >
                    {isAvailable
                      ? "Available"
                      : isOnDelivery
                        ? "On Run"
                        : isSignalLost
                          ? "Signal Lost"
                          : "Offline"}
                  </span>

                  {/* Battery Level */}
                  {battery != null ? (
                    <span
                      title={`Battery: ${battery}%`}
                      className={cn(
                        "inline-flex items-center gap-1 font-mono text-micro font-bold tabular-nums",
                        isLowBattery ? "text-signal" : "text-ink-muted"
                      )}
                    >
                      {isLowBattery ? (
                        <BatteryLow size={13} className="shrink-0 text-signal animate-pulse" />
                      ) : (
                        <Battery size={13} className="shrink-0 text-ink-muted" />
                      )}
                      {battery}%
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-3 border-t border-hairline mt-2">
        <DispatcherButton
          variant="secondary"
          size="sm"
          className="w-full justify-center"
          icon={<ArrowRight size={13} />}
          onClick={() => onNavigateTab("riders")}
        >
          View Riders & Map
        </DispatcherButton>
      </div>
    </div>
  );
};
