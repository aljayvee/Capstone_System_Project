import React, { useEffect } from "react";
import { Bike, X, ArrowRight } from "lucide-react";
import type { RiderChatAlertToast } from "../hooks/useRiderChatAlerts";

interface RiderChatToastContainerProps {
  toasts: RiderChatAlertToast[];
  onDismiss: (toastId: string) => void;
  onOpenRiderChat: (riderId: string) => void;
}

interface ToastCardProps {
  toast: RiderChatAlertToast;
  onDismiss: (toastId: string) => void;
  onOpenRiderChat: (riderId: string) => void;
}

const RiderToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss, onOpenRiderChat }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 8000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const handleOpen = () => {
    onDismiss(toast.id);
    onOpenRiderChat(toast.riderId);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      onClick={handleOpen}
      className="pointer-events-auto flex flex-col gap-2 rounded-xl border border-sky-500/40 bg-[#0F2035] p-3.5 shadow-2xl text-white transition-all duration-200 cursor-pointer hover:border-sky-400/60"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Bike size={15} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">
              {toast.riderName}
            </p>
            <p className="font-mono text-[10px] text-sky-300/80">
              Rider Message
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(toast.id);
          }}
          aria-label="Dismiss alert"
          className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      <p className="text-xs text-slate-200 line-clamp-2 pl-9">
        {toast.messageText}
      </p>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10 pl-9">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpen();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
        >
          <span>Reply to Rider</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};

export const RiderChatToastContainer: React.FC<RiderChatToastContainerProps> = ({
  toasts,
  onDismiss,
  onOpenRiderChat,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Rider message notifications"
      className="fixed top-28 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <RiderToastCard
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onOpenRiderChat={onOpenRiderChat}
        />
      ))}
    </div>
  );
};

export default RiderChatToastContainer;
