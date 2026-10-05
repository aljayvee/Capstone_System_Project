import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ref, onValue, off, Unsubscribe } from "firebase/database";
import { database } from "../../../firebase/config";
import { playNotificationChime } from "../../../utils/notificationAudio";
import { Errand } from "../../../types/errand";

export interface ChatAlertToast {
  id: string;
  errandId: string;
  customerName: string;
  messageText: string;
  timestamp: number;
}

interface UseCustomerChatAlertsProps {
  errands: Errand[];
  activeErrandId?: string | null;
  onOpenChat: (errandId: string) => void;
}

const STORAGE_PREFIX = "@sugo_chat_last_read_";

function getLastReadTimestamp(errandId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const val = localStorage.getItem(`${STORAGE_PREFIX}${errandId}`);
    return val ? Number(val) || 0 : 0;
  } catch {
    return 0;
  }
}

function setLastReadTimestamp(errandId: string, timestamp: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${errandId}`, String(timestamp));
  } catch {
    // Storage access failure handled safely
  }
}

function isTerminalStatus(status: unknown): boolean {
  const s = String(status ?? "").toUpperCase();
  return s === "CANCELLED" || s === "COMPLETED" || s === "DELIVERED";
}

export function useCustomerChatAlerts({
  errands,
  activeErrandId,
  onOpenChat,
}: UseCustomerChatAlertsProps) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeToasts, setActiveToasts] = useState<ChatAlertToast[]>([]);

  // Stable references for props to prevent hook churn
  const onOpenChatRef = useRef(onOpenChat);
  onOpenChatRef.current = onOpenChat;
  const activeErrandIdRef = useRef<string | null | undefined>(activeErrandId);
  activeErrandIdRef.current = activeErrandId;

  // Track initial message keys so we don't alert on historical messages on mount
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const initialLoadCompletedRef = useRef<Set<string>>(new Set());
  const subscriptionsRef = useRef<Map<string, Unsubscribe>>(new Map());

  // Track active errands map for fast lookup
  const activeErrands = useMemo(() => {
    return errands.filter((e) => !isTerminalStatus(e.status));
  }, [errands]);

  const activeErrandsMap = useMemo(() => {
    const map = new Map<string, Errand>();
    for (const errand of activeErrands) {
      map.set(errand.id, errand);
    }
    return map;
  }, [activeErrands]);

  const dismissToast = useCallback((toastId: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  const markErrandAsRead = useCallback(
    (errandId: string) => {
      const now = Date.now();
      setLastReadTimestamp(errandId, now);
      setUnreadCounts((prev) => {
        if (!prev[errandId]) return prev;
        const next = { ...prev };
        delete next[errandId];
        return next;
      });
      // Also clear active toasts for this errand
      setActiveToasts((prev) => prev.filter((t) => t.errandId !== errandId));
    },
    []
  );

  // If activeErrandId is set (i.e. chat open), immediately clear unread
  useEffect(() => {
    if (activeErrandId) {
      markErrandAsRead(activeErrandId);
    }
  }, [activeErrandId, markErrandAsRead]);

  // Manage Firebase RTDB subscriptions incrementally without teardown churn
  useEffect(() => {
    if (!database) return;

    const currentSubscriptions = subscriptionsRef.current;
    const currentActiveIds = new Set(activeErrands.map((e) => e.id));

    // 1. Teardown subscriptions for errands that are no longer active
    currentSubscriptions.forEach((unsub, errandId) => {
      if (!currentActiveIds.has(errandId)) {
        try {
          unsub();
        } catch {
          // Handled silently
        }
        currentSubscriptions.delete(errandId);
        initialLoadCompletedRef.current.delete(errandId);
        setUnreadCounts((prev) => {
          if (!prev[errandId]) return prev;
          const next = { ...prev };
          delete next[errandId];
          return next;
        });
        setActiveToasts((prev) => prev.filter((t) => t.errandId !== errandId));
      }
    });

    // 2. Attach new subscriptions for newly appeared active errands
    activeErrands.forEach((errand) => {
      const errandId = errand.id;
      if (currentSubscriptions.has(errandId)) {
        return; // Already actively subscribed
      }

      const messagesRef = ref(database, `chats/${errandId}/messages`);

      const unsubscribe = onValue(
        messagesRef,
        (snapshot) => {
          const data = snapshot.val();
          const lastRead = getLastReadTimestamp(errandId);
          const isInitialLoad = !initialLoadCompletedRef.current.has(errandId);

          if (!data || typeof data !== "object") {
            setUnreadCounts((prev) => {
              if (prev[errandId] === undefined) return prev;
              const next = { ...prev };
              delete next[errandId];
              return next;
            });
            initialLoadCompletedRef.current.add(errandId);
            return;
          }

          const messageKeys = Object.keys(data);
          let unreadCountForErrand = 0;
          let latestNewCustomerMessage: {
            id: string;
            text: string;
            senderName: string;
            timestamp: number;
          } | null = null;

          messageKeys.forEach((key) => {
            const msg = data[key];
            if (!msg || typeof msg !== "object") return;

            const isCustomer = msg.role === "customer";
            const msgTimestamp = Number(msg.timestamp) || 0;

            // Compute unread count based on lastRead
            const threshold = lastRead > 0 ? lastRead : Date.now() - 24 * 60 * 60 * 1000;
            if (isCustomer && msgTimestamp > threshold) {
              if (activeErrandIdRef.current !== errandId) {
                unreadCountForErrand++;
              }
            }

            // Check if this is a newly arrived message while app is running
            if (!processedMessageIdsRef.current.has(key)) {
              processedMessageIdsRef.current.add(key);

              if (!isInitialLoad && isCustomer) {
                if (
                  !latestNewCustomerMessage ||
                  msgTimestamp > latestNewCustomerMessage.timestamp
                ) {
                  latestNewCustomerMessage = {
                    id: key,
                    text: String(msg.text || msg.message || "Sent a message"),
                    senderName: String(msg.senderName || errand.customerName || "Customer"),
                    timestamp: msgTimestamp,
                  };
                }
              }
            }
          });

          // Mark initial load for this errand as complete
          initialLoadCompletedRef.current.add(errandId);

          // Update unread count for this errand
          setUnreadCounts((prev) => {
            if (activeErrandIdRef.current === errandId) {
              if (prev[errandId] === undefined) return prev;
              const next = { ...prev };
              delete next[errandId];
              return next;
            }
            if (unreadCountForErrand === 0) {
              if (prev[errandId] === undefined) return prev;
              const next = { ...prev };
              delete next[errandId];
              return next;
            }
            return {
              ...prev,
              [errandId]: unreadCountForErrand,
            };
          });

          // Handle incoming customer alert
          if (latestNewCustomerMessage) {
            const customerMsg = latestNewCustomerMessage;
            const isTabHidden = typeof document !== "undefined" && document.hidden;
            const isChatCurrentlyOpen = activeErrandIdRef.current === errandId;

            // 1. Play audible chime (always if tab is backgrounded, or if different chat is open)
            if (isTabHidden || !isChatCurrentlyOpen) {
              playNotificationChime("warning");
            }

            // 2. Add or update floating toast (only if this chat is not currently open in foreground)
            if (!isChatCurrentlyOpen) {
              const toast: ChatAlertToast = {
                id: `${errandId}-${customerMsg.id}`,
                errandId,
                customerName: customerMsg.senderName,
                messageText: customerMsg.text,
                timestamp: customerMsg.timestamp,
              };

              setActiveToasts((prev) => [
                toast,
                ...prev.filter((t) => t.errandId !== errandId).slice(0, 3),
              ]);
            }

            // 3. Desktop notification if page is hidden
            if (
              isTabHidden &&
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              try {
                const notif = new Notification(
                  `Customer message · ${customerMsg.senderName}`,
                  {
                    body: customerMsg.text || "Sent a message in order chat",
                    icon: "/favicon.png",
                    tag: `sugo-chat-${errandId}`,
                  }
                );
                notif.onclick = () => {
                  window.focus();
                  markErrandAsRead(errandId);
                  onOpenChatRef.current(errandId);
                };
              } catch (e) {
                console.warn("[useCustomerChatAlerts] Desktop Notification failed:", e);
              }
            }
          }
        },
        (error) => {
          console.warn(`[useCustomerChatAlerts] Listener error for ${errandId}:`, error);
        }
      );

      currentSubscriptions.set(errandId, unsubscribe);
    });
  }, [activeErrands, markErrandAsRead]);

  // Clean up all subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // Handled silently
        }
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  const totalUnreadCount = useMemo(() => {
    return Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);
  }, [unreadCounts]);

  return {
    unreadCounts,
    totalUnreadCount,
    activeToasts,
    dismissToast,
    markErrandAsRead,
  };
}
