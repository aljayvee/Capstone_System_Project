import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { type ApiErrandException, type ExceptionKind } from "../../../services/apiService";
import { type OpenExceptions } from "../hooks/useOpenExceptions";
import { ExceptionEvidence } from "./ExceptionEvidence";
import { formatPeso } from "../../../utils/format";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelState } from "@/components/panel/PanelState";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { Field, fieldInputClasses } from "@/components/panel/Field";
import { useDraft } from "../lib/useDraft";

/** Plain names, so a reader never needs the enum to read the queue. */
const KIND_LABEL: Record<ExceptionKind, string> = {
  CASH_VARIANCE: "Cash variance",
  RECEIPT_DIVERGENCE: "Receipt divergence",
  UNVERIFIED_PURCHASE: "Unverified purchase",
  WRONG_BRANCH: "Wrong branch",
  MISSING_RECEIPT: "No receipt at a stop",
  STALLED_STOP: "Long stop",
  // The dispatcher's version is an instruction, not a category: this queue is
  // today's work, and a rider is standing at a door waiting for someone here to
  // ring the customer.
  OVERAGE_PENDING: "Goods held, call the customer",
  UNPAID_BALANCE: "Balance never collected",
};

/**
 * Errands that did not reconcile and nobody has decided on yet.
 *
 * Clearing one demands a reason. That is the difference between a control and a
 * list: an exception cleared with nothing said is weak evidence later, which is
 * exactly when it gets read.
 *
 * Three defects fixed here, all of which mattered because this screen is about
 * money.
 *
 * The all-clear was a lie waiting to happen. "Everything reconciles. Nothing is
 * waiting on you." rendered whenever the array was empty, and the array was
 * empty when the request failed. It is now gated on `isConfirmedClear`, which
 * means loaded, no failure, and genuinely nothing open.
 *
 * The reason box was shared state. One `reason` string served every row and was
 * reset on opening another, so a half-typed justification on one exception was
 * destroyed by clicking "Clear this" on a different one. Both the draft and the
 * error are now keyed per row.
 *
 * "Clear this" was an 11px underlined text link with no padding, about 16px
 * tall, and it is this panel's primary action.
 */
export const ExceptionQueuePanel: React.FC<{ queue: OpenExceptions }> = ({ queue }) => {
  const { exceptions, totalAtRisk, isLoading, loadError, isConfirmedClear, reload, resolve } = queue;
  const [resolving, setResolving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const keyOf = (e: ApiErrandException) => `${e.errandId}:${e.kind}`;

  return (
    <PanelShell
      title="Needs a decision"
      figure={{
        label: "Open",
        // A dash when the queue never loaded, so this cannot report a
        // confident zero over money nobody has reconciled.
        value: queue.isLoading || queue.loadError ? "--" : String(queue.openCount),
        urgent: queue.openCount > 0,
      }}
      detail={
        totalAtRisk > 0
          ? `${formatPeso(totalAtRisk)} is held against these runs`
          : "Runs that did not reconcile and nobody has decided on yet"
      }
      aside={
        <DispatcherButton
          variant="secondary"
          size="sm"
          iconOnly
          aria-label="Refresh the queue"
          icon={<RefreshCw size={15} />}
          onClick={() => void reload()}
        />
      }
    >
      <PanelState
        isLoading={isLoading}
        error={loadError}
        onRetry={() => void reload()}
        isEmpty={isConfirmedClear}
        emptyTitle="Everything reconciles"
        emptyBody="Nothing is waiting on you. Every run that came through has been accounted for."
        errorTitle="The exception queue did not load"
        loadingRows={3}
      >
        <ul className="space-y-2" data-testid="exception-queue">
          {exceptions.map((e) => {
            const key = keyOf(e);
            const isResolving = resolving === key;

            return (
              <li
                key={key}
                className="rounded-plate border border-edge bg-board-plate p-4"
                data-testid={`exception-${key}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-panel text-ink">{KIND_LABEL[e.kind]}</h3>
                      <span data-figure className="font-mono text-label text-ink-muted">
                        {e.errandId.slice(0, 8)}
                      </span>
                      {e.riderName ? (
                        <span className="text-label text-ink-muted">{e.riderName}</span>
                      ) : null}
                    </div>
                    <p className="text-body text-ink">{e.detail}</p>
                    <p data-figure className="text-label text-ink-muted">
                      {new Date(e.occurredAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {e.amountAtRisk > 0 ? (
                      <span data-figure className="font-mono text-data text-status-act-ink">
                        {formatPeso(e.amountAtRisk)}
                      </span>
                    ) : null}
                    {!isResolving ? (
                      <DispatcherButton
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setResolving(key);
                          setErrors((prev) => ({ ...prev, [key]: null }));
                        }}
                        data-testid={`resolve-${key}`}
                      >
                        Clear this
                      </DispatcherButton>
                    ) : null}
                  </div>
                </div>

                {/* The evidence, beside the claim about it. A variance nobody can
                    see the receipt for is a number, not a finding. */}
                <div className="mt-2.5">
                  <ExceptionEvidence errandId={e.errandId} kind={e.kind} />
                </div>

                {isResolving ? (
                  <ResolveForm
                    rowKey={key}
                    busy={busy}
                    error={errors[key] ?? null}
                    onCancel={() => {
                      setResolving(null);
                      setErrors((prev) => ({ ...prev, [key]: null }));
                    }}
                    onSubmit={async (reason) => {
                      if (reason.trim().length < 3) {
                        setErrors((prev) => ({ ...prev, [key]: "Say why this is being cleared." }));
                        return false;
                      }
                      setBusy(true);
                      setErrors((prev) => ({ ...prev, [key]: null }));
                      try {
                        await resolve(e.errandId, e.kind, reason.trim(), e.amountAtRisk);
                        setResolving(null);
                        return true;
                      } catch (err: any) {
                        setErrors((prev) => ({
                          ...prev,
                          [key]: err?.response?.data?.error ?? "Could not record that. Try again.",
                        }));
                        return false;
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </PanelState>
    </PanelShell>
  );
};

/**
 * Split out so the draft is keyed by row: this text becomes the audit trail for
 * money held against a customer, and it survives switching tabs mid-sentence.
 */
function ResolveForm({
  rowKey,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  rowKey: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
}) {
  const [reason, setReason, clearReason] = useDraft(`exception-reason:${rowKey}`);

  return (
    <div className="mt-3 border-t border-hairline pt-3">
      <Field
        label="Why is this being cleared?"
        error={error}
        hint="This is the record anyone reviewing the money will read."
        required
      >
        {(control) => (
          <input
            {...control}
            autoFocus
            value={reason}
            onChange={(ev) => setReason(ev.target.value)}
            placeholder="The customer paid the balance in cash on the doorstep"
            maxLength={500}
            className={fieldInputClasses}
            data-testid="resolve-reason"
          />
        )}
      </Field>

      <div className="mt-2 flex gap-2">
        <DispatcherButton
          variant="primary"
          size="md"
          loading={busy}
          loadingText="Recording"
          onClick={async () => {
            const ok = await onSubmit(reason);
            if (ok) clearReason();
          }}
          data-testid="resolve-confirm"
        >
          Record it
        </DispatcherButton>
        <DispatcherButton variant="secondary" size="md" disabled={busy} onClick={onCancel}>
          Cancel
        </DispatcherButton>
      </div>
    </div>
  );
}
