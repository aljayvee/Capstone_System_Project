/**
 * Hands the browser a file it already has in memory.
 *
 * Sits beside downloadCSV.ts, which does the same job for text it builds
 * locally. This one exists because the report PDFs are fetched, not built: the
 * access token lives only in memory (see apiClient.ts), so a plain `<a href>` or
 * `window.open` — a browser navigation that never passes through axios — would
 * carry no Authorization header and simply 401. The bytes have to arrive through
 * the API client first, and this turns them into a download.
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";

  document.body.appendChild(link);
  link.click();
  link.remove();

  // Next macrotask, not this one: WebKit cancels the download if the object URL
  // is revoked before the navigation the click started has actually begun.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * The filename the server chose, read out of Content-Disposition.
 *
 * Prefers the RFC 5987 `filename*` form when present, since that is the one that
 * survives non-ASCII. Returns null when the header is absent — which happens if
 * the CORS config stops exposing it — so the caller can fall back rather than
 * downloading something called "download".
 */
export function filenameFromDisposition(header: string | undefined): string | null {
  if (!header) return null;

  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // A malformed header is not worth failing a download over.
    }
  }

  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : null;
}
