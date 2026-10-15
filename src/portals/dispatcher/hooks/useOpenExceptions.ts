import { useCallback, useEffect, useMemo, useState } from "react";
import { apiService, type ApiErrandException, type ExceptionKind } from "../../../services/apiService";

/**
 * Every open exception of one kind on one errand, as the single queue row it is.
 *
 * The server can raise several of a kind on one errand: one UNVERIFIED_PURCHASE
 * per receiptless proof, one WRONG_BRANCH or MISSING_RECEIPT per stop, one
 * RECEIPT_DIVERGENCE per receipt, one STALLED_STOP per dwell. But a resolution is
 * recorded per errand and kind (ExceptionReview has no proof or stop id), so one
 * reason clears every one of them. Listed apart, they shared a React key, a
 * draft and an open form, and clearing one silently cleared its siblings. As one
 * row, the screen shows what the record does: one decision covering them all.
 */
export interface ExceptionGroup {
  /** `${errandId}:${kind}`, which is now unique per row. */
  key: string;
  errandId: string;
  kind: ExceptionKind;
  riderName: string | null;
  /** In the server's order: most at risk first, then oldest. Never empty. */
  members: ApiErrandException[];
  /** The sum, since one reason clears all of it. */
  amountAtRisk: number;
  /** The oldest member's, so the row ages as the server ranks it. */
  occurredAt: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function groupExceptions(exceptions: ApiErrandException[]): ExceptionGroup[] {
  const byKey = new Map<string, ExceptionGroup>();

  for (const e of exceptions) {
    const key = `${e.errandId}:${e.kind}`;
    const group = byKey.get(key);
    if (!group) {
      byKey.set(key, {
        key,
        errandId: e.errandId,
        kind: e.kind,
        riderName: e.riderName,
        members: [e],
        amountAtRisk: e.amountAtRisk,
        occurredAt: e.occurredAt,
      });
      continue;
    }
    group.members.push(e);
    group.amountAtRisk = round2(group.amountAtRisk + e.amountAtRisk);
    if (new Date(e.occurredAt).getTime() < new Date(group.occurredAt).getTime()) group.occurredAt = e.occurredAt;
  }

  // The server's rule (rankExceptions), applied to the sums: two ₱100 purchases
  // on one errand are ₱200 held, and outrank a single ₱150.
  return [...byKey.values()].sort((a, b) => {
    if (b.amountAtRisk !== a.amountAtRisk) return b.amountAtRisk - a.amountAtRisk;
    return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
  });
}

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

  const groups = useMemo(() => groupExceptions(exceptions), [exceptions]);

  return {
    exceptions,
    /** What the panel lists: one row per errand and kind. */
    groups,
    totalAtRisk,
    isLoading,
    loadError,
    reload,
    resolve,
    // Rows, not raw exceptions, so the sidebar badge and the list it sits
    // beside always show the same number.
    openCount: groups.length,
    /**
     * True only when the queue is confirmed clear: loaded, no failure, nothing
     * open. The all-clear copy is gated on this rather than on a count of zero.
     */
    isConfirmedClear: !isLoading && !loadError && exceptions.length === 0,
  };
}

export type OpenExceptions = ReturnType<typeof useOpenExceptions>;
