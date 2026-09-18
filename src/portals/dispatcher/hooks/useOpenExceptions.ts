import { useCallback, useEffect, useState } from "react";
import { apiService, type ApiErrandException, type ExceptionKind } from "../../../services/apiService";

/**
 * Open exceptions across all live and recent errands.
 *
 * Owned by the portal and passed down rather than fetched inside the panel, so
 * the sidebar badge and the list are reading the same array. A badge that says
 * three beside a list showing two is worse than no badge: the reader stops
 * trusting either.
 *
 * Deliberately unscoped by dispatcher: an exception needs acting on regardless
 * of who claimed the errand. The claim rule stops two dispatchers working one
 * queue; it is not a reason to hide a shortfall from whoever is on shift.
 *
 * This hook had the console's most dangerous bug. `reload` had no try/catch at
 * all, so a rejected request never reached `setIsLoading(false)` and the panel
 * sat on "Checking recent errands..." forever with no retry. And because
 * `apiService.getOpenExceptions` swallows its own failure and returns null,
 * the old `if (data)` guard treated a dead API as nothing to report: the panel
 * then rendered "Everything reconciles. Nothing is waiting on you." over money
 * that had not been reconciled by anyone.
 *
 * Null from that call means the request failed, never that the shift is quiet.
 * A quiet shift returns a real report whose `exceptions` array is empty. Those
 * two are now different states, and a failure keeps the last known list rather
 * than replacing it with a reassuring zero.
 */
export function useOpenExceptions(pollMs = 60_000) {
  const [exceptions, setExceptions] = useState<ApiErrandException[]>([]);
  const [totalAtRisk, setTotalAtRisk] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await apiService.getOpenExceptions();

      if (!data) {
        // Keep whatever was last known good. Showing a stale list beside an
        // explicit warning is honest; replacing it with zero is not.
        setLoadError(
          "Anything already listed may be out of date, and there may be more that is not showing."
        );
        return;
      }

      setExceptions(data.exceptions);
      setTotalAtRisk(data.summary.totalAtRisk);
      setLoadError(null);
    } catch (err) {
      console.warn("Failed to load open exceptions:", err);
      setLoadError(
        "Anything already listed may be out of date, and there may be more that is not showing."
      );
    } finally {
      // In a finally so a rejection cannot leave the panel loading forever,
      // which is precisely what it used to do.
      setIsLoading(false);
    }
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

  return {
    exceptions,
    totalAtRisk,
    isLoading,
    loadError,
    reload,
    resolve,
    openCount: exceptions.length,
    /**
     * True only when the queue is confirmed clear: loaded, no failure, nothing
     * open. The all-clear copy is gated on this rather than on a count of zero.
     */
    isConfirmedClear: !isLoading && !loadError && exceptions.length === 0,
  };
}

export type OpenExceptions = ReturnType<typeof useOpenExceptions>;
