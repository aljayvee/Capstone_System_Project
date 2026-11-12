import { useState, useMemo, useEffect, useRef, useCallback } from "react";

export interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  paginatedItems: T[];
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  startIndex: number;
  endIndex: number;
  pageSize: number;
}

const EMPTY_ARRAY: never[] = [];

/**
 * Generic in-memory client-side pagination hook.
 *
 * Slices an array of items into pages of `pageSize` (default 25) while preserving
 * the full dataset for parent consumers (such as CSV exports and KPI sums).
 *
 * Automatically resets to page 1 whenever `resetDeps` change, and defensively
 * clamps the current page within `[1, totalPages]`.
 *
 * @param items Source array of items
 * @param pageSize Number of records per page (default 25)
 * @param resetDeps Dependency list that triggers an automatic page reset (e.g. dateRange, filter)
 */
export function usePagination<T>(
  items: T[] | undefined | null,
  pageSize: number = 25,
  resetDeps: React.DependencyList = []
): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Normalize items array with stable fallback for empty lists
  const safeItems = useMemo(() => {
    if (!items || items.length === 0) return EMPTY_ARRAY as T[];
    return items;
  }, [items]);

  const totalItems = safeItems.length;

  // Calculate total pages (0 if totalItems is 0, otherwise Math.ceil)
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;

  // Track initial mount so we don't trigger reset on mount
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  // Auto-clamp currentPage if items shrink or transition to 0
  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    } else if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Clamped page setter that prevents out-of-bounds state drift
  const setClampedPage = useCallback(
    (page: number | ((prev: number) => number)) => {
      setCurrentPage((prev) => {
        // Clamp prev first so relative updates (+1, -1) operate on bounded values
        const clampedPrev = totalPages > 0 ? Math.min(Math.max(1, prev), totalPages) : 1;
        const next = typeof page === "function" ? page(clampedPrev) : page;
        if (totalPages <= 0) return 1;
        return Math.min(Math.max(1, next), totalPages);
      });
    },
    [totalPages]
  );

  // Derived current page clamped safely for immediate rendering
  const safeCurrentPage = totalPages > 0 ? Math.min(Math.max(1, currentPage), totalPages) : 1;

  // Calculate 1-based slice display indices
  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = totalItems === 0 ? 0 : Math.min(safeCurrentPage * pageSize, totalItems);

  // In-memory sliced items for current page
  const paginatedItems = useMemo(() => {
    if (totalItems === 0) return EMPTY_ARRAY as T[];
    const from = (safeCurrentPage - 1) * pageSize;
    const to = safeCurrentPage * pageSize;
    return safeItems.slice(from, to);
  }, [safeItems, safeCurrentPage, pageSize, totalItems]);

  const hasPrevPage = safeCurrentPage > 1;
  const hasNextPage = safeCurrentPage < totalPages;

  const goToPrevPage = useCallback(() => {
    setClampedPage((prev) => prev - 1);
  }, [setClampedPage]);

  const goToNextPage = useCallback(() => {
    setClampedPage((prev) => prev + 1);
  }, [setClampedPage]);

  return {
    currentPage: safeCurrentPage,
    totalPages,
    totalItems,
    paginatedItems,
    setCurrentPage: setClampedPage,
    goToNextPage,
    goToPrevPage,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex,
    pageSize,
  };
}

export default usePagination;
