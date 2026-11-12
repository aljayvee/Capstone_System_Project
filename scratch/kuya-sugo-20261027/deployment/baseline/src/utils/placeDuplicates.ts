import { metresBetween } from "./geo";
import { normalizeStoreName } from "./storeName";

/**
 * Catches a place being added to the verified-places catalogue twice.
 *
 * `VerifiedPlace` has no uniqueness constraint of any kind — not on name, not
 * on coordinates — and `POST /api/places` does no pre-existence check, so two
 * "Jollibee" rows are perfectly legal. They are not harmless: the catalogue
 * feeds the dispatcher's store search (which then offers a disambiguation list
 * of identical-looking entries), the 50 m reverse lookup, and the server's
 * wrong-branch detector. A live search for "Jollibee" currently returns four
 * rows, two of which look like duplicates.
 *
 * This is a warning, never a refusal. A real shopping centre genuinely can hold
 * two shops a few metres apart, and the owner is the one who can tell.
 */

/**
 * How close two entries must be before proximity counts as evidence at all.
 *
 * Distance ALONE is not enough here, and the live catalogue proves it: Cebuana
 * Lhuillier sits 25 m from Jollibee Main, and Chowking and Greenwich are both
 * 35 m from a Palawan Express counter. Those are five different businesses
 * sharing a commercial strip, and a distance-only rule flagged every one of
 * them as a duplicate of its neighbour.
 *
 * So proximity is only half the test — see `namesLookRelated`.
 */
export const SAME_PLACE_METERS = 40;

/**
 * Do these two names plausibly refer to the same shop?
 *
 * Prefix containment rather than substring, so "Jollibee" relates to "Jollibee
 * Tacurong Center (Main)" while "Chowking Tacurong" and "Greenwich Tacurong"
 * stay unrelated — a bare substring test would tie together every shop with
 * "Tacurong" in its name, which is most of them.
 */
function namesLookRelated(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return `${longer} `.startsWith(`${shorter} `);
}

export interface CataloguePlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: { name?: string } | null;
}

export interface PlaceDuplicateWarning {
  existing: CataloguePlace;
  reason: "distance" | "name";
  metres: number;
}

/**
 * The catalogue entry a new place looks like a duplicate of, if any.
 *
 * `excludeId` skips the row being edited — otherwise every edit would warn that
 * the place duplicates itself.
 */
export function findDuplicatePlace(
  candidate: { name: string; latitude: number; longitude: number },
  catalogue: CataloguePlace[],
  excludeId?: string | null
): PlaceDuplicateWarning | null {
  const lat = Number(candidate.latitude);
  const lng = Number(candidate.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const name = normalizeStoreName(candidate.name || "");

  for (const place of catalogue || []) {
    if (excludeId && place.id === excludeId) continue;

    const pLat = Number(place.latitude);
    const pLng = Number(place.longitude);
    const comparable = hasCoords && Number.isFinite(pLat) && Number.isFinite(pLng);
    const metres = comparable
      ? metresBetween({ lat, lng }, { lat: pLat, lng: pLng })
      : Number.POSITIVE_INFINITY;

    const otherName = normalizeStoreName(place.name || "");

    // The same name is evidence on its own, at any distance — a second
    // "Jollibee Tacurong Center (Main)" row is a duplicate wherever it was put.
    if (name && name === otherName) {
      return { existing: place, reason: "name", metres: comparable ? metres : 0 };
    }

    // Nearby AND plausibly the same shop. Both halves are required: "nearby"
    // alone flags real neighbours in a commercial strip (see SAME_PLACE_METERS).
    if (comparable && metres < SAME_PLACE_METERS && namesLookRelated(name, otherName)) {
      return { existing: place, reason: "distance", metres };
    }
  }
  return null;
}

/** The sentence shown to the owner. Kept here so both copies of the form agree. */
export function describePlaceDuplicate(warning: PlaceDuplicateWarning): string {
  const category = warning.existing.category?.name ? ` (${warning.existing.category.name})` : "";
  // Each reason needs its own preposition - a single "at ${where}" template
  // produced "already in the directory at the same name".
  const how =
    warning.reason === "name"
      ? "is already in the directory under that name"
      : warning.metres < 1
      ? "is already in the directory on this exact spot"
      : `is already in the directory ${Math.round(warning.metres)} m from here`;
  return `"${warning.existing.name}"${category} ${how}. Adding it again splits searches and the arrival check between two entries.`;
}
