import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { apiClient, getMemoryAccessToken } from "../../../../../services/apiClient";
import { useInlineMessage } from "@/components/panel/DispatcherInlineBanner";
import { copy } from "../copy";

/**
 * The money on a 50% downpayment errand.
 *
 * Separate from useOrderPayment, which is about the customer CHOOSING a method.
 * This is about a dispatcher attesting that money actually arrived on the
 * company's Facebook Page — a different act, by a different person, at a
 * different moment, and the only one of the two that touches a ledger.
 *
 * Every figure here is the server's. Nothing is derived in this hook: the
 * downpayment due, the balance and the plan state all come from
 * `GET /errands/:id/payments`, so the dispatcher's panel, the customer's
 * breakdown and the rider's cash step cannot disagree about what is owed.
 */

export interface PaymentLedgerEntry {
  id: string;
  kind: "UPFRONT" | "TOP_UP" | "FINAL" | "REFUND";
  amount: number;
  confirmedAt: string;
  note: string | null;
  confirmedBy: { id: number; name: string; role: string } | null;
}

export interface PaymentLedger {
  errandId: string;
  /** False on COD, where there is no ledger and nothing below applies. */
  hasLedger: boolean;
  /** Half the goods: half of what the rider actually paid, once they have. */
  dueUpFront: number;
  /** The goods figure the half is taken on. The rider's receipts once filed. */
  goodsTotal: number;
  /** When the rider, holding every item, asked for the half. Null until then. */
  halfPaymentRequestedAt: string | null;
  amountPaid: number;
  /** What the rider collects at the door. */
  balanceDue: number;
  state:
    | "AWAITING_UPFRONT"
    | "OVERAGE_PENDING"
    | "AWAITING_BALANCE"
    | "SETTLED"
    | "REFUNDED";
  overageEscalatedAt: string | null;
  overageResolvedAt: string | null;
  entries: PaymentLedgerEntry[];
}

type Action = "upfront" | "top-up" | "balance" | "refund";

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

interface UseOrderPaymentsArgs {
  orderId: string;
  /** Refreshes the errand after a top-up, which reprices the handling fee. */
  onOrderUpdated?: (errand: any) => void;
}

export interface PaymentProof {
  id: number;
  capturedAt: string;
  clarityVerdict: string | null;
  extraction: {
    extractedTotal: number | null;
    extractedDate: string | null;
    referenceNo: string | null;
    transactionId: string | null;
    engine: string;
  } | null;
}

