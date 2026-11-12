import { Bike, Check, Circle } from "lucide-react";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { copy } from "../copy";
import { RiderAvailabilityList } from "../RiderAvailabilityList";

/**
 * Step 3, assign a rider.
 *
 * The button is ALWAYS enabled and always says what the dispatcher wants
 * ("Assign a rider"), never what is stopping them ("Locked"). The server picks
 * the rider; the list under it shows who is around, for reference.
 *
 * A disabled primary is the most common dead end in a wizard: it is
 * low-contrast, gives no feedback when pressed, and on touch cannot show a
 * tooltip — so someone who doesn't already know what is missing has no way to
 * find out. They tap it, nothing happens, and the product looks broken rather
 * than strict. Here the tap becomes navigation: `onBlocked` opens the first
 * unfinished stage and highlights it.
 */

interface Stage5Props {
  canSend: boolean;
  isAssigning: boolean;
  riderName: string | null;
  customerFirstName: string;
  hasPins: boolean;
  isCustomerConfirmed: boolean;
  isPaymentConfirmed: boolean;
  onSend: () => void;
  onBlocked: () => void;
  readOnly?: boolean;
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-2 py-0.5 text-label font-medium ${
        met ? "text-status-done-ink" : "text-status-waiting-ink"
      }`}
    >
      {met ? (
        <Check size={13} className="shrink-0" strokeWidth={2.5} />
      ) : (
        <Circle size={10} className="shrink-0" />
      )}
      {label}
    </li>
  );
}

export function Stage5SendRider({
  canSend,
  isAssigning,
  riderName,
  customerFirstName,
  hasPins,
  isCustomerConfirmed,
  isPaymentConfirmed,
  onSend,
  onBlocked,
  readOnly = false,
}: Stage5Props) {
  if (readOnly || riderName) {
    return (
      <p className="m-0 text-body text-ink-muted">
        {riderName ? copy.status.riderAssigned(riderName) : "No rider was sent."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <DispatcherButton
        variant="success"
        size="lg"
        loading={isAssigning}
        loadingText={copy.stage5.sending}
        icon={<Bike size={16} />}
        onClick={canSend ? onSend : onBlocked}
        className="w-full justify-center font-bold tracking-[0.02em] shadow-plate"
      >
        {copy.stage5.send}
      </DispatcherButton>

      {!canSend && (
        <div className="rounded-plate border border-status-waiting-ink/30 bg-status-waiting-fill px-3.5 py-2.5">
          <p className="m-0 mb-1.5 text-label font-bold text-status-waiting-ink">
            {copy.stage5.missingTitle}
          </p>
          <ul className="m-0 p-0 list-none space-y-0.5">
            <Requirement met={hasPins} label={copy.stage5.missingStores} />
            <Requirement
              met={isCustomerConfirmed}
              label={copy.stage5.missingApproval(customerFirstName)}
            />
            <Requirement met={isPaymentConfirmed} label={copy.stage5.missingPayment} />
          </ul>
        </div>
      )}

      <RiderAvailabilityList />
    </div>
  );
}
