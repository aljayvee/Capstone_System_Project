import * as React from "react";
import { Camera, CheckCircle2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DispatcherCard } from "@/components/panel/DispatcherCard";
import { DispatcherInlineBanner } from "@/components/panel/DispatcherInlineBanner";
import { apiService, type ApiProofImage } from "../../../../services/apiService";
import { copy } from "./copy";
import { peso, PlanBadge, ProofRow, Figure, AttestationForm } from "./PaymentLedgerPanel";
import type { useOrderPayments } from "./hooks/useOrderPayments";

/**
 * The half-payment, on its own — beside the chat, not inside the Stage 4
 * accordion.
 *
 * Two things the ledger panel never had: the actual photo (not just its OCR'd
 * text), and every photo ever submitted for this errand, not just whichever
 * one is current. A rider or dispatcher checking for a reused screenshot
 * needs the picture and its capture date in front of them, and a fraud
 * dispute needs the history a reupload used to quietly delete.
 */

const RELEVANT_KINDS = new Set(["PAYMENT_PROOF", "RIDER_BALANCE_PROOF"]);

interface PaymentProofPanelProps {
  errandId: string;
  payments: ReturnType<typeof useOrderPayments>;
  readOnly?: boolean;
}

export function PaymentProofPanel({ errandId, payments, readOnly = false }: PaymentProofPanelProps) {
  const { ledger, proof, pending, feedback, confirmBalance } = payments;
  const c = copy.payments;

  const [images, setImages] = React.useState<ApiProofImage[] | null>(null);
  const [isLoadingImages, setIsLoadingImages] = React.useState(false);
  const [openImage, setOpenImage] = React.useState<{ mimeType: string; imageData: string } | null>(null);
  const [loadingImageId, setLoadingImageId] = React.useState<number | null>(null);

  const loadImages = React.useCallback(async () => {
    setIsLoadingImages(true);
    const result = await apiService.listProofImages(errandId);
    setImages(result ? result.filter((img) => RELEVANT_KINDS.has(img.kind)) : []);
    setIsLoadingImages(false);
  }, [errandId]);

  React.useEffect(() => {
    void loadImages();
    // Re-checked whenever the ledger state moves — a proof upload arrives via
    // the chat's own event stream, not through this panel, so this is what
    // notices a fresh photo landed without the dispatcher reloading the page.
  }, [loadImages, ledger?.state]);

  const viewImage = async (image: ApiProofImage) => {
    setLoadingImageId(image.id);
    const full = await apiService.getProofImage(errandId, image.id);
    if (full) setOpenImage({ mimeType: full.mimeType, imageData: full.imageData });
    setLoadingImageId(null);
  };

  if (!ledger?.hasLedger) return null;

  // The one photo an attestation would actually point at — the current
  // (non-superseded) row, if there's exactly one. Ambiguous cases (none yet,
  // or somehow more than one current) confirm without a proofImageId rather
  // than guess.
  const currentImages = (images ?? []).filter((img) => !img.supersededAt);
  const currentImageId = currentImages.length === 1 ? currentImages[0].id : undefined;

  return (
    <DispatcherCard.Region padding="sm" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <DispatcherCard.Label as="h4" className="mb-0 min-w-0 flex-1">
          {c.halfPaymentPanelTitle}
        </DispatcherCard.Label>
        <PlanBadge state={ledger.state} />
      </div>

      <Figure label={c.balance} value={peso(ledger.balanceDue)} caption="collected at the door" />

      <DispatcherInlineBanner message={feedback.message} onDismiss={feedback.dismiss} />

      {ledger.state === "AWAITING_UPFRONT" && (
        <p className="m-0 text-body text-ink-muted">{c.halfPaymentWaitingUpfront}</p>
      )}
      {ledger.state === "OVERAGE_PENDING" && (
        <p className="m-0 text-body text-ink-muted">{c.halfPaymentOveragePending}</p>
      )}
      {ledger.state === "REFUNDED" && (
        <p className="m-0 text-body text-ink-muted">{c.halfPaymentRefunded}</p>
      )}
      {ledger.state === "SETTLED" && (
        <p className="m-0 flex items-center gap-1.5 text-label text-status-done-ink">
          <CheckCircle2 size={14} className="shrink-0" />
          {c.settled}
        </p>
      )}

      {/* ── the photo itself, every one ever submitted ───────────────────── */}
      <div>
        <DispatcherCard.Label as="h5">{c.proofPhotoTitle}</DispatcherCard.Label>
        {isLoadingImages ? (
          <p className="m-0 flex items-center gap-1.5 text-label text-ink-muted">
            <Loader2 size={12} className="animate-spin" /> Loading
          </p>
        ) : images && images.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {images.map((img) => {
              const isCurrent = !img.supersededAt;
              return (
                <button
                  key={img.id}
                  onClick={() => void viewImage(img)}
                  className={cn(
                    "flex min-h-9 items-center gap-2 rounded-trim border px-2.5 py-1.5 text-left transition-colors",
                    isCurrent
                      ? "border-edge hover:border-board-field"
                      : "border-hairline opacity-60 hover:opacity-100"
                  )}
                  data-testid={`payment-proof-image-${img.id}`}
                >
                  {loadingImageId === img.id ? (
                    <Loader2 size={14} className="shrink-0 animate-spin" />
                  ) : (
                    <Camera size={14} className="shrink-0 text-ink-muted" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label text-ink">
                      {img.customerId ? c.proofPhotoCustomer : c.proofPhotoRider}
                      {!isCurrent ? ` — ${c.proofPhotoSuperseded}` : ""}
                    </span>
                    <span className="block text-micro text-ink-muted">
                      {c.proofPhotoCapturedAt(new Date(img.capturedAt).toLocaleString())}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="m-0 text-body text-ink-muted">{c.proofPhotoNone}</p>
        )}
      </div>

      {/* ── the OCR'd text of the current proof, for a quick reference lookup
          without opening the photo ──────────────────────────────────────── */}
      {proof?.extraction && (
        <div>
          <ProofRow label={c.proofRef} value={proof.extraction.referenceNo} mono />
          {proof.extraction.transactionId && (
            <ProofRow label={c.proofTxn} value={proof.extraction.transactionId} mono />
          )}
          <ProofRow
            label={c.proofAmount}
            value={proof.extraction.extractedTotal != null ? peso(proof.extraction.extractedTotal) : null}
            mono
          />
          <ProofRow
            label={c.proofDate}
            value={
              proof.extraction.extractedDate
                ? new Date(proof.extraction.extractedDate).toLocaleDateString()
                : null
            }
          />
        </div>
      )}

      {!readOnly && ledger.state === "AWAITING_BALANCE" && (
        <AttestationForm
          defaultAmount={ledger.balanceDue}
          submitLabel={c.confirmBalance}
          loadingLabel={c.confirmingBalance}
          loading={pending === "balance"}
          onSubmit={(amount, note) => confirmBalance(amount, note, currentImageId)}
        />
      )}

      {openImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpenImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Payment proof photo"
        >
          <button
            onClick={() => setOpenImage(null)}
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close the photo"
          >
            <X size={18} />
          </button>
          <img
            src={`data:${openImage.mimeType};base64,${openImage.imageData}`}
            alt="Payment proof"
            className="max-h-full max-w-full rounded-modal object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </DispatcherCard.Region>
  );
}
