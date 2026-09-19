import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Plate wrapper, scoped to the dispatcher portal.
 *
 * `bg-white border border-slate-200 rounded-2xl shadow-xs` was duplicated
 * near-identically across every panel and step card in this portal — this
 * gives it one home.
 *
 * Route board build, three changes:
 *
 * Geometry moved onto the documented scale. AGENTS.md 8.2 puts cards at 8 to
 * 12px and reserves 16 to 20px for modals, but `rounded-2xl` (16px) had become
 * the card radius in 49 places across 16 files, with this primitive itself
 * encoding it.
 *
 * `region` replaces nested cards. The inspector nested bordered, rounded
 * surfaces three deep (a card at line 100, four cards inside it, a third level
 * inside those), which the craft floor treats as always wrong. A region is the
 * same grouping expressed the way this world expresses structure: a change of
 * ground and a macro gap, with a hairline rule where a boundary genuinely
 * needs drawing, and no second box.
 *
 * `Header` lost its eyebrow. The craft floor bans a kicker above a heading
 * outright, and this primitive made one a required prop, rendered as a blue
 * pill on every step card in the order chat.
 */

const PADDING_CLASSES = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
} as const;

interface DispatcherCardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: keyof typeof PADDING_CLASSES;
}

export function DispatcherCard({
  padding = "md",
  className,
  children,
  ...props
}: DispatcherCardProps) {
  return (
    <div
      className={cn(
        "bg-board-plate border border-edge rounded-plate shadow-plate",
        PADDING_CLASSES[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * A grouped area inside a plate.
 *
 * Use this wherever the old code reached for a second card. It carries no
 * border and no shadow of its own: it sits on the board ground so the plate
 * it lives on reads as the only surface, and `divided` adds a single hairline
 * for the one case where a boundary has to be drawn rather than spaced.
 */
interface DispatcherRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: keyof typeof PADDING_CLASSES;
  divided?: boolean;
}

DispatcherCard.Region = function DispatcherRegion({
  padding = "sm",
  divided = false,
  className,
  children,
  ...props
}: DispatcherRegionProps) {
  return (
    <div
      className={cn(
        "bg-board-ground rounded-trim",
        divided && "border-t border-hairline",
        PADDING_CLASSES[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * A section label with the rule that finishes it.
 *
 * This is the detail the flat rebuild was missing. A price board, a ledger
 * column and a waybill field all mark a heading the same way: set the word
 * small and spaced, then run a rule from the end of it to the edge of the
 * column. It costs one hairline, it needs no box, and it does the job the
 * tinted icon chip used to do badly.
 *
 * The rule is aria-hidden: it is the label's typography, not content, and a
 * screen reader announcing a horizontal line between every field would be
 * noise.
 */
interface DispatcherLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The element the words render as. A region that genuinely introduces a
   * section passes "h3" so the rule does not cost a heading level; an inline
   * field label leaves it as a span.
   */
  as?: "span" | "h3" | "h4" | "h5";
}

DispatcherCard.Label = function DispatcherCardLabel({
  as: Text = "span",
  children,
  className,
  ...props
}: DispatcherLabelProps) {
  return (
    <div className={cn("mb-2 flex items-center gap-2.5", className)} {...props}>
      <Text className="shrink-0 text-micro uppercase text-ink">{children}</Text>
      <span aria-hidden className="h-px min-w-4 flex-1 bg-hairline" />
    </div>
  );
};

/**
 * The "title left, status right" header that was hand-duplicated
 * near-identically across all four cockpit step cards.
 */
interface DispatcherCardHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  /** One short line under the title, where a kicker used to sit above it. */
  detail?: React.ReactNode;
  status?: React.ReactNode;
  action?: React.ReactNode;
}

DispatcherCard.Header = function DispatcherCardHeader({
  icon,
  title,
  detail,
  status,
  action,
}: DispatcherCardHeaderProps) {
  return (
    // More space below than above would invert the craft floor's vertical
    // rhythm, so the gap sits under the header and the caller supplies none.
    <div className="mb-4 flex flex-col justify-between gap-2 border-b border-hairline pb-3 sm:flex-row sm:items-start">
      <div className="min-w-0">
        {/* `truncate` was previously on this element while it was also a flex
            container, where it sets white-space on the box and ellipsises
            nothing. The title text now carries it on its own line box. */}
        <h3 className="flex min-w-0 items-center gap-2 text-panel text-ink">
          {icon}
          <span className="truncate">{title}</span>
        </h3>
        {detail ? <p className="mt-1 text-label text-ink-muted">{detail}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status}
        {action}
      </div>
    </div>
  );
};
