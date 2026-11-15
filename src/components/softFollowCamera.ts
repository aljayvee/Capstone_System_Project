export interface CameraViewportBounds {
  northEast: { lat: number; lng: number };
  southWest: { lat: number; lng: number };
}

export interface SoftFollowCameraInput {
  target: { lat: number; lng: number };
  followSelected: boolean;
  needsInitialZoom: boolean;
  currentZoom: number | null | undefined;
  bounds: CameraViewportBounds | null | undefined;
}

export interface SoftFollowCameraAction {
  shouldPan: boolean;
  nextZoom: number | null;
}

/**
 * Computes soft-follow camera updates for LiveFleetMap.
 * - Initial rider selection always centers (`shouldPan: true`) and zooms to 16 if `< 15`.
 * - Subsequent telemetry updates pan only when the rider leaves the inner 60% comfort box,
 *   and never override an operator's manual zoom-out.
 */
export function computeSoftFollowCameraAction(
  input: SoftFollowCameraInput
): SoftFollowCameraAction {
  if (!input.followSelected) {
    return { shouldPan: false, nextZoom: null };
  }

  const nextZoom =
    input.needsInitialZoom && (input.currentZoom ?? 14) < 15 ? 16 : null;

  if (!input.bounds || input.needsInitialZoom) {
    return { shouldPan: true, nextZoom };
  }

  const { northEast, southWest } = input.bounds;
  const latSpan = northEast.lat - southWest.lat;
  const lngSpan = northEast.lng - southWest.lng;
  const marginLat = latSpan * 0.2;
  const marginLng = lngSpan * 0.2;

  const insideComfortBox =
    input.target.lat >= southWest.lat + marginLat &&
    input.target.lat <= northEast.lat - marginLat &&
    input.target.lng >= southWest.lng + marginLng &&
    input.target.lng <= northEast.lng - marginLng;

  return {
    shouldPan: !insideComfortBox,
    nextZoom,
  };
}
