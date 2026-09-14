import * as React from "react";
import { Loader2, MessageSquare, MapPin, Send, Lock } from "lucide-react";
import { ChatBubble } from "../../../../../components/chat/ChatBubble";
import { TypingIndicator } from "../../../../../components/chat/TypingIndicator";
import { copy } from "../copy";
import type { OrderChatMessage } from "../types";

interface ConversationPaneProps {
  messages: OrderChatMessage[];
  isLoading: boolean;
  customerName: string;
  customerFirstName: string;
  customerOnline: boolean;
  dispatcherFirstName: string;
  isCustomerTyping: boolean;
  customerTypingName: string;
  inputText: string;
  onInputChange: (text: string) => void;
  onSend: (e?: React.FormEvent) => void;
  onStopTyping: () => void;
  onPrefill: (text: string) => void;
  onViewLocation: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  readOnly: boolean;
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function ConversationPane({
  messages,
  isLoading,
  customerName,
  customerFirstName,
  customerOnline,
  dispatcherFirstName,
  isCustomerTyping,
  customerTypingName,
  inputText,
  onInputChange,
  onSend,
  onStopTyping,
  onPrefill,
  onViewLocation,
  messagesEndRef,
  readOnly,
  composerRef,
}: ConversationPaneProps) {
  return (
    <>
      {/* who you're talking to */}
      <div className="shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black grid place-items-center text-xs shrink-0">
          {customerName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-slate-800 truncate m-0">{customerName}</p>
          {customerOnline ? (
            <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 m-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {copy.activeNow}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 m-0">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              {copy.offline}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onViewLocation}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-800 transition active:scale-95 cursor-pointer"
        >
          <MapPin size={12} className="text-emerald-600" />
          {copy.dropOff}
        </button>
      </div>

      {/* the thread */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 bg-[#F8FAFC]">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
            <Loader2 size={22} className="animate-spin text-blue-600" />
            <span>Loading the conversation…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-2.5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 grid place-items-center text-blue-600">
              <MessageSquare size={26} />
            </div>
            <p className="text-sm font-extrabold text-slate-800 m-0">
              {copy.emptyFeedTitle(customerFirstName)}
            </p>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed m-0">
              {copy.emptyFeedBody}
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <ChatBubble
              key={m.id}
              message={m as any}
              isCurrentUser={m.role === "dispatcher"}
              currentUserFirstName={dispatcherFirstName}
            />
          ))
        )}
        {isCustomerTyping && (
          <TypingIndicator name={customerTypingName || customerFirstName} role="customer" />
        )}
        <div ref={messagesEndRef} />
      </div>

      {readOnly ? (
        <div className="shrink-0 p-3.5 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5">
          <Lock size={13} />
          {copy.closedConversation}
        </div>
      ) : (
        <>
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-100/90 border-t border-slate-200 overflow-x-auto">
            {copy.quickReplies(customerFirstName).map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onPrefill(chip)}
                className="shrink-0 bg-white hover:bg-blue-50 hover:text-blue-900 hover:border-blue-300 text-slate-700 text-[11px] px-3 py-1 rounded-full border border-slate-200 font-medium transition active:scale-95 cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            onSubmit={onSend}
            className="shrink-0 p-3 bg-white border-t border-slate-200 flex items-end gap-2"
          >
            <textarea
              ref={composerRef}
              rows={1}
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (inputText.trim()) onSend();
                }
              }}
              onBlur={onStopTyping}
              placeholder={copy.composerPlaceholder(customerFirstName)}
              aria-label={copy.composerPlaceholder(customerFirstName)}
              className="flex-1 min-w-0 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-dispatcher-navy/20 focus:border-dispatcher-navy transition resize-none min-h-[42px] max-h-[120px]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              aria-label={copy.send}
              className="shrink-0 h-[42px] bg-dispatcher-navy hover:bg-dispatcher-navy-dark disabled:bg-slate-200 disabled:text-slate-500 text-white px-3.5 rounded-xl transition flex items-center gap-1.5 font-bold text-[13px] active:scale-95 disabled:active:scale-100 cursor-pointer disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">{copy.send}</span>
              <Send size={15} />
            </button>
          </form>
        </>
      )}
    </>
  );
}
