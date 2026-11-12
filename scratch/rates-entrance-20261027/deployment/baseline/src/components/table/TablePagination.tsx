import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  startIndex?: number;
  endIndex?: number;
  itemName?: string;
  className?: string;
}

/**
 * Calculates page numbers with smart ellipsis truncation.
 *
 * e.g. for 10 pages:
 * Page 1 -> [1, 2, 3, 4, 5, '...', 10]
 * Page 5 -> [1, '...', 4, 5, 6, '...', 10]
 * Page 9 -> [1, '...', 6, 7, 8, 9, 10]
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Near the start
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  // Near the end
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  // In the middle
  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

/**
 * Standardized, accessible client-side table pagination component.
 *
 * - Auto-hides navigation buttons when totalPages <= 1.
 * - Displays high-contrast record counter ("Showing 1-25 of 142 records").
 * - Numbered page buttons with smart ellipsis truncation and >=44px mobile touch targets.
 * - Strictly follows Anti-AI-Slop and surface purity rules (no em dashes, no pill buttons).
 */
export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  pageSize = 25,
  startIndex,
  endIndex,
  itemName = "records",
  className = "",
}) => {
  const defaultStartIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const defaultEndIndex = Math.min(currentPage * pageSize, totalItems);
  const start = startIndex ?? defaultStartIndex;
  const end = endIndex ?? defaultEndIndex;

  const displayNoun =
    totalItems === 1 && itemName.endsWith("s")
      ? itemName.slice(0, -1)
      : itemName;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div
      className={`px-5 py-3 border-t border-edge flex flex-col sm:flex-row items-center justify-between gap-3 text-label text-ink-muted bg-board-plate ${className}`}
    >
      {/* Record Counter */}
      <div className="font-medium text-xs sm:text-label tabular-nums">
        {totalPages <= 1 ? (
          `Showing all ${totalItems} ${displayNoun}`
        ) : (
          <span>
            Showing <span className="font-semibold text-ink">{start}-{end}</span> of{" "}
            <span className="font-semibold text-ink">{totalItems}</span> {displayNoun}
          </span>
        )}
      </div>

      {/* Navigation Buttons (Auto-hidden when totalPages <= 1) */}
      {totalPages > 1 && (
        <nav
          aria-label="Table pagination"
          className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center"
        >
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-plate border border-edge bg-board-plate hover:bg-board-ground text-ink text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors min-h-[44px] sm:min-h-[38px] active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Numbered Page Buttons with Ellipsis */}
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 sm:w-9 text-center text-ink-muted select-none text-xs font-mono"
                  aria-hidden="true"
                >
                  ...
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => !isCurrent && onPageChange(p)}
                disabled={isCurrent}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={`Page ${p}`}
                className={`min-w-[44px] sm:min-w-[36px] min-h-[44px] sm:min-h-[36px] px-2.5 rounded-plate text-xs font-mono font-medium transition-colors border flex items-center justify-center ${
                  isCurrent
                    ? "bg-board-ground text-ink border-edge font-bold shadow-xs cursor-default"
                    : "bg-board-plate text-ink-muted border-transparent hover:text-ink hover:bg-board-ground/60 cursor-pointer active:scale-95"
                }`}
              >
                {p}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className="inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-plate border border-edge bg-board-plate hover:bg-board-ground text-ink text-xs font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors min-h-[44px] sm:min-h-[38px] active:scale-95 cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </nav>
      )}
    </div>
  );
};

export default TablePagination;
