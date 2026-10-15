import * as React from "react";
import { useState } from "react";
import {
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { apiClient } from "../../../../../services/apiClient";
import { apiService, type ApiMerchantCategory } from "../../../../../services/apiService";

export interface ArchivedPlace {
  id: string;
  name: string;
  address: string;
  barangay?: string | null;
  categoryId: number;
  isActive: boolean;
  latitude: number;
  longitude: number;
  keywords?: string | null;
}

interface ArchiveTabProps {
  categories: ApiMerchantCategory[];
  places: ArchivedPlace[];
  isLoadingPlaces?: boolean;
  placesError?: string | null;
  categoriesError?: string | null;
  onCategoryRestored: (updated: ApiMerchantCategory) => void;
  onPlaceRestored: () => void;
}

export const ArchiveTab: React.FC<ArchiveTabProps> = ({
  categories,
  places,
  isLoadingPlaces = false,
  placesError = null,
  categoriesError = null,
  onCategoryRestored,
  onPlaceRestored,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** What a restore did that the owner should know: which stores came back without a Google Maps link. */
  const [notice, setNotice] = useState<string | null>(null);
  /** Retired stores ticked for "Restore selected". */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBulkRestoring, setIsBulkRestoring] = useState(false);

  const archivedCategories = categories.filter((c) => c.status !== "Active");
  const retiredPlaces = places.filter((p) => !p.isActive);

  const categoryCount =
    categoriesError && categories.length === 0 ? "--" : String(archivedCategories.length);
  const placeCount = placesError && places.length === 0 ? "--" : String(retiredPlaces.length);
  const categoryName = (id: number) => categories.find((c) => c.id === id)?.name ?? "Uncategorised";

  const restoreCategory = async (category: ApiMerchantCategory) => {
    setBusyId(`c${category.id}`);
    setError(null);
    try {
      const updated = await apiService.updateMerchantCategory(category.id, { status: "Active" });
      if (updated) onCategoryRestored(updated);
      else setError(`Could not restore "${category.name}". Try again.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || `Could not restore "${category.name}". Try again.`);
    } finally {
      setBusyId(null);
    }
  };

  const restorePlace = async (place: ArchivedPlace) => {
    setBusyId(`p${place.id}`);
    setError(null);
    setNotice(null);
    try {
      // A store with no Google Maps link comes back too: the server links it
      // on the way when Google Maps has it, and otherwise leaves it unlinked.
      const res = await apiClient.put(`/places/${place.id}`, { isActive: true });
      if (!res.data?.googlePlaceId && !res.data?.ownerPinned) {
        setNotice(
          `"${place.name}" is restored but not on Google Maps. Edit it in Location Stores to link it, or pin it on the map yourself.`,
        );
      }
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(place.id);
        return next;
      });
      onPlaceRestored();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || `Could not restore "${place.name}". Try again.`);
    } finally {
      setBusyId(null);
    }
  };

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Restore selected: every ticked store in one request, then one summary of what came back how. */
  const restoreSelected = async () => {
    const ids = retiredPlaces.filter((p) => selected.has(p.id)).map((p) => p.id);
    if (ids.length === 0) return;
    setIsBulkRestoring(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.post("/places/restore", { ids });
      const results: Array<{ id: string; name: string | null; restored: boolean; linked: boolean; error: string | null }> =
        res.data?.results ?? [];
      const restored = results.filter((r) => r.restored);
      const unlinked = restored.filter((r) => !r.linked).map((r) => r.name ?? r.id);
      const failed = results.filter((r) => r.error).map((r) => retiredPlaces.find((p) => p.id === r.id)?.name ?? r.id);
      setSelected(new Set(failed.length ? results.filter((r) => r.error).map((r) => r.id) : []));
      const parts = [`${restored.length} store${restored.length === 1 ? "" : "s"} restored.`];
      if (unlinked.length) {
        parts.push(
          `Not on Google Maps yet: ${unlinked.join(", ")}. Edit ${unlinked.length === 1 ? "it" : "each"} in Location Stores to link ${unlinked.length === 1 ? "it" : "them"}, or pin ${unlinked.length === 1 ? "it" : "them"} on the map yourself.`,
        );
      }
      setNotice(parts.join(" "));
      if (failed.length) setError(`Could not restore: ${failed.join(", ")}. They are still selected; try again.`);
      onPlaceRestored();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || "The stores could not be restored. Try again.");
    } finally {
      setIsBulkRestoring(false);
    }
  };

  const selectedCount = retiredPlaces.filter((p) => selected.has(p.id)).length;
  const allSelected = retiredPlaces.length > 0 && selectedCount === retiredPlaces.length;

  const nothingArchived = archivedCategories.length === 0 && retiredPlaces.length === 0;

  if (nothingArchived && !isLoadingPlaces && !placesError) {
    return (
      <div className="flex-1 min-h-0 bg-board-plate border border-edge rounded-plate flex items-center justify-center">
        <div className="text-center max-w-sm px-6 py-10">
          <div className="w-12 h-12 rounded-plate bg-status-done-fill border border-status-done-ink/20 grid place-items-center mx-auto text-status-done-ink">
            <CheckCircle2 size={22} />
          </div>
          <p className="text-label font-semibold text-ink mt-3 mb-0">Nothing archived</p>
          <p className="text-label text-ink-muted mt-1 mb-0 leading-relaxed">
            Categories set to Archive and retired stores appear here for one-click restoration.
          </p>
          {/* The last restore emptied the Archive: its summary still matters. */}
          {notice ? (
            <p
              role="status"
              className="mt-4 mb-0 flex items-start gap-2 rounded-plate bg-status-waiting-fill px-3 py-2.5 text-left text-label text-status-waiting-ink"
            >
              <Info size={14} className="mt-0.5 shrink-0" />
              {notice}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-board-plate border border-edge rounded-plate flex flex-col overflow-hidden">
      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 text-label text-status-act-ink bg-status-act-fill border-b border-status-act-ink/20 px-4 py-2.5 m-0 shrink-0"
        >
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-start gap-2 text-label text-status-waiting-ink bg-status-waiting-fill border-b border-status-waiting-ink/20 px-4 py-2.5 m-0 shrink-0"
        >
          <Info size={14} className="mt-0.5 shrink-0" />
          {notice}
        </p>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-hairline">
        {/* Archived Categories Section (shown when non-empty or if both sections are displayed) */}
        {(archivedCategories.length > 0 || Boolean(categoriesError)) && (
          <div>
            <div className="px-4 py-2.5 bg-board-ground border-b border-edge">
              <p className="text-label font-semibold text-ink m-0">
                Archived Categories ({categoryCount})
              </p>
            </div>
            <ul className="divide-y divide-hairline m-0 p-0 list-none">
              {archivedCategories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-board-ground/60 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-label font-semibold text-ink truncate m-0">
                      {category.name}
                    </p>
                    <p className="text-label text-ink-muted truncate m-0 mt-0.5">
                      {category._count?.places ?? 0} store
                      {(category._count?.places ?? 0) === 1 ? "" : "s"} linked
                      {category.description ? ` · ${category.description}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreCategory(category)}
                    disabled={busyId === `c${category.id}`}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-plate bg-board-plate border border-edge text-label text-ink hover:bg-board-ground transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {busyId === `c${category.id}` ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RotateCcw size={13} />
                    )}
                    <span>Restore</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Retired Stores Section */}
        {(retiredPlaces.length > 0 || isLoadingPlaces || Boolean(placesError)) && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-board-ground border-b border-edge">
              <label className="flex items-center gap-2.5 text-label font-semibold text-ink">
                {retiredPlaces.length > 0 && !isLoadingPlaces && !placesError ? (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedCount > 0 && !allSelected;
                    }}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(retiredPlaces.map((p) => p.id)))
                    }
                    aria-label="Select all retired stores"
                    className="h-4 w-4 cursor-pointer"
                  />
                ) : null}
                <span>
                  Retired Stores ({placeCount})
                  {retiredPlaces.length > 0 && !isLoadingPlaces && !placesError ? (
                    <span className="ml-1.5 font-normal text-ink-muted">Select all</span>
                  ) : null}
                </span>
              </label>
              {selectedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void restoreSelected()}
                  disabled={isBulkRestoring}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-plate bg-board-field px-3 text-label text-white transition-colors hover:bg-board-field-deep disabled:opacity-60"
                >
                  {isBulkRestoring ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                  <span>Restore selected ({selectedCount})</span>
                </button>
              ) : null}
            </div>

            {isLoadingPlaces ? (
              <p className="flex items-center gap-2 text-label text-ink-muted px-4 py-4 m-0">
                <Loader2 size={14} className="animate-spin" />
                Loading retired stores...
              </p>
            ) : placesError ? (
              <p
                role="alert"
                className="flex items-center gap-2 px-4 py-4 m-0 text-label text-status-act-ink"
              >
                <AlertCircle size={14} className="shrink-0" />
                {placesError}
              </p>
            ) : (
              <ul className="divide-y divide-hairline m-0 p-0 list-none">
                {retiredPlaces.map((place) => (
                  <li
                    key={place.id}
                    className={`flex items-center justify-between gap-4 px-4 py-3 transition ${
                      selected.has(place.id) ? "bg-board-ground" : "hover:bg-board-ground/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(place.id)}
                      onChange={() => toggleSelected(place.id)}
                      aria-label={`Select ${place.name}`}
                      className="h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-label font-semibold text-ink truncate m-0">
                        {place.name}
                      </p>
                      <p className="text-label text-ink-muted truncate m-0 mt-0.5">
                        {categoryName(place.categoryId)}
                        {place.barangay ? ` · ${place.barangay}` : ""} · {place.address}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => restorePlace(place)}
                      disabled={busyId === `p${place.id}` || isBulkRestoring}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-plate bg-board-plate border border-edge text-label text-ink hover:bg-board-ground transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {busyId === `p${place.id}` ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RotateCcw size={13} />
                      )}
                      <span>Restore</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
