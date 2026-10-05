import { CreditCard, CheckCircle2, Receipt } from "lucide-react";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherInlineBanner } from "@/components/panel/DispatcherInlineBanner";
import { WaitingCard } from "../WaitingCard";
import { PaymentLedgerPanel } from "../PaymentLedgerPanel";
import { copy, formatAgo } from "../copy";

/**
 * The payment half of step 2, "Confirm items and payment".
 *
 * Asking is no longer a step of its own: sending the item list asks too (see
 * OrderChatScreen's onListSent), so this section mostly reports. The one
 * button left is a recovery: shown only when the list is out but the question
 * never reached the customer, because the ask failed or the order predates the
 * merge.
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
  /** The item list is in the customer's chat. */
  hasSentList: boolean;
  /**
   * The customer has been asked, in this session or before it
   * (`paymentEnabledAt`), so the question is not offered again.
   */
  isPrompted: boolean;
  /**
   * The customer has approved the list. Until then the list's own waiting card
   * carries the nudge, and a second identical card here would only repeat it.
   */
  isListApproved: boolean;
  onNudge: () => void;
  onOpenProof?: () => void;
  readOnly?: boolean;
}

export function Stage4Payment({
  payment,
  payments,
  actualBasket,
  agreedBasket,
  customerFirstName,
  hasSentList,
  isPrompted,
  isListApproved,
  onNudge,
  onOpenProof,
  readOnly = false,
}: Stage4Props) {
  const { confirmedPaymentMode, isPaymentConfirmed, isAsking, askedAt, feedback, askCustomer } =
    payment;

  const ledgerPanel = (
    <div className="space-y-2">
      <PaymentLedgerPanel
        payments={payments}
        customerFirstName={customerFirstName}
        actualBasket={actualBasket}
        agreedBasket={agreedBasket}
        readOnly={readOnly}
      />
      {payments.ledger?.hasLedger && onOpenProof && (
        <button
          type="button"
          onClick={onOpenProof}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-plate border border-edge bg-board-plate px-3 py-2 text-micro uppercase text-ink transition-colors hover:bg-board-ground"
        >
          <Receipt size={14} />
          View Uploaded Proof & Attestation
        </button>
      )}
    </div>
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

  return (
    <div className="space-y-3">
      {!hasSentList ? (
        <p className="m-0 text-body text-ink-muted">{copy.stage4.asksWithList(customerFirstName)}</p>
      ) : isPrompted && !isListApproved ? (
        <p className="m-0 text-body text-ink-muted">
          {askedAt ? `You asked how they will pay ${formatAgo(minsAgo)}. ` : ""}
          {copy.stage4.answersEitherOrder}
        </p>
      ) : isPrompted ? (
        <WaitingCard
          title={`Waiting for ${customerFirstName}`}
          detail={
            askedAt
              ? `You asked how they will pay ${formatAgo(minsAgo)}.`
              : copy.stage4.intro(customerFirstName)
          }
          actions={[{ label: copy.nowActions.nudge(customerFirstName), onClick: onNudge }]}
        />
      ) : (
        // The list is out and the question is not: say so, and offer it.
        <div className="space-y-2 rounded-plate bg-status-waiting-fill px-3 py-2.5">
          <p className="m-0 text-label text-status-waiting-ink">{copy.stage4.notAsked(customerFirstName)}</p>
          <DispatcherButton
            variant="secondary"
            size="sm"
            loading={isAsking}
            loadingText={copy.stage4.asking}
            icon={<CreditCard size={14} />}
            onClick={() => void askCustomer()}
          >
            {copy.stage4.ask(customerFirstName)}
          </DispatcherButton>
        </div>
      )}

      <DispatcherInlineBanner message={feedback.message} onDismiss={feedback.dismiss} />
    </div>
  );
}
