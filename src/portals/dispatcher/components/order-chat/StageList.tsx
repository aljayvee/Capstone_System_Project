import { Check, Hourglass, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "./copy";
import type { Stage, StageId } from "./types";

/**
 * The five dispatch stages as one rail, with the open stage beneath it.
 *
 * The screen this replaces had three competing ways to move between the same
 * four steps — capsules along the top, an "Overview (All) | Focus Step #n"
 * toggle, and Back/Continue pairs at the foot of each card — and defaulted to
 * showing every card expanded at once. Here there is one model: click a
 * detent.
 *
 * Finished stages keep their summary and stay re-openable, so nothing is lost
 * by completing them. "Show all steps" is the escape hatch for dispatchers who
 * want the whole picture, and it remembers the choice.
 *
 * ── Finish-review fix: this was five cards pretending to be a rail ─────────
 *
 * The direction contract asks for "the five dispatch stages as a rail of
 * stamped detents", and the first rebuild shipped five same-size white plates
 * in a vertical stack, each carrying a round numbered chip, a heading, a
 * status line and a chevron. That is two things at once: the craft floor's
 * first named refusal (same-size cards of icon plus heading plus text as the
 * page structure) and the category-default accordion stepper the redesign was
 * supposed to replace. It also meant the flow's shape was invisible until you
 * counted cards.
 *
 * There is one rail now and one panel. The rail is five detents on a single
 * plate, divided by trim, filled as they pass; the open detent inverts onto
 * the field and its body opens directly below, so the stage you are working
 * is the only card on screen. The status line moved into that panel's header,
 * where there is room to read it, rather than being squeezed into a detent.
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

/**
 * A stamped detent: filled once passed, hollow while ahead.
 *
 * Never colour alone. The number or tick carries the state as a shape, and the
 * label beside it carries it in words.
 */
function Detent({ stage, onField }: { stage: Stage; onField: boolean }) {
  const base = "grid size-6 shrink-0 place-items-center rounded-full text-micro";

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
  const openStages = showAll ? stages : stages.filter((s) => s.id === openId);

  return (
    <div className="flex flex-col gap-3">
      {/* The rail. One plate, five detents, trim between them. */}
      <ol className="flex items-stretch overflow-hidden rounded-plate border border-edge bg-board-plate shadow-plate">
        {stages.map((stage) => {
          const isOpen = showAll || openId === stage.id;
          const isFlashed = flashId === stage.id;
          return (
            <li key={stage.id} id={`stage-${stage.id}`} className="flex min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onToggle(stage.id)}
                aria-expanded={isOpen}
                aria-controls={`stage-body-${stage.id}`}
                aria-current={stage.state === "active" ? "step" : undefined}
                data-on-field={isOpen && !showAll ? "" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 border-l border-hairline px-1 py-2.5 transition-colors first:border-l-0",
                  isOpen && !showAll
                    ? "bg-board-field"
                    : isFlashed
                      ? "bg-status-act-fill"
                      : "hover:bg-board-ground"
                )}
              >
                <Detent stage={stage} onField={isOpen && !showAll} />
                {/* Hidden below sm: five labels in 390px gives each one 78px,
                    which is not enough for "Confirm the items". The open
                    panel's header carries the full label at every width, so
                    nothing is lost. */}
                <span
                  className={cn(
                    "hidden w-full truncate text-center text-micro uppercase sm:block",
                    isOpen && !showAll
                      ? "text-board-plate"
                      : stage.state === "todo"
                        ? "text-ink-muted"
                        : "text-ink"
                  )}
                >
                  {stage.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* The open stage. One card, not five. */}
      {openStages.map((stage) => {
        const isWaiting = stage.turn === "customer";
        return (
          <div
            key={stage.id}
            id={`stage-body-${stage.id}`}
            className={cn(
              "overflow-hidden rounded-plate border bg-board-plate shadow-plate",
              flashId === stage.id ? "border-signal ring-1 ring-signal" : "border-edge"
            )}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-hairline px-3 py-2.5">
              <h3 className="min-w-0 truncate text-panel text-ink">{stage.label}</h3>
              <span
                className={cn(
                  "flex min-w-0 items-center gap-1 truncate text-body",
                  stage.state === "done"
                    ? "text-status-done-ink"
                    : isWaiting
                      ? "text-status-waiting-ink"
                      : "text-ink-muted"
                )}
              >
                {isWaiting && <Hourglass size={12} className="shrink-0" />}
                {stage.statusLine}
              </span>
            </div>

            <div className="p-3">
              {jumpReason?.stage === stage.id && (
                <p
                  role="alert"
                  className="mb-3 mt-0 rounded-trim bg-status-act-fill px-3 py-2 text-label text-status-act-ink"
                >
                  {jumpReason.text}
                </p>
              )}
              {renderStage(stage.id)}
            </div>
          </div>
        );
      })}

      {!readOnly && (
        <button
          type="button"
          onClick={() => onShowAllChange(!showAll)}
          className="flex min-h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-plate border border-edge bg-board-plate text-micro uppercase text-ink-muted transition-colors hover:text-ink"
        >
          {showAll ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
          {showAll ? copy.showOneStep : copy.showAllSteps}
        </button>
      )}
    </div>
  );
}
