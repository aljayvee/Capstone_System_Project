/**
 * The "Store N - Name" labels step 2 files items under, read back (2026-10-10).
 *
 * Pure, and kept apart from useOrderItems so the rule can be run on its own:
 * it has to agree with the server's itemStopAssignment.matchByStoreLabel, or
 * the dispatcher's list and the rider's shopping list disagree about where an
 * item is bought.
 */

/** Firebase keys refuse . # $ / [ ], so labels are written without them. */
export const clean = (s: string) => (s || "").replace(/[.#$/[\]]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Which pinned store a "Store N - Name" label means, by position, or null.
 *
 * The name decides; the number only picks between two pins with the same name
 * (two branches of one chain). The number is where the store stood when the
 * item was filed, and after step 1's stores change it points at another shop:
 * "Store 1 - Kimsan Plaza" read as whatever was now store 1, and the customer's
 * card showed four stores for three pins. A label naming a store no longer
 * pinned is no store, so the item waits under "Not assigned yet". A bare
 * "Store 2" has only its number, and keeps it.
 *
 * Both sides go through `clean`, as the label did when it was written, so
 * "St. Joseph Drug" still matches its "St Joseph Drug" label.
 */
export function resolveStoreIndex(storeLabel: string, pinNames: string[]): number | null {
  const label = storeLabel.trim();
  const ordinal = /^store\s*(\d+)\b/i.exec(label);
  const at = ordinal ? Number(ordinal[1]) - 1 : null;
  const name = clean(label.replace(/^store\s*\d+\s*(?:[-:]\s*)?/i, "")).toLowerCase();

  if (!name) return at !== null && at >= 0 && at < pinNames.length ? at : null;

  const sameName = pinNames
    .map((pinName, i) => (clean(pinName || "").toLowerCase() === name ? i : -1))
    .filter((i) => i >= 0);
  if (sameName.length === 0) return null;
  return at !== null && sameName.includes(at) ? at : sameName[0];
}
