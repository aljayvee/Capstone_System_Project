import { useCallback, useEffect, useState } from "react";
import { apiService, type ApiErrandException, type ExceptionKind } from "../../../services/apiService";

/**
 * Open exceptions across all live and recent errands.
 *
 * Owned by the portal and passed down rather than fetched inside the panel, so
 * the sidebar badge and the list are reading the same array. A badge that says
 * three beside a list showing two is worse than no badge — the reader stops
 * trusting either.
 *
 * Deliberately unscoped by dispatcher: an exception needs acting on regardless
 * of who claimed the errand. The claim rule stops two dispatchers working one
 * queue; it is not a reason to hide a shortfall from whoever is on shift.
 */
export function useOpenExceptions(pollMs = 60_000) {
  const [exceptions, setExceptions] = useState<ApiErrandException[]>([]);
  const [totalAtRisk, setTotalAtRisk] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await apiService.getOpenExceptions();
    if (data) {
      setExceptions(data.exceptions);
      setTotalAtRisk(data.summary.totalAtRisk);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    if (pollMs <= 0) return;
    const timer = setInterval(() => void reload(), pollMs);
    return () => clearInterval(timer);
  }, [reload, pollMs]);

  const resolve = useCallback(
    async (errandId: string, kind: ExceptionKind, reason: string, amountAtRisk: number) => {
      await apiService.resolveException(errandId, { kind, reason, amountAtRisk });
      await reload();
    },
    [reload]
  );

  return { exceptions, totalAtRisk, isLoading, reload, resolve, openCount: exceptions.length };
}

export type OpenExceptions = ReturnType<typeof useOpenExceptions>;
