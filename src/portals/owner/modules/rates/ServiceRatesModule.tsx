import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Tag,
  Save,
  ShieldCheck,
  Store,
  ShoppingBasket,
  CreditCard,
  Calculator,
  Info,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  MapPin,
  HelpCircle,
  Loader2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { apiService } from "../../../../services/apiService";
import { ServerStatusBadge } from "../../../../components/ServerStatusBadge";
import { NotificationBell } from "../../../../components/NotificationBell";

export const ServiceRatesModule: React.FC = () => {
  const [baseFee, setBaseFee] = useState(50);
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

  // Live Interactive Simulator State
  const [simDistance, setSimDistance] = useState<number>(4.5);
  const [simStores, setSimStores] = useState<number>(2);
  const [simGroceryAmount, setSimGroceryAmount] = useState<number>(1500);

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

  // Formula Calculations for the Live Simulator
  const simulatedDeliveryFee = useMemo(() => {
    // 1. Distance Calculation (First 2.0 km covered by Base Fee)
    const excessKm = Math.max(0, simDistance - 2.0);
    const distanceFee = baseFee + excessKm * perKmRate;

    // 2. Multi-Store Surcharge (Beyond 1st store, capped at maxAdditionalStores)
    const additionalStores = Math.min(Math.max(0, simStores - 1), maxAdditionalStores);
    const multiStoreFee = additionalStores * multiStoreFeePerStore;

    // 3. Grocery Fee Surcharge
    let groceryFee = 0;
    if (simGroceryAmount > 0) {
      if (simGroceryAmount < groceryFeeThreshold) {
        groceryFee = (simGroceryAmount * groceryFeePercent) / 100;
      } else {
        groceryFee = groceryFeeFlat;
      }
    }

    return {
      baseFee,
      excessKm,
      distanceFee,
      additionalStores,
      multiStoreFee,
      groceryFee,
      totalDeliveryFee: distanceFee + multiStoreFee + groceryFee,
      grandTotal: simGroceryAmount + distanceFee + multiStoreFee + groceryFee,
    };
  }, [
    simDistance,
    simStores,
    simGroceryAmount,
    baseFee,
    perKmRate,
    multiStoreFeePerStore,
    maxAdditionalStores,
    groceryFeeThreshold,
    groceryFeePercent,
    groceryFeeFlat,
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & PRIMARY STATUS                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <DollarSign size={20} />
            </span>
            <h2 className="text-xl font-extrabold text-slate-800">Service Rates</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Set delivery fees, distance charges, and store add-ons.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {savedSuccess && (
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3.5 py-2 rounded-xl animate-fade-in">
              <CheckCircle2 size={16} /> Saved to Database
            </span>
          )}
          <button
            type="button"
            onClick={loadConfig}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-2xs"
            title="Reset to Saved Database Rates"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
          <NotificationBell />
          <ServerStatusBadge />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. TWO-COLUMN SPLIT: FORM ENGINE (LEFT) & LIVE SIMULATOR (RIGHT) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT COLUMN: RATE CONFIGURATION CONTROLS (7 Cols) ─────── */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* SECTION A: DISTANCE & BASE RATES */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <MapPin size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Distance & Base Delivery Rate</h3>
                <p className="text-[11px] text-slate-400">Sequential distance calculation parameters</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Base Fee */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-700 flex items-center justify-between">
                  <span>Base Delivery Fare *</span>
                  <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Covers 0 - 2.0 km
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-black text-lg">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={baseFee}
                    onChange={(e) => setBaseFee(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-black text-lg outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Standard initial flat rate applied to all errand runs</p>
              </div>

              {/* Per KM Rate */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-700 flex items-center justify-between">
                  <span>Excess Distance Rate *</span>
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Beyond 2.0 km
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-black text-lg">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={perKmRate}
                    onChange={(e) => setPerKmRate(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-black text-lg outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Charge appended per kilometer exceeding the initial 2.0 km radius</p>
              </div>
            </div>
          </div>

          {/* SECTION B: MULTI-STORE SURCHARGE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Store size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Multi-Store Errand Surcharge</h3>
                <p className="text-[11px] text-slate-400">Additional stop compensation for riders</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-700">
                  Fee Per Additional Store *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-black text-lg">₱</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={multiStoreFeePerStore}
                    onChange={(e) => setMultiStoreFeePerStore(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-black text-lg outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Appended for each extra store beyond the first store</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-700">
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
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-black text-lg outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                  <span className="text-slate-400 font-bold text-sm">Stops</span>
                </div>
                <p className="text-[11px] text-slate-500">Maximum multi-stop pickups allowed per single mission</p>
              </div>
            </div>
          </div>

          {/* SECTION C: GROCERY & PURCHASE TIER */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <ShoppingBasket size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Grocery & Pabili Subtotal Surcharge</h3>
                <p className="text-[11px] text-slate-400">Pabili order handling tiers</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-700">Order Threshold</label>
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
                <p className="text-[10px] text-slate-500">Point where fee switches from % to flat</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-700">Below Threshold</label>
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
                <p className="text-[10px] text-slate-500">% fee under threshold</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-700">Above Threshold</label>
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
                <p className="text-[10px] text-slate-500">Capped flat handling fee</p>
              </div>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Changes take effect immediately across all customer and rider apps.</span>
            </p>
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

        {/* ── RIGHT COLUMN: LIVE INTERACTIVE FARE SIMULATOR (5 Cols) ── */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-[#1E3A5F] to-[#162D4A] text-white rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/15">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                  <Calculator size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Fee Calculator</h3>
                  <p className="text-[11px] text-blue-200/80">Test Sample Delivery Cost</p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-white/10 px-2.5 py-1 rounded-full border border-white/20">
                SAMPLE RECEIPT
              </span>
            </div>

            {/* Interactive Sliders */}
            <div className="space-y-4">
              {/* Distance Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-200 font-medium">Estimated Errand Distance</span>
                  <span className="font-mono font-bold text-amber-400">{simDistance.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="15.0"
                  step="0.5"
                  value={simDistance}
                  onChange={(e) => setSimDistance(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              {/* Stores Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-200 font-medium">Number of Store Pickups</span>
                  <span className="font-mono font-bold text-amber-400">{simStores} Store(s)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  value={simStores}
                  onChange={(e) => setSimStores(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              {/* Grocery Value */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-200 font-medium">Estimated Item Cost</span>
                  <span className="font-mono font-bold text-amber-400">₱{simGroceryAmount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="100"
                  value={simGroceryAmount}
                  onChange={(e) => setSimGroceryAmount(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>

            {/* Calculated Breakdown Card */}
            <div className="bg-black/25 backdrop-blur-xs rounded-2xl p-4 space-y-2.5 border border-white/10 text-xs">
              <div className="flex items-center justify-between text-blue-200">
                <span>Base Fare (First 2.0 km)</span>
                <span className="font-mono font-bold text-white">₱{simulatedDeliveryFee.baseFee.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-blue-200">
                <span>Excess Distance ({simulatedDeliveryFee.excessKm.toFixed(1)} km × ₱{perKmRate})</span>
                <span className="font-mono font-bold text-white">
                  ₱{(simulatedDeliveryFee.excessKm * perKmRate).toFixed(2)}
                </span>
              </div>

              {simulatedDeliveryFee.multiStoreFee > 0 && (
                <div className="flex items-center justify-between text-blue-200">
                  <span>
                    Multi-Store ({simulatedDeliveryFee.additionalStores} extra × ₱{multiStoreFeePerStore})
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    +₱{simulatedDeliveryFee.multiStoreFee.toFixed(2)}
                  </span>
                </div>
              )}

              {simulatedDeliveryFee.groceryFee > 0 && (
                <div className="flex items-center justify-between text-blue-200">
                  <span>Pabili Surcharge</span>
                  <span className="font-mono font-bold text-amber-300">
                    +₱{simulatedDeliveryFee.groceryFee.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-white/10 flex items-center justify-between font-bold">
                <span className="text-amber-400">Total Delivery Fee</span>
                <span className="font-mono text-base text-amber-400">
                  ₱{simulatedDeliveryFee.totalDeliveryFee.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-blue-300/80">
                <span>Customer Grand Total</span>
                <span className="font-mono font-bold text-white">
                  ₱{simulatedDeliveryFee.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
