import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { useRiderFleetPresence, type RiderFleetMember } from "../../../../hooks/useRiderFleetPresence";
import { copy } from "./copy";

/**
 * Who is around to take this errand, under "Assign a rider".
 *
 * Information only. The server still chooses (repeat customer first, then the
 * nearest by road), so the rows are not buttons: a list that looked pickable
 * and was then overruled would be worse than no list. What it answers is the
 * question a dispatcher has before pressing Assign: is anyone free at all.
 *
 * Mounted only while step 3 is on screen. The roster hook is shared across the
 * portal (one socket, one in-flight fetch), so this adds no second connection.
 */

/**
 * The most errands one rider carries at once. Mirrors the server's
 * MAX_ACTIVE_ERRANDS_PER_RIDER (errandService.ts), which is what makes a full
 * rider ineligible; change both together.
 */
export const RIDER_ERRAND_CAP = 3;

/** Presences that can take, or are working, an errand. */
const AROUND = new Set(["AVAILABLE_ONLINE", "ON_DELIVERY"]);

/**
 * The order a dispatcher reads the riders in: Available first, then the least
 * loaded, and full riders last, since the server will not pick them anyway.
 * Name breaks ties so rows hold still across the roster's 5-second refresh.
 *
 * Pure, and given only riders who are Available or On delivery. Sorts a copy:
 * the roster array belongs to the shared hook.
 */
export function rankRidersForList(riders: RiderFleetMember[]): RiderFleetMember[] {
  const isFull = (r: RiderFleetMember) => r.activeOrdersCount >= RIDER_ERRAND_CAP;
  const isAvailable = (r: RiderFleetMember) => r.presence === "AVAILABLE_ONLINE";
  return [...riders].sort(
    (a, b) =>
      Number(isFull(a)) - Number(isFull(b)) ||
      Number(isAvailable(b)) - Number(isAvailable(a)) ||
      a.activeOrdersCount - b.activeOrdersCount ||
      a.name.localeCompare(b.name)
  );
}

export function RiderAvailabilityList() {
  const { riders, isLoading, loadError, reload } = useRiderFleetPresence();

  const around = useMemo(
    () => rankRidersForList(riders.filter((r) => AROUND.has(r.presence))),
    [riders]
  );

  // Loading: the first fetch, before any roster exists.
  if (isLoading && riders.length === 0) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading riders">
        <Skeleton className="h-10 w-full rounded-plate bg-hairline" />
        <Skeleton className="h-10 w-full rounded-plate bg-hairline" />
        <Skeleton className="h-10 w-4/5 rounded-plate bg-hairline" />
      </div>
    );
  }

  // Error with nothing to show. A failed refresh over a roster already on
  // screen keeps the roster: stale under a warning beats an empty list.
  if (loadError && riders.length === 0) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-plate bg-status-waiting-fill px-3 py-2.5">
        <p className="m-0 text-label text-status-waiting-ink">{copy.stage5.rosterFailed}</p>
        <DispatcherButton type="button" size="sm" variant="secondary" icon={<RefreshCw size={13} />} onClick={reload}>
          {copy.stage5.rosterRetry}
        </DispatcherButton>
      </div>
    );
  }

  if (around.length === 0) {
    return (
      <p className="m-0 rounded-plate bg-board-ground px-3 py-2.5 text-body text-ink-muted">
        {copy.stage5.rosterEmpty}
      </p>
    );
  }

  return (
    <section aria-label={copy.stage5.rosterTitle(around.length)}>
      <div className="flex items-baseline justify-between gap-2 pb-1.5">
        <h4 className="m-0 text-micro font-medium uppercase text-ink-muted">
          {copy.stage5.rosterTitle(around.length)}
        </h4>
        {loadError && (
          <button
            type="button"
            onClick={reload}
            className="cursor-pointer text-micro text-status-waiting-ink underline-offset-2 hover:underline"
          >
            {copy.stage5.rosterRetry}
          </button>
        )}
      </div>
      {/* Overflow: a long fleet scrolls inside the step rather than pushing
          the Assign button off the screen. */}
      <ul className="m-0 max-h-64 list-none divide-y divide-hairline overflow-y-auto rounded-plate border border-edge bg-board-plate p-0">
        {around.map((rider) => {
          const onDelivery = rider.presence === "ON_DELIVERY";
          const isFull = rider.activeOrdersCount >= RIDER_ERRAND_CAP;
          return (
            <li key={rider.id} className="flex items-center gap-2.5 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-body text-ink" title={rider.name}>
                {rider.name}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-micro font-medium",
                  onDelivery
                    ? "bg-status-waiting-fill text-status-waiting-ink"
                    : "bg-status-done-fill text-status-done-ink"
                )}
              >
                {onDelivery ? copy.stage5.rosterOnDelivery : copy.stage5.rosterAvailable}
              </span>
              <span
                data-figure
                className={cn(
                  "w-24 shrink-0 text-right text-label tabular-nums",
                  isFull ? "text-status-act-ink" : "text-ink-muted"
                )}
              >
                {isFull
                  ? copy.stage5.rosterFull
                  : copy.stage5.rosterLoad(rider.activeOrdersCount, RIDER_ERRAND_CAP)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
