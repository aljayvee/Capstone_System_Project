import * as React from "react";
import { Check, ChevronRight, Hourglass, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "./copy";
import type { Stage, StageId } from "./types";

/**
 * The stage rail and the stage panel are one accordion, not two regions.
 *
 * The screen this replaces had three competing ways to move between the same
 * four steps — capsules along the top, an "Overview (All) | Focus Step #n"
 * toggle, and Back/Continue pairs at the foot of each card — and defaulted to
 * showing every card expanded at once. Here there is one model: click a row.
 *
 * Finished stages keep their summary and stay re-openable, so nothing is lost
 * by completing them. "Show all steps" is the escape hatch for dispatchers who
 * want the whole picture, and it remembers the choice.
 */

const SHOW_ALL_KEY = "sugo_dispatcher_stages_show_all";

interface StageListProps {
  stages: Stage[];
  openId: StageId | null;
  onToggle: (id: StageId) => void;
  showAll: boolean;
  onShowAllChange: (next: boolean) => void;
  /** Body for each stage, keyed by id. Only rendered when open. */
  renderStage: (id: StageId) => React.ReactNode;
  /** Stage briefly highlighted after a blocked action redirected here. */
  flashId: StageId | null;
  /**
   * Why we were sent here, and to which stage. Pointing somewhere without
   * saying why is half a fix, so this outlives the highlight.
   */
  jumpReason?: { stage: StageId; text: string } | null;
  readOnly?: boolean;
}

export function readStoredShowAll(): boolean {
  try {
    return localStorage.getItem(SHOW_ALL_KEY) === "1";
  } catch {
    return false;
  }
}

export function storeShowAll(next: boolean) {
  try {
    localStorage.setItem(SHOW_ALL_KEY, next ? "1" : "0");
  } catch {
    /* private mode — the preference simply doesn't persist */
  }
}

function Marker({ stage }: { stage: Stage }) {
  const base =
    "w-6 h-6 rounded-full grid place-items-center shrink-0 text-[11px] font-black font-mono";
  if (stage.state === "done") {
    return (
      <span className={cn(base, "bg-emerald-600 text-white")}>
        <Check size={13} strokeWidth={3} />
      </span>
    );
  }
  if (stage.state === "active") {
    return <span className={cn(base, "bg-dispatcher-navy text-white")}>{stage.id}</span>;
  }
  return (
    <span className={cn(base, "bg-slate-100 text-slate-400 border border-slate-200")}>
      {stage.id}
    </span>
  );
}

export function StageList({
  stages,
  openId,
  onToggle,
  showAll,
  onShowAllChange,
  renderStage,
  flashId,
  jumpReason,
  readOnly = false,
}: StageListProps) {
  return (
    <div className="flex flex-col gap-2">
      {stages.map((stage) => {
        const isOpen = showAll || openId === stage.id;
        const isWaiting = stage.turn === "customer";

        return (
          <div
            key={stage.id}
            id={`stage-${stage.id}`}
            className={cn(
              "bg-white border rounded-2xl overflow-hidden transition-[border-color,box-shadow]",
              stage.state === "active" ? "border-dispatcher-navy" : "border-slate-200",
              stage.state === "active" && "shadow-xs",
              flashId === stage.id && "ring-4 ring-amber-400/50 border-amber-400"
            )}
          >
            <button
              type="button"
              onClick={() => onToggle(stage.id)}
              aria-expanded={isOpen}
              aria-controls={`stage-body-${stage.id}`}
              className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-slate-50 transition cursor-pointer"
            >
              <Marker stage={stage} />

              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-xs font-extrabold tracking-tight truncate",
                    stage.state === "todo" ? "text-slate-500" : "text-slate-900"
                  )}
                >
                  {stage.label}
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-medium truncate mt-0.5",
                    stage.state === "done"
                      ? "text-emerald-700 font-semibold"
                      : isWaiting
                      ? "text-amber-800 font-bold"
                      : "text-slate-400"
                  )}
                >
                  {isWaiting && <Hourglass size={11} className="shrink-0" />}
                  {stage.statusLine}
                </span>
              </span>

              <ChevronRight
                size={14}
                className={cn(
                  "text-slate-300 shrink-0 transition-transform",
                  isOpen && "rotate-90"
                )}
              />
            </button>

            {isOpen && (
              <div
                id={`stage-body-${stage.id}`}
                className="px-3.5 pb-3.5 pt-3.5 border-t border-slate-100"
              >
                {jumpReason?.stage === stage.id && (
                  <p
                    role="alert"
                    className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 mt-0 mb-3"
                  >
                    {jumpReason.text}
                  </p>
                )}
                {renderStage(stage.id)}
              </div>
            )}
          </div>
        );
      })}

      {!readOnly && (
        <button
          type="button"
          onClick={() => onShowAllChange(!showAll)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-300 text-[11px] font-bold text-slate-400 hover:border-dispatcher-navy hover:text-dispatcher-navy transition cursor-pointer"
        >
          {showAll ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
          {showAll ? copy.showOneStep : copy.showAllSteps}
        </button>
      )}
    </div>
  );
}
