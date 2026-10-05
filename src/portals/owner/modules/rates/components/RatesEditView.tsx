import React from "react";
import {
  Save,
  MapPin,
  Store,
  ShoppingBasket,
  CreditCard,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { PanelButton } from "@/components/panel";

interface RatesEditViewProps {
  baseFee: number | null;
  setBaseFee: (val: number | null) => void;
  perKmRate: number;
  setPerKmRate: (val: number) => void;
  multiStoreFeePerStore: number;
  setMultiStoreFeePerStore: (val: number) => void;
  maxAdditionalStores: number;
  setMaxAdditionalStores: (val: number) => void;
  groceryFeeThreshold: number;
  setGroceryFeeThreshold: (val: number) => void;
  groceryFeePercent: number;
  setGroceryFeePercent: (val: number) => void;
  groceryFeeFlat: number;
  setGroceryFeeFlat: (val: number) => void;
  nonCodThreshold: number;
  setNonCodThreshold: (val: number) => void;
  nonCodFeeHigh: number;
  setNonCodFeeHigh: (val: number) => void;
  nonCodFeeLow: number;
  setNonCodFeeLow: (val: number) => void;
  pricingRules: {
    baseFeeDistanceKm: number;
    handlingItemUnitsThreshold: number;
    handlingAmountThreshold: number;
  };
  isLoading: boolean;
  isSaving: boolean;
  loadError: string | null;
  hasChanges: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RatesEditView: React.FC<RatesEditViewProps> = ({
  baseFee,
  setBaseFee,
  perKmRate,
  setPerKmRate,
  multiStoreFeePerStore,
  setMultiStoreFeePerStore,
  maxAdditionalStores,
  setMaxAdditionalStores,
  groceryFeeThreshold,
  setGroceryFeeThreshold,
  groceryFeePercent,
  setGroceryFeePercent,
  groceryFeeFlat,
  setGroceryFeeFlat,
  nonCodThreshold,
  setNonCodThreshold,
  nonCodFeeHigh,
  setNonCodFeeHigh,
  nonCodFeeLow,
  setNonCodFeeLow,
  pricingRules,
  isLoading,
  isSaving,
  loadError,
  hasChanges,
  onCancel,
  onSubmit,
}) => {
  const isNonCodInverted = nonCodFeeHigh < nonCodFeeLow;
  const isGroceryThresholdTooLow = groceryFeeThreshold < 1000;

  return (
    <form onSubmit={onSubmit} className="max-w-4xl space-y-3.5">
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
            <div className="space-y-1.5">
              <label htmlFor="edit-baseFee" className="text-body text-ink-muted flex items-center justify-between">
                <span>Base Delivery Fare (0 - {pricingRules.baseFeeDistanceKm.toFixed(1)} km) *</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-ink-muted text-panel">₱</span>
                <input
                  type="number"
                  required
                  min={0}
                  step={1}
                  id="edit-baseFee"
                  value={baseFee ?? ""}
                  disabled={isLoading}
                  placeholder={isLoading ? "Loading…" : "Set base fare"}
                  onChange={(e) =>
                    setBaseFee(e.target.value === "" ? null : Number(e.target.value))
                  }
                  className="w-full bg-board-ground border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-perKmRate" className="text-body text-ink-muted">
                Excess Distance Rate (per 1km) *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-ink-muted text-panel">₱</span>
                <input
                  type="number"
                  required
                  min={0}
                  step={1}
                  id="edit-perKmRate"
                  value={perKmRate}
                  onChange={(e) => setPerKmRate(Number(e.target.value))}
                  className="w-full bg-board-ground border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                />
              </div>
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
            <div className="space-y-1.5">
              <label htmlFor="edit-multiStoreFeePerStore" className="text-body text-ink-muted">
                Fee Per Additional Store *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-ink-muted text-panel">₱</span>
                <input
                  type="number"
                  required
                  min={0}
                  step={1}
                  id="edit-multiStoreFeePerStore"
                  value={multiStoreFeePerStore}
                  onChange={(e) => setMultiStoreFeePerStore(Number(e.target.value))}
                  className="w-full bg-board-ground border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-maxAdditionalStores" className="text-body text-ink-muted">
                Max Additional Stores Allowed *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  required
                  min={1}
                  max={5}
                  id="edit-maxAdditionalStores"
                  value={maxAdditionalStores}
                  onChange={(e) => setMaxAdditionalStores(Number(e.target.value))}
                  className="w-full bg-board-ground border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                />
                <span className="text-ink-muted text-label shrink-0">Stops</span>
              </div>
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
            <div className="space-y-1.5">
              <label htmlFor="edit-groceryFeeThreshold" className="text-body text-ink-muted">
                Order Threshold (₱) *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-ink-muted text-panel">₱</span>
                <input
                  type="number"
                  required
                  min={1000}
                  id="edit-groceryFeeThreshold"
                  value={groceryFeeThreshold}
                  onChange={(e) => setGroceryFeeThreshold(Number(e.target.value))}
                  className="w-full bg-board-ground border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-groceryFeeFlat" className="text-body text-ink-muted">
                Under Threshold (Flat) *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-ink-muted text-panel">₱</span>
                <input
                  type="number"
                  required
                  min={0}
                  id="edit-groceryFeeFlat"
                  value={groceryFeeFlat}
                  onChange={(e) => setGroceryFeeFlat(Number(e.target.value))}
                  className="w-full bg-board-ground border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-groceryFeePercent" className="text-body text-ink-muted">
                At or Above (Percent) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  id="edit-groceryFeePercent"
                  value={groceryFeePercent}
                  onChange={(e) => setGroceryFeePercent(Number(e.target.value))}
                  className="w-full bg-board-ground border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                />
                <span className="text-ink-muted text-panel shrink-0">%</span>
              </div>
            </div>
          </div>

          {isGroceryThresholdTooLow && (
            <div className="flex items-center gap-2 text-label text-status-act-ink bg-status-act-fill p-2.5 rounded-trim">
              <AlertTriangle size={14} className="shrink-0" />
              <span>Order threshold must be at least ₱1,000 for handling fee calculations.</span>
            </div>
          )}

          <p className="text-label text-ink-muted leading-relaxed pt-1">
            An order of exactly{" "}
            <span className="font-bold text-ink">₱{groceryFeeThreshold - 1}</span> pays the flat ₱
            {groceryFeeFlat}; from{" "}
            <span className="font-bold text-ink">₱{groceryFeeThreshold}</span> it pays{" "}
            {groceryFeePercent}%.
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
            <div className="space-y-1.5">
              <label htmlFor="edit-nonCodThreshold" className="text-body text-ink-muted">
                Purchase Threshold (₱) *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-ink-muted text-panel">₱</span>
                <input
                  type="number"
                  required
                  min={0}
                  id="edit-nonCodThreshold"
                  value={nonCodThreshold}
                  onChange={(e) => setNonCodThreshold(Number(e.target.value))}
                  className="w-full bg-board-ground border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-nonCodFeeLow" className="text-body text-ink-muted">
                Under Threshold *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-ink-muted text-panel">₱</span>
                <input
                  type="number"
                  required
                  min={0}
                  id="edit-nonCodFeeLow"
                  value={nonCodFeeLow}
                  onChange={(e) => setNonCodFeeLow(Number(e.target.value))}
                  className="w-full bg-board-ground border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-nonCodFeeHigh" className="text-body text-ink-muted">
                At or Above *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-ink-muted text-panel">₱</span>
                <input
                  type="number"
                  required
                  min={0}
                  id="edit-nonCodFeeHigh"
                  value={nonCodFeeHigh}
                  onChange={(e) => setNonCodFeeHigh(Number(e.target.value))}
                  className="w-full bg-board-ground border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                />
              </div>
            </div>
          </div>

          {isNonCodInverted && (
            <div className="flex items-center gap-2 text-label text-status-act-ink bg-status-act-fill p-2.5 rounded-trim">
              <AlertTriangle size={14} className="shrink-0" />
              <span>
                The fee at or above threshold (₱{nonCodFeeHigh}) cannot be lower than the fee below it (₱{nonCodFeeLow}).
              </span>
            </div>
          )}

          <p className="text-label text-ink-muted leading-relaxed pt-1">
            Applies only once a confirmed payment mode is not Cash on Delivery.
          </p>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 bg-board-ground flex items-center justify-end gap-2.5">
          <PanelButton
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </PanelButton>
          <PanelButton
            type="submit"
            variant="primary"
            icon={isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            disabled={isSaving || !hasChanges || Boolean(loadError) || isNonCodInverted || isGroceryThresholdTooLow}
          >
            Save Rate Configurations
          </PanelButton>
        </div>
      </div>
    </form>
  );
};
