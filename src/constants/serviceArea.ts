/**
 * Tacurong City service-area bounds.
 *
 * Single source for the operating envelope. The same box is used to clip the
 * OpenStreetMap extract that the routing engine is built from
 * (server/gis/build-graph.ps1) — so a store the dispatcher is allowed to pin is
 * always a store the router has roads for. Widening one without the other means
 * pinning destinations the router silently cannot reach.
 */
export const SERVICE_AREA_BOUNDS = {
  south: 6.62,
  west: 124.6,
  north: 6.74,
  east: 124.73,
} as const;

/** Map centre for Tacurong City. */
export const TACURONG_CENTER = { lat: 6.671, lng: 124.6644 } as const;

export function isWithinServiceArea(lat: number, lng: number): boolean {
  return (
    lat >= SERVICE_AREA_BOUNDS.south &&
    lat <= SERVICE_AREA_BOUNDS.north &&
    lng >= SERVICE_AREA_BOUNDS.west &&
    lng <= SERVICE_AREA_BOUNDS.east
  );
}
