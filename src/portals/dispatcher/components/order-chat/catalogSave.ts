import type { StorePinpoint } from "./types";

type PinCategory = Pick<StorePinpoint, "categoryId" | "categorySource">;

/**
 * A pin's category was inferred (Google types, the store's name, or the
 * category service), not chosen or matched to the catalogue. Step 2 marks
 * these as waiting for a dispatcher to confirm.
 */
export function isGuessedCategory(pin: PinCategory | null | undefined): boolean {
  return (
    pin?.categoryId != null &&
    (pin.categorySource === "google" || pin.categorySource === "name" || pin.categorySource === "model")
  );
}

export type CatalogSaveBlock = "tooShort" | "noStores" | "noCategory" | "guessedCategory";

/**
 * Why an item cannot be saved to the catalog against this store yet, or null
 * when it can. A catalog row outlives the order, so a guessed category is
 * refused: it would be served to every later search as if it were settled.
 */
export function catalogSaveBlock(input: {
  itemName: string;
  storeCount: number;
  category: string | null | undefined;
  pin: PinCategory | null | undefined;
}): CatalogSaveBlock | null {
  if (input.itemName.trim().length < 2) return "tooShort";
  if (input.storeCount === 0) return "noStores";
  if (!input.category) return "noCategory";
  if (isGuessedCategory(input.pin)) return "guessedCategory";
  return null;
}
