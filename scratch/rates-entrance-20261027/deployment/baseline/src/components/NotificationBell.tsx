import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bell,
  CheckCheck,
  Volume2,
  VolumeX,
  MessageSquare,
  ChevronRight,
  PackageX,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import {
  apiService,
  type ApiNotification,
  type NotificationListParams,
  type NotificationPriority,
  type NotificationSort,
} from "../services/apiService";
import { getMemoryAccessToken, onMemoryAccessTokenChange } from "../services/apiClient";
import { formatErrandId } from "../utils/formatErrandId";
import { useOptionalAuth } from "../context/AuthContext";
import {
  playNotificationChime,
  isNotificationSoundMuted,
  setNotificationSoundMuted,
  type NotificationSeverity,
} from "../utils/notificationAudio";
import { DispatcherBadge } from "./panel/DispatcherBadge";
import { DispatcherButton } from "./panel/DispatcherButton";
import { DispatcherSearchField } from "./panel/DispatcherSearchField";
import { PanelState } from "./panel/PanelState";
import type { StatusTone } from "../lib/statusPresentation";

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

const PAGE_SIZE = 50;
const POLL_MS = 30000;
const SEARCH_DEBOUNCE_MS = 250;

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
 * Old substring guess, kept only for a row from a server without the priority
 * column. Every row the server writes now carries its level
 * (server notificationCatalog.ts), and that is the one that counts.
 */
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

const PRIORITY_RANK: Record<NotificationPriority, number> = { LOW: 0, NORMAL: 1, HIGH: 2, CRITICAL: 3 };

function priorityOf(n: ApiNotification): NotificationPriority {
  if (n.priority && n.priority in PRIORITY_RANK) return n.priority;
  const legacy = getNotificationSeverity(n.type);
  return legacy === "critical" ? "HIGH" : "NORMAL";
}

/** Level, in the bell's words, with the status law's tone and mark. */
const PRIORITY_PRESENTATION: Record<NotificationPriority, { label: string; tone: StatusTone }> = {
  CRITICAL: { label: "Critical", tone: "act" },
  HIGH: { label: "High", tone: "waiting" },
  NORMAL: { label: "Normal", tone: "moving" },
  LOW: { label: "Low", tone: "closed" },
};

/** Low is for the record, so it makes no sound. */
const CHIME_FOR: Record<NotificationPriority, NotificationSeverity | null> = {
  CRITICAL: "critical",
  HIGH: "warning",
  NORMAL: "info",
  LOW: null,
};

const CHAT_TYPES = ["CUSTOMER_CHAT_MESSAGE", "RIDER_CHAT_MESSAGE"];

function chatSource(type: string): string | null {
  if (type === "CUSTOMER_CHAT_MESSAGE") return "Customer chat";
  if (type === "RIDER_CHAT_MESSAGE") return "Rider chat";
  return null;
}

type Link = { kind: "errand"; errandId: string } | { kind: "rider"; riderId: string };

function linkOf(n: ApiNotification): Link | null {
  const ref = n.refKey ?? "";
  if (ref.startsWith("errand:") && ref.length > 7) return { kind: "errand", errandId: ref.slice(7) };
  if (ref.startsWith("rider:") && ref.length > 6) return { kind: "rider", riderId: ref.slice(6) };

  // Rows from before refKey: the old guess from the text.
  const candidate = (n as any).errandId;
  if (typeof candidate === "string" && candidate.length > 5) return { kind: "errand", errandId: candidate };
  const match = (n.title + " " + n.body).match(/(?:errand\s*#?|#ERR-|#)([a-f0-9-]{8,})/i);
  return match ? { kind: "errand", errandId: match[1] } : null;
}

type FilterTab = "ALL" | "UNREAD" | "URGENT" | "CHATS";

const TABS: Array<{ id: FilterTab; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "UNREAD", label: "Unread" },
  { id: "URGENT", label: "Urgent" },
  { id: "CHATS", label: "Chats" },
];

const SORT_LABELS: Record<NotificationSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  priority: "Priority",
};

