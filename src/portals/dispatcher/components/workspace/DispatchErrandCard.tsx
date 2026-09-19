import React from "react";
import { Errand } from "../../../../types/errand";
import { formatErrandId } from "../../../../utils/formatErrandId";
import { formatPeso } from "../../../../utils/format";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/panel/DispatcherBadge";

interface DispatchErrandCardProps {
  errand: Errand;
  isSelected: boolean;
  onClick: () => void;
}

function getRelativeTime(createdAtString: string): { label: string; isUrgent: boolean } {
  if (!createdAtString) return { label: "Just now", isUrgent: false };
  const created = new Date(createdAtString).getTime();
  const now = Date.now();
  const diffMinutes = Math.floor((now - created) / 60000);

  if (diffMinutes < 1) return { label: "Just now", isUrgent: false };
  if (diffMinutes < 60) {
    return {
      label: `${diffMinutes}m ago`,
      isUrgent: diffMinutes >= 5,
    };
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return {
      label: `${diffHours}h ago`,
      isUrgent: true,
    };
  }
  return { label: "1d+ ago", isUrgent: true };
}

/**
 * One run on the board.
 *
 * Reads destination first, the way a route board does: the store is what the
 * dispatcher is looking for, so it leads at a size that survives a glance,
 * with the route number under it and the departure clock opposite.
 *
 * It is a real `<button>` now. It was a `<div role="button" tabIndex={0}>`
 * with a hand-rolled Enter and Space handler, which is a reimplementation of
 * what the element already does, and it received no focus styling from
 * anywhere in the console.
 *
 * The selected run inverts onto the navy field instead of being tinted blue.
 * A board marks its active row by lighting it, and inversion gives the stream
 * a hierarchy that a 4% background tint never had.
 *
 * Status comes from the one status table. This card used to decide its own
 * colours with a chain that painted AVAILABLE amber, IN_TRANSIT and IN ROUTE
 * blue, DELIVERED emerald and everything else slate, then printed the raw
 * value: `String(errand.status)`, which is how `DOING ERRAND` and `PASSING BY`
 * reached a dispatcher's eyes.
 */
export const DispatchErrandCard: React.FC<DispatchErrandCardProps> = ({
  errand,
  isSelected,
  onClick,
}) => {
  const isAvailable = String(errand.status).toUpperCase() === "AVAILABLE";
  const { label: timeLabel, isUrgent } = getRelativeTime(errand.createdAt);

  // Store name resolution
  const primaryStoreName =
    errand.pinpoints?.[0]?.storeName ||
    errand.pabiliDetails?.[0]?.storeCategory ||
    errand.category ||
    "Custom Store";

  const itemCount = errand.pabiliDetails?.length || errand.pabiliItemRequests?.length || 0;

  const totalDisplay =
    errand.totalCost || Number(errand.estimatedCost || 0) + Number(errand.deliveryFee || 0);

  // Only an unclaimed run that has been sitting is urgent. A run already in
  // motion has someone on it, so its age is information, not a demand.
  const isWaitingTooLong = isAvailable && isUrgent;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "block w-full cursor-pointer rounded-plate px-4 py-3 text-left transition-colors duration-150",
        isSelected
          ? "bg-board-field"
          : "border border-edge bg-board-plate hover:border-board-trim"
      )}
    >
      {/* Destination and departure clock */}
      <div className="flex items-baseline justify-between gap-3">
        <h3
          className={cn(
            "min-w-0 flex-1 truncate text-title uppercase",
            isSelected ? "text-board-plate" : "text-ink"
          )}
        >
          {primaryStoreName}
        </h3>
        <span
          data-figure
          className={cn(
            "shrink-0 text-label tabular-nums",
            isWaitingTooLong
              ? isSelected
                ? "text-signal-on-field"
                : "text-status-act-ink"
              : isSelected
                ? "text-board-trim"
                : "text-ink-muted"
          )}
        >
          {timeLabel}
        </span>
      </div>

      {/* Route number, customer, and what it comes to */}
      <div className="mt-1 flex items-center justify-between gap-3">
        <span
          data-figure
          className={cn(
            "shrink-0 font-mono text-data",
            isSelected ? "text-board-plate" : "text-ink"
          )}
        >
          {formatErrandId(errand.id)}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-right text-label",
            isSelected ? "text-board-plate/90" : "text-ink-muted"
          )}
        >
          {errand.customerName || "Customer"}
        </span>
      </div>

      {/* Drop-off and state. Separated by a rule rather than a second box. */}
      <div
        className={cn(
          "mt-2.5 flex items-center justify-between gap-3 border-t pt-2.5",
          isSelected ? "border-field-line" : "border-hairline"
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cn(
              "truncate text-label",
              isSelected ? "text-board-plate/90" : "text-ink"
            )}
          >
            {errand.deliveryAddress || "Tacurong City"}
          </span>
          <span
            data-figure
            className={cn("text-label", isSelected ? "text-board-trim" : "text-ink-muted")}
          >
            {itemCount > 0 ? `${itemCount} item${itemCount > 1 ? "s" : ""}` : "General errand"}
            {" · "}
            {formatPeso(totalDisplay)}
          </span>
        </div>

        <StatusChip status={errand.status} className="shrink-0" />
      </div>
    </button>
  );
};
