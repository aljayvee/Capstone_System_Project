import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Save,
  Store,
  ShoppingBasket,
  CheckCircle2,
  MapPin,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { apiService } from "../../../../services/apiService";
import { NotificationBell } from "../../../../components/NotificationBell";

export const ServiceRatesModule: React.FC = () => {
  // Null until the owner's saved config loads. Seeding this with a number would
  // show a price nobody set, and a save made before the fetch returned would
  // write that invented figure over the real one.
  const [baseFee, setBaseFee] = useState<number | null>(null);
  const [perKmRate, setPerKmRate] = useState(10);
  const [multiStoreFeePerStore, setMultiStoreFeePerStore] = useState(30);
  const [maxAdditionalStores, setMaxAdditionalStores] = useState(2);
  const [groceryFeeThreshold, setGroceryFeeThreshold] = useState(3000);
  const [groceryFeePercent, setGroceryFeePercent] = useState(10);
  const [groceryFeeFlat, setGroceryFeeFlat] = useState(50);
  const [nonCodThreshold, setNonCodThreshold] = useState(3000);
  const [nonCodFeeHigh, setNonCodFeeHigh] = useState(50);
  const [nonCodFeeLow, setNonCodFeeLow] = useState(15);

  const [isLoading, setIsLoading] = useState(true);
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
    try {
      const config = await apiService.getRateConfig();
      if (config) {
        setBaseFee(config.baseFee);
        setPerKmRate(config.perKmRate);
        setMultiStoreFeePerStore(config.multiStoreFeePerStore ?? 30);
        setMaxAdditionalStores(config.maxAdditionalStores ?? 2);
        setGroceryFeeThreshold(config.groceryFeeThreshold ?? 3000);
        setGroceryFeePercent(config.groceryFeePercent ?? 10);
        setGroceryFeeFlat(config.groceryFeeFlat ?? 50);
        setNonCodThreshold(config.nonCodThreshold ?? 3000);
        setNonCodFeeHigh(config.nonCodFeeHigh ?? 50);
        setNonCodFeeLow(config.nonCodFeeLow ?? 15);

        // The parts of the formula the owner cannot edit, sent so this
        // simulator reads them rather than carrying its own copy.
        if (config.pricingRules) setPricingRules(config.pricingRules);
      }
    } catch (err) {
      console.warn("Failed to load rate configs:", err);
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
      toast.error("Rates are still loading — please wait before saving.");
      return;
    }
    if (baseFee === null) {
      toast.error("Enter a base delivery fare before saving.");
      return;
    }
    setIsSaving(true);
    try {
      await apiService.updateRateConfig({
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
      setSavedSuccess(true);
      toast.success("Rate configurations successfully saved to MariaDB!");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to save rate configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 max-w-7xl mx-auto w-full overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & PRIMARY STATUS (PINNED)                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <DollarSign size={18} />
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Service Rates</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {savedSuccess && (
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl animate-fade-in">
              <CheckCircle2 size={15} /> Saved to Database
            </span>
          )}
          <NotificationBell />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. RATE CONFIGURATION FORM                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin">
        <form onSubmit={handleSave} className="max-w-4xl space-y-3.5">
          {/* SECTION A: DISTANCE & BASE RATES */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <MapPin size={15} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-800">Distance & Base Delivery Rate</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Base Fee */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <label className="text-[10.5px] font-bold uppercase text-slate-700 flex items-center justify-between">
                  <span>Base Delivery Fare *</span>
                  <span className="text-[9.5px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.2 rounded-full border border-blue-200">
                    Covers 0 - {pricingRules.baseFeeDistanceKm.toFixed(1)} km
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-black text-base">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={baseFee ?? ""}
                    disabled={isLoading}
                    placeholder={isLoading ? "Loading…" : "Set base fare"}
                    onChange={(e) =>
                      setBaseFee(e.target.value === "" ? null : Number(e.target.value))
                    }
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-black text-base outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                </div>
              </div>

              {/* Per KM Rate */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <label className="text-[10.5px] font-bold uppercase text-slate-700 flex items-center justify-between">
                  <span>Excess Distance Rate *</span>
                  <span className="text-[9.5px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200">
                    Beyond {pricingRules.baseFeeDistanceKm.toFixed(1)} km
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-black text-base">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={perKmRate}
                    onChange={(e) => setPerKmRate(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-black text-base outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B: MULTI-STORE SURCHARGE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Store size={15} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-800">Multi-Store Errand Surcharge</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <label className="text-[10.5px] font-bold uppercase text-slate-700">
                  Fee Per Additional Store *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-black text-base">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={multiStoreFeePerStore}
                    onChange={(e) => setMultiStoreFeePerStore(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-black text-base outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <label className="text-[10.5px] font-bold uppercase text-slate-700">
                  Max Additional Stores Allowed
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min={1}
                    max={5}
                    value={maxAdditionalStores}
                    onChange={(e) => setMaxAdditionalStores(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-black text-base outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                  <span className="text-slate-400 font-bold text-xs">Stops</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION C: GROCERY & PURCHASE TIER */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <ShoppingBasket size={15} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-800">Grocery & Pabili Subtotal Surcharge</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <label className="text-[10.5px] font-bold uppercase text-slate-700">Order Threshold</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-black text-base">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    value={groceryFeeThreshold}
                    onChange={(e) => setGroceryFeeThreshold(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-black text-base outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                </div>
              </div>

              {/* Below the threshold is the FLAT fee and above it is the
                  PERCENTAGE — the inverse of how these two cards used to sit.
                  The inputs are bound accordingly: this card edits
                  groceryFeeFlat, the next edits groceryFeePercent. */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <label className="text-[10.5px] font-bold uppercase text-slate-700">Below Threshold</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-black text-base">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    value={groceryFeeFlat}
                    onChange={(e) => setGroceryFeeFlat(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-black text-base outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <label className="text-[10.5px] font-bold uppercase text-slate-700">Above Threshold</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={groceryFeePercent}
                    onChange={(e) => setGroceryFeePercent(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-black text-base outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                  <span className="text-slate-400 font-black text-base">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Save Rate Configurations</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
