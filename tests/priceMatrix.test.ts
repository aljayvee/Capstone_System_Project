import assert from "node:assert/strict";
import test from "node:test";
import {
  computePriceMatrix,
  DEFAULT_RATE_POLICY_BOUNDS,
  resolveRateBounds,
  validateRateFields,
} from "../src/portals/owner/modules/rates/lib/priceMatrix.ts";

const LIVE_RATES = {
  id: 1,
  baseFee: 70,
  perKmRate: 10,
  multiStoreFeePerStore: 30,
  maxAdditionalStores: 2,
  groceryFeeThreshold: 1001,
  groceryFeePercent: 10,
  groceryFeeFlat: 50,
  nonCodThreshold: 3000,
  nonCodFeeHigh: 50,
  nonCodFeeLow: 15,
};

test("validateRateFields rejects million-peso and below-floor predatory rates", () => {
  const millionErrors = validateRateFields(
    { ...LIVE_RATES, baseFee: 1_000_000 },
    DEFAULT_RATE_POLICY_BOUNDS,
    ["baseFee"]
  );
  assert.equal(millionErrors.length, 1);
  assert.match(millionErrors[0], /Base Delivery Fare/);

  const zeroBaseErrors = validateRateFields(
    { ...LIVE_RATES, baseFee: 0 },
    DEFAULT_RATE_POLICY_BOUNDS,
    ["baseFee"]
  );
  assert.equal(zeroBaseErrors.length, 1);
  assert.match(zeroBaseErrors[0], /₱30/);

  const overPercentErrors = validateRateFields(
    { ...LIVE_RATES, groceryFeeThreshold: 1001, groceryFeeFlat: 50, groceryFeePercent: 45 },
    DEFAULT_RATE_POLICY_BOUNDS,
    ["groceryFeeThreshold", "groceryFeeFlat", "groceryFeePercent"]
  );
  assert.equal(overPercentErrors.length, 1);
  assert.match(overPercentErrors[0], /0% - 30%/);
});

test("validateRateFields enforces inverted non-COD and min threshold rules", () => {
  const errors = validateRateFields(
    { ...LIVE_RATES, nonCodFeeLow: 60, nonCodFeeHigh: 20 },
    DEFAULT_RATE_POLICY_BOUNDS,
    ["nonCodThreshold", "nonCodFeeLow", "nonCodFeeHigh"]
  );
  assert.ok(errors.some((msg) => /cannot be lower/i.test(msg)));
});

test("resolveRateBounds overrides defaults from server pricingRules while keeping store min >= 1", () => {
  const resolved = resolveRateBounds({
    baseFee: { min: 40, max: 250 },
    maxAdditionalStores: { min: 0, max: 5 },
  });
  assert.deepEqual(resolved.baseFee, { min: 40, max: 250 });
  assert.deepEqual(resolved.maxAdditionalStores, { min: 1, max: 5 });
  assert.deepEqual(resolved.perKmRate, DEFAULT_RATE_POLICY_BOUNDS.perKmRate);
});

test("computePriceMatrix matches StandardPricingStrategy distance ceiling and handling tiers", () => {
  const matrix = computePriceMatrix(LIVE_RATES, 2.0, 1000);
  assert.equal(matrix.percentSampleBasket, 2000);
  assert.equal(matrix.rows.length, 4);

  // 0 - 2.0 km: base ₱70, flat handling ₱50, 10% on ₱2,000 = ₱200, +1 store = ₱30
  assert.deepEqual(matrix.rows[0], {
    distanceLabel: "0 - 2.0 km (Base)",
    distanceKm: 2,
    excessKm: 0,
    standardSingleFee: 70,
    flatHandlingSingleFee: 120,
    percentHandlingSingleFee: 270,
    extraStopStandardFee: 100,
  });

  // 5.0 km: 3 excess km * ₱10 = ₱30 -> standard = ₱100
  assert.equal(matrix.rows[2].excessKm, 3);
  assert.equal(matrix.rows[2].standardSingleFee, 100);
  assert.equal(matrix.rows[2].flatHandlingSingleFee, 150);
  assert.equal(matrix.rows[2].percentHandlingSingleFee, 300);
  assert.equal(matrix.rows[2].extraStopStandardFee, 130);
});
