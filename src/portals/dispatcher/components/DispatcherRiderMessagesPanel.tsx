import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue, set } from "firebase/database";
import { database } from "../../../firebase/config";
import { formatErrandId } from "../../../utils/formatErrandId";
import { Send, MessageCircle, Bike } from "lucide-react";
import { DispatcherSearchField } from "@/components/panel/DispatcherSearchField";
import { StatusChip } from "@/components/panel/DispatcherBadge";

export interface RiderChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  role: "rider" | "dispatcher";
  text: string;
  timestamp: number;
}

export interface DispatcherRiderMessagesPanelProps {
  errands: any[];
  riders: any[];
  dispatcher: any;
}

export function DispatcherRiderMessagesPanel({
  errands,
  riders,
  dispatcher,
}: DispatcherRiderMessagesPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedErrandId, setSelectedErrandId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RiderChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [filterTab, setFilterTab] = useState<"ACTIVE" | "ALL">("ACTIVE");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find errands that have an assigned rider
  const assignedErrands = errands.filter((e) => {
    return e.riderId || e.riderName;
  });

  // Filter based on search & active tab
  const filteredErrands = assignedErrands.filter((e) => {
    const s = String(e.status || "").toUpperCase();
    const isActive = s !== "COMPLETED" && s !== "CANCELLED";
    if (filterTab === "ACTIVE" && !isActive) return false;

    const query = search.trim().toLowerCase();
    if (!query) return true;

    const riderName = String(e.riderName || "").toLowerCase();
    const errandId = String(e.id || "").toLowerCase();
    const formattedId = formatErrandId(e.id).toLowerCase();
    const cat = String(e.category || "").toLowerCase();

    return (
      riderName.includes(query) ||
      errandId.includes(query) ||
      formattedId.includes(query) ||
      cat.includes(query)
    );
  });

  // Select first errand automatically if none selected or selection invalid
  useEffect(() => {
    if (filteredErrands.length > 0) {
      if (!selectedErrandId || !filteredErrands.some((e) => e.id === selectedErrandId)) {
        setSelectedErrandId(filteredErrands[0].id);
      }
    } else {
      setSelectedErrandId(null);
    }
  }, [filteredErrands, selectedErrandId]);

  // Selected errand details
  const activeErrand = assignedErrands.find((e) => e.id === selectedErrandId);
  const activeRider = riders.find((r) => String(r.id) === String(activeErrand?.riderId));

  // Firebase Realtime Database Listener for rider chat
  useEffect(() => {
    if (!selectedErrandId) {
      setMessages([]);
      return;
    }

    const messagesRef = ref(database, `rider_chats/${selectedErrandId}/messages`);
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
  }, [selectedErrandId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [sendError, setSendError] = useState<string | null>(null);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedErrandId) return;

    const text = inputText.trim();
    const dispatcherName = dispatcher?.name || "Dispatcher";

    setSendError(null);

    try {
      const messagesRef = ref(database, `rider_chats/${selectedErrandId}/messages`);
      await push(messagesRef, {
        senderId: String(dispatcher?.id || "dispatcher-1"),
        senderName: dispatcherName,
        role: "dispatcher",
        text,
        timestamp: Date.now(),
      });

      // The summary of the latest message: one record that gets overwritten,
      // so `set`, not `push`. Pushing appended a new child per message under a
      // node meant to hold a single summary, which grew without bound and left
      // no reader able to resolve which child was "the" last message.
      const metaRef = ref(database, `rider_chats/${selectedErrandId}/meta`);
      await set(metaRef, {
        lastMessage: text,
        lastSender: "dispatcher",
        updatedAt: Date.now(),
      });

    // Current-state identity of whichever dispatcher is corresponding with this
    // rider right now — a stable node (set, not push) so the rider app can read
    // "who am I chatting with" the same way CustomerApp reads chats/{id}/meta.
      const dispatcherMetaRef = ref(database, `rider_chats/${selectedErrandId}/dispatcherMeta`);
      await set(dispatcherMetaRef, {
        dispatcherId: dispatcher?.id ?? null,
        dispatcherName,
      });

      // Cleared only after the write lands. The composer used to be emptied
      // immediately, before an unawaited and uncaught push, so an offline or
      // rejected write destroyed the message silently and the dispatcher
      // believed the rider had been told.
      setInputText("");
    } catch (err) {
      console.warn("Failed to send rider message:", err);
      setSendError("That message did not send. It is still in the box, so you can try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    // Height from the flex chain. This was h-[calc(100vh-210px)] with a
    // min-h-[500px] floor: a guess about a header it cannot see, plus a
    // floor that overflows a 720p laptop and every tablet.
    <div className="flex h-full min-h-0 overflow-hidden rounded-plate border border-edge bg-board-plate">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* LEFT COLUMN: CONVERSATION LIST (35% Width)                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex w-full shrink-0 flex-col border-hairline bg-board-ground sm:w-[300px] sm:border-r lg:w-[360px]">
        {/* Panel Header */}
        <div className="border-b border-hairline bg-board-plate p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-panel text-ink">Rider messages</h2>
            <span data-figure className="text-label tabular-nums text-ink-muted">
              {assignedErrands.length}
            </span>
          </div>

          {/* Search Bar */}
          <div className="mb-2.5">
            <DispatcherSearchField
              aria-label="Search riders by name or route number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rider or route number"
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
              On the road
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
              All assigned
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-hairline">
          {filteredErrands.length === 0 ? (
            <div className="space-y-1.5 p-8 text-center">
              <Bike className="mx-auto text-board-trim" size={28} />
              <p className="text-body text-ink">
                {search.trim() || filterTab === "ACTIVE"
                  ? "No riders match this view"
                  : "No riders assigned yet"}
              </p>
              <p className="text-label text-ink-muted">
                {search.trim() || filterTab === "ACTIVE"
                  ? "Try All assigned, or clear the search."
                  : "A conversation opens here once a run has a rider on it."}
              </p>
            </div>
          ) : (
            filteredErrands.map((e) => {
              const isSelected = e.id === selectedErrandId;
              const r = riders.find((rd) => String(rd.id) === String(e.riderId));
              const isOnline = r?.online ?? false;

              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedErrandId(e.id)}
                  className={`w-full text-left p-3 flex items-start gap-3 transition ${
                    isSelected
                      ? "bg-board-field"
                      : "bg-transparent hover:bg-board-plate"
                  }`}
                >
                  {/* Rider Avatar with Online Dot */}
                  <div className="relative shrink-0">
                    <div className="grid size-10 place-items-center rounded-full bg-board-field text-label text-board-plate">
                      {(e.riderName || "Rider")
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        isOnline ? "bg-status-done-ink" : "bg-board-trim"
                      }`}
                      title={isOnline ? "Online" : "Offline"}
                    />
                  </div>

                  {/* Rider & Errand Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="truncate text-body text-ink">
                        {e.riderName || "Assigned rider"}
                      </p>
                      <span data-figure className="shrink-0 font-mono text-label text-ink-muted">
                        {formatErrandId(e.id)}
                      </span>
                    </div>

                    <p className="mb-1 truncate text-label text-ink-muted">
                      {e.category || "Pabili delivery"}
                    </p>

                    <div className="flex items-center gap-1.5">
                      <StatusChip status={e.status} />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RIGHT COLUMN: LIVE MESSENGER CHAT AREA (65% Width)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col bg-board-plate">
        {activeErrand ? (
          <>
            {/* Chat Top Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline bg-board-plate px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative">
                  <div className="grid size-11 place-items-center rounded-full bg-board-field text-data text-board-plate">
                    {(activeErrand.riderName || "Rider")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      activeRider?.online ? "bg-status-done-ink" : "bg-board-trim"
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate text-panel text-ink">
                      {activeErrand.riderName || "Assigned rider"}
                    </h3>
                    <span data-figure className="shrink-0 font-mono text-label text-ink-muted">
                      {activeErrand.riderId ? `#${activeErrand.riderId}` : "no rider id"}
                    </span>
                  </div>
                  <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-label text-ink-muted">
                    <span data-figure>{formatErrandId(activeErrand.id)}</span>
                    <span className="truncate">{activeErrand.category}</span>
                    <span className="truncate">{activeErrand.customerName}</span>
                  </p>
                </div>
              </div>

              {/* Errand Status Pill */}
              <StatusChip status={activeErrand.status} className="shrink-0" />
            </div>

            {/* Messages Scroll Area */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-board-ground p-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="grid size-11 place-items-center rounded-plate bg-board-plate text-ink-muted">
                    <MessageCircle size={22} />
                  </div>
                  <div>
                    <h4 className="text-panel text-ink">No messages yet</h4>
                    <p className="mt-1 max-w-xs text-body text-ink-muted">
                      Send a message to {activeErrand.riderName || "the rider"} regarding Errand #
                      {formatErrandId(activeErrand.id)}.
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
                      <div className="flex items-end gap-2 max-w-[75%]">
                        {!isDispatcher && (
                          <div className="mb-1 grid size-7 shrink-0 place-items-center rounded-full bg-board-field text-micro text-board-plate">
                            {(msg.senderName || "R")[0].toUpperCase()}
                          </div>
                        )}

                        <div>
                          <div
                            className={`overflow-hidden rounded-plate px-3 py-2 text-body break-words [overflow-wrap:anywhere] ${
                              isDispatcher
                                ? "bg-board-field text-board-plate"
                                : "border border-edge bg-board-plate text-ink"
                            }`}
                          >
                            {msg.text}
                          </div>
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

            {/* Input Bar */}
            <div className="border-t border-hairline bg-board-plate p-3">
              {sendError ? (
                <p
                  role="alert"
                  className="mb-2 rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink"
                >
                  {sendError}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Message ${activeErrand.riderName || "rider"}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label={`Message ${activeErrand.riderName || "the rider"}`}
                  className="min-h-10 flex-1 rounded-plate border border-edge bg-board-ground px-3 text-body text-ink placeholder:text-ink-muted transition-colors focus:border-board-field focus:bg-board-plate"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  aria-label="Send this message"
                  className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-plate bg-signal text-white transition-colors hover:bg-signal-deep disabled:cursor-not-allowed disabled:bg-status-closed-fill disabled:text-status-closed-ink"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <Bike size={28} className="text-board-trim" />
            <h3 className="text-panel text-ink">No conversation to show</h3>
            <p className="max-w-sm text-body text-ink-muted">
              A thread opens here as soon as a run has a rider on it. The first one is selected
              automatically, so there is nothing to pick yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DispatcherRiderMessagesPanel;
