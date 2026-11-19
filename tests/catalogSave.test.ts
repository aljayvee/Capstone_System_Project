import assert from "node:assert/strict";
import test from "node:test";
import { catalogSaveBlock, isGuessedCategory } from "../src/portals/dispatcher/components/order-chat/catalogSave.ts";

const confirmed = { categoryId: 3, categorySource: "catalogue" as const };

test("isGuessedCategory: inferred sources are guesses, chosen or matched ones are not", () => {
  for (const source of ["google", "name", "model"] as const) {
    assert.equal(isGuessedCategory({ categoryId: 3, categorySource: source }), true, source);
  }
  for (const source of ["catalogue", "reverse", "manual", null] as const) {
    assert.equal(isGuessedCategory({ categoryId: 3, categorySource: source }), false, String(source));
  }
  // No category at all is not a guess; it is missing, which is reported separately.
  assert.equal(isGuessedCategory({ categoryId: null, categorySource: "model" }), false);
  assert.equal(isGuessedCategory(undefined), false);
});

test("catalogSaveBlock: allows a confirmed store and names the first thing missing otherwise", () => {
  const ok = { itemName: "Pandesal", storeCount: 2, category: "Bakery", pin: confirmed };
  assert.equal(catalogSaveBlock(ok), null);
  assert.equal(catalogSaveBlock({ ...ok, itemName: " a " }), "tooShort");
  assert.equal(catalogSaveBlock({ ...ok, storeCount: 0, category: undefined, pin: undefined }), "noStores");
  assert.equal(catalogSaveBlock({ ...ok, category: null }), "noCategory");
  assert.equal(catalogSaveBlock({ ...ok, pin: { categoryId: 3, categorySource: "model" } }), "guessedCategory");
});
