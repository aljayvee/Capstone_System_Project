import React, { useState } from "react";
import { RateConfig } from "../../../services/errandService";

interface RateConfigFormProps {
  initialRates: RateConfig;
  onSave: (newRates: RateConfig) => void;
}

export const RateConfigForm: React.FC<RateConfigFormProps> = ({ initialRates, onSave }) => {
  const [rates, setRates] = useState<RateConfig>(initialRates);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(rates);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      <h3 className="text-lg font-semibold text-slate-200">Errand System Rate Configuration</h3>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700 space-y-3">
          <label className="text-xs font-bold uppercase text-slate-400">Base Delivery Fee (First 2 KM)</label>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">₱</span>
            <input
              type="number"
              value={rates.baseFee}
              onChange={(e) => setRates({ ...rates, baseFee: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700 space-y-3">
          <label className="text-xs font-bold uppercase text-slate-400">Per Additional KM Rate</label>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">₱</span>
            <input
              type="number"
              value={rates.perKmRate}
              onChange={(e) => setRates({ ...rates, perKmRate: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="bg-slate-800/60 p-5 rounded-xl border border-slate-700 space-y-3">
          <label className="text-xs font-bold uppercase text-slate-400">Service Fee Percentage</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={rates.serviceFeePercent}
              onChange={(e) => setRates({ ...rates, serviceFeePercent: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold outline-none focus:border-indigo-500"
            />
            <span className="text-slate-400 font-bold">%</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg transition"
        >
          Save Configuration
        </button>
      </div>
    </form>
  );
};
