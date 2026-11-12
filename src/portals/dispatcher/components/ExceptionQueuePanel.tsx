import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock, Copy, RefreshCw, Sparkles, User } from "lucide-react";
import { apiService, type ApiCashOutcome, type ApiMoneyOwed, type ExceptionKind } from "../../../services/apiService";
import { cn } from "@/lib/utils";
import { type ExceptionGroup, type OpenExceptions } from "../hooks/useOpenExceptions";
import { ExceptionEvidence } from "./ExceptionEvidence";
import { formatPeso } from "../../../utils/format";
import { formatErrandId } from "../../../utils/formatErrandId";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelState } from "@/components/panel/PanelState";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherSearchField } from "@/components/panel/DispatcherSearchField";
import { DispatcherFilterToolbar } from "./DispatcherFilterToolbar";
import { Field, fieldInputClasses } from "@/components/panel/Field";
import { useDraft } from "../lib/useDraft";
import { useDispatcherAiSettings } from "../hooks/useDispatcherAiSettings";
import {
  CashChoiceFields,
  MoneyOwedRow,
  cashChoiceError,
  emptyCashChoice,
  toCashOutcome,
  useMoneyStillOwed,
  type CashChoiceValue,
} from "./MoneyStillOwed";

const formatTimestamp = (dateStr?: string | null) => {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Recently";
  }
};

/** Plain names, so a reader never needs the enum, or accounting, to read the queue. */
const KIND_LABEL: Record<ExceptionKind, string> = {
  CASH_VARIANCE: "Cash short or over",
  RECEIPT_DIVERGENCE: "Receipt amount does not match",
  UNVERIFIED_PURCHASE: "Purchase with no receipt",
  WRONG_BRANCH: "Bought at a different store",
  MISSING_RECEIPT: "No receipt for a stop",
  STALLED_STOP: "Rider stayed too long at a store",
  // The dispatcher's version is an instruction, not a category: this queue is
  // today's work, and a rider is standing at a door waiting for someone here to
  // ring the customer.
  OVERAGE_PENDING: "Items on hold: call the customer",
  UNPAID_BALANCE: "Balance not paid",
  // An instruction too: the rider is holding goods nobody will pay for, and
  // someone here has to decide whether they go back to the store.
  CANCELLED_AFTER_PURCHASE: "Cancelled after buying: decide on the items",
};

type SortKey = "urgent" | "oldest" | "newest" | "riderAsc" | "riderDesc";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "urgent", label: "Most money first" },
  { key: "oldest", label: "Oldest first" },
  { key: "newest", label: "Newest first" },
  { key: "riderAsc", label: "Rider name A to Z" },
  { key: "riderDesc", label: "Rider name Z to A" },
];

/** When a row last changed: its newest member, since a group can grow. */
const latestAt = (g: ExceptionGroup) =>
  Math.max(...g.members.map((m) => new Date(m.occurredAt).getTime()).filter((t) => !Number.isNaN(t)), 0);
const oldestAt = (g: ExceptionGroup) => new Date(g.occurredAt).getTime() || 0;

/**
 * Every word of the query must appear in the order number (with or without
 * its dashes) or the rider's name, so "juan 0003" finds Juan's order ...-0003.
 */
export function matchesHelpDeskQuery(g: ExceptionGroup, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const ref = formatErrandId(g.errandId).toLowerCase();
  const haystack = [ref, ref.replace(/-/g, ""), g.errandId.toLowerCase(), (g.riderName ?? "").toLowerCase()].join(" ");
  return words.every((w) => haystack.includes(w));
}

/** The same search for the Money still owed list: order number or rider name. */
function matchesOwedQuery(row: ApiMoneyOwed, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const ref = (row.referenceNo ?? formatErrandId(row.errandId)).toLowerCase();
  const haystack = [ref, ref.replace(/-/g, ""), row.errandId.toLowerCase(), row.riderName.toLowerCase()].join(" ");
  return words.every((w) => haystack.includes(w));
}

