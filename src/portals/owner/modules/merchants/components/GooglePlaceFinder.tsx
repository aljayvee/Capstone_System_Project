import React, { useState } from "react";
import { AlertCircle, Check, Loader2, MapPin, Search } from "lucide-react";
import { apiClient } from "../../../../../services/apiClient";
import type { WeeklyHours } from "../../../../../utils/storeHours";

export interface GoogleDirectoryResult {
  googlePlaceId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  categoryId: number | null;
  categoryName: string | null;
  registered: { id: string; name: string; isActive: boolean } | null;
  looksLike: { id: string; name: string; isActive: boolean } | null;
}

/** One Google Maps place, as the server returns it to fill the form (GET /places/google/:id). */
export interface GooglePlaceDetails {
  googlePlaceId: string;
  name: string;
  address: string;
  barangay: string | null;
  latitude: number;
  longitude: number;
  categoryId: number | null;
  categoryName: string | null;
  temporarilyClosed: boolean;
  openingHours: WeeklyHours | null;
  registered: { id: string; name: string; isActive: boolean } | null;
}

interface GooglePlaceFinderProps {
  /** Words to start the search box with: an unlinked store's own name. */
  initialQuery?: string;
  categories: Array<{ id: number; name: string }>;
  /** The store being edited, whose own Google Maps place is not "registered elsewhere". */
  editingId: string | null;
  /** The Google Maps place the form holds now. */
  selectedGooglePlaceId: string | null;
  onPick: (place: GooglePlaceDetails) => void;
}

const errorOf = (err: any, fallback: string) => err?.response?.data?.error || err?.response?.data?.message || fallback;

/**
 * Find the store on Google Maps (2026-10-13). Every Location Store starts here:
 * search by name, or list a merchant category's shops, and pick the one to
 * register. Its name, address, position, category and hours fill the form.
 * Each search is a billed Google request, so it runs on Search, not per key.
 */
export function GooglePlaceFinder({ initialQuery, categories, editingId, selectedGooglePlaceId, onPick }: GooglePlaceFinderProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [browseCategory, setBrowseCategory] = useState<number | "">("");
  const [results, setResults] = useState<GoogleDirectoryResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async (params: { q?: string; categoryId?: number }) => {
    setError(null);
    setIsSearching(true);
    try {
      const res = await apiClient.get("/places/google", { params });
      setResults(res.data?.results ?? []);
    } catch (err) {
      setResults(null);
      setError(errorOf(err, "Google Maps could not be searched. Try again."));
    } finally {
      setIsSearching(false);
    }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError("Type at least 2 letters of the store's name.");
      return;
    }
    setBrowseCategory("");
    void search({ q });
  };

  const pick = async (result: GoogleDirectoryResult) => {
    setError(null);
    setPickingId(result.googlePlaceId);
    try {
      const res = await apiClient.get(`/places/google/${encodeURIComponent(result.googlePlaceId)}`);
      onPick(res.data as GooglePlaceDetails);
    } catch (err) {
      setError(errorOf(err, "That store could not be read from Google Maps. Try again."));
    } finally {
      setPickingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={14} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Inside the store form: Enter searches Google instead of saving the form.
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Store name on Google Maps, e.g. Mercury Drug"
            aria-label="Search Google Maps for the store"
            className="w-full rounded-plate border border-edge bg-board-ground py-2 pl-8 pr-3 text-body text-ink focus:bg-board-plate focus:outline-none focus:ring-2 focus:ring-board-field"
          />
        </div>
        <button
          type="button"
          onClick={() => submit()}
          disabled={isSearching}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-plate bg-board-field px-3 text-label text-white transition-colors hover:bg-board-field-deep disabled:opacity-60"
        >
          {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          <span>Search Google Maps</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-label text-ink-muted">
        <span className="shrink-0">Or list a category's stores:</span>
        <select
          value={browseCategory}
          aria-label="List Google Maps stores of a category"
          onChange={(e) => {
            const id = e.target.value === "" ? "" : Number(e.target.value);
            setBrowseCategory(id);
            if (id !== "") void search({ categoryId: id });
          }}
          className="min-w-0 flex-1 rounded-plate border border-edge bg-board-ground px-2 py-1.5 text-label text-ink"
        >
          <option value="">Choose a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p role="alert" className="m-0 flex items-start gap-1.5 rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      {isSearching ? (
        <div className="flex items-center gap-2 rounded-plate border border-edge px-3 py-3 text-label text-ink-muted">
          <Loader2 size={14} className="animate-spin" />
          Searching Google Maps...
        </div>
      ) : results && results.length === 0 ? (
        <p className="m-0 rounded-plate border border-edge px-3 py-3 text-label text-ink-muted">
          Google Maps found no store in Tacurong by that name. Try a shorter name, or the brand alone.
        </p>
      ) : results ? (
        <ul className="m-0 max-h-60 list-none divide-y divide-hairline overflow-y-auto rounded-plate border border-edge p-0">
          {results.map((result) => {
            const isCurrent = result.googlePlaceId === selectedGooglePlaceId;
            const takenElsewhere = result.registered && result.registered.id !== editingId;
            return (
              <li key={result.googlePlaceId}>
                <button
                  type="button"
                  disabled={Boolean(takenElsewhere) || pickingId !== null}
                  onClick={() => void pick(result)}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors disabled:cursor-not-allowed ${
                    isCurrent ? "bg-status-done-fill" : "hover:bg-board-ground"
                  } ${takenElsewhere ? "opacity-60" : ""}`}
                >
                  {pickingId === result.googlePlaceId ? (
                    <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin text-ink-muted" />
                  ) : isCurrent ? (
                    <Check size={15} className="mt-0.5 shrink-0 text-status-done-ink" />
                  ) : (
                    <MapPin size={15} className="mt-0.5 shrink-0 text-ink-muted" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label font-medium text-ink">{result.name}</span>
                    <span className="block truncate text-micro text-ink-muted">
                      {[result.categoryName, result.address].filter(Boolean).join(" · ")}
                    </span>
                    {takenElsewhere ? (
                      <span className="mt-0.5 block text-micro text-status-waiting-ink">
                        Already registered as "{result.registered!.name}"
                        {result.registered!.isActive ? "" : " (in the Archive)"}
                      </span>
                    ) : result.looksLike && result.looksLike.id !== editingId ? (
                      <span className="mt-0.5 block text-micro text-status-waiting-ink">
                        Looks like "{result.looksLike.name}", already registered
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