/**
 * Owners are never sent chats or out-of-stock rows (server
 * notificationCatalog.ts OWNER_HIDDEN_TYPES), so their bell has no Chats tab.
 */
const OWNER_TABS = TABS.filter((tab) => tab.id !== "CHATS");

const OWNER_EMPTY_ALL = {
  title: "No notifications yet",
  body: "Stuck errands, riders out of contact and money that does not add up will appear here.",
};

const EMPTY_COPY: Record<FilterTab, { title: string; body: string }> = {
  ALL: { title: "No notifications yet", body: "Alerts about errands, riders and chats will appear here." },
  UNREAD: { title: "All caught up", body: "Every notification has been read." },
  URGENT: { title: "Nothing urgent", body: "No High or Critical notifications right now." },
  CHATS: { title: "No chat messages", body: "Messages from customers and riders will appear here." },
};

function paramsFor(tab: FilterTab): NotificationListParams {
  switch (tab) {
    case "UNREAD":
      return { unread: true };
    case "URGENT":
      return { priority: ["HIGH", "CRITICAL"] };
    case "CHATS":
      return { type: CHAT_TYPES };
    default:
      return {};
  }
}

/** Whether a live row belongs in the list as it is filtered and searched now. */
function matchesView(n: ApiNotification, tab: FilterTab, search: string): boolean {
  if (tab === "URGENT" && PRIORITY_RANK[priorityOf(n)] < PRIORITY_RANK.HIGH) return false;
  if (tab === "CHATS" && !CHAT_TYPES.includes(n.type)) return false;
  if (tab === "UNREAD" && n.isRead) return false;
  const q = search.trim().toLowerCase();
  return !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
}

/** Where a live row goes, by the sort the server used for the rest. Null: beyond what is loaded. */
function insertSorted(list: ApiNotification[], row: ApiNotification, sort: NotificationSort, complete: boolean) {
  const rest = list.filter((n) => n.id !== row.id);
  if (sort === "newest") return [row, ...rest];
  if (sort === "oldest") return complete ? [...rest, row] : null;
  const rank = PRIORITY_RANK[priorityOf(row)];
  const at = rest.findIndex((n) => PRIORITY_RANK[priorityOf(n)] <= rank);
  if (at === -1) return complete ? [...rest, row] : null;
  return [...rest.slice(0, at), row, ...rest.slice(at)];
}

/**
 * Everything the bell knows and hears: the list, its view, the badge, the
 * socket and the poll. Separate from the drawer so a portal can run it once,
 * above its tabs (NotificationFeedProvider). The dispatcher header and its
 * feed stay mounted while tab workspaces load or change.
 */
