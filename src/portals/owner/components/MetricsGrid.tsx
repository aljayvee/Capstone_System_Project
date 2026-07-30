import React from "react";
import { DollarSign, Package, Bike, Users } from "lucide-react";

export const MetricsGrid: React.FC = () => {
  return (
    <section className="grid grid-cols-4 gap-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
          Total Revenue
          <DollarSign size={16} className="text-emerald-400" />
        </div>
        <p className="text-3xl font-extrabold text-white">₱128,450</p>
        <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium">+14.2% from last month</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
          Total Errands
          <Package size={16} className="text-indigo-400" />
        </div>
        <p className="text-3xl font-extrabold text-white">1,420</p>
        <p className="text-xs text-indigo-400 flex items-center gap-1 font-medium">+8.5% new requests</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
          Active Riders
          <Bike size={16} className="text-amber-400" />
        </div>
        <p className="text-3xl font-extrabold text-white">24</p>
        <p className="text-xs text-slate-400 font-medium">18 currently on delivery</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
          Registered Users
          <Users size={16} className="text-sky-400" />
        </div>
        <p className="text-3xl font-extrabold text-white">512</p>
        <p className="text-xs text-sky-400 font-medium">+32 new customers</p>
      </div>
    </section>
  );
};
