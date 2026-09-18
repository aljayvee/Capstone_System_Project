import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Building2,
  Compass,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  AlertCircle,
  List,
  Map as MapIcon,
} from "lucide-react";
import { PlacesMiniMap } from "../../../../../components/PlacesMiniMap";
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
  const [view, setView] = useState<"list" | "map">("list");
  /** Which row the cursor is on, so the map can point at the same shop. */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
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
      <div className="flex items-center justify-center gap-2 py-4 text-ink-muted bg-board-ground rounded-plate border border-edge">
        <Loader2 size={15} className="animate-spin text-board-field" />
        <span className="text-body">Loading location stores…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-status-waiting-fill border border-status-waiting-ink/20 rounded-plate">
        <p className="flex items-center gap-1.5 text-label text-status-waiting-ink">
          <AlertCircle size={14} className="shrink-0" />
          <span>Could not load stores for this category.</span>
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-trim bg-board-plate border border-status-waiting-ink/20 text-label text-status-waiting-ink hover:bg-status-waiting-fill transition"
        >
          <RefreshCw size={12} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (!places || places.length === 0) {
    return (
      <div className="p-4 bg-board-ground border border-dashed border-edge rounded-plate text-center space-y-2">
        <MapPin size={22} className="text-ink-muted mx-auto" />
        <p className="text-label text-ink">No stores pinned to {categoryName} yet</p>
        <p className="text-label text-ink-muted max-w-xs mx-auto">
          Add ground-truth establishment pins so customers can browse and order from this category.
        </p>
        {onSelectCategoryForPlaces ? (
          <button
            type="button"
            onClick={() => onSelectCategoryForPlaces(categoryId)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-trim bg-board-field hover:bg-board-field-deep text-white text-label transition"
          >
            <Plus size={13} />
            <span>Pin First Store</span>
          </button>
        ) : (
          <Link
            to={directoryHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-trim bg-board-field hover:bg-board-field-deep text-white text-label transition"
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
    <div className="border border-edge rounded-plate overflow-hidden bg-board-plate">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-board-ground border-b border-edge">
        <p className="flex items-center gap-1.5 text-micro text-ink uppercase">
          <Building2 size={13} className="text-ink-muted" />
          <span>Pinned Location Stores ({places.length})</span>
          {inactiveCount > 0 && (
            <span className="normal-case font-semibold text-ink-muted">
              · {inactiveCount} retired
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {/* View only - the editor lives in the Stores tab. Browsing a category
              should never be able to move a store's ground truth by misclick. */}
          <div
            className="flex items-center bg-board-ground p-0.5 rounded-trim"
            role="group"
            aria-label="View stores as"
          >
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={`flex items-center gap-1 px-2 py-1 rounded-trim text-label transition ${
                view === "list" ? "bg-board-plate text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              <List size={12} />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              aria-pressed={view === "map"}
              className={`flex items-center gap-1 px-2 py-1 rounded-trim text-label transition ${
                view === "map" ? "bg-board-plate text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              <MapIcon size={12} />
              <span>Map</span>
            </button>
          </div>

          {onSelectCategoryForPlaces ? (
            <button
              type="button"
              onClick={() => onSelectCategoryForPlaces(categoryId)}
              className="flex items-center gap-1 text-label text-ink hover:text-ink transition"
            >
              <Compass size={13} />
              <span>Open in Stores Tab</span>
            </button>
          ) : (
            <Link
              to={directoryHref}
              className="flex items-center gap-1 text-label text-ink hover:text-ink transition"
            >
              <Compass size={13} />
              <span>Open in Directory</span>
            </Link>
          )}
        </div>
      </div>

      {view === "map" ? (
        <div className="p-3 space-y-2">
          {/* The map shows EVERY store in the category, not the first five the
              list truncates to - a map has the room, and a partial map of
              store coverage would be misleading in a way a partial list is not. */}
          <PlacesMiniMap places={places} heightClass="h-64" focusId={hoveredId} />
          <div className="flex items-center justify-between gap-3 text-label text-ink-muted">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-status-done-ink" /> Active
              </span>
              {inactiveCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-status-closed-ink" /> Retired
                </span>
              )}
            </span>
            <span>Showing all {places.length} · tap a pin for details</span>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-hairline">
          {visible.map((place) => (
            <li
              key={place.id}
              className="hover:bg-board-ground transition"
              onMouseEnter={() => setHoveredId(place.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex items-center justify-between gap-3 px-3.5 py-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      place.isActive ? "bg-status-done-ink" : "bg-status-closed-ink"
                    }`}
                    title={place.isActive ? "Active" : "Retired"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-label text-ink truncate">{place.name}</p>
                    <p className="text-label text-ink-muted truncate">
                      {place.barangay ? `${place.barangay} · ` : ""}
                      {place.address}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-label text-ink-muted whitespace-nowrap shrink-0 bg-board-ground px-1.5 py-0.5 rounded border border-edge">
                  {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {view === "list" && hiddenCount > 0 && (
        <div className="px-3 py-2 bg-board-ground border-t border-edge text-center">
          {onSelectCategoryForPlaces ? (
            <button
              type="button"
              onClick={() => onSelectCategoryForPlaces(categoryId)}
              className="text-label text-ink hover:text-ink transition"
            >
              View all {places.length} stores in {categoryName} →
            </button>
          ) : (
            <Link to={directoryHref} className="text-label text-ink hover:text-ink transition">
              View all {places.length} stores in {categoryName} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
