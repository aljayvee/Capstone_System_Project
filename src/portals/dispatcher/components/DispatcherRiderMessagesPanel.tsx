import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue, set } from "firebase/database";
import { database } from "../../../firebase/config";
import { formatErrandId } from "../../../utils/formatErrandId";
import {
  Search,
  Send,
  MessageCircle,
  Bike,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ChevronRight,
  ShieldCheck,
  User,
} from "lucide-react";

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

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedErrandId) return;

    const text = inputText.trim();
    const dispatcherName = dispatcher?.name || "Dispatcher";

    const messagesRef = ref(database, `rider_chats/${selectedErrandId}/messages`);
    push(messagesRef, {
      senderId: String(dispatcher?.id || "dispatcher-1"),
      senderName: dispatcherName,
      role: "dispatcher",
      text,
      timestamp: Date.now(),
    });

    // Update meta summary
    const metaRef = ref(database, `rider_chats/${selectedErrandId}/meta`);
    push(metaRef, {
      lastMessage: text,
      lastSender: "dispatcher",
      updatedAt: Date.now(),
    });

    // Current-state identity of whichever dispatcher is corresponding with this
    // rider right now — a stable node (set, not push) so the rider app can read
    // "who am I chatting with" the same way CustomerApp reads chats/{id}/meta.
    const dispatcherMetaRef = ref(database, `rider_chats/${selectedErrandId}/dispatcherMeta`);
    set(dispatcherMetaRef, {
      dispatcherId: dispatcher?.id ?? null,
      dispatcherName,
    });

    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex h-[calc(100vh-210px)] min-h-[500px]">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* LEFT COLUMN: CONVERSATION LIST (35% Width)                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="w-[340px] lg:w-[380px] border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="text-blue-600" size={20} />
              <h2 className="font-extrabold text-slate-800 text-base">Rider Messages</h2>
            </div>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              {assignedErrands.length} Channels
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative mb-2.5">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search rider name or errand #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterTab("ACTIVE")}
              className={`flex-1 py-1 text-[11px] font-bold rounded-md transition ${
                filterTab === "ACTIVE"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Active Deliveries
            </button>
            <button
              onClick={() => setFilterTab("ALL")}
              className={`flex-1 py-1 text-[11px] font-bold rounded-md transition ${
                filterTab === "ALL"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Assigned
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredErrands.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Bike className="mx-auto text-slate-300" size={32} />
              <p className="text-xs font-medium">No assigned riders match your search.</p>
            </div>
          ) : (
            filteredErrands.map((e) => {
              const isSelected = e.id === selectedErrandId;
              const r = riders.find((rd) => String(rd.id) === String(e.riderId));
              const isOnline = r?.online ?? false;
              const statusStr = String(e.status || "").toUpperCase();

              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedErrandId(e.id)}
                  className={`w-full text-left p-3.5 flex items-start gap-3 transition ${
                    isSelected
                      ? "bg-blue-50/80 border-l-4 border-l-blue-600"
                      : "hover:bg-white bg-transparent"
                  }`}
                >
                  {/* Rider Avatar with Online Dot */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {(e.riderName || "Rider")
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        isOnline ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                      title={isOnline ? "Online" : "Offline"}
                    />
                  </div>

                  {/* Rider & Errand Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {e.riderName || "Assigned Rider"}
                      </p>
                      <span className="text-[10px] font-mono font-bold text-blue-600">
                        #{formatErrandId(e.id)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mb-1">
                      {e.category || "Pabili Delivery"}
                    </p>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          statusStr === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700"
                            : statusStr === "IN_TRANSIT"
                            ? "bg-blue-100 text-blue-700"
                            : statusStr === "AT_STORE"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {e.status}
                      </span>
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
      <div className="flex-1 flex flex-col bg-white">
        {activeErrand ? (
          <>
            {/* Chat Top Header */}
            <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {(activeErrand.riderName || "Rider")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      activeRider?.online ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-800 text-sm">
                      {activeErrand.riderName || "Assigned Rider"}
                    </h3>
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                      Rider #{activeErrand.riderId || "—"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span>Errand #{formatErrandId(activeErrand.id)}</span>
                    <span>•</span>
                    <span className="font-semibold text-blue-600">{activeErrand.category}</span>
                    <span>•</span>
                    <span className="text-slate-400">{activeErrand.customerName}</span>
                  </p>
                </div>
              </div>

              {/* Errand Status Pill */}
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Errand Status</p>
                  <span className="text-xs font-extrabold text-slate-800">{activeErrand.status}</span>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <MessageCircle size={28} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-700 text-sm">No messages yet</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
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
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mb-1">
                            {(msg.senderName || "R")[0].toUpperCase()}
                          </div>
                        )}

                        <div>
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                              isDispatcher
                                ? "bg-blue-600 text-white rounded-br-xs shadow-xs"
                                : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs"
                            }`}
                          >
                            {msg.text}
                          </div>
                          <span
                            className={`text-[9px] text-slate-400 mt-1 px-1 inline-block ${
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
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Message ${activeErrand.riderName || "rider"}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition flex items-center justify-center"
                  title="Send Message"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-400">
            <Bike size={44} className="text-slate-300" />
            <h3 className="font-bold text-slate-700 text-sm">Select a Rider Conversation</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Choose an active errand from the left panel to coordinate with the assigned rider in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DispatcherRiderMessagesPanel;
