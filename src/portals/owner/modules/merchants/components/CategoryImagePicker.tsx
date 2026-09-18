import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload, AlertCircle } from "lucide-react";
import { apiService, type ApiStoreCategoryImageMeta } from "../../../../../services/apiService";
import { ConfirmDialog } from "@/components/panel";
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
      // There was no .catch here at all, and getMerchantCategoryImage has an
      // EMPTY catch of its own (apiService.ts:789-796) that returns null
      // without even logging. So a 500 on the photo endpoint was
      // indistinguishable from a category that simply has no photo.
      .catch((err) => {
        if (cancelled) return;
        console.warn("Could not load the category photo:", err);
        setError("The photo could not be loaded. It may still be there.");
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
          uploadErr?.response?.data?.message || "The photo could not be saved. Please try again.",
        );
      }
    } catch (err: any) {
      setError(
        err instanceof CategoryImageError ? err.message : "That image could not be processed.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleRemove = async () => {
    // The native confirm that used to gate this is gone. It rendered in
    // browser chrome with no product voice, and its consequence (the customer
    // app falling back to a stock icon) was jammed into a window.confirm body
    // using escape characters for layout. ConfirmDialog states it properly.
    setConfirmRemove(false);
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
        className={`relative w-full h-24 sm:h-28 rounded-plate overflow-hidden border border-edge transition group ${
          hasImage ? "border-edge bg-slate-900" : "border-dashed border-edge bg-board-ground"
        }`}
      >
        {isLoadingPreview && !previewSrc ? (
          <div className="absolute inset-0 flex items-center justify-center bg-board-ground">
            <Loader2 size={18} className="animate-spin text-ink-muted" />
          </div>
        ) : previewSrc ? (
          <>
            <img
              src={previewSrc}
              alt={`${categoryName} photo`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* The gradient scrim is gone, and with it the 9px and 10px type
                and the drop-shadow that were propping up white text over an
                unknown photo. The caption now sits on a solid band below the
                image, where it is legible whatever the photo contains. */}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-board-field-deep px-2 py-1">
              <span className="truncate text-micro uppercase text-board-plate">{categoryName}</span>
              {imageMeta && (
                <span data-figure className="shrink-0 font-mono text-micro text-board-trim">
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
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-ink-muted hover:text-board-field hover:bg-board-ground transition p-2 text-center"
          >
            <Camera size={18} />
            <span className="text-label">Add Photo</span>
          </button>
        )}

        {isBusy && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center gap-1.5 text-white text-label">
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
          className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-trim bg-board-ground hover:bg-board-ground text-ink-muted hover:text-ink border border-edge text-label transition disabled:opacity-50"
        >
          {hasImage ? <Upload size={11} /> : <Camera size={11} />}
          <span>{hasImage ? "Change" : "Upload"}</span>
        </button>

        {hasImage && (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            disabled={isBusy}
            className="p-1 rounded-trim text-ink-muted hover:text-status-act-ink hover:bg-status-act-fill border border-edge hover:border-status-act-ink/40 transition-colors disabled:opacity-50"
            title={`Remove photo for ${categoryName}`}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {error && (
        // No truncate. This used to be `truncate`, so any server message
        // longer than the 100px-odd control clipped to nothing useful.
        <p className="flex items-start gap-1 text-micro text-status-act-ink">
          <AlertCircle size={11} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove this photo?"
        body={`The photo for "${categoryName}" will be deleted.`}
        consequence="The customer app falls back to a default stock icon for this category."
        confirmLabel="Remove the photo"
        onConfirm={() => void handleRemove()}
        busy={isRemoving}
      />
    </div>
  );
};
