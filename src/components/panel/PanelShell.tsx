import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The shape every panel in this console takes.
 *
 * Two problems this replaces.
 *
 * Five panels returned four different container contracts into the same slot.
 * One relied on `h-full` inside a plain unsized div, where the flex sizing it
 * depended on was simply inert; others returned bare `space-y-*` stacks; two
 * returned a single self-contained bordered card. A reader moving between tabs
 * met a different structure each time.
 *
 * Every panel also did its own viewport arithmetic: `h-[calc(100vh-250px)]
 * min-h-[580px]`, `h-[calc(100vh-210px)] min-h-[500px]`, and `h-[560px]`
 * twice. Those constants encode assumptions about the height of a header
 * nobody told them about, and the minimums guarantee content taller than the
 * viewport on a 1280x720 laptop or a tablet, which is where the console is
 * actually used. Height here comes from the flex chain instead, so the panel
 * fits whatever it is given.
 *
 * Structure is AGENTS.md 8.12: the title, the controls and any footer stay
 * pinned, and exactly one region scrolls.
 *
 * ── Finish-review fix: the world used to stop at the queue tab ─────────────
 *
 * The first version of this header set a sentence-case `text-title` on bone
 * over a hairline with a search field at the top right. That is the generic
 * operations dashboard, and because six of the console's seven tabs route
 * through this one component, the route-board world reached exactly one tab:
 * the finish reviewer could point at three captures that looked like any
 * other admin panel. The stated red line for this redesign was "looking like
 * generic SaaS again", which made that the most serious thing wrong with the
 * build.
 *
 * Two changes carry the board's vocabulary into every panel. The title is set
 * in board caps, the same treatment the destination band uses. And `figure`
 * puts the panel's headline count on a navy plate at title scale, so the
 * standing-figures strip arrives on the other six tabs instead of being
 * something the queue alone gets.
 *
 * The header is typography-first per AGENTS.md 8.13, with no tinted icon chip
 * beside the title. That chip is the single most category-generic element in
 * the old console, repeated on every panel and every Owner module, and a
 * distinctive operations surface was the point of this rebuild.
 */

export interface PanelFigure {
  /** Short uppercase label. What the number counts. */
  label: string;
  /** Already formatted. Pass "--" when the value is not known. */
  value: string;
  /**
   * True only when the count means a dispatcher must act. Red has one legal
   * meaning on this surface, and a headline count is a tempting place to
   * spend it on mere emphasis.
   */
  urgent?: boolean;
}

interface PanelShellProps {
  /** Rendered as the panel's heading, in board caps. */
  title: React.ReactNode;
  /**
   * Which heading level the title takes. Defaults to `h2`, which is right for
   * the dispatcher console: its destination band owns the page's only `h1`.
   *
   * The Owner Portal has no band, and shipped no `h1` on seven of its eight
   * screens while its sidebar brand sat as a DOM peer of every module title.
   * There the panel title IS the top of the document, so it passes `h1` and
   * the outline reads in order for the first time.
   */
  headingLevel?: "h1" | "h2";
  /** Short line under the title. Counts, totals, or what the panel is for. */
  detail?: React.ReactNode;
  /** The panel's headline count, painted on the field. */
  figure?: PanelFigure;
  /** Top-right of the header: a search field, a primary action. */
  aside?: React.ReactNode;
  /** Pinned strip under the header: search, segments, filter capsules. */
  controls?: React.ReactNode;
  /** Pinned below the scroller: pagination, totals, a sticky action. */
  footer?: React.ReactNode;
  /** The one scrolling region. */
  children: React.ReactNode;
  className?: string;
  /** Set when the panel supplies its own plate, as the messenger does. */
  bare?: boolean;
}

export function PanelShell({
  title,
  headingLevel: Heading = "h2",
  detail,
  figure,
  aside,
  controls,
  footer,
  children,
  className,
  bare = false,
}: PanelShellProps) {
  return (
    <section className={cn("flex h-full min-h-0 w-full flex-col", className)}>
      {/* The pinned zone is one group under one rule. AGENTS.md 8.12 says the
          title and controls do not scroll, but nothing on the surface said
          where that boundary was, so a scrolled list slid up behind the title
          with no line to pass under. A hairline is the whole fix, and it also
          gives the title something to sit on. */}
      <div
        className={cn(
          "shrink-0 flex flex-col gap-3 border-b border-hairline pb-3",
          !bare && "pt-1",
        )}
      >
        {/* Stacks until md rather than sm. Every consumer puts a 288 to 320px
            search field in `aside`, and between 640 and 767px that field and a
            22px title were competing for the same row: the title won the
            allocation and then ellipsised, so a panel could announce itself as
            "Cust...". A dropped search field costs one row; an unreadable panel
            title costs the reader the only thing telling them where they are. */}
        <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div className="min-w-0">
            <Heading className="truncate text-title uppercase text-ink">{title}</Heading>
            {detail ? <p className="mt-0.5 text-label text-ink-muted">{detail}</p> : null}
          </div>
          {figure || aside ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {figure ? (
                <div
                  data-on-field
                  className="shrink-0 rounded-plate bg-board-field px-3 py-1.5 shadow-field"
                >
                  <p className="text-micro uppercase text-board-trim">{figure.label}</p>
                  <p
                    data-figure
                    className={cn(
                      "text-title tabular-nums",
                      figure.urgent ? "text-signal-on-field" : "text-board-plate",
                    )}
                  >
                    {figure.value}
                  </p>
                </div>
              ) : null}
              {aside}
            </div>
          ) : null}
        </header>

        {controls ? <div>{controls}</div> : null}
      </div>

      {/* The only scroller. min-h-0 is what lets it actually shrink inside the
          flex column rather than pushing the panel past its bounds. */}
      <div className="min-h-0 flex-1 overflow-y-auto pt-3">{children}</div>

      {footer ? <div className="shrink-0 pt-3">{footer}</div> : null}
    </section>
  );
}
