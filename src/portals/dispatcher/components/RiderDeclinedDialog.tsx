import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, UserRoundX, UserRoundCheck, X } from "lucide-react";
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
import { useOptionalPermissions } from "../../../context/PermissionsContext";
import { formatErrandId } from "../../../utils/formatErrandId";
import { assignRiderErrorText, assignRiderNow } from "../lib/assignRiderNow";
import type { RiderDeclinedAlert } from "../hooks/useDispatcherPortal";

/**
 * A rider turned down an errand and the server did not send it on by itself:
 * three riders have declined or not answered, nobody else can take it, or the
 * offer was too old to send on. Mounted once in the portal shell, so it opens
 * over whatever the dispatcher is looking at.
 *
 * The errands queue up oldest first and the dialog shows one at a time. Re-assign
 * asks the server to pick again; the server keeps every rider who declined this
 * errand off the list. Closing is "later": the errand stays without a rider and
 * the bell keeps its row.
 */

interface RiderDeclinedDialogProps {
  alerts: RiderDeclinedAlert[];
  onDismiss: (errandId: string) => void;
  onOpenErrand: (errandId: string) => void;
}

const WHY_TEXT: Record<RiderDeclinedAlert["why"], (a: RiderDeclinedAlert) => string> = {
  CAP_REACHED: (a) =>
    `${a.attempts} riders have declined or not answered, so the system stopped offering it on its own.`,
  NO_RIDER: () => "No other rider was free to take it, so the system could not offer it on.",
  OFFER_TOO_OLD: () => "The offer was too old to send on to another rider by itself.",
};

export function RiderDeclinedDialog({ alerts, onDismiss, onOpenErrand }: RiderDeclinedDialogProps) {
  const current = alerts[0] ?? null;
  const waiting = alerts.length - 1;
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const permissions = useOptionalPermissions();
  const canAssign = !permissions || permissions.can("errands.assign");

  // A fresh error area for each errand shown.
  const currentId = current?.errandId;
  useEffect(() => {
    setError(null);
  }, [currentId]);

  if (!current) return null;
  const ref = formatErrandId(current.errandId);

  const reassign = async () => {
    setIsAssigning(true);
    setError(null);
    try {
      const { riderName } = await assignRiderNow(current.errandId);
      toast.success(`${riderName} was offered order #${ref}.`);
      onDismiss(current.errandId);
    } catch (err) {
      // Stays open with the server's reason, and Re-assign stays for a retry.
      setError(assignRiderErrorText(err, "Could not re-assign right now. Try again in a moment."));
    } finally {
      setIsAssigning(false);
    }
  };

  const what =
    current.kind === "EXPIRED"
      ? `${current.riderName} did not answer the offer in time.`
      : `${current.riderName} declined this errand${current.reason ? `: "${current.reason}"` : "."}`;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !isAssigning) onDismiss(current.errandId);
      }}
    >
      <DialogContent
        role="alertdialog"
        data-surface="dispatch"
        className="rounded-modal border border-edge bg-board-plate shadow-plate"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-panel font-bold text-ink">
            <UserRoundX className="shrink-0 text-status-act-ink" size={18} aria-hidden />
            Order #{ref} needs a rider
          </DialogTitle>
          <DialogClose
            aria-label="Close, decide later"
            disabled={isAssigning}
            className="grid size-9 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:bg-board-ground hover:text-ink disabled:cursor-not-allowed"
          >
            <X size={18} />
          </DialogClose>
        </DialogHeader>

        <DialogDescription className="space-y-2 text-body text-ink">
          <span className="block break-words">{what}</span>
          <span className="block text-ink-muted">{WHY_TEXT[current.why](current)}</span>
        </DialogDescription>

        {!canAssign && (
          <p className="m-0 text-label text-ink-muted">
            Your access group does not include assigning riders. The Main Owner can change it.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="m-0 break-words rounded-plate border border-status-act-ink/30 bg-status-act-fill px-3 py-2 text-label font-medium text-status-act-ink"
          >
            {error}
          </p>
        )}

        <DialogFooter className="flex-col-reverse gap-3 sm:flex-row">
          <DispatcherButton
            type="button"
            variant="secondary"
            size="md"
            className="flex-1 font-semibold"
            icon={<ExternalLink size={16} aria-hidden />}
            disabled={isAssigning}
            onClick={() => {
              onOpenErrand(current.errandId);
              onDismiss(current.errandId);
            }}
          >
            Open errand
          </DispatcherButton>
          <DispatcherButton
            type="button"
            variant="success"
            size="md"
            className="flex-1 justify-center font-bold tracking-[0.02em]"
            icon={<UserRoundCheck size={16} aria-hidden />}
            loading={isAssigning}
            loadingText="Finding a rider"
            disabled={!canAssign}
            onClick={() => void reassign()}
          >
            Re-assign
          </DispatcherButton>
        </DialogFooter>

        {waiting > 0 && (
          <p className="m-0 text-center text-label text-ink-muted">
            {waiting === 1 ? "1 more errand needs a rider after this one." : `${waiting} more errands need a rider after this one.`}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
