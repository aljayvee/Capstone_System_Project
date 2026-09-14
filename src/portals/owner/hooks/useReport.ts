import { useEffect, useState } from "react";
import type { ApiDateRange } from "../../../services/apiService";

type ReportFetcher<T> = (range: ApiDateRange) => Promise<T | null>;

interface UseReportResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

// Generic data-fetching hook shared by all 6 report views (Sales, Rider
// Performance, Commission, Settlement, Transaction Summary, Exceptions) — each
// view injects its own apiService method, so this hook stays report-type-agnostic.
export function useReport<T>(fetcher: ReportFetcher<T>, range: ApiDateRange): UseReportResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Depended on by value rather than by identity: `range` is rebuilt on every
  // render by the views, so an object-identity dependency would refetch forever.
  const key = `${range.period ?? ""}|${range.date ?? ""}|${range.start ?? ""}|${range.end ?? ""}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      const result = await fetcher(range);
      if (cancelled) return;
      if (result) {
        setData(result);
      } else {
        setError("Could not load this report.");
      }
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, isLoading, error };
}
