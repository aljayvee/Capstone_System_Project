import React from "react";
import { Errand } from "../../../../types/errand";
import { cn } from "@/lib/utils";
import { DispatchErrandCard } from "./DispatchErrandCard";
import { DispatcherSearchField } from "@/components/panel/DispatcherSearchField";
import { PanelState } from "@/components/panel/PanelState";

interface DispatchMasterStreamProps {
  errands: Errand[];
  selectedErrandId: string | null;
  onSelectErrand: (errand: Errand) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  categories: string[];
  activeSegment: "INCOMING" | "ACTIVE";
  onSegmentChange: (seg: "INCOMING" | "ACTIVE") => void;
  incomingCount: number;
  activeCount: number;
  /** Additive. The board's own load state, so the stream stops asserting empty. */
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
}

/**
 * The board: every run in the chosen segment, oldest demand first.
 *
 * Structure is AGENTS.md 8.12, which this already followed: the segment
 * switcher, the search and the category capsules stay pinned and only the list
 * scrolls. The two-segment control is AGENTS.md 8.30 and stays exactly two,
 * with no "All" tab.
 *
 * What changed. The empty state used to be the only state: there was no
 * loading and no failure, so a dead API rendered "No Errands in this View"
 * with the same confidence as a genuinely quiet board. That decision now
 * belongs to PanelState, which orders a failure ahead of emptiness.
 *
 * The search input is the shared field rather than the third of four
 * hand-rolled copies, which also gives it a real accessible name instead of a
 * placeholder.
 *
 * The `⌘K` badge is gone. It advertised a shortcut that nothing implemented,
 * on a console whose dispatchers are on Windows, so it named the wrong
 * modifier for a keystroke that did nothing.
 */
export const DispatchMasterStream: React.FC<DispatchMasterStreamProps> = ({
  errands,
  selectedErrandId,
  onSelectErrand,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  activeSegment,
  onSegmentChange,
  incomingCount,
  activeCount,
  isLoading = false,
  loadError = null,
  onRetry,
}) => {
  const hasFilters = searchQuery.trim().length > 0 || selectedCategory !== "ALL";

  const resetFilters = () => {
    onSearchChange("");
    onCategoryChange("ALL");
  };

  const segment = (id: "INCOMING" | "ACTIVE", label: string, count: number) => {
    const isActive = activeSegment === id;
    return (
      <button
        type="button"
        onClick={() => onSegmentChange(id)}
        aria-pressed={isActive}
        className={cn(
          "flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-trim px-3 text-micro uppercase transition-colors",
          isActive ? "bg-board-field text-board-plate" : "text-ink-muted hover:text-ink"
        )}
      >
        <span>{label}</span>
        <span data-figure className="tabular-nums">
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-plate border border-edge bg-board-plate">
      {/* Pinned controls */}
      <div className="shrink-0 space-y-2.5 border-b border-hairline p-3">
        <div className="flex items-center gap-1 rounded-plate bg-board-ground p-1">
          {segment("INCOMING", "Incoming", incomingCount)}
          {segment("ACTIVE", "Active", activeCount)}
        </div>

        <DispatcherSearchField
          aria-label="Search the board by store, customer, route number or address"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search store, customer, route number"
        />

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => onCategoryChange("ALL")}
              aria-pressed={selectedCategory === "ALL"}
              className={cn(
                "min-h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-trim px-3 text-micro uppercase transition-colors",
                selectedCategory === "ALL"
                  ? "bg-board-field text-board-plate"
                  : "bg-board-ground text-ink-muted hover:text-ink"
              )}
            >
              All
            </button>
            {categories.map((cat) => {
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onCategoryChange(cat)}
                  aria-pressed={isActive}
                  className={cn(
                    "min-h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-trim px-3 text-micro uppercase transition-colors",
                    isActive
                      ? "bg-board-field text-board-plate"
                      : "bg-board-ground text-ink-muted hover:text-ink"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* The only scroller */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <PanelState
          isLoading={isLoading}
          error={loadError}
          onRetry={onRetry}
          isEmpty={errands.length === 0}
          hasFilters={hasFilters}
          onResetFilters={resetFilters}
          emptyTitle={
            activeSegment === "INCOMING" ? "No runs waiting" : "Nothing in motion"
          }
          emptyBody={
            activeSegment === "INCOMING"
              ? "New orders land here the moment a customer sends one."
              : "Runs appear here once they are claimed and on the road."
          }
          errorTitle="The board did not load"
          loadingRows={6}
        >
          <div className="space-y-2">
            {errands.map((errand) => (
              <DispatchErrandCard
                key={errand.id}
                errand={errand}
                isSelected={selectedErrandId === errand.id}
                onClick={() => onSelectErrand(errand)}
              />
            ))}
          </div>
        </PanelState>
      </div>
    </div>
  );
};
