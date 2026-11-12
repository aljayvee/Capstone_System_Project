import React, { useRef, useState } from "react";
import { AlertCircle, Camera, Loader2, Trash2, Upload } from "lucide-react";
import {
  ACCEPTED_IMAGE_ACCEPT_ATTR,
  CategoryImageError,
  prepareCategoryImage,
  type PreparedCategoryImage,
} from "../../../../../utils/prepareCategoryImage";
import { storePhotoUrl } from "../../../../../utils/storePhoto";

/** What the save will do to the photo: keep it, put this one up, or take it down. */
export type PhotoChange = { kind: "keep" } | { kind: "set"; image: PreparedCategoryImage } | { kind: "remove" };

interface StorePhotoFieldProps {
  placeId: string | null;
  photoUpdatedAt: string | null;
  storeName: string;
  change: PhotoChange;
  onChange: (change: PhotoChange) => void;
}

/**
 * The storefront photo (2026-10-13): ours to keep, unlike Google's, and shown
 * on the store's card in the customer app. It goes up with the store's other
 * changes when the form is saved.
 */
export function StorePhotoField({ placeId, photoUpdatedAt, storeName, change, onChange }: StorePhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = placeId && photoUpdatedAt ? storePhotoUrl(placeId, photoUpdatedAt) : null;
  const shown = change.kind === "set" ? change.image.imageData : change.kind === "remove" ? null : current;

  const picked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setIsPreparing(true);
    try {
      onChange({ kind: "set", image: await prepareCategoryImage(file) });
    } catch (err) {
      setError(err instanceof CategoryImageError ? err.message : "That image could not be read. Use a JPEG, PNG or WebP photo.");
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-stretch gap-3">
        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-plate border border-edge bg-board-ground">
          {shown ? (
            <img src={shown} alt={`${storeName || "Store"} storefront`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-muted">
              <Camera size={16} />
              <span className="text-micro uppercase">No photo</span>
            </div>
          )}
          {isPreparing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 text-white">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-1.5">
          <p className="m-0 text-micro text-ink-muted">
            {change.kind === "set"
              ? "New photo, saved with the store."
              : change.kind === "remove"
                ? "The photo is removed when you save."
                : "Shown on the store's card in the customer app. JPEG, PNG or WebP, 2 MB at most."}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isPreparing}
              className="inline-flex min-h-8 items-center gap-1 rounded-plate border border-edge bg-board-plate px-2.5 text-label text-ink transition-colors hover:bg-board-ground disabled:opacity-50"
            >
              {shown ? <Upload size={13} /> : <Camera size={13} />}
              <span>{shown ? "Change photo" : "Upload photo"}</span>
            </button>
            {change.kind === "set" ? (
              <button
                type="button"
                onClick={() => onChange({ kind: "keep" })}
                className="inline-flex min-h-8 items-center rounded-plate px-2.5 text-label text-ink-muted transition-colors hover:bg-board-ground hover:text-ink"
              >
                Undo
              </button>
            ) : shown ? (
              <button
                type="button"
                onClick={() => onChange({ kind: "remove" })}
                className="inline-flex min-h-8 items-center gap-1 rounded-plate px-2.5 text-label text-status-act-ink transition-colors hover:bg-status-act-fill"
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            ) : change.kind === "remove" ? (
              <button
                type="button"
                onClick={() => onChange({ kind: "keep" })}
                className="inline-flex min-h-8 items-center rounded-plate px-2.5 text-label text-ink-muted transition-colors hover:bg-board-ground hover:text-ink"
              >
                Keep the photo
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT_ATTR}
        onChange={picked}
        className="hidden"
        aria-label={`Upload a storefront photo for ${storeName || "this store"}`}
      />
      {error ? (
        <p role="alert" className="m-0 flex items-center gap-1.5 text-label text-status-act-ink">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
