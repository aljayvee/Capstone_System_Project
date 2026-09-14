import * as React from "react";
import { HandCoins, AlertTriangle, CheckCircle2, Undo2, Receipt } from "lucide-react";
import { DispatcherButton } from "../ui/DispatcherButton";
import { DispatcherBadge } from "../ui/DispatcherBadge";
import { DispatcherInlineBanner } from "../ui/DispatcherInlineBanner";
import { copy } from "./copy";
import type { useOrderPayments } from "./hooks/useOrderPayments";

/**
 * The money on a 50% downpayment errand.
 *
 * Payment lands on the company's Facebook Page, outside this system. There is
 * no callback to trust — a dispatcher looks at that page and says whether it
 * arrived — so this panel is a place to make an ATTESTATION, and it is built to
 * feel like one. The amount is typed rather than one-tapped: a button reading
 * "confirm what we expected" would record agreement with a figure nobody read,
 * and the server refuses a mismatch precisely so that typing is meaningful.
 *
 * One state, one action. The panel never shows the dispatcher a choice between
 * confirming a downpayment and clearing an overage, because only one of those is
 * ever the next thing.
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

  // Not a downpayment errand — nothing here applies.
  if (!ledger?.hasLedger) return null;

  const c = copy.payments;

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <HandCoins size={14} className="shrink-0 text-slate-500" />
          <h4 className="text-[11px] font-extrabold text-slate-900 m-0 truncate">{c.title}</h4>
        </div>
        <PlanBadge state={ledger.state} />
      </header>

      {/* The two figures, always both — a dispatcher asked "how much is left?"
          should never have to subtract. */}
      <dl className="grid grid-cols-2 gap-2 m-0">
        {/* Label names the thing, value IS the number, caption gives it
            context. They used to carry the amount in the label AND a different
            amount as the value — "Due before dispatch: ₱500.00" over "₱0.00" —
            which put two figures with two meanings in one card. */}
        <Figure
          label={c.paidUpFront}
          value={peso(ledger.amountPaid)}
          caption={c.paidUpFrontOf(peso(ledger.dueUpFront))}
        />
        <Figure
          label={c.balance}
          value={peso(ledger.balanceDue)}
          caption="collected at the door"
        />
      </dl>

      <DispatcherInlineBanner message={feedback.message} onDismiss={feedback.dismiss} />

      {/* ── the one thing to do next ─────────────────────────────────────── */}
      {/* What the customer says they sent, read off their own screenshot by
          Cloud Vision. It does NOT confirm anything — OCR can be fooled by an
          edited image and the money is real — but it puts a reference on screen
          that the dispatcher can search the Facebook Page for, instead of
          confirming from memory. */}
      {ledger.state === "AWAITING_UPFRONT" && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Receipt size={13} className="shrink-0 text-slate-500" />
            <span className="text-[11px] font-extrabold text-slate-800">{c.proofTitle}</span>
          </div>

          {proof?.extraction ? (
            <>
              <ProofRow label={c.proofRef} value={proof.extraction.referenceNo ?? "—"} mono />
              {proof.extraction.transactionId && (
                <ProofRow label={c.proofTxn} value={proof.extraction.transactionId} mono />
              )}
              <ProofRow
                label={c.proofAmount}
                value={proof.extraction.extractedTotal != null ? peso(proof.extraction.extractedTotal) : "—"}
                mono
              />
              <ProofRow
                label={c.proofDate}
                value={
                  proof.extraction.extractedDate
                    ? new Date(proof.extraction.extractedDate).toLocaleDateString()
                    : "—"
                }
              />
              <p className="text-[10px] text-slate-400 m-0 pt-0.5">
                {c.proofRead(proof.extraction.engine)}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-slate-500 m-0">{c.proofNone}</p>
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-900 m-0">
            <AlertTriangle size={13} className="shrink-0" />
            {c.overageTitle}
          </p>
          <p className="text-[11px] text-amber-900 m-0">
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
        <p className="text-[11px] text-slate-500 m-0">
          {c.balanceHint}
        </p>
      )}

      {ledger.state === "SETTLED" && (
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 m-0">
          <CheckCircle2 size={13} className="shrink-0" />
          {c.settled}
        </p>
      )}

      {/* ── what has already been recorded, and who vouched for it ───────── */}
      {ledger.entries.length > 0 && (
        <ul className="m-0 p-0 list-none space-y-1 border-t border-slate-100 pt-2">
          {ledger.entries.map((e) => (
            <li key={e.id} className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="text-slate-600 truncate">
                <span className="font-bold text-slate-800">{KIND_LABEL[e.kind]}</span>
                {e.confirmedBy && (
                  <span className="text-slate-400">
                    {" · "}
                    {c.attestedBy(e.confirmedBy.name, new Date(e.confirmedAt).toLocaleString())}
                  </span>
                )}
              </span>
              <span
                className={`font-mono tabular-nums font-bold shrink-0 ${
                  e.kind === "REFUND" ? "text-rose-600" : "text-slate-800"
                }`}
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
        <div className="border-t border-slate-100 pt-2">
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
              icon={<Undo2 size={12} />}
              onClick={() => setShowRefund(true)}
            >
              {c.refund}
            </DispatcherButton>
          )}
        </div>
      )}
    </section>
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

function ProofRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className={`text-slate-800 font-bold ${mono ? "font-mono tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}

function Figure({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500 m-0">{label}</dt>
      <dd className="text-sm font-black text-slate-900 font-mono tabular-nums m-0">{value}</dd>
      <p className="text-[10px] text-slate-400 m-0">{caption}</p>
    </div>
  );
}

/**
 * Type the figure you are looking at.
 *
 * Pre-filled with what is due, because that is almost always the right number
 * and retyping it from scratch is friction with no safety value. Still editable,
 * and still checked by the server — a dispatcher who sees a different amount on
 * the Facebook Page must be able to say so, and the refusal that follows is the
 * control working, not an obstacle.
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

  return (
    <div className="space-y-2">
      {hint && <p className="text-[11px] text-slate-500 m-0">{hint}</p>}

      <div className="flex items-end gap-2">
        <label className="flex-1 min-w-0">
          <span className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
            {c.amountLabel}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-black">₱</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-dispatcher-navy"
            />
          </div>
        </label>
      </div>

      <label className="block">
        <span className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
          {noteRequired ? c.noteRequired : c.noteLabel}
        </span>
        <input
          type="text"
          maxLength={255}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={noteRequired ? c.refundReasonRequired : ""}
          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 text-xs outline-none focus:ring-2 focus:ring-dispatcher-navy"
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
