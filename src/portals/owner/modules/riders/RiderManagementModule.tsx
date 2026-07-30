import React from "react";
import { Bike, CheckCircle, XCircle, Star, Phone } from "lucide-react";
import { MetricCard } from "../dashboard/components/MetricCard";

export const RiderManagementModule: React.FC = () => {
  const riders = [
    { id: "RDR-001", name: "Al-Dhen Musali", phone: "09391234567", status: "On Errand", rating: 4.9, completedToday: 8, vehicle: "Motorcycle (ABC-1234)" },
    { id: "RDR-002", name: "Juan Dela Cruz", phone: "09451112233", status: "Available", rating: 4.8, completedToday: 5, vehicle: "Motorcycle (XYZ-9876)" },
    { id: "RDR-003", name: "Pedro Penduko", phone: "09562223344", status: "Offline", rating: 4.7, completedToday: 0, vehicle: "Motorcycle (JKL-5544)" },
  ];

  return (
    <div className="space-y-6">
      {/* Rider Fleet Status Overview */}
      <div className="grid grid-cols-3 gap-6">
        <MetricCard title="Available Riders" value="1" sub="Ready for dispatch" icon={CheckCircle} color="#10B981" />
        <MetricCard title="On Errand" value="1" sub="Active on delivery" icon={Bike} color="#3B82F6" />
        <MetricCard title="Offline Riders" value="1" sub="End of shift" icon={XCircle} color="#94A3B8" />
      </div>

      {/* Rider Status Roster */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-200">Registered Rider Roster</h3>
        <div className="grid grid-cols-3 gap-6">
          {riders.map((r) => (
            <div key={r.id} className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">{r.name}</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{r.id}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    r.status === "Available"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : r.status === "On Errand"
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {r.status}
                </span>
              </div>

              <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-700/60">
                <p className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-500" /> {r.phone}
                </p>
                <p className="flex items-center gap-2">
                  <Star size={14} className="text-amber-400" /> {r.rating} Rating ({r.completedToday} today)
                </p>
                <p className="text-slate-500">{r.vehicle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
