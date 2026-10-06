import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Errand } from "../../../../types/errand";
import { formatErrandId } from "../../../../utils/formatErrandId";
import { formatPeso } from "../../../../utils/format";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelState } from "@/components/panel/PanelState";
import { DispatcherSearchField } from "@/components/panel/DispatcherSearchField";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { StatusChip } from "@/components/panel/DispatcherBadge";
import { HistoryErrandDetail } from "./HistoryErrandDetail";
import {
  distanceKmOf,
  feeOf,
  formatClosedAt,
  formatKm,
  matchesQuery,
  myFinishedErrands,
  outcomeOf,
  sortErrands,
  SORTS,
  summarize,
  type OutcomeFilter,
  type SortKey,
} from "./historyModel";

const PAGE_SIZE = 10;

const FILTERS: Array<{ id: OutcomeFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

interface DispatcherHistoryPanelProps {
  errands: Errand[];
  currentUserId?: number | string | null;
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  onOpenChat: (errandId: string) => void;
}

function HistoryRow({
  errand,
  isSelected,
  onSelect,
}: {
  errand: Errand;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isCancelled = outcomeOf(errand) === "cancelled";
  const fee = feeOf(errand);
  const distanceKm = distanceKmOf(errand);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "block w-full cursor-pointer rounded-plate px-4 py-3 text-left transition-colors duration-150",
        isSelected ? "bg-board-field" : "border border-edge bg-board-plate hover:border-board-trim"
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn("min-w-0 truncate text-data", isSelected ? "text-board-plate" : "text-ink")}
          title={errand.customerName}
        >
          {errand.customerName || "Customer"}
        </span>
        {isCancelled ? (
          <span className={cn("shrink-0 text-label", isSelected ? "text-board-trim" : "text-ink-muted")}>
            Not delivered
          </span>
        ) : (
          <span
            data-figure
            className={cn(
              "shrink-0 font-mono text-data tabular-nums",
              isSelected ? "text-board-plate" : "text-ink"
            )}
          >
            {fee != null ? formatPeso(fee) : "Not priced"}
          </span>
        )}
      </div>

      <div className="mt-0.5 flex items-baseline justify-between gap-3">
        <span
          data-figure
          className={cn("min-w-0 truncate text-label", isSelected ? "text-board-trim" : "text-ink-muted")}
        >
          <span className="font-mono">{formatErrandId(errand.id)}</span>
          {" · "}
          {formatClosedAt(errand)}
        </span>
        {!isCancelled && fee != null ? (
          <span className={cn("shrink-0 text-micro uppercase", isSelected ? "text-board-trim" : "text-ink-muted")}>
            Delivery fee
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-2.5 flex items-center justify-between gap-3 border-t pt-2.5",
          isSelected ? "border-field-line" : "border-hairline"
        )}
      >
        <span
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-label",
            isSelected ? "text-board-plate/90" : "text-ink"
          )}
        >
          <MapPin size={12} className="shrink-0" aria-hidden="true" />
          <span className="truncate" title={errand.deliveryAddress}>
            {errand.deliveryAddress || "No address recorded"}
          </span>
          {/* Kept out of the truncation: the address can be cut short, the
              distance is the figure a dispatcher scans the column for. */}
          {distanceKm != null ? (
            <span
              data-figure
              className={cn("shrink-0 font-mono", isSelected ? "text-board-trim" : "text-ink-muted")}
            >
              · {formatKm(distanceKm)}
            </span>
          ) : null}
        </span>
        <StatusChip status={isCancelled ? "CANCELLED" : errand.status} className="shrink-0" />
      </div>
    </button>
  );
}

/**
 * Customer Transaction (formerly My History): the orders this dispatcher handled that are finished, searched,
 * sorted and paged in the browser, with the full record of the selected one
 * beside the list.
 *
 * It reads the list the portal already holds rather than fetching its own,
 * the same choice the rider app makes, so it costs no request and stays live
 * through the board's socket updates. GET /errands has no paging, which is
 * the limit to revisit once one dispatcher's history runs into thousands.
 */
