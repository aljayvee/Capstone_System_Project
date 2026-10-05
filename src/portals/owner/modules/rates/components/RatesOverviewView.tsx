import React from "react";
import { MapPin, Store, ShoppingBasket, CreditCard } from "lucide-react";
import type { ApiRateConfig } from "../../../../../services/apiService";

interface RatesOverviewViewProps {
  rateConfig: ApiRateConfig;
  pricingRules: {
    baseFeeDistanceKm: number;
    handlingItemUnitsThreshold: number;
    handlingAmountThreshold: number;
  };
}

export const RatesOverviewView: React.FC<RatesOverviewViewProps> = ({
  rateConfig,
  pricingRules,
}) => {
  const {
    baseFee,
    perKmRate,
    multiStoreFeePerStore = 30,
    maxAdditionalStores = 2,
    groceryFeeThreshold = 1001,
    groceryFeePercent = 10,
    groceryFeeFlat = 50,
    nonCodThreshold = 3000,
    nonCodFeeHigh = 15,
    nonCodFeeLow = 0,
  } = rateConfig;

  return (
    <div className="max-w-4xl space-y-3.5">
      <div className="bg-board-plate border border-edge rounded-plate divide-y divide-hairline">
        {/* SECTION 1: DISTANCE & BASE DELIVERY RATE */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <div className="w-7 h-7 rounded-trim bg-board-ground text-ink flex items-center justify-center font-bold">
              <MapPin size={15} />
            </div>
            <div>
              <h2 className="text-label text-ink font-semibold">Distance & Base Delivery Rate</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-baseline justify-between border-b border-hairline pb-2.5">
              <span className="text-body text-ink-muted">
                Base Delivery Fare (0 - {pricingRules.baseFeeDistanceKm.toFixed(1)} km)
              </span>
              <span className="text-panel font-bold text-ink tabular-nums">
                ₱{baseFee.toFixed(2)}
              </span>
            </div>

            <div className="flex items-baseline justify-between border-b border-hairline pb-2.5">
              <span className="text-body text-ink-muted">Excess Distance Rate</span>
              <span className="text-panel font-bold text-ink tabular-nums">
                ₱{perKmRate.toFixed(2)} / km
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: MULTI-STORE ERRAND SURCHARGE */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <div className="w-7 h-7 rounded-trim bg-board-ground text-ink-muted flex items-center justify-center font-bold">
              <Store size={15} />
            </div>
            <div>
              <h2 className="text-label text-ink font-semibold">Multi-Store Errand Surcharge</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-baseline justify-between border-b border-hairline pb-2.5">
              <span className="text-body text-ink-muted">Fee Per Additional Store</span>
              <span className="text-panel font-bold text-ink tabular-nums">
                ₱{multiStoreFeePerStore.toFixed(2)} / store
              </span>
            </div>

            <div className="flex items-baseline justify-between border-b border-hairline pb-2.5">
              <span className="text-body text-ink-muted">Max Additional Stores Allowed</span>
              <span className="text-panel font-bold text-ink tabular-nums">
                {maxAdditionalStores} stops
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: GROCERY & PURCHASE SUBTOTAL SURCHARGE */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <div className="w-7 h-7 rounded-trim bg-board-ground text-ink flex items-center justify-center font-bold">
              <ShoppingBasket size={15} />
            </div>
            <div>
              <h2 className="text-label text-ink font-semibold">Grocery & Pabili Subtotal Surcharge</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="flex items-baseline justify-between border-b border-hairline pb-2.5">
              <span className="text-body text-ink-muted">Order Threshold</span>
              <span className="text-panel font-bold text-ink tabular-nums">
                ₱{groceryFeeThreshold.toLocaleString()}
              </span>
            </div>

            <div className="flex items-baseline justify-between border-b border-hairline pb-2.5">
              <span className="text-body text-ink-muted">Under Threshold</span>
              <span className="text-panel font-bold text-ink tabular-nums">
                ₱{groceryFeeFlat.toFixed(2)} flat
              </span>
            </div>

            <div className="flex items-baseline justify-between border-b border-hairline pb-2.5">
              <span className="text-body text-ink-muted">At or Above</span>
              <span className="text-panel font-bold text-ink tabular-nums">
                {groceryFeePercent}%
              </span>
            </div>
          </div>

          <p className="text-label text-ink-muted leading-relaxed pt-1">
            An order of exactly{" "}
            <span className="font-bold text-ink">₱{groceryFeeThreshold - 1}</span> pays the flat ₱
            {groceryFeeFlat}; from{" "}
            <span className="font-bold text-ink">₱{groceryFeeThreshold}</span> it pays{" "}
            {groceryFeePercent}%. Crossing that line never costs more than the order grew, because the
            fee eases in rather than jumping.
          </p>
        </div>

        {/* SECTION 4: NON-CASH PAYMENT SURCHARGE */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <div className="w-7 h-7 rounded-trim bg-board-ground text-ink-muted flex items-center justify-center font-bold">
              <CreditCard size={15} />
            </div>
            <div>
              <h2 className="text-label text-ink font-semibold">Non-Cash Payment Surcharge</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="flex items-baseline justify-between border-b border-hairline pb-2.5">
              <span className="text-body text-ink-muted">Purchase Threshold</span>
              <span className="text-panel font-bold text-ink tabular-nums">
                ₱{nonCodThreshold.toLocaleString()}
              </span>
            </div>

            <div className="flex items-baseline justify-between border-b border-hairline pb-2.5">
              <span className="text-body text-ink-muted">Under Threshold</span>
              <span className="text-panel font-bold text-ink tabular-nums">
                ₱{nonCodFeeLow.toFixed(2)}
              </span>
            </div>

            <div className="flex items-baseline justify-between border-b border-hairline pb-2.5">
              <span className="text-body text-ink-muted">At or Above</span>
              <span className="text-panel font-bold text-ink tabular-nums">
                ₱{nonCodFeeHigh.toFixed(2)}
              </span>
            </div>
          </div>

          <p className="text-label text-ink-muted leading-relaxed pt-1">
            Applies only once a confirmed payment mode is not Cash on Delivery. A purchase under{" "}
            <span className="font-bold text-ink">₱{nonCodThreshold}</span> pays ₱{nonCodFeeLow}; at{" "}
            <span className="font-bold text-ink">₱{nonCodThreshold}</span> or more it pays ₱
            {nonCodFeeHigh}.
          </p>
        </div>
      </div>
    </div>
  );
};
