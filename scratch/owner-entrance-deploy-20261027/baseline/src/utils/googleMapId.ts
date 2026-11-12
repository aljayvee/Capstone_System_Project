/**
 * Google Map ID — a credential separate from the Maps API key.
 *
 * `VITE_GOOGLE_MAPS_API_KEY` authorises the Maps JavaScript API. A **Map ID** is
 * a different thing entirely: it is created under *Map Management* in Google
 * Cloud Console and identifies a cloud-configured map style. Rotating or fixing
 * the API key does nothing for it.
 *
 * Advanced Markers (`google.maps.marker.AdvancedMarkerElement`) require one. On
 * a map without a Map ID they can be constructed without throwing, and then
 * render nothing at all — Google logs
 * "The map is initialized without a valid Map ID, which will prevent use of
 * Advanced Markers" once per marker and silently drops them.
 *
 * That is why `canUseAdvancedMarkers` tests the Map ID and not merely whether
 * the class exists. The class ALWAYS exists once the `marker` library has been
 * imported, so branching on it is a test that can never fail — which is exactly
 * how four separate map surfaces ended up creating invisible markers.
 */

export const GOOGLE_MAP_ID: string =
  (import.meta as any).env?.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID";

/**
 * True only when Advanced Markers will actually draw: the library is loaded AND
 * the map was given a Map ID. Callers must fall back to `google.maps.Marker`,
 * which needs no Map ID and renders fine.
 */
export function canUseAdvancedMarkers(g: any): boolean {
  return Boolean(GOOGLE_MAP_ID) && Boolean(g?.maps?.marker?.AdvancedMarkerElement);
}