export function DispatcherHistoryPanel({
  errands,
  currentUserId,
  isLoading = false,
  loadError = null,
  onRetry,
  onOpenChat,
}: DispatcherHistoryPanelProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OutcomeFilter>("delivered");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [narrowPane, setNarrowPane] = useState<"list" | "order">("list");
  const detailRef = useRef<HTMLDivElement>(null);

  const mine = useMemo(() => myFinishedErrands(errands, currentUserId), [errands, currentUserId]);
  // All time and unfiltered, like the rider app's header: the figure answers
  // "how much have I handled", not "how much matches what I typed".
  const summary = useMemo(() => summarize(mine), [mine]);
  const searched = useMemo(() => mine.filter((e) => matchesQuery(e, query)), [mine, query]);
  const counts: Record<OutcomeFilter, number> = useMemo(
    () => ({
      all: searched.length,
      delivered: searched.filter((e) => outcomeOf(e) === "delivered").length,
      cancelled: searched.filter((e) => outcomeOf(e) === "cancelled").length,
    }),
    [searched]
  );
  const sorted = useMemo(() => {
    const narrowed = filter === "all" ? searched : searched.filter((e) => outcomeOf(e) === filter);
    return sortErrands(narrowed, sort);
  }, [searched, filter, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  // Clamped rather than trusted: a live update can shrink the list under the
  // page a dispatcher is reading.
  const safePage = Math.min(page, pageCount);
  const visible = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selected = visible.find((e) => e.id === selectedId) ?? null;

  // AGENTS.md 8.30: the record pane is never blank while there is a row to
  // show. Keyed on the ids, not the array, which is rebuilt every render.
  const visibleKey = visible.map((e) => e.id).join(",");
  useEffect(() => {
    if (selectedId && visible.some((e) => e.id === selectedId)) return;
    setSelectedId(visible[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  // The detail pane keeps its scroller between orders; each one starts at its top.
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [selectedId]);

  // A narrowed list leaves the reader stranded on an empty page 7 otherwise.
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const changeFilter = (value: OutcomeFilter) => {
    setFilter(value);
    setPage(1);
  };
  const changeSort = (value: SortKey) => {
    setSort(value);
    setPage(1);
  };
  const resetFilters = () => {
    setQuery("");
    setFilter("all");
    setPage(1);
  };
  const hasFilters = query.trim().length > 0 || filter !== "all";

  const select = (id: string) => {
    setSelectedId(id);
    setNarrowPane("order");
  };

  const isUnknown = isLoading || Boolean(loadError);
  const detailLine = isUnknown
    ? "Orders you handled that were delivered or cancelled"
    : [
        `${summary.deliveredCount} delivered`,
        `${formatPeso(summary.feesTotal)} in delivery fees`,
        summary.unpricedCount > 0 ? `${summary.unpricedCount} not priced` : null,
        summary.cancelledCount > 0 ? `${summary.cancelledCount} cancelled` : null,
      ]
        .filter(Boolean)
        .join(" · ");

  const pageButton = (direction: "prev" | "next") => (
    <DispatcherButton
      variant="secondary"
      size="sm"
      iconOnly
      aria-label={direction === "prev" ? "Previous page" : "Next page"}
      disabled={direction === "prev" ? safePage <= 1 : safePage >= pageCount}
      icon={direction === "prev" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      onClick={() => setPage(direction === "prev" ? Math.max(1, safePage - 1) : Math.min(pageCount, safePage + 1))}
    />
  );

  return (
    <PanelShell
      title="Customer Transaction"
      figure={{ label: "Delivered", value: isUnknown ? "--" : String(summary.deliveredCount) }}
      detail={detailLine}
      aside={
        <div className="w-full sm:w-72">
          <DispatcherSearchField
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Search ID, customer, address or store"
            aria-label="Search customer transactions"
          />
        </div>
      }
      controls={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((option) => {
              const isActive = filter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => changeFilter(option.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-trim px-3 text-micro uppercase transition-colors",
                    isActive ? "bg-board-field text-board-plate" : "bg-board-plate text-ink-muted hover:text-ink"
                  )}
                >
                  {option.label}
                  <span data-figure className="tabular-nums">
                    {isUnknown ? "--" : counts[option.id]}
                  </span>
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-micro uppercase text-ink-muted">
            Sort
            <select
              value={sort}
              onChange={(event) => changeSort(event.target.value as SortKey)}
              className="min-h-9 cursor-pointer rounded-trim border border-edge bg-board-plate px-2 text-label normal-case text-ink"
            >
              {SORTS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    >
      {isUnknown || mine.length === 0 ? (
        <div className="overflow-hidden rounded-plate border border-edge bg-board-plate">
          <PanelState
            isLoading={isLoading}
            error={loadError}
            onRetry={onRetry}
            isEmpty={mine.length === 0}
            emptyTitle="Nothing finished yet"
            emptyBody="Orders you handle collect here once they are delivered or cancelled, with the receipts the rider filed."
            errorTitle="Customer transactions did not load"
            loadingRows={6}
          >
            <></>
          </PanelState>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-3">
          {/* Narrow: one pane at a time, as on the queue. */}
          <div className="flex shrink-0 items-center gap-1 rounded-plate bg-board-plate p-1 lg:hidden">
            <button
              type="button"
              onClick={() => setNarrowPane("list")}
              aria-pressed={narrowPane === "list"}
              className={cn(
                "min-h-9 flex-1 cursor-pointer rounded-trim px-3 text-micro uppercase transition-colors",
                narrowPane === "list" ? "bg-board-field text-board-plate" : "text-ink-muted hover:text-ink"
              )}
            >
              Transactions
            </button>
            <button
              type="button"
              onClick={() => setNarrowPane("order")}
              aria-pressed={narrowPane === "order"}
              disabled={!selected}
              className={cn(
                "min-h-9 flex-1 cursor-pointer rounded-trim px-3 text-micro uppercase transition-colors disabled:cursor-not-allowed disabled:text-board-trim",
                narrowPane === "order" ? "bg-board-field text-board-plate" : "text-ink-muted hover:text-ink"
              )}
            >
              The order
            </button>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[38fr_62fr]">
            <div
              className={cn(
                "min-h-0 min-w-0 flex-col gap-2",
                narrowPane === "list" ? "flex" : "hidden lg:flex"
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto">
                {sorted.length === 0 ? (
                  <div className="rounded-plate border border-edge bg-board-plate">
                    <PanelState isEmpty hasFilters={hasFilters} onResetFilters={resetFilters}>
                      <></>
                    </PanelState>
                  </div>
                ) : (
                  <ul className="space-y-2" aria-label="Finished orders">
                    {visible.map((errand) => (
                      <li key={errand.id}>
                        <HistoryRow
                          errand={errand}
                          isSelected={errand.id === selected?.id}
                          onSelect={() => select(errand.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {sorted.length > 0 ? (
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-plate border border-edge bg-board-plate px-3 py-2">
                  <p data-figure className="text-label text-ink-muted">
                    {(safePage - 1) * PAGE_SIZE + 1} to {Math.min(safePage * PAGE_SIZE, sorted.length)} of{" "}
                    {sorted.length}
                  </p>
                  <div className="flex items-center gap-2">
                    {pageButton("prev")}
                    <span data-figure className="px-1 text-label text-ink">
                      Page {safePage} of {pageCount}
                    </span>
                    {pageButton("next")}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              ref={detailRef}
              className={cn(
                "min-h-0 min-w-0 overflow-y-auto rounded-plate border border-edge bg-board-plate",
                narrowPane === "order" ? "block" : "hidden lg:block"
              )}
            >
              {selected ? (
                <HistoryErrandDetail key={selected.id} errand={selected} onOpenChat={onOpenChat} />
              ) : (
                <p className="px-5 py-12 text-center text-body text-ink-muted">
                  Pick an order to see what was bought, the photos and the money.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
