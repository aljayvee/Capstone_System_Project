import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { apiClient, getMemoryAccessToken } from "../../../../../services/apiClient";
import { useInlineMessage } from "@/components/panel/DispatcherInlineBanner";
import { copy } from "../copy";

/*
 * There is no payment card in the chat any more (2026-10-15). It used to go out
 * with the item list, a second button beside Approve. Now the customer's
 * Approve opens the choice itself, in a dialog they cannot dismiss, and an
 * approved list with no choice reads "Choose payment method" on the order
 * summary. The customer app hides the cards older chats still hold.
 */

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

interface UseOrderPaymentArgs {
  orderId: string;
  customerDisplayName: string;
  onOrderUpdated: (errand: any) => void;
  /** A message in the customer's chat, with its push (useOrderChat.pushMessage). */
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
  const [isReminding, setIsReminding] = useState(false);
  const [askedAt, setAskedAt] = useState<number | null>(null);
  const feedback = useInlineMessage();

  /**
   * The choice on record, read from the server. Also the answer to the
   * customer's stamp on the order summary (OrderChatScreen): that stamp is a
   * cue to look, never the record itself. A choice is never cleared by a
   * failed read, only replaced by a newer one.
   */
  const refreshSelection = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await apiClient.get(`/errands/${orderId}/payment-selection`);
      const name = res.data?.paymentMode?.name ?? null;
      if (name) setConfirmedPaymentMode(name);
    } catch (err) {
      console.warn("Failed to fetch payment selection:", err);
    }
  }, [orderId]);

  useEffect(() => {
    void refreshSelection();
  }, [refreshSelection]);

  // Signed in, because both events are errand-scoped and go to the staff room.
  // This socket was anonymous, and an anonymous socket joins no room, so
  // neither event ever arrived: a customer's choice reached this screen only on
  // a reload, and the step never moved on to assigning a rider by itself.
  useEffect(() => {
    if (!orderId) return;
    const socket: Socket = io(BACKEND_URL, {
      auth: { token: getMemoryAccessToken() ?? undefined },
    });
    socket.on(
      "payment:selected",
      (payload: { errandId: string; paymentMode?: { name: string } }) => {
        if (String(payload.errandId) !== String(orderId)) return;
        if (payload.paymentMode?.name) setConfirmedPaymentMode(payload.paymentMode.name);
        else void refreshSelection();
      }
    );
    socket.on("order:confirmed", (payload: { errandId: string }) => {
      if (String(payload.errandId) !== String(orderId)) return;
      onCustomerConfirmed();
    });
    // Anything chosen while this was disconnected.
    socket.on("connect", () => void refreshSelection());
    return () => {
      socket.disconnect();
    };
    // onCustomerConfirmed is a stable setter from useOrderItems.
  }, [orderId, onCustomerConfirmed, refreshSelection]);

  /**
   * Opens the payment choice for the customer: the server refuses one until
   * this has run. Sent with the item list, so Approve leads straight to it.
   * Nothing is posted in the chat; the order summary is where they choose.
   */
  const askCustomer = useCallback(async () => {
    setIsAsking(true);
    feedback.dismiss();
    try {
      const res = await apiClient.post(`/errands/${orderId}/enable-payment`);
      onOrderUpdated(res.data?.errand || res.data);
      setAskedAt(Date.now());
      feedback.showSuccess(copy.stage4.asked(customerDisplayName));
    } catch (err) {
      console.error("Failed to enable payment selection:", err);
      feedback.showError(copy.stage4.failed);
    } finally {
      setIsAsking(false);
    }
  }, [orderId, onOrderUpdated, feedback, customerDisplayName]);

  /**
   * "Resend Payment Method", for a customer who approved and closed the app
   * before choosing. A message pointing at the button their order summary now
   * shows, with a push; there is no payment card to send again.
   */
  const remindCustomer = useCallback(async () => {
    setIsReminding(true);
    feedback.dismiss();
    try {
      pushMessage({ text: copy.chatCards.paymentReminder });
      feedback.showSuccess(copy.stage4.reminded(customerDisplayName));
    } catch (err) {
      console.error("Failed to remind about the payment method:", err);
      feedback.showError(copy.stage4.remindFailed);
    } finally {
      setIsReminding(false);
    }
  }, [pushMessage, feedback, customerDisplayName]);

  return {
    confirmedPaymentMode,
    isPaymentConfirmed: Boolean(confirmedPaymentMode),
    isAsking,
    askedAt,
    feedback,
    askCustomer,
    isReminding,
    remindCustomer,
    refreshSelection,
  };
}
