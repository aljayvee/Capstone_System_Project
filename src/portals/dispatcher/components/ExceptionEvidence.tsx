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

  // A long stop is a timing signal, not a photographed one — there is nothing to
  // show and offering a button that opens an empty strip is worse than no button.
  if (kind === "STALLED_STOP") return null;

  const open = async () => {
    setIsLoading(true);
    setImages((await apiService.listProofImages(errandId)) ?? []);
    setIsLoading(false);
  };

  const view = async (image: ApiProofImage) => {
    setLoadingId(image.id);
    const full = await apiService.getProofImage(errandId, image.id);
    if (full) setOpenImage({ mimeType: full.mimeType, imageData: full.imageData });
    setLoadingId(null);
  };

  if (images === null) {
    return (
      <button
        onClick={() => void open()}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-[#1E3A5F] transition"
        data-testid={`evidence-open-${errandId}`}
      >
        {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
        {isLoading ? "Loading evidence…" : "Show the evidence"}
      </button>
    );
  }

  if (images.length === 0) {
    return (
      <p className="text-[11px] text-rose-600 font-medium">
        No photo was ever captured on this errand.
      </p>
    );
  }

  return (
    <>
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
              className="shrink-0 w-[104px] rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-left hover:border-[#1E3A5F] transition"
              data-testid={`evidence-${img.id}`}
            >
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700">
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
                <p className="font-mono text-[11px] font-bold text-slate-800 tabular-nums">
                  {formatPeso(figure)}
                </p>
              )}
              {/* Says whose figure this is. An unverified total is the rider's
                  word, and a reader deciding on money should never have to guess
                  which of the two they are looking at. */}
              <p className="text-[9px] text-slate-400 leading-tight">
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
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
