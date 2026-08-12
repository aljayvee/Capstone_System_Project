export interface RateConfigValues {
  baseFee: number;
  perKmRate: number;
  serviceFeePercent: number;
  nightSurcharge: number;
}

export interface PriceBreakdown {
  deliveryFee: number;
  totalCost: number;
}

// Swappable at the call site (e.g. a future promo/surge strategy) — this is the
// Strategy pattern applied to the one hardcoded pricing default in the codebase.
export interface PricingStrategy {
  calculate(estimatedCost: number, tip: number, rateConfig: RateConfigValues, now?: Date): PriceBreakdown;
}

const NIGHT_START_HOUR = 22; // 10 PM
const NIGHT_END_HOUR = 5; // 5 AM

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Replaces the previous hardcoded `deliveryFee = 80` / `totalCost = 80` fallback
// defaults (errandRoutes.ts, pre-Phase-2) with a calculation actually derived from
// RateConfig. Only used when the client doesn't supply deliveryFee/totalCost
// explicitly — client-supplied values are still honored unchanged (see
// errandService.createErrand), so this does not touch the override path.
export class StandardPricingStrategy implements PricingStrategy {
  calculate(estimatedCost: number, tip: number, rateConfig: RateConfigValues, now: Date = new Date()): PriceBreakdown {
    const hour = now.getHours();
    const isNight = hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
    const serviceFee = estimatedCost * (rateConfig.serviceFeePercent / 100);
    const deliveryFee = rateConfig.baseFee + serviceFee + (isNight ? rateConfig.nightSurcharge : 0);
    const totalCost = estimatedCost + deliveryFee + tip;
    return {
      deliveryFee: round2(deliveryFee),
      totalCost: round2(totalCost),
    };
  }
}

export const defaultPricingStrategy: PricingStrategy = new StandardPricingStrategy();
