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
      const pad = (n: number) => String(n).padStart(2, "0");
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const summary = await apiService.getDashboardSummary(frequency, range, todayStr);
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