function useNotificationFeed() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [sort, setSort] = useState<NotificationSort>("newest");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasCriticalUnread, setHasCriticalUnread] = useState(false);

  // Latest view and list, for the socket handler and the poll, which outlive renders.
  const viewRef = useRef({ filterTab, sort, search });
  viewRef.current = { filterTab, sort, search };
  const loadedRef = useRef({ list: notifications, count: 0, total: 0 });
  loadedRef.current = { list: notifications, count: notifications.length, total };
  /** Only the newest request may write the list; a slow older one is dropped. */
  const requestSeq = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  /** The badge: how many are unread in all, and whether one of them is Critical. */
  const loadBadge = useCallback(async () => {
    const result = await apiService.getNotifications({ unread: true, sort: "priority", limit: 1 });
    if (!result) return;
    setUnreadCount(result.total);
    setHasCriticalUnread(result.items[0] ? priorityOf(result.items[0]) === "CRITICAL" : false);
  }, []);

  /**
   * Loads the first page for the current view. `quiet` keeps the list on screen
   * (the poll); otherwise the skeleton shows while the view changes.
   */
  const loadFirstPage = useCallback(async (quiet = false) => {
    const { filterTab: tab, sort: by, search: q } = viewRef.current;
    const seq = ++requestSeq.current;
    if (!quiet) setStatus("loading");
    // A poll refreshes everything already loaded, so "Load more" pages survive it.
    const limit = quiet ? Math.min(Math.max(loadedRef.current.count, PAGE_SIZE), 100) : PAGE_SIZE;
    const result = await apiService.getNotifications({ ...paramsFor(tab), sort: by, q, limit, offset: 0 });
    if (seq !== requestSeq.current) return;
    if (!result) {
      // A failed poll leaves a good list alone; a failed first load says so.
      if (!quiet) setStatus("error");
      return;
    }
    setNotifications(result.items);
    setTotal(result.total);
    setLoadMoreFailed(false);
    setStatus("ready");
  }, []);

  const loadMore = useCallback(async () => {
    const { filterTab: tab, sort: by, search: q } = viewRef.current;
    const seq = requestSeq.current;
    setIsLoadingMore(true);
    setLoadMoreFailed(false);
    const result = await apiService.getNotifications({
      ...paramsFor(tab),
      sort: by,
      q,
      limit: PAGE_SIZE,
      offset: loadedRef.current.count,
    });
    setIsLoadingMore(false);
    if (seq !== requestSeq.current) return;
    if (!result) {
      setLoadMoreFailed(true);
      return;
    }
    setNotifications((prev) => {
      const seen = new Set(prev.map((n) => n.id));
      return [...prev, ...result.items.filter((n) => !seen.has(n.id))];
    });
    setTotal(result.total);
  }, []);

  // A new view (tab, sort, search) starts from its first page.
  useEffect(() => {
    void loadFirstPage();
  }, [filterTab, sort, search, loadFirstPage]);

  // Badge on mount, then both on a 30 s poll as the socket's fallback.
  useEffect(() => {
    void loadBadge();
    const interval = setInterval(() => {
      void loadBadge();
      void loadFirstPage(true);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [loadBadge, loadFirstPage]);

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
      // A broadcast with no row behind it (customer chat to every dispatcher).
      // The chat toast already rings for it; listing it would show a row that
      // cannot be marked read.
      if (newNotif.ephemeral) return;

      const parsedNotif: ApiNotification = {
        id: Number(newNotif.id) || Date.now(),
        type: String(newNotif.type || "INFO"),
        title: String(newNotif.title || "New Notification"),
        body: String(newNotif.body || ""),
        isRead: false,
        createdAt: newNotif.createdAt || new Date().toISOString(),
        priority: newNotif.priority,
        refKey: typeof newNotif.refKey === "string" ? newNotif.refKey : null,
      };

      const { filterTab: tab, sort: by, search: q } = viewRef.current;
      if (matchesView(parsedNotif, tab, q)) {
        const { list, total: known } = loadedRef.current;
        const wasListed = list.some((n) => n.id === parsedNotif.id);
        const next = insertSorted(list, parsedNotif, by, list.length >= known);
        // Beyond the loaded pages: counted, and "Load more" will reach it.
        setNotifications(next ?? list.filter((n) => n.id !== parsedNotif.id));
        // A bumped chat row is the same row, not one more.
        if (!wasListed) setTotal((t) => t + 1);
      }
      void loadBadge();

      const chime = CHIME_FOR[priorityOf(parsedNotif)];
      if (chime) playNotificationChime(chime);
    });

    return () => {
      stopWaitingForToken();
      socket.disconnect();
    };
  }, [loadBadge]);

  const markRead = useCallback(
    async (id: number) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));

      const saved = await apiService.markNotificationRead(id);
      if (!saved) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
      }
      void loadBadge();
    },
    [loadBadge]
  );

  const markAllRead = useCallback(async () => {
    const { list } = loadedRef.current;
    // Optimistic snapshot
    const original = [...list];
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    setHasCriticalUnread(false);

    const success = await apiService.markAllNotificationsRead();
    if (!success) {
      setNotifications(original);
    }
    void loadBadge();
  }, [loadBadge]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearch("");
  }, []);

  return {
    notifications,
    total,
    status,
    isLoadingMore,
    loadMoreFailed,
    filterTab,
    setFilterTab,
    sort,
    setSort,
    searchInput,
    setSearchInput,
    search,
    clearSearch,
    unreadCount,
    hasCriticalUnread,
    loadFirstPage,
    loadMore,
    markRead,
    markAllRead,
  };
}

