import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { apiClient } from "../../../../../services/apiClient";
import { useInlineMessage } from "../../ui/DispatcherInlineBanner";
import { copy } from "../copy";

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

interface UseOrderPaymentArgs {
  orderId: string;
  customerDisplayName: string;
  onOrderUpdated: (errand: any) => void;
  pushMessage: (payload: Record<string, any>) => void;
  onCustomerConfirmed: () => void;
}

export function useOrderPayment({
  orderId,
  customerDisplayName,
  onOrderUpdated,
  pushMessage,
  onCustomerConfirmed,
}: UseOrderPaymentArgs) {
  const [confirmedPaymentMode, setConfirmedPaymentMode] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [askedAt, setAskedAt] = useState<number | null>(null);
  const feedback = useInlineMessage();

  useEffect(() => {
    async function fetchPaymentSelection() {
      try {
        const res = await apiClient.get(`/errands/${orderId}/payment-selection`);
        setConfirmedPaymentMode(res.data?.paymentMode?.name ?? null);
      } catch (err) {
        console.warn("Failed to fetch payment selection:", err);
      }
    }
    if (orderId) fetchPaymentSelection();
  }, [orderId]);

  // Both of these are global `io.emit` broadcasts server-side, which is why an
  // unauthenticated socket receives them. Payloads are filtered by errandId.
  useEffect(() => {
    const socket: Socket = io(BACKEND_URL);
    socket.on(
      "payment:selected",
      (payload: { errandId: string; paymentMode?: { name: string } }) => {
        if (String(payload.errandId) !== String(orderId)) return;
        setConfirmedPaymentMode(payload.paymentMode?.name ?? null);
      }
    );
    socket.on("order:confirmed", (payload: { errandId: string }) => {
      if (String(payload.errandId) !== String(orderId)) return;
      onCustomerConfirmed();
    });
    return () => {
      socket.disconnect();
    };
    // onCustomerConfirmed is a stable setter from useOrderItems.
  }, [orderId, onCustomerConfirmed]);

  /**
   * One action, not two. The screen this replaces had "1. Enable Payment" and
   * "2. Prompt Customer in Chat" as separate numbered buttons the dispatcher
   * had to press in order — numbered sub-steps inside a numbered step. Enabling
   * without prompting does nothing a customer can see, so there was never a
   * reason to stop between them.
   */
  const askCustomer = useCallback(async () => {
    setIsAsking(true);
    feedback.dismiss();
    try {
      const res = await apiClient.post(`/errands/${orderId}/enable-payment`);
      onOrderUpdated(res.data?.errand || res.data);

      pushMessage({
        type: "payment_prompt",
        text: "Please choose your payment method so I can confirm it. No payment is being taken right now.",
      });

      setAskedAt(Date.now());
      feedback.showSuccess(copy.stage4.asked(customerDisplayName));
    } catch (err) {
      console.error("Failed to enable payment selection:", err);
      feedback.showError(copy.stage4.failed);
    } finally {
      setIsAsking(false);
    }
  }, [orderId, onOrderUpdated, pushMessage, feedback, customerDisplayName]);

  return {
    confirmedPaymentMode,
    isPaymentConfirmed: Boolean(confirmedPaymentMode),
    isAsking,
    askedAt,
    feedback,
    askCustomer,
  };
}
