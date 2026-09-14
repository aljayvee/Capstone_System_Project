import * as React from "react";
import { Eye, Hourglass, CheckCircle2, AlertTriangle, Lock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NowBarModel, NowAction, NowTone } from "./types";

/**
 * One sentence, always on screen, saying whose turn it is.
 *
 * This is the piece the previous design had no equivalent of. Dispatch work is
 * interrupt-driven: someone is pulled away mid-order and comes back cold, and
 * the only question that matters is "am I waiting on them, or are they waiting
 * on me?" That was previously spread across four indicators that could
 * disagree; here it is one line, and the colour answers it before the words do.
 */

const TONE_STYLES: Record<NowTone, string> = {
  you: "bg-blue-50 border-blue-200",
  waiting: "bg-amber-50 border-amber-200",
  ready: "bg-emerald-50 border-emerald-200",
  problem: "bg-rose-50 border-rose-200",
  closed: "bg-slate-100 border-slate-200",
};

const TONE_TEXT: Record<NowTone, string> = {
  you: "text-blue-900",
  waiting: "text-amber-900",
  ready: "text-emerald-900",
  problem: "text-rose-900",
  closed: "text-slate-600",
};

const TONE_ICON_BG: Record<NowTone, string> = {
  you: "bg-blue-100 text-blue-700",
  waiting: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  problem: "bg-rose-100 text-rose-700",
  closed: "bg-slate-200 text-slate-500",
};

function ToneIcon({ tone, waitingOnMap }: { tone: NowTone; waitingOnMap: boolean }) {
  const size = 15;
  if (tone === "waiting") return <Hourglass size={size} />;
  if (tone === "ready") return <CheckCircle2 size={size} />;
  if (tone === "problem") return <AlertTriangle size={size} />;
  if (tone === "closed") return <Lock size={size} />;
  return waitingOnMap ? <MapPin size={size} /> : <Eye size={size} />;
}

interface NowBarProps {
  model: NowBarModel;
  onAction: (action: NowAction) => void;
  /** Only affects which icon the "your turn" tone shows. */
  isPinStage?: boolean;
}

export function NowBar({ model, onAction, isPinStage = false }: NowBarProps) {
  const { tone, sentence, meta, actions } = model;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "shrink-0 flex items-center gap-3 px-4 sm:px-5 py-2.5 border-b flex-wrap",
        TONE_STYLES[tone]
      )}
    >
      <span
        className={cn(
          "w-7 h-7 rounded-lg grid place-items-center shrink-0",
          TONE_ICON_BG[tone]
        )}
      >
        <ToneIcon tone={tone} waitingOnMap={isPinStage} />
      </span>

      <p className={cn("flex-1 min-w-0 text-xs sm:text-[13px] font-bold m-0", TONE_TEXT[tone])}>
        {sentence}
        {meta ? <span className="font-medium opacity-70">{meta}</span> : null}
      </p>

      {actions.length > 0 && (
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onAction(action)}
              className={cn(
                "text-[11px] font-bold px-3 py-1.5 rounded-xl border transition active:scale-95 cursor-pointer",
                action.kind === "primary"
                  ? "bg-dispatcher-navy hover:bg-dispatcher-navy-dark text-white border-transparent shadow-xs"
                  : "bg-white hover:border-dispatcher-navy hover:text-dispatcher-navy text-slate-700 border-slate-300"
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
