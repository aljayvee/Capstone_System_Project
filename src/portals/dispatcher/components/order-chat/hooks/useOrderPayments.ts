import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { apiClient, getMemoryAccessToken } from "../../../../../services/apiClient";
import { useInlineMessage } from "@/components/panel/DispatcherInlineBanner";
import { copy } from "../copy";

/**
 * The money on a GCash / PayMaya or Bank Transfer errand.
 *
 * Separate from useOrderPayment, which is about the customer CHOOSING a method.
 * Since 2026-10-08 the whole bill is paid at the door, like cash on delivery:
 * the rider photographs a transfer and the system records it, or takes cash.
 * So this only reads the ledger, and records the one act still a dispatcher's,
 * a refund.
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
  /** The goods figure: the rider's receipts once filed. */
  goodsTotal: number;
  amountPaid: number;
  /** What the rider collects at the door. */
  balanceDue: number;
  state: "AWAITING_BALANCE" | "SETTLED" | "REFUNDED";
  entries: PaymentLedgerEntry[];
}

type Action = "refund";

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

interface UseOrderPaymentsArgs {
  orderId: string;
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

export function useOrderPayments({ orderId }: UseOrderPaymentsArgs) {
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
        // A screenshot the customer uploaded themselves, on errands from before
        // the 50% was retired. Read for the record; nothing is confirmed from it.
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

  // Live, not on reload. The transfer the rider photographs at the door is
  // recorded while this panel is open, and it should show at once.
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
        return { ok: true as const, ledger: next };
      } catch (err: any) {
        const serverMessage = err?.response?.data?.error;
        feedback.showError(serverMessage || copy.payments.failed);
        return { ok: false as const, ledger: null };
      } finally {
        setPending(null);
      }
    },
    [orderId, feedback]
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
    recordRefund,
  };
}

function peso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
