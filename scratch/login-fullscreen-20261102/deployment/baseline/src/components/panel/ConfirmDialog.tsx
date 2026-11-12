import * as React from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, Info, LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DispatcherButton } from "./DispatcherButton";

/**
 * One confirmation, for the actions that need one.
 *
 * Replaces `window.confirm()`, and supplies a confirmation to the destructive
 * actions that never had any.
 *
 * `consequence` is the reason this exists rather than a yes/no box.
 * `tone="danger"` spends the signal red, so it is reserved for an action that
 * destroys something. Additions and updates use `"info"`, `"neutral"` or `"success"`.
 */

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names the action, in the product's own words. */
  title: string;
  /** What is about to happen or structured preview details. */
  body: React.ReactNode;
  /**
   * What it costs elsewhere in the product, when there is a cost worth
   * stating. Rendered apart from the body so it reads as the consequence
   * rather than more prose.
   */
  consequence?: React.ReactNode;
  /** The affirmative label. Name the act: "Register Personnel", not "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` spends the signal red. Only for something irreversible. */
  tone?: "danger" | "neutral" | "info" | "success";
  /** Optional custom header icon to override the default tone icon. */
  icon?: LucideIcon;
  onConfirm: () => void;
  /** Disables both controls and shows the spinner while the write is in flight. */
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  consequence,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  icon: CustomIcon,
  onConfirm,
  busy = false,
}: ConfirmDialogProps) {
  const IconComponent = CustomIcon ?? (
    tone === "danger"
      ? AlertTriangle
      : tone === "info"
        ? HelpCircle
        : tone === "success"
          ? CheckCircle2
          : AlertTriangle
  );

  const iconClass =
    tone === "danger"
      ? "text-status-act-ink"
      : tone === "info"
        ? "text-board-field"
        : tone === "success"
          ? "text-emerald-500"
          : "text-status-waiting-ink";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* data-surface: DialogContent renders through a portal at document.body,
          outside whichever surface opened it, so without this it gets no focus
          ring, no themed selection and none of the skin's token values. */}
      <DialogContent data-surface="owner" className="rounded-modal border-edge max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-panel text-ink">
            <IconComponent size={18} className={iconClass} />
            {title}
          </DialogTitle>
        </DialogHeader>

        {typeof body === "string" ? (
          <DialogDescription className="text-body text-ink-muted">{body}</DialogDescription>
        ) : (
          <div className="text-body text-ink-muted space-y-3">{body}</div>
        )}

        {consequence ? (
          <div
            className={
              tone === "danger"
                ? "rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink"
                : "rounded-plate bg-status-waiting-fill px-3 py-2 text-label text-status-waiting-ink"
            }
          >
            {consequence}
          </div>
        ) : null}

        <DialogFooter className="flex-row gap-3 pt-2">
          <DispatcherButton
            variant="secondary"
            className="flex-1"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </DispatcherButton>
          <DispatcherButton
            variant={tone === "danger" ? "primary" : "field"}
            className="flex-1"
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </DispatcherButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
