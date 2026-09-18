import { cn } from "@/lib/utils";

/**
 * What is true right now, read as one band rather than as tiles.
 *
 * This replaces a row of identical metric cards, which is the arrangement the
 * direction contract exists to refuse: a grid of same-size boxes, each with a
 * tinted icon chip and its own decorative hue, is what this portal shipped and
 * what every admin template ships.
 *
 * The band is one navy plate divided by column rules. That form says something
 * the tiles could not: these figures belong together and are read together,
 * because they describe a single moment. Separate plates imply separate
 * subjects, which is why the dashboard's six figures used to read as six
 * unrelated facts when three of them were a snapshot of right now and three
 * were a period's money.
 *
 * `data-on-field` inverts the focus ring and ::selection for the navy ground,
 * and the figures carry `data-figure` so they get tabular numerals and do not
 * jitter as they update.
 */

export interface StandingFigure {
  /** Short uppercase label. What the number counts. */
  label: string;
  /** Already formatted. Pass "--" when nobody received a value. */
  value: string;
  /** One short line under the figure. */
  sub?: string;
  /**
   * Why the value is absent, when it is. A dash tells a reader that a figure
   * is missing but not whether nobody earned anything or nobody answered, and
   * those are opposite facts. Follows the one placeholder in this portal that
   * already got this right, in RiderPerformanceReportView.
   */
  valueTitle?: string;
  /**
   * True only when this figure means somebody must act. Red has one legal
   * meaning on this surface, and a headline count is a tempting place to
   * spend it on mere emphasis.
   */
  urgent?: boolean;
}

interface StandingFiguresProps {
  /** Names the band for assistive tech, since the figures share one heading. */
  label: string;
  figures: StandingFigure[];
  /**
   * How many columns the band splits into above the `sm` breakpoint. Three is
   * the dashboard's reading; tracking passes four for the presence states.
   * Additive, so the dashboard's call site is unchanged.
   */
  columns?: 3 | 4;
  className?: string;
}

export function StandingFigures({
  label,
  figures,
  columns = 3,
  className,
}: StandingFiguresProps) {
  return (
    <section
      data-on-field
      aria-label={label}
      className={cn(
        "grid grid-cols-1 overflow-hidden rounded-plate bg-board-field",
        columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3",
        className,
      )}
    >
      {figures.map((f) => (
        <div
          key={f.label}
          // The rule sits between figures, not around them: a divider on the
          // first cell would read as a border on the plate itself, and a
          // plate's own edge is always heavier than a rule inside it.
          className={cn(
            "min-w-0 border-t border-field-line px-4 py-3 first:border-t-0 sm:border-t-0 sm:border-l sm:first:border-l-0",
            // At four columns the band wraps to 2x2 below lg, so the cell that
            // starts the second row must drop the left rule it would inherit.
            columns === 4 && "sm:odd:border-l-0 lg:odd:border-l lg:first:border-l-0",
          )}
        >
          <p className="truncate text-micro uppercase text-board-trim">{f.label}</p>
          <p
            data-figure
            title={f.valueTitle}
            className={cn(
              "truncate text-board",
              f.urgent ? "text-signal-on-field" : "text-board-plate",
            )}
          >
            {f.value}
          </p>
          {f.sub ? <p className="truncate text-label text-board-trim">{f.sub}</p> : null}
        </div>
      ))}
    </section>
  );
}
