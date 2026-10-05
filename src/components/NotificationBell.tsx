import React, { useEffect, useId, useRef, useState, useMemo, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  Volume2,
  VolumeX,
  AlertTriangle,
  Clock,
  Info,
  MessageSquare,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { apiService, type ApiNotification } from "../services/apiService";
import { getMemoryAccessToken, onMemoryAccessTokenChange } from "../services/apiClient";
import {
  playNotificationChime,
  isNotificationSoundMuted,
  setNotificationSoundMuted,
  type NotificationSeverity,
} from "../utils/notificationAudio";

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function getNotificationSeverity(type: string): NotificationSeverity {
  const t = String(type || "").toUpperCase();
  if (
    t.includes("LOST") ||
    t.includes("CRITICAL") ||
    t.includes("CANCEL") ||
    t.includes("SECURITY") ||
    t.includes("EMERGENCY") ||
    t.includes("THREAT")
  ) {
    return "critical";
  }
  if (
    t.includes("CHAT") ||
    t.includes("HALF_PAYMENT") ||
    t.includes("DELAY") ||
    t.includes("EXCEPTION") ||
    t.includes("MISMATCH") ||
    t.includes("NEW_ERRAND") ||
    t.includes("ASSIGNED")
  ) {
    return "warning";
  }
  return "info";
}

function extractErrandId(notification: ApiNotification): string | null {
  const candidate = (notification as any).errandId;
  if (typeof candidate === "string" && candidate.length > 5) {
    return candidate;
  }
  // Try regex on title and body: e.g., "Errand #f47ac10b" or UUID
  const match = (notification.title + " " + notification.body).match(
    /(?:errand\s*#?|#ERR-|#)([a-f0-9-]{8,})/i
  );
  return match ? match[1] : null;
}

type FilterTab = "ALL" | "UNREAD" | "CRITICAL";

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [isMuted, setIsMuted] = useState<boolean>(() => isNotificationSoundMuted());

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const criticalCount = useMemo(
    () => notifications.filter((n) => getNotificationSeverity(n.type) === "critical" && !n.isRead).length,
    [notifications]
  );

  const loadNotifications = useCallback(async () => {
    const result = await apiService.getNotifications();
    if (result) {
      setNotifications(result);
    }
  }, []);

  // Initial fetch and 30s background poll fallback
  useEffect(() => {
    setIsLoading(true);
    loadNotifications().finally(() => setIsLoading(false));
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Real-time Socket.IO notification push receiver
  useEffect(() => {
    const socket: Socket = io(BACKEND_URL, {
      auth: (cb) => cb({ token: getMemoryAccessToken() ?? undefined }),
      autoConnect: false,
    });

    if (getMemoryAccessToken()) {
      socket.connect();
    }

    const stopWaitingForToken = onMemoryAccessTokenChange((token) => {
      if (token && !socket.active) {
        socket.connect();
      }
    });

    socket.on("notification:new", (newNotif: any) => {
      if (!newNotif || typeof newNotif !== "object") return;
      
      const parsedNotif: ApiNotification = {
        id: Number(newNotif.id) || Date.now(),
        type: String(newNotif.type || "INFO"),
        title: String(newNotif.title || "New Notification"),
        body: String(newNotif.body || ""),
        isRead: false,
        createdAt: newNotif.createdAt || new Date().toISOString(),
      };

      setNotifications((prev) => [
        parsedNotif,
        ...prev.filter((n) => n.id !== parsedNotif.id),
      ]);

      // Play synthesized audio chime matching alert severity
      const severity = getNotificationSeverity(parsedNotif.type);
      playNotificationChime(severity);
    });

    return () => {
      stopWaitingForToken();
      socket.disconnect();
    };
  }, []);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isMuted;
    setIsMuted(next);
    setNotificationSoundMuted(next);
    if (!next) {
      // Play a short pleasant test chime so user confirms sound is on
      playNotificationChime("info");
    }
  };

  const handleMarkRead = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    const saved = await apiService.markNotificationRead(id);
    if (!saved) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unreadCount === 0) return;

    // Optimistic snapshot
    const original = [...notifications];
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    const success = await apiService.markAllNotificationsRead();
    if (!success) {
      setNotifications(original);
    }
  };

  const handleNotificationClick = (notification: ApiNotification) => {
    if (!notification.isRead) {
      handleMarkRead(notification.id);
    }

    const errandId = extractErrandId(notification);
    if (errandId) {
      window.dispatchEvent(
        new CustomEvent("sugo:open-errand", { detail: { errandId } })
      );
      setIsOpen(false);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (filterTab === "UNREAD") {
      return notifications.filter((n) => !n.isRead);
    }
    if (filterTab === "CRITICAL") {
      return notifications.filter((n) => getNotificationSeverity(n.type) === "critical");
    }
    return notifications;
  }, [notifications, filterTab]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications, none unread"
        }
        data-bell
        className="relative grid size-10 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-signal px-1 text-[10px] font-bold tabular-nums text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id={panelId}
          ref={dialogRef}
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
          data-elevate
          className="absolute right-0 z-50 mt-2 flex max-h-[520px] w-[340px] sm:w-[390px] flex-col overflow-hidden rounded-xl border border-edge bg-board-plate shadow-xl outline-none"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-edge px-4 py-3 bg-board-plate">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[10px] font-bold tabular-nums text-signal">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Sound Chime Toggle */}
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isMuted ? "Unmute notification sounds" : "Mute notification sounds"}
                title={isMuted ? "Unmute sounds" : "Mute sounds"}
                className={`grid size-8 cursor-pointer place-items-center rounded-lg border transition-colors ${
                  isMuted
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                    : "border-edge bg-slate-50 dark:bg-slate-800/60 text-ink-muted hover:text-ink hover:bg-slate-100"
                }`}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              {/* Mark All Read Button */}
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                aria-label="Mark all notifications as read"
                title="Mark all notifications as read"
                className="flex items-center gap-1.5 rounded-lg border border-edge bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCheck size={14} className="shrink-0" />
                <span>Mark all read</span>
              </button>
            </div>
          </div>

          {/* Filter Segment Tabs */}
          <div className="flex border-b border-edge bg-slate-50/50 dark:bg-slate-900/40 p-1.5 gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterTab("ALL")}
              className={`flex-1 rounded-md py-1 px-2 text-center transition-colors ${
                filterTab === "ALL"
                  ? "bg-white dark:bg-slate-800 text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("UNREAD")}
              className={`flex-1 rounded-md py-1 px-2 text-center transition-colors ${
                filterTab === "UNREAD"
                  ? "bg-white dark:bg-slate-800 text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("CRITICAL")}
              className={`flex-1 rounded-md py-1 px-2 text-center transition-colors ${
                filterTab === "CRITICAL"
                  ? "bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Critical ({criticalCount})
            </button>
          </div>

          {/* Notification List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-edge">
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Clock className="size-6 text-ink-muted animate-spin mb-2" />
                <p className="text-xs text-ink-muted">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                {filterTab === "CRITICAL" ? (
                  <>
                    <ShieldAlert className="size-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-ink">No critical alerts</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">All fleet systems operating normally.</p>
                  </>
                ) : filterTab === "UNREAD" ? (
                  <>
                    <CheckCheck className="size-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-ink">All caught up</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">No unread notifications at this time.</p>
                  </>
                ) : (
                  <>
                    <Bell className="size-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-ink">No notifications yet</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">Live dispatches and alerts will appear here.</p>
                  </>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-edge">
                {filteredNotifications.map((n) => {
                  const severity = getNotificationSeverity(n.type);
                  const errandId = extractErrandId(n);
                  const isChat = n.type.toUpperCase().includes("CHAT");

                  return (
                    <li
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`group relative flex cursor-pointer flex-col gap-1.5 p-3.5 transition-colors ${
                        !n.isRead
                          ? "bg-slate-50/70 dark:bg-slate-800/35 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                          : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                      }`}
                    >
                      {/* Top Meta Row: Badge + Dot + Time + Action */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {!n.isRead && (
                            <span
                              aria-hidden
                              className="size-2 shrink-0 rounded-full bg-signal"
                              title="Unread"
                            />
                          )}

                          {/* Severity Pill Badge */}
                          {severity === "critical" ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-400">
                              <AlertTriangle size={11} className="shrink-0" />
                              CRITICAL
                            </span>
                          ) : severity === "warning" ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                              {isChat ? <MessageSquare size={11} className="shrink-0" /> : <Clock size={11} className="shrink-0" />}
                              {isChat ? "CUSTOMER CHAT" : "ALERT"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-500/20 bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              <Info size={11} className="shrink-0" />
                              UPDATE
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium tabular-nums text-ink-muted">
                            {timeAgo(n.createdAt)}
                          </span>

                          {!n.isRead && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkRead(n.id, e)}
                              aria-label={`Mark "${n.title}" as read`}
                              title="Mark as read"
                              className="grid size-6 shrink-0 cursor-pointer place-items-center rounded text-ink-muted transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-ink"
                            >
                              <CheckCheck size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title & Body */}
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${!n.isRead ? "text-ink" : "text-ink-muted"}`}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-muted line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                      </div>

                      {/* 1-Click Action Hint if Errand is linked */}
                      {errandId && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 group-hover:text-ink">
                          <span>View Errand #{errandId.slice(0, 8)}</span>
                          <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
