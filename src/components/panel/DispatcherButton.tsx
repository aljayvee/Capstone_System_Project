import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Button, scoped to the dispatcher portal.
 *
 * The app's generic `src/components/ui/button.tsx` defaults to a different
 * color (`--primary`, near-black) and a smaller size (`h-8`, `text-sm`) than
 * what every dispatcher screen already uses by convention. Rather than
 * override that everywhere it's used, this codifies the recipe that's
 * already consistent across 11 dispatcher files into one place.
 *
 * Route board build: `primary` is now the signal red, because on this surface
 * red has exactly one meaning, "you must act", and the primary action is that
 * meaning. Navy moved to its own `field` variant, since navy is the board's
 * structural field rather than an emphasis colour. The `success` variant also
 * lost `shadow-md shadow-emerald-600/30`, a zero-offset coloured halo that the
 * flat-surface invariant bans and that every success button inherited.
 */

// Disabled states are deliberately their own, checked pair per variant — not
// "the enabled colors, faded a bit." The inherited recipe (bg-slate-200 on
// text-slate-400, or lighter) measured at 1.5-2.5:1 contrast everywhere, well
// under WCAG AA's 4.5:1 floor for text this small — a disabled "Pin Store"
// button that a dispatcher genuinely could not read, not just one that looked
// muted. The disabled pairing is now one token pair for every variant,
// bg-status-closed-fill on text-status-closed-ink, computed at 6.4:1: slate
// here means "no claim being made", which is what a disabled control is.
const DISABLED = "disabled:bg-status-closed-fill disabled:text-status-closed-ink";

const VARIANT_CLASSES = {
  primary: `bg-signal hover:bg-signal-deep text-white ${DISABLED}`,
  field: `bg-board-field hover:bg-board-field-deep text-white ${DISABLED}`,
  secondary: `bg-board-plate hover:bg-board-ground text-ink border border-edge ${DISABLED} disabled:border-transparent`,
  subtle: `bg-board-ground hover:bg-board-trim/25 text-ink ${DISABLED}`,
  success: `bg-status-done-ink hover:bg-board-field text-white ${DISABLED}`,
  "danger-ghost": `text-status-act-ink hover:bg-status-act-fill ${DISABLED} disabled:bg-transparent`,
} as const;

// Every size clears a 36px minimum target, which the tablet usage makes
// load-bearing rather than nominal. `sm` was previously text-xs px-3 py-1.5,
// about 28px tall.
const SIZE_CLASSES = {
  sm: "text-micro px-3 min-h-9 gap-1.5",
  md: "text-label px-4 min-h-10 gap-2",
  lg: "text-panel px-5 min-h-12 gap-2.5",
} as const;

type Variant = keyof typeof VARIANT_CLASSES;
type Size = keyof typeof SIZE_CLASSES;

interface CommonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: Variant;
  size?: Size;
  /** Swaps the icon slot for a spinner (and the label too, if `loadingText` is given). */
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

// `iconOnly` requires `aria-label` at the type level — the flagship finding
// in this file's audit was a primary action with zero accessible name.
type LabeledProps = CommonProps & { iconOnly?: false; children: React.ReactNode };
type IconOnlyProps = CommonProps & {
  iconOnly: true;
  children?: undefined;
  "aria-label": string;
};

export type DispatcherButtonProps = LabeledProps | IconOnlyProps;

export function DispatcherButton({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  icon,
  iconOnly,
  className,
  children,
  disabled,
  ...props
}: DispatcherButtonProps) {
  const label = loading && loadingText ? loadingText : children;

  return (
    <button
      type="button"
      disabled={disabled || loading}
      // The focus ring is not declared here. src/styles/surfaces.css gives the
      // whole console one themed :focus-visible outline at a specificity that
      // outranks a utility class, so every control agrees and none can opt out
      // by accident. Before that, all 31 component files had zero focus-visible
      // styles between them.
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-plate transition-colors duration-150 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        iconOnly && "aspect-square px-0",
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin shrink-0" size={size === "lg" ? 18 : 14} />
      ) : (
        icon
      )}
      {!iconOnly && label}
    </button>
  );
}
