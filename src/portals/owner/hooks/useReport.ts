import { useEffect, useState } from "react";
import type { ReportPeriod } from "../../../services/apiService";

type ReportFetcher<T> = (period: ReportPeriod, date?: string) => Promise<T | null>;

interface UseReportResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

// Generic data-fetching hook shared by all 5 report views (Sales, Rider
// Performance, Commission, Settlement, Transaction Summary) — each view injects
// its own apiService method, so this hook stays report-type-agnostic.
export function useReport<T>(fetcher: ReportFetcher<T>, period: ReportPeriod, date: string): UseReportResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      const result = await fetcher(period, date);
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
  }, [period, date]);

  return { data, isLoading, error };
}
