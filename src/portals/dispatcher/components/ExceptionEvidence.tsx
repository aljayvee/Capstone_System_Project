import React, { useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { apiService, type ApiProofImage, type ExceptionKind } from "../../../services/apiService";
import { formatPeso } from "../../../utils/format";

/**
 * The photos behind one exception, beside the claim about it.
 *
 * A variance nobody can see the receipt for is a number, not a finding — the
 * dispatcher has to be able to check the figure against the paper before
 * clearing it.
 *
 * Loaded on demand in two steps: metadata when the row is opened, bytes when a
 * thumbnail is tapped. Every proof image is base64 in the database, so a queue
 * that eagerly fetched ten rows' worth would pull megabytes for evidence nobody
 * has asked to see yet.
 */
export const ExceptionEvidence: React.FC<{ errandId: string; kind: ExceptionKind }> = ({
  errandId,
  kind,
}) => {
  const [images, setImages] = useState<ApiProofImage[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openImage, setOpenImage] = useState<{ mimeType: string; imageData: string } | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [viewFailed, setViewFailed] = useState(false);

  // A long stop is a timing signal, not a photographed one — there is nothing to
  // show and offering a button that opens an empty strip is worse than no button.
  if (kind === "STALLED_STOP") return null;

  const open = async () => {
    setIsLoading(true);
    setLoadFailed(false);

    // listProofImages swallows its own failure and returns null, so the old
    // `?? []` turned "the request failed" into an empty array, and the empty
    // branch below then told the dispatcher "No photo was ever captured on
    // this errand." That is evidence of absence invented out of a network
    // error, on the screen where a shortfall gets adjudicated.
    const result = await apiService.listProofImages(errandId);
    if (result === null) {
      setLoadFailed(true);
    } else {
      setImages(result);
    }

    setIsLoading(false);
  };

  const view = async (image: ApiProofImage) => {
    setLoadingId(image.id);
    setViewFailed(false);

    const full = await apiService.getProofImage(errandId, image.id);
    if (full) {
      setOpenImage({ mimeType: full.mimeType, imageData: full.imageData });
    } else {
      // Previously the click simply did nothing when the bytes failed to
      // arrive, which reads as a broken thumbnail rather than a failed request.
      setViewFailed(true);
    }

    setLoadingId(null);
  };

  if (images === null) {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => void open()}
          disabled={isLoading}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-label text-ink-muted transition-colors hover:text-ink"
          data-testid={`evidence-open-${errandId}`}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {isLoading ? "Loading evidence" : loadFailed ? "Try the evidence again" : "Show the evidence"}
        </button>
        {loadFailed ? (
          <p role="alert" className="text-label text-status-act-ink">
            The evidence did not load. This does not mean there is none, so do not clear the
            shortfall on the strength of it.
          </p>
        ) : null}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <p className="text-label text-status-act-ink">
        No photo was ever captured on this errand.
      </p>
    );
  }

  return (
    <>
      {viewFailed ? (
        <p role="alert" className="mb-1.5 text-label text-status-act-ink">
          That photo could not be opened. The others may still load.
        </p>
      ) : null}
      <div className="flex gap-2 overflow-x-auto pb-1" data-testid={`evidence-strip-${errandId}`}>
        {images.map((img) => {
          // What the machine read, what the rider stood behind, or what they
          // simply declared — whichever exists is the figure worth showing.
          const figure =
            img.extraction?.confirmedTotal ?? img.extraction?.extractedTotal ?? img.declaredTotal;

          return (
            <button
              key={img.id}
              onClick={() => void view(img)}
              className="w-[112px] shrink-0 cursor-pointer rounded-trim border border-edge bg-board-ground px-2 py-1.5 text-left transition-colors hover:border-board-field"
              data-testid={`evidence-${img.id}`}
            >
              <div className="flex items-center gap-1 text-micro uppercase text-ink-muted">
                {loadingId === img.id ? (
                  <Loader2 size={10} className="animate-spin shrink-0" />
                ) : (
                  <Camera size={10} className="shrink-0" />
                )}
                <span className="truncate">
                  {img.kind === "NO_RECEIPT"
                    ? "No receipt"
                    : img.kind === "PROOF_OF_DELIVERY"
                      ? "Handover"
                      : "Receipt"}
                </span>
              </div>
              {figure !== null && figure !== undefined && (
                <p data-figure className="font-mono text-data text-ink">
                  {formatPeso(figure)}
                </p>
              )}
              {/* Says whose figure this is. An unverified total is the rider's
                  word, and a reader deciding on money should never have to guess
                  which of the two they are looking at. */}
              <p className="text-label leading-tight text-ink-muted">
                {img.verified ? "Read from the receipt" : "Stated by the rider"}
              </p>
            </button>
          );
        })}
      </div>

      {openImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          onClick={() => setOpenImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Proof photo"
        >
          <button
            onClick={() => setOpenImage(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            aria-label="Close the photo"
          >
            <X size={18} />
          </button>
          <img
            src={`data:${openImage.mimeType};base64,${openImage.imageData}`}
            alt="Proof captured by the rider"
            className="max-h-full max-w-full rounded-modal object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