/** The same sorts for Money still owed; "urgent" there means the most still owed first. */
function sortOwed(rows: ApiMoneyOwed[], sort: SortKey): ApiMoneyOwed[] {
  const at = (r: ApiMoneyOwed) => new Date(r.settledAt).getTime() || 0;
  const copy = [...rows];
  switch (sort) {
    case "urgent":
      return copy.sort((a, b) => b.stillOwed - a.stillOwed || at(a) - at(b));
    case "oldest":
      return copy.sort((a, b) => at(a) - at(b));
    case "newest":
      return copy.sort((a, b) => at(b) - at(a));
    case "riderAsc":
    case "riderDesc": {
      const dir = sort === "riderAsc" ? 1 : -1;
      return copy.sort(
        (a, b) => dir * a.riderName.localeCompare(b.riderName, undefined, { sensitivity: "base" }) || at(a) - at(b)
      );
    }
  }
}

/**
 * "urgent" keeps the server's order (most money first, then oldest). Riders
 * sort by name with rows that have no rider kept last either way, and ties
 * fall back to oldest first so the order never shuffles between refreshes.
 */
export function sortHelpDesk(groups: ExceptionGroup[], sort: SortKey): ExceptionGroup[] {
  if (sort === "urgent") return groups;
  const byOldest = (a: ExceptionGroup, b: ExceptionGroup) => oldestAt(a) - oldestAt(b);
  const copy = [...groups];
  switch (sort) {
    case "oldest":
      return copy.sort(byOldest);
    case "newest":
      return copy.sort((a, b) => latestAt(b) - latestAt(a) || byOldest(a, b));
    case "riderAsc":
    case "riderDesc": {
      const dir = sort === "riderAsc" ? 1 : -1;
      return copy.sort((a, b) => {
        if (!a.riderName && !b.riderName) return byOldest(a, b);
        if (!a.riderName) return 1;
        if (!b.riderName) return -1;
        return dir * a.riderName.localeCompare(b.riderName, undefined, { sensitivity: "base" }) || byOldest(a, b);
      });
    }
  }
}

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
 *
 * Rows are groups (see ExceptionGroup): every exception of one kind on one
 * errand is one row, because one reason clears them all.
 */
