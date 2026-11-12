import * as React from "react";
import { cn } from "@/lib/utils";
import type { DashboardAttentionItem } from "@/types/errand";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { AlertCircle, Clock, ShoppingCart, MessageSquare, ArrowRight, ShieldCheck } from "lucide-react";
import { formatErrandId } from "@/utils/formatErrandId";

interface DispatcherAttentionRadarProps {
  items: DashboardAttentionItem[];
  onClaimAndSelect: (errandId: string) => void;
  onOpenChat: (errandId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const DispatcherAttentionRadar: React.FC<DispatcherAttentionRadarProps> = ({
  items,
  onClaimAndSelect,
  onOpenChat,
  onNavigateTab,
}) => {
  return (
    <div className="flex flex-col h-full bg-board-plate border border-edge rounded-plate p-4 shadow-plate">
      <div className="flex items-center justify-between pb-3 border-b border-hairline">
        <div>
          <h2 className="text-label uppercase tracking-[0.06em] font-bold text-ink">
            Needs Attention
          </h2>
        </div>
        {items.length > 0 && (
          <span className="font-mono text-micro px-2 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/20 font-bold">
            {items.length} {items.length === 1 ? "alert" : "alerts"}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pt-3 space-y-2.5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="size-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 mb-2.5">
              <ShieldCheck size={20} />
            </div>
            <p className="text-body font-semibold text-ink">No issues right now</p>
          </div>
        ) : (
          items.map((item) => {
            const isCritical = item.severity === "critical";

            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-trim border transition-colors",
                  isCritical
                    ? "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40"
                    : "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
                )}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "mt-0.5 size-7 rounded-full flex items-center justify-center shrink-0",
                      isCritical
                        ? "bg-rose-500/15 text-rose-600"
                        : "bg-amber-500/15 text-amber-600"
                    )}
                  >
                    {item.kind === "UNCLAIMED_STALE" ? (
                      <Clock size={14} />
                    ) : item.kind === "STALLED_STOP" ? (
                      <ShoppingCart size={14} />
                    ) : (
                      <AlertCircle size={14} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-micro font-bold px-1.5 py-0.5 rounded bg-board-ground text-ink">
                        {formatErrandId(item.errandId)}
                      </span>
                      <span
                        className={cn(
                          "text-label font-bold truncate",
                          isCritical ? "text-rose-700" : "text-amber-800"
                        )}
                      >
                        {item.title}
                      </span>
                    </div>
                    <p className="text-micro text-ink-muted mt-0.5 truncate">{item.detail}</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                  {item.action === "claim" && (
                    <DispatcherButton
                      variant="primary"
                      size="sm"
                      icon={<ArrowRight size={13} />}
                      onClick={() => onClaimAndSelect(item.errandId)}
                    >
                      Claim & Review
                    </DispatcherButton>
                  )}

                  {item.action === "chat" && (
                    <DispatcherButton
                      variant="field"
                      size="sm"
                      icon={<MessageSquare size={13} />}
                      onClick={() => onOpenChat(item.errandId)}
                    >
                      Open Chat
                    </DispatcherButton>
                  )}

                  {item.action === "exceptions" && (
                    <DispatcherButton
                      variant="secondary"
                      size="sm"
                      icon={<ArrowRight size={13} />}
                      onClick={() => onNavigateTab("exceptions")}
                    >
                      Resolve in Help Desk
                    </DispatcherButton>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
