import React, { useEffect } from "react";
import { MessageCircle, X, ArrowRight } from "lucide-react";
import { formatErrandId } from "../../../utils/formatErrandId";
import type { ChatAlertToast } from "../hooks/useCustomerChatAlerts";

interface CustomerChatToastContainerProps {
  toasts: ChatAlertToast[];
  onDismiss: (toastId: string) => void;
  onOpenChat: (errandId: string) => void;
}

interface ToastCardProps {
  toast: ChatAlertToast;
  onDismiss: (toastId: string) => void;
  onOpenChat: (errandId: string) => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss, onOpenChat }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 8000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const handleOpen = () => {
    onDismiss(toast.id);
    onOpenChat(toast.errandId);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      onClick={handleOpen}
      className="pointer-events-auto flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-[#0F2035] p-3.5 shadow-2xl text-white transition-all duration-200 cursor-pointer hover:border-amber-400/60"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <MessageCircle size={15} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">
              {toast.customerName}
            </p>
            <p className="font-mono text-[10px] text-amber-300/80">
              {formatErrandId(toast.errandId)}
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
        >
          <span>Open Chat</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};

export const CustomerChatToastContainer: React.FC<CustomerChatToastContainerProps> = ({
  toasts,
  onDismiss,
  onOpenChat,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Customer message notifications"
      className="fixed top-16 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onOpenChat={onOpenChat}
        />
      ))}
    </div>
  );
};