type NotificationFeed = ReturnType<typeof useNotificationFeed>;

const NotificationFeedContext = createContext<NotificationFeed | null>(null);

/**
 * Runs one feed for everything under it, so the socket, the poll and the chime
 * keep going whichever tab is open, and every bell below shares the same list,
 * badge and search. A bell outside any provider runs its own feed, as before.
 */
export const NotificationFeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const feed = useNotificationFeed();
  return <NotificationFeedContext.Provider value={feed}>{children}</NotificationFeedContext.Provider>;
};

const StandaloneBell: React.FC = () => <BellDrawer feed={useNotificationFeed()} />;

export const NotificationBell: React.FC = () => {
  const feed = useContext(NotificationFeedContext);
  return feed ? <BellDrawer feed={feed} /> : <StandaloneBell />;
};

const BellDrawer: React.FC<{ feed: NotificationFeed }> = ({ feed }) => {
  const {
    notifications,
    total,
    status,
    isLoadingMore,
    loadMoreFailed,
    filterTab,
    setFilterTab,
    sort,
    setSort,
    searchInput,
    setSearchInput,
    search,
    clearSearch,
    unreadCount,
    hasCriticalUnread,
    loadFirstPage,
    loadMore,
    markRead,
    markAllRead,
  } = feed;
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => isNotificationSoundMuted());
  const isOwner = String(useOptionalAuth()?.user?.role ?? "").toUpperCase() === "OWNER";
  const tabs = isOwner ? OWNER_TABS : TABS;

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const sortId = useId();

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

  const handleMarkRead = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    void markRead(id);
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unreadCount === 0) return;
    void markAllRead();
  };

  const openLink = (link: Link, extra?: { stage: number; reason: string }) => {
    if (link.kind === "errand") {
      window.dispatchEvent(
        new CustomEvent("sugo:open-errand", { detail: { errandId: link.errandId, ...extra } })
      );
    } else {
      window.dispatchEvent(new CustomEvent("sugo:open-rider-chat", { detail: { riderId: link.riderId } }));
    }
    setIsOpen(false);
  };

  const handleNotificationClick = (notification: ApiNotification) => {
    if (!notification.isRead) {
      handleMarkRead(notification.id);
    }
    const link = linkOf(notification);
    if (link) openLink(link);
  };

  /** Out of stock: straight to Stage 2, where the rider's report and the store search are. */
  const handleOpenStageTwo = (notification: ApiNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = linkOf(notification);
    if (!link || link.kind !== "errand") return;
    if (!notification.isRead) handleMarkRead(notification.id);
    openLink(link, { stage: 2, reason: notification.title });
  };

  const hasMore = notifications.length < total;
  const empty = isOwner && filterTab === "ALL" ? OWNER_EMPTY_ALL : EMPTY_COPY[filterTab];

  const listBody = useMemo(
    () => (
      <ul className="divide-y divide-edge">
        {notifications.map((n) => {
          const priority = priorityOf(n);
          const level = PRIORITY_PRESENTATION[priority];
          const link = linkOf(n);
          const source = chatSource(n.type);
          const isOutOfStock = n.type === "ITEM_OUT_OF_STOCK" && link?.kind === "errand";

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
              {/* Meta row: unread dot, level, source, time, mark read */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  {!n.isRead && (
                    <span aria-hidden className="size-2 shrink-0 rounded-full bg-signal" title="Unread" />
                  )}
                  <DispatcherBadge tone={level.tone} aria-label={`${level.label} priority`}>
                    {level.label}
                  </DispatcherBadge>
                  {source && (
                    <span className="inline-flex min-w-0 items-center gap-1 truncate text-[11px] font-semibold text-ink-muted">
                      <MessageSquare size={12} className="shrink-0" aria-hidden />
                      {source}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
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
                <p
                  className={`line-clamp-2 break-words text-xs font-bold ${!n.isRead ? "text-ink" : "text-ink-muted"}`}
                >
                  {n.title}
                </p>
                <p className="mt-0.5 line-clamp-2 break-words text-xs leading-relaxed text-ink-muted">{n.body}</p>
              </div>

              {/* Actions */}
              {(link || isOutOfStock) && (
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  {link && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 group-hover:text-ink dark:text-slate-400">
                      {link.kind === "errand" ? `View errand ${formatErrandId(link.errandId)}` : "Open rider chat"}
                      <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  )}
                  {isOutOfStock && (
                    <DispatcherButton
                      variant="secondary"
                      size="sm"
                      icon={<PackageX size={14} />}
                      onClick={(e) => handleOpenStageTwo(n, e)}
                      aria-label={`Open Stage 2 for ${n.title}`}
                    >
                      Open Stage 2
                    </DispatcherButton>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    ),
    // Handlers read only setters and stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifications]
  );

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
            ? `Notifications, ${unreadCount} unread${hasCriticalUnread ? ", including critical" : ""}`
            : "Notifications, none unread"
        }
        data-bell
        className="relative grid size-10 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            aria-hidden
            // Red only when something Critical is waiting; navy otherwise.
            className={`absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums text-white ${
              hasCriticalUnread ? "bg-signal" : "bg-board-field"
            }`}
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
          className="absolute right-0 z-50 mt-2 flex max-h-[560px] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl border border-edge bg-board-plate shadow-xl outline-none"
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

          {/* Search and sort */}
          <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
            <DispatcherSearchField
              aria-label="Search notifications"
              placeholder="Search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              maxLength={80}
            />
            <label htmlFor={sortId} className="sr-only">
              Sort notifications
            </label>
            <select
              id={sortId}
              value={sort}
              onChange={(e) => setSort(e.target.value as NotificationSort)}
              className="min-h-9 shrink-0 cursor-pointer rounded-plate border border-edge bg-board-ground px-2 text-label text-ink"
            >
              {(Object.keys(SORT_LABELS) as NotificationSort[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Segment Tabs */}
          <div
            role="group"
            aria-label="Show"
            className="flex border-b border-edge bg-slate-50/50 dark:bg-slate-900/40 p-1.5 gap-1 text-xs font-semibold"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={filterTab === tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`flex-1 rounded-md py-1 px-2 text-center transition-colors ${
                  filterTab === tab.id ? "bg-white dark:bg-slate-800 text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                {tab.label}
                {tab.id === "UNREAD" && unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
            ))}
          </div>

          {/* Notification List Body */}
          <div className="flex-1 overflow-y-auto">
            <div className={status === "ready" && notifications.length > 0 ? "" : "p-3"}>
              <PanelState
                isLoading={status === "loading"}
                loadingRows={4}
                error={status === "error" ? "failed" : null}
                errorTitle="Notifications did not load"
                errorBody="The server did not answer. Alerts may be missing from this list until it loads."
                onRetry={() => void loadFirstPage()}
                isEmpty={notifications.length === 0}
                hasFilters={search.length > 0}
                onResetFilters={clearSearch}
                emptyTitle={empty.title}
                emptyBody={empty.body}
              >
                {listBody}
                {(hasMore || loadMoreFailed) && (
                  <div className="flex flex-col items-center gap-1 border-t border-edge p-3">
                    {loadMoreFailed && (
                      <p className="text-[11px] text-status-act-ink">Could not load more. Try again.</p>
                    )}
                    <DispatcherButton variant="subtle" size="sm" loading={isLoadingMore} onClick={() => void loadMore()}>
                      Load more ({total - notifications.length} left)
                    </DispatcherButton>
                  </div>
                )}
              </PanelState>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
