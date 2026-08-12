import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Navigation, Bike, MapPin, Signal, Radio } from "lucide-react";
import { apiClient } from "../../../../services/apiClient";
import { loadGoogleMapsScript } from "../../../../utils/loadGoogleMaps";

export interface RiderGPS {
  id: string | number;
  name: string;
  lat: number;
  lng: number;
  errandId?: string;
  status: string;
  updatedAt?: string | number;
}

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

const TACURONG_CENTER = { lat: 6.671, lng: 124.6644 };

export const RiderTrackingModule: React.FC = () => {
  const [activeRiders, setActiveRiders] = useState<RiderGPS[]>([]);
  const [locations, setLocations] = useState<Record<string, { lat: number; lng: number; updatedAt?: string }>>({});
  const [selectedRiderId, setSelectedRiderId] = useState<string | number | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const markersMap = useRef<Record<string, any>>({});

  // 1. Initial Load: Fleet Roster + Locations
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [ridersRes, locsRes] = await Promise.all([
          apiClient.get("/riders").catch(() => null),
          apiClient.get("/riders/locations").catch(() => null),
        ]);

        if (isMounted) {
          let riderList: any[] = [];
          if (ridersRes?.data) {
            riderList = Array.isArray(ridersRes.data)
              ? ridersRes.data
              : ridersRes.data.riders || [];
          }

          const locMap: Record<string, { lat: number; lng: number; updatedAt?: string }> = {};
          if (locsRes?.data) {
            const locList = Array.isArray(locsRes.data)
              ? locsRes.data
              : locsRes.data.locations || [];
            locList.forEach((l: any) => {
              locMap[String(l.riderId)] = {
                lat: Number(l.latitude),
                lng: Number(l.longitude),
                updatedAt: l.updatedAt,
              };
            });
            setLocations(locMap);
          }

          const mappedGps: RiderGPS[] = riderList.map((r: any) => {
            const idStr = String(r.id);
            const liveLoc = locMap[idStr];
            return {
              id: r.id,
              name: r.name,
              status: r.status || "Offline",
              lat: liveLoc ? liveLoc.lat : r.lat ? Number(r.lat) : TACURONG_CENTER.lat,
              lng: liveLoc ? liveLoc.lng : r.lng ? Number(r.lng) : TACURONG_CENTER.lng,
              errandId: r.currentErrandId,
              updatedAt: liveLoc?.updatedAt,
            };
          });

          setActiveRiders(mappedGps);
          if (mappedGps.length > 0 && !selectedRiderId) {
            setSelectedRiderId(mappedGps[0].id);
          }
        }
      } catch (err) {
        console.warn("[OwnerTracking] Error loading initial data:", err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Real-Time Socket Listener
  useEffect(() => {
    const socket: Socket = io(BACKEND_URL);

    socket.on("rider:location_updated", (payload: any) => {
      if (payload && payload.riderId) {
        const idStr = String(payload.riderId);
        const newLat = Number(payload.latitude);
        const newLng = Number(payload.longitude);

        setLocations((prev) => ({
          ...prev,
          [idStr]: { lat: newLat, lng: newLng, updatedAt: payload.updatedAt || new Date().toISOString() },
        }));

        setActiveRiders((prev) =>
          prev.map((r) =>
            String(r.id) === idStr
              ? { ...r, lat: newLat, lng: newLng, updatedAt: payload.updatedAt || new Date().toISOString() }
              : r
          )
        );
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
        console.warn("[OwnerTracking] Google Maps load warning:", err);
      });
  }, []);

  // 4. Update Markers on Google Map
  useEffect(() => {
    if (!isMapLoaded || !googleMapInstance.current) return;
    const maps = (window as any).google.maps;

    activeRiders.forEach((r) => {
      const idStr = String(r.id);
      const isOnline = r.status === "Available" || r.status === "On Errand" || r.status === "ONLINE" || r.status === "On Delivery";
      const isSelected = selectedRiderId === r.id;

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
        markersMap.current[idStr].setPosition({ lat: r.lat, lng: r.lng });
        markersMap.current[idStr].setIcon(svgIcon);
      } else {
        const marker = new maps.Marker({
          position: { lat: r.lat, lng: r.lng },
          map: googleMapInstance.current,
          title: `${r.name} (${r.status})`,
          icon: svgIcon,
        });

        marker.addListener("click", () => {
          setSelectedRiderId(r.id);
          googleMapInstance.current.panTo({ lat: r.lat, lng: r.lng });
        });

        markersMap.current[idStr] = marker;
      }
    });
  }, [activeRiders, isMapLoaded, selectedRiderId]);

  const selectedRider = activeRiders.find((r) => r.id === selectedRiderId) || activeRiders[0];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Radio size={20} className="text-emerald-600 animate-pulse" /> Owner Live GPS Fleet Tracking
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time geolocation & fleet monitoring across Tacurong City</p>
        </div>
        <span className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm">
          <Navigation size={14} /> GPS Live Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Google Map Container */}
        <div className="lg:col-span-2 bg-slate-100 border border-slate-200 rounded-2xl h-[440px] relative overflow-hidden shadow-inner">
          <div ref={mapRef} className="w-full h-full" />
          {!isMapLoaded && (
            <div className="absolute inset-0 bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
              Loading Tacurong Fleet Map...
            </div>
          )}

          {/* Overlay card for selected rider info */}
          {selectedRider && (
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-4 max-w-sm w-full space-y-2 shadow-lg z-10">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Bike size={16} className="text-emerald-600" />
                  {selectedRider.name}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    selectedRider.status === "Available" || selectedRider.status === "ONLINE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : selectedRider.status === "On Delivery" || selectedRider.status === "On Errand"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-slate-200 text-slate-600 border border-slate-300"
                  }`}
                >
                  {selectedRider.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Lat: {selectedRider.lat.toFixed(5)}°</span>
                <span>Lng: {selectedRider.lng.toFixed(5)}°</span>
              </div>
              {selectedRider.errandId && (
                <p className="text-xs text-emerald-700 font-semibold pt-1 border-t border-slate-100">
                  Assigned Errand: {selectedRider.errandId}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Monitored Fleet Roster */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col h-[440px]">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Monitored Fleet Roster ({activeRiders.length})</span>
            <Signal size={16} className="text-emerald-600" />
          </h3>
          <div className="space-y-3 overflow-y-auto flex-1 pr-1">
            {activeRiders.length === 0 ? (
              <p className="text-xs text-slate-400 p-4">No active riders registered.</p>
            ) : (
              activeRiders.map((r) => {
                const isSelected = selectedRiderId === r.id;
                const isRecentlyUpdated =
                  r.updatedAt && Date.now() - new Date(r.updatedAt).getTime() < 10000;
                const isOnline =
                  r.status === "Available" || r.status === "On Delivery" || r.status === "On Errand" || r.status === "ONLINE";

                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedRiderId(r.id);
                      if (googleMapInstance.current) {
                        googleMapInstance.current.panTo({ lat: r.lat, lng: r.lng });
                      }
                    }}
                    className={`border rounded-xl p-4 space-y-2 cursor-pointer transition ${
                      isSelected
                        ? "bg-emerald-50/70 border-emerald-600 shadow-sm"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            isOnline ? "bg-emerald-600" : "bg-slate-400"
                          } ${isRecentlyUpdated ? "ring-4 ring-emerald-300 animate-pulse" : ""}`}
                        >
                          <Bike size={13} />
                        </div>
                        <span className="font-bold text-slate-800 text-sm">{r.name}</span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isOnline
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-1 border-t border-slate-200/60">
                      <span>Lat: {r.lat.toFixed(4)}, Lng: {r.lng.toFixed(4)}</span>
                      <span className="text-[10px] text-slate-400">
                        {isRecentlyUpdated ? "● Live" : "GPS Pin"}
                      </span>
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
