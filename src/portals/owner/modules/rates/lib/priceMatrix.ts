import type { ApiRateConfig } from "../../../../../services/apiService";

export type RateFieldKey = keyof Pick<
  ApiRateConfig,
  | "baseFee"
  | "perKmRate"
  | "multiStoreFeePerStore"
  | "maxAdditionalStores"
  | "groceryFeeThreshold"
  | "groceryFeeFlat"
  | "groceryFeePercent"
  | "nonCodThreshold"
  | "nonCodFeeLow"
  | "nonCodFeeHigh"
>;

export interface RateFieldBound {
  min: number;
  max: number;
}

export type RateBoundsMap = Record<RateFieldKey, RateFieldBound>;

/** Fallback copy of server RATE_CONFIG_BOUNDS for older server responses. */
export const DEFAULT_RATE_POLICY_BOUNDS: RateBoundsMap = {
  baseFee: { min: 30, max: 300 },
  perKmRate: { min: 5, max: 100 },
  multiStoreFeePerStore: { min: 0, max: 200 },
  maxAdditionalStores: { min: 1, max: 5 },
  groceryFeeThreshold: { min: 1000, max: 50000 },
  groceryFeeFlat: { min: 0, max: 500 },
  groceryFeePercent: { min: 0, max: 30 },
  nonCodThreshold: { min: 0, max: 50000 },
  nonCodFeeLow: { min: 0, max: 500 },
  nonCodFeeHigh: { min: 0, max: 500 },
};

const FIELD_LABELS: Record<RateFieldKey, string> = {
  baseFee: "Base Delivery Fare",
  perKmRate: "Excess Distance Rate",
  multiStoreFeePerStore: "Multi-Store Stop Fee",
  maxAdditionalStores: "Max Additional Stores",
  groceryFeeThreshold: "Grocery Order Threshold",
  groceryFeeFlat: "Grocery Flat Handling",
  groceryFeePercent: "Grocery Percentage Rate",
  nonCodThreshold: "Non-COD Purchase Threshold",
  nonCodFeeLow: "Non-COD Low Surcharge",
  nonCodFeeHigh: "Non-COD High Surcharge",
};

/** Merges server-published bounds onto fallback defaults (keeping UI min >= 1 for stores). */
export function resolveRateBounds(
  serverBounds?: Partial<Record<RateFieldKey, RateFieldBound>>
): RateBoundsMap {
  if (!serverBounds) return DEFAULT_RATE_POLICY_BOUNDS;
  const resolved = { ...DEFAULT_RATE_POLICY_BOUNDS };
  (Object.keys(DEFAULT_RATE_POLICY_BOUNDS) as RateFieldKey[]).forEach((key) => {
    const incoming = serverBounds[key];
    if (incoming && Number.isFinite(incoming.min) && Number.isFinite(incoming.max)) {
      resolved[key] = {
        min: key === "maxAdditionalStores" ? Math.max(1, incoming.min) : incoming.min,
        max: incoming.max,
      };
    }
  });
  return resolved;
}

export function formatBoundRange(
  key: RateFieldKey,
  bound: RateFieldBound
): string {
  if (key === "groceryFeePercent") {
    return `${bound.min}% - ${bound.max}%`;
  }
  if (key === "maxAdditionalStores") {
    return `${bound.min} - ${bound.max} stops`;
  }
  return `₱${bound.min.toLocaleString("en-PH")} - ₱${bound.max.toLocaleString("en-PH")}`;
}

