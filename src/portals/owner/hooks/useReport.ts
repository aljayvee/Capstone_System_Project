import { useCallback, useEffect, useState } from "react";
import type { ApiDateRange } from "../../../services/apiService";

type ReportFetcher<T> = (range: ApiDateRange) => Promise<T | null>;

interface UseReportResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  /**
   * ADDITIVE: re-runs the fetch.
   *
   * All six report views rendered their failure as a bare line of rose text
   * and offered no way out of it, because this hook gave them nothing to call.
   * An error with no recovery leaves the owner reloading the whole portal.
   */
  reload: () => void;
}

// Generic data-fetching hook shared by all 6 report views (Sales, Rider
// Performance, Commission, Settlement, Transaction Summary, Exceptions) — each
// view injects its own apiService method, so this hook stays report-type-agnostic.
export function useReport<T>(fetcher: ReportFetcher<T>, range: ApiDateRange): UseReportResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Bumped by `reload` to re-run the effect without changing the range. */
  const [attempt, setAttempt] = useState(0);

  // Depended on by value rather than by identity: `range` is rebuilt on every
  // render by the views, so an object-identity dependency would refetch forever.
  const key = `${range.period ?? ""}|${range.date ?? ""}|${range.start ?? ""}|${range.end ?? ""}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      // Cleared on every read, which is the whole signature interaction.
      // Without it `data` survives a period change, and because every figure
      // renders as `data ? value : placeholder`, the placeholder machinery
      // could never fire again after the first successful mount: switching
      // Today to Month kept LAST period's numbers on screen beside a heading
      // that already said Month, and a failed request left them there under a
      // banner. The direction contract names the opposite - any figure the
      // request did not return goes to a dash in that same beat rather than
      // holding a stale number under a lit indicator.
      setData(null);
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
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { data, isLoading, error, reload };
}
