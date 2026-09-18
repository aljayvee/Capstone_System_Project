import * as React from "react";
import { AlertTriangle, CheckCircle2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherBadge } from "@/components/panel/DispatcherBadge";
import { DispatcherCard } from "@/components/panel/DispatcherCard";
import { DispatcherInlineBanner } from "@/components/panel/DispatcherInlineBanner";
import { copy } from "./copy";
import type { useOrderPayments } from "./hooks/useOrderPayments";

/**
 * The money on a 50% downpayment errand.
 *
 * Payment lands on the company Facebook Page, outside this system. There is no
 * callback to trust - a dispatcher looks at that page and says whether it
 * arrived - so this panel is a place to make an ATTESTATION, and it is built
 * to feel like one. The amount is typed rather than one-tapped: a button
 * reading "confirm what we expected" would record agreement with a figure
 * nobody read, and the server refuses a mismatch precisely so that typing is
 * meaningful.
 *
 * One state, one action. The panel never shows the dispatcher a choice between
 * confirming a downpayment and clearing an overage, because only one of those
 * is ever the next thing.
 *
 * Route board build. This panel renders inside a stage body, which is already
 * inside the stage card, and it opened with `bg-white border rounded-xl` and
 * then put two more bordered boxes inside that: four levels of surface for one
 * ledger. It is regions on the stage plate now, and the two figures sit either
 * side of one rule instead of in two matching boxes.
 *
 * Three em dash placeholders are gone. A dash where a reference number should
 * be tells a dispatcher nothing about whether the OCR failed, the field was
 * blank, or nobody has uploaded anything - and this is the screen where money
 * gets vouched for.
 */

const peso = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PaymentLedgerPanelProps {
  payments: ReturnType<typeof useOrderPayments>;
  customerFirstName: string;
  /** The real receipt total, once the rider has filed one. */
  actualBasket?: number | null;
  /** What the customer agreed to at confirmation. */
  agreedBasket?: number | null;
  readOnly?: boolean;
}

