import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../../firebase/config";
import { MockRider } from "../../../services/errandService";
import { MapPin, Radio } from "lucide-react";

interface RiderFleetRosterProps {
  riders: MockRider[];
}

export const RiderFleetRoster: React.FC<RiderFleetRosterProps> = ({ riders }) => {
  const [liveLocations, setLiveLocations] = useState<Record<string, any>>({});

  useEffect(() => {
    const ridersRef = ref(database, "riders");
    const unsubscribe = onValue(ridersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLiveLocations(data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (riders.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
        <p className="text-sm font-medium">No active riders registered in MariaDB yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Radio size={18} className="text-emerald-500 animate-pulse" /> Rider Status & Live Fleet Tracking
        </h3>
        <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-full border border-emerald-200">
          Firebase Realtime GPS Sync Active
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {riders.map((r) => {
          const liveData = liveLocations[r.id]?.location || liveLocations[String(r.id)]?.location;

          return (
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

              {/* LIVE GPS DATA CARD */}
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs space-y-1 border border-slate-700">
                <p className="font-bold text-emerald-400 flex items-center gap-1">
                  <MapPin size={12} /> Live GPS Location:
                </p>
                {liveData ? (
                  <>
                    <p className="font-mono text-[11px]">
                      Lat: {parseFloat(liveData.latitude).toFixed(5)}, Lng: {parseFloat(liveData.longitude).toFixed(5)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Updated: {new Date(liveData.timestamp).toLocaleTimeString()}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Tacurong City Hub (6.6710, 124.6644)
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

