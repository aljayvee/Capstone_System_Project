import { useState, useEffect, useRef, useCallback } from "react";
import { ref, push, onValue, set, onDisconnect } from "firebase/database";
import { database } from "../../../../../firebase/config";
import type { OrderChatMessage } from "../types";

interface UseOrderChatArgs {
  orderId: string;
  dispatcher: any;
  dispatcherFirstName: string;
  /** Chat only subscribes once the errand is loaded and access is granted. */
  enabled: boolean;
  readOnly: boolean;
}

interface UseOrderChatResult {
  messages: OrderChatMessage[];
  isLoading: boolean;
  inputText: string;
  onInputChange: (text: string) => void;
  sendMessage: (e?: React.FormEvent) => void;
  /** Drops text into the composer without sending — used by quick replies. */
  prefill: (text: string) => void;
  customerOnline: boolean;
  customerLastSeen: number | null;
  isCustomerTyping: boolean;
  customerTypingName: string;
  stopTyping: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  /** Pushes a typed card (pinpoints, order_confirmation, …) into the thread. */
  pushMessage: (payload: Record<string, any>) => void;
}

/**
 * All Firebase RTDB chat wiring: the message feed, presence, and typing.
 *
 * Chat has no server-side record in this product — it lives entirely in RTDB
 * and is written client-side. That is a deliberate existing design decision,
 * not something this hook changes.
 */
export function useOrderChat({
  orderId,
  dispatcher,
  dispatcherFirstName,
  enabled,
  readOnly,
}: UseOrderChatArgs): UseOrderChatResult {
  const [messages, setMessages] = useState<OrderChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");

  const [customerOnline, setCustomerOnline] = useState(false);
  const [customerLastSeen, setCustomerLastSeen] = useState<number | null>(null);
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const [customerTypingName, setCustomerTypingName] = useState("Customer");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dispatcherTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customerTypingCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCustomerTypingTimestampRef = useRef<number>(0);

  // ── message feed ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !orderId) return;
    const messagesRef = ref(database, `chats/${orderId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed: OrderChatMessage[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        parsed.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(parsed);
      } else {
        setMessages([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [orderId, enabled]);

  // ── presence + typing ───────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !orderId) return;

    const myPresenceRef = ref(database, `chats/${orderId}/presence/dispatcher`);
    const customerPresenceRef = ref(database, `chats/${orderId}/presence/customer`);
    const customerTypingRef = ref(database, `chats/${orderId}/typing/customer`);
    const connectedRef = ref(database, ".info/connected");

    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        void onDisconnect(myPresenceRef).set({
          online: false,
          lastSeen: Date.now(),
          role: "dispatcher",
          name: dispatcherFirstName,
        });
        void set(myPresenceRef, {
          online: true,
          lastSeen: Date.now(),
          role: "dispatcher",
          name: dispatcherFirstName,
        });
      }
    });

    const unsubCustomerPresence = onValue(customerPresenceRef, (snap) => {
      const val = snap.val();
      setCustomerOnline(Boolean(val?.online));
      setCustomerLastSeen(typeof val?.lastSeen === "number" ? val.lastSeen : null);
    });

    const unsubCustomerTyping = onValue(customerTypingRef, (snap) => {
      const val = snap.val();
      if (val && val.isTyping) {
        lastCustomerTypingTimestampRef.current = val.timestamp || Date.now();
        setIsCustomerTyping(true);
        setCustomerTypingName(val.name || "Customer");
      } else {
        setIsCustomerTyping(false);
      }
    });

    // Nothing clears a stale typing flag if the customer's app dies mid-keystroke.
    customerTypingCheckRef.current = setInterval(() => {
      if (
        lastCustomerTypingTimestampRef.current > 0 &&
        Date.now() - lastCustomerTypingTimestampRef.current > 4000
      ) {
        setIsCustomerTyping(false);
      }
    }, 1500);

    return () => {
      unsubConnected();
      unsubCustomerPresence();
      unsubCustomerTyping();
      if (customerTypingCheckRef.current) clearInterval(customerTypingCheckRef.current);
      if (dispatcherTypingTimeoutRef.current) clearTimeout(dispatcherTypingTimeoutRef.current);

      void set(myPresenceRef, {
        online: false,
        lastSeen: Date.now(),
        role: "dispatcher",
        name: dispatcherFirstName,
      }).catch(() => {});

      void set(ref(database, `chats/${orderId}/typing/dispatcher`), {
        isTyping: false,
        name: dispatcherFirstName,
        timestamp: Date.now(),
      }).catch(() => {});
    };
  }, [orderId, enabled, dispatcherFirstName]);

  const broadcastTyping = useCallback(
    (isTyping: boolean) => {
      if (!orderId) return;
      const myTypingRef = ref(database, `chats/${orderId}/typing/dispatcher`);

      if (isTyping) {
        void set(myTypingRef, {
          isTyping: true,
          name: dispatcherFirstName,
          timestamp: Date.now(),
        }).catch(() => {});

        if (dispatcherTypingTimeoutRef.current) clearTimeout(dispatcherTypingTimeoutRef.current);
        dispatcherTypingTimeoutRef.current = setTimeout(() => {
          void set(myTypingRef, {
            isTyping: false,
            name: dispatcherFirstName,
            timestamp: Date.now(),
          }).catch(() => {});
        }, 2500);
      } else {
        if (dispatcherTypingTimeoutRef.current) {
          clearTimeout(dispatcherTypingTimeoutRef.current);
          dispatcherTypingTimeoutRef.current = null;
        }
        void set(myTypingRef, {
          isTyping: false,
          name: dispatcherFirstName,
          timestamp: Date.now(),
        }).catch(() => {});
      }
    },
    [orderId, dispatcherFirstName]
  );

  const onInputChange = useCallback(
    (text: string) => {
      setInputText(text);
      if (!readOnly) broadcastTyping(text.trim().length > 0);
    },
    [readOnly, broadcastTyping]
  );

  const pushMessage = useCallback(
    (payload: Record<string, any>) => {
      push(ref(database, `chats/${orderId}/messages`), {
        senderId: String(dispatcher?.id || "dispatcher-1"),
        senderName: dispatcherFirstName,
        role: "dispatcher",
        timestamp: Date.now(),
        ...payload,
      });
    },
    [orderId, dispatcher, dispatcherFirstName]
  );

  const sendMessage = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = inputText.trim();
      if (!trimmed) return;
      broadcastTyping(false);
      pushMessage({ text: trimmed });
      setInputText("");
    },
    [inputText, broadcastTyping, pushMessage]
  );

  // Keep the newest message in view.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isCustomerTyping]);

  return {
    messages,
    isLoading,
    inputText,
    onInputChange,
    sendMessage,
    prefill: setInputText,
    customerOnline,
    customerLastSeen,
    isCustomerTyping,
    customerTypingName,
    stopTyping: () => broadcastTyping(false),
    messagesEndRef,
    pushMessage,
  };
}
