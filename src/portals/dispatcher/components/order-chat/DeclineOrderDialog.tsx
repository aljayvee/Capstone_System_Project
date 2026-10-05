import { useEffect, useState } from "react";
import { Ban, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { copy } from "./copy";

/**
 * Declining an order, from the header menu.
 *
 * This lived in "Check the order" and again in "Check delivery address". Both
 * steps are gone (opening an order accepts it), so the one exit that ends the
 * dispatcher's work honestly moves beside "Close without an order", the other
 * rare and final action. The reason is required: the customer is told it.
 */

interface DeclineOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerFirstName: string;
  /** Pre-selected when the screen already knows why, such as a drop-off outside Tacurong. */
  suggestedReason?: string | null;
  onDecline: (reason: string) => Promise<void>;
}

const OTHER = copy.declineReasons[copy.declineReasons.length - 1];

export function DeclineOrderDialog({
  open,
  onOpenChange,
  customerFirstName,
  suggestedReason,
  onDecline,
}: DeclineOrderDialogProps) {
  const [reason, setReason] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [isDeclining, setIsDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh on every opening, starting from the reason the screen suggests.
  useEffect(() => {
    if (!open) return;
    setReason(suggestedReason ?? null);
    setOtherText("");
    setError(null);
  }, [open, suggestedReason]);

  const finalReason = reason === OTHER && otherText.trim() ? otherText.trim() : reason;

  const submit = async () => {
    if (!finalReason) return;
    setIsDeclining(true);
    setError(null);
    try {
      await onDecline(finalReason);
      onOpenChange(false);
    } catch (err: any) {
      // The dialog stays open so the failure has somewhere to be read.
      setError(err?.response?.data?.error || err?.message || copy.decline.failed);
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isDeclining && onOpenChange(next)}>
      <DialogContent data-surface="dispatch" className="rounded-modal border-edge shadow-plate">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="text-status-act-ink" size={18} /> {copy.decline.title}
          </DialogTitle>
          <DialogClose
            aria-label="Close this dialog"
            className="grid size-9 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:bg-board-ground hover:text-ink"
          >
            <X size={18} />
          </DialogClose>
        </DialogHeader>
        <DialogDescription>{copy.decline.body(customerFirstName)}</DialogDescription>

        <fieldset className="m-0 space-y-1 border-0 p-0">
          <legend className="sr-only">Reason</legend>
          {copy.declineReasons.map((r) => (
            <label key={r} className="flex min-h-9 cursor-pointer items-center gap-2 text-body text-ink">
              <input
                type="radio"
                name="decline-order-reason"
                checked={reason === r}
                onChange={() => setReason(r)}
                className="size-4 shrink-0 accent-signal"
              />
              {r}
            </label>
          ))}
        </fieldset>
        {reason === OTHER && (
          <input
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder={copy.decline.otherPlaceholder}
            aria-label={copy.decline.otherPlaceholder}
            className="min-h-9 w-full rounded-trim border border-edge bg-board-plate px-2.5 text-body text-ink placeholder:text-ink-muted"
          />
        )}

        {error && (
          <p role="alert" className="m-0 rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink">
            {error}
          </p>
        )}

        <DialogFooter className="flex-row gap-3">
          <DispatcherButton
            type="button"
            variant="secondary"
            size="md"
            className="flex-1"
            disabled={isDeclining}
            onClick={() => onOpenChange(false)}
          >
            {copy.decline.cancel}
          </DispatcherButton>
          <DispatcherButton
            type="button"
            variant="primary"
            size="md"
            className="flex-1 justify-center"
            loading={isDeclining}
            loadingText="Declining"
            disabled={!finalReason}
            onClick={() => void submit()}
          >
            {copy.decline.confirm}
          </DispatcherButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
