import React, { useState } from "react";
import { Errand } from "../../../../types/errand";
import { formatErrandId } from "../../../../utils/formatErrandId";
import { formatPeso } from "../../../../utils/format";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { StatusChip } from "@/components/panel/DispatcherBadge";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherCard } from "@/components/panel/DispatcherCard";
import { Field, fieldInputClasses } from "@/components/panel/Field";
import { PanelState } from "@/components/panel/PanelState";
import { useDraft } from "../../lib/useDraft";
import { RUN_PROGRESSION, progressIndexOf } from "@/lib/statusPresentation";

interface DispatchDetailInspectorProps {
  errand: Errand | null;
  onClaimAndReview: (errand: Errand) => void;
  onDecline?: (orderId: string, reason?: string) => void;
  onOpenChat: (orderId: string) => void;
  isClaiming: boolean;
  claimError: string | null;
  onDismissClaimError: () => void;
  /** Additive, all optional. */
  isLoading?: boolean;
  loadError?: string | null;
  /** Narrow screens only: hands the screen back to the board. */
  onBackToBoard?: () => void;
}

/**
 * One run's waybill.
 *
 * The empty state was the console's most misleading screen. With nothing
 * selected it rendered "All Caught Up" under a large green check, which is a
 * claim about the whole shift, and it rendered identically whether nothing was
 * selected, a search had matched nothing, or the API was dead. Loading and
 * failure now belong to PanelState, and the no-selection state says only what
 * it knows: pick a run.
 *
 * Structure changed rather than being restyled. This file nested bordered,
 * rounded cards three deep: a card at the root, four `bg-slate-50/70` cards
 * inside it, and a bordered square inside those. Those inner boxes are now
 * regions, which is how this world groups things, by a change of ground and a
 * gap instead of another frame.
 *
 * The action footer is a real flex sibling. It used to be
 * `absolute bottom-0` with `shadow-lg` and `backdrop-blur-md`, which is three
 * separate breaches of the flat-surface invariant, and the scroller carried
 * `pb-24` to dodge it.
 */
