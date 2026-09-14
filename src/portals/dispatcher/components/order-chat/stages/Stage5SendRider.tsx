import * as React from "react";
import { Bike, Check, Circle } from "lucide-react";
import { DispatcherButton } from "../../ui/DispatcherButton";
import { copy } from "../copy";

/**
 * Stage 5 — send a rider.
 *
 * The button is ALWAYS enabled and always says what the dispatcher wants
 * ("Send a rider"), never what is stopping them ("Locked").
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
  /**
   * True unless this errand is on the downpayment plan and the money has not
   * landed. No rider goes out to front the company's cash on a basket nobody
   * has paid a peso towards.
   */
  isUpfrontConfirmed: boolean;
  onSend: () => void;
  onBlocked: () => void;
  readOnly?: boolean;
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-2 text-[11px] py-0.5 ${
        met ? "text-emerald-800 font-bold" : "text-amber-900"
      }`}
    >
      {met ? (
        <Check size={12} className="shrink-0" strokeWidth={3} />
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
  isUpfrontConfirmed,
  onSend,
  onBlocked,
  readOnly = false,
}: Stage5Props) {
  if (readOnly || riderName) {
    return (
      <p className="text-[11px] text-slate-600 m-0">
        {riderName ? copy.status.riderAssigned(riderName) : "No rider was sent."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500 m-0">{copy.stage5.intro}</p>

      <DispatcherButton
        variant="success"
        size="lg"
        loading={isAssigning}
        loadingText={copy.stage5.sending}
        icon={<Bike size={16} />}
        onClick={canSend ? onSend : onBlocked}
        className="w-full justify-center"
      >
        {copy.stage5.send}
      </DispatcherButton>

      {!canSend && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <p className="text-[11px] font-extrabold text-amber-900 m-0 mb-1">
            {copy.stage5.missingTitle}
          </p>
          <ul className="m-0 p-0 list-none">
            <Requirement met={hasPins} label={copy.stage5.missingStores} />
            <Requirement
              met={isCustomerConfirmed}
              label={copy.stage5.missingApproval(customerFirstName)}
            />
            <Requirement met={isPaymentConfirmed} label={copy.stage5.missingPayment} />
            {/* Only shown when it can actually be unmet — a COD errand has no
                downpayment, and listing a requirement that never applies makes
                the whole list read as boilerplate. */}
            {!isUpfrontConfirmed && (
              <Requirement met={false} label={copy.stage5.missingUpfront} />
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
