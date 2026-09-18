import React, { useEffect, useId, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { apiService, type ApiNotification } from "../services/apiService";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Notifications, shared by the Owner and Dispatcher portals (both render it
 * next to ServerStatusBadge in their header) — closes REQ035/036.
 *
 * Because it renders in both, this pass fixed the things that are wrong
 * everywhere rather than repainting it in one portal's palette. The console
 * inverts it on the navy band through the `data-bell` hook in surfaces.css.
 *
 * What was wrong:
 *
 * It could not be operated from a keyboard. There was a click-outside
 * listener and nothing else: no Escape, no focus moved into the panel, no
 * focus returned to the trigger, and no `aria-expanded` — so a screen reader
 * was never told the panel existed, let alone that it had opened. The button's
 * only name was a `title`, which is not announced reliably and shows nothing
 * at all on touch.
 *
 * The unread count was a bare number. "3" beside a bell is not a label, so it
 * now carries the words in an accessible-only span.
 *
 * `text-slate-400` on white measures about 2.6:1, well under the 4.5:1 floor,
 * and it was carrying the timestamps, the empty state and the unread count.
 * The tinted ink token clears it at both portals' backgrounds.
 *
 * The unread marker was `bg-blue-50/50` — a tint at 50% of an already pale
 * blue, on a surface whose palette contains no blue, doing the weakest
 * possible job of the most important distinction in the list. It is a mark
 * against the title now, which reads at a glance and costs no colour.
 */
export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const loadNotifications = async () => {
    setIsLoading(true);
    const result = await apiService.getNotifications();
    if (result) setNotifications(result);
    setIsLoading(false);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Escape closes it and hands focus back, which is the whole of the keyboard
  // contract a popover owes and none of which existed.
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
    if (isOpen) dialogRef.current?.focus();
  }, [isOpen]);

  const handleMarkRead = async (id: number) => {
    // Optimistic, but reverted when the write fails. Without the revert the
    // panel kept claiming a notification was read while the server still had
    // it unread, so it returned on the next poll and the count disagreed with
    // the list. markNotificationRead returns null rather than throwing.
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));

    const saved = await apiService.markNotificationRead(id);
    if (!saved) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
    }
  };

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
        className="relative grid size-10 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
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
          className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-plate border border-edge bg-board-plate shadow-plate outline-none"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-bold text-ink">Notifications</h3>
            {unreadCount > 0 && (
              <span data-figure className="text-xs font-semibold tabular-nums text-ink-muted">
                {unreadCount} unread
              </span>
            )}
          </div>

          {isLoading ? (
            <p className="p-4 text-center text-xs text-ink-muted">Loading</p>
          ) : notifications.length === 0 ? (
            <p className="p-6 text-center text-xs text-ink-muted">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <li key={n.id} className="space-y-1 px-4 py-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex min-w-0 items-baseline gap-2 font-bold text-ink">
                      {!n.isRead && (
                        <span
                          aria-hidden
                          className="mt-1 size-1.5 shrink-0 rounded-full bg-signal"
                        />
                      )}
                      <span className="min-w-0">
                        {!n.isRead && <span className="sr-only">Unread. </span>}
                        {n.title}
                      </span>
                    </p>
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        aria-label={`Mark "${n.title}" as read`}
                        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-ink-muted">{n.body}</p>
                  <p data-figure className="text-[11px] tabular-nums text-ink-muted">
                    {timeAgo(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
