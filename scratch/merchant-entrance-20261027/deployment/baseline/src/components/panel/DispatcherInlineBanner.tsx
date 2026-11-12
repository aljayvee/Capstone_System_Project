import * as React from "react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * In-context feedback anchored to the action that triggered it.
 *
 * Extracts the one thing `DispatcherChatPanel.tsx` already did right —
 * Step 1's `pinMessage`, a green success pill that auto-clears after 4s —
 * into something reusable, and gives it the error variant it never had.
 * Steps 2-4 either had no equivalent or a broken one (Step 2's own
 * `itemsSaveMessage` was set but never rendered anywhere).
 *
 * Success auto-dismisses; error persists until the caller clears it (a
 * failure a dispatcher doesn't get to read is the same as no message at all).
 */

export interface InlineMessage {
  text: string;
  variant: "success" | "error";
}

const AUTO_DISMISS_MS = 4000;

// Both pairings are token pairs from the status law, computed above 4.5:1.
// The old success pairing (text-emerald-600 on bg-emerald-50) measured about
// 3.3:1, so the confirmation a dispatcher most needed to read was the hardest
// one to read.
const VARIANT_CLASSES = {
  success: "bg-status-done-fill text-status-done-ink",
  error: "bg-status-act-fill text-status-act-ink",
} as const;

interface DispatcherInlineBannerProps {
  message: InlineMessage | null;
  onDismiss: () => void;
}

export function DispatcherInlineBanner({ message, onDismiss }: DispatcherInlineBannerProps) {
  React.useEffect(() => {
    if (message?.variant !== "success") return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <p
      role={message.variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-plate px-3 py-2 text-label animate-fade-in",
        VARIANT_CLASSES[message.variant],
      )}
    >
      {message.variant === "error" && <AlertCircle size={13} className="shrink-0" />}
      <span className="flex-1">{message.text}</span>
      {message.variant === "error" && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 hover:opacity-70 transition"
        >
          <X size={13} />
        </button>
      )}
    </p>
  );
}

/** Convenience hook: state + setters, so callers don't hand-roll the same pair. */
export function useInlineMessage() {
  const [message, setMessage] = React.useState<InlineMessage | null>(null);

  const showSuccess = React.useCallback(
    (text: string) => setMessage({ text, variant: "success" }),
    [],
  );
  const showError = React.useCallback((text: string) => setMessage({ text, variant: "error" }), []);
  const dismiss = React.useCallback(() => setMessage(null), []);

  return { message, showSuccess, showError, dismiss };
}
