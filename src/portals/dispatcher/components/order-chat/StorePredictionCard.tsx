import { AlertTriangle, RotateCw, Store, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import type { ApiPredictedStore, ApiStorePrediction } from "../../../../services/apiService";
import type { PredictionAnswer, PredictionStatus } from "./hooks/useStorePredictions";

/**
 * "These are the stores for this list. Is this accurate?"
 *
 * The step 3 end of the store predictor (server storePredictionService). It
 * proposes up to three stores for the step 1 items and asks the dispatcher to
 * judge it, rather than pinning anything by itself: a wrong shop sends a rider
 * across town, so the machine suggests and a person decides.
 *
 * "Yes" pins them. "No" steps aside so the dispatcher pins the right ones, and
 * says plainly how that correction is learned: the next prediction reads the
 * stores they pin and the items they file under them. Nothing is claimed about
 * learning that the server does not actually do.
 *
 * Copy lives here rather than in copy.ts only because that file is being edited
 * by another piece of work in flight; fold it in once that lands.
 */

const text = {
  title: "Suggested stores for this list",
  basis: (n: number) =>
    n === 0
      ? "No past orders to learn from yet, so these come from item categories."
      : n < 20
        ? `Learned from ${n} past item${n === 1 ? "" : "s"} so far. It gets better with every order.`
        : `Learned from ${n} past items dispatchers placed.`,
  forItems: (items: string[]) => `For ${items.join(", ")}`,
  sure: (confidence: number) => `${Math.round(confidence * 100)}% sure`,
  alreadyPinned: "Already pinned",
  notMatched: "No store suggested for",
  question: "Is this accurate?",
  yes: "Yes, pin these",
  no: "No, I will pin them",
  loading: "Reading the item list",
  failed: "Store suggestions are unavailable right now. Pin the stores as usual.",
  retry: "Try again",
  nothing: "No store to suggest for this list yet. None of these items has been placed before.",
  accepted: (n: number) =>
    n > 0
      ? `Pinned ${n} suggested store${n === 1 ? "" : "s"}. Check them on the map before sending.`
      : "Those stores were already pinned.",
  rejected:
    "Pin the right stores below. When you file the items under them in step 2, the next suggestion learns from it.",
  dismiss: "Dismiss",
};

interface StorePredictionCardProps {
  prediction: ApiStorePrediction | null;
  status: PredictionStatus;
  answer: PredictionAnswer;
  /** How many the "yes" actually pinned, for the confirmation line. */
  acceptedCount: number | null;
  pinnedStoreNames?: string[];
  onAccept: (stores: ApiPredictedStore[]) => void;
  onAcceptSingle?: (store: ApiPredictedStore) => void;
  onReject: () => void;
  onRetry: () => void;
  onDismiss: () => void;
  onReopen?: () => void;
}

function confidenceTone(confidence: number) {
  return confidence >= 0.6 ? "text-ink-muted" : "text-status-waiting-ink";
}

export function StorePredictionCard({
  prediction,
  status,
  answer,
  acceptedCount,
  pinnedStoreNames = [],
  onAccept,
  onAcceptSingle,
  onReject,
  onRetry,
  onDismiss,
  onReopen,
}: StorePredictionCardProps) {
  if (status === "idle") return null;

  const isStorePinned = (store: ApiPredictedStore) => {
    if (store.alreadyPinned) return true;
    if (!pinnedStoreNames || pinnedStoreNames.length === 0) return false;
    return pinnedStoreNames.some(
      (name) => name.trim().toLowerCase() === store.storeName.trim().toLowerCase()
    );
  };

  // The answer given: one line, dismissible, with option to reopen suggestions
  if (answer) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-plate border border-edge bg-board-plate px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Store size={15} className="shrink-0 text-ink-muted" />
          <p className="m-0 truncate text-body text-ink-muted">
            {answer === "accepted" ? text.accepted(acceptedCount ?? 0) : text.rejected}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onReopen && (
            <DispatcherButton type="button" size="sm" variant="secondary" onClick={onReopen}>
              View Suggestions
            </DispatcherButton>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label={text.dismiss}
            className="grid size-8 place-items-center rounded-trim text-ink-muted hover:bg-board-ground"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="space-y-2 rounded-plate border border-edge bg-board-plate p-3" aria-busy="true">
        <p className="m-0 text-label text-ink-muted">{text.loading}</p>
        <Skeleton className="h-10 w-full rounded-plate bg-hairline" />
        <Skeleton className="h-10 w-4/5 rounded-plate bg-hairline" />
      </div>
    );
  }

  if (status === "error" || !prediction) {
    return (
      <div className="flex items-start gap-2 rounded-plate bg-status-waiting-fill px-3 py-2">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-status-waiting-ink" />
        <p className="m-0 min-w-0 flex-1 text-body text-status-waiting-ink">{text.failed}</p>
        <DispatcherButton type="button" size="sm" variant="secondary" onClick={onRetry}>
          <RotateCw size={13} />
          {text.retry}
        </DispatcherButton>
      </div>
    );
  }

  const proposable = prediction.stores.filter((s) => s.location.status !== "blocked");

  if (proposable.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-plate border border-edge bg-board-plate px-3 py-2">
        <Store size={15} className="mt-0.5 shrink-0 text-ink-muted" />
        <p className="m-0 min-w-0 flex-1 text-body text-ink-muted">{text.nothing}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={text.dismiss}
          className="grid size-9 shrink-0 place-items-center rounded-trim text-ink-muted hover:bg-board-ground"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label={text.title}
      className="overflow-hidden rounded-plate border border-edge bg-board-plate"
    >
      <header className="border-b border-hairline px-3 pb-2 pt-3">
        <div className="flex items-center justify-between">
          <h4 className="m-0 flex items-center gap-2 text-label text-ink">
            <Store size={15} className="shrink-0 text-ink-muted" />
            {text.title}
          </h4>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={text.dismiss}
            className="grid size-7 shrink-0 place-items-center rounded-trim text-ink-muted hover:bg-board-ground"
          >
            <X size={14} />
          </button>
        </div>
        <p className="mb-0 mt-1 text-micro text-ink-muted">{text.basis(prediction.trainingExamples)}</p>
      </header>

      <ol className="m-0 list-none divide-y divide-hairline p-0">
        {proposable.map((store, i) => {
          const isPinned = isStorePinned(store);
          return (
            <li key={`${store.storeName}-${i}`} className="flex items-center gap-2.5 px-3 py-2.5">
              <span data-figure className="shrink-0 pt-px font-mono text-label text-ink-muted">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="min-w-0 truncate text-body font-medium text-ink">{store.storeName}</span>
                  <span
                    data-figure
                    className={cn("shrink-0 font-mono text-micro tabular-nums", confidenceTone(store.confidence))}
                  >
                    {isPinned ? text.alreadyPinned : text.sure(store.confidence)}
                  </span>
                </div>
                <p className="mb-0 mt-0.5 break-words text-label text-ink">{text.forItems(store.items)}</p>
                <p className="mb-0 mt-0.5 text-label text-ink-muted">{store.reason}</p>
                {store.location.status === "outside" && (
                  <p className="mb-0 mt-1 flex items-start gap-1.5 text-label text-status-waiting-ink">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>{store.location.message}</span>
                  </p>
                )}
              </div>
              <div className="shrink-0 self-center pl-2">
                {isPinned ? (
                  <span className="inline-flex items-center rounded-trim bg-status-done-fill px-2 py-1 font-mono text-micro text-status-done-ink">
                    Pinned &#10003;
                  </span>
                ) : (
                  <DispatcherButton
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => (onAcceptSingle ? onAcceptSingle(store) : onAccept([store]))}
                  >
                    Pin
                  </DispatcherButton>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {prediction.uncovered.length > 0 && (
        <div className="border-t border-hairline px-3 py-2">
          <p className="m-0 text-label text-ink-muted">
            {text.notMatched}{" "}
            <span className="text-ink">{prediction.uncovered.map((u) => u.name).join(", ")}</span>.{" "}
            {prediction.uncovered[0].reason}
          </p>
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-hairline bg-board-ground px-3 py-2.5">
        <p className="m-0 w-full text-label text-ink sm:mr-auto sm:w-auto">{text.question}</p>
        <DispatcherButton type="button" size="sm" variant="secondary" onClick={onReject}>
          {text.no}
        </DispatcherButton>
        <DispatcherButton type="button" size="sm" variant="primary" onClick={() => onAccept(proposable)}>
          {text.yes}
        </DispatcherButton>
      </footer>
    </section>
  );
}
