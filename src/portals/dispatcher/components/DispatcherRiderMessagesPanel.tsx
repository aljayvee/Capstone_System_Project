import React, { useState, useEffect, useRef, useMemo } from "react";
import { ref, push, onValue, set } from "firebase/database";
import { database } from "../../../firebase/config";
import { apiClient } from "../../../services/apiClient";
import { formatErrandId } from "../../../utils/formatErrandId";
import {
  Send,
  MessageCircle,
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  Store,
  ChevronRight,
  Maximize2,
  X,
  Phone,
} from "lucide-react";
import { DispatcherSearchField } from "@/components/panel/DispatcherSearchField";
import { StatusChip } from "@/components/panel/DispatcherBadge";

export interface RiderChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  role: "rider" | "dispatcher";
  text?: string;
  imageUrl?: string;
  timestamp: number;
}

export interface DispatcherRiderMessagesPanelProps {
  errands: any[];
  riders: any[];
  dispatcher: any;
  selectedRiderId?: string | null;
  onSelectRiderId?: (riderId: string) => void;
  unreadCounts?: Record<string, number>;
}

const STEP_STAGES = [
  { key: "TRAVELING", label: "Traveling to Store", icon: MapPin },
  { key: "AT_STORE", label: "At Store", icon: Store },
  { key: "DELIVERING", label: "On the way to Customer", icon: Bike },
  { key: "DELIVERED", label: "Delivered", icon: CheckCircle2 },
];

function stepIndexForStatus(status: unknown): number {
  const s = String(status || "").toUpperCase();
  if (s === "ASSIGNED" || s === "ACCEPTED" || s === "TRAVELING") return 0;
  if (s === "AT_STORE" || s === "PURCHASING" || s === "ITEMS_BOUGHT") return 1;
  if (s === "DELIVERING" || s === "EN_ROUTE") return 2;
  if (s === "DELIVERED" || s === "COMPLETED") return 3;
  return 0;
}

