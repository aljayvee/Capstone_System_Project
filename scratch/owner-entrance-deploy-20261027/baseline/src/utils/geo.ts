/**
 * Small geographic helpers for the web app.
 *
 * The server has its own haversine in `src/lib/geo.ts`; this is the browser-side
 * equivalent, kept deliberately small. It lived module-private inside
 * `useStorePins.ts` until three separate callers needed it — pin de-duplication,
 * the map-click establishment matcher, and the owner's places form.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Metres between two points. Equirectangular rather than haversine: at Tacurong
 * scale (a ~14 km service box) the error is well under a metre, and every caller
 * here is comparing distances of tens of metres.
 */
export function metresBetween(a: LatLng, b: LatLng): number {
  const EARTH_RADIUS_M = 6371000;
  const rad = Math.PI / 180;
  const scale = Math.cos(((a.lat + b.lat) / 2) * rad);
  const dx = (b.lng - a.lng) * scale * rad * EARTH_RADIUS_M;
  const dy = (b.lat - a.lat) * rad * EARTH_RADIUS_M;
  return Math.hypot(dx, dy);
}

/** Tolerant of the `latitude`/`longitude` shape the API returns. */
export function toLatLng(v: {
  latitude?: number | string | null;
  longitude?: number | string | null;
}): LatLng | null {
  const lat = Number(v?.latitude);
  const lng = Number(v?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}
