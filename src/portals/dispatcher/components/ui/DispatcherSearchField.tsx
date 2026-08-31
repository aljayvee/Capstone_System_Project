import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DispatcherButton } from "./DispatcherButton";

/**
 * Search input, scoped to the dispatcher portal.
 *
 * Codifies `RecentChatsPanel.tsx`'s conversation search — the
 * best-executed search field found in the portal (icon-left, bordered,
 * focus ring) — so every other hand-rolled search box in the portal can
 * converge on it instead of drifting slightly from each other.
 *
 * Two modes:
 * - `filter` (default): a live, no-button search — the conversation finder.
 * - `submit`: adds a clear-× (once non-empty) and a trailing action button —
 *   the cockpit's store search. Renders as a fragment; the caller supplies
 *   the wrapping `<form onSubmit>`, matching how it's already used today.
 */

interface FilterModeProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mode?: "filter";
}

interface SubmitModeProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mode: "submit";
  onClear: () => void;
  submitLabel: string;
  submitIcon?: React.ReactNode;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
}

export type DispatcherSearchFieldProps = FilterModeProps | SubmitModeProps;

export function DispatcherSearchField(props: DispatcherSearchFieldProps) {
  const { mode = "filter", className, ...inputProps } = props;

  const input = (
    <div className="relative flex-1">
      <Search
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        type="text"
        className={cn(
          "w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 py-2 text-xs text-slate-800 placeholder:text-slate-400 font-medium outline-none focus:ring-2 focus:ring-dispatcher-navy focus:bg-white transition",
          mode === "submit" ? "pr-8" : "pr-3.5",
          className
        )}
        {...inputProps}
      />
      {mode === "submit" && inputProps.value ? (
        <button
          type="button"
          onClick={(props as SubmitModeProps).onClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );

  if (mode === "filter") {
    return input;
  }

  const { submitLabel, submitIcon, isSubmitting, submitDisabled } = props as SubmitModeProps;

  return (
    <div className="relative flex items-center gap-2">
      {input}
      <DispatcherButton
        type="submit"
        size="md"
        disabled={submitDisabled}
        loading={isSubmitting}
        icon={submitIcon}
      >
        {submitLabel}
      </DispatcherButton>
    </div>
  );
}
