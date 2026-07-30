import React from "react";
import { MockRider } from "../../../services/errandService";

interface RiderFleetRosterProps {
  riders: MockRider[];
}

export const RiderFleetRoster: React.FC<RiderFleetRosterProps> = ({ riders }) => {
  if (riders.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
        <p className="text-sm font-medium">No active riders registered in MariaDB yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800">Rider Status & Fleet Roster</h3>
      <div className="grid grid-cols-3 gap-6">
        {riders.map((r) => (
          <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{r.name}</h4>
                <p className="text-xs text-slate-400 font-mono">{r.id}</p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  r.status === "Available"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : r.status === "On Errand"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-slate-200 text-slate-600 border border-slate-300"
                }`}
              >
                {r.status}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <p>Phone: {r.phone}</p>
              <p>Rating: ⭐ {r.rating}</p>
              <p>Deliveries Today: {r.completedToday}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