export const ExceptionQueuePanel: React.FC<{ queue: OpenExceptions }> = ({ queue }) => {
  const { groups, totalAtRisk, isLoading, loadError, isConfirmedClear, reload, resolve } = queue;
  const [resolving, setResolving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("urgent");
  // Open problems, or shorts already cleared whose money is still owed.
  const [view, setView] = useState<"open" | "owed">("open");
  const owed = useMoneyStillOwed();

  const shown = useMemo(
    () => sortHelpDesk(groups.filter((g) => matchesHelpDeskQuery(g, query)), sort),
    [groups, query, sort]
  );
  // A short still open above is answered in its own Resolve box; it joins the
  // owed list once cleared, so one short is never listed twice.
  const owedRows = useMemo(() => {
    const openShorts = new Set(groups.filter((g) => g.kind === "CASH_VARIANCE").map((g) => g.errandId));
    return owed.rows.filter((r) => !openShorts.has(r.errandId));
  }, [groups, owed.rows]);
  const shownOwed = useMemo(
    () => sortOwed(owedRows.filter((r) => matchesOwedQuery(r, query)), sort),
    [owedRows, query, sort]
  );
  const searching = query.trim() !== "";
  const owedCount = owedRows.filter((r) => r.stillOwed > 0).length;

  return (
    <PanelShell
      title="Help Desk"
      detail={
        totalAtRisk > 0
          ? `${formatPeso(totalAtRisk)} is involved in these orders`
          : "Orders with a problem that someone needs to look at"
      }
      controls={
        <DispatcherFilterToolbar
          search={
            <DispatcherSearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order number or rider"
              aria-label="Search the Help Desk by order number or rider name"
            />
          }
          actions={
          <DispatcherButton
            variant="secondary"
            size="sm"
            iconOnly
            aria-label="Refresh the queue"
            icon={<RefreshCw size={15} />}
            onClick={() => void reload()}
          />
          }
          filters={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5" role="group" aria-label="Help Desk lists">
              {(
                [
                  { id: "open", label: "Open problems", count: isLoading || loadError ? "--" : String(groups.length) },
                  { id: "owed", label: "Money still owed", count: owed.isLoading || owed.loadError ? "--" : String(owedCount) },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setView(tab.id)}
                  aria-pressed={view === tab.id}
                  data-testid={`helpdesk-view-${tab.id}`}
                  className={cn(
                    "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-trim border px-3 text-micro font-semibold uppercase tracking-[0.06em] transition-colors",
                    view === tab.id
                      ? "border-board-field bg-board-field text-board-plate"
                      : "border-edge bg-board-plate text-ink-muted hover:border-board-trim hover:text-ink"
                  )}
                >
                  <span>{tab.label}</span>
                  <span data-figure className="font-mono tabular-nums font-bold">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <span className="text-label text-ink-muted" aria-live="polite">
              {searching && view === "open" && !isLoading && !loadError
                ? `${shown.length} of ${groups.length} shown`
                : searching && view === "owed" && !owed.isLoading && !owed.loadError
                  ? `${shownOwed.length} of ${owedRows.length} shown`
                  : null}
            </span>
          </div>
          }
          sort={<label className="flex items-center gap-2 text-micro font-semibold uppercase tracking-[0.06em] text-ink-muted">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="min-h-9 cursor-pointer rounded-trim border border-edge bg-board-plate px-2 text-label normal-case text-ink transition-colors hover:border-board-trim"
              data-testid="helpdesk-sort"
            >
              {SORTS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>}
        />
      }
    >
      {view === "owed" ? (
        <PanelState
          isLoading={owed.isLoading}
          error={owed.loadError}
          onRetry={() => void owed.reload()}
          isEmpty={owedRows.length === 0}
          emptyTitle="Nothing is owed"
          emptyBody="Every short cash handover has been paid back or written off."
          errorTitle="Money still owed did not load"
          loadingRows={3}
        >
          {searching && shownOwed.length === 0 ? (
            <div className="rounded-plate border border-edge bg-board-plate p-6 text-center">
              <p className="text-body font-semibold text-ink">Nothing matches "{query.trim()}"</p>
              <div className="mt-3 flex justify-center">
                <DispatcherButton variant="secondary" size="sm" onClick={() => setQuery("")} className="font-semibold">
                  Clear search
                </DispatcherButton>
              </div>
            </div>
          ) : null}
          <ul className="space-y-2.5" data-testid="money-still-owed">
            {shownOwed.map((row) => (
              <MoneyOwedRow key={row.errandId} row={row} onChanged={owed.reload} />
            ))}
          </ul>
        </PanelState>
      ) : (
      <PanelState
        isLoading={isLoading}
        error={loadError}
        onRetry={() => void reload()}
        isEmpty={isConfirmedClear}
        emptyTitle="No problems right now"
        emptyBody="Every order checks out. Nothing is waiting for you."
        errorTitle="The Help Desk did not load"
        loadingRows={3}
      >
        {searching && shown.length === 0 ? (
          <div className="rounded-plate border border-edge bg-board-plate p-6 text-center" data-testid="helpdesk-no-match">
            <p className="text-body font-semibold text-ink">Nothing matches "{query.trim()}"</p>
            <p className="mt-1 text-label text-ink-muted">Try part of the order number, or the rider's first or last name.</p>
            <div className="mt-3 flex justify-center">
              <DispatcherButton variant="secondary" size="sm" onClick={() => setQuery("")} className="font-semibold">
                Clear search
              </DispatcherButton>
            </div>
          </div>
        ) : null}
        <ul className="space-y-2.5" data-testid="exception-queue">
          {shown.map((e) => {
            const key = e.key;
            const isResolving = resolving === key;
            const count = e.members.length;

            return (
              <li
                key={key}
                className={cn(
                  "rounded-plate p-4 transition-all",
                  isResolving
                    ? "border-l-4 border-l-signal border-t border-r border-b border-board-field bg-board-plate shadow-sm"
                    : "border border-edge bg-board-plate hover:border-board-trim"
                )}
                data-testid={`exception-${key}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-panel font-bold text-ink">{KIND_LABEL[e.kind]}</h3>
                      {count > 1 ? (
                        <span className="text-label font-semibold text-ink-muted" data-testid={`exception-count-${key}`}>
                          <span data-figure className="tabular-nums">{count}</span> on this order
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          navigator.clipboard.writeText(formatErrandId(e.errandId)).catch(() => {});
                          setCopiedId(e.errandId);
                          setTimeout(() => setCopiedId(null), 1500);
                        }}
                        className="group/copy inline-flex items-center gap-1.5 rounded-trim bg-board-ground/60 px-2 py-0.5 border border-edge text-ink hover:border-board-trim hover:bg-board-ground transition-colors cursor-pointer"
                        title="Copy the order number"
                      >
                        <span data-figure className="font-mono text-data font-bold tabular-nums tracking-wide">
                          {formatErrandId(e.errandId)}
                        </span>
                        {copiedId === e.errandId ? (
                          <span className="inline-flex items-center gap-0.5 text-micro font-semibold text-emerald-600 uppercase tracking-wider">
                            <Check size={11} strokeWidth={2.5} />
                            <span>Copied</span>
                          </span>
                        ) : (
                          <Copy size={11} className="text-ink-muted opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                        )}
                      </button>
                      {e.riderName ? (
                        <span className="inline-flex items-center gap-1 text-label font-medium text-ink-muted">
                          <User size={12} className="text-ink-muted/80" />
                          <span>{e.riderName}</span>
                        </span>
                      ) : null}
                    </div>
                    {count === 1 ? (
                      <>
                        <p className="text-body font-semibold text-status-act-ink leading-relaxed">{e.members[0].detail}</p>
                        <div className="flex items-center gap-1.5 text-label text-ink-muted">
                          <Clock size={12} className="text-ink-muted/80" />
                          <span data-figure className="font-mono tabular-nums">
                            {formatTimestamp(e.occurredAt)}
                          </span>
                        </div>
                      </>
                    ) : (
                      // Every one the reason will clear, each with its own time,
                      // so nobody clears a line they never saw.
                      <ul className="space-y-1.5" data-testid={`exception-members-${key}`}>
                        {e.members.map((m, i) => (
                          <li key={`${m.occurredAt}:${i}`}>
                            <p className="text-body font-semibold text-status-act-ink leading-relaxed">{m.detail}</p>
                            <div className="flex items-center gap-1.5 text-label text-ink-muted">
                              <Clock size={12} className="text-ink-muted/80" />
                              <span data-figure className="font-mono tabular-nums">
                                {formatTimestamp(m.occurredAt)}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {e.amountAtRisk > 0 ? (
                      <div className="text-right">
                        <span className="block text-micro font-semibold uppercase tracking-[0.06em] text-ink-muted">
                          {count > 1 ? "Money involved, all" : "Money involved"}
                        </span>
                        <span data-figure className="font-mono text-data font-bold tabular-nums text-status-act-ink">
                          {formatPeso(e.amountAtRisk)}
                        </span>
                      </div>
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
                        className="font-semibold"
                      >
                        {count > 1 ? `Resolve all ${count}` : "Resolve"}
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
                    group={e}
                    busy={busy}
                    error={errors[key] ?? null}
                    onCancel={() => {
                      setResolving(null);
                      setErrors((prev) => ({ ...prev, [key]: null }));
                    }}
                    onSubmit={async (reason, cashOutcome) => {
                      if (reason.trim().length < 3) {
                        setErrors((prev) => ({ ...prev, [key]: "Say why this is being cleared." }));
                        return false;
                      }
                      setBusy(true);
                      setErrors((prev) => ({ ...prev, [key]: null }));
                      try {
                        // The group's sum: the record freezes what this one
                        // reason was written against, which is all of them.
                        await resolve(e.errandId, e.kind, reason.trim(), e.amountAtRisk, cashOutcome);
                        setResolving(null);
                        // A short cleared with money still owed moves to that list.
                        void owed.reload();
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
      )}
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
  group,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  rowKey: string;
  group: ExceptionGroup;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (reason: string, cashOutcome: ApiCashOutcome | null) => Promise<boolean>;
}) {
  const { aiSuggestionsEnabled } = useDispatcherAiSettings();
  const [reason, setReason, clearReason] = useDraft(`exception-reason:${rowKey}`);
  const [suggest, setSuggest] = useState<SuggestState>({ status: "idle" });

  // A cash short with money still owed asks what happened to it. The handover
  // itself never changes; the answer is recorded beside it.
  const cash = group.kind === "CASH_VARIANCE" ? group.members[0].cash : undefined;
  const asksMoney = !!cash && cash.short > 0 && cash.stillOwed > 0;
  const [cashValue, setCashValue] = useState<CashChoiceValue>(() => emptyCashChoice(cash?.stillOwed ?? 0));
  const [cashError, setCashError] = useState<string | null>(null);

  // The box as it is NOW, read after the request returns. The value captured
  // when the request started would miss anything typed while it was in flight.
  const reasonNow = useRef(reason);
  reasonNow.current = reason;
  // A Cancel mid-request must not have the answer land in the draft store
  // afterwards and reappear the next time this row is opened.
  // Set true on every mount: StrictMode's dev remount ran only the cleanup, so
  // in dev every suggestion was thrown away as if the form had been cancelled.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => void (mounted.current = false);
  }, []);

  const count = group.members.length;
  // The model reads one exception, so a suggestion on a group describes the
  // first (most at risk) of them. The note below the box says so.
  const first = group.members[0];

  const generate = async () => {
    if (suggest.status === "loading") return;
    setSuggest({ status: "loading" });

    const result = await apiService.suggestExceptionReason(
      first.errandId,
      first.kind,
      first.occurredAt
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
      {count > 1 ? (
        // Above the box, not in the hint, because a validation error replaces
        // the hint and this has to stay in view while the reason is written.
        <p className="mb-2.5 text-body font-medium text-ink" data-testid="resolve-covers-all">
          This reason clears all <span data-figure className="tabular-nums">{count}</span> listed above. They are
          recorded together, so write it to cover every one.
          {aiSuggestionsEnabled ? " A suggestion describes only the first, so edit it to fit the rest." : null}
        </p>
      ) : null}
      {asksMoney && cash ? (
        <div className="mb-3">
          <CashChoiceFields
            owed={cash.stillOwed}
            value={cashValue}
            onChange={(next) => {
              setCashValue(next);
              setCashError(null);
            }}
            allowNotPaid
            name={rowKey}
            error={cashError}
          />
        </div>
      ) : null}
      <Field
        label={count > 1 ? "Why are these being cleared?" : "Why is this being cleared?"}
        error={error}
        hint="Anyone checking the money later will read this."
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
                : "What happened? Explain how it was sorted out"
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
              className="font-semibold"
            >
              Generate suggestion
            </DispatcherButton>
            <span className="text-label text-ink-muted">
              or press{" "}
              <kbd className="rounded-trim border border-edge bg-board-ground px-1.5 py-0.5 font-mono text-micro text-ink shadow-sm">
                Tab
              </kbd>{" "}
              in the empty box
            </span>
          </div>
          <p className="mt-1 m-0 text-micro text-ink-muted">
            Suggestions can be wrong. Check them against the receipt and the rider's note before saving.
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
            if (asksMoney && cash) {
              const problem = cashChoiceError(cashValue, cash.stillOwed, true);
              if (problem) {
                setCashError(problem);
                return;
              }
            }
            const ok = await onSubmit(reason, asksMoney ? toCashOutcome(cashValue) : null);
            if (ok) clearReason();
          }}
          data-testid="resolve-confirm"
          className="font-bold"
        >
          Update
        </DispatcherButton>
        <DispatcherButton variant="secondary" size="md" disabled={busy} onClick={onCancel} className="font-semibold">
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
        <p className="mt-1.5 flex items-start gap-1.5 text-label font-medium text-ink-muted">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-amber-500" />
          <span>
            Suggested from the cash handover and the rider's note (<span className="font-mono tabular-nums">{percent(state.confidence)}</span>{" "}
            sure). Check it against the receipt photo and fix any details that are off.
          </span>
        </p>
      );

    case "offered":
      return (
        <div className="mt-2 rounded-trim border border-edge bg-board-ground p-3">
          <p className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-[0.06em] text-ink-muted">
            <Sparkles size={12} className="shrink-0 text-amber-500" />
            <span>Suggested reason &bull; <span className="font-mono tabular-nums">{percent(state.confidence)}</span> sure</span>
          </p>
          <p className="mt-1 text-body font-medium text-ink leading-relaxed">{state.text}</p>
          <div className="mt-2">
            <DispatcherButton
              variant="secondary"
              size="sm"
              onClick={() => onUse(state.text, state.confidence, state.checkedBy)}
              data-testid="use-suggestion"
              className="font-semibold"
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
          <p className="mt-1.5 text-label font-medium text-status-waiting-ink">
            None of the usual reasons fit this one. Please write what happened.
          </p>
        );
      }
      return (
        <p className="mt-1.5 text-label font-medium text-status-waiting-ink">
          Not sure enough to suggest a reason (<span className="font-mono tabular-nums">{percent(state.confidence)}</span> sure;{" "}
          needs <span className="font-mono tabular-nums">{percent(state.threshold)}</span>). Please write what happened.
        </p>
      );

    case "failed":
      return (
        <p role="alert" className="mt-1.5 text-label font-medium text-status-act-ink">
          Could not get a suggestion right now. Try again, or write the reason yourself.
        </p>
      );

    default:
      return null;
  }
}
