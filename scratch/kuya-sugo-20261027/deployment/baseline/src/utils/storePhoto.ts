import { apiClient } from "../services/apiClient";

/**
 * A Location Store's storefront photo address (GET /api/places/:id/photo,
 * served with no sign-in). `v` names the version, so a changed photo is a new
 * address and never a stale cached one.
 */
export function storePhotoUrl(placeId: string, photoUpdatedAt: string): string {
  const base = String(apiClient.defaults.baseURL ?? "").replace(/\/+$/, "");
  return `${base}/places/${encodeURIComponent(placeId)}/photo?v=${new Date(photoUpdatedAt).getTime()}`;
}
