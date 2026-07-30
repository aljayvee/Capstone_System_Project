import React, { useState, useEffect } from "react";
import { DollarSign, Tag, Save, ShieldCheck } from "lucide-react";
import { apiService } from "../../../../services/apiService";

export const ServiceRatesModule: React.FC = () => {
  const [baseFee, setBaseFee] = useState(50);
  const [perKmRate, setPerKmRate] = useState(10);
  const [serviceFeePercent, setServiceFeePercent] = useState(5);
  const [nightSurcharge, setNightSurcharge] = useState(20);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      const config = await apiService.getRateConfig();
      if (config) {
        setBaseFee(config.baseFee);
        setPerKmRate(config.perKmRate);
        setServiceFeePercent(config.serviceFeePercent);
        setNightSurcharge(config.nightSurcharge || 20);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiService.updateRateConfig({ baseFee, perKmRate, serviceFeePercent, nightSurcharge });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Service Rates & Fee Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage delivery rates, surcharges, and system commission fees</p>
        </div>
        {savedSuccess && (
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3.5 py-1.5 rounded-full">
            <ShieldCheck size={16} /> Persisted to MariaDB!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <label className="text-xs font-bold uppercase text-slate-700 flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-600" /> Base Delivery Fee (First 2 KM)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold text-lg">₱</span>
              <input
                type="number"
                value={baseFee}
                onChange={(e) => setBaseFee(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold text-lg outline-none focus:border-[#1E3A5F]"
              />
            </div>
            <p className="text-slate-500 text-xs">Initial charge applied to all errand requests</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <label className="text-xs font-bold uppercase text-slate-700 flex items-center gap-2">
              <Tag size={16} className="text-blue-600" /> Per Additional KM Rate
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold text-lg">₱</span>
              <input
                type="number"
                value={perKmRate}
                onChange={(e) => setPerKmRate(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold text-lg outline-none focus:border-[#1E3A5F]"
              />
            </div>
            <p className="text-slate-500 text-xs">Rate added per kilometer beyond initial 2 KM radius</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <label className="text-xs font-bold uppercase text-slate-700 flex items-center gap-2">
              <Tag size={16} className="text-indigo-600" /> Platform Service Fee Percentage
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={serviceFeePercent}
                onChange={(e) => setServiceFeePercent(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold text-lg outline-none focus:border-[#1E3A5F]"
              />
              <span className="text-slate-500 font-bold text-lg">%</span>
            </div>
            <p className="text-slate-500 text-xs">System commission retained from overall errand value</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <label className="text-xs font-bold uppercase text-slate-700 flex items-center gap-2">
              <DollarSign size={16} className="text-amber-600" /> Night Shift Surcharge (10 PM - 6 AM)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold text-lg">₱</span>
              <input
                type="number"
                value={nightSurcharge}
                onChange={(e) => setNightSurcharge(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold text-lg outline-none focus:border-[#1E3A5F]"
              />
            </div>
            <p className="text-slate-500 text-xs">Bonus fee allocated to rider during night shifts</p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-sm transition"
          >
            <Save size={18} /> Save Rate Configurations
          </button>
        </div>
      </form>
    </div>
  );
};
