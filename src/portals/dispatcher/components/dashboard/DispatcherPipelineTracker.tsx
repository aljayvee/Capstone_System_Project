import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, Store, ShoppingBag, Bike, ClipboardCheck } from "lucide-react";

interface DispatcherPipelineTrackerProps {
  pipeline: {
    claimed: number;
    toStore: number;
    bought: number;
    onTheWay: number;
    delivered: number;
  };
  onNavigateTab: (tab: string) => void;
}

const PHASES = [
  {
    key: "claimed",
    label: "Under Review",
    stepNumber: "01",
    icon: <ClipboardCheck size={14} />,
  },
  {
    key: "toStore",
    label: "To Store",
    stepNumber: "02",
    icon: <Store size={14} />,
  },
  {
    key: "bought",
    label: "Items Bought",
    stepNumber: "03",
    icon: <ShoppingBag size={14} />,
  },
  {
    key: "onTheWay",
    label: "On the Way",
    stepNumber: "04",
    icon: <Bike size={14} />,
  },
  {
    key: "delivered",
    label: "Delivered Today",
    stepNumber: "05",
    icon: <CheckCircle2 size={14} />,
  },
] as const;

export const DispatcherPipelineTracker: React.FC<DispatcherPipelineTrackerProps> = ({
  pipeline,
  onNavigateTab,
}) => {
  return (
    <div className="bg-board-plate border border-edge rounded-plate p-4 shadow-plate">
      <div className="flex items-center justify-between pb-3 border-b border-hairline mb-3">
        <div>
          <h2 className="text-label uppercase tracking-[0.06em] font-bold text-ink">
            Errand Progress
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {PHASES.map((phase, idx) => {
          const count = pipeline[phase.key as keyof typeof pipeline] || 0;
          const isActive = count > 0;
          const isFinal = phase.key === "delivered";

          return (
            <button
              key={phase.key}
              type="button"
              onClick={() => onNavigateTab(isFinal ? "history" : "active_errands")}
              className={cn(
                "flex flex-col justify-between p-3 rounded-trim border text-left transition-all cursor-pointer group",
                isActive
                  ? "bg-board-ground/60 border-hairline hover:border-board-trim hover:shadow-xs"
                  : "bg-board-ground/20 border-hairline/60 opacity-60 hover:opacity-100"
              )}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="font-mono text-micro text-ink-muted font-bold tracking-wider">
                  {phase.stepNumber}
                </span>
                <span
                  className={cn(
                    "size-6 rounded-full flex items-center justify-center transition-colors",
                    isActive
                      ? isFinal
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-board-field/15 text-board-field"
                      : "bg-board-ground text-ink-muted"
                  )}
                >
                  {phase.icon}
                </span>
              </div>

              <div>
                <p
                  data-figure
                  className={cn(
                    "font-mono text-title font-bold tabular-nums",
                    isActive
                      ? isFinal
                        ? "text-emerald-700"
                        : "text-ink"
                      : "text-ink-muted"
                  )}
                >
                  {count}
                </p>
                <p className="text-label font-bold text-ink truncate mt-0.5">
                  {phase.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
