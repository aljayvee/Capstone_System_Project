import React, { useEffect, useRef, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { apiService, type ApiErrandException, type ExceptionKind } from "../../../services/apiService";
import { cn } from "@/lib/utils";
import { type OpenExceptions } from "../hooks/useOpenExceptions";
import { ExceptionEvidence } from "./ExceptionEvidence";
import { formatPeso } from "../../../utils/format";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelState } from "@/components/panel/PanelState";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { Field, fieldInputClasses } from "@/components/panel/Field";
import { useDraft } from "../lib/useDraft";
import { useDispatcherAiSettings } from "../hooks/useDispatcherAiSettings";

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
      title="Conflict Management"
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
                    exception={e}
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
/**
 * Where the model's suggestion stands for one reason box.
 *
 * `filled` put the suggestion into an empty box. `offered` holds it beside
 * words the dispatcher had already typed, because a suggestion that arrives
 * while someone is writing must never replace what they wrote. `unsure` is the
 * model answering below 0.75, which is a real answer ("I do not know"), not a
 * failure, and reads differently from `failed`.
 */
type SuggestState =
  | { status: "idle" }
  | { status: "loading" }
  // checkedBy: the large model that picked the same reason ("Gemini 3.8 Flash").
  | { status: "filled"; confidence: number; checkedBy?: string }
  | { status: "offered"; text: string; confidence: number; checkedBy?: string }
  // noneFits: the large model that found none of the reasons fits.
  | { status: "unsure"; confidence: number; threshold: number; noneFits?: string }
  | { status: "failed" };

/** Floored, so 0.748 never reads as "75% sure, needs 75%". */
const percent = (p: number) => `${Math.floor(p * 100)}%`;

function ResolveForm({
  rowKey,
  exception,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  rowKey: string;
  exception: ApiErrandException;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
}) {
  const { aiSuggestionsEnabled } = useDispatcherAiSettings();
  const [reason, setReason, clearReason] = useDraft(`exception-reason:${rowKey}`);
  const [suggest, setSuggest] = useState<SuggestState>({ status: "idle" });

  // The box as it is NOW, read after the request returns. The value captured
  // when the request started would miss anything typed while it was in flight.
  const reasonNow = useRef(reason);
  reasonNow.current = reason;
  // A Cancel mid-request must not have the answer land in the draft store
  // afterwards and reappear the next time this row is opened.
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const generate = async () => {
    if (suggest.status === "loading") return;
    setSuggest({ status: "loading" });

    const result = await apiService.suggestExceptionReason(
      exception.errandId,
      exception.kind,
      exception.occurredAt
    );
    if (!mounted.current) return;

    const second = result?.secondOpinion ?? null;
    const checkedBy = second && second.reasonCode === result?.reasonCode ? second.label : undefined;
    if (!result) {
      setSuggest({ status: "failed" });
    } else if (!result.confident || !result.suggestion) {
      setSuggest({
        status: "unsure",
        confidence: result.confidence,
        threshold: result.threshold,
        noneFits: second && second.reasonCode === null ? second.label : undefined,
      });
    } else if (reasonNow.current.trim() === "") {
      setReason(result.suggestion);
      setSuggest({ status: "filled", confidence: result.confidence, checkedBy });
    } else {
      setSuggest({ status: "offered", text: result.suggestion, confidence: result.confidence, checkedBy });
    }
  };

  // Tab asks for a suggestion only while the box is empty, suggestions are
  // enabled, and the model has not already answered "unsure" or failed.
  // Every other Tab moves focus as normal, so a keyboard user is never trapped.
  const tabGenerates =
    aiSuggestionsEnabled &&
    reason.trim() === "" &&
    (suggest.status === "idle" || suggest.status === "filled");

  return (
    <div className="mt-3 border-t border-hairline pt-3">
      <Field
        label="Why is this being cleared?"
        error={error}
        hint="This is the record anyone reviewing the money will read."
        required
      >
        {(control) => (
          <textarea
            {...control}
            autoFocus
            rows={2}
            value={reason}
            onChange={(ev) => setReason(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key !== "Tab" || ev.shiftKey || ev.altKey || ev.ctrlKey || ev.metaKey) return;
              if (!tabGenerates) return;
              ev.preventDefault();
              void generate();
            }}
            placeholder={
              aiSuggestionsEnabled
                ? "What happened? Press Tab for a suggestion"
                : "What happened? Describe the discrepancy resolution"
            }
            maxLength={500}
            // A suggestion is a full sentence; a one-line input showed its
            // first few words and scrolled the rest out of sight.
            className={cn(fieldInputClasses, "resize-y py-2")}
            data-testid="resolve-reason"
          />
        )}
      </Field>

      {aiSuggestionsEnabled && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <DispatcherButton
              variant="secondary"
              size="sm"
              icon={<Sparkles size={14} />}
              loading={suggest.status === "loading"}
              loadingText="Generating"
              disabled={busy}
              onClick={() => void generate()}
              data-testid="suggest-reason"
            >
              Generate suggestion
            </DispatcherButton>
            <span className="text-label text-ink-muted">
              or press{" "}
              <kbd className="rounded-trim border border-edge bg-board-ground px-1.5 py-0.5 font-mono text-micro text-ink">
                Tab
              </kbd>{" "}
              in the empty box
            </span>
          </div>
          <p className="mt-1 m-0 text-micro text-ink opacity-50">
            Model can make mistakes. Please verify the suggested reason against the receipt and rider notes before updating.
          </p>

          <div aria-live="polite" data-testid="suggest-status">
            <SuggestionStatus
              state={suggest}
              boxIsEmpty={reason.trim() === ""}
              onUse={(text, confidence, checkedBy) => {
                setReason(text);
                setSuggest({ status: "filled", confidence, checkedBy });
              }}
            />
          </div>
        </>
      )}

      <div className="mt-3 flex gap-2">
        <DispatcherButton
          variant="primary"
          size="md"
          loading={busy}
          loadingText="Updating"
          onClick={async () => {
            const ok = await onSubmit(reason);
            if (ok) clearReason();
          }}
          data-testid="resolve-confirm"
        >
          Update
        </DispatcherButton>
        <DispatcherButton variant="secondary" size="md" disabled={busy} onClick={onCancel}>
          Cancel
        </DispatcherButton>
      </div>
    </div>
  );
}

