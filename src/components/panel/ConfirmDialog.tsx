import * as React from "react";
import { AlertTriangle } from "lucide-react";
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
 * `window.confirm` is the wrong tool for three reasons that matter here. It
 * renders in the browser's chrome, so it carries none of the product's voice
 * and none of its design system. It cannot state a consequence in more than
 * one undifferentiated line. And it blocks the main thread, which on a
 * touch-driven tablet reads as the application hanging.
 *
 * What it replaces, and what it adds:
 *
 *   window.confirm  deleting a verified store pin, removing a category photo
 *   nothing at all  archiving a category, retiring a store, deactivating
 *                   another operator's account, rewriting global pricing
 *
 * `consequence` is the reason this exists rather than a yes/no box. An owner
 * archiving a category is not told that the customer app stops offering it;
 * retiring a store is not told it leaves the dispatcher's picker. Those
 * sentences are the difference between a confirmation and a speed bump.
 *
 * `tone="danger"` spends the signal red, so it is reserved for an action that
 * destroys something. Archiving and deactivating are recoverable and take the
 * neutral tone: red on every confirmation is red meaning nothing.
 */

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names the action, in the product's own words. */
  title: string;
  /** What is about to happen. */
  body: React.ReactNode;
  /**
   * What it costs elsewhere in the product, when there is a cost worth
   * stating. Rendered apart from the body so it reads as the consequence
   * rather than more prose.
   */
  consequence?: React.ReactNode;
  /** The affirmative label. Name the act: "Delete the store", not "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` spends the signal red. Only for something irreversible. */
  tone?: "danger" | "neutral";
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
  onConfirm,
  busy = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* data-surface: DialogContent renders through a portal at document.body,
          outside whichever surface opened it, so without this it gets no focus
          ring, no themed selection and none of the skin's token values. */}
      <DialogContent data-surface="owner" className="rounded-modal border-edge">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-panel text-ink">
            <AlertTriangle
              size={18}
              className={tone === "danger" ? "text-status-act-ink" : "text-status-waiting-ink"}
            />
            {title}
          </DialogTitle>
        </DialogHeader>

        <DialogDescription className="text-body text-ink-muted">{body}</DialogDescription>

        {consequence ? (
          <p
            className={
              tone === "danger"
                ? "rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink"
                : "rounded-plate bg-status-waiting-fill px-3 py-2 text-label text-status-waiting-ink"
            }
          >
            {consequence}
          </p>
        ) : null}

        <DialogFooter className="flex-row gap-3">
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
