import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card wrapper, scoped to the dispatcher portal.
 *
 * `bg-white border border-slate-200 rounded-2xl shadow-xs` is duplicated
 * near-identically across every panel and step card in this portal — this
 * gives it one home.
 */

const PADDING_CLASSES = {
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
        "bg-white border border-slate-200 rounded-2xl shadow-xs",
        PADDING_CLASSES[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * The "eyebrow badge + icon + title left, status badge right" header
 * hand-duplicated near-identically across all four cockpit step cards.
 */
interface DispatcherCardHeaderProps {
  eyebrow: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
  status?: React.ReactNode;
  action?: React.ReactNode;
}

DispatcherCard.Header = function DispatcherCardHeader({
  eyebrow,
  icon,
  title,
  status,
  action,
}: DispatcherCardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="text-[10px] font-bold text-blue-700 bg-blue-50 rounded-full px-2 py-0.5 w-fit">
          {eyebrow}
        </div>
        <h3 className="text-slate-900 font-extrabold text-sm lg:text-base flex items-center gap-2 truncate">
          {icon}
          {title}
        </h3>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {status}
        {action}
      </div>
    </div>
  );
};