/**
 * What the model said, in words. Every answer is attributed without exposing
 * internal model identifiers: a reason that becomes the audit record should
 * always prompt the dispatcher to verify against the evidence.
 */
function SuggestionStatus({
  state,
  boxIsEmpty,
  onUse,
}: {
  state: SuggestState;
  boxIsEmpty: boolean;
  onUse: (text: string, confidence: number, checkedBy?: string) => void;
}) {
  switch (state.status) {
    case "filled":
      // Emptied by hand: the note would describe text that is no longer there.
      if (boxIsEmpty) return null;
      return (
        <p className="mt-1.5 flex items-start gap-1.5 text-label text-ink-muted">
          <Sparkles size={13} className="mt-0.5 shrink-0" />
          <span>
            Suggested based on settlement figures and rider notes ({percent(state.confidence)}{" "}
            confidence). Please review against the receipt evidence and adjust any details if needed.
          </span>
        </p>
      );

    case "offered":
      return (
        <div className="mt-2 rounded-trim border border-edge bg-board-ground px-3 py-2">
          <p className="flex items-center gap-1.5 text-micro uppercase text-ink-muted">
            <Sparkles size={12} className="shrink-0" />
            Suggested reason &bull; {percent(state.confidence)} confidence
          </p>
          <p className="mt-1 text-body text-ink">{state.text}</p>
          <div className="mt-2">
            <DispatcherButton
              variant="secondary"
              size="sm"
              onClick={() => onUse(state.text, state.confidence, state.checkedBy)}
              data-testid="use-suggestion"
            >
              Use this instead
            </DispatcherButton>
          </div>
        </div>
      );

    case "unsure":
      // When the evidence and rider notes do not match any standard category:
      if (state.noneFits) {
        return (
          <p className="mt-1.5 text-label text-status-waiting-ink">
            The settlement figures and rider notes do not match a standard reason pattern. Please
            describe what happened manually.
          </p>
        );
      }
      return (
        <p className="mt-1.5 text-label text-status-waiting-ink">
          Not enough evidence for an automatic suggestion ({percent(state.confidence)} confidence;{" "}
          {percent(state.threshold)} required). Please enter the resolution reason manually.
        </p>
      );

    case "failed":
      return (
        <p role="alert" className="mt-1.5 text-label text-status-act-ink">
          Could not generate a suggestion right now. Please try again or enter the reason manually.
        </p>
      );

    default:
      return null;
  }
}
