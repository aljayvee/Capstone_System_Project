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

const VARIANT_CLASSES = {
  success: "text-emerald-600 bg-emerald-50 border-emerald-200",
  error: "text-rose-600 bg-rose-50 border-rose-200",
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
        "text-xs text-center font-bold animate-fade-in py-1.5 rounded-lg border flex items-center justify-center gap-1.5",
        VARIANT_CLASSES[message.variant]
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

  const showSuccess = React.useCallback((text: string) => setMessage({ text, variant: "success" }), []);
  const showError = React.useCallback((text: string) => setMessage({ text, variant: "error" }), []);
  const dismiss = React.useCallback(() => setMessage(null), []);

  return { message, showSuccess, showError, dismiss };
}
