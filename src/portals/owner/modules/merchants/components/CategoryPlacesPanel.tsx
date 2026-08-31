import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { Building2, Compass, Loader2, MapPin, Plus, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { apiService, type ApiVerifiedPlace } from "../../../../../services/apiService";

interface CategoryPlacesPanelProps {
  categoryId: number;
  categoryName: string;
  onCountResolved?: (count: number) => void;
  onSelectCategoryForPlaces?: (categoryId: number) => void;
}

const INLINE_LIMIT = 5;

export const CategoryPlacesPanel: React.FC<CategoryPlacesPanelProps> = ({
  categoryId,
  categoryName,
  onCountResolved,
  onSelectCategoryForPlaces,
}) => {
  const [places, setPlaces] = useState<ApiVerifiedPlace[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const directoryHref = `/places?categoryId=${categoryId}`;

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    const result = await apiService.getPlacesByCategory(categoryId);
    if (result) {
      setPlaces(result);
      onCountResolved?.(result.length);
    } else {
      setLoadError(true);
    }
    setIsLoading(false);
  }, [categoryId, onCountResolved]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
        <Loader2 size={15} className="animate-spin text-[#1E3A5F]" />
        <span className="text-xs font-medium">Loading location stores…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
          <AlertCircle size={14} className="shrink-0" />
          <span>Could not load stores for this category.</span>
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
        >
          <RefreshCw size={12} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!places || places.length === 0) {
    return (
      <div className="p-4 bg-slate-50/80 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
        <MapPin size={22} className="text-slate-300 mx-auto" />
        <p className="text-xs font-bold text-slate-700">
          No stores pinned to {categoryName} yet
        </p>
        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
          Add ground-truth establishment pins so customers can browse and order from this category.
        </p>
        {onSelectCategoryForPlaces ? (
          <button
            type="button"
            onClick={() => onSelectCategoryForPlaces(categoryId)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E3A5F] hover:bg-[#162D4A] text-white text-xs font-bold transition shadow-2xs"
          >
            <Plus size={13} />
            <span>Pin First Store</span>
          </button>
        ) : (
          <Link
            to={directoryHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E3A5F] hover:bg-[#162D4A] text-white text-xs font-bold transition shadow-2xs"
          >
            <Plus size={13} />
            <span>Pin First Store</span>
          </Link>
        )}
      </div>
    );
  }

  const visible = places.slice(0, INLINE_LIMIT);
  const hiddenCount = places.length - visible.length;
  const inactiveCount = places.filter((p) => !p.isActive).length;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
          <Building2 size={13} className="text-slate-400" />
          <span>Pinned Location Stores ({places.length})</span>
          {inactiveCount > 0 && (
            <span className="normal-case tracking-normal font-semibold text-slate-400">
              · {inactiveCount} retired
            </span>
          )}
        </p>
        {onSelectCategoryForPlaces ? (
          <button
            type="button"
            onClick={() => onSelectCategoryForPlaces(categoryId)}
            className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 transition"
          >
            <Compass size={13} />
            <span>Open in Stores Tab</span>
          </button>
        ) : (
          <Link
            to={directoryHref}
            className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 transition"
          >
            <Compass size={13} />
            <span>Open in Directory</span>
          </Link>
        )}
      </div>

      <ul className="divide-y divide-slate-100">
        {visible.map((place) => (
          <li key={place.id} className="hover:bg-slate-50/70 transition">
            <div className="flex items-center justify-between gap-3 px-3.5 py-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    place.isActive ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  title={place.isActive ? "Active" : "Retired"}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {place.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {place.barangay ? `${place.barangay} · ` : ""}
                    {place.address}
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap shrink-0 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {hiddenCount > 0 && (
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-center">
          {onSelectCategoryForPlaces ? (
            <button
              type="button"
              onClick={() => onSelectCategoryForPlaces(categoryId)}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 transition"
            >
              View all {places.length} stores in {categoryName} →
            </button>
          ) : (
            <Link
              to={directoryHref}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 transition"
            >
              View all {places.length} stores in {categoryName} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
