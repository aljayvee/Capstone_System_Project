import { setOptions, importLibrary, LibraryMap } from "@googlemaps/js-api-loader";

let isOptionsSet = false;

/**
 * Whether Google Maps is actually usable right now.
 *
 * `"ok"`          - nothing has gone wrong (the optimistic default).
 * `"no-key"`      - VITE_GOOGLE_MAPS_API_KEY is missing, so nothing was even attempted.
 * `"auth-failed"` - Google loaded the script and then refused the key.
 */
export type GoogleMapsStatus = "ok" | "no-key" | "auth-failed";

let status: GoogleMapsStatus = "ok";
const listeners = new Set<(s: GoogleMapsStatus) => void>();

function setStatus(next: GoogleMapsStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((fn) => {
    try {
      fn(next);
    } catch {
      /* a broken listener must not stop the others being told */
    }
  });
}

export function getGoogleMapsStatus(): GoogleMapsStatus {
  return status;
}

/**
 * Subscribe to map availability. Fires immediately with the current status so a
 * caller mounting after the failure still learns about it. Returns an unsubscribe.
 */
export function onGoogleMapsStatus(fn: (s: GoogleMapsStatus) => void): () => void {
  listeners.add(fn);
  fn(status);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Ensures Google Maps API options (API Key, version) are initialized once.
 */
export function initGoogleMapsOptions(): void {
  if (isOptionsSet) return;

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";
  if (!apiKey) {
    console.warn("VITE_GOOGLE_MAPS_API_KEY is missing in environment variables.");
    setStatus("no-key");
    return;
  }

  // Google calls this global when it rejects the key — a billing account that
  // isn't linked, an unauthorised referrer, an API that was never enabled, or a
  // key that no longer exists. It is the ONLY signal that this has happened:
  // `importLibrary` still resolves, because the script itself downloaded fine.
  // Without this hook the app cannot tell a working map from a dead one, and a
  // dispatcher is left looking at Google's own "Do you own this website?"
  // overlay on a step they are required to complete.
  (window as any).gm_authFailure = () => {
    console.error(
      "Google Maps rejected the API key. Check the browser console for the " +
        "specific *MapError code (BillingNotEnabled / RefererNotAllowed / " +
        "ApiNotActivated / InvalidKey) and fix it in Google Cloud Console."
    );
    setStatus("auth-failed");
  };

  setOptions({
    key: apiKey,
    v: "weekly",
  });
  isOptionsSet = true;
}

/**
 * Dynamically imports a Google Maps library (e.g. 'maps', 'marker', 'places')
 * using modern @googlemaps/js-api-loader functional importLibrary API.
 */
export async function importGoogleMapsLibrary<K extends keyof LibraryMap>(
  name: K
): Promise<LibraryMap[K]> {
  initGoogleMapsOptions();
  return importLibrary(name);
}

/**
 * Convenience helper to ensure the core Google Maps script is loaded.
 */
export async function loadGoogleMapsScript(): Promise<LibraryMap["maps"]> {
  return importGoogleMapsLibrary("maps");
}
