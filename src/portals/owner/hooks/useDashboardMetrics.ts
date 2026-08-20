import { useEffect, useState } from "react";
import { apiService, type ApiDashboardSummary, type DashboardFrequency } from "../../../services/apiService";

interface UseDashboardMetricsResult {
  data: ApiDashboardSummary | null;
  isLoading: boolean;
  error: string | null;
}

// Data-fetching/state only — DashboardModule.tsx stays render-only, per this
// project's "component renders UI, hook + service own the logic" rule.
export function useDashboardMetrics(frequency: DashboardFrequency): UseDashboardMetricsResult {
  const [data, setData] = useState<ApiDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      const summary = await apiService.getDashboardSummary(frequency);
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
  }, [frequency]);

  return { data, isLoading, error };
}
