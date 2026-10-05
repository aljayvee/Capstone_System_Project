import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/services/apiClient";

export interface CatalogItemSuggestion {
  id: number;
  itemName: string;
  /** Empty for "common" and "predicted", which name a kind of shop, not a shop. */
  rawStoreName: string;
  categoryName: string;
  isAvailable: boolean;
  verifiedPlaceId: string | null;
  /**
   * Where it came from (server/src/services/catalogSuggestionService.ts):
   * a crawled menu, a past errand at that store, a common item for that kind
   * of shop, or the model's guess for a name nothing matched. Absent from
   * servers older than 2026-09-25, which only had crawled menus.
   */
  source?: "crawled" | "history" | "common" | "predicted";
  timesOrdered?: number;
  confidence?: number;
}

/** One line saying where a suggestion comes from, never implying more than it knows. */
export function describeSuggestionSource(s: CatalogItemSuggestion): string {
  switch (s.source) {
    case "history":
      if (!s.rawStoreName) return "Ordered before";
      return s.timesOrdered && s.timesOrdered > 1
        ? `Bought at ${s.rawStoreName}, ${s.timesOrdered} times`
        : `Bought at ${s.rawStoreName}`;
    case "common":
      return "Common item";
    case "predicted":
      return "Not in the catalog yet, category guessed";
    default:
      return s.rawStoreName ? `${s.rawStoreName} menu` : "Crawled menu";
  }
}

const cache = new Map<string, CatalogItemSuggestion[]>();

/**
 * Autocomplete hook for menu items.
 * Price is omitted per design invariants.
 */
export function useCatalogAutocomplete(query: string, placeId?: string) {
  const [suggestions, setSuggestions] = useState<CatalogItemSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    const cacheKey = `${trimmed.toLowerCase()}_${placeId || "all"}`;
    if (cache.has(cacheKey)) {
      setSuggestions(cache.get(cacheKey) || []);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    // Loading from the keystroke, not from when the debounce fires: in that
    // quarter second the panel otherwise looked idle with nothing found, and
    // said "Nothing in the catalog matches" for a search still on its way.
    setIsLoading(true);
    const timer = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await apiClient.get<{ suggestions: CatalogItemSuggestion[] }>(
          "/catalog/search",
          {
            params: { q: trimmed, placeId, limit: 6 },
            signal: controller.signal,
          }
        );
        const results = response.data?.suggestions || [];
        cache.set(cacheKey, results);
        setSuggestions(results);
        setIsError(false);
      } catch (err: any) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          // Not cached, so typing the same search again retries it.
          setSuggestions([]);
          setIsError(true);
        }
      } finally {
        // An older search aborted by a newer one must not end the newer one's loading.
        if (abortControllerRef.current === controller) setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, placeId]);

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, isLoading, isError, clearSuggestions };
}
