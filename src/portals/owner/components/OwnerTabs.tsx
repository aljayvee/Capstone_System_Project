import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A real tab set, for the places this portal had eleven segmented controls and
 * zero tab semantics.
 *
 * `role="tab"`, `aria-selected`, `role="tablist"` and `aria-controls` each
 * appeared exactly zero times across the whole Owner Portal. Every segmented
 * control was a plain <div> of <button>s whose selected state was carried by
 * a background colour, so a screen reader announced six identical buttons and
 * a keyboard user had to tab through all of them to reach the panel.
 *
 * This implements the WAI-ARIA tabs pattern properly rather than labelling a
 * div: one tab stop for the whole set via roving tabindex, then Left/Right to
 * move between tabs and Home/End to jump to the ends. That is the behaviour a
 * category-fluent user already expects from a tab strip, which is the point of
 * the pattern.
 *
 * Use this for a genuine tab set, where the segments select which panel is
 * shown. For a two-state toggle that changes how one panel looks, use
 * `aria-pressed` on a pair of buttons inside a `role="group"` instead;
 * CategoryPlacesPanel already does that correctly and is the model.
 *
 * The plate is the board vocabulary: one surface, segments divided by trim,
 * the selected segment filled with the field. No shadow, per the [LOCKED]
 * flat-design invariant, and no rounded-full pill, because pills are reserved
 * for status chips (AGENTS.md 8.2).
 */

export interface OwnerTab<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  /**
   * A count beside the label. Pass `null` for "not known" rather than 0: a
   * confident zero over a failed request is the defect this portal shipped
   * most often.
   */
  count?: number | null;
}

interface OwnerTabsProps<T extends string> {
  /** Names the set for assistive tech. Not rendered. */
  label: string;
  tabs: ReadonlyArray<OwnerTab<T>>;
  active: T;
  onChange: (id: T) => void;
  /** Namespaces the generated ids so two sets on one screen cannot collide. */
  idPrefix: string;
  className?: string;
}

export function OwnerTabs<T extends string>({
  label,
  tabs,
  active,
  onChange,
  idPrefix,
  className,
}: OwnerTabsProps<T>) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        move(index, 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        move(index, -1);
        break;
      case "Home":
        e.preventDefault();
        move(index, -index);
        break;
      case "End":
        e.preventDefault();
        move(index, tabs.length - 1 - index);
        break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex shrink-0 flex-wrap overflow-hidden rounded-plate border border-edge bg-board-plate",
        className,
      )}
    >
      {tabs.map((tab, i) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={isActive}
            // Only on the selected tab. Both consumers render the active panel
            // and nothing else, so pointing at an unmounted id would leave two
            // of three tabs referencing elements that do not exist. A dangling
            // aria-controls is worse than none, and the attribute is
            // recommended by the tabs pattern rather than required.
            aria-controls={isActive ? `${idPrefix}-panel-${tab.id}` : undefined}
            // Roving tabindex: the set is one tab stop, and the arrow keys
            // move within it. Tabbing through six buttons to reach the panel
            // is what the pattern exists to avoid.
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 border-l border-hairline px-3 text-micro uppercase transition-colors first:border-l-0",
              isActive
                ? "bg-board-field text-board-plate"
                : "text-ink-muted hover:bg-board-ground hover:text-ink",
            )}
          >
            {Icon ? <Icon size={13} className="shrink-0" /> : null}
            <span className="truncate">{tab.label}</span>
            {tab.count !== undefined ? (
              <span
                data-figure
                className={cn(
                  "shrink-0 tabular-nums",
                  isActive ? "text-board-trim" : "text-ink-muted",
                )}
              >
                {tab.count === null ? "--" : tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
