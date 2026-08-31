import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Status pill, scoped to the dispatcher portal.
 *
 * No `Badge` primitive exists anywhere in the app despite this exact recipe
 * (`text-[10-11px] font-extrabold px-2/2.5 py-0.5 rounded-full border`) being
 * used by convention everywhere. Shape follows `RIDER_STATUS_THEMES` in
 * `src/constants/riderPresence.ts` — the one place a real semantic-token
 * pattern already exists — rather than inventing a new one.
 */

const VARIANT_CLASSES = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-300",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  info: "bg-blue-50 text-blue-900 border-blue-200",
  neutral: "bg-slate-100 text-slate-500 border-slate-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
} as const;

export type DispatcherBadgeVariant = keyof typeof VARIANT_CLASSES;

interface DispatcherBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: DispatcherBadgeVariant;
  icon?: React.ReactNode;
}

export function DispatcherBadge({
  variant = "neutral",
  icon,
  className,
  children,
  ...props
}: DispatcherBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold px-2 sm:px-2.5 py-0.5 rounded-full border whitespace-nowrap",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
