import React from "react";
import { Errand } from "../../../../types/errand";
import { formatErrandId } from "../../../../utils/formatErrandId";
import { formatPeso } from "../../../../utils/format";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/panel/DispatcherBadge";
import { MessageCircle } from "lucide-react";

interface DispatchErrandCardProps {
  errand: Errand;
  isSelected: boolean;
  onClick: () => void;
  unreadChatCount?: number;
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
  unreadChatCount = 0,
}) => {
  const isAvailable = String(errand.status).toUpperCase() === "AVAILABLE";
  const { label: timeLabel, isUrgent } = getRelativeTime(errand.createdAt);

  // Store name resolution
  const primaryStoreName =
    errand.pinpoints?.[0]?.storeName ||
    errand.pabiliDetails?.[0]?.storeCategory ||
    errand.category ||
    "Custom Store";

  const customerDisplayName =
    (errand.customerName || (errand as any).customer?.name || "Customer").trim();

  const extraStops = (errand.pinpoints?.length || 0) > 1 ? errand.pinpoints!.length - 1 : 0;
  const secondaryStoreLabel =
    extraStops > 0
      ? `${primaryStoreName} (+${extraStops} store${extraStops > 1 ? "s" : ""})`
      : primaryStoreName;

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
        "block w-full cursor-pointer rounded-plate px-4 py-3 text-left transition-all duration-150",
        isSelected
          ? "border-l-4 border-l-signal border-t border-r border-b border-board-field bg-board-field shadow-sm"
          : "border border-edge bg-board-plate hover:border-board-trim hover:bg-board-ground/30"
      )}
    >
      {/* Customer and departure clock */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h3
            className={cn(
              "truncate text-title font-bold uppercase tracking-tight",
              isSelected ? "text-board-plate" : "text-ink"
            )}
          >
            {customerDisplayName}
          </h3>
          {unreadChatCount > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-trim px-2 py-0.5 text-micro font-semibold uppercase tracking-[0.06em] shrink-0",
                isSelected
                  ? "bg-signal text-white"
                  : "bg-signal text-white"
              )}
            >
              <MessageCircle size={11} className="shrink-0" />
              <span data-figure className="font-mono tabular-nums">{unreadChatCount} new</span>
            </span>
          )}
        </div>
        <span
          data-figure
          className={cn(
            "shrink-0 font-mono text-label font-semibold tabular-nums",
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

      {/* Route number and store / merchant category */}
      <div className="mt-1 flex items-center justify-between gap-3">
        <span
          data-figure
          className={cn(
            "shrink-0 font-mono text-data font-bold tabular-nums tracking-wide",
            isSelected ? "text-board-plate" : "text-ink"
          )}
        >
          {formatErrandId(errand.id)}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-right text-label font-medium",
            isSelected ? "text-board-plate/90" : "text-ink-muted"
          )}
        >
          {secondaryStoreLabel}
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
              "truncate text-label font-medium",
              isSelected ? "text-board-plate/90" : "text-ink"
            )}
          >
            {errand.deliveryAddress || "Tacurong City"}
          </span>
          <span
            data-figure
            className={cn("text-label font-medium", isSelected ? "text-board-trim" : "text-ink-muted")}
          >
            {itemCount > 0 ? `${itemCount} item${itemCount > 1 ? "s" : ""}` : "General errand"}
            {" · "}
            <span className={cn("font-mono font-semibold tabular-nums", isSelected ? "text-board-plate" : "text-ink")}>
              {formatPeso(totalDisplay)}
            </span>
            {errand.totalCost ? "" : " fee"}
          </span>
        </div>

        <StatusChip status={errand.status} className="shrink-0" />
      </div>
    </button>
  );
};
