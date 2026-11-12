import React, { useEffect } from "react";
import { TrafficCone, X } from "lucide-react";

export interface LiveEditNoticeModalProps {
  isOpen?: boolean;
  portal?: string;
  header?: string;
  message?: string;
  footnote?: string;
  customColor?: string;
  onDismiss?: () => void;
  onPermanentDismiss?: () => void;
}

export const LiveEditNoticeModal: React.FC<LiveEditNoticeModalProps> = ({
  isOpen = true,
  header,
  message,
  footnote,
  customColor,
  onDismiss,
  onPermanentDismiss,
}) => {
  // Handle ESC key press for frictionless dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  const displayHeader = header || "Heads up: we edit in production";
  const displayMessage =
    message ||
    "If a button moves, a colour changes, or something looks different from five minutes ago, that's us. Your ride is still safe. Our code is just getting a glow-up in public.";
  const displayFootnote = footnote || "Please enjoy the construction cones.";

  const primaryAccent = customColor || "#DC2626";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-edit-notice-title"
      aria-describedby="live-edit-notice-desc"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-150 select-none"
      onClick={(e) => {
        // Dismiss if clicking backdrop directly
        if (e.target === e.currentTarget) {
          onDismiss?.();
        }
      }}
    >
      <div className="w-full max-w-md bg-[#0B132B] border border-slate-800 rounded-2xl p-6 sm:p-7 text-center relative overflow-hidden flex flex-col items-center">
        {/* Top Accent Stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: primaryAccent }}
        />

        {/* Close Button (>= 48x48dp target for accessibility) */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close advisory notice"
          className="absolute top-2.5 right-2.5 min-w-[48px] min-h-[48px] rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Circular Traffic Cone Badge (Bold Red Badge from Reference) */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4 text-white shrink-0"
          style={{ backgroundColor: primaryAccent }}
        >
          <TrafficCone className="w-7 h-7 text-white stroke-[2.2]" />
        </div>

        {/* Headline */}
        <h2
          id="live-edit-notice-title"
          className="text-lg sm:text-xl font-bold text-white tracking-tight mb-2.5"
        >
          {displayHeader}
        </h2>

        {/* Body Copy (WCAG AA >= 4.5:1 contrast) */}
        <p
          id="live-edit-notice-desc"
          className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-6 max-w-sm"
        >
          {displayMessage}
        </p>

        {/* Primary Action Button (>= 48dp ergonomic touch target) */}
        <button
          type="button"
          onClick={onDismiss}
          style={{ backgroundColor: primaryAccent }}
          className="w-full min-h-[48px] py-3 px-4 rounded-xl font-semibold text-sm text-white hover:opacity-90 active:scale-[0.99] transition-opacity focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer flex items-center justify-center"
        >
          Fair enough, carry on
        </button>

        {/* Secondary Dismissal Link */}
        {onPermanentDismiss && (
          <button
            type="button"
            onClick={onPermanentDismiss}
            className="min-h-[44px] mt-2 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer py-2 px-3 underline-offset-4 hover:underline flex items-center justify-center"
          >
            Don't show me this again
          </button>
        )}

        {/* Footnote */}
        {displayFootnote && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 w-full text-[11px] font-mono text-slate-400 text-center">
            {displayFootnote}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveEditNoticeModal;
