import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading and failure, for all six report views.
 *
 * Every view opened with the same two lines:
 *
 *   {error && <p className="text-xs text-status-act-ink">{error}</p>}
 *   {isLoading && <p className="text-xs text-ink-muted">Loading … report...</p>}
 *
 * Three things were wrong with that, in every copy.
 *
 * The failure was a bare line of rose text with no `role="alert"`, no mark and
 * no recovery. Because each view then gates its content on `{data && …}`, a
 * failed report rendered as one small sentence at the top of an otherwise
 * empty page, and the only way out was reloading the portal. `useReport` now
 * exposes `reload`, so the retry is real.
 *
 * The loading state was one line of prose. Operate-mode guidance is explicit
 * that a skeleton shaped like the content beats a message in the middle of a
 * panel, and `src/components/ui/skeleton.tsx` already existed with no importer
 * anywhere in this portal.
 *
 * And both could render at once: `isLoading` and `error` were independent
 * conditions, so a refetch after a failure briefly showed a failure notice
 * above a loading notice. Error is ordered first here, the same ordering
 * PanelState uses, for the same reason.
 */

interface ReportStateProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  /** What failed, in the report's own words. */
  title?: string;
  /** Roughly how many rows the real report shows, so the skeleton matches. */
  loadingRows?: number;
}

export const ReportState: React.FC<ReportStateProps> = ({
  isLoading,
  error,
  onRetry,
  title = "This report did not load",
  loadingRows = 4,
}) => {
  // Ordered before isLoading: a refetch that follows a failure should not
  // replace the failure with a spinner and lose what went wrong.
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-2 rounded-plate border border-edge bg-board-plate px-6 py-12 text-center"
      >
        <AlertTriangle size={20} className="text-status-act-ink" />
        <p className="text-panel text-ink">{title}</p>
        <p className="max-w-sm text-body text-ink-muted">
          {error} Nothing is shown below because nothing arrived, not because the period was quiet.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-plate bg-signal px-4 text-micro uppercase text-board-plate transition-colors hover:bg-signal-deep"
        >
          <RotateCcw size={14} />
          <span>Try again</span>
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading the report</span>
        {/* Shaped like a report: a row of figures, then rows of table. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-plate bg-hairline" />
          ))}
        </div>
        {Array.from({ length: loadingRows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-trim bg-hairline" />
        ))}
      </div>
    );
  }

  return null;
};
