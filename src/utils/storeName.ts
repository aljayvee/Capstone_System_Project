/**
 * Store-name normalisation.
 *
 * Nothing in this app has tolerated a spelling variation since the hard-coded
 * POI list was deleted: "Jollibee", "JOLLIBEE Tacurong" and "Jolibee" are three
 * unrelated strings to every code path. This is the one place that decides when
 * two names refer to the same shop, so both the dispatcher's duplicate check and
 * the owner's places form agree on the answer.
 *
 * Deliberately conservative. It folds case, accents, punctuation and the
 * dispatcher's own `"Store 2 - "` labelling, and stops there — it does NOT do
 * fuzzy or edit-distance matching, because a false "these are the same shop"
 * costs more than a missed one: the dispatcher can always pin anyway, but a
 * wrongly-refused pin sends the rider to the wrong place.
 */

/** `"Store 2 - Jollibee"` — the label shape the item editor writes. */
const STORE_LABEL_PREFIX = /^store\s*\d+\s*[-–—:]\s*/i;

/** Corporate suffixes that never distinguish one branch from another. */
const NOISE_WORDS = new Set([
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "co",
  "ltd",
  "philippines",
  "ph",
  "branch",
  "store",
  "shop",
  "the",
]);

/**
 * A comparable form of a store name. Equal outputs mean "almost certainly the
 * same shop"; different outputs mean nothing on their own.
 *
 * Note what is intentionally KEPT: branch qualifiers like "main", "drive-thru",
 * "dt", "center", "highway". Jollibee Center and Jollibee Drive-Thru are 440 m
 * apart and are genuinely different stops — collapsing them would be the exact
 * mistake this function exists to avoid.
 */
export function normalizeStoreName(input: string): string {
  if (!input) return "";

  return (
    input
      .normalize("NFD")
      // strip combining accent marks
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(STORE_LABEL_PREFIX, "")
      // punctuation and symbols become spaces, so "chooks-to-go" == "chooks to go"
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((word) => word.length > 0 && !NOISE_WORDS.has(word))
      .join(" ")
      .trim()
  );
}

/** True when two names normalise to the same thing and that thing isn't empty. */
export function isSameStoreName(a: string, b: string): boolean {
  const na = normalizeStoreName(a);
  return na.length > 0 && na === normalizeStoreName(b);
}
