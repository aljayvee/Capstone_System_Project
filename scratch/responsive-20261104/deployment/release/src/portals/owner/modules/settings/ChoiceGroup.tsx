import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A single-choice control: the radio pattern, drawn as a segmented plate.
 *
 * OwnerTabs is for choosing which panel shows. This chooses a value that
 * stays chosen (a theme, a text size), so it is a radiogroup: one tab stop,
 * arrow keys move and select, and the state is aria-checked rather than a
 * background colour alone.
 */

export interface Choice<T extends string | number> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Rendered in place of the icon, for previews such as a sized "Aa". */
  glyph?: React.ReactNode;
}

interface ChoiceGroupProps<T extends string | number> {
  /** Names the group for assistive tech. */
  label: string;
  choices: ReadonlyArray<Choice<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function ChoiceGroup<T extends string | number>({
  label,
  choices,
  value,
  onChange,
  className,
}: ChoiceGroupProps<T>) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + choices.length) % choices.length;
    onChange(choices[next].value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move(index, 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move(index, -1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex flex-wrap overflow-hidden rounded-plate border border-edge bg-board-plate",
        className,
      )}
    >
      {choices.map((choice, i) => {
        const Icon = choice.icon;
        const checked = choice.value === value;
        return (
          <button
            key={String(choice.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(choice.value)}
            onKeyDown={(event) => onKeyDown(event, i)}
            className={cn(
              "flex min-h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 border-l border-hairline px-3 py-2 text-label transition-colors first:border-l-0",
              checked ? "bg-board-field text-white" : "text-ink-muted hover:bg-board-ground hover:text-ink",
            )}
          >
            {choice.glyph ?? (Icon ? <Icon size={15} className="shrink-0" /> : null)}
            <span className="truncate">{choice.label}</span>
          </button>
        );
      })}
    </div>
  );
}
