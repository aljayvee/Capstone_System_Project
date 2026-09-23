import * as React from "react";
import { Camera, CheckCircle2, Clock, Loader2, MessageSquare, ReceiptText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherCard } from "@/components/panel/DispatcherCard";
import { DispatcherInlineBanner } from "@/components/panel/DispatcherInlineBanner";
import { apiService, type ApiProofImage } from "../../../../services/apiService";
import { copy, formatAgo } from "./copy";
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
  customerFirstName: string;
  riderName: string;
  /** The chat, read only to know which half-payment cards were already sent. */
  messages: Array<{ type?: string; timestamp?: number }>;
  pushMessage: (payload: Record<string, any>) => void;
}

export function PaymentProofPanel({
  errandId,
  payments,
  readOnly = false,
  customerFirstName,
  riderName,
  messages,
  pushMessage,
}: PaymentProofPanelProps) {
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

      <HalfPaymentSteps
        payments={payments}
        readOnly={readOnly}
        customerFirstName={customerFirstName}
        riderName={riderName}
        messages={messages}
        pushMessage={pushMessage}
        currentImageId={currentImageId}
      />
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

/**
 * The 50%, collected mid-way.
 *
 * The rider asks once they hold every item, so the amount is half of what they
 * actually paid. From there it is the dispatcher's turn, in order: ask the
 * customer for it, show them where the receipt goes, and let a receipt that
 * checks out settle it on its own. Laid out as that sequence so each step is
 * the next button, not something to remember, and tinted as the dispatcher's
 * turn because a rider is standing still until it is done.
 */
function HalfPaymentSteps({
  payments,
  readOnly,
  customerFirstName,
  riderName,
  messages,
  pushMessage,
  currentImageId,
}: {
  payments: ReturnType<typeof useOrderPayments>;
  readOnly: boolean;
  customerFirstName: string;
  riderName: string;
  messages: Array<{ type?: string; timestamp?: number }>;
  pushMessage: (payload: Record<string, any>) => void;
  currentImageId: number | undefined;
}) {
  const { ledger, proof, pending, confirmUpfront } = payments;
  const c = copy.payments;
  if (!ledger?.hasLedger) return null;

  const requestedAtMs = ledger.halfPaymentRequestedAt
    ? new Date(ledger.halfPaymentRequestedAt).getTime()
    : null;
  const upfront = ledger.entries.find((e) => e.kind === "UPFRONT") ?? null;

  // Settled: say how, once. A half confirmed before any rider asked belongs to
  // the old pay-before-dispatch flow, which the Payment stage already shows.
  if (upfront) {
    if (!requestedAtMs) return null;
    return (
      <p className="m-0 flex items-start gap-1.5 text-label text-status-done-ink" data-testid="half-payment-settled">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
        {upfront.confirmedBy
          ? c.halfConfirmedBy(upfront.confirmedBy.name, riderName)
          : c.halfAutoConfirmed(riderName)}
      </p>
    );
  }
  if (ledger.state !== "AWAITING_UPFRONT") return null;

  if (!requestedAtMs) {
    return <p className="m-0 text-body text-ink-muted">{c.halfNotYet(riderName)}</p>;
  }

  // Recovered from the chat rather than held in state, so a reload, or a second
  // dispatcher opening the same order, sees what was already sent.
  const sentSinceRequest = (type: string) =>
    messages.some((m) => m.type === type && (m.timestamp ?? 0) >= requestedAtMs);
  const asked = sentSinceRequest("half_payment_request");
  const showedUpload = sentSinceRequest("payment_proof_request");
  // Still owed with a receipt in hand means it did not settle on its own:
  // the one case a person has to look at.
  const receiptToReview = Boolean(proof && new Date(proof.capturedAt).getTime() >= requestedAtMs);

  const amount = peso(ledger.dueUpFront);
  const goods = peso(ledger.goodsTotal);
  const minsAgo = Math.max(0, Math.floor((Date.now() - requestedAtMs) / 60000));

  return (
    <div
      className="space-y-2.5 rounded-plate border border-status-act-ink/25 bg-status-act-fill p-3"
      data-testid="half-payment-steps"
    >
      <div>
        <p className="m-0 flex items-center gap-1.5 text-label font-semibold text-status-act-ink">
          <Clock size={14} className="shrink-0" />
          {c.halfRequestedTitle(riderName)}
        </p>
        <p className="m-0 mt-1 text-body text-ink">
          {c.halfRequestedBody(customerFirstName, amount, goods, formatAgo(minsAgo))}
        </p>
      </div>

      {!readOnly && (
        <div className="flex flex-col gap-2">
          <DispatcherButton
            variant={asked ? "secondary" : "primary"}
            icon={asked ? <CheckCircle2 size={15} /> : <MessageSquare size={15} />}
            className="w-full justify-center"
            data-testid="half-payment-ask"
            onClick={() =>
              pushMessage({
                type: "half_payment_request",
                amount: ledger.dueUpFront,
                goodsTotal: ledger.goodsTotal,
                text: c.halfRequestMessage(amount, goods),
              })
            }
          >
            {asked ? c.halfAsked(customerFirstName) : c.halfAsk(customerFirstName, amount)}
          </DispatcherButton>
          <DispatcherButton
            variant={asked && !showedUpload ? "primary" : "secondary"}
            icon={showedUpload ? <CheckCircle2 size={15} /> : <ReceiptText size={15} />}
            className="w-full justify-center"
            data-testid="half-payment-show-upload"
            onClick={() =>
              pushMessage({
                type: "payment_proof_request",
                amount: ledger.dueUpFront,
                text: c.halfUploadMessage(amount),
              })
            }
          >
            {showedUpload ? c.halfShowedUpload(customerFirstName) : c.halfShowUpload(customerFirstName)}
          </DispatcherButton>
        </div>
      )}

      <p className="m-0 flex items-start gap-1.5 text-label text-ink-muted">
        <ReceiptText size={14} className="mt-0.5 shrink-0" />
        {receiptToReview ? c.halfReceiptReview : c.halfReceiptWaiting}
      </p>

      {!readOnly && receiptToReview && (
        <AttestationForm
          defaultAmount={ledger.dueUpFront}
          submitLabel={c.confirmUpfront}
          loadingLabel={c.confirmingUpfront}
          loading={pending === "upfront"}
          onSubmit={(amt, note) => confirmUpfront(amt, note, currentImageId)}
        />
      )}
    </div>
  );
}
