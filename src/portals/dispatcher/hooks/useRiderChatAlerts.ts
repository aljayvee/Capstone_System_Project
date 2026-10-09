import { useState, useEffect, useRef, useCallback } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../../firebase/config";
import { playNotificationChime } from "../../../utils/notificationAudio";
import { inboxSource, useRiderChatMode, type RiderChatMode } from "../riderChat";

export interface RiderChatAlertToast {
  id: string;
  riderId: string;
  riderName: string;
  messageText: string;
  timestamp: number;
}

interface UseRiderChatAlertsProps {
  riders: any[];
  /** Whose conversations: in threads mode a dispatcher hears only their own. */
  dispatcherId?: number | string | null;
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

/** One rider's conversation, as the alerts need it, from either chat layout. */
interface RiderChatSummary {
  riderId: string;
  riderName: string | null;
  unreadCount: number;
  latest: { text: string; timestamp: number } | null;
}

function summarize(mode: RiderChatMode, data: unknown, lastRead: (riderId: string) => number): RiderChatSummary[] {
  if (!data || typeof data !== "object") return [];
  if (mode === "threads") {
    // dispatcher_inbox/staff_<id>: { riderId: meta }. The summary row says who
    // spoke last, which is enough to light the badge and raise one toast.
    return Object.entries<any>(data).map(([riderId, meta]) => {
      const fromRider = meta?.lastSender === "rider" && Number(meta?.updatedAt) > 0;
      const timestamp = Number(meta?.updatedAt) || 0;
      return {
        riderId,
        riderName: meta?.riderName || null,
        unreadCount: fromRider && timestamp > lastRead(riderId) ? 1 : 0,
        latest: fromRider ? { text: String(meta?.lastMessage || "New message"), timestamp } : null,
      };
    });
  }
  // rider_chats: { riderId: { meta, messages } }, every dispatcher's.
  return Object.entries<any>(data).map(([riderId, chatData]) => {
    let unreadCount = 0;
    let latest: RiderChatSummary["latest"] = null;
    const messages = chatData?.messages;
    if (messages && typeof messages === "object") {
      for (const msg of Object.values<any>(messages)) {
        if (msg?.role !== "rider") continue;
        if (msg.timestamp && msg.timestamp > lastRead(riderId)) unreadCount++;
        if (!latest || (msg.timestamp || 0) > latest.timestamp) {
          latest = { text: msg.text || (msg.imageUrl ? "Sent a photo" : "New message"), timestamp: msg.timestamp || 0 };
        }
      }
    }
    return { riderId, riderName: chatData?.meta?.senderName || null, unreadCount, latest };
  });
}

export function useRiderChatAlerts({
  riders,
  dispatcherId,
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

  const chatMode = useRiderChatMode();

  useEffect(() => {
    if (dispatcherId == null) return;
    const source = inboxSource(chatMode, dispatcherId);
    initialLoadCompletedRef.current = false;

    const unsubscribe = onValue(ref(database, source.path), (snapshot) => {
      const summaries = summarize(chatMode, snapshot.val(), getLastReadTimestamp);

      const nextUnreads: Record<string, number> = {};
      const newAlerts: RiderChatAlertToast[] = [];

      for (const { riderId, riderName: namedInChat, unreadCount, latest } of summaries) {
        const riderName = namedInChat || ridersMap.current.get(riderId) || `Rider #${riderId}`;
        const latestRiderMessage = latest ? { ...latest, role: "rider" } : null;

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
              messageText: latestRiderMessage.text,
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
  }, [chatMode, dispatcherId]);

  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  return {
    unreadCounts,
    totalUnreadCount,
    activeToasts,
    dismissToast,
    markRiderAsRead,
  };
}