export function PaymentLedgerPanel({
  payments,
  customerFirstName,
  actualBasket,
  agreedBasket,
  readOnly = false,
}: PaymentLedgerPanelProps) {
  const { ledger, proof, pending, feedback, confirmUpfront, confirmTopUp, recordRefund } = payments;

  const [showRefund, setShowRefund] = React.useState(false);

  // Not a downpayment errand - nothing here applies.
  if (!ledger?.hasLedger) return null;

  const c = copy.payments;

  return (
    <DispatcherCard.Region padding="sm" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <DispatcherCard.Label as="h4" className="mb-0 min-w-0 flex-1">
          {c.title}
        </DispatcherCard.Label>
        <PlanBadge state={ledger.state} />
      </div>

      {/* The two figures, always both - a dispatcher asking "how much is left?"
          should never have to subtract. Label names the thing, value IS the
          number, caption gives it context. They used to carry the amount in the
          label AND a different amount as the value ("Due before dispatch:
          500.00" over "0.00"), which put two figures with two meanings in one
          box. */}
      <dl className="m-0 grid grid-cols-2 divide-x divide-hairline">
        <Figure
          label={c.paidUpFront}
          value={peso(ledger.amountPaid)}
          caption={c.paidUpFrontOf(peso(ledger.dueUpFront))}
        />
        <Figure
          label={c.balance}
          value={peso(ledger.balanceDue)}
          caption="collected at the door"
          className="pl-3"
        />
      </dl>

      <DispatcherInlineBanner message={feedback.message} onDismiss={feedback.dismiss} />

      {/* ── the one thing to do next ─────────────────────────────────────── */}
      {/* What the customer says they sent, read off their own screenshot by
          Cloud Vision. It does NOT confirm anything - OCR can be fooled by an
          edited image and the money is real - but it puts a reference on screen
          that the dispatcher can search the Facebook Page for, instead of
          confirming from memory. */}
      {ledger.state === "AWAITING_UPFRONT" && (
        <div>
          <DispatcherCard.Label as="h5">{c.proofTitle}</DispatcherCard.Label>

          {proof?.extraction ? (
            <>
              <ProofRow label={c.proofRef} value={proof.extraction.referenceNo} mono />
              {proof.extraction.transactionId && (
                <ProofRow label={c.proofTxn} value={proof.extraction.transactionId} mono />
              )}
              <ProofRow
                label={c.proofAmount}
                value={
                  proof.extraction.extractedTotal != null
                    ? peso(proof.extraction.extractedTotal)
                    : null
                }
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
              <p className="m-0 pt-1 text-label text-ink-muted">
                {c.proofRead(proof.extraction.engine)}
              </p>
            </>
          ) : (
            <p className="m-0 text-body text-ink-muted">{c.proofNone}</p>
          )}
        </div>
      )}

      {!readOnly && ledger.state === "AWAITING_UPFRONT" && (
        <AttestationForm
          hint={c.downpaymentHint(customerFirstName, peso(ledger.dueUpFront))}
          defaultAmount={ledger.dueUpFront}
          submitLabel={c.confirmUpfront}
          loadingLabel={c.confirmingUpfront}
          loading={pending === "upfront"}
          onSubmit={(amount, note) => confirmUpfront(amount, note)}
        />
      )}

      {!readOnly && ledger.state === "OVERAGE_PENDING" && (
        <div className="space-y-2 rounded-trim bg-status-waiting-fill p-3">
          <p className="m-0 flex items-center gap-1.5 text-label text-status-waiting-ink">
            <AlertTriangle size={14} className="shrink-0" />
            {c.overageTitle}
          </p>
          <p className="m-0 text-body text-status-waiting-ink">
            {c.overageHint(
              peso(agreedBasket ?? 0),
              peso(actualBasket ?? 0),
              peso(Math.max(0, (actualBasket ?? 0) - (agreedBasket ?? 0)))
            )}
          </p>
          <AttestationForm
            defaultAmount={Math.max(0, (actualBasket ?? 0) - (agreedBasket ?? 0))}
            submitLabel={c.confirmTopUp}
            loadingLabel={c.confirmingTopUp}
            loading={pending === "top-up"}
            onSubmit={(amount, note) => confirmTopUp(amount, note)}
          />
        </div>
      )}

      {!readOnly && ledger.state === "AWAITING_BALANCE" && (
        <p className="m-0 text-body text-ink-muted">{c.balanceHint}</p>
      )}

      {ledger.state === "SETTLED" && (
        <p className="m-0 flex items-center gap-1.5 text-label text-status-done-ink">
          <CheckCircle2 size={14} className="shrink-0" />
          {c.settled}
        </p>
      )}

      {/* ── what has already been recorded, and who vouched for it ───────── */}
      {ledger.entries.length > 0 && (
        <ul className="m-0 list-none divide-y divide-hairline border-t border-hairline p-0 pt-1">
          {ledger.entries.map((e) => (
            <li key={e.id} className="flex items-baseline justify-between gap-2 py-1.5">
              <span className="min-w-0 truncate text-body text-ink-muted">
                <span className="text-ink">{KIND_LABEL[e.kind]}</span>
                {e.confirmedBy && (
                  <span>
                    {" · "}
                    {c.attestedBy(e.confirmedBy.name, new Date(e.confirmedAt).toLocaleString())}
                  </span>
                )}
              </span>
              <span
                data-figure
                className={cn(
                  "shrink-0 font-mono text-label tabular-nums",
                  e.kind === "REFUND" ? "text-status-act-ink" : "text-ink"
                )}
              >
                {e.kind === "REFUND" ? "−" : ""}
                {peso(e.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Refund is deliberately last, small, and behind a disclosure. It is the
          rarest action here and the most consequential to press by accident. */}
      {!readOnly && ledger.amountPaid > 0 && (
        <div className="border-t border-hairline pt-2">
          {showRefund ? (
            <AttestationForm
              defaultAmount={ledger.amountPaid}
              submitLabel={c.refund}
              loadingLabel={c.refunding}
              loading={pending === "refund"}
              noteRequired
              onCancel={() => setShowRefund(false)}
              onSubmit={async (amount, note) => {
                const ok = await recordRefund(amount, note ?? "");
                if (ok) setShowRefund(false);
                return ok;
              }}
            />
          ) : (
            <DispatcherButton
              variant="danger-ghost"
              size="sm"
              icon={<Undo2 size={14} />}
              onClick={() => setShowRefund(true)}
            >
              {c.refund}
            </DispatcherButton>
          )}
        </div>
      )}
    </DispatcherCard.Region>
  );
}

const KIND_LABEL: Record<string, string> = {
  UPFRONT: "Paid up front",
  TOP_UP: "Top-up",
  FINAL: "Balance",
  REFUND: "Refund",
};

function PlanBadge({ state }: { state: string }) {
  switch (state) {
    case "AWAITING_UPFRONT":
      return <DispatcherBadge variant="warning">Awaiting payment</DispatcherBadge>;
    case "OVERAGE_PENDING":
      return <DispatcherBadge variant="danger">Goods held</DispatcherBadge>;
    case "AWAITING_BALANCE":
      return <DispatcherBadge variant="info">Balance outstanding</DispatcherBadge>;
    case "SETTLED":
      return <DispatcherBadge variant="success">Paid in full</DispatcherBadge>;
    case "REFUNDED":
      return <DispatcherBadge variant="neutral">Refunded</DispatcherBadge>;
    default:
      return null;
  }
}

/**
 * A field read off the customer's screenshot.
 *
 * A null value says the OCR did not return this field, in words. It used to
 * render an em dash, which reads as a value rather than as its absence.
 */
function ProofRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  const missing = value == null || value === "";
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="text-body text-ink-muted">{label}</span>
      <span
        data-figure={mono && !missing ? "" : undefined}
        className={cn(
          "text-label",
          missing ? "text-ink-muted" : "text-ink",
          mono && !missing && "font-mono tabular-nums"
        )}
      >
        {missing ? "Not read" : value}
      </span>
    </div>
  );
}

function Figure({
  label,
  value,
  caption,
  className,
}: {
  label: string;
  value: string;
  caption: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 pr-3", className)}>
      <dt className="m-0 text-micro uppercase text-ink-muted">{label}</dt>
      <dd data-figure className="m-0 font-mono text-data tabular-nums text-ink">
        {value}
      </dd>
      <p className="m-0 text-label text-ink-muted">{caption}</p>
    </div>
  );
}

/**
 * Type the figure you are looking at.
 *
 * Pre-filled with what is due, because that is almost always the right number
 * and retyping it from scratch is friction with no safety value. Still
 * editable, and still checked by the server - a dispatcher who sees a different
 * amount on the Facebook Page must be able to say so, and the refusal that
 * follows is the control working, not an obstacle.
 */
function AttestationForm({
  hint,
  defaultAmount,
  submitLabel,
  loadingLabel,
  loading,
  noteRequired = false,
  onSubmit,
  onCancel,
}: {
  hint?: string;
  defaultAmount: number;
  submitLabel: string;
  loadingLabel: string;
  loading: boolean;
  noteRequired?: boolean;
  onSubmit: (amount: number, note?: string) => Promise<boolean> | void;
  onCancel?: () => void;
}) {
  const [amount, setAmount] = React.useState(String(defaultAmount || ""));
  const [note, setNote] = React.useState("");
  const c = copy.payments;

  const parsed = Number(amount);
  const amountValid = Number.isFinite(parsed) && parsed > 0;
  const noteValid = !noteRequired || note.trim().length > 0;

  const field =
    "min-h-10 w-full rounded-trim border border-edge bg-board-plate px-2 text-body text-ink placeholder:text-ink-muted transition-colors focus:border-board-field";

  return (
    <div className="space-y-2">
      {hint && <p className="m-0 text-body text-ink-muted">{hint}</p>}

      <label className="block min-w-0">
        <span className="mb-1 block text-micro uppercase text-ink-muted">{c.amountLabel}</span>
        <div className="flex items-center gap-1.5">
          <span data-figure className="font-mono text-data text-ink-muted">
            {"₱"}
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            // The one themed focus outline, not a per-field navy glow.
            className={cn(field, "font-mono tabular-nums")}
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1 block text-micro uppercase text-ink-muted">
          {noteRequired ? c.noteRequired : c.noteLabel}
        </span>
        <input
          type="text"
          maxLength={255}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={noteRequired ? c.refundReasonRequired : ""}
          className={field}
        />
      </label>

      <div className="flex items-center gap-2">
        <DispatcherButton
          variant="primary"
          size="md"
          loading={loading}
          loadingText={loadingLabel}
          disabled={!amountValid || !noteValid}
          onClick={() => onSubmit(parsed, note)}
          className="flex-1 justify-center"
        >
          {submitLabel}
        </DispatcherButton>
        {onCancel && (
          <DispatcherButton variant="secondary" size="md" onClick={onCancel}>
            {c.cancel}
          </DispatcherButton>
        )}
      </div>
    </div>
  );
}
