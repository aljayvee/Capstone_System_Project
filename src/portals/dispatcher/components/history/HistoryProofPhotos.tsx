import { useEffect, useState } from "react";
import { Camera, Loader2, RotateCcw, X } from "lucide-react";
import { apiService, type ApiProofImage } from "../../../../services/apiService";
import { formatPeso } from "../../../../utils/format";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherBadge } from "@/components/panel/DispatcherBadge";
import { Skeleton } from "@/components/ui/skeleton";

/** Bought at a store: the rider's receipts, or the goods where there was none. */
export const STORE_PROOF_KINDS = ["RECEIPT", "NO_RECEIPT"];
/** At the door: the handover, and every way the money was shown to arrive. */
export const HANDOVER_PROOF_KINDS = [
  "PROOF_OF_DELIVERY",
  "CASH_COLLECTED",
  "TRANSFER",
  "PAYMENT_PROOF",
  "RIDER_BALANCE_PROOF",
];

const PROOF_LABELS: Record<string, string> = {
  RECEIPT: "Store receipt",
  NO_RECEIPT: "Goods photo, no receipt",
  PROOF_OF_DELIVERY: "Handover at the door",
  CASH_COLLECTED: "Cash collected",
  TRANSFER: "Payment transfer",
  PAYMENT_PROOF: "Customer's payment proof",
  RIDER_BALANCE_PROOF: "Customer's receipt, shown at the door",
};

export type ProofPhotosState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; images: ApiProofImage[] };

/**
 * Metadata for a finished order's photos, kept for the session: a past order's
 * evidence does not change, and flicking between orders should not refetch it.
 * Failures are not cached, so Try again really tries again.
 */
const metadataCache = new Map<string, ApiProofImage[]>();

export function useProofPhotos(errandId: string) {
  const [state, setState] = useState<ProofPhotosState>(() => {
    const cached = metadataCache.get(errandId);
    return cached ? { status: "ready", images: cached } : { status: "loading" };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const cached = metadataCache.get(errandId);
    if (cached) {
      setState({ status: "ready", images: cached });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    void apiService.listProofImages(errandId).then((result) => {
      if (cancelled) return;
      // null is a failed request, never "no photos": the two are told apart
      // here so the empty copy below can only ever mean what it says.
      if (result === null) {
        setState({ status: "failed" });
        return;
      }
      // A replaced photo is history inside history; the current one is the record.
      const current = result.filter((image) => !image.supersededAt);
      metadataCache.set(errandId, current);
      setState({ status: "ready", images: current });
    });
    return () => {
      cancelled = true;
    };
  }, [errandId, attempt]);

  return { state, retry: () => setAttempt((n) => n + 1) };
}

interface ProofPhotoGridProps {
  errandId: string;
  state: ProofPhotosState;
  onRetry: () => void;
  kinds: string[];
  emptyText: string;
  /** Store names by pinpoint id, so a receipt says which shop it came from. */
  storeNames?: Record<number, string>;
}

/**
 * One section's photos as tiles. The bytes load only when a tile is opened:
 * every photo is base64 in the database, and an order is usually opened to
 * check one figure, not to page through all of them.
 */
export function ProofPhotoGrid({
  errandId,
  state,
  onRetry,
  kinds,
  emptyText,
  storeNames,
}: ProofPhotoGridProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [viewFailed, setViewFailed] = useState(false);
  const [open, setOpen] = useState<{ src: string; caption: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (state.status === "loading") {
    return (
      <div className="flex gap-2" aria-busy="true">
        <span className="sr-only">Loading the photos</span>
        <Skeleton className="h-[84px] w-[148px] rounded-trim bg-hairline" />
        <Skeleton className="h-[84px] w-[148px] rounded-trim bg-hairline" />
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3">
        <p className="text-label text-status-act-ink">
          The photos did not load. This does not mean there are none.
        </p>
        <DispatcherButton variant="secondary" size="sm" icon={<RotateCcw size={14} />} onClick={onRetry}>
          Try again
        </DispatcherButton>
      </div>
    );
  }

  const photos = state.images.filter((image) => kinds.includes(image.kind));
  if (photos.length === 0) {
    return <p className="text-label text-ink-muted">{emptyText}</p>;
  }

  const labelOf = (image: ApiProofImage) => {
    const kind = PROOF_LABELS[image.kind] ?? "Photo";
    const store = image.pinpointId != null ? storeNames?.[image.pinpointId] : undefined;
    return store ? `${kind}, ${store}` : kind;
  };

  const view = async (image: ApiProofImage) => {
    setLoadingId(image.id);
    setViewFailed(false);
    const full = await apiService.getProofImage(errandId, image.id);
    setLoadingId(null);
    if (!full) {
      setViewFailed(true);
      return;
    }
    setOpen({ src: `data:${full.mimeType};base64,${full.imageData}`, caption: labelOf(image) });
  };

  return (
    <>
      {viewFailed ? (
        <p role="alert" className="mb-2 text-label text-status-act-ink">
          That photo could not be opened. The others may still load.
        </p>
      ) : null}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2">
        {photos.map((image) => {
          // What was read, what the rider stood behind, or what they simply
          // declared: whichever exists is the figure worth showing.
          const figure =
            image.extraction?.confirmedTotal ?? image.extraction?.extractedTotal ?? image.declaredTotal;
          const capturedAt = new Date(image.capturedAt);
          return (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => void view(image)}
                disabled={loadingId === image.id}
                className="flex h-full w-full cursor-pointer flex-col gap-1 rounded-trim border border-edge bg-board-ground px-2.5 py-2 text-left transition-colors hover:border-board-field disabled:cursor-wait"
                aria-label={`Open the photo: ${labelOf(image)}`}
              >
                <span className="flex items-center gap-1.5 text-micro uppercase text-ink-muted">
                  {loadingId === image.id ? (
                    <Loader2 size={12} className="shrink-0 animate-spin" />
                  ) : (
                    <Camera size={12} className="shrink-0" />
                  )}
                  <span className="truncate" title={labelOf(image)}>
                    {labelOf(image)}
                  </span>
                </span>
                {figure != null ? (
                  <span data-figure className="font-mono text-data text-ink">
                    {formatPeso(figure)}
                  </span>
                ) : null}
                <span className="text-label leading-tight text-ink-muted">
                  {image.verified
                    ? "Read from the photo"
                    : image.customerId
                      ? "Stated by the customer"
                      : "Stated by the rider"}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {!image.verified ? <DispatcherBadge tone="waiting">Unverified</DispatcherBadge> : null}
                  {!Number.isNaN(capturedAt.getTime()) ? (
                    <span data-figure className="text-label text-ink-muted">
                      {capturedAt.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/70 p-6"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={open.caption}
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="absolute right-5 top-5 cursor-pointer rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close the photo"
          >
            <X size={18} />
          </button>
          <img
            src={open.src}
            alt={open.caption}
            className="max-h-[85%] max-w-full rounded-modal object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <p className="text-label text-white">{open.caption}</p>
        </div>
      ) : null}
    </>
  );
}
