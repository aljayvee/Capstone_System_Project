import * as React from "react";
import { Check, Receipt, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Stage, StageId } from "./types";

/**
 * A stamped detent: filled once passed, hollow while ahead.
 * Strictly reusing the existing design from StageList.
 */
export function Detent({ stage, onField }: { stage: Stage; onField: boolean }) {
  const base = "grid size-6 shrink-0 place-items-center rounded-full text-micro font-medium";

  if (stage.state === "done") {
    return (
      <span
        className={cn(
          base,
          onField ? "bg-board-plate text-board-field" : "bg-status-done-ink text-board-plate"
        )}
      >
        <Check size={13} />
      </span>
    );
  }
  if (stage.state === "active") {
    return (
      <span
        data-figure
        className={cn(
          base,
          onField ? "bg-board-plate text-board-field" : "bg-board-field text-board-plate"
        )}
      >
        {stage.id}
      </span>
    );
  }
  return (
    <span
      data-figure
      className={cn(
        base,
        onField
          ? "border-[1.5px] border-board-trim text-board-trim"
          : "border-[1.5px] border-board-trim text-ink-muted"
      )}
    >
      {stage.id}
    </span>
  );
}

export interface StageStepsRailProps {
  stages: Stage[];
  activeId: StageId;
  onSelect: (id: StageId) => void;
  flashId: StageId | null;
  readOnly?: boolean;
  hasLedger?: boolean;
  onOpenProof?: () => void;
  arrowDirection?: "left" | "right";
}

export function StageStepsRail({
  stages,
  activeId,
  onSelect,
  flashId,
  readOnly = false,
  hasLedger = false,
  onOpenProof,
  arrowDirection = "right",
}: StageStepsRailProps) {
  const doneCount = stages.filter((s) => s.state === "done").length;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-board-plate">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-hairline px-3.5 py-3">
        <h3 className="text-micro font-bold uppercase tracking-wider text-ink-muted">
          Order Stages
        </h3>
        <span data-figure className="font-mono text-micro text-ink-muted">
          {doneCount} / {stages.length} done
        </span>
      </div>

      {/* Vertical list of Steps 1 to 6 (positioned from upper Step 1 down to Step 6) */}
      <div className="flex-1 overflow-y-auto p-3">
        <ol className="flex flex-col gap-2">
          {stages.map((stage) => {
            const isActive = stage.id === activeId;
            const isFlashed = flashId === stage.id;
            const isLocked = !readOnly && stage.state === "todo";

            return (
              <li key={stage.id} id={`stage-rail-${stage.id}`} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (isLocked) return;
                    onSelect(stage.id);
                  }}
                  disabled={isLocked}
                  aria-current={isActive ? "step" : undefined}
                  title={isLocked ? "Complete previous steps first" : undefined}
                  className={cn(
                    "group relative flex w-full items-center gap-2.5 rounded-plate border p-2.5 text-left transition-colors",
                    isActive
                      ? "border-board-field bg-board-field text-board-plate shadow-plate"
                      : "border-edge bg-board-plate text-ink hover:bg-board-ground",
                    isLocked && "cursor-not-allowed opacity-40 bg-board-ground/50",
                    isFlashed && "ring-2 ring-signal"
                  )}
                >
                  {/* Pointing arrow on active card pointing directly to the center Task screen */}
                  {isActive && (
                    <div
                      className={cn(
                        "pointer-events-none absolute top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent",
                        arrowDirection === "left"
                          ? "-left-2 border-r-[8px] border-r-board-field"
                          : "-right-2 border-l-[8px] border-l-board-field"
                      )}
                      aria-hidden="true"
                    />
                  )}

                  {/* Stamped detent on the left */}
                  <Detent stage={stage} onField={isActive} />

                  {/* Step title & status line on the right */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          "truncate text-label font-medium",
                          isActive
                            ? "text-board-plate"
                            : stage.state === "todo"
                              ? "text-ink-muted"
                              : "text-ink"
                        )}
                      >
                        {stage.id}. {stage.label}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "truncate text-micro mt-0.5",
                        isActive ? "text-board-plate/80" : "text-ink-muted"
                      )}
                    >
                      {stage.statusLine}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Downpayment Ledger trigger at foot if errand has ledger */}
      {hasLedger && (
        <div className="shrink-0 border-t border-hairline p-3 bg-board-ground/40">
          <button
            type="button"
            onClick={onOpenProof}
            className="flex w-full cursor-pointer items-center justify-between rounded-plate border border-edge bg-board-plate px-3 py-2 text-micro uppercase text-ink transition-colors hover:bg-board-field hover:text-board-plate"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Receipt size={14} className="shrink-0" />
              Payment Proof
            </span>
            <ChevronRight size={14} className="shrink-0 opacity-60" />
          </button>
        </div>
      )}
    </div>
  );
}
