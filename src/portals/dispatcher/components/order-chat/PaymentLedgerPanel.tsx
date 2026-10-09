import * as React from "react";
import { CheckCircle2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherBadge } from "@/components/panel/DispatcherBadge";
import { DispatcherCard } from "@/components/panel/DispatcherCard";
import { DispatcherInlineBanner } from "@/components/panel/DispatcherInlineBanner";
import { copy } from "./copy";
import type { useOrderPayments } from "./hooks/useOrderPayments";

/**
 * The money on a GCash / PayMaya or Bank Transfer errand.
 *
 * Since 2026-10-08 the whole bill is paid at the door, like cash on delivery:
 * the rider photographs a transfer and the system records it, or takes cash.
 * So this panel reports; the one act left to a dispatcher is a refund.
 */

export const peso = (n: number) =>
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
  readOnly = false,
}: PaymentLedgerPanelProps) {
  const { ledger, pending, feedback, recordRefund } = payments;

  const [showRefund, setShowRefund] = React.useState(false);

  // Cash on delivery: no ledger, nothing here applies.
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

      <dl className="grid grid-cols-2 divide-x divide-hairline">
        <Figure label={c.paid} value={peso(ledger.amountPaid)} caption={c.paidCaption(ledger.amountPaid)} />
        <Figure label={c.balance} value={peso(ledger.balanceDue)} caption={c.balanceCaption} className="pl-3" />
      </dl>

      <DispatcherInlineBanner message={feedback.message} onDismiss={feedback.dismiss} />

      {/* Since 2026-10-08 nothing here is a dispatcher's to confirm: the rider
          photographs a transfer at the door and the system records it, or the
          rider takes cash. */}
      {ledger.state === "AWAITING_BALANCE" && (
        <p className="text-body text-ink-muted">{c.atDoorHint(customerFirstName, peso(ledger.balanceDue))}</p>
      )}
      {ledger.state === "SETTLED" && (
        <p className="flex items-center gap-1.5 text-label text-status-done-ink">
          <CheckCircle2 size={14} className="shrink-0" />
          {c.settled}
        </p>
      )}
      {ledger.state === "REFUNDED" && <p className="text-body text-ink-muted">{c.refunded}</p>}

      {/* what has been recorded, and who or what vouched for it */}
      {ledger.entries.length > 0 && (
        <ul className="list-none divide-y divide-hairline border-t border-hairline p-0 pt-1">
          {ledger.entries.map((e) => (
            <li key={e.id} className="flex items-baseline justify-between gap-2 py-1.5">
              <span className="min-w-0">
                <span className="block text-body text-ink">{KIND_LABEL[e.kind]}</span>
                <span className="block text-label text-ink-muted">
                  {e.confirmedBy
                    ? c.attestedBy(e.confirmedBy.name, new Date(e.confirmedAt).toLocaleString())
                    : c.recordedFromPhoto(new Date(e.confirmedAt).toLocaleString())}
                </span>
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
  UPFRONT: "Paid before delivery (old 50% plan)",
  TOP_UP: "Top-up",
  FINAL: "Paid at the door",
  REFUND: "Refund",
};

export function PlanBadge({ state }: { state: string }) {
  switch (state) {
    case "AWAITING_BALANCE":
      return <DispatcherBadge variant="info">Pay at the door</DispatcherBadge>;
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
export function ProofRow({
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

export function Figure({
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
      <dt className="m-0 text-micro font-bold uppercase tracking-[0.06em] text-ink-muted">{label}</dt>
      <dd data-figure className="m-0 font-mono text-data font-bold tabular-nums text-ink">
        {value}
      </dd>
      <p className="m-0 text-micro text-ink-muted mt-0.5">{caption}</p>
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
export function AttestationForm({
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
    "min-h-10 w-full rounded-trim border border-edge bg-board-plate px-2.5 text-body text-ink placeholder:text-ink-muted transition-colors focus:border-board-field";

  return (
    <div className="space-y-2">
      {hint && <p className="m-0 text-body text-ink-muted">{hint}</p>}

      <label className="block min-w-0">
        <span className="mb-1 block text-micro font-bold uppercase tracking-[0.06em] text-ink-muted">{c.amountLabel}</span>
        <div className="flex items-center gap-1.5">
          <span data-figure className="font-mono text-data font-bold text-ink-muted">
            {"₱"}
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            // The one themed focus outline, not a per-field navy glow.
            className={cn(field, "font-mono font-bold tabular-nums")}
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1 block text-micro font-bold uppercase tracking-[0.06em] text-ink-muted">
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
          variant="success"
          size="md"
          loading={loading}
          loadingText={loadingLabel}
          disabled={!amountValid || !noteValid}
          onClick={() => onSubmit(parsed, note)}
          className="flex-1 justify-center font-semibold"
        >
          {submitLabel}
        </DispatcherButton>
        {onCancel && (
          <DispatcherButton variant="secondary" size="md" className="font-semibold" onClick={onCancel}>
            {c.cancel}
          </DispatcherButton>
        )}
      </div>
    </div>
  );
}
