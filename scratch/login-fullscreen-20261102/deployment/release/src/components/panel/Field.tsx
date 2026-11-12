import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A labelled form control.
 *
 * The profile panel had seven visible `<label>` elements and seven inputs, and
 * not one pair was connected: no `htmlFor`, no `id`. The association was purely
 * visual, so clicking a label focused nothing and a screen reader announced the
 * fields with no name at all. Elsewhere in the console seven more inputs had
 * only a placeholder, which is not a label and vanishes as soon as anyone types.
 *
 * The id is generated here and handed to the control, so the pairing cannot be
 * forgotten: there is no way to render this component without it.
 *
 * The error is bound through `aria-describedby` and announced, rather than
 * being a red line that only sighted users receive.
 */

interface FieldProps {
  label: React.ReactNode;
  /** Persistent helper text. Not a placeholder. */
  hint?: React.ReactNode;
  /** Set on a failed validation. Names the problem, not just "invalid". */
  error?: string | null;
  required?: boolean;
  className?: string;
  /** Receives the ids to spread onto the control. */
  children: (control: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => React.ReactNode;
}

export function Field({ label, hint, error, required = false, className, children }: FieldProps) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-micro uppercase text-ink-muted">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-status-act-ink">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}

      {error ? (
        <p id={errorId} role="alert" className="text-label text-status-act-ink">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-label text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The console's one text input skin, so the four hand-rolled search inputs and
 * the profile form stop drifting from each other.
 */
export const fieldInputClasses = cn(
  "w-full min-h-10 rounded-plate border border-edge bg-board-plate px-3 text-body text-ink",
  "placeholder:text-ink-muted transition-colors focus:border-board-field",
  "aria-[invalid=true]:border-status-act-ink",
);
