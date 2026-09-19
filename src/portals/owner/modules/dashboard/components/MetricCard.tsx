import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One figure, stated plainly.
 *
 * This component renders 27 times across seven files, and its old signature
 * was the single largest source of decorative colour in the portal:
 *
 *   interface MetricCardProps { ...; icon: LucideIcon; color: string }
 *
 * `color` was a free-form string that call sites filled with twelve different
 * raw hexes, and `style={{ background: `${color}15` }}` minted a tinted icon
 * square from whatever arrived. The result was colour assigned per tile rather
 * than per meaning: "money" came out #10B981 in the sales report, #8B5CF6 in
 * settlement, #1E3A5F in commission and #B45309 in exceptions. Violet on
 * "Gross Revenue" said nothing at all.
 *
 * `color` is gone. In its place `tone` names a MEANING from the status law, so
 * a figure can only be coloured when the colour carries information. Most
 * figures take no tone, and that is correct: a count is just a count.
 *
 * Also gone: the tinted icon chip (banned outright by the craft floor, and the
 * most category-generic element in this codebase), the 16px radius, the drop
 * shadow and its hover shadow, the 10.5px label and the font-black value. The
 * plate is flat per AGENT_HANDSHAKE's [LOCKED] Flat Design Surface Purity
 * invariant: one boundary rule, no elevation.
 */

const TONE_CLASSES = {
  neutral: "text-ink",
  /** Someone must act on this. Shares the signal red's one legal meaning. */
  act: "text-status-act-ink",
  /** Finished well. */
  done: "text-status-done-ink",
  /** Someone else owes the next move. */
  waiting: "text-status-waiting-ink",
} as const;

interface MetricCardProps {
  title: string;
  /**
   * Already formatted. Pass "--" when the value is not known, never "0": a
   * confident zero over a failed request is this portal's oldest defect.
   */
  value: string;
  /**
   * Why the value is absent, when it is. A dash tells a reader that a figure
   * is missing but not whether nobody earned anything or nobody answered, and
   * those are opposite facts. Follows the one placeholder in this portal that
   * already got this right, in RiderPerformanceReportView.
   */
  valueTitle?: string;
  sub?: string;
  /**
   * A bare glyph beside the label. Optional, and it sits on the plate rather
   * than inside a tinted square.
   */
  icon?: LucideIcon;
  /**
   * Colours the figure, and only where the colour means something. Defaults to
   * neutral, which is the right answer for a plain count.
   */
  tone?: keyof typeof TONE_CLASSES;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  valueTitle,
  sub,
  icon: Icon,
  tone = "neutral",
}) => {
  return (
    <div className="space-y-1 rounded-plate border border-edge bg-board-plate p-3.5 sm:p-4">
      <div className="flex min-w-0 items-center gap-1.5">
        {Icon ? <Icon size={13} className="shrink-0 text-ink-muted" /> : null}
        <p className="truncate text-micro uppercase text-ink-muted">{title}</p>
      </div>
      {/* data-figure gives it tabular numerals, so a value that updates does
          not shift the digits beside it. */}
      <p data-figure title={valueTitle} className={cn("truncate text-board", TONE_CLASSES[tone])}>
        {value}
      </p>
      {sub ? <p className="truncate text-label text-ink-muted">{sub}</p> : null}
    </div>
  );
};
