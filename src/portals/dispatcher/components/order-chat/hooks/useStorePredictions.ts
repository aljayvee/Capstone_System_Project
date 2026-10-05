import { useCallback, useEffect, useMemo, useState } from "react";
import { apiService, type ApiStorePrediction } from "../../../../../services/apiService";

/**
 * The step 3 store suggestion, predicted from the step 1 item list.
 *
 * Fetched as soon as there is a list, so it is usually waiting by the time the
 * dispatcher opens step 3. Re-asked whenever the list changes: a suggestion for
 * a basket the dispatcher has since edited would be about a different order.
 *
 * The dispatcher's answer ("accurate" or not) is remembered per order and per
 * list in sessionStorage, so reopening the step does not ask again. Only for
 * that list: edit the items and the question comes back with a new answer.
 * Browser storage is a convenience here and nothing depends on it; the actual
 * learning happens server-side from the pins and filings the dispatcher saves.
 */
export type PredictionAnswer = "accepted" | "rejected" | null;

export type PredictionStatus = "idle" | "loading" | "ready" | "error";

/** Held back briefly so a burst of step 1 edits costs one request, not one per keystroke. */
const DEBOUNCE_MS = 500;

const storageKey = (orderId: string) => `sugo:pin-prediction:${orderId}`;

function readAnswer(orderId: string, signature: string): PredictionAnswer {
  try {
    const raw = sessionStorage.getItem(storageKey(orderId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as { signature?: string; answer?: PredictionAnswer };
    return saved.signature === signature ? saved.answer ?? null : null;
  } catch {
    return null;
  }
}

function writeAnswer(orderId: string, signature: string, answer: PredictionAnswer): void {
  try {
    sessionStorage.setItem(storageKey(orderId), JSON.stringify({ signature, answer }));
  } catch {
    // Private mode or blocked storage: the question simply comes back next time.
  }
}

export function useStorePredictions(orderId: string | null | undefined, itemNames: string[], enabled: boolean) {
  // Order-insensitive, so reordering the list is not "a different basket".
  const signature = useMemo(
    () => [...itemNames].map((n) => n.trim().toLowerCase()).filter(Boolean).sort().join("\u0001"),
    [itemNames]
  );

  const [prediction, setPrediction] = useState<ApiStorePrediction | null>(null);
  const [status, setStatus] = useState<PredictionStatus>("idle");
  const [answer, setAnswerState] = useState<PredictionAnswer>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (orderId) setAnswerState(readAnswer(orderId, signature));
  }, [orderId, signature]);

  useEffect(() => {
    if (!enabled || !orderId || !signature) {
      setStatus("idle");
      setPrediction(null);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    const timer = setTimeout(async () => {
      const result = await apiService.predictStores(orderId, itemNames);
      if (cancelled) return;
      if (result) {
        setPrediction(result);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // itemNames is represented by `signature`; listing the array would refire
    // on every render that rebuilds it with the same contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, signature, enabled, attempt]);

  const setAnswer = useCallback(
    (next: PredictionAnswer) => {
      setAnswerState(next);
      if (orderId) writeAnswer(orderId, signature, next);
    },
    [orderId, signature]
  );

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { prediction, status, answer, setAnswer, retry };
}
