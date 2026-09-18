import { CreditCard, CheckCircle2 } from "lucide-react";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherInlineBanner } from "@/components/panel/DispatcherInlineBanner";
import { WaitingCard } from "../WaitingCard";
import { PaymentLedgerPanel } from "../PaymentLedgerPanel";
import { copy, formatAgo } from "../copy";

/**
 * Stage 4 — payment.
 *
 * One button. The screen this replaces had "1. Enable Payment" and
 * "2. Prompt Customer in Chat" as separately numbered controls the dispatcher
 * pressed in sequence — numbered sub-steps inside a numbered step, competing
 * with the outer numbering. Enabling without prompting does nothing a customer
 * can see, so there was never a reason to stop between them.
 */

interface Stage4Props {
  payment: ReturnType<typeof import("../hooks/useOrderPayment").useOrderPayment>;
  /** The downpayment ledger. Renders nothing unless this errand is on that plan. */
  payments: ReturnType<typeof import("../hooks/useOrderPayments").useOrderPayments>;
  /** The real receipt total and the basket the customer agreed to, for the overage copy. */
  actualBasket?: number | null;
  agreedBasket?: number | null;
  customerFirstName: string;
  /** True once the customer has approved the item list in stage 3. */
  isCustomerConfirmed: boolean;
  onNudge: () => void;
  /** Takes the dispatcher back to stage 3 when the list isn't approved yet. */
  onNeedConfirmation: (reason: string) => void;
  readOnly?: boolean;
}

export function Stage4Payment({
  payment,
  payments,
  actualBasket,
  agreedBasket,
  customerFirstName,
  isCustomerConfirmed,
  onNudge,
  onNeedConfirmation,
  readOnly = false,
}: Stage4Props) {
  const { confirmedPaymentMode, isPaymentConfirmed, isAsking, askedAt, feedback, askCustomer } =
    payment;

  const ledgerPanel = (
    <PaymentLedgerPanel
      payments={payments}
      customerFirstName={customerFirstName}
      actualBasket={actualBasket}
      agreedBasket={agreedBasket}
      readOnly={readOnly}
    />
  );

  if (readOnly) {
    return (
      <div className="space-y-3">
        <p className="m-0 text-body text-ink-muted">
          {confirmedPaymentMode ? copy.stage4.settled(confirmedPaymentMode) : "No payment recorded."}
        </p>
        {ledgerPanel}
      </div>
    );
  }

  if (isPaymentConfirmed) {
    // Choosing the method is where this stage used to end. On the downpayment
    // plan it is where the money work starts, so the ledger follows it here
    // rather than living in a stage of its own — a dispatcher chasing a payment
    // is still answering "how is this being paid for?".
    return (
      <div className="space-y-3">
        <p className="m-0 flex items-center gap-2 rounded-plate bg-status-done-fill px-3 py-2.5 text-label text-status-done-ink">
          <CheckCircle2 size={15} className="shrink-0" />
          {copy.stage4.settled(confirmedPaymentMode || "Settled")}
        </p>
        {ledgerPanel}
      </div>
    );
  }

  const minsAgo = askedAt ? Math.max(0, Math.floor((Date.now() - askedAt) / 60000)) : 0;

  /**
   * Payment cannot be arranged over a basket the customer has not agreed to —
   * they would be committing to pay for a list they never approved, and the
   * total can still change while it is unconfirmed.
   *
   * The screen this replaced enforced the same rule by disabling the button
   * (`disabled={isEnablingPayment || !step2Done}`), which told a dispatcher
   * nothing about why. Here the press is honoured as navigation: it opens the
   * stage that is actually blocking and says what is needed.
   */
  const handleAsk = () => {
    if (!isCustomerConfirmed) {
      // Carried to stage 3 rather than shown here - this stage is about to close.
      onNeedConfirmation(copy.stage4.blockedUnconfirmed(customerFirstName));
      return;
    }
    askCustomer();
  };

  return (
    <div className="space-y-3">
      <p className="m-0 text-body text-ink-muted">{copy.stage4.intro(customerFirstName)}</p>

      {askedAt && (
        <WaitingCard
          title={`Waiting for ${customerFirstName}`}
          detail={`You asked how they will pay ${formatAgo(minsAgo)}.`}
          actions={[{ label: copy.nowActions.nudge(customerFirstName), onClick: onNudge }]}
        />
      )}

      <DispatcherInlineBanner message={feedback.message} onDismiss={feedback.dismiss} />

      <DispatcherButton
        variant="primary"
        size="lg"
        loading={isAsking}
        loadingText={copy.stage4.asking}
        icon={<CreditCard size={16} />}
        onClick={handleAsk}
        className="w-full justify-center"
      >
        {copy.stage4.ask(customerFirstName)}
      </DispatcherButton>
    </div>
  );
}
