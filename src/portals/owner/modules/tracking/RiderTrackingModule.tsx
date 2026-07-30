import React, { useState } from "react";
import { Navigation, Bike, MapPin, BatteryCharging, Signal } from "lucide-react";

export interface RiderGPS {
  id: string;
  name: string;
  lat: number;
  lng: number;
  errandId?: string;
  status: "Available" | "On Delivery" | "Offline";
  battery: number;
  speed: string;
}

export const RiderTrackingModule: React.FC = () => {
  const [activeRiders] = useState<RiderGPS[]>([
    { id: "RDR-001", name: "Al-Dhen Musali", lat: 6.692, lng: 124.675, errandId: "ERR-1002", status: "On Delivery", battery: 92, speed: "28 km/h" },
    { id: "RDR-002", name: "Juan Dela Cruz", lat: 6.688, lng: 124.671, status: "Available", battery: 85, speed: "0 km/h" },
    { id: "RDR-003", name: "Pedro Penduko", lat: 6.695, lng: 124.68, status: "Offline", battery: 45, speed: "0 km/h" },
  ]);

  const [selectedRider, setSelectedRider] = useState<RiderGPS>(activeRiders[0]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Live Rider GPS Fleet Tracking</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time geolocation monitoring across Tacurong City</p>
        </div>
        <span className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm">
          <Navigation size={14} /> GPS Active
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Map Container */}
        <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-6 h-[420px] flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center space-y-3 z-10 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1E3A5F] text-white flex items-center justify-center font-bold shadow-lg">
              <MapPin size={28} />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-800">Tacurong City GPS Coordinates</p>
              <p className="text-xs font-mono text-[#1E3A5F] font-bold mt-1">Lat: {selectedRider.lat}° N, Lng: {selectedRider.lng}° E</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 max-w-sm w-full space-y-2 shadow-sm text-left">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">{selectedRider.name}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedRider.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Speed: {selectedRider.speed}</span>
                <span className="flex items-center gap-1"><BatteryCharging size={13} /> {selectedRider.battery}%</span>
              </div>
              {selectedRider.errandId && (
                <p className="text-xs text-indigo-700 font-semibold pt-1 border-t border-slate-100">
                  Assigned Errand: {selectedRider.errandId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Monitored Fleet Roster */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span>Fleet Roster</span>
            <Signal size={16} className="text-emerald-600" />
          </h3>
          <div className="space-y-3">
            {activeRiders.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedRider(r)}
                className={`border rounded-xl p-4 space-y-2 cursor-pointer transition ${
                  selectedRider.id === r.id
                    ? "bg-blue-50/70 border-[#1E3A5F] shadow-sm"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">{r.name}</span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      r.status === "Available"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : r.status === "On Delivery"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-slate-200 text-slate-600 border border-slate-300"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  Lat: {r.lat}, Lng: {r.lng}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
