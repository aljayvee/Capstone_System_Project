import React from "react";
import { User, Headphones } from "lucide-react";

/**
 * Someone is composing a reply.
 *
 * Matched to the customer bubble in ChatBubble so the placeholder occupies the
 * same shape the message will: same avatar, same radius, same ground. It used
 * a different radius, a different avatar shape and a fourth shadow level, so
 * the thread visibly shifted when the real message arrived.
 */
interface TypingIndicatorProps {
  name?: string;
  role?: "customer" | "dispatcher";
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  name = "Customer",
  role = "customer",
}) => {
  return (
    <div
      className="my-2 mr-auto flex max-w-[88%] flex-row items-end gap-2.5 animate-in fade-in duration-200"
      data-testid="dispatcher-chat-typing-indicator"
    >
      <div
        className="grid size-7 shrink-0 place-items-center rounded-full bg-board-ground text-ink-muted"
        title={name}
      >
        {role === "customer" ? <User size={14} /> : <Headphones size={14} />}
      </div>

      <div className="flex flex-col items-start">
        <span className="mb-1 px-1 text-micro uppercase text-ink-muted">{name} is typing</span>

        <div className="flex items-center gap-1.5 rounded-plate rounded-bl-xs border border-edge bg-board-plate px-3 py-2.5">
          {[0, 180, 360].map((delay) => (
            <span
              key={delay}
              className="size-1.5 rounded-full bg-board-trim animate-typing-dot"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