export function useOrderPayments({ orderId, onOrderUpdated }: UseOrderPaymentsArgs) {
  const [ledger, setLedger] = useState<PaymentLedger | null>(null);
  const [proof, setProof] = useState<PaymentProof | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<Action | null>(null);
  const feedback = useInlineMessage();

  const refresh = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const [led, prf] = await Promise.all([
        apiClient.get(`/errands/${orderId}/payments`),
        // The customer's own receipt, where they have sent one. Fetched
        // together so the panel never shows a confirm button and the evidence
        // for it a render apart.
        apiClient.get(`/errands/${orderId}/payment-proof`).catch(() => null),
      ]);
      setLedger(led.data?.ledger ?? null);
      setProof(prf?.data?.proof ?? null);
    } catch (err) {
      // A COD errand has no ledger and this 404s or returns a null plan — not a
      // failure worth putting in front of a dispatcher, who did not ask for it.
      console.warn("Failed to fetch payment ledger:", err);
      setLedger(null);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live, not on reload. The rider asking, the customer's receipt landing and
  // an automatic confirmation all happen while this panel is open, and it used
  // to learn about none of them until the dispatcher pressed something.
  // Authenticated, because these are errand-scoped events: an anonymous socket
  // (like useOrderPayment's) is never in the staff room they are sent to.
  useEffect(() => {
    if (!orderId) return;
    const socket: Socket = io(BACKEND_URL, {
      auth: { token: getMemoryAccessToken() ?? undefined },
    });
    const onEvent = (payload: { errandId?: string } | undefined) => {
      if (payload?.errandId && String(payload.errandId) === String(orderId)) void refresh();
    };
    socket.on("errand:payment_updated", onEvent);
    socket.on("errand:payment_proof_uploaded", onEvent);
    socket.on("errand:half_payment_requested", onEvent);
    // Anything missed while disconnected.
    socket.on("connect", () => void refresh());
    return () => {
      socket.disconnect();
    };
  }, [orderId, refresh]);

  /**
   * Records one attestation.
   *
   * The server compares the amount against what it believes is due and refuses
   * a mismatch — so its message is surfaced verbatim rather than replaced with
   * a generic failure. A dispatcher who typed ₱250 where ₱500 was due needs to
   * be told the figure, not that something went wrong.
   */
  const record = useCallback(
    async (action: Action, amount: number, note?: string, proofImageId?: number) => {
      setPending(action);
      feedback.dismiss();
      try {
        const res = await apiClient.post(`/errands/${orderId}/payments/${action}`, {
          amount,
          ...(note?.trim() ? { note: note.trim() } : {}),
          ...(proofImageId ? { proofImageId } : {}),
        });
        const next: PaymentLedger | null = res.data?.ledger ?? null;
        setLedger(next);

        // A top-up re-stamps the handling-fee ceiling and reprices the errand,
        // so the surrounding screen's copy of it is now stale.
        if (action === "top-up" && onOrderUpdated) {
          try {
            const fresh = await apiClient.get(`/errands/${orderId}`);
            onOrderUpdated(fresh.data?.errand ?? fresh.data);
          } catch {
            // The ledger write succeeded; a stale fee panel is not worth
            // reporting as a failure of the thing the dispatcher just did.
          }
        }

        return { ok: true as const, ledger: next };
      } catch (err: any) {
        const serverMessage = err?.response?.data?.error;
        feedback.showError(serverMessage || copy.payments.failed);
        return { ok: false as const, ledger: null };
      } finally {
        setPending(null);
      }
    },
    [orderId, feedback, onOrderUpdated]
  );

  const confirmUpfront = useCallback(
    async (amount: number, note?: string, proofImageId?: number) => {
      const r = await record("upfront", amount, note, proofImageId);
      if (r.ok) feedback.showSuccess(copy.payments.upfrontConfirmed(peso(amount)));
      return r.ok;
    },
    [record, feedback]
  );

  const confirmTopUp = useCallback(
    async (amount: number, note?: string) => {
      const r = await record("top-up", amount, note);
      if (r.ok) feedback.showSuccess(copy.payments.topUpConfirmed(peso(amount)));
      return r.ok;
    },
    [record, feedback]
  );

  const confirmBalance = useCallback(
    async (amount: number, note?: string, proofImageId?: number) => {
      const r = await record("balance", amount, note, proofImageId);
      if (r.ok) feedback.showSuccess(copy.payments.balanceConfirmed(peso(amount)));
      return r.ok;
    },
    [record, feedback]
  );

  const recordRefund = useCallback(
    async (amount: number, note: string) => {
      const r = await record("refund", amount, note);
      if (r.ok) feedback.showSuccess(copy.payments.refundConfirmed(peso(amount)));
      return r.ok;
    },
    [record, feedback]
  );

  return {
    ledger,
    proof,
    isLoading,
    pending,
    feedback,
    refresh,
    confirmUpfront,
    confirmTopUp,
    confirmBalance,
    recordRefund,
    /**
     * True unless the half is owed and has not arrived. Always true on COD.
     * No longer gates stage 5: the half is collected mid-way, after purchase.
     */
    isUpfrontConfirmed:
      !ledger?.hasLedger || ledger.entries.some((e) => e.kind === "UPFRONT"),
    isOveragePending: ledger?.state === "OVERAGE_PENDING",
  };
}

function peso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
