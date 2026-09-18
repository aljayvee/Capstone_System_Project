import React, { useState, useEffect } from "react";
import {
  Save,
  Store,
  ShoppingBasket,
  CheckCircle2,
  MapPin,
  Loader2,
  CreditCard,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { apiService } from "../../../../services/apiService";
import { OwnerPanelShell } from "../../components/OwnerPanelShell";
import { PanelButton } from "@/components/panel";

export const ServiceRatesModule: React.FC = () => {
  // Null until the owner's saved config loads. Seeding this with a number would
  // show a price nobody set, and a save made before the fetch returned would
  // write that invented figure over the real one.
  const [baseFee, setBaseFee] = useState<number | null>(null);
  const [perKmRate, setPerKmRate] = useState(10);
  const [multiStoreFeePerStore, setMultiStoreFeePerStore] = useState(30);
  const [maxAdditionalStores, setMaxAdditionalStores] = useState(2);
  const [groceryFeeThreshold, setGroceryFeeThreshold] = useState(1001);
  const [groceryFeePercent, setGroceryFeePercent] = useState(10);
  const [groceryFeeFlat, setGroceryFeeFlat] = useState(50);
  const [nonCodThreshold, setNonCodThreshold] = useState(3000);
  const [nonCodFeeHigh, setNonCodFeeHigh] = useState(15);
  const [nonCodFeeLow, setNonCodFeeLow] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  /**
   * Set when the saved configuration could not be read.
   *
   * This module opens with every rate seeded to a plausible number
   * (perKmRate 10, groceryFeeThreshold 1001, and so on). Those seeds exist so
   * the inputs are never uncontrolled, but the old code swallowed a failed
   * fetch into a console.warn and left them on screen, so a dead API rendered
   * as a fully populated pricing form. An owner could read a fare that is not
   * the live fare, and a save from that state would have written the invented
   * figures over the real ones.
   */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Published by the server beside the editable rates, so the simulator's
  // numbers cannot drift from the formula the way the base-fee radius did.
  // Defaults match the server and only apply until the config loads.
  const [pricingRules, setPricingRules] = useState({
    baseFeeDistanceKm: 2.0,
    handlingItemUnitsThreshold: 20,
    handlingAmountThreshold: 1000,
  });

  const loadConfig = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const config = await apiService.getRateConfig();
      // apiService.getRateConfig catches its own error and resolves null
      // (apiService.ts:816-824), so the catch below never fires for an API
      // failure. Null IS the failure, and it has to be read as one here.
      if (!config) {
        setLoadError("The saved rate configuration did not load.");
        return;
      }
      {
        setBaseFee(config.baseFee);
        setPerKmRate(config.perKmRate);
        setMultiStoreFeePerStore(config.multiStoreFeePerStore ?? 30);
        setMaxAdditionalStores(config.maxAdditionalStores ?? 2);
        setGroceryFeeThreshold(config.groceryFeeThreshold ?? 1001);
        setGroceryFeePercent(config.groceryFeePercent ?? 10);
        setGroceryFeeFlat(config.groceryFeeFlat ?? 50);
        setNonCodThreshold(config.nonCodThreshold ?? 3000);
        setNonCodFeeHigh(config.nonCodFeeHigh ?? 15);
        setNonCodFeeLow(config.nonCodFeeLow ?? 0);

        // The parts of the formula the owner cannot edit, sent so this
        // simulator reads them rather than carrying its own copy.
        if (config.pricingRules) setPricingRules(config.pricingRules);
      }
    } catch (err) {
      // Kept for a genuine network throw, which the service does not convert.
      console.warn("Failed to load rate configs:", err);
      setLoadError("The saved rate configuration did not load.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // The base fare has no default anywhere in the stack — not in the column, not
    // in the seed, not here. Blank means genuinely unset, which on a fresh
    // install is the normal state until the owner fills it in, so this asks for
    // a value rather than treating it as a loading race.
    if (isLoading) {
      toast.error("Rates are still loading. Wait for them before saving.");
      return;
    }
    if (baseFee === null) {
      toast.error("Enter a base delivery fare before saving.");
      return;
    }
    // Refuses to write over a configuration it never read. Nine of these ten
    // fields would otherwise submit their seed values, so a save attempted
    // after a failed load would replace the real pricing with invented
    // numbers.
    if (loadError) {
      toast.error("These rates were never loaded. Reload them before saving.");
      return;
    }
    setIsSaving(true);
    try {
      const saved = await apiService.updateRateConfig({
        baseFee,
        perKmRate,
        multiStoreFeePerStore,
        maxAdditionalStores,
        groceryFeeThreshold,
        groceryFeePercent,
        groceryFeeFlat,
        nonCodThreshold,
        nonCodFeeHigh,
        nonCodFeeLow,
      });
      // THE defect this module shipped. apiService.updateRateConfig catches
      // its own error and resolves null (apiService.ts:828-836), so `await`
      // succeeds on a rejected PUT and the catch below is unreachable for any
      // API failure. Every 500, 403 and timeout announced
      // "successfully saved to MariaDB" while nothing had been written, on the
      // one action in this portal that reprices every customer.
      if (!saved) {
        toast.error("The rates were not saved. The server did not accept the change.");
        return;
      }
      setSavedSuccess(true);
      toast.success("Rate configurations saved.");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to save rate configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OwnerPanelShell
      title="Service Rates"
      // Pinned rather than scrolled: this says the numbers below are not the
      // saved ones, so it may not scroll away from them.
      controls={
        loadError && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-plate bg-status-act-fill px-4 py-3 text-label text-status-act-ink"
          >
            <AlertTriangle size={15} className="shrink-0" />
            <span className="flex-1">
              {loadError} The figures below are this form's own defaults, not your saved rates, so
              saving is switched off until they load.
            </span>
            <PanelButton
              variant="secondary"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={() => void loadConfig()}
            >
              Try again
            </PanelButton>
          </div>
        )
      }
      aside={
        savedSuccess && (
          <span
            role="status"
            className="flex items-center gap-1.5 rounded-trim bg-status-done-fill px-3 py-1.5 text-micro uppercase text-status-done-ink"
          >
            <CheckCircle2 size={15} /> Saved to Database
          </span>
        )
      }
    >
      {/* RATE CONFIGURATION FORM */}
      <div>
        <form onSubmit={handleSave} className="max-w-4xl space-y-3.5">
          {/* SECTION A: DISTANCE & BASE RATES */}
          <div className="bg-board-plate border border-edge rounded-plate p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-hairline">
              <div className="w-7 h-7 rounded-trim bg-board-ground text-ink flex items-center justify-center font-bold">
                <MapPin size={15} />
              </div>
              <div>
                <h3 className="text-label text-ink">Distance & Base Delivery Rate</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Base Fee */}
              <div className="rounded-plate bg-board-ground p-3 space-y-1.5">
                <label
                  htmlFor="rate-baseFee"
                  className="text-micro uppercase text-ink flex items-center justify-between"
                >
                  <span>Base Delivery Fare *</span>
                  <span className="text-label text-ink bg-board-ground px-1.5 py-0.2 rounded-full border border-edge ">
                    Covers 0 - {pricingRules.baseFeeDistanceKm.toFixed(1)} km
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-ink-muted text-panel">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    id="rate-baseFee"
                    value={baseFee ?? ""}
                    disabled={isLoading}
                    placeholder={isLoading ? "Loading…" : "Set base fare"}
                    onChange={(e) =>
                      setBaseFee(e.target.value === "" ? null : Number(e.target.value))
                    }
                    className="w-full bg-board-plate border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                  />
                </div>
              </div>

              {/* Per KM Rate */}
              <div className="rounded-plate bg-board-ground p-3 space-y-1.5">
                <label
                  htmlFor="rate-perKmRate"
                  className="text-micro uppercase text-ink flex items-center justify-between"
                >
                  <span>Excess Distance Rate *</span>
                  <span className="text-label text-ink bg-board-plate px-1.5 py-0.2 rounded-full border border-edge">
                    Beyond {pricingRules.baseFeeDistanceKm.toFixed(1)} km
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-ink-muted text-panel">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    id="rate-perKmRate"
                    value={perKmRate}
                    onChange={(e) => setPerKmRate(Number(e.target.value))}
                    className="w-full bg-board-plate border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B: MULTI-STORE SURCHARGE */}
          <div className="bg-board-plate border border-edge rounded-plate p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-hairline">
              <div className="w-7 h-7 rounded-trim bg-board-ground text-ink-muted flex items-center justify-center font-bold">
                <Store size={15} />
              </div>
              <div>
                <h3 className="text-label text-ink">Multi-Store Errand Surcharge</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-plate bg-board-ground p-3 space-y-1.5">
                <label
                  htmlFor="rate-multiStoreFeePerStore"
                  className="text-micro uppercase text-ink"
                >
                  Fee Per Additional Store *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-ink-muted text-panel">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    id="rate-multiStoreFeePerStore"
                    value={multiStoreFeePerStore}
                    onChange={(e) => setMultiStoreFeePerStore(Number(e.target.value))}
                    className="w-full bg-board-plate border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                  />
                </div>
              </div>

              <div className="rounded-plate bg-board-ground p-3 space-y-1.5">
                <label htmlFor="rate-maxAdditionalStores" className="text-micro uppercase text-ink">
                  Max Additional Stores Allowed
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min={1}
                    max={5}
                    id="rate-maxAdditionalStores"
                    value={maxAdditionalStores}
                    onChange={(e) => setMaxAdditionalStores(Number(e.target.value))}
                    className="w-full bg-board-plate border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                  />
                  <span className="text-ink-muted text-label">Stops</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION C: GROCERY & PURCHASE TIER */}
          <div className="bg-board-plate border border-edge rounded-plate p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-hairline">
              <div className="w-7 h-7 rounded-trim bg-board-ground text-ink flex items-center justify-center font-bold">
                <ShoppingBasket size={15} />
              </div>
              <div>
                <h3 className="text-label text-ink">Grocery & Pabili Subtotal Surcharge</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-plate bg-board-ground p-3 space-y-1.5">
                <label htmlFor="rate-groceryFeeThreshold" className="text-micro uppercase text-ink">
                  Order Threshold
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-muted text-panel">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    id="rate-groceryFeeThreshold"
                    value={groceryFeeThreshold}
                    onChange={(e) => setGroceryFeeThreshold(Number(e.target.value))}
                    className="w-full bg-board-plate border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                  />
                </div>
              </div>

              {/* Below the threshold is the FLAT fee and above it is the
                  PERCENTAGE — the inverse of how these two cards used to sit.
                  The inputs are bound accordingly: this card edits
                  groceryFeeFlat, the next edits groceryFeePercent.

                  Labelled "Under" and "At or Above" because the comparison is
                  `>=`: an order sitting exactly on the threshold pays the
                  percentage, and "Above Threshold" invited the opposite reading
                  of the one boundary anybody actually asks about. */}
              <div className="rounded-plate bg-board-ground p-3 space-y-1.5">
                <label htmlFor="rate-groceryFeeFlat" className="text-micro uppercase text-ink">
                  Under Threshold
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-muted text-panel">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    id="rate-groceryFeeFlat"
                    value={groceryFeeFlat}
                    onChange={(e) => setGroceryFeeFlat(Number(e.target.value))}
                    className="w-full bg-board-plate border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                  />
                </div>
              </div>

              <div className="rounded-plate bg-board-ground p-3 space-y-1.5">
                <label htmlFor="rate-groceryFeePercent" className="text-micro uppercase text-ink">
                  At or Above
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    id="rate-groceryFeePercent"
                    value={groceryFeePercent}
                    onChange={(e) => setGroceryFeePercent(Number(e.target.value))}
                    className="w-full bg-board-plate border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                  />
                  <span className="text-ink-muted text-panel">%</span>
                </div>
              </div>
            </div>

            <p className="text-label text-ink-muted leading-relaxed">
              An order of exactly{" "}
              <span className="font-bold text-ink">₱{groceryFeeThreshold - 1}</span> pays the flat ₱
              {groceryFeeFlat}; from{" "}
              <span className="font-bold text-ink">₱{groceryFeeThreshold}</span> it pays{" "}
              {groceryFeePercent}%. Crossing that line never costs more than the order grew, because
              the fee eases in rather than jumping.
            </p>
          </div>

          {/* SECTION D: NON-COD SURCHARGE

              These three fields were saved and loaded all along but had no
              inputs, so the owner could neither see nor correct them. A fee
              nobody can look at is a fee nobody can notice is wrong. */}
          <div className="bg-board-plate border border-edge rounded-plate p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-hairline">
              <div className="w-7 h-7 rounded-trim bg-board-ground text-ink-muted flex items-center justify-center font-bold">
                <CreditCard size={15} />
              </div>
              <div>
                <h3 className="text-label text-ink">Non-Cash Payment Surcharge</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-plate bg-board-ground p-3 space-y-1.5">
                <label htmlFor="rate-nonCodThreshold" className="text-micro uppercase text-ink">
                  Purchase Threshold
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-muted text-panel">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    id="rate-nonCodThreshold"
                    value={nonCodThreshold}
                    onChange={(e) => setNonCodThreshold(Number(e.target.value))}
                    className="w-full bg-board-plate border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                  />
                </div>
              </div>

              {/* Named for WHERE each applies, not for its size — the server
                  rejects a save where the larger purchase carries the smaller
                  fee, because that inversion is invisible otherwise. */}
              <div className="rounded-plate bg-board-ground p-3 space-y-1.5">
                <label htmlFor="rate-nonCodFeeLow" className="text-micro uppercase text-ink">
                  Under Threshold
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-muted text-panel">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    id="rate-nonCodFeeLow"
                    value={nonCodFeeLow}
                    onChange={(e) => setNonCodFeeLow(Number(e.target.value))}
                    className="w-full bg-board-plate border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                  />
                </div>
              </div>

              <div className="rounded-plate bg-board-ground p-3 space-y-1.5">
                <label htmlFor="rate-nonCodFeeHigh" className="text-micro uppercase text-ink">
                  At or Above
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-muted text-panel">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    id="rate-nonCodFeeHigh"
                    value={nonCodFeeHigh}
                    onChange={(e) => setNonCodFeeHigh(Number(e.target.value))}
                    className="w-full bg-board-plate border border-edge rounded-trim px-2.5 py-1.5 text-ink text-panel outline-none focus:ring-2 focus:ring-board-field"
                  />
                </div>
              </div>
            </div>

            <p className="text-label text-ink-muted leading-relaxed">
              Applies only once a confirmed payment mode is not Cash on Delivery. A purchase under{" "}
              <span className="font-bold text-ink">₱{nonCodThreshold}</span> pays ₱{nonCodFeeLow};
              at <span className="font-bold text-ink">₱{nonCodThreshold}</span> or more it pays ₱
              {nonCodFeeHigh}.
            </p>
          </div>

          {/* SAVE BUTTON */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              // Disabled while the saved config is unknown. Nine of these ten
              // inputs still hold their seed defaults in that state, so an
              // enabled save is an invitation to overwrite real pricing with
              // numbers nobody chose.
              disabled={isSaving || !!loadError}
              title={loadError ? "These rates were never loaded" : undefined}
              className="flex items-center gap-2 rounded-plate bg-board-field px-6 py-3 text-micro uppercase text-board-plate transition-colors hover:bg-board-field-deep disabled:cursor-not-allowed disabled:bg-status-closed-fill disabled:text-status-closed-ink"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Save Rate Configurations</span>
            </button>
          </div>
        </form>
      </div>
    </OwnerPanelShell>
  );
};
