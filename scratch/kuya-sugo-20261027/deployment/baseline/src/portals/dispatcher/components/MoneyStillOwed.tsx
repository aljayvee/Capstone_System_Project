import React, { useCallback, useEffect, useState } from "react";
import { Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { Field, fieldInputClasses } from "@/components/panel/Field";
import {
  apiService,
  type ApiCashOutcome,
  type ApiMoneyOwed,
  type SettlementAdjustmentKind,
} from "../../../services/apiService";
import { formatPeso } from "../../../utils/format";
import { formatErrandId } from "../../../utils/formatErrandId";

/**
 * What happened to a short cash handover after the fact.
 *
 * The handover itself is never changed: it is what was counted at the door.
 * The rider paying it back, the customer paying by GCash, or a write-off is a
 * separate entry the server keeps beside it, and "still owed" is what is left.
 * The same choices appear in the Help Desk's Resolve box and in "Record
 * payment" on the Money still owed list.
 */

export type CashChoice = SettlementAdjustmentKind | "NOT_PAID_YET";

export interface CashChoiceValue {
  kind: CashChoice | null;
  amount: string;
  reference: string;
}

const CHOICES: Array<{ kind: CashChoice; label: string; hint: string }> = [
  { kind: "RIDER_PAID_BACK", label: "Rider paid it back", hint: "The rider handed over the missing cash." },
  { kind: "CUSTOMER_PAID_GCASH", label: "Customer paid it by GCash", hint: "Enter the GCash reference number." },
  { kind: "WRITTEN_OFF", label: "Written off", hint: "The business takes the loss." },
  { kind: "NOT_PAID_YET", label: "Not paid yet", hint: "It stays on Money still owed until it is paid." },
];

export const emptyCashChoice = (owed: number): CashChoiceValue => ({
  kind: null,
  amount: owed.toFixed(2),
  reference: "",
});

/** The same rules the server applies, so the person sees why before sending. */
export function cashChoiceError(value: CashChoiceValue, owed: number, allowNotPaid: boolean): string | null {
  if (!value.kind) return `Choose what happened to the ${formatPeso(owed)}.`;
  if (value.kind === "NOT_PAID_YET") return allowNotPaid ? null : "Choose what happened to the money.";
  const amount = Number(value.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount above zero.";
  if (amount > owed + 0.005) return `That is more than is still owed (${formatPeso(owed)}).`;
  if (value.kind === "CUSTOMER_PAID_GCASH" && !value.reference.trim()) {
    return "Enter the GCash reference number, so the payment can be checked.";
  }
  return null;
}

export function toCashOutcome(value: CashChoiceValue): ApiCashOutcome | null {
  if (!value.kind) return null;
  if (value.kind === "NOT_PAID_YET") return { kind: "NOT_PAID_YET" };
  return {
    kind: value.kind,
    amount: Math.round(Number(value.amount) * 100) / 100,
    reference: value.kind === "CUSTOMER_PAID_GCASH" ? value.reference.trim() : null,
  };
}

export function CashChoiceFields({
  owed,
  value,
  onChange,
  allowNotPaid,
  name,
  error,
}: {
  owed: number;
  value: CashChoiceValue;
  onChange: (next: CashChoiceValue) => void;
  allowNotPaid: boolean;
  /** Unique per form, so two open forms' radios do not share a group. */
  name: string;
  error?: string | null;
}) {
  const choices = allowNotPaid ? CHOICES : CHOICES.filter((c) => c.kind !== "NOT_PAID_YET");
  const takesAmount = value.kind !== null && value.kind !== "NOT_PAID_YET";

  return (
    <fieldset className="space-y-2" data-testid={`cash-choice-${name}`}>
      <legend className="mb-1.5 text-label font-semibold text-ink">
        What happened to the <span data-figure className="tabular-nums">{formatPeso(owed)}</span>?
      </legend>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {choices.map((c) => {
          const checked = value.kind === c.kind;
          return (
            <label
              key={c.kind}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-plate border px-3 py-2 transition-colors",
                checked ? "border-board-field bg-board-ground" : "border-edge bg-board-plate hover:border-board-trim"
              )}
            >
              <input
                type="radio"
                name={`cash-choice-${name}`}
                className="mt-1"
                checked={checked}
                onChange={() => onChange({ ...value, kind: c.kind })}
              />
              <span className="min-w-0">
                <span className="block text-body font-semibold text-ink">{c.label}</span>
                <span className="block text-label text-ink-muted">{c.hint}</span>
              </span>
            </label>
          );
        })}
      </div>

      {takesAmount ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Amount" hint={`Up to ${formatPeso(owed)}. Less leaves the rest owed.`} required>
            {(control) => (
              <input
                {...control}
                inputMode="decimal"
                value={value.amount}
                onChange={(ev) => onChange({ ...value, amount: ev.target.value.replace(/[^0-9.]/g, "") })}
                className={fieldInputClasses}
                data-testid={`cash-amount-${name}`}
              />
            )}
          </Field>
          {value.kind === "CUSTOMER_PAID_GCASH" ? (
            <Field label="GCash reference number" required>
              {(control) => (
                <input
                  {...control}
                  value={value.reference}
                  maxLength={40}
                  onChange={(ev) => onChange({ ...value, reference: ev.target.value })}
                  placeholder="e.g. 1012 345 678901"
                  className={fieldInputClasses}
                  data-testid={`cash-reference-${name}`}
                />
              )}
            </Field>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-label font-medium text-status-act-ink">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/** The Help Desk's "Money still owed" list, loaded once and reloaded after every change. */
export function useMoneyStillOwed() {
  const [rows, setRows] = useState<ApiMoneyOwed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const data = await apiService.getMoneyStillOwed();
    if (data) setRows(data);
    else setLoadError("Could not load the money still owed.");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, isLoading, loadError, reload };
}

export type MoneyStillOwed = ReturnType<typeof useMoneyStillOwed>;

const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const errorOf = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;

/** One short handover still owed: the figures, every entry so far, and Record payment. */
export function MoneyOwedRow({ row, onChanged }: { row: ApiMoneyOwed; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<CashChoiceValue>(() => emptyCashChoice(row.stillOwed));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [undoing, setUndoing] = useState<number | null>(null);

  const save = async () => {
    const problem = cashChoiceError(value, row.stillOwed, false);
    if (problem) {
      setError(problem);
      return;
    }
    const outcome = toCashOutcome(value);
    if (!outcome || outcome.kind === "NOT_PAID_YET") return;
    setBusy(true);
    setError(null);
    try {
      await apiService.recordSettlementPayment(row.errandId, {
        kind: outcome.kind,
        amount: outcome.amount ?? 0,
        reference: outcome.reference,
        note: note.trim() || null,
      });
      setOpen(false);
      setNote("");
      await onChanged();
    } catch (err) {
      setError(errorOf(err, "Could not record that. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const undo = async (adjustmentId: number) => {
    setUndoing(adjustmentId);
    setError(null);
    try {
      await apiService.undoSettlementPayment(row.errandId, adjustmentId);
      await onChanged();
    } catch (err) {
      setError(errorOf(err, "Could not undo that. Try again."));
    } finally {
      setUndoing(null);
    }
  };

  return (
    <li className="rounded-plate border border-edge bg-board-plate p-4" data-testid={`owed-${row.errandId}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-panel font-bold text-ink">Cash short</h3>
            <span data-figure className="rounded-trim border border-edge bg-board-ground/60 px-2 py-0.5 font-mono text-data font-bold tabular-nums">
              {row.referenceNo ?? formatErrandId(row.errandId)}
            </span>
            <span className="inline-flex items-center gap-1 text-label font-medium text-ink-muted">
              <User size={12} className="text-ink-muted/80" />
              <span>{row.riderName}</span>
            </span>
          </div>
          <p className="text-body text-ink">
            Should have handed over {formatPeso(row.expected)}, handed over {formatPeso(row.collected)}: short{" "}
            {formatPeso(row.short)}.
            {row.paidSoFar > 0 ? ` ${formatPeso(row.paidSoFar)} paid back since.` : ""}
            {row.writtenOff > 0 ? ` ${formatPeso(row.writtenOff)} written off.` : ""}
          </p>
          <div className="flex items-center gap-1.5 text-label text-ink-muted">
            <Clock size={12} className="text-ink-muted/80" />
            <span>Handed over {stamp(row.settledAt)}</span>
          </div>
          {row.adjustments.length > 0 ? (
            <ul className="space-y-1 pt-1" data-testid={`owed-history-${row.errandId}`}>
              {row.adjustments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-2 text-label">
                  <span className={cn("font-semibold text-ink", a.voided && "line-through text-ink-muted")}>
                    {a.label} {formatPeso(a.amount)}
                  </span>
                  <span className="text-ink-muted">
                    {stamp(a.recordedAt)} · {a.recordedBy}
                    {a.reference ? ` · ref ${a.reference}` : ""}
                    {a.voided ? " · undone" : ""}
                  </span>
                  {a.canUndo ? (
                    <DispatcherButton
                      variant="secondary"
                      size="sm"
                      loading={undoing === a.id}
                      loadingText="Undoing"
                      onClick={() => void undo(a.id)}
                      className="font-semibold"
                    >
                      Undo
                    </DispatcherButton>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="text-right">
            <span className="block text-micro font-semibold uppercase tracking-[0.06em] text-ink-muted">Still owed</span>
            <span
              data-figure
              className={cn(
                "font-mono text-data font-bold tabular-nums",
                row.stillOwed > 0 ? "text-status-act-ink" : "text-status-done-ink"
              )}
            >
              {formatPeso(row.stillOwed)}
            </span>
          </div>
          {!open && row.stillOwed > 0 ? (
            <DispatcherButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setValue(emptyCashChoice(row.stillOwed));
                setError(null);
                setOpen(true);
              }}
              className="font-semibold"
              data-testid={`record-payment-${row.errandId}`}
            >
              Record payment
            </DispatcherButton>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="mt-3 space-y-3 border-t border-hairline pt-3">
          <CashChoiceFields
            owed={row.stillOwed}
            value={value}
            onChange={(next) => {
              setValue(next);
              setError(null);
            }}
            allowNotPaid={false}
            name={row.errandId}
            error={error}
          />
          <Field label="Note" hint="Optional. Anyone checking the money later will read this.">
            {(control) => (
              <input
                {...control}
                value={note}
                maxLength={300}
                onChange={(ev) => setNote(ev.target.value)}
                className={fieldInputClasses}
              />
            )}
          </Field>
          <div className="flex gap-2">
            <DispatcherButton variant="primary" size="md" loading={busy} loadingText="Saving" onClick={() => void save()} className="font-bold">
              Save
            </DispatcherButton>
            <DispatcherButton variant="secondary" size="md" disabled={busy} onClick={() => setOpen(false)} className="font-semibold">
              Cancel
            </DispatcherButton>
          </div>
        </div>
      ) : error ? (
        <p role="alert" className="mt-2 text-label font-medium text-status-act-ink">
          {error}
        </p>
      ) : null}
    </li>
  );
}
