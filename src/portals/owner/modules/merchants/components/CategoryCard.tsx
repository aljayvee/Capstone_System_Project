import React, { useState } from "react";
import { Link } from "react-router";
import { Pencil, Check, Building2, ChevronDown, MapPin, Tag } from "lucide-react";
import {
  apiService,
  type ApiMerchantCategory,
  type ApiRateConfig,
  type ApiStoreCategoryImageMeta,
  type HandlingFeeMode,
} from "../../../../../services/apiService";
import {
  HANDLING_FEE_MODES,
  describeHandlingFeeMode,
  shortHandlingFeeMode,
} from "../handlingFeeMode";
import { CategoryImagePicker } from "./CategoryImagePicker";
import { CategoryPlacesPanel } from "./CategoryPlacesPanel";

interface CategoryRowCardProps {
  category: ApiMerchantCategory;
  onUpdated: (updated: ApiMerchantCategory) => void;
  onSelectCategoryForPlaces?: (categoryId: number) => void;
  /** Live rates, so the fee-mode labels quote real figures rather than hardcoded ones. */
  rateConfig?: ApiRateConfig | null;
}

export const CategoryRowCard: React.FC<CategoryRowCardProps> = ({
  category,
  onUpdated,
  onSelectCategoryForPlaces,
  rateConfig,
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [status, setStatus] = useState<"Active" | "Inactive">(category.status);
  const [handlingFeeMode, setHandlingFeeMode] = useState<HandlingFeeMode>(
    category.handlingFeeMode ?? "THRESHOLD",
  );
  const [geofenceRadius, setGeofenceRadius] = useState<string>(
    String(category.geofenceRadiusMeters ?? 75),
  );
  const [isSaving, setIsSaving] = useState(false);
  // The server refuses bills-payment category names and explains which term it
  // matched. handleSave used to be try/finally with no catch, so that rejection
  // vanished and the edit just appeared not to save.
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showPlaces, setShowPlaces] = useState(false);
  const [resolvedPlacesCount, setResolvedPlacesCount] = useState<number | null>(null);

  // `?? 0` used to close this expression, so a category whose _count the API
  // did not include rendered "0 Stores" - asserting the category is empty when
  // nobody had said how many it holds. Null means unknown and prints a dash.
  const placesCount = resolvedPlacesCount ?? category._count?.places ?? null;
  const directoryHref = `/places?categoryId=${category.id}`;

  const handleImageChanged = (meta: ApiStoreCategoryImageMeta | null) => {
    onUpdated({ ...category, image: meta });
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    // A radius outside this band cannot do its job: too small and no GPS fix can
    // prove the rider is inside it, too large and it swallows the neighbouring
    // shops the geofence exists to tell apart.
    const radiusMeters = Number(geofenceRadius);
    if (!Number.isFinite(radiusMeters) || radiusMeters < 25 || radiusMeters > 500) {
      setSaveError("Arrival radius must be between 25 and 500 metres.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await apiService.updateMerchantCategory(category.id, {
        name: name.trim(),
        description: description.trim(),
        status,
        handlingFeeMode,
        geofenceRadiusMeters: radiusMeters,
      });
      if (updated) {
        onUpdated({ ...updated, _count: category._count, image: category.image });
        setEditing(false);
      } else {
        setSaveError("Could not save this category. Please try again.");
      }
    } catch (err: any) {
      // Shown as written: the server's message names the exact term it objected
      // to, which is the difference between a usable rejection and a dead end.
      setSaveError(
        err?.response?.data?.message || "Could not save this category. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(category.name);
    setDescription(category.description || "");
    setStatus(category.status);
    setHandlingFeeMode(category.handlingFeeMode ?? "THRESHOLD");
    setGeofenceRadius(String(category.geofenceRadiusMeters ?? 75));
    setSaveError(null);
    setEditing(false);
  };

  return (
    <div
      className={`bg-board-plate border border-edge rounded-plate p-5 transition-all duration-200 flex flex-col justify-between ${
        editing ? " ring-2  bg-status-waiting-fill" : "border-edge hover:border-edge"
      }`}
    >
      <div className="space-y-4">
        {/* Main Card Content: Image + Details */}
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* Category Hero Image */}
          <div className="w-full sm:w-36 shrink-0">
            <CategoryImagePicker
              categoryId={category.id}
              categoryName={category.name}
              imageMeta={category.image}
              onImageChanged={handleImageChanged}
            />
          </div>

          {/* Category Details / Inline Editing Form */}
          <div className="flex-1 min-w-0 space-y-2 w-full">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-micro text-ink-muted uppercase mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-ink text-label bg-board-plate border border-edge rounded-plate px-3 py-2 outline-none focus:ring-2 focus:ring-board-field/20 focus:border-board-field transition"
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <label className="block text-micro text-ink-muted uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-label text-ink bg-board-plate border border-edge rounded-plate px-3 py-1.5 outline-none focus:ring-2 focus:ring-board-field/20 focus:border-board-field transition resize-none"
                    placeholder="Brief description of items or partner stores..."
                  />
                </div>
                <div>
                  <label className="block text-micro text-ink-muted uppercase mb-1">
                    Customer Visibility Status
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatus("Active")}
                      className={`px-3 py-1 rounded-trim text-label transition ${
                        status === "Active"
                          ? "bg-status-done-ink text-white"
                          : "bg-board-ground text-ink-muted hover:bg-board-ground"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("Inactive")}
                      className={`px-3 py-1 rounded-trim text-label transition ${
                        status === "Inactive"
                          ? "bg-board-field text-white"
                          : "bg-board-ground text-ink-muted hover:bg-board-ground"
                      }`}
                    >
                      Inactive
                    </button>
                  </div>
                </div>

                {/* Purchase handling fee. Labelled in business terms with the
                    live figures folded in, so the owner never has to know what
                    "THRESHOLD" means. The amounts themselves stay in Service
                    Rates — only which rule applies is per-category. */}
                <div>
                  <label className="block text-micro text-ink-muted uppercase mb-1">
                    Purchase Handling Fee
                  </label>
                  <select
                    value={handlingFeeMode}
                    onChange={(e) => setHandlingFeeMode(e.target.value as HandlingFeeMode)}
                    className="w-full text-label text-ink bg-board-plate border border-edge rounded-plate px-3 py-1.5 outline-none focus:ring-2 focus:ring-board-field/20 focus:border-board-field transition"
                  >
                    {HANDLING_FEE_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {describeHandlingFeeMode(mode, rateConfig)}
                      </option>
                    ))}
                  </select>
                  <p className="text-label text-ink-muted mt-1">
                    Charged on the value of the goods, on top of the delivery fee.
                  </p>
                </div>

                <div>
                  <label className="block text-micro uppercase text-ink-muted mb-1">
                    Arrival Radius
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={25}
                      max={500}
                      step={5}
                      value={geofenceRadius}
                      onChange={(e) => setGeofenceRadius(e.target.value)}
                      data-testid="category-geofence-radius"
                      className="w-24 text-label text-ink bg-board-plate border border-edge rounded-plate px-3 py-1.5 outline-none focus:ring-2 focus:ring-board-field/20 focus:border-board-field transition"
                    />
                    <span className="text-label text-ink-muted">metres</span>
                  </div>
                  <p className="text-label text-ink-muted mt-1">
                    How close the rider must get before this stop counts as reached. A supermarket
                    needs a wider circle than a roadside carinderia.
                  </p>
                </div>

                {saveError && (
                  <p className="text-label text-status-act-ink bg-status-act-fill border border-status-act-ink/20 rounded-plate px-3 py-2">
                    {saveError}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h3 className=" text-ink text-panel truncate">{category.name}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-micro uppercase border border-edge shrink-0 ${
                      category.status === "Active"
                        ? "bg-status-done-fill text-status-done-ink "
                        : "bg-board-ground text-ink-muted border-edge"
                    }`}
                  >
                    {category.status}
                  </span>
                </div>
                <p className="text-label text-ink-muted line-clamp-3 leading-relaxed">
                  {category.description || (
                    <span className="text-ink-muted">No category description provided.</span>
                  )}
                </p>
                {/* Visible without opening the editor: pricing that can only be
                    seen by clicking into each category is pricing nobody checks. */}
                <div
                  className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-trim bg-board-ground border border-edge"
                  title={describeHandlingFeeMode(
                    category.handlingFeeMode ?? "THRESHOLD",
                    rateConfig,
                  )}
                >
                  <Tag size={11} className="text-ink-muted" />
                  <span className="text-micro text-ink-muted uppercase">
                    {shortHandlingFeeMode(category.handlingFeeMode ?? "THRESHOLD")}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Action Rail */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-hairline">
          {editing ? (
            <div className="flex items-center gap-2 w-full justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-1.5 rounded-plate border border-edge hover:bg-board-ground text-ink-muted text-label transition"
                title="Cancel Edit"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 bg-board-field hover:bg-board-field-deep text-white text-label rounded-plate transition flex items-center gap-1.5"
                title="Save Changes"
              >
                <Check size={14} />
                <span>Save</span>
              </button>
            </div>
          ) : (
            <>
              {/* Linked Stores Disclosure Pill */}
              <button
                type="button"
                onClick={() => setShowPlaces((open) => !open)}
                aria-expanded={showPlaces}
                className={`flex items-center gap-2 rounded-plate border border-edge px-3 py-1.5 text-label transition-colors ${
                  showPlaces
                    ? "bg-board-ground text-ink"
                    : "bg-board-plate text-ink-muted hover:bg-board-ground hover:text-ink"
                }`}
                title={
                  placesCount === null
                    ? `Show the location stores in ${category.name}. The number of stores is not known.`
                    : `Show ${placesCount} location store${placesCount === 1 ? "" : "s"} in ${category.name}`
                }
              >
                <Building2 size={14} className={showPlaces ? "" : "text-ink-muted"} />
                <span className="font-mono font-bold text-ink">
                  {placesCount === null ? "--" : placesCount}
                </span>
                <span className="text-body text-ink-muted">Stores</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${showPlaces ? "rotate-180" : ""}`}
                />
              </button>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {onSelectCategoryForPlaces ? (
                  <button
                    type="button"
                    onClick={() => onSelectCategoryForPlaces(category.id)}
                    className="p-2 rounded-plate bg-board-ground hover:bg-board-ground text-ink-muted hover:text-ink border border-edge transition flex items-center gap-1 text-label"
                    title={`View ${category.name} location stores`}
                  >
                    <MapPin size={14} />
                    <span className="hidden md:inline">Map Pins</span>
                  </button>
                ) : (
                  <Link
                    to={directoryHref}
                    className="p-2 rounded-plate bg-board-ground hover:bg-board-ground text-ink-muted hover:text-ink border border-edge transition flex items-center gap-1 text-label"
                    title={`Manage ${category.name} locations in directory`}
                  >
                    <MapPin size={14} />
                    <span className="hidden md:inline">Map Pins</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="p-2 rounded-plate bg-board-ground hover:bg-status-waiting-fill text-ink-muted hover:text-status-waiting-ink border border-edge transition"
                  title="Edit Category Details"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expanded Pinned Stores Panel */}
      {showPlaces && (
        <div className="mt-4 pt-4 border-t border-hairline animate-in fade-in slide-in-from-top-1 duration-200">
          <CategoryPlacesPanel
            categoryId={category.id}
            categoryName={category.name}
            onCountResolved={setResolvedPlacesCount}
            onSelectCategoryForPlaces={onSelectCategoryForPlaces}
          />
        </div>
      )}
    </div>
  );
};
