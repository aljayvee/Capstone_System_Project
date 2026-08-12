import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { MapPin, Radio, Bike, Navigation, Signal } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { loadGoogleMapsScript } from "../../../utils/loadGoogleMaps";

interface RiderLocation {
  riderId: number | string;
  latitude: number;
  longitude: number;
  updatedAt?: string | number;
}

interface RiderFleetRosterProps {
  riders?: any[];
}

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

const TACURONG_CENTER = { lat: 6.671, lng: 124.6644 };

export const RiderFleetRoster: React.FC<RiderFleetRosterProps> = ({ riders: initialRiders = [] }) => {
  const [fleetRiders, setFleetRiders] = useState<any[]>(initialRiders);
  const [locations, setLocations] = useState<Record<string, RiderLocation>>({});
  const [selectedRiderId, setSelectedRiderId] = useState<string | number | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const markersMap = useRef<Record<string, any>>({});

  // 1. Fetch Fleet Roster & Initial Location Snapshot
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const [ridersRes, locsRes] = await Promise.all([
          apiClient.get("/riders").catch(() => null),
          apiClient.get("/riders/locations").catch(() => null),
        ]);

        if (isMounted) {
          if (ridersRes?.data) {
            const list = Array.isArray(ridersRes.data)
              ? ridersRes.data
              : ridersRes.data.riders || [];
            if (list.length > 0) setFleetRiders(list);
          }

          if (locsRes?.data) {
            const locList: RiderLocation[] = Array.isArray(locsRes.data)
              ? locsRes.data
              : locsRes.data.locations || [];
            const locMap: Record<string, RiderLocation> = {};
            locList.forEach((l) => {
              locMap[String(l.riderId)] = l;
            });
            setLocations(locMap);
          }
        }
      } catch (err) {
        console.warn("[FleetRoster] Initial fetch warning:", err);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update fleetRiders if parent prop updates
  useEffect(() => {
    if (initialRiders && initialRiders.length > 0) {
      setFleetRiders(initialRiders);
    }
  }, [initialRiders]);

  // 2. Real-Time Socket.IO Listener for "rider:location_updated"
  useEffect(() => {
    const socket: Socket = io(BACKEND_URL);

    socket.on("rider:location_updated", (payload: RiderLocation) => {
      if (payload && payload.riderId) {
        setLocations((prev) => ({
          ...prev,
          [String(payload.riderId)]: {
            riderId: payload.riderId,
            latitude: Number(payload.latitude),
            longitude: Number(payload.longitude),
            updatedAt: payload.updatedAt || new Date().toISOString(),
          },
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 3. Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current || googleMapInstance.current) return;

    loadGoogleMapsScript()
      .then(() => {
        const maps = (window as any).google.maps;
        const map = new maps.Map(mapRef.current, {
          center: TACURONG_CENTER,
          zoom: 14,
          disableDefaultUI: false,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });
        googleMapInstance.current = map;
        setIsMapLoaded(true);
      })
      .catch((err) => {
        console.warn("[FleetRoster] Google Maps load warning:", err);
      });
  }, []);

  // 4. Update Google Maps Markers dynamically
  useEffect(() => {
    if (!isMapLoaded || !googleMapInstance.current) return;
    const maps = (window as any).google.maps;

    // Render/update markers for each rider
    fleetRiders.forEach((r) => {
      const idStr = String(r.id);
      const loc = locations[idStr];
      const lat = loc ? Number(loc.latitude) : r.lat ? Number(r.lat) : TACURONG_CENTER.lat;
      const lng = loc ? Number(loc.longitude) : r.lng ? Number(r.lng) : TACURONG_CENTER.lng;

      const isOnline = r.status === "Available" || r.status === "On Errand" || r.status === "ONLINE";
      const isSelected = selectedRiderId === r.id;

      // Circular SVG Marker Icon
      const pinColor = isOnline ? "#059669" : "#64748B";
      const svgIcon = {
        path: maps.SymbolPath.CIRCLE,
        fillColor: pinColor,
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 3,
        scale: isSelected ? 12 : 9,
      };

      if (markersMap.current[idStr]) {
        markersMap.current[idStr].setPosition({ lat, lng });
        markersMap.current[idStr].setIcon(svgIcon);
      } else {
        const marker = new maps.Marker({
          position: { lat, lng },
          map: googleMapInstance.current,
          title: `${r.name} (${r.status || "Offline"})`,
          icon: svgIcon,
        });

        marker.addListener("click", () => {
          setSelectedRiderId(r.id);
          googleMapInstance.current.panTo({ lat, lng });
        });

        markersMap.current[idStr] = marker;
      }
    });
  }, [fleetRiders, locations, isMapLoaded, selectedRiderId]);

  const activeRidersCount = fleetRiders.filter(
    (r) => r.status === "Available" || r.status === "On Errand" || r.status === "ONLINE"
  ).length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Radio size={20} className="text-emerald-600 animate-pulse" /> Live Rider Fleet Tracking
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time location updates from riders currently on the road</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            {activeRidersCount} Active Riders Online
          </span>
        </div>
      </div>

      {/* Map & List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Google Map Container */}
        <div className="lg:col-span-2 bg-slate-100 border border-slate-200 rounded-2xl h-[440px] relative overflow-hidden shadow-inner">
          <div ref={mapRef} className="w-full h-full" />
          {!isMapLoaded && (
            <div className="absolute inset-0 bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
              Loading Google Maps fleet view...
            </div>
          )}
        </div>

        {/* Rider Roster Side List */}
        <div className="space-y-4 flex flex-col h-[440px]">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Rider Fleet Roster ({fleetRiders.length})</span>
            <Signal size={14} className="text-emerald-600" />
          </h4>

          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {fleetRiders.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                No registered riders found.
              </div>
            ) : (
              fleetRiders.map((r) => {
                const loc = locations[String(r.id)];
                const isSelected = selectedRiderId === r.id;
                const isOnline =
                  r.status === "Available" || r.status === "On Errand" || r.status === "ONLINE";

                const isRecentlyUpdated =
                  loc?.updatedAt &&
                  Date.now() - new Date(loc.updatedAt).getTime() < 10000;

                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedRiderId(r.id);
                      if (loc && googleMapInstance.current) {
                        googleMapInstance.current.panTo({
                          lat: Number(loc.latitude),
                          lng: Number(loc.longitude),
                        });
                      }
                    }}
                    className={`border rounded-xl p-4 space-y-2 cursor-pointer transition ${
                      isSelected
                        ? "bg-emerald-50/60 border-emerald-600 shadow-sm"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                            isOnline ? "bg-emerald-600" : "bg-slate-400"
                          } ${isRecentlyUpdated ? "ring-4 ring-emerald-300 animate-pulse" : ""}`}
                        >
                          <Bike size={14} />
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-800 text-sm">{r.name}</h5>
                          <p className="text-[11px] text-slate-400 font-mono">ID: {r.id}</p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          r.status === "Available" || r.status === "ONLINE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : r.status === "On Errand"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {r.status || "Offline"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-200/60">
                      {loc ? (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-slate-700 flex items-center gap-1">
                            <MapPin size={11} className="text-emerald-600" />
                            {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {isRecentlyUpdated ? "● Live 5s" : "Updated"}
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          Tacurong City Hub (6.6710, 124.6644)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


