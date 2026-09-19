import * as React from "react";
import { cn } from "@/lib/utils";
import {
  presentErrandStatus,
  TONE_CLASSES,
  type StatusMark,
  type StatusTone,
} from "@/lib/statusPresentation";

/**
 * Status pill, scoped to the dispatcher portal, and the only one.
 *
 * No `Badge` primitive existed anywhere in the app despite this exact recipe
 * being used by convention everywhere. Shape follows `RIDER_STATUS_THEMES` in
 * `src/constants/riderPresence.ts`, the one place a real semantic-token
 * pattern already existed, rather than inventing a new one.
 *
 * What changed in the route board build: the same conceptual chip had drifted
 * to 9px, 10px, 11px and 12px, in weights 700, 800 and 900, with and without
 * uppercase, with and without a border, and as both `rounded-full` and
 * `rounded-md`. It now has one size, one weight and one shape, and its colour
 * comes from the status law rather than from whatever the call site felt.
 *
 * Two rules from the direction contract are enforced here rather than
 * remembered. Colour never carries the state alone: every chip draws a mark
 * as well, so it survives greyscale and a bleached tablet screen. And the
 * mark is drawn, never a glyph or an emoji standing in for an icon.
 */

/**
 * The legacy variant names, mapped onto the status law so the two existing
 * call sites (OrderChatScreen, PaymentLedgerPanel) keep working and pick up
 * the new palette without an edit. Prefer `tone`, or better, `<StatusChip>`.
 */
const VARIANT_TO_TONE = {
  success: "done",
  warning: "waiting",
  info: "moving",
  neutral: "closed",
  danger: "act",
} as const;

export type DispatcherBadgeVariant = keyof typeof VARIANT_TO_TONE;

const TONE_TO_MARK: Record<StatusTone, StatusMark> = {
  waiting: "open",
  moving: "moving",
  done: "filled",
  closed: "struck",
  act: "alert",
};

/** Marks are CSS shapes in the current ink, so they inherit the tone. */
function StatusMarkShape({ mark }: { mark: StatusMark }) {
  if (mark === "alert") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex size-2.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-current"
      >
        <span className="size-1 rounded-full bg-current" />
      </span>
    );
  }

  const shape =
    mark === "open"
      ? "size-1.5 rounded-full border-[1.5px] border-current"
      : mark === "moving"
        ? "size-1.5 rotate-45 bg-current"
        : mark === "filled"
          ? "size-1.5 rounded-full bg-current"
          : "h-[1.5px] w-2.5 bg-current";

  return <span aria-hidden="true" className={cn("shrink-0", shape)} />;
}

interface DispatcherBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Preferred. Comes from the status law. */
  tone?: StatusTone;
  /** Legacy alias kept for existing call sites. `tone` wins when both are set. */
  variant?: DispatcherBadgeVariant;
  /** Defaults to the mark this tone always uses. */
  mark?: StatusMark;
  /** Set false only where the chip sits inside a group that already marks state. */
  showMark?: boolean;
}

export function DispatcherBadge({
  tone,
  variant = "neutral",
  mark,
  showMark = true,
  className,
  children,
  ...props
}: DispatcherBadgeProps) {
  const resolvedTone: StatusTone = tone ?? VARIANT_TO_TONE[variant];
  const resolvedMark: StatusMark = mark ?? TONE_TO_MARK[resolvedTone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-micro uppercase",
        TONE_CLASSES[resolvedTone],
        className,
      )}
      {...props}
    >
      {showMark && <StatusMarkShape mark={resolvedMark} />}
      {children}
    </span>
  );
}

/**
 * The way a panel should render an errand's status: hand it the raw value and
 * let one table decide the words, the tone and the mark.
 *
 * This replaces five call sites that rendered `String(errand.status)` directly,
 * which is how dispatchers ended up reading `IN_TRANSIT` and `DOING ERRAND`,
 * and it is why a cancelled run can no longer paint in a delivered run's green.
 */
export function StatusChip({
  status,
  className,
  ...props
}: { status: string | null | undefined } & Omit<
  DispatcherBadgeProps,
  "tone" | "mark" | "children"
>) {
  const { label, tone, mark } = presentErrandStatus(status);

  return (
    <DispatcherBadge tone={tone} mark={mark} className={className} {...props}>
      {label}
    </DispatcherBadge>
  );
}
