import type { HandlingFeeMode, ApiRateConfig } from "../../../../services/apiService";

export const HANDLING_FEE_MODES: HandlingFeeMode[] = ["THRESHOLD", "FLAT", "PERCENT", "NONE"];

const peso = (value: number) => `₱${Number(value).toLocaleString("en-PH")}`;

/**
 * Describes a fee mode in business terms rather than enum names.
 *
 * An owner setting prices should not have to know what "THRESHOLD" means. The
 * live RateConfig figures are folded into the label where available, so the copy
 * tracks the rates instead of hardcoding ₱50 and 10% and quietly going stale the
 * first time either is edited.
 */
export function describeHandlingFeeMode(
  mode: HandlingFeeMode,
  rates?: ApiRateConfig | null
): string {
  const flat = rates ? peso(rates.groceryFeeFlat) : "the flat fee";
  const percent = rates ? `${rates.groceryFeePercent}%` : "a percentage";
  const threshold = rates ? peso(rates.groceryFeeThreshold) : "the threshold";

  switch (mode) {
    case "FLAT":
      return `${flat} per order`;
    case "PERCENT":
      return `${percent} of order value`;
    case "THRESHOLD":
      return `${flat} under ${threshold}, then ${percent}`;
    case "NONE":
      return "No handling fee";
  }
}

/** Short label for a badge, where the full sentence will not fit. */
export function shortHandlingFeeMode(mode: HandlingFeeMode): string {
  switch (mode) {
    case "FLAT":
      return "Flat fee";
    case "PERCENT":
      return "% of order";
    case "THRESHOLD":
      return "Tiered";
    case "NONE":
      return "No fee";
  }
}
