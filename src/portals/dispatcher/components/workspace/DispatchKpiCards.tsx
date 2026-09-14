import React from "react";
import { Errand } from "../../../../types/errand";
import { Clock, Zap, Bike } from "lucide-react";

interface DispatchKpiCardsProps {
  errands: Errand[];
  totalRiders: number;
  onlineRiders: number;
}

export const DispatchKpiCards: React.FC<DispatchKpiCardsProps> = ({
  errands,
  totalRiders,
  onlineRiders,
}) => {
  const awaitingCount = errands.filter(
    (e) => String(e.status).toUpperCase() === "AVAILABLE"
  ).length;

  const activeCount = errands.filter((e) => {
    const s = String(e.status).toUpperCase();
    return (
      s !== "AVAILABLE" &&
      s !== "CANCELLED" &&
      s !== "PASSING BY" &&
      s !== "COMPLETED" &&
      s !== "DELIVERED"
    );
  }).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {/* 1. Awaiting Dispatch */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between hover:shadow-sm transition">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-bold shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
              Awaiting Dispatch
            </p>
            <p className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
              {awaitingCount} {awaitingCount === 1 ? "Errand" : "Errands"}
            </p>
          </div>
        </div>
        {awaitingCount > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
            <span>Incoming</span>
          </span>
        )}
      </div>

      {/* 2. Active Deliveries */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between hover:shadow-sm transition">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-bold shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
              Active Deliveries
            </p>
            <p className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
              {activeCount} {activeCount === 1 ? "Errand" : "Errands"}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
          In Progress
        </span>
      </div>

      {/* 3. Riders Ready */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between hover:shadow-sm transition">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-bold shrink-0">
            <Bike size={20} />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
              Riders Ready
            </p>
            <p className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
              {onlineRiders} of {totalRiders} Online
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Fleet Active</span>
        </span>
      </div>
    </div>
  );
};
