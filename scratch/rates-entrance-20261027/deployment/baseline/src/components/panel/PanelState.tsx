import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DispatcherButton } from "./DispatcherButton";

/**
 * Loading, failed and empty, decided in one place.
 *
 * This is the component that makes the console's worst defect structurally
 * impossible rather than something to remember.
 *
 * What it was. `useDispatcherPortal` computed `isLoading` and returned it, and
 * the portal never destructured it, so no panel ever received it. `fetchOrders`
 * caught its own failure with a `console.warn` and left `errands` empty.
 * `useOpenExceptions` had no try/catch at all. The result was that a dead API
 * and a genuinely quiet shift rendered identically, and the words the console
 * chose for that state were "All Caught Up" under a green check, "No Active
 * Errands In Progress", and, over unreconciled money, "Everything reconciles.
 * Nothing is waiting on you."
 *
 * ABSENCE HAS TWO SPELLINGS ON THIS SURFACE AND ONLY TWO.
 * `"--"` means no value: either nobody received one or the record does not
 * carry one. `"…"` means the value is still arriving. A `0` means somebody
 * counted zero. The reason an absence is absent belongs in the copy beside it
 * and in a `title`, NOT in a third glyph - the Owner portal briefly spelled
 * the same fact both `"--"` and an em dash, six times and three times in one
 * file, and no reader could have told the two apart on sight anyway.
 *
 * A panel cannot make that mistake through this component: an `error` outranks
 * `isEmpty`, so there is no code path in which a failure renders as reassurance.
 *
 * Loading is skeleton rows shaped like the content, not a spinner in the middle
 * of a panel. `src/components/ui/skeleton.tsx` already existed and no
 * dispatcher file had ever imported it.
 */

interface PanelStateProps {
  isLoading?: boolean;
  /** Any truthy value is a failure. A string is shown to the dispatcher. */
  error?: string | null | false;
  onRetry?: () => void;
  isEmpty?: boolean;
  /** Changes the empty copy and offers the reset, rather than implying no data exists. */
  hasFilters?: boolean;
  onResetFilters?: () => void;
  /** What is missing, in the product's own words. */
  emptyTitle?: string;
  emptyBody?: string;
  /** What failed, in the product's own words. The recovery is the retry. */
  errorTitle?: string;
  /**
   * What the failure means, when the hook's own message would only restate the
   * title. Optional, and omitting it keeps the previous behaviour exactly -
   * the `error` string becomes the body - so no existing caller changes.
   *
   * Worth having because the fallback silently produces a panel that says the
   * same sentence twice when a caller's errorTitle happens to match the
   * message its hook produces, which is easy to do and invisible in review.
   */
  errorBody?: string;
  /** Roughly how many rows the real content shows, so the skeleton matches it. */
  loadingRows?: number;
  children: React.ReactNode;
}

function StateFrame({ children }: { children: React.ReactNode }) {
  return (
    // Top-aligned, not centred in the scroller. Centring put one sentence in
    // the middle of ~700px of empty bone on a 1440 screen, which reads as a
    // layout accident rather than as the panel telling you something.
    <div className="flex flex-col items-center px-6 pb-10 pt-12 text-center">{children}</div>
  );
}

export function PanelState({
  isLoading = false,
  error = null,
  onRetry,
  isEmpty = false,
  hasFilters = false,
  onResetFilters,
  emptyTitle = "Nothing here yet",
  emptyBody,
  errorTitle = "This did not load",
  errorBody,
  loadingRows = 5,
  children,
}: PanelStateProps) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading</span>
        {Array.from({ length: loadingRows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-plate bg-hairline" />
        ))}
      </div>
    );
  }

  // Ordered before isEmpty on purpose. A failed request is not an empty result,
  // and this ordering is the reason it can never be reported as one.
  if (error) {
    return (
      <StateFrame>
        {/* A bare mark, not a tinted rounded square behind an icon. That
            square is the same object as the tinted icon chip the craft floor
            refuses, and on a surface whose whole argument is that structure
            comes from line and rhythm, a box drawn purely to hold an icon is
            the one thing it cannot afford. */}
        <AlertTriangle size={20} className="mb-2.5 text-status-act-ink" />
        <p className="text-panel text-ink">{errorTitle}</p>
        <p className="mt-1.5 max-w-sm text-body text-ink-muted">
          {errorBody ??
            (typeof error === "string" && error
              ? error
              : "The server did not answer. What you see here may be incomplete, so treat it as stale until it loads.")}
        </p>
        {onRetry ? (
          <DispatcherButton
            variant="primary"
            size="sm"
            className="mt-4"
            icon={<RotateCcw size={14} />}
            onClick={onRetry}
          >
            Try again
          </DispatcherButton>
        ) : null}
      </StateFrame>
    );
  }

  if (isEmpty) {
    return (
      <StateFrame>
        <p className="text-panel text-ink">
          {hasFilters ? "Nothing matches these filters" : emptyTitle}
        </p>
        <p className="mt-1.5 max-w-sm text-body text-ink-muted">
          {hasFilters
            ? "Nothing has been removed. The filters above are hiding the rest."
            : emptyBody}
        </p>
        {hasFilters && onResetFilters ? (
          <DispatcherButton variant="secondary" size="sm" className="mt-4" onClick={onResetFilters}>
            Clear the filters
          </DispatcherButton>
        ) : null}
      </StateFrame>
    );
  }

  return <>{children}</>;
}
