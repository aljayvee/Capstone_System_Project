import { useEffect, useState } from "react";
import { apiService, type ApiDashboardSummary, type DashboardFrequency } from "../../../services/apiService";

interface UseDashboardMetricsResult {
  data: ApiDashboardSummary | null;
  isLoading: boolean;
  error: string | null;
}

/** An explicit window, as `YYYY-MM-DD` with both ends inclusive. */
export interface DashboardRangeParams {
  start: string;
  end: string;
}

// Data-fetching/state only — DashboardModule.tsx stays render-only, per this
// project's "component renders UI, hook + service own the logic" rule.
//
// A range supersedes the frequency preset server-side. Both are passed so the
// server, not the client, owns that precedence — the reports resolve it the same
// way, and two implementations of one rule is how they come to disagree.
export function useDashboardMetrics(
  frequency: DashboardFrequency,
  range?: DashboardRangeParams
): UseDashboardMetricsResult {
  const [data, setData] = useState<ApiDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keyed by value: `range` is rebuilt on every render by the module, so an
  // object-identity dependency would refetch in a loop.
  const key = `${frequency}|${range?.start ?? ""}|${range?.end ?? ""}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      const summary = await apiService.getDashboardSummary(frequency, range);
      if (cancelled) return;
      if (summary) {
        setData(summary);
      } else {
        setError("Could not load dashboard data.");
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
