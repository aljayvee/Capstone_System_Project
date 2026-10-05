import { useState, useEffect, useRef, useCallback } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../../firebase/config";
import { playNotificationChime } from "../../../utils/notificationAudio";

export interface RiderChatAlertToast {
  id: string;
  riderId: string;
  riderName: string;
  messageText: string;
  timestamp: number;
}

interface UseRiderChatAlertsProps {
  riders: any[];
  activeRiderId?: string | null;
  onOpenRiderChat: (riderId: string) => void;
}

const STORAGE_PREFIX = "@sugo_rider_chat_last_read_";

function getLastReadTimestamp(riderId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const val = localStorage.getItem(`${STORAGE_PREFIX}${riderId}`);
    return val ? Number(val) || 0 : 0;
  } catch {
    return 0;
  }
}

function setLastReadTimestamp(riderId: string, timestamp: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${riderId}`, String(timestamp));
  } catch {
    // Storage access failure handled safely
  }
}

export function useRiderChatAlerts({
  riders,
  activeRiderId,
  onOpenRiderChat,
}: UseRiderChatAlertsProps) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [activeToasts, setActiveToasts] = useState<RiderChatAlertToast[]>([]);

  const activeRiderIdRef = useRef<string | null | undefined>(activeRiderId);
  activeRiderIdRef.current = activeRiderId;

  const onOpenRiderChatRef = useRef(onOpenRiderChat);
  onOpenRiderChatRef.current = onOpenRiderChat;

  const initialLoadCompletedRef = useRef(false);
  const seenMessageTimestampsRef = useRef<Map<string, number>>(new Map());

  const ridersMap = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const map = new Map<string, string>();
    for (const r of riders) {
      map.set(String(r.id), r.name || "Rider");
    }
    ridersMap.current = map;
  }, [riders]);

  const dismissToast = useCallback((toastId: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  const markRiderAsRead = useCallback((riderId: string) => {
    const now = Date.now();
    setLastReadTimestamp(riderId, now);
    setUnreadCounts((prev) => {
      if (!prev[riderId]) return prev;
      const next = { ...prev };
      delete next[riderId];
      return next;
    });
    setActiveToasts((prev) => prev.filter((t) => t.riderId !== riderId));
  }, []);

  // When activeRiderId changes and is set, mark that rider as read immediately
  useEffect(() => {
    if (activeRiderId) {
      markRiderAsRead(String(activeRiderId));
    }
  }, [activeRiderId, markRiderAsRead]);

  useEffect(() => {
    const riderChatsRef = ref(database, "rider_chats");

    const unsubscribe = onValue(riderChatsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data || typeof data !== "object") {
        setUnreadCounts({});
        return;
      }

      const nextUnreads: Record<string, number> = {};
      const newAlerts: RiderChatAlertToast[] = [];

      for (const [riderId, chatData] of Object.entries<any>(data)) {
        if (!chatData) continue;
        const meta = chatData.meta;
        const messages = chatData.messages;
        const riderName =
          meta?.senderName || ridersMap.current.get(riderId) || `Rider #${riderId}`;

        const lastRead = getLastReadTimestamp(riderId);
        let unreadCount = 0;
        let latestRiderMessage: any = null;

        if (messages && typeof messages === "object") {
          for (const msg of Object.values<any>(messages)) {
            if (msg.role === "rider") {
              if (msg.timestamp && msg.timestamp > lastRead) {
                unreadCount++;
              }
              if (!latestRiderMessage || (msg.timestamp || 0) > (latestRiderMessage.timestamp || 0)) {
                latestRiderMessage = msg;
              }
            }
          }
        }

        if (unreadCount > 0 && String(activeRiderIdRef.current) !== String(riderId)) {
          nextUnreads[riderId] = unreadCount;
        }

        // Check if we should fire a new toast and sound alert
        if (latestRiderMessage && initialLoadCompletedRef.current) {
          const prevSeen = seenMessageTimestampsRef.current.get(riderId) || 0;
          if (
            latestRiderMessage.timestamp > prevSeen &&
            latestRiderMessage.role === "rider" &&
            String(activeRiderIdRef.current) !== String(riderId)
          ) {
            seenMessageTimestampsRef.current.set(riderId, latestRiderMessage.timestamp);
            newAlerts.push({
              id: `${riderId}_${latestRiderMessage.timestamp}`,
              riderId,
              riderName,
              messageText: latestRiderMessage.text || (latestRiderMessage.imageUrl ? "Sent a photo" : "New message"),
              timestamp: latestRiderMessage.timestamp,
            });
          }
        } else if (latestRiderMessage) {
          seenMessageTimestampsRef.current.set(riderId, latestRiderMessage.timestamp);
        }
      }

      setUnreadCounts(nextUnreads);

      if (newAlerts.length > 0 && initialLoadCompletedRef.current) {
        playNotificationChime("warning");

        setActiveToasts((prev) => {
          const map = new Map<string, RiderChatAlertToast>();
          for (const t of prev) map.set(t.riderId, t);
          for (const t of newAlerts) map.set(t.riderId, t);
          return Array.from(map.values()).slice(-4);
        });

        // Background HTML5 Notification if tab is hidden
        if (typeof document !== "undefined" && document.hidden && "Notification" in window) {
          if (Notification.permission === "granted") {
            const first = newAlerts[0];
            try {
              new Notification(`Rider: ${first.riderName}`, {
                body: first.messageText,
                icon: "/favicon.png",
                tag: `rider_chat_${first.riderId}`,
              });
            } catch {
              // Notification creation failed safely
            }
          }
        }
      }

      if (!initialLoadCompletedRef.current) {
        initialLoadCompletedRef.current = true;
      }
    });

    return () => unsubscribe();
  }, []);

  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  return {
    unreadCounts,
    totalUnreadCount,
    activeToasts,
    dismissToast,
    markRiderAsRead,
  };
}
