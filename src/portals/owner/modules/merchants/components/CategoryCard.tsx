import React, { useState } from "react";
import { Link } from "react-router";
import { Pencil, Check, MapPin, X, AlertCircle } from "lucide-react";
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
import { ConfirmDialog } from "@/components/panel";

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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
  const [saveError, setSaveError] = useState<string | null>(null);

  const placesCount = category._count?.places ?? null;
  const directoryHref = `/places?categoryId=${category.id}`;

  const handleImageChanged = (meta: ApiStoreCategoryImageMeta | null) => {
    onUpdated({ ...category, image: meta });
  };

  const getModifiedFields = (): Array<{ label: string; from: string; to: string }> => {
    const changes: Array<{ label: string; from: string; to: string }> = [];
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    const radiusMeters = Number(geofenceRadius);

    if (trimmedName !== category.name) {
      changes.push({ label: "Category Name", from: category.name, to: trimmedName });
    }
    if (trimmedDesc !== (category.description || "")) {
      changes.push({
        label: "Description",
        from: category.description || "(none)",
        to: trimmedDesc || "(none)",
      });
    }
    if (status !== category.status) {
      changes.push({ label: "Status", from: category.status, to: status });
    }
    if (handlingFeeMode !== (category.handlingFeeMode ?? "THRESHOLD")) {
      changes.push({
        label: "Purchase Service Fee",
        from: shortHandlingFeeMode(category.handlingFeeMode ?? "THRESHOLD"),
        to: shortHandlingFeeMode(handlingFeeMode),
      });
    }
    if (
      Number.isFinite(radiusMeters) &&
      radiusMeters !== (category.geofenceRadiusMeters ?? 75)
    ) {
      changes.push({
        label: "Arrival Radius",
        from: `${category.geofenceRadiusMeters ?? 75}m`,
        to: `${radiusMeters}m`,
      });
    }

    return changes;
  };

  const handleInitiateSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const radiusMeters = Number(geofenceRadius);
    if (!Number.isFinite(radiusMeters) || radiusMeters < 25 || radiusMeters > 500) {
      setSaveError("Arrival radius must be between 25 and 500 metres.");
      return;
    }

    const changes = getModifiedFields();
    if (changes.length === 0) {
      setEditing(false);
      return;
    }

    setSaveError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    const radiusMeters = Number(geofenceRadius);
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
        setShowConfirmModal(false);
        setEditing(false);
      } else {
        setShowConfirmModal(false);
        setSaveError("Could not save this category. Please try again.");
      }
    } catch (err: any) {
      setShowConfirmModal(false);
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
    <div className="px-5 py-4 hover:bg-board-ground/60 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left & Middle: Thumbnail + Category Info */}
        <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
          <div className="w-24 sm:w-28 shrink-0">
            <CategoryImagePicker
              categoryId={category.id}
              categoryName={category.name}
              imageMeta={category.image}
              onImageChanged={handleImageChanged}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-panel font-semibold text-ink truncate">{category.name}</h3>
            {category.description && (
              <p className="text-label text-ink-muted line-clamp-2 leading-relaxed">
                {category.description}
              </p>
            )}
            <p className="text-label text-ink-muted pt-0.5">
              <span>{shortHandlingFeeMode(category.handlingFeeMode ?? "THRESHOLD")}</span>
              <span className="mx-2 text-edge">·</span>
              <span className="font-mono">{category.geofenceRadiusMeters ?? 75}m</span>{" "}
              <span>arrival radius</span>
            </p>
          </div>
        </div>

        {/* Right: Store Count Navigation + Edit Action */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          {onSelectCategoryForPlaces ? (
            <button
              type="button"
              onClick={() => onSelectCategoryForPlaces(category.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-plate border border-edge bg-board-plate hover:bg-board-ground text-label text-ink transition"
              title={`View ${category.name} stores in Location Stores`}
            >
              <MapPin size={14} className="text-ink-muted" />
              <span className="font-mono font-semibold text-ink">
                {placesCount === null ? "--" : placesCount}
              </span>
              <span className="text-ink-muted">
                {placesCount === 1 ? "store" : "stores"}
              </span>
            </button>
          ) : (
            <Link
              to={directoryHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-plate border border-edge bg-board-plate hover:bg-board-ground text-label text-ink transition"
              title={`Manage ${category.name} locations in directory`}
            >
              <MapPin size={14} className="text-ink-muted" />
              <span className="font-mono font-semibold text-ink">
                {placesCount === null ? "--" : placesCount}
              </span>
              <span className="text-ink-muted">
                {placesCount === 1 ? "store" : "stores"}
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-plate border border-edge bg-board-plate hover:bg-board-ground text-label text-ink-muted hover:text-ink transition"
            title="Edit Category"
          >
            <Pencil size={14} />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Edit Category Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-fade-in">
          <div className="bg-board-plate border border-edge rounded-plate p-6 max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <h3 className="text-panel font-semibold text-ink">Edit Category</h3>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-trim hover:bg-board-ground text-ink-muted hover:text-ink transition"
              >
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="p-3 bg-status-act-fill border border-status-act-ink/20 text-status-act-ink rounded-plate text-label flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleInitiateSave} className="space-y-4">
              <div>
                <label className="block text-label font-medium text-ink mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-ink text-body bg-board-ground border border-edge rounded-plate px-3.5 py-2 outline-none focus:ring-2 focus:ring-board-field/20 focus:border-board-field focus:bg-board-plate transition"
                  placeholder="Category name"
                />
              </div>

              <div>
                <label className="block text-label font-medium text-ink mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-body text-ink bg-board-ground border border-edge rounded-plate px-3.5 py-2 outline-none focus:ring-2 focus:ring-board-field/20 focus:border-board-field focus:bg-board-plate transition resize-none"
                  placeholder="Brief description of items or partner stores..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-label font-medium text-ink mb-1">
                    Visibility
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatus("Active")}
                      className={`flex-1 px-3 py-2 rounded-plate text-label border transition ${
                        status === "Active"
                          ? "bg-status-done-ink text-white border-status-done-ink"
                          : "bg-board-ground text-ink-muted border-edge hover:text-ink"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("Inactive")}
                      className={`flex-1 px-3 py-2 rounded-plate text-label border transition ${
                        status === "Inactive"
                          ? "bg-board-field text-white border-board-field"
                          : "bg-board-ground text-ink-muted border-edge hover:text-ink"
                      }`}
                    >
                      Archive
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-label font-medium text-ink mb-1">
                    Arrival Radius (25–500m)
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
                      className="w-full text-body font-mono text-ink bg-board-ground border border-edge rounded-plate px-3.5 py-2 outline-none focus:ring-2 focus:ring-board-field/20 focus:border-board-field focus:bg-board-plate transition"
                    />
                    <span className="text-label text-ink-muted shrink-0">m</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-label font-medium text-ink mb-1">
                  Purchase Service Fee
                </label>
                <select
                  value={handlingFeeMode}
                  onChange={(e) => setHandlingFeeMode(e.target.value as HandlingFeeMode)}
                  className="w-full text-body text-ink bg-board-ground border border-edge rounded-plate px-3.5 py-2 outline-none focus:ring-2 focus:ring-board-field/20 focus:border-board-field focus:bg-board-plate transition"
                >
                  {HANDLING_FEE_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {describeHandlingFeeMode(mode, rateConfig)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-plate border border-edge hover:bg-board-ground text-ink-muted text-label transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-board-field hover:bg-board-field-deep text-white text-label rounded-plate transition flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title="Confirm Category Updates"
        tone="info"
        busy={isSaving}
        confirmLabel="Confirm & Update"
        cancelLabel="Back to Edit"
        onConfirm={handleConfirmSave}
        body={
          <div className="space-y-3">
            <p className="text-body text-ink">
              Update <span className="font-semibold text-ink">{category.name}</span> with the following changes?
            </p>
            <div className="rounded-plate border border-edge bg-board-ground p-3.5 space-y-2 text-label divide-y divide-hairline">
              {getModifiedFields().map((change, idx) => (
                <div key={idx} className={`flex items-start justify-between gap-3 ${idx > 0 ? "pt-2" : ""}`}>
                  <span className="text-ink-muted shrink-0">{change.label}:</span>
                  <span className="text-ink text-right font-medium">
                    <span className="line-through text-ink-muted mr-1.5">{change.from}</span>
                    <span className="text-board-field font-semibold">→ {change.to}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        }
      />
    </div>
  );
};
