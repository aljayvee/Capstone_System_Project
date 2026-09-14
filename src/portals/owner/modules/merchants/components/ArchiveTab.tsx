import * as React from "react";
import { useState } from "react";
import {
  Archive,
  Store,
  MapPin,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "../../../../../services/apiClient";
import { apiService, type ApiMerchantCategory } from "../../../../../services/apiService";

/**
 * Where retired things live, and the only place they can be brought back from.
 *
 * Setting a category Inactive (or a store Retired) now moves it out of its
 * normal tab entirely rather than hiding it behind a filter chip. That is the
 * difference between "archived" and "filtered": an archived thing exists in
 * exactly one place, so an owner scanning their live categories is looking at
 * the live set, not a view of it.
 *
 * Nothing here deletes. Restoring is always available, and the counts a
 * category carries (its stores) are untouched by archiving, so restoring puts
 * it back exactly as it was.
 */

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
  onCategoryRestored: (updated: ApiMerchantCategory) => void;
  onPlaceRestored: () => void;
}

export const ArchiveTab: React.FC<ArchiveTabProps> = ({
  categories,
  places,
  isLoadingPlaces = false,
  onCategoryRestored,
  onPlaceRestored,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const archivedCategories = categories.filter((c) => c.status !== "Active");
  const retiredPlaces = places.filter((p) => !p.isActive);
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
    try {
      // PUT is a partial update server-side (placeUpdateSchema is the create
      // schema `.partial()`), so only the flag being changed is sent.
      await apiClient.put(`/places/${place.id}`, { isActive: true });
      onPlaceRestored();
    } catch (err: any) {
      setError(err?.response?.data?.message || `Could not restore "${place.name}". Try again.`);
    } finally {
      setBusyId(null);
    }
  };

  const nothingArchived = archivedCategories.length === 0 && retiredPlaces.length === 0;

  if (nothingArchived && !isLoadingPlaces) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="text-center max-w-sm px-6 py-10">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 grid place-items-center mx-auto text-emerald-600">
            <CheckCircle2 size={26} />
          </div>
          <p className="text-sm font-extrabold text-slate-800 mt-3 mb-0">Nothing archived</p>
          <p className="text-xs text-slate-500 mt-1 mb-0 leading-relaxed">
            Categories you set to Inactive and stores you retire will appear here, ready to
            bring back.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 pb-4">
      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 m-0"
        >
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </p>
      )}

      {/* ── archived categories ─────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <header className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider m-0">
            <Store size={13} className="text-slate-400" />
            Archived categories ({archivedCategories.length})
          </p>
        </header>

        {archivedCategories.length === 0 ? (
          <p className="text-xs text-slate-400 px-4 py-4 m-0">No archived categories.</p>
        ) : (
          <ul className="divide-y divide-slate-100 m-0 p-0 list-none">
            {archivedCategories.map((category) => (
              <li key={category.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/70 transition">
                <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate m-0">{category.name}</p>
                  <p className="text-[10px] text-slate-500 truncate m-0">
                    {category._count?.places ?? 0} store
                    {(category._count?.places ?? 0) === 1 ? "" : "s"} still linked
                    {category.description ? ` · ${category.description}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => restoreCategory(category)}
                  disabled={busyId === `c${category.id}`}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {busyId === `c${category.id}` ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RotateCcw size={12} />
                  )}
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── retired stores ──────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <header className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider m-0">
            <MapPin size={13} className="text-slate-400" />
            Retired stores ({retiredPlaces.length})
          </p>
        </header>

        {isLoadingPlaces ? (
          <p className="flex items-center gap-2 text-xs text-slate-400 px-4 py-4 m-0">
            <Loader2 size={13} className="animate-spin" />
            Loading retired stores…
          </p>
        ) : retiredPlaces.length === 0 ? (
          <p className="text-xs text-slate-400 px-4 py-4 m-0">No retired stores.</p>
        ) : (
          <ul className="divide-y divide-slate-100 m-0 p-0 list-none">
            {retiredPlaces.map((place) => (
              <li key={place.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/70 transition">
                <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate m-0">{place.name}</p>
                  <p className="text-[10px] text-slate-500 truncate m-0">
                    {categoryName(place.categoryId)}
                    {place.barangay ? ` · ${place.barangay}` : ""} · {place.address}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => restorePlace(place)}
                  disabled={busyId === `p${place.id}`}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {busyId === `p${place.id}` ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RotateCcw size={12} />
                  )}
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1 m-0">
        <Archive size={11} className="shrink-0" />
        Archiving never deletes. Stores stay linked to their category, so restoring puts
        everything back as it was.
      </p>
    </div>
  );
};
