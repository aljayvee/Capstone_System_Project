import React from "react";
import { formatPeso } from "../../utils/format";
import {
  CheckCheck,
  MapPin,
  Bike,
  User,
  ShieldCheck,
  ClipboardCheck,
  Store,
  Receipt,
  CheckCircle2,
  Clock,
  CreditCard,
  Banknote,
  Sparkles,
  Trash2,
} from "lucide-react";

export interface ChatMessageData {
  id: string;
  senderId: string;
  senderName: string;
  role: "customer" | "dispatcher" | "system" | "rider";
  type?: "text" | "pinpoints" | "payment_prompt" | "order_confirmation" | "item_deleted" | "rider_assigned";
  text: string;
  pinpoints?: Array<{ storeName: string; latitude: number; longitude: number }>;
  items?: Array<{ itemName: string; storeCategory?: string; quantity: number }>;
  groupedItems?: Record<string, Array<{ itemName: string; quantity: number; priceNote?: string }>>;
  deliveryFee?: number;
  totalCost?: number;
  confirmed?: boolean;
  paymentMode?: string;
  timestamp: number;
}

interface ChatBubbleProps {
  message: ChatMessageData;
  isCurrentUser: boolean;
  currentUserFirstName?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isCurrentUser,
  currentUserFirstName,
}) => {
  const formatTime = (ts: number) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // 1. Interactive Store-Grouped Order Confirmation Card
  if (message.type === "order_confirmation") {
    const grouped = message.groupedItems || {};
    const storeKeys = Object.keys(grouped);

    return (
      <div className="my-3 mx-auto w-full max-w-[96%] animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-white rounded-2xl border border-slate-300 shadow-md overflow-hidden text-slate-800 text-xs">
          <div className="bg-gradient-to-r from-dispatcher-navy-dark to-dispatcher-navy text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-200 flex items-center justify-center shadow-inner">
                <ClipboardCheck size={16} />
              </span>
              <div>
                <h4 className="font-extrabold text-xs tracking-wide">Order Summary</h4>
                <p className="text-[10px] text-blue-200/80">Grouped by store, with your delivery fee</p>
              </div>
            </div>
            {message.confirmed ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 size={12} className="text-emerald-400" /> Approved by customer
              </span>
            ) : (
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                <Clock size={12} className="text-amber-400" /> Awaiting customer
              </span>
            )}
          </div>

          <div className="p-4 space-y-3.5 bg-slate-50/50">
            {storeKeys.length === 0 ? (
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                {(message.items || []).map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-none">
                    <span className="font-bold text-slate-800">
                      {it.itemName} <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">×{it.quantity}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium italic">Actual receipt upon purchase</span>
                  </div>
                ))}
              </div>
            ) : (
              storeKeys.map((storeName, idx) => {
                const storeData: any = grouped[storeName];
                const isCategoryGrouped = storeData && typeof storeData === "object" && !Array.isArray(storeData);

                return (
                  <div key={idx} className="bg-white border border-slate-200/90 rounded-xl p-3 space-y-2 shadow-2xs">
                    <div className="flex items-center gap-2 font-black text-xs text-dispatcher-navy border-b border-slate-100 pb-1.5">
                      <Store size={14} className="text-red-600" />
                      <span>{storeName}</span>
                    </div>

                    {isCategoryGrouped ? (
                      <div className="space-y-2.5 pl-1">
                        {Object.keys(storeData).map((catName) => {
                          const catItems: any[] = Array.isArray(storeData[catName]) ? storeData[catName] : [];
                          return (
                            <div key={catName} className="space-y-1 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wide flex items-center gap-1">
                                {catName}
                              </span>
                              <div className="space-y-1 pl-1">
                                {catItems.map((it: any, itemIdx: number) => (
                                  <div key={itemIdx} className="flex items-center justify-between text-xs py-0.5">
                                    <span className="text-slate-800 font-bold">
                                      • {it.itemName} <span className="text-blue-700 bg-white border border-slate-200 px-1.5 py-0.2 rounded font-black font-mono ml-1">×{it.quantity}</span>
                                    </span>
                                    <span className="text-[10px] text-slate-500 italic">
                                      {it.priceNote || "Official receipt upon arrival"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-1.5 pl-1">
                        {(Array.isArray(storeData) ? storeData : []).map((it: any, itemIdx: number) => (
                          <div key={itemIdx} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-slate-700 font-medium">
                              • {it.itemName} <strong className="text-slate-900 font-black ml-1">×{it.quantity}</strong>
                            </span>
                            <span className="text-[10px] text-slate-500 italic">
                              {it.priceNote || "Official receipt upon arrival"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-950 font-bold text-xs">
                <Receipt size={16} className="text-blue-700" />
                <span>Exact Upfront Delivery Fee:</span>
              </div>
              <span className="font-black text-base text-dispatcher-navy font-mono">
                {formatPeso(Number(message.deliveryFee || 50))}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Payment Prompt / Verification Card
  if (message.type === "payment_prompt") {
    return (
      <div className="my-3 mx-auto w-full max-w-[96%] animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-white rounded-2xl border border-blue-200 shadow-md overflow-hidden text-slate-800 text-xs">
          <div className="bg-gradient-to-r from-blue-900 to-dispatcher-navy text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-200 flex items-center justify-center">
                <CreditCard size={16} />
              </span>
              <div>
                <h4 className="font-extrabold text-xs tracking-wide">Payment Method</h4>
                <p className="text-[10px] text-blue-200/80">Cash on Delivery confirmation</p>
              </div>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
              <Banknote size={12} className="text-emerald-400" /> Verified
            </span>
          </div>

          <div className="p-4 space-y-2 bg-slate-50/50">
            <p className="text-slate-700 leading-relaxed text-xs">
              {message.text}
            </p>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Selected Method:</span>
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Banknote size={14} className="text-emerald-600" />
                <span>Cash on Delivery (COD)</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Item Removed / Deleted Live Notification Card
  if (message.type === "item_deleted" || message.text.startsWith("🗑️")) {
    return (
      <div className="my-2.5 mx-auto w-full max-w-[94%] animate-in fade-in duration-200">
        <div className="bg-rose-50 border border-rose-200/90 text-rose-950 p-3 rounded-2xl shadow-xs text-xs space-y-1">
          <div className="flex items-center gap-2 border-b border-rose-200/60 pb-1.5">
            <span className="w-5 h-5 rounded-md bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
              <Trash2 size={12} />
            </span>
            <span className="font-black tracking-wider text-rose-900 uppercase text-[10px]">
              Item Removed from Order
            </span>
            <span className="ml-auto text-[10px] text-rose-500 font-mono">
              {formatTime(message.timestamp)}
            </span>
          </div>
          <p className="text-rose-900 leading-relaxed text-xs pl-1 font-medium">{message.text}</p>
        </div>
      </div>
    );
  }

  // Keyed off the message's own `type`, not its text — sniffing for a leading
  // emoji broke the moment the message copy stopped using decorative emoji as
  // a marker, which is exactly what happened here. `type` is what a message
  // actually is; the words are free to change without breaking how it renders.
  const isSystemMsg =
    message.role === "system" ||
    message.type === "pinpoints" ||
    message.type === "rider_assigned";

  // 4. System Announcement / Broadcast Banner
  if (isSystemMsg) {
    return (
      <div className="my-2.5 mx-auto w-full max-w-[94%] animate-in fade-in duration-200">
        <div className="bg-gradient-to-r from-slate-900 via-dispatcher-navy-dark to-dispatcher-navy text-white p-3 rounded-2xl shadow-sm border border-blue-400/20 text-xs space-y-1.5">
          <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
            {message.type === "pinpoints" ? (
              <span className="w-5 h-5 rounded-md bg-blue-500/30 text-blue-300 flex items-center justify-center shrink-0">
                <MapPin size={12} />
              </span>
            ) : message.type === "rider_assigned" ? (
              <span className="w-5 h-5 rounded-md bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0">
                <Bike size={12} />
              </span>
            ) : (
              <span className="w-5 h-5 rounded-md bg-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0">
                <Sparkles size={12} />
              </span>
            )}
            <span className="font-black tracking-wider text-blue-100 uppercase text-[10px]">
              {message.type === "pinpoints"
                ? "Store locations updated"
                : message.type === "rider_assigned"
                ? "Rider assigned"
                : "Update"}
            </span>
            <span className="ml-auto text-[10px] text-blue-200/70 font-mono">
              {formatTime(message.timestamp)}
            </span>
          </div>
          <p className="text-slate-100 leading-relaxed text-xs pl-1">{message.text}</p>
        </div>
      </div>
    );
  }

  // 4. Standard Speech Bubbles (Dispatcher vs Customer)
  return (
    <div
      className={`flex items-end gap-2.5 my-2 max-w-[88%] ${
        isCurrentUser ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
      }`}
    >
      {/* User Avatar Badge */}
      <div
        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${
          isCurrentUser
            ? "bg-dispatcher-navy text-white border border-blue-400/30 shadow-inner"
            : "bg-slate-200 text-slate-700 border border-slate-300/80"
        }`}
        title={message.senderName}
        role="img"
        aria-label={message.senderName}
      >
        {isCurrentUser ? (
          <ShieldCheck size={14} className="text-blue-200" />
        ) : (
          <User size={14} className="text-slate-600" />
        )}
      </div>

      {/* Message Content Bubble */}
      <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
        {/* Sender Name & Role Subhead */}
        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-bold text-slate-400">
          <span>{isCurrentUser ? `${currentUserFirstName || "Dispatcher"} (You)` : message.senderName || "Customer"}</span>
        </div>

        {/* Speech Bubble Surface */}
        <div
          className={`relative px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm transition-all ${
            isCurrentUser
              ? "bg-gradient-to-r from-dispatcher-navy-dark to-dispatcher-navy text-white rounded-2xl rounded-br-xs border border-blue-500/20"
              : "bg-white text-slate-800 border border-slate-200/90 rounded-2xl rounded-bl-xs shadow-xs"
          }`}
        >
          <p className="break-words whitespace-pre-wrap font-medium">{message.text}</p>

          {/* Time & Read Receipts */}
          <div
            className={`flex items-center justify-end gap-1 mt-1.5 text-[9px] font-medium ${
              isCurrentUser ? "text-blue-200/80" : "text-slate-400"
            }`}
          >
            <span className="font-mono">{formatTime(message.timestamp)}</span>
            {isCurrentUser && <CheckCheck size={13} className="text-blue-300" />}
          </div>
        </div>
      </div>
    </div>
  );
};