export const DispatchDetailInspector: React.FC<DispatchDetailInspectorProps> = ({
  errand,
  onClaimAndReview,
  onDecline,
  onOpenChat,
  isClaiming,
  claimError,
  onDismissClaimError,
  isLoading = false,
  loadError = null,
  onBackToBoard,
}) => {
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "CHAT">("OVERVIEW");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  // Keyed by errand, which is the fix for a real defect: `declineReason` was a
  // single piece of state that was never reset when the selection changed, so
  // a reason typed against one run stayed in the box, and was submittable,
  // against the next one.
  const [declineReason, setDeclineReason, clearDeclineReason] = useDraft(
    `decline:${errand?.id ?? "none"}`
  );

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-plate border border-edge bg-board-plate p-4">
        <PanelState isLoading loadingRows={4}>
          {null}
        </PanelState>
      </div>
    );
  }

  if (!errand) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-plate border border-edge bg-board-plate p-8 text-center">
        <p className="text-panel text-ink">No run selected</p>
        <p className="mt-1.5 max-w-sm text-body text-ink-muted">
          Pick a run from the board to see its items, its route and what it comes
          to. This says nothing about whether the queue is clear.
        </p>
        {/* A quiet note rather than a second error frame. This pane has no
            fetch of its own, so repeating the board's failure here just gave
            the same problem two headings and two retry buttons. */}
        {loadError ? (
          <p className="mt-3 max-w-sm text-label text-ink-muted">
            The board is reporting a problem loading, so there may be runs that
            are not showing here yet.
          </p>
        ) : null}
      </div>
    );
  }

  const isAvailable = String(errand.status).toUpperCase() === "AVAILABLE";
  const items = errand.pabiliDetails || errand.pabiliItemRequests || [];
  const primaryStore =
    errand.pinpoints?.[0]?.storeName || items[0]?.storeCategory || errand.category || "Store";

  const subtotal = Number(errand.estimatedCost || 0);

  /**
   * What one line actually costs, or null when nobody knows yet.
   *
   * Null is the normal case on an unstarted run: a pabili item has no price
   * until the rider stands at the till. Returning 0 for that, which is what
   * this used to do, put a figure on screen that no one had established.
   */
  const lineAmount = (item: any): number | null => {
    if (item?.estimatedSubtotal) return Number(item.estimatedSubtotal);
    if (item?.unitPrice) return Number(item.unitPrice) * Number(item.quantity || 1);
    return null;
  };
  const fee = Number(errand.deliveryFee || 0);
  const lineSum = subtotal + fee;
  const totalDisplay = errand.totalCost || lineSum;
  // `Errand` has no base-fee column, so a breakdown has to be derived and can
  // silently fail to add up. Rather than hide that, the difference is stated:
  // the same discipline the sales report uses, where a figure that stops
  // reconciling shows up on the screen instead of in an audit.
  const unreconciled = errand.totalCost ? Number(errand.totalCost) - lineSum : 0;

  // The mode the customer actually confirmed, where they have. Null before the
  // choice is made, which the fee note says plainly rather than assuming COD.
  const paymentModeName: string | null =
    (errand as any).paymentSelection?.paymentMode?.name ?? null;

  const progressIndex = progressIndexOf(errand.status);

  const handleCopyId = () => {
    navigator.clipboard.writeText(formatErrandId(errand.id));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyPhone = () => {
    if (!errand.customerPhone) return;
    navigator.clipboard.writeText(errand.customerPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const submitDecline = async () => {
    if (!onDecline || isDeclining) return;
    setIsDeclining(true);
    try {
      // Awaited, and the dialog holds until it resolves. The old handler fired
      // an unawaited call with no busy flag, so a double click declined twice.
      await onDecline(errand.id, declineReason.trim() || undefined);
      clearDeclineReason();
      setShowDeclineConfirm(false);
    } finally {
      setIsDeclining(false);
    }
  };

  const tab = (id: "OVERVIEW" | "CHAT", label: string, icon?: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      aria-pressed={activeTab === id}
      className={cn(
        "flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-trim px-3 text-micro uppercase transition-colors sm:flex-initial",
        activeTab === id ? "bg-board-field text-board-plate" : "text-ink-muted hover:text-ink"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    // `relative` anchors the decline dialog's absolute overlay to this plate.
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-plate border border-edge bg-board-plate">
      {/* Header: the run's identity, painted on the field */}
      <div data-on-field className="shrink-0 bg-board-field px-4 py-3 shadow-field">
        {onBackToBoard ? (
          <button
            type="button"
            onClick={onBackToBoard}
            className="mb-2 inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-micro uppercase text-board-trim transition-colors hover:text-board-plate lg:hidden"
          >
            <ArrowLeft size={14} />
            Back to the board
          </button>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 data-figure className="truncate font-mono text-title text-board-plate">
              {formatErrandId(errand.id)}
            </h2>
            <button
              type="button"
              onClick={handleCopyId}
              aria-label="Copy this run's number"
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-trim text-board-trim transition-colors hover:bg-board-plate/10 hover:text-board-plate"
            >
              {copiedId ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>

          <StatusChip status={errand.status} className="shrink-0" />
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="truncate text-label text-board-plate/90">
            {errand.customerName || "Customer"}
          </span>
          {errand.customerPhone ? (
            <button
              type="button"
              onClick={handleCopyPhone}
              aria-label={`Copy ${errand.customerName || "the customer"}'s phone number`}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 font-mono text-label text-board-trim transition-colors hover:text-board-plate"
            >
              <Phone size={12} />
              <span data-figure>{errand.customerPhone}</span>
              {copiedPhone ? <Check size={12} /> : null}
            </button>
          ) : (
            <span className="text-label text-board-trim">No number on file</span>
          )}
          <span className="truncate text-label text-board-trim">{primaryStore}</span>
        </div>
      </div>

      {/* The rail, always.
          It used to be gated on `progressIndex >= 0`, which meant the DEFAULT
          first viewport showed none: an incoming run has started no stage, so
          the one element that says what the five steps even are was absent
          exactly when a dispatcher meets the run for the first time. An
          unstarted run now shows the rail with every detent hollow, which is
          the honest reading of "nothing has happened yet" and is also what
          makes the rail a rail rather than a progress indicator. */}
      {(
        <ol className="flex shrink-0 items-stretch border-b border-hairline bg-board-ground">
          {RUN_PROGRESSION.map((stage, idx) => {
            const isDone = idx <= progressIndex;
            const isCurrent = idx === progressIndex;
            return (
              <li
                key={stage.label}
                aria-current={isCurrent ? "step" : undefined}
                className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2"
              >
                {/* A stamped detent: filled once passed, hollow while ahead.
                    Never colour alone, so the label carries the state too. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2.5",
                    isCurrent ? "rounded-full bg-signal" : "rounded-full",
                    isDone && !isCurrent ? "bg-board-field" : "",
                    !isDone ? "border-[1.5px] border-board-trim" : ""
                  )}
                />
                <span
                  className={cn(
                    "w-full truncate text-center text-micro uppercase",
                    isCurrent ? "text-ink" : isDone ? "text-ink-muted" : "text-board-trim"
                  )}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {/* Tabs, mandated by AGENTS.md 8.30 */}
      <div className="flex shrink-0 items-center gap-1 border-b border-hairline p-2">
        {tab("OVERVIEW", "Order and items")}
        {tab("CHAT", "Customer chat", <MessageSquare size={13} />)}
      </div>

      {claimError ? (
        <div
          role="alert"
          className="m-3 flex shrink-0 items-start justify-between gap-2 rounded-plate bg-status-waiting-fill p-3 text-label text-status-waiting-ink"
        >
          <span className="flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{claimError}</span>
          </span>
          <DispatcherButton variant="subtle" size="sm" onClick={onDismissClaimError}>
            Dismiss
          </DispatcherButton>
        </div>
      ) : null}

      {/* The only scroller */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {activeTab === "OVERVIEW" ? (
          <>
            <DispatcherCard.Region padding="sm">
              <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-2">
                <h3 className="text-micro uppercase text-ink">
                  Requested items ({items.length})
                </h3>
                {/* Named as an estimate. It comes from errand.estimatedCost,
                    not from summing the lines below, and presenting it bare
                    beside a column of line amounts read as a subtotal the
                    rows were supposed to reconcile to. */}
                <span className="shrink-0 text-label text-ink-muted">
                  est.{" "}
                  <span data-figure className="font-mono">
                    {formatPeso(subtotal)}
                  </span>
                </span>
              </div>

              {items.length === 0 ? (
                <p className="pt-2 text-body text-ink-muted">
                  No individual items were listed. The customer asked for:{" "}
                  <span className="text-ink">{errand.description || "a general errand"}</span>
                </p>
              ) : (
                <ul className="divide-y divide-hairline">
                  {items.map((item, idx) => (
                    <li
                      key={item.id || idx}
                      className="flex items-start justify-between gap-3 py-2 first:pt-2"
                    >
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span
                          data-figure
                          className="shrink-0 font-mono text-label text-ink-muted"
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-body text-ink">{item.itemName}</p>
                          {item.notes ? (
                            <p className="mt-0.5 text-label text-ink-muted">Note: {item.notes}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {lineAmount(item) !== null ? (
                          <span data-figure className="font-mono text-data text-ink">
                            {formatPeso(lineAmount(item) as number)}
                          </span>
                        ) : null}
                        <p data-figure className="text-label text-ink-muted">
                          {item.quantity || 1}
                          {item.unitPrice ? ` at ${formatPeso(item.unitPrice)}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {items.length > 0 && items.every((i: any) => lineAmount(i) === null) ? (
                <p className="mt-2 border-t border-hairline pt-2 text-label text-ink-muted">
                  No prices yet. They are settled against the receipt the rider files, not
                  against this list.
                </p>
              ) : null}
            </DispatcherCard.Region>

            {/* Route. Two figures on one region rather than two matching cards. */}
            <DispatcherCard.Region padding="sm">
              <DispatcherCard.Label as="h3">The route</DispatcherCard.Label>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-label text-ink-muted">Collect from</dt>
                  <dd className="mt-0.5 truncate text-body text-ink">{primaryStore}</dd>
                  <dd className="line-clamp-2 text-label text-ink-muted">
                    {errand.pickupAddress || "Address not recorded"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-label text-ink-muted">Deliver to</dt>
                  <dd className="mt-0.5 truncate text-body text-ink">
                    {errand.customerName || "Customer"}
                  </dd>
                  <dd className="line-clamp-2 text-label text-ink-muted">
                    {errand.deliveryAddress || "Address not recorded"}
                  </dd>
                </div>
              </dl>
            </DispatcherCard.Region>

            <DispatcherCard.Region padding="sm">
              <DispatcherCard.Label as="h3">What it comes to</DispatcherCard.Label>
              <dl className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-body text-ink-muted">
                  <dt>Items</dt>
                  <dd data-figure className="font-mono text-ink">
                    {formatPeso(subtotal)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 text-body text-ink-muted">
                  <dt>Delivery</dt>
                  <dd data-figure className="font-mono text-ink">
                    {formatPeso(fee)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-hairline pt-2 text-body text-ink">
                  <dt>Total</dt>
                  <dd data-figure className="font-mono text-data text-ink">
                    {formatPeso(totalDisplay)}
                  </dd>
                </div>
              </dl>

              {Math.abs(unreconciled) > 0.01 ? (
                <p role="status" className="mt-2 text-label text-status-act-ink">
                  These lines do not add up to the recorded total. The difference is{" "}
                  {formatPeso(Math.abs(unreconciled))}, so check the figure with the customer
                  before taking payment.
                </p>
              ) : null}

              <p className="mt-2 text-label text-ink-muted">
                The delivery fee is realised on completion.{" "}
                {paymentModeName
                  ? `The customer pays by ${paymentModeName}.`
                  : "No payment mode has been chosen yet."}
              </p>
            </DispatcherCard.Region>
          </>
        ) : (
          <DispatcherCard.Region padding="md">
            <h3 className="text-panel text-ink">Talk to {errand.customerName || "the customer"}</h3>
            <p className="mt-1.5 text-body text-ink-muted">
              The conversation and the five dispatch stages open in the full console, where you
              confirm what was in stock, agree substitutions, and take payment.
            </p>
            <DispatcherButton
              variant="field"
              size="md"
              className="mt-3"
              icon={<ExternalLink size={14} />}
              onClick={() => onOpenChat(errand.id)}
            >
              Open the dispatch console
            </DispatcherButton>
          </DispatcherCard.Region>
        )}
      </div>

      {/* Action footer: a flex sibling, not an absolutely positioned overlay */}
      <div className="flex shrink-0 items-center gap-2 border-t border-hairline bg-board-plate p-3">
        {isAvailable ? (
          <>
            <DispatcherButton
              variant="primary"
              size="lg"
              className="flex-1"
              disabled={isClaiming}
              loading={isClaiming}
              loadingText="Claiming this run"
              icon={<ShieldCheck size={18} />}
              onClick={() => onClaimAndReview(errand)}
            >
              Check the order and start review
            </DispatcherButton>

            {/* Decline is secondary, not act-red. A red-ink Decline sat
                beside the red primary, putting the signal on a second meaning
                in the same row; the confirmation dialog already carries the
                commit weight that raise asks for. */}
            {onDecline ? (
              <DispatcherButton
                variant="secondary"
                size="lg"
                onClick={() => setShowDeclineConfirm(true)}
              >
                Decline
              </DispatcherButton>
            ) : null}
          </>
        ) : (
          <DispatcherButton
            variant="field"
            size="lg"
            className="w-full"
            onClick={() => onOpenChat(errand.id)}
          >
            Open the dispatch console
          </DispatcherButton>
        )}
      </div>

      {showDeclineConfirm ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-board-field-deep/50 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-modal border border-edge bg-board-plate p-5">
            <h3 className="flex items-center gap-2 text-panel text-ink">
              <AlertTriangle size={16} className="text-status-act-ink" />
              Decline this run
            </h3>
            <p className="text-body text-ink-muted">
              {errand.customerName || "The customer"} is told this was declined, and the reason is
              kept on the record.
            </p>

            <Field
              label="Why is this being declined?"
              hint="The customer reads this, so name the real reason."
            >
              {(control) => (
                <input
                  {...control}
                  type="text"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Out of service range, no rider available"
                  className={fieldInputClasses}
                />
              )}
            </Field>

            <div className="flex items-center gap-2 pt-1">
              <DispatcherButton
                variant="secondary"
                size="md"
                className="flex-1"
                disabled={isDeclining}
                onClick={() => setShowDeclineConfirm(false)}
              >
                Keep it
              </DispatcherButton>
              <DispatcherButton
                variant="primary"
                size="md"
                className="flex-1"
                loading={isDeclining}
                loadingText="Declining"
                onClick={() => void submitDecline()}
              >
                Decline it
              </DispatcherButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
