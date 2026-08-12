import React from "react";
import { CheckCheck, MapPin, Bike, User, ShieldCheck } from "lucide-react";

export interface ChatMessageData {
  id: string;
  senderId: string;
  senderName: string;
  role: "customer" | "dispatcher" | "system" | "rider";
  text: string;
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
