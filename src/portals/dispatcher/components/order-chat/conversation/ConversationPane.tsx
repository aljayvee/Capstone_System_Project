import * as React from "react";
import { Loader2, MessageSquare, MapPin, Send, Lock } from "lucide-react";
import { ChatBubble } from "../../../../../components/chat/ChatBubble";
import { TypingIndicator } from "../../../../../components/chat/TypingIndicator";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { copy } from "../copy";
import type { OrderChatMessage } from "../types";

/**
 * The customer conversation, beside the stages it is about.
 *
 * Route board build. This file held the console-wide palette breach: the
 * customer monogram was `bg-gradient-to-br from-blue-500 to-indigo-600`, which
 * is a gradient (banned outright) in indigo (not in the palette at all) on the
 * one element that identifies the person the whole order is for. The monogram
 * is now painted on the field, which is what every other identity mark on this
 * surface sits on.
 *
 * Three more things went with it. The empty state put a 26px icon inside a
 * 56px tinted rounded square, which is the icon chip the craft floor refuses.
 * Presence was emerald text on white at roughly 3.3:1. And five controls
 * carried `active:scale-95`, so the surface flinched under the pointer.
 */

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
      {/* who you are talking to */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-hairline bg-board-plate px-3 py-2.5">
        <div
          data-on-field
          className="grid size-9 shrink-0 place-items-center rounded-full bg-board-field text-label text-board-plate"
        >
          {customerName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-label text-ink">{customerName}</p>
          {customerOnline ? (
            <p className="m-0 flex items-center gap-1.5 text-body text-status-done-ink">
              <span aria-hidden className="size-1.5 rounded-full bg-status-done-ink" />
              {copy.activeNow}
            </p>
          ) : (
            <p className="m-0 flex items-center gap-1.5 text-body text-ink-muted">
              <span aria-hidden className="size-1.5 rounded-full bg-board-trim" />
              {copy.offline}
            </p>
          )}
        </div>
        <DispatcherButton
          type="button"
          size="sm"
          variant="secondary"
          className="shrink-0"
          icon={<MapPin size={14} />}
          onClick={onViewLocation}
        >
          {copy.dropOff}
        </DispatcherButton>
      </div>

      {/* the thread */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-board-ground p-3">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-muted">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-body">Loading the conversation</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <MessageSquare size={24} className="text-board-trim" />
            <p className="m-0 text-panel text-ink">
              {copy.emptyFeedTitle(customerFirstName)}
            </p>
            <p className="m-0 max-w-xs text-body text-ink-muted">{copy.emptyFeedBody}</p>
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
        <div className="flex shrink-0 items-center justify-center gap-1.5 border-t border-hairline bg-status-closed-fill p-3 text-label text-status-closed-ink">
          <Lock size={14} />
          {copy.closedConversation}
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-hairline bg-board-ground px-3 py-2">
            {copy.quickReplies(customerFirstName).map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onPrefill(chip)}
                className="min-h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-edge bg-board-plate px-3 text-body text-ink-muted transition-colors hover:border-board-field hover:text-ink"
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            onSubmit={onSend}
            className="flex shrink-0 items-end gap-2 border-t border-hairline bg-board-plate p-3"
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
              // No per-field focus glow: the console has one themed
              // :focus-visible outline in surfaces.css and this inherits it.
              className="min-h-10 max-h-[120px] min-w-0 flex-1 resize-none rounded-plate border border-edge bg-board-ground px-3 py-2 text-body text-ink placeholder:text-ink-muted transition-colors focus:border-board-field focus:bg-board-plate"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              aria-label={copy.send}
              className="flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-plate bg-signal px-3 text-label text-white transition-colors hover:bg-signal-deep disabled:cursor-not-allowed disabled:bg-status-closed-fill disabled:text-status-closed-ink"
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
