import { Eye, Hourglass, Check, AlertTriangle, Lock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import type { NowBarModel, NowAction, NowTone } from "./types";

/**
 * One sentence, always on screen, saying whose turn it is.
 *
 * This is the piece the previous design had no equivalent of. Dispatch work is
 * interrupt-driven: someone is pulled away mid-order and comes back cold, and
 * the only question that matters is "am I waiting on them, or are they waiting
 * on me?" That was previously spread across four indicators that could
 * disagree; here it is one line, and the colour answers it before the words do.
 *
 * Route board build. The tones were five hand-picked Tailwind tint pairs
 * (blue-50/blue-200/blue-900, amber, emerald, rose, slate) with no relationship
 * to any status shown elsewhere in the console, so the same waiting state was
 * amber here and a different amber on the board. They are now the console's
 * five status pairs, which means this band and a status chip cannot disagree.
 *
 * `you` is the exception and it is deliberate. Your turn is not a tint of
 * anything: it is the board addressing you, so it takes the navy field itself.
 * That also keeps the signal red for `problem`, which is the one tone that
 * genuinely means "you must act on something that has gone wrong" — a
 * permanently red band would have spent the red on the most ordinary state in
 * the flow and left nothing to escalate with.
 */

interface Tone {
  band: string;
  text: string;
  /** Set on the navy tone so the focus ring and selection invert. */
  onField?: boolean;
}

const TONES: Record<NowTone, Tone> = {
  you: { band: "bg-board-field", text: "text-board-plate", onField: true },
  waiting: { band: "bg-status-waiting-fill", text: "text-status-waiting-ink" },
  ready: { band: "bg-status-done-fill", text: "text-status-done-ink" },
  problem: { band: "bg-status-act-fill", text: "text-status-act-ink" },
  closed: { band: "bg-status-closed-fill", text: "text-status-closed-ink" },
};

function ToneMark({ tone, waitingOnMap }: { tone: NowTone; waitingOnMap: boolean }) {
  const size = 16;
  if (tone === "waiting") return <Hourglass size={size} />;
  if (tone === "ready") return <Check size={size} />;
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
  const t = TONES[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      data-on-field={t.onField ? "" : undefined}
      className={cn(
        "shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-5",
        t.band,
        t.text
      )}
    >
      {/* A bare mark. It used to sit in a 28px tinted rounded square, which is
          the icon chip the craft floor refuses, repeated on the one element
          that is on screen for the entire order. */}
      <span className="shrink-0">
        <ToneMark tone={tone} waitingOnMap={isPinStage} />
      </span>

      <p className="m-0 min-w-0 flex-1 text-label">
        {sentence}
        {meta ? <span className="font-normal opacity-75">{meta}</span> : null}
      </p>

      {actions.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {actions.map((action) => (
            <DispatcherButton
              key={action.label}
              type="button"
              size="sm"
              variant={action.kind === "primary" ? "primary" : "secondary"}
              onClick={() => onAction(action)}
            >
              {action.label}
            </DispatcherButton>
          ))}
        </div>
      )}
    </div>
  );
}
