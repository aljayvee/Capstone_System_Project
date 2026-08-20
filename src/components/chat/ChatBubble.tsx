import { CheckCheck, MapPin, Bike, User, ShieldCheck, ClipboardCheck, Store, Receipt, CheckCircle2, Clock } from "lucide-react";

export interface ChatMessageData {
  id: string;
  senderId: string;
  senderName: string;
  role: "customer" | "dispatcher" | "system" | "rider";
  type?: "text" | "pinpoints" | "payment_prompt" | "order_confirmation";
  text: string;
  pinpoints?: Array<{ storeName: string; latitude: number; longitude: number }>;
  items?: Array<{ itemName: string; storeCategory?: string; quantity: number }>;
  groupedItems?: Record<string, Array<{ itemName: string; quantity: number; priceNote?: string }>>;
  deliveryFee?: number;
  totalCost?: number;
  confirmed?: boolean;
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

  // Interactive Store-Grouped Order Confirmation Card
  if (message.type === "order_confirmation") {
    const grouped = message.groupedItems || {};
    const storeKeys = Object.keys(grouped);

    return (
      <div className="my-3 mx-auto w-full max-w-[95%]">
        <div className="bg-white rounded-2xl border-2 border-[#1E3A5F] shadow-lg overflow-hidden text-slate-800 text-xs">
          <div className="bg-[#1E3A5F] text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-blue-500/30 text-blue-200">
                <ClipboardCheck size={16} />
              </span>
              <div>
                <h4 className="font-extrabold text-xs tracking-wide">ORDER CONFIRMATION CARD</h4>
                <p className="text-[10px] text-blue-200/80">Store-Grouped Breakdown & Upfront Pricing</p>
              </div>
            </div>
            {message.confirmed ? (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 size={11} /> Approved ✓
              </span>
            ) : (
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Clock size={11} /> Awaiting Customer
              </span>
            )}
          </div>

          <div className="p-3.5 space-y-3">
            {storeKeys.length === 0 ? (
              <div className="space-y-1.5">
                {(message.items || []).map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-none">
                    <span className="font-medium text-slate-800">{it.itemName} <strong className="text-slate-500">x{it.quantity}</strong></span>
                    <span className="text-[10px] text-slate-500 italic">Actual receipt upon purchase</span>
                  </div>
                ))}
              </div>
            ) : (
              storeKeys.map((storeName, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#1E3A5F] border-b border-slate-200 pb-1">
                    <Store size={13} className="text-red-600" />
                    <span>{storeName}</span>
                  </div>
                  <div className="space-y-1 pl-1">
                    {grouped[storeName].map((it, itemIdx) => (
                      <div key={itemIdx} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 font-medium">
                          • {it.itemName} <strong className="text-slate-900 font-bold">x{it.quantity}</strong>
                        </span>
                        <span className="text-[10px] text-slate-500 italic">
                          {it.priceNote || "Actual store receipt upon purchase"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-blue-900">
                <Receipt size={14} className="text-blue-700" />
                <span className="font-bold text-xs">Exact Delivery Fee (Upfront):</span>
              </div>
              <span className="font-black text-sm text-[#1E3A5F]">
                ₱{Number(message.deliveryFee || 50).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSystemMsg = message.role === "system" || message.text.startsWith("📍") || message.text.startsWith("🛵");

  // System Announcement / Pinpoint Broadcast Bubble Card
  if (isSystemMsg) {
    return (
      <div className="my-3 mx-auto w-full max-w-[92%]">
        <div className="bg-gradient-to-r from-slate-900 to-[#1E3A5F] text-white p-3.5 rounded-2xl shadow-md border border-blue-400/20 text-xs space-y-2">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            {message.text.startsWith("📍") ? (
              <span className="w-6 h-6 rounded-lg bg-blue-500/30 text-blue-300 flex items-center justify-center shrink-0">
                <MapPin size={14} />
              </span>
            ) : (
              <span className="w-6 h-6 rounded-lg bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0">
                <Bike size={14} />
              </span>
            )}
            <span className="font-bold tracking-wide text-blue-100 uppercase text-[10px]">
              {message.text.startsWith("📍") ? "Store Location Dispatch Update" : "Errand Status Notification"}
            </span>
            <span className="ml-auto text-[10px] text-blue-200/70 font-mono">
              {formatTime(message.timestamp)}
            </span>
          </div>
          <p className="text-slate-100 leading-relaxed text-xs">{message.text}</p>
        </div>
      </div>
    );
  }

  const senderInitial = (message.senderName || "U").charAt(0).toUpperCase();

  return (
    <div
      className={`flex items-end gap-2 my-1.5 max-w-[85%] ${
        isCurrentUser ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
      }`}
    >
      {/* Avatar Pill */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${
          isCurrentUser
            ? "bg-[#1E3A5F] text-white ring-2 ring-blue-400/20"
            : "bg-slate-200 text-slate-700 ring-2 ring-slate-300/50"
        }`}
        title={message.senderName}
      >
        {isCurrentUser ? (
          <ShieldCheck size={14} className="text-white" />
        ) : (
          <User size={14} className="text-slate-600" />
        )}
      </div>

      {/* Message Content Container */}
      <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
        {/* Sender Name & Role Subhead */}
        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-semibold text-slate-400">
          <span>{isCurrentUser ? `${currentUserFirstName || "Dispatcher"} (You)` : message.senderName || "Customer"}</span>
        </div>

        {/* Tailored Speech Bubble */}
        <div
          className={`relative px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm transition-all ${
            isCurrentUser
              ? "bg-[#1E3A5F] text-white rounded-2xl rounded-tr-xs"
              : "bg-white text-slate-800 border border-slate-200/90 rounded-2xl rounded-tl-xs"
          }`}
        >
          <p className="break-words whitespace-pre-wrap">{message.text}</p>

          {/* Time & Read Receipts */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-[9px] font-medium ${
              isCurrentUser ? "text-blue-200/80" : "text-slate-400"
            }`}
          >
            <span>{formatTime(message.timestamp)}</span>
            {isCurrentUser && <CheckCheck size={12} className="text-blue-300" />}
          </div>
        </div>
      </div>
    </div>
  );
};
