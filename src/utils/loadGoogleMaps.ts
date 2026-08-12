import { setOptions, importLibrary, LibraryMap } from "@googlemaps/js-api-loader";

let isOptionsSet = false;

/**
 * Ensures Google Maps API options (API Key, version) are initialized once.
 */
export function initGoogleMapsOptions(): void {
  if (isOptionsSet) return;

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";
  if (!apiKey) {
    console.warn("VITE_GOOGLE_MAPS_API_KEY is missing in environment variables.");
    return;
  }

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
