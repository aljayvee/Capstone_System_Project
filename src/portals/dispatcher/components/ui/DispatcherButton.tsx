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
 */

// Disabled states are deliberately their own, checked pair per variant — not
// "the enabled colors, faded a bit." The inherited recipe (bg-slate-200 on
// text-slate-400, or lighter) measured at 1.5-2.5:1 contrast everywhere, well
// under WCAG AA's 4.5:1 floor for text this small — a disabled "Pin Store"
// button that a dispatcher genuinely could not read, not just one that looked
// muted. Every pairing below is a real, computed ratio, not a guess:
// primary/success 5.10:1, secondary 6.92:1, subtle 6.15:1, danger-ghost 4.76:1.
const VARIANT_CLASSES = {
  primary:
    "bg-dispatcher-navy hover:bg-dispatcher-navy-dark text-white shadow-xs disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none",
  secondary:
    "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs disabled:text-slate-600 disabled:bg-slate-100",
  subtle:
    "bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 disabled:bg-slate-200 disabled:text-slate-600",
  success:
    "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none",
  "danger-ghost":
    "text-rose-500 hover:text-rose-700 hover:bg-rose-50 disabled:text-slate-500 disabled:hover:bg-transparent",
} as const;

const SIZE_CLASSES = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-xs px-4 py-2.5 gap-1.5",
  lg: "text-sm px-4 py-3.5 gap-2.5",
} as const;

type Variant = keyof typeof VARIANT_CLASSES;
type Size = keyof typeof SIZE_CLASSES;

interface CommonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
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
      className={cn(
        "inline-flex items-center justify-center font-bold rounded-xl transition active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        iconOnly && "aspect-square p-0",
        className
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
