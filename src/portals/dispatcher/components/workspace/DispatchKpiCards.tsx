import React from "react";
import { cn } from "@/lib/utils";

interface DispatchBoardStripProps {
  /** Runs waiting to be claimed. Same array the Incoming segment counts. */
  awaitingCount: number;
  /** Runs in motion. Same array the Active segment counts. */
  activeCount: number;
  totalRiders: number;
  onlineRiders: number;
  /** True while the board is still loading, so figures are not asserted yet. */
  isLoading?: boolean;
  /** True when the board failed to load and these figures may be stale. */
  isStale?: boolean;
}

/**
 * The board's standing figures, as one painted strip.
 *
 * This replaces three cards that were byte-identical apart from their icon,
 * tint and label, in a `grid-cols-3`. That arrangement is two of the craft
 * floor's named refusals at once: same-size cards of icon plus heading plus
 * text as the page structure, and the hero-metric template of big number,
 * small label, supporting stat, accent. It was also the single most
 * category-generic element in the console, three frosted-glass tiles under a
 * source comment that literally read "Frosted Glass Apple Design", and
 * `backdrop-blur-md` on each one breaches the flat-surface invariant.
 *
 * A route board does not put each figure in its own box. It paints them on one
 * panel, separated by trim, at a size that reads from across the room.
 *
 * Two honesty fixes ride along. The counts are now passed in from the same
 * arrays the segment switcher counts, rather than recomputed from a second
 * copy of the status filter, so the strip and the segments cannot disagree.
 * And the old "In Progress" and "Fleet Active" chips rendered unconditionally,
 * including at zero: a board with no riders online still said "Fleet Active"
 * in confident emerald.
 */

function Figure({
  label,
  value,
  detail,
  emphasis = false,
  isLoading = false,
  isStale = false,
}: {
  label: string;
  value: string;
  detail?: string;
  emphasis?: boolean;
  isLoading?: boolean;
  isStale?: boolean;
}) {
  /**
   * A zero we never actually received is not a zero.
   *
   * When the load failed, a non-zero figure is worth keeping and saying so:
   * it is the last number anyone had. A zero is different, because a failed
   * first load and a genuinely empty board produce the same 0 here, and the
   * band two inches above this one shows "--" for exactly that case. Two
   * figures on the same header disagreeing about how to say "unknown" is the
   * inconsistency this console was rebuilt to stop.
   */
  const unknown = isLoading || (isStale && value === "0");
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2 sm:gap-1 sm:px-5 sm:py-2.5">
      <span className="text-micro uppercase text-board-trim">{label}</span>
      {/* Board scale is for reading across a room, which a phone held at arm's
          length is not. Three figures at 34px plus their detail lines filled
          most of a 390x844 screen before the board itself appeared. */}
      <span
        data-figure
        className={cn(
          "text-title tabular-nums sm:text-board",
          emphasis ? "text-signal-on-field" : "text-board-plate",
          unknown && "text-board-trim"
        )}
      >
        {unknown ? "--" : value}
      </span>
      {detail && !unknown ? (
        <span className="hidden truncate text-label text-board-trim sm:block">{detail}</span>
      ) : null}
    </div>
  );
}

export const DispatchKpiCards: React.FC<DispatchBoardStripProps> = ({
  awaitingCount,
  activeCount,
  totalRiders,
  onlineRiders,
  isLoading = false,
  isStale = false,
}) => {
  return (
    <div
      data-on-field
      className="shrink-0 overflow-hidden rounded-plate bg-board-field shadow-field"
    >
      <div className="flex divide-x divide-field-line py-1">
        {/* Emphasised only when something is actually waiting: red means "you
            must act" on this surface, so an empty queue must not wear it. */}
        <Figure
          label="Waiting to be claimed"
          value={String(awaitingCount)}
          detail={awaitingCount === 0 ? "Nothing waiting" : "Oldest first on the board"}
          emphasis={awaitingCount > 0}
          isLoading={isLoading}
          isStale={isStale}
        />
        <Figure
          label="Runs in motion"
          value={String(activeCount)}
          detail={activeCount === 0 ? "None out" : "Riders on the road"}
          isLoading={isLoading}
          isStale={isStale}
        />
        <Figure
          label="Riders on duty"
          value={totalRiders === 0 ? "0" : `${onlineRiders}/${totalRiders}`}
          detail={
            totalRiders === 0
              ? "No riders registered"
              : onlineRiders === 0
                ? "Nobody is online"
                : `${onlineRiders} ready to take a run`
          }
          isLoading={isLoading}
          isStale={isStale}
        />
      </div>

      {isStale ? (
        <p
          role="status"
          className="border-t border-field-line px-4 py-2 text-label text-board-trim sm:px-5"
        >
          These figures could not be refreshed. Anything showing is the last
          number anyone had, and a dash means there is none to show.
        </p>
      ) : null}
    </div>
  );
};
