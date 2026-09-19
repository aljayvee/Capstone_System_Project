import React from "react";
import { ShieldAlert, ArrowLeft, Check, Copy, SearchX, Info } from "lucide-react";
import { formatErrandId } from "../../../utils/formatErrandId";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherCard } from "@/components/panel/DispatcherCard";

/**
 * The claim rule, explained at the moment it stops you.
 *
 * Route board build. This screen was carrying most of the craft floor's
 * refusals at once: a 32px icon inside a 64px tinted rounded square wearing
 * an 8px coloured halo (`ring-8 ring-rose-50/60`) AND an inset shadow AND a
 * second badge pinned to its corner, `rounded-3xl` at 24px against a modal
 * range of 16 to 20, `shadow-2xl`, `backdrop-blur-sm`, `font-black`, and a
 * blue claimant chip on a surface with no blue in its palette.
 *
 * It is a modal now: `role="dialog"`, `aria-modal`, a labelled title, focus
 * moved in on mount and Escape wired to the same handler as the button. None
 * of that existed, so the screen could trap a keyboard user completely.
 *
 * The copy also claimed something it could not know. `navigator.clipboard`
 * rejects on an insecure origin or a denied permission, and the old handler
 * flipped to "copied" before the promise settled, so the tick appeared
 * whether or not anything reached the clipboard.
 */

interface UnauthorizedErrandScreenProps {
  errandId: string;
  variant?: "unauthorized" | "not_found";
  claimantName?: string;
  reason?: string;
  onReturnToQueue: () => void;
  /**
   * Somewhere other than the queue to go next. Only render the second button
   * when this genuinely does something different: it and `onReturnToQueue`
   * were both wired to the same `onClose` at the call site, so the screen
   * offered two distinct-looking choices that did the identical thing.
   */
  onViewMyErrands?: () => void;
}

export const UnauthorizedErrandScreen: React.FC<UnauthorizedErrandScreenProps> = ({
  errandId,
  variant = "unauthorized",
  claimantName = "Another dispatcher",
  reason,
  onReturnToQueue,
  onViewMyErrands,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [copyFailed, setCopyFailed] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const formattedId = formatErrandId(errandId);
  const isNotFound = variant === "not_found";

  const defaultReason = isNotFound
    ? "This order could not be found. It may have been removed, or the link may be wrong."
    : "Another dispatcher is handling this order right now.";

  const displayReason = reason || defaultReason;

  React.useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onReturnToQueue();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onReturnToQueue]);

  const handleCopyId = async () => {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(errandId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // An insecure origin or a denied permission. Saying nothing would leave
      // the reader believing they had the number.
      setCopyFailed(true);
    }
  };

  return (
    <div
      data-surface="dispatch"
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-board-field-deep/70 p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unauthorized-title"
        tabIndex={-1}
        className="w-full max-w-lg animate-scale-up space-y-5 rounded-modal border border-edge bg-board-plate p-6 text-center shadow-plate outline-none sm:p-8"
      >
        {/* A bare mark. It was a tinted square in a coloured halo with a second
            badge clipped to its corner: three pieces of chrome to say one
            thing the heading says better. */}
        {isNotFound ? (
          <SearchX size={28} className="mx-auto text-status-waiting-ink" />
        ) : (
          <ShieldAlert size={28} className="mx-auto text-status-act-ink" />
        )}

        <div className="space-y-1.5">
          <h3 id="unauthorized-title" className="text-title text-ink">
            {isNotFound ? "Order not found" : "Already being handled"}
          </h3>
          <p
            className={
              isNotFound
                ? "text-label text-status-waiting-ink"
                : "text-label text-status-act-ink"
            }
          >
            {isNotFound
              ? "This link does not match any order"
              : "Only the assigned dispatcher can open this"}
          </p>
          <p className="mx-auto max-w-md text-body text-ink-muted">{displayReason}</p>
        </div>

        <DispatcherCard.Region padding="sm" className="space-y-2 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="text-micro uppercase text-ink-muted">Order</span>
            <button
              type="button"
              onClick={() => void handleCopyId()}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-trim border border-edge bg-board-plate px-2.5 font-mono text-label text-ink transition-colors hover:border-board-field"
              aria-label={copied ? "Order number copied" : `Copy order number ${formattedId}`}
            >
              <span data-figure>{formattedId}</span>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          {copyFailed ? (
            <p role="alert" className="text-label text-status-act-ink">
              The clipboard is not available here. The number is {formattedId}.
            </p>
          ) : null}

          {!isNotFound && (
            <div className="flex items-center justify-between gap-2 border-t border-hairline pt-2">
              <span className="text-micro uppercase text-ink-muted">Assigned to</span>
              <span className="truncate text-label text-ink">{claimantName}</span>
            </div>
          )}

          <p className="flex items-start gap-1.5 border-t border-hairline pt-2 text-body text-ink-muted">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              {isNotFound
                ? "Check the link from the customer chat, or go back to the queue and pick an active order."
                : "This keeps two dispatchers from editing the same order at once."}
            </span>
          </p>
        </DispatcherCard.Region>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <DispatcherButton
            type="button"
            variant="primary"
            size="md"
            className="w-full justify-center sm:flex-1"
            icon={<ArrowLeft size={15} />}
            onClick={onReturnToQueue}
          >
            Back to the queue
          </DispatcherButton>

          {onViewMyErrands && (
            <DispatcherButton
              type="button"
              variant="secondary"
              size="md"
              className="w-full justify-center sm:flex-1"
              onClick={onViewMyErrands}
            >
              My active errands
            </DispatcherButton>
          )}
        </div>
      </div>
    </div>
  );
};
