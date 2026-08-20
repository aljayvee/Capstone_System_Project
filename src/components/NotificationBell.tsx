import React, { useEffect, useRef, useState } from "react";
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

// Shared by the Owner and Dispatcher portals (both render it next to
// ServerStatusBadge in their header) — closes REQ035/036.
export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const handleMarkRead = async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await apiService.markNotificationRead(id);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition shadow-sm"
        title="Notifications"
      >
        <Bell size={17} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
            {unreadCount > 0 && <span className="text-[11px] text-slate-400">{unreadCount} unread</span>}
          </div>

          {isLoading ? (
            <p className="p-4 text-xs text-slate-400 text-center">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="p-6 text-xs text-slate-400 text-center">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 text-xs space-y-1 ${n.isRead ? "bg-white" : "bg-blue-50/50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-800">{n.title}</p>
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="text-blue-600 hover:text-blue-800 shrink-0"
                        title="Mark as read"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-slate-500">{n.body}</p>
                  <p className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
