import { useState, useEffect, useCallback } from "react";

export function useFormDraft<T>(draftKey: string, initialValues: T) {
  const storageKey = `sugo_draft_${draftKey}`;

  const [draft, setDraftState] = useState<T>(() => {
    if (typeof window === "undefined") return initialValues;
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : initialValues;
    } catch {
      return initialValues;
    }
  });

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!sessionStorage.getItem(storageKey);
  });

  const setDraft = useCallback(
    (valueOrUpdater: T | ((prev: T) => T)) => {
      setDraftState((prev) => {
        const next =
          typeof valueOrUpdater === "function"
            ? (valueOrUpdater as (prev: T) => T)(prev)
            : valueOrUpdater;

        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next));
          setHasDraft(true);
        } catch {
          // ignore quota limits
        }

        return next;
      });
    },
    [storageKey]
  );

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
      setHasDraft(false);
      setDraftState(initialValues);
    } catch {
      // ignore
    }
  }, [storageKey, initialValues]);

  return { draft, setDraft, clearDraft, hasDraft };
}

export default useFormDraft;
