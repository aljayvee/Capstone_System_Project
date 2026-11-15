import React from "react";
import { Scale, ShieldCheck } from "lucide-react";
import type { ApiRateConfig } from "../../../../../services/apiService";
import {
  computePriceMatrix,
  formatBoundRange,
  type RateBoundsMap,
} from "../lib/priceMatrix";

interface RatesMatrixPolicySectionProps {
  rateConfig: ApiRateConfig;
  pricingRules: {
    baseFeeDistanceKm: number;
    handlingItemUnitsThreshold: number;
    handlingAmountThreshold: number;
  };
  bounds: RateBoundsMap;
}

const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const RatesMatrixPolicySection: React.FC<RatesMatrixPolicySectionProps> = ({
  rateConfig,
  pricingRules,
  bounds,
}) => {
  const { percentSampleBasket, rows } = computePriceMatrix(
    rateConfig,
    pricingRules.baseFeeDistanceKm,
    pricingRules.handlingAmountThreshold
  );

  const nonCodThreshold = rateConfig.nonCodThreshold ?? 3000;
  const nonCodFeeLow = rateConfig.nonCodFeeLow ?? 0;
  const nonCodFeeHigh = rateConfig.nonCodFeeHigh ?? 15;
  const groceryThreshold = rateConfig.groceryFeeThreshold ?? 1001;
  const maxStores = rateConfig.maxAdditionalStores ?? 2;

  return (
    <div className="mt-6 max-w-5xl space-y-4">
      <section
        aria-label="Active Price Matrix"
        className="rounded-plate border border-edge bg-board-plate divide-y divide-hairline"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-trim bg-board-ground text-ink-muted">
              <Scale size={16} />
            </span>
            <div>
              <h2 className="text-label font-semibold text-ink">
                Official Price Matrix (Active Saved Rates)
              </h2>
              <p className="mt-0.5 text-body text-ink-muted">
                Every customer quote follows this saved schedule. Unsaved card edits apply only after confirmation.
              </p>
            </div>
          </div>
          <span className="rounded-trim bg-board-ground px-2.5 py-1 text-micro font-medium text-ink-muted tabular-nums">
            Base radius: {pricingRules.baseFeeDistanceKm.toFixed(1)} km | Handling gate: ₱{pricingRules.handlingAmountThreshold.toLocaleString("en-PH")} or &gt;{pricingRules.handlingItemUnitsThreshold} units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-hairline bg-board-ground text-micro font-semibold text-ink-muted">
                <th className="px-4 py-3 sm:px-5">Distance Bracket</th>
                <th className="px-4 py-3 text-right">1 Store (&lt; ₱{pricingRules.handlingAmountThreshold.toLocaleString("en-PH")})</th>
                <th className="px-4 py-3 text-right">1 Store (₱{pricingRules.handlingAmountThreshold.toLocaleString("en-PH")} Flat Tier)</th>
                <th className="px-4 py-3 text-right">1 Store (₱{percentSampleBasket.toLocaleString("en-PH")} % Tier)</th>
                <th className="px-4 py-3 text-right sm:px-5">2 Stores (+1 Stop)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline text-body">
              {rows.map((row) => (
                <tr key={row.distanceKm} className="hover:bg-board-ground/60">
                  <td className="px-4 py-3 font-medium text-ink sm:px-5">
                    {row.distanceLabel}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">
                    {formatPeso(row.standardSingleFee)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">
                    {formatPeso(row.flatHandlingSingleFee)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">
                    {formatPeso(row.percentHandlingSingleFee)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums sm:px-5">
                    {formatPeso(row.extraStopStandardFee)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 text-body text-ink-muted sm:px-5">
          <span className="tabular-nums">
            Handling crossover: ₱{groceryThreshold.toLocaleString("en-PH")} ({rateConfig.groceryFeeFlat ?? 50} flat below, {rateConfig.groceryFeePercent ?? 10}% at or above)
          </span>
          <span className="tabular-nums">
            Non-COD surcharge: {formatPeso(nonCodFeeLow)} below ₱{nonCodThreshold.toLocaleString("en-PH")} / {formatPeso(nonCodFeeHigh)} at or above (COD: ₱0.00) | Max extra stops: {maxStores}
          </span>
        </div>
      </section>

      <section
        aria-label="Company and National Policy Compliance"
        className="rounded-plate border border-edge bg-board-plate divide-y divide-hairline"
      >
        <div className="flex items-start gap-2.5 p-4 sm:p-5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-trim bg-board-ground text-ink-muted">
            <ShieldCheck size={16} />
          </span>
          <div>
            <h2 className="text-label font-semibold text-ink">
              Company and National Policy Guardrails
            </h2>
            <p className="mt-0.5 text-body text-ink-muted">
              Rate limits are enforced by the server so owner edits cannot produce ₱0 predatory rates or unreasonable fee spikes.
            </p>
          </div>
        </div>

        <dl className="divide-y divide-hairline px-4 sm:px-5">
          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-body font-semibold text-ink">
              Consumer &amp; Online Transparency (RA 7394 / RA 11967)
            </dt>
            <dd className="mt-1 text-body text-ink-muted sm:col-span-2 sm:mt-0">
              All base, distance, multi-store, handling, and non-COD fees are disclosed upfront before checkout. Quoted handling ceilings prevent silent post-purchase fee increases.
            </dd>
          </div>

          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-body font-semibold text-ink">
              Fair Competition &amp; Rate Caps (RA 10667)
            </dt>
            <dd className="mt-1 text-body text-ink-muted tabular-nums sm:col-span-2 sm:mt-0">
              Allowed policy bounds: Base {formatBoundRange("baseFee", bounds.baseFee)}, Excess {formatBoundRange("perKmRate", bounds.perKmRate)}/km, Multi-store {formatBoundRange("multiStoreFeePerStore", bounds.multiStoreFeePerStore)}, Handling {formatBoundRange("groceryFeePercent", bounds.groceryFeePercent)} (flat {formatBoundRange("groceryFeeFlat", bounds.groceryFeeFlat)}), Thresholds up to ₱{bounds.groceryFeeThreshold.max.toLocaleString("en-PH")}.
            </dd>
          </div>

          <div className="py-3.5 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-body font-semibold text-ink">
              Fair Rider Compensation (DOLE LA 14-21)
            </dt>
            <dd className="mt-1 text-body text-ink-muted sm:col-span-2 sm:mt-0">
              Minimum fare floors (Base ₱{bounds.baseFee.min} and Excess ₱{bounds.perKmRate.min}/km) protect rider take-home earnings alongside the fixed 70% rider fee share and 100% pass-through tips.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
};
