import React, { useEffect, useState } from "react";
import { Bike, CheckCircle, XCircle, Star, Phone } from "lucide-react";
import { MetricCard } from "../dashboard/components/MetricCard";
import { apiClient } from "../../../../services/apiClient";

export const RiderManagementModule: React.FC = () => {
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRiders() {
      try {
        const res = await apiClient.get("/riders");
        const list = Array.isArray(res.data) ? res.data : res.data?.riders || [];
        setRiders(list);
      } catch (err) {
        console.warn("Failed to fetch riders in RiderManagementModule:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRiders();
  }, []);

  const availableCount = riders.filter(
    (r) => r.status === "Available" || r.status === "ONLINE"
  ).length;
  const onErrandCount = riders.filter(
    (r) => r.status === "On Errand" || r.status === "IN_TRANSIT" || r.status === "BUSY"
  ).length;
  const offlineCount = riders.length - availableCount - onErrandCount;

  return (
    <div className="space-y-6">
      {/* Rider Fleet Status Overview */}
      <div className="grid grid-cols-3 gap-6">
        <MetricCard
          title="Available Riders"
          value={String(availableCount)}
          sub="Ready for dispatch"
          icon={CheckCircle}
          color="#10B981"
        />
        <MetricCard
          title="On Errand"
          value={String(onErrandCount)}
          sub="Active on delivery"
          icon={Bike}
          color="#3B82F6"
        />
        <MetricCard
          title="Offline Riders"
          value={String(offlineCount < 0 ? 0 : offlineCount)}
          sub="End of shift"
          icon={XCircle}
          color="#94A3B8"
        />
      </div>

      {/* Rider Status Roster */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">Registered Rider Roster</h3>
        {loading ? (
          <p className="text-xs text-slate-400">Loading fleet roster...</p>
        ) : riders.length === 0 ? (
          <p className="text-xs text-slate-400">No riders currently registered in the database.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {riders.map((r) => (
              <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{r.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {r.id}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      r.status === "Available" || r.status === "ONLINE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : r.status === "On Errand" || r.status === "IN_TRANSIT"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-slate-200 text-slate-600 border border-slate-300"
                    }`}
                  >
                    {r.status || "Offline"}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-200/80">
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" /> {r.phone || "N/A"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Star size={14} className="text-amber-400 fill-amber-400" /> {r.rating || 5.0} Rating ({r.activeOrdersCount || 0} active orders)
                  </p>
                  <p className="text-slate-500">{r.vehicle || "Motorcycle"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
