import React, { useEffect, useRef, useState } from "react";
import { Camera, ImageOff, Loader2, Trash2, Upload, AlertCircle } from "lucide-react";
import { apiService, type ApiStoreCategoryImageMeta } from "../../../../../services/apiService";
import {
  prepareCategoryImage,
  formatImageSize,
  CategoryImageError,
  ACCEPTED_IMAGE_ACCEPT_ATTR,
} from "../../../../../utils/prepareCategoryImage";

interface CategoryImagePickerProps {
  categoryId: number;
  categoryName: string;
  /** Metadata from the category list. `null` means no photo has been set. */
  imageMeta: ApiStoreCategoryImageMeta | null | undefined;
  /** Bubbles the new metadata (or null after a removal) up to the list state. */
  onImageChanged: (meta: ApiStoreCategoryImageMeta | null) => void;
}

export const CategoryImagePicker: React.FC<CategoryImagePickerProps> = ({
  categoryId,
  categoryName,
  imageMeta,
  onImageChanged,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasImage = Boolean(imageMeta);
  const imageVersion = imageMeta?.updatedAt ?? null;

  useEffect(() => {
    if (!imageVersion) {
      setPreviewSrc(null);
      return;
    }

    let cancelled = false;
    setIsLoadingPreview(true);

    apiService
      .getMerchantCategoryImage(categoryId)
      .then((image) => {
        if (!cancelled) setPreviewSrc(image?.imageData ?? null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId, imageVersion]);

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const prepared = await prepareCategoryImage(file);
      const previousPreview = previewSrc;
      setPreviewSrc(prepared.imageData);

      try {
        const meta = await apiService.uploadMerchantCategoryImage(categoryId, {
          imageData: prepared.imageData,
          mimeType: prepared.mimeType,
          fileSize: prepared.fileSize,
          fileName: prepared.fileName,
        });
        onImageChanged(meta);
      } catch (uploadErr: any) {
        setPreviewSrc(previousPreview);
        throw new CategoryImageError(
          uploadErr?.response?.data?.message || "The photo could not be saved. Please try again."
        );
      }
    } catch (err: any) {
      setError(err instanceof CategoryImageError ? err.message : "That image could not be processed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    const confirmed = window.confirm(
      `Remove photo for "${categoryName}"?\n\nThe customer app will fall back to a default stock icon for this category.`
    );
    if (!confirmed) return;

    setError(null);
    setIsRemoving(true);
    try {
      await apiService.deleteMerchantCategoryImage(categoryId);
      setPreviewSrc(null);
      onImageChanged(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "The photo could not be removed. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  const isBusy = isUploading || isRemoving;

  return (
    <div className="space-y-1.5 w-full">
      {/* Thumbnail Container */}
      <div
        className={`relative w-full h-24 sm:h-28 rounded-xl overflow-hidden border transition group ${
          hasImage ? "border-slate-200 bg-slate-900" : "border-dashed border-slate-300 bg-slate-50"
        }`}
      >
        {isLoadingPreview && !previewSrc ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
            <Loader2 size={18} className="animate-spin text-slate-400" />
          </div>
        ) : previewSrc ? (
          <>
            <img
              src={previewSrc}
              alt={`${categoryName} photo`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
            <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-white truncate drop-shadow-sm">
                {categoryName}
              </span>
              {imageMeta && (
                <span className="text-[9px] font-mono text-slate-200 font-semibold drop-shadow-sm">
                  {formatImageSize(imageMeta.fileSize)}
                </span>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-[#1E3A5F] hover:bg-slate-100/70 transition p-2 text-center"
          >
            <Camera size={18} />
            <span className="text-[10px] font-bold">Add Photo</span>
          </button>
        )}

        {isBusy && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center gap-1.5 text-white text-[10px] font-bold">
            <Loader2 size={14} className="animate-spin" />
            <span>{isUploading ? "Uploading..." : "Removing..."}</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT_ATTR}
        onChange={handleFilePicked}
        className="hidden"
        aria-label={`Upload a photo for ${categoryName}`}
      />

      {/* Quick Action Buttons */}
      <div className="flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 text-[10px] font-bold transition disabled:opacity-50"
        >
          {hasImage ? <Upload size={11} /> : <Camera size={11} />}
          <span>{hasImage ? "Change" : "Upload"}</span>
        </button>

        {hasImage && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isBusy}
            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition disabled:opacity-50"
            title={`Remove photo for ${categoryName}`}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1 text-[10px] font-semibold text-red-600">
          <AlertCircle size={11} className="shrink-0" />
          <span className="truncate">{error}</span>
        </p>
      )}
    </div>
  );
};
