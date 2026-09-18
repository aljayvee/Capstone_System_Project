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

// `aria-label` is required at the type level, the same way DispatcherButton
// requires one for an icon-only button. Seven inputs in this console shipped
// with a placeholder and no accessible name at all, including the exception
// queue's audit-trail justification field; a placeholder disappears the moment
// a dispatcher types and was never a label.
interface FilterModeProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mode?: "filter";
  "aria-label": string;
}

interface SubmitModeProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mode: "submit";
  "aria-label": string;
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
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
      />
      <input
        type="text"
        // placeholder:text-slate-400 measured about 2.6:1 on this fill. The
        // focus ring is the console's single themed :focus-visible outline
        // from surfaces.css rather than a per-field glow.
        className={cn(
          "w-full min-h-9 rounded-plate border border-edge bg-board-ground pl-9 text-label text-ink placeholder:text-ink-muted transition-colors focus:border-board-field focus:bg-board-plate",
          mode === "submit" ? "pr-10" : "pr-3",
          className,
        )}
        {...inputProps}
      />
      {mode === "submit" && inputProps.value ? (
        <button
          type="button"
          onClick={(props as SubmitModeProps).onClear}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-trim text-ink-muted hover:bg-board-trim/25 hover:text-ink"
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