export function validateRateFields(
  draft: Record<RateFieldKey, number | null>,
  bounds: RateBoundsMap,
  keys: RateFieldKey[]
): string[] {
  const errors: string[] = [];

  for (const key of keys) {
    const value = draft[key];
    const bound = bounds[key];
    const label = FIELD_LABELS[key];

    if (value === null || !Number.isFinite(value)) {
      errors.push(`${label} must be a valid number.`);
      continue;
    }

    if (key === "maxAdditionalStores" && !Number.isInteger(value)) {
      errors.push(`${label} must be a whole number.`);
      continue;
    }

    if (value < bound.min || value > bound.max) {
      errors.push(`${label} must be within policy bounds (${formatBoundRange(key, bound)}).`);
    }
  }

  if (
    keys.includes("groceryFeeThreshold") &&
    draft.groceryFeeThreshold !== null &&
    Number.isFinite(draft.groceryFeeThreshold) &&
    draft.groceryFeeThreshold < 1000
  ) {
    const thresholdMsg = "Order threshold must be at least ₱1,000.";
    if (!errors.some((msg) => msg.includes("Grocery Order Threshold"))) {
      errors.push(thresholdMsg);
    }
  }

  if (
    (keys.includes("nonCodFeeHigh") || keys.includes("nonCodFeeLow")) &&
    draft.nonCodFeeHigh !== null &&
    draft.nonCodFeeLow !== null &&
    Number.isFinite(draft.nonCodFeeHigh) &&
    Number.isFinite(draft.nonCodFeeLow) &&
    draft.nonCodFeeHigh < draft.nonCodFeeLow
  ) {
    errors.push("At or Above surcharge cannot be lower than Under Threshold surcharge.");
  }

  return errors;
}

/** Matches server `StandardPricingStrategy` threshold + marginal relief handling fee. */
function computeThresholdHandlingFee(
  basket: number,
  rateConfig: Pick<ApiRateConfig, "groceryFeeThreshold" | "groceryFeeFlat" | "groceryFeePercent">,
  handlingAmountThreshold: number
): number {
  const roundedBasket = Math.round(basket);
  if (roundedBasket < handlingAmountThreshold) return 0;

  const threshold = rateConfig.groceryFeeThreshold ?? 1001;
  const flat = rateConfig.groceryFeeFlat ?? 50;
  const percentFee = roundedBasket * ((rateConfig.groceryFeePercent ?? 10) / 100);

  if (roundedBasket < threshold) return flat;

  const reliefFloor = threshold - 1;
  const reliefCap = flat + (roundedBasket - reliefFloor);
  return Math.min(reliefCap, percentFee);
}

export interface PriceMatrixRow {
  distanceLabel: string;
  distanceKm: number;
  excessKm: number;
  standardSingleFee: number;
  flatHandlingSingleFee: number;
  percentHandlingSingleFee: number;
  extraStopStandardFee: number;
}

export interface PriceMatrixSummary {
  percentSampleBasket: number;
  rows: PriceMatrixRow[];
}

/**
 * Computes official delivery fare rows from saved RateConfig values using the
 * exact distance ceiling and whole-peso rounding rules of `StandardPricingStrategy`.
 */
export function computePriceMatrix(
  rateConfig: ApiRateConfig,
  baseFeeDistanceKm: number,
  handlingAmountThreshold = 1000
): PriceMatrixSummary {
  const threshold = rateConfig.groceryFeeThreshold ?? 1001;
  // Pick a clear sample basket inside the percentage tier (above marginal relief).
  const percentSampleBasket = Math.max(1500, Math.ceil((threshold + 500) / 500) * 500);

  const flatHandling = computeThresholdHandlingFee(
    handlingAmountThreshold,
    rateConfig,
    handlingAmountThreshold
  );
  const percentHandling = computeThresholdHandlingFee(
    percentSampleBasket,
    rateConfig,
    handlingAmountThreshold
  );

  const sampleDistances = [
    { label: `0 - ${baseFeeDistanceKm.toFixed(1)} km (Base)`, km: baseFeeDistanceKm },
    { label: "3.0 km", km: 3 },
    { label: "5.0 km", km: 5 },
    { label: "10.0 km", km: 10 },
  ];

  const multiStoreFee = rateConfig.multiStoreFeePerStore ?? 30;

  const rows: PriceMatrixRow[] = sampleDistances.map(({ label, km }) => {
    const excessKm = Math.ceil(Math.max(0, km - baseFeeDistanceKm));
    const distanceFee = excessKm * rateConfig.perKmRate;
    const basePlusDistance = rateConfig.baseFee + distanceFee;

    return {
      distanceLabel: label,
      distanceKm: km,
      excessKm,
      standardSingleFee: Math.round(basePlusDistance),
      flatHandlingSingleFee: Math.round(basePlusDistance + flatHandling),
      percentHandlingSingleFee: Math.round(basePlusDistance + percentHandling),
      extraStopStandardFee: Math.round(basePlusDistance + multiStoreFee),
    };
  });

  return { percentSampleBasket, rows };
}
