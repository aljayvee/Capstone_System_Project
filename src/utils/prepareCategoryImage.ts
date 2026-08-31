/**
 * Client-side preparation for a store category hero photo (`store_cat_image`).
 *
 * The owner picks a file straight off a phone or a camera roll, which in 2026
 * means a 4000px, 6MB JPEG. That image is eventually rendered into a 140px-tall
 * Bento tile on a customer's phone, frequently over mobile data in Tacurong, so
 * shipping the original would be paying megabytes for pixels nobody sees. Every
 * upload is therefore decoded, downscaled and re-encoded here before it leaves
 * the browser — the server's 2MB cap becomes a backstop rather than a wall the
 * owner keeps hitting.
 */

/** Longest edge of the stored image. 1200px covers a full-bleed hero tile on a
 *  3x phone display with room to spare. */
const MAX_EDGE_PX = 1200;

/** JPEG quality. 0.82 is the knee of the curve — visually indistinguishable
 *  from 0.95 at tile size, roughly a third of the bytes. */
const JPEG_QUALITY = 0.82;

/** Server-side ceiling, restated so the browser can reject before uploading. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** What the file picker will accept before we ever decode it. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const ACCEPTED_IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");

export interface PreparedCategoryImage {
  /** Base64 data URI, ready to render in an <img> and to PUT to the server. */
  imageData: string;
  mimeType: string;
  /** Decoded byte length of `imageData`, which is what the server validates. */
  fileSize: number;
  fileName: string;
  width: number;
  height: number;
}

export class CategoryImageError extends Error {}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new CategoryImageError("That file could not be read. Please try another image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new CategoryImageError("That file is not a readable image."));
    img.src = dataUrl;
  });
}

/** Byte length encoded by a base64 data URI, without allocating the buffer. */
function dataUriByteLength(dataUri: string): number {
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Validate, downscale and re-encode a picked file.
 *
 * Throws `CategoryImageError` with a message written for the owner rather than
 * for a log, so the caller can put it straight on screen next to the field —
 * inline, at the moment of the mistake, not after a failed save.
 */
export async function prepareCategoryImage(file: File): Promise<PreparedCategoryImage> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new CategoryImageError("Only JPG, PNG, and WebP images can be used as a category photo.");
  }

  // 12MB of source is already far past anything a 1200px tile needs, and
  // decoding a 50MP file can lock the tab. Refuse it up front.
  if (file.size > 12 * 1024 * 1024) {
    throw new CategoryImageError("That image is larger than 12MB. Please pick a smaller file.");
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(sourceDataUrl);

  const longestEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longestEdge > MAX_EDGE_PX ? MAX_EDGE_PX / longestEdge : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new CategoryImageError("This browser could not process the image. Please try a different browser.");
  }

  // PNG and WebP sources may carry transparency. The tile renders the photo
  // full-bleed behind a dark scrim, so a transparent background would composite
  // as black once flattened into JPEG — paint white first and keep it predictable.
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const mimeType = "image/jpeg";
  const imageData = canvas.toDataURL(mimeType, JPEG_QUALITY);
  const fileSize = dataUriByteLength(imageData);

  // Only reachable for pathological input (a huge, noisy photo that resists
  // compression). Say what to do about it rather than just refusing.
  if (fileSize > MAX_UPLOAD_BYTES) {
    throw new CategoryImageError(
      "Even after resizing, this image is over 2MB. Please crop it or pick a simpler photo."
    );
  }

  return {
    imageData,
    mimeType,
    fileSize,
    fileName: file.name.slice(0, 255),
    width,
    height,
  };
}

/** Human-readable size for the metadata line under the thumbnail. */
export function formatImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