export function DispatcherRiderMessagesPanel({
  errands,
  riders,
  dispatcher,
  selectedRiderId: controlledSelectedRiderId,
  onSelectRiderId,
  unreadCounts = {},
}: DispatcherRiderMessagesPanelProps) {
  const [search, setSearch] = useState("");
  const [internalSelectedRiderId, setInternalSelectedRiderId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RiderChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [filterTab, setFilterTab] = useState<"ACTIVE" | "ALL">("ACTIVE");
  const [selectedErrandIndex, setSelectedErrandIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [chatMetaMap, setChatMetaMap] = useState<Record<string, any>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedRiderId = controlledSelectedRiderId !== undefined
    ? controlledSelectedRiderId
    : internalSelectedRiderId;

  const handleSelectRider = (id: string) => {
    if (onSelectRiderId) {
      onSelectRiderId(id);
    } else {
      setInternalSelectedRiderId(id);
    }
    setSelectedErrandIndex(0);
  };

  // Listen to all rider chat metadata for snippet & timestamps
  useEffect(() => {
    const metaRef = ref(database, "rider_chats");
    const unsubscribe = onValue(metaRef, (snapshot) => {
      const data = snapshot.val();
      if (!data || typeof data !== "object") return;
      const metaObj: Record<string, any> = {};
      for (const [rId, val] of Object.entries<any>(data)) {
        if (val?.meta) {
          metaObj[rId] = val.meta;
        }
      }
      setChatMetaMap(metaObj);
    });
    return () => unsubscribe();
  }, []);

  // Consolidate fleet riders with any riders assigned in errands
  const consolidatedRiders = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of riders) {
      map.set(String(r.id), {
        ...r,
        id: String(r.id),
        name: r.name || "Rider",
      });
    }

    for (const e of errands) {
      if (e.riderId && !map.has(String(e.riderId))) {
        map.set(String(e.riderId), {
          id: String(e.riderId),
          name: e.riderName || "Rider",
          online: false,
          riderStatus: "OFFLINE",
        });
      }
    }

    return Array.from(map.values());
  }, [riders, errands]);

  // Compute active errands per rider
  const riderActiveErrandsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const e of errands) {
      const s = String(e.status || "").toUpperCase();
      if (s === "COMPLETED" || s === "CANCELLED") continue;
      const rId = String(e.riderId || "");
      if (rId) {
        if (!map.has(rId)) map.set(rId, []);
        map.get(rId)!.push(e);
      }
    }
    return map;
  }, [errands]);

  // Filter riders based on search and active tab
  const filteredRiders = useMemo(() => {
    return consolidatedRiders
      .filter((r) => {
        const activeErrandsList = riderActiveErrandsMap.get(r.id) || [];
        const hasActiveErrand = activeErrandsList.length > 0;
        const isOnline = Boolean(r.online);

        if (filterTab === "ACTIVE" && !hasActiveErrand && !isOnline) {
          return false;
        }

        const query = search.trim().toLowerCase();
        if (!query) return true;

        const name = String(r.name || "").toLowerCase();
        const phone = String(r.phone || "").toLowerCase();
        const vehicle = String(r.vehicleType || "").toLowerCase();

        return name.includes(query) || phone.includes(query) || vehicle.includes(query);
      })
      .sort((a, b) => {
        const timeA = chatMetaMap[a.id]?.updatedAt || 0;
        const timeB = chatMetaMap[b.id]?.updatedAt || 0;
        if (timeA !== timeB) return timeB - timeA;

        const unreadA = unreadCounts[a.id] || 0;
        const unreadB = unreadCounts[b.id] || 0;
        if (unreadA !== unreadB) return unreadB - unreadA;

        const hasActiveA = (riderActiveErrandsMap.get(a.id)?.length || 0) > 0 ? 1 : 0;
        const hasActiveB = (riderActiveErrandsMap.get(b.id)?.length || 0) > 0 ? 1 : 0;
        if (hasActiveA !== hasActiveB) return hasActiveB - hasActiveA;

        return a.name.localeCompare(b.name);
      });
  }, [consolidatedRiders, filterTab, search, chatMetaMap, unreadCounts, riderActiveErrandsMap]);

  // Auto-select first rider if current selection invalid
  useEffect(() => {
    if (filteredRiders.length > 0) {
      if (!selectedRiderId || !filteredRiders.some((r) => r.id === selectedRiderId)) {
        handleSelectRider(filteredRiders[0].id);
      }
    }
  }, [filteredRiders, selectedRiderId]);

  const activeRider = consolidatedRiders.find((r) => r.id === selectedRiderId);
  const activeRiderErrands = activeRider ? riderActiveErrandsMap.get(activeRider.id) || [] : [];
  const currentErrand = activeRiderErrands[selectedErrandIndex] || activeRiderErrands[0] || null;

  // Firebase Realtime Database Listener for the selected rider
  useEffect(() => {
    if (!selectedRiderId) {
      setMessages([]);
      return;
    }

    const messagesRef = ref(database, `rider_chats/${selectedRiderId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMessages([]);
        return;
      }

      const list: RiderChatMessage[] = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));

      list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(list);
    });

    return () => unsubscribe();
  }, [selectedRiderId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedRiderId) return;

    const text = inputText.trim();
    const dispatcherName = dispatcher?.name || "Dispatcher";
    setSendError(null);

    try {
      const messagesRef = ref(database, `rider_chats/${selectedRiderId}/messages`);
      await push(messagesRef, {
        senderId: String(dispatcher?.id || "dispatcher-1"),
        senderName: dispatcherName,
        role: "dispatcher",
        text,
        timestamp: Date.now(),
      });

      const metaRef = ref(database, `rider_chats/${selectedRiderId}/meta`);
      await set(metaRef, {
        lastMessage: text,
        lastSender: "dispatcher",
        senderName: activeRider?.name || "Rider",
        updatedAt: Date.now(),
      });

      const dispatcherMetaRef = ref(database, `rider_chats/${selectedRiderId}/dispatcherMeta`);
      await set(dispatcherMetaRef, {
        dispatcherId: dispatcher?.id ?? null,
        dispatcherName,
      });

      setInputText("");

      // Trigger server FCM push notification to rider handset. No "/api"
      // prefix: apiClient's baseURL already ends in it, and the doubled
      // "/api/api/riders/..." answered 404 for every message sent.
      apiClient.post(`/riders/${selectedRiderId}/notify-chat`, {
        text,
        senderName: dispatcherName,
      }).catch((err) => {
        console.warn("FCM push notify skipped or failed:", err);
      });
    } catch (err) {
      console.warn("Failed to send rider message:", err);
      setSendError("Message could not be sent. Please check your connection and try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentStepIdx = currentErrand ? stepIndexForStatus(currentErrand.status) : 0;

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-plate border border-edge bg-board-plate">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* LEFT COLUMN: RIDER CONVERSATION LIST (35% Width)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex w-full shrink-0 flex-col border-hairline bg-board-ground sm:w-[320px] sm:border-r lg:w-[360px]">
        {/* Panel Header */}
        <div className="border-b border-hairline bg-board-plate p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-panel text-ink">Rider Messages</h2>
            <span data-figure className="text-label tabular-nums text-ink-muted">
              {filteredRiders.length}
            </span>
          </div>

          {/* Search Bar */}
          <div className="mb-2.5">
            <DispatcherSearchField
              aria-label="Search riders by name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rider by name..."
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterTab("ACTIVE")}
              aria-pressed={filterTab === "ACTIVE"}
              className={`min-h-9 flex-1 cursor-pointer rounded-trim px-3 text-micro uppercase transition-colors ${
                filterTab === "ACTIVE"
                  ? "bg-board-field text-board-plate"
                  : "bg-board-plate text-ink-muted hover:text-ink"
              }`}
            >
              Active / On Duty
            </button>
            <button
              onClick={() => setFilterTab("ALL")}
              aria-pressed={filterTab === "ALL"}
              className={`min-h-9 flex-1 cursor-pointer rounded-trim px-3 text-micro uppercase transition-colors ${
                filterTab === "ALL"
                  ? "bg-board-field text-board-plate"
                  : "bg-board-plate text-ink-muted hover:text-ink"
              }`}
            >
              All Fleet
            </button>
          </div>
        </div>

        {/* Riders List */}
        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-hairline">
          {filteredRiders.length === 0 ? (
            <div className="space-y-1.5 p-8 text-center">
              <Bike className="mx-auto text-board-trim" size={28} />
              <p className="text-body text-ink">
                {search.trim() || filterTab === "ACTIVE"
                  ? "No riders match this filter"
                  : "No riders in fleet"}
              </p>
              <p className="text-label text-ink-muted">
                {filterTab === "ACTIVE"
                  ? "Switch to All Fleet to message off-duty riders."
                  : "Riders registered in the fleet will appear here."}
              </p>
            </div>
          ) : (
            filteredRiders.map((r) => {
              const isSelected = r.id === selectedRiderId;
              const isOnline = Boolean(r.online);
              const activeErrandsList = riderActiveErrandsMap.get(r.id) || [];
              const hasActiveErrand = activeErrandsList.length > 0;
              const unread = unreadCounts[r.id] || 0;
              const meta = chatMetaMap[r.id];
              const timeFormatted = meta?.updatedAt
                ? new Date(meta.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectRider(r.id)}
                  className={`w-full text-left p-3.5 flex items-start gap-3 transition cursor-pointer ${
                    isSelected
                      ? "bg-board-field"
                      : "bg-transparent hover:bg-board-plate"
                  }`}
                >
                  {/* Rider Avatar with Status Dot */}
                  <div className="relative shrink-0">
                    <div className="grid size-10 place-items-center rounded-full bg-board-field text-label font-bold text-board-plate">
                      {(r.name || "Rider")
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-white ${
                        isOnline ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                      title={isOnline ? "Online" : "Offline"}
                    />
                  </div>

                  {/* Rider Details & Snippet */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`truncate text-sm font-semibold ${isSelected ? "text-board-plate" : "text-ink"}`}>
                        {r.name}
                      </p>
                      {timeFormatted && (
                        <span className={`shrink-0 text-[11px] ${isSelected ? "text-board-plate/80" : "text-ink-muted"}`}>
                          {timeFormatted}
                        </span>
                      )}
                    </div>

                    {/* Duty Status Badge & Task Pill */}
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          hasActiveErrand
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : isOnline
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {hasActiveErrand
                          ? `${activeErrandsList.length} Active`
                          : isOnline
                          ? "Available"
                          : "Offline"}
                      </span>
                    </div>

                    {/* Latest Message Preview */}
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`truncate text-xs ${
                          unread > 0
                            ? "font-bold text-sky-400"
                            : isSelected
                            ? "text-board-plate/80"
                            : "text-ink-muted"
                        }`}
                      >
                        {meta?.lastMessage || (hasActiveErrand ? "Tap to open chat" : "Start a conversation")}
                      </p>
                      {unread > 0 && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-sky-500 text-white font-mono text-[10px] font-bold">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RIGHT COLUMN: MESSENGER CHAT & ERRAND BREADCRUMBS (65% Width) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col bg-board-plate">
        {activeRider ? (
          <>
            {/* 1. Rider Header with Task Summary & Breadcrumbs */}
            <div className="flex flex-col border-b border-hairline bg-board-plate px-4 py-3 gap-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div className="grid size-11 place-items-center rounded-full bg-board-field text-data font-bold text-board-plate">
                      {(activeRider.name || "R")
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white ${
                        activeRider.online ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-panel text-ink">{activeRider.name}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-board-field text-board-plate">
                        {activeRider.online ? "On Duty" : "Offline"}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-2 text-label text-ink-muted">
                      {activeRider.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} /> {activeRider.phone}
                        </span>
                      )}
                      {activeRider.vehicleType && <span>• {activeRider.vehicleType}</span>}
                    </p>
                  </div>
                </div>

                {/* Multiple Errand Switcher Chips if applicable */}
                {activeRiderErrands.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                    <span className="text-[11px] text-ink-muted shrink-0">Errand:</span>
                    {activeRiderErrands.map((e, idx) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setSelectedErrandIndex(idx)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                          selectedErrandIndex === idx
                            ? "bg-signal text-white"
                            : "bg-board-field text-ink hover:bg-board-plate"
                        }`}
                      >
                        {e.customerName || `Task #${idx + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Active Errand Progress Breadcrumbs Banner */}
              {currentErrand ? (
                <div className="rounded-xl border border-edge bg-board-ground p-3">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-xs text-ink truncate">
                        Drop-off: {currentErrand.customerName || currentErrand.customer || "Customer"}
                      </span>
                      <span className="text-xs text-ink-muted truncate">
                        • {currentErrand.category || "Errand delivery"}
                      </span>
                    </div>
                    <StatusChip status={currentErrand.status} className="shrink-0" />
                  </div>

                  {/* Progress Breadcrumbs Stepper */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-1">
                    {STEP_STAGES.map((st, idx) => {
                      const Icon = st.icon;
                      const isCompleted = idx < currentStepIdx;
                      const isCurrent = idx === currentStepIdx;

                      return (
                        <React.Fragment key={st.key}>
                          <div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                              isCurrent
                                ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                                : isCompleted
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-white/5 text-slate-400"
                            }`}
                          >
                            <Icon size={13} className={isCurrent ? "animate-pulse" : ""} />
                            <span>{st.label}</span>
                          </div>
                          {idx < STEP_STAGES.length - 1 && (
                            <ChevronRight size={14} className="text-slate-500 shrink-0" />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-edge bg-board-ground/50 p-2.5 text-center">
                  <p className="text-xs text-ink-muted">
                    Rider is currently on standby with no active errands on the road.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Messages Scroll Area */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-board-ground p-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="grid size-12 place-items-center rounded-plate bg-board-plate text-ink-muted">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <h4 className="text-panel text-ink">No messages yet</h4>
                    <p className="mt-1 max-w-xs text-body text-ink-muted">
                      Start a direct messenger conversation with {activeRider.name}.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isDispatcher = msg.role === "dispatcher";
                  const timeFormatted = msg.timestamp
                    ? new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isDispatcher ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-end gap-2 max-w-[80%]">
                        {!isDispatcher && (
                          <div className="mb-1 grid size-7 shrink-0 place-items-center rounded-full bg-board-field text-micro text-board-plate font-bold">
                            {(msg.senderName || activeRider.name || "R")[0].toUpperCase()}
                          </div>
                        )}

                        <div>
                          {/* Image Attachment Preview if present */}
                          {msg.imageUrl && (
                            <div className="mb-1.5 overflow-hidden rounded-xl border border-edge bg-board-plate">
                              <button
                                type="button"
                                onClick={() => setPreviewImage(msg.imageUrl || null)}
                                className="group relative block cursor-pointer"
                              >
                                <img
                                  src={msg.imageUrl}
                                  alt="Attachment"
                                  className="max-h-60 w-auto rounded-lg object-contain transition-transform group-hover:scale-[1.02]"
                                />
                                <span className="absolute bottom-2 right-2 grid size-7 place-items-center rounded-md bg-black/60 text-white backdrop-blur-sm">
                                  <Maximize2 size={14} />
                                </span>
                              </button>
                            </div>
                          )}

                          {/* Message Text Bubble */}
                          {msg.text ? (
                            <div
                              className={`overflow-hidden rounded-plate px-3.5 py-2 text-body break-words [overflow-wrap:anywhere] ${
                                isDispatcher
                                  ? "bg-board-field text-board-plate"
                                  : "border border-edge bg-board-plate text-ink"
                              }`}
                            >
                              {msg.text}
                            </div>
                          ) : null}

                          <span
                            className={`mt-1 inline-block px-1 text-label text-ink-muted ${
                              isDispatcher ? "text-right float-right" : "text-left"
                            }`}
                          >
                            {timeFormatted}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 4. Input Composer Bar */}
            <div className="border-t border-hairline bg-board-plate p-3">
              {sendError && (
                <p
                  role="alert"
                  className="mb-2 rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink"
                >
                  {sendError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Message ${activeRider.name}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label={`Message ${activeRider.name}`}
                  className="min-h-10 flex-1 rounded-plate border border-edge bg-board-ground px-3 text-body text-ink placeholder:text-ink-muted transition-colors focus:border-board-field focus:bg-board-plate"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  aria-label="Send message"
                  className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-plate bg-signal text-white transition-colors hover:bg-signal-deep disabled:cursor-not-allowed disabled:bg-status-closed-fill disabled:text-status-closed-ink"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <Bike size={32} className="text-board-trim" />
            <h3 className="text-panel text-ink">Select a rider</h3>
            <p className="max-w-sm text-body text-ink-muted">
              Choose a rider from the left panel to open your persistent conversation and monitor their active errand progress.
            </p>
          </div>
        )}
      </div>

      {/* Full Screen Image Zoom Modal */}
      {previewImage && (
        <div
          role="dialog"
          aria-label="Image preview"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm cursor-zoom-out"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              aria-label="Close image preview"
              className="absolute -top-10 right-0 grid size-8 place-items-center rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer"
            >
              <X size={18} />
            </button>
            <img
              src={previewImage}
              alt="Full resolution preview"
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DispatcherRiderMessagesPanel;
