import { metresBetween } from "../../../../../utils/geo";
import { normalizeStoreName } from "../../../../../utils/storeName";
import type { StorePinpoint, MerchantCategory } from "../types";

/**
 * The two rules that make pinning smarter: what kind of shop is this, and have
 * we already pinned it.
 *
 * Both are pure and exported deliberately. They decide whether a rider is sent
 * to the right shop and whether the customer is charged an extra multi-store
 * fee, and neither outcome is observable from the UI unless an order happens to
 * be in exactly the wrong state — so they need to be exercisable directly.
 */

// ── category inference ─────────────────────────────────────────────────────

/**
 * Google's place `types` mapped onto our four merchant categories.
 *
 * Order matters. A Jollibee comes back as
 * `["restaurant","food","point_of_interest","establishment"]`, so the specific
 * types must be consulted before the generic tail — otherwise the bare `store`
 * entry would win and file every restaurant under Retail.
 *
 * Matching is by category NAME because that is the only stable identifier we
 * share with the server; ids are per-environment.
 */
export const GOOGLE_TYPE_TO_CATEGORY: ReadonlyArray<{
  types: readonly string[];
  categoryName: string;
}> = [
  {
    // Ahead of Fast Food, which also lists "bakery". The live catalogue has a
    // Bakery category, and filing Google's `bakery` type under Fast Food sent a
    // pinned Julie's Bakeshop there on 2026-09-23 - and because this rule had
    // answered, the category service (which only fills MISSING categories) was
    // never asked. Where the catalogue has no Bakery row, the name lookup below
    // finds nothing and falls through to the Fast Food rule, as before.
    categoryName: "Bakery",
    types: ["bakery"],
  },
  {
    categoryName: "Pharmacy & Health",
    types: ["pharmacy", "drugstore", "doctor", "hospital", "dentist", "physiotherapist", "health"],
  },
  {
    categoryName: "Supermarket & Grocery",
    types: ["supermarket", "grocery_or_supermarket", "grocery_store", "convenience_store", "liquor_store"],
  },
  {
    categoryName: "Fast Food & Restaurant",
    types: ["restaurant", "meal_takeaway", "meal_delivery", "cafe", "bakery", "bar", "food"],
  },
  {
    categoryName: "Retail & General Merchandise",
    types: [
      "department_store",
      "clothing_store",
      "hardware_store",
      "electronics_store",
      "home_goods_store",
      "furniture_store",
      "shoe_store",
      "book_store",
      "pet_store",
      "shopping_mall",
      "store",
    ],
  },
] as const;

/**
 * Best-guess merchant category id for a Google Places result.
 *
 * Returns null rather than guessing when nothing matches — a wrong category
 * silently skews the ETA's dwell allowance, the geofence radius and the revenue
 * report, so "don't know" is a better answer than "probably retail".
 */
export function inferCategoryFromGoogleTypes(
  googleTypes: string[] | undefined | null,
  categories: MerchantCategory[]
): number | null {
  if (!googleTypes?.length || !categories.length) return null;

  const present = new Set(googleTypes.map((t) => String(t).toLowerCase()));

  for (const rule of GOOGLE_TYPE_TO_CATEGORY) {
    if (!rule.types.some((t) => present.has(t))) continue;
    const match = categories.find(
      (c) => c.name.toLowerCase() === rule.categoryName.toLowerCase()
    );
    if (match) return match.id;
  }
  return null;
}

/**
 * Best-guess category by matching a free-text store name against the catalogue.
 *
 * The catalogue's `keywords` column already carries aliases and misspellings
 * ("jollibee, jolibee, chickenjoy"), and the server's `/places?search=` matches
 * on it — so a caller that already ran that search can hand the results here and
 * borrow the category of whichever entry actually refers to the same shop.
 *
 * Requires a normalised-name match, not merely a search hit: `?search=` also
 * matches on address and barangay, so "Poblacion" would otherwise adopt the
 * category of every shop on that street.
 */
export function inferCategoryFromCatalogueName(
  storeName: string,
  catalogueHits: Array<{ name?: string; categoryId?: number | null }>
): number | null {
  const target = normalizeStoreName(storeName);
  if (!target) return null;
  for (const hit of catalogueHits || []) {
    if (hit?.categoryId == null) continue;
    if (normalizeStoreName(hit.name || "") === target) return hit.categoryId;
  }
  return null;
}

// ── duplicate detection ────────────────────────────────────────────────────

/**
 * How close two pins must be to be treated as the same shop.
 *
 * Deliberately tighter than the server's 75 m geofence radius, because real
 * catalogue neighbours sit closer than that: Greenwich to Chowking is ~62 m and
 * Jollibee Main to Greenwich ~89 m. A 75 m rule would refuse genuinely different
 * shops; 40 m clears the closest real pair with room to spare while still
 * catching two clicks on one building.
 */
export const SAME_PLACE_METERS = 40;

export type DuplicateVerdict =
  | { kind: "none" }
  /** Same catalogue place. Provably one shop — refuse. */
  | { kind: "exact"; index: number; existing: StorePinpoint }
  /** Probably one shop, but two real shops can share a building — let them override. */
  | { kind: "likely"; index: number; existing: StorePinpoint; reason: "distance" | "name"; metres: number };

/**
 * Is this candidate already pinned?
 *
 * Duplicates are not merely untidy: the server prices a "store" as
 * `pinpoints.length`, so a second pin on the same shop adds a multi-store fee
 * to a quote the customer has already agreed to.
 */
export function findDuplicatePin(
  candidate: Pick<StorePinpoint, "storeName" | "latitude" | "longitude" | "placeId">,
  existing: StorePinpoint[]
): DuplicateVerdict {
  const candLat = Number(candidate.latitude);
  const candLng = Number(candidate.longitude);
  const hasCoords = Number.isFinite(candLat) && Number.isFinite(candLng);

  // Provable first: two pins carrying the same catalogue id are the same shop,
  // whatever their coordinates say.
  for (let i = 0; i < existing.length; i++) {
    const pin = existing[i];
    if (candidate.placeId && pin.placeId && String(candidate.placeId) === String(pin.placeId)) {
      return { kind: "exact", index: i, existing: pin };
    }
  }

  for (let i = 0; i < existing.length; i++) {
    const pin = existing[i];
    const pinLat = Number(pin.latitude);
    const pinLng = Number(pin.longitude);

    if (hasCoords && Number.isFinite(pinLat) && Number.isFinite(pinLng)) {
      const metres = metresBetween(
        { lat: candLat, lng: candLng },
        { lat: pinLat, lng: pinLng }
      );
      if (metres < SAME_PLACE_METERS) {
        return { kind: "likely", index: i, existing: pin, reason: "distance", metres };
      }
    }

    const candName = normalizeStoreName(candidate.storeName || "");
    if (candName && candName === normalizeStoreName(pin.storeName || "")) {
      const metres =
        hasCoords && Number.isFinite(pinLat) && Number.isFinite(pinLng)
          ? metresBetween({ lat: candLat, lng: candLng }, { lat: pinLat, lng: pinLng })
          : 0;
      return { kind: "likely", index: i, existing: pin, reason: "name", metres };
    }
  }

  return { kind: "none" };
}
