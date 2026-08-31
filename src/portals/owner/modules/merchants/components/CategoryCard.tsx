import React, { useState } from "react";
import { Link } from "react-router";
import {
  Pencil,
  Check,
  Building2,
  ChevronDown,
  X,
  MapPin,
  Tag,
  Sparkles,
} from "lucide-react";
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
  index: number;
  /** Live rates, so the fee-mode labels quote real figures rather than hardcoded ones. */
  rateConfig?: ApiRateConfig | null;
}

const CATEGORY_COLOR_SCHEMES = [
  { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
];

export const CategoryRowCard: React.FC<CategoryRowCardProps> = ({
  category,
  onUpdated,
  onSelectCategoryForPlaces,
  index,
  rateConfig,
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [status, setStatus] = useState<"Active" | "Inactive">(category.status);
  const [handlingFeeMode, setHandlingFeeMode] = useState<HandlingFeeMode>(
    category.handlingFeeMode ?? "THRESHOLD"
  );
  const [geofenceRadius, setGeofenceRadius] = useState<string>(
    String(category.geofenceRadiusMeters ?? 75)
  );
  const [isSaving, setIsSaving] = useState(false);
  // The server refuses bills-payment category names and explains which term it
  // matched. handleSave used to be try/finally with no catch, so that rejection
  // vanished and the edit just appeared not to save.
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showPlaces, setShowPlaces] = useState(false);
  const [resolvedPlacesCount, setResolvedPlacesCount] = useState<number | null>(null);

  const scheme = CATEGORY_COLOR_SCHEMES[index % CATEGORY_COLOR_SCHEMES.length];
  const placesCount = resolvedPlacesCount ?? category._count?.places ?? 0;
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
        err?.response?.data?.message || "Could not save this category. Please try again."
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
      className={`bg-white border rounded-2xl p-5 shadow-xs transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
        editing
          ? "border-amber-400 ring-2 ring-amber-100 bg-amber-50/10"
          : "border-slate-200/90 hover:border-slate-300"
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full font-bold text-slate-900 text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] transition"
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] transition resize-none"
                    placeholder="Brief description of items or partner stores..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Customer Visibility Status
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatus("Active")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        status === "Active"
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("Inactive")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        status === "Inactive"
                          ? "bg-slate-700 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Purchase Handling Fee
                  </label>
                  <select
                    value={handlingFeeMode}
                    onChange={(e) => setHandlingFeeMode(e.target.value as HandlingFeeMode)}
                    className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] transition"
                  >
                    {HANDLING_FEE_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {describeHandlingFeeMode(mode, rateConfig)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Charged on the value of the goods, on top of the delivery fee.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
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
                      className="w-24 text-xs text-slate-700 bg-white border border-slate-300 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] transition"
                    />
                    <span className="text-xs font-semibold text-slate-500">metres</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    How close the rider must get before this stop counts as reached.
                    A supermarket needs a wider circle than a roadside carinderia.
                  </p>
                </div>

                {saveError && (
                  <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                    {saveError}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base truncate">
                    {category.name}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${
                      category.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {category.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {category.description || (
                    <span className="italic text-slate-400">No category description provided.</span>
                  )}
                </p>
                {/* Visible without opening the editor: pricing that can only be
                    seen by clicking into each category is pricing nobody checks. */}
                <div
                  className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200"
                  title={describeHandlingFeeMode(category.handlingFeeMode ?? "THRESHOLD", rateConfig)}
                >
                  <Tag size={11} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    {shortHandlingFeeMode(category.handlingFeeMode ?? "THRESHOLD")}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Action Rail */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
          {editing ? (
            <div className="flex items-center gap-2 w-full justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition"
                title="Cancel Edit"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 bg-[#1E3A5F] hover:bg-[#162D4A] text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-1.5"
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-2xs ${
                  showPlaces
                    ? `${scheme.bg} ${scheme.text} ${scheme.border}`
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
                title={`Show ${placesCount} location store${placesCount === 1 ? "" : "s"} in ${category.name}`}
              >
                <Building2 size={14} className={showPlaces ? "" : "text-slate-400"} />
                <span className="font-mono font-black text-slate-900">{placesCount}</span>
                <span className="text-[11px] text-slate-500 font-medium">Stores</span>
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
                    className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition shadow-2xs flex items-center gap-1 text-xs font-bold"
                    title={`View ${category.name} location stores`}
                  >
                    <MapPin size={14} />
                    <span className="hidden md:inline">Map Pins</span>
                  </button>
                ) : (
                  <Link
                    to={directoryHref}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition shadow-2xs flex items-center gap-1 text-xs font-bold"
                    title={`Manage ${category.name} locations in directory`}
                  >
                    <MapPin size={14} />
                    <span className="hidden md:inline">Map Pins</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 transition shadow-2xs"
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
        <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
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
