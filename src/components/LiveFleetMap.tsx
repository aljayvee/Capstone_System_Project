import React, { useEffect, useRef, useState, useCallback } from "react";
import { Bike, Navigation, WifiOff, Package, Moon, BatteryLow, Target, Sparkles } from "lucide-react";
import { createRoot, Root } from "react-dom/client";
import { importGoogleMapsLibrary } from "../utils/loadGoogleMaps";
import type { RiderFleetMember, RiderPresenceState } from "../hooks/useRiderFleetPresence";
import { RIDER_STATUS_THEMES } from "../constants/riderPresence";
import { decodePolyline } from "../utils/polyline";

interface LiveFleetMapProps {
  riders: RiderFleetMember[];
  center?: google.maps.LatLngLiteral;
  selectedRiderId?: number | null;
  onSelectRider?: (riderId: number) => void;
  hideOffline?: boolean;
  filterStatus?: RiderPresenceState | "ALL";
  /**
   * Encoded polyline of the selected errand's road-network route
   * (Errand.routeGeometry). Drawing the real route rather than straight lines
   * between pins means the dispatcher sees the same path the fare was billed on
   * and the ETA was computed from.
   */
  routeGeometry?: string | null;
  /** Ordered store stops for the selected errand. */
  routeStops?: Array<{ latitude: number; longitude: number; storeName: string }>;
  /** Delivery destination for the selected errand. */
  routeDestination?: { latitude: number; longitude: number } | null;
}

interface CustomMarkerContentProps {
  rider: RiderFleetMember;
  isSelected: boolean;
  onClick: () => void;
}

const CustomRiderMarkerPin: React.FC<CustomMarkerContentProps> = ({
  rider,
  isSelected,
  onClick,
}) => {
  const theme = RIDER_STATUS_THEMES[rider.presence] || RIDER_STATUS_THEMES.AVAILABLE;
  const isStale = rider.presence === "DISCONNECTED";
  const isOffDuty = rider.presence === "OFF_DUTY";
  const isBusy = rider.presence === "BUSY";
  const isAvailable = rider.presence === "AVAILABLE";

  const firstName = rider.name.split(" ")[0] || "Rider";
  const heading = rider.plottableLocation?.heading;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`relative group cursor-pointer select-none transition-all duration-200 ${
        isSelected ? "scale-125 z-50" : "hover:scale-110 z-20"
      }`}
      style={{
        opacity: isStale ? 0.75 : isOffDuty ? 0.6 : 1,
      }}
      title={`${rider.name} — ${theme.label}`}
    >
      {/* 1. Outer Live Pulsing Halo Ring (for AVAILABLE status) */}
      {isAvailable && (
        <span className="absolute -inset-1.5 rounded-full animate-ping opacity-60 bg-emerald-400 pointer-events-none" />
      )}

      {/* 2. Spotlight Ring (when selected by dispatcher) */}
      {isSelected && (
        <span className="absolute -inset-2 rounded-full border-2 border-blue-500 animate-pulse bg-blue-500/10 pointer-events-none" />
      )}

      {/* 3. Main Circular Vehicle Container (42x42px) */}
      <div
        className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg transition-all"
        style={{
          border: `3px solid ${theme.primaryColor}`,
          boxShadow: isSelected
            ? `0 0 0 2px white, 0 8px 16px ${theme.glowColor}`
            : `0 2px 8px rgba(0,0,0,0.18)`,
        }}
      >
        {/* Directional Motorcycle / Vehicle Icon with Heading Bearing Rotation */}
        <div
          className="flex items-center justify-center transition-transform duration-300"
          style={{
            transform: heading !== null && heading !== undefined ? `rotate(${heading}deg)` : "none",
          }}
        >
          {heading !== null && heading !== undefined ? (
            <Navigation
              size={18}
              style={{ color: theme.primaryColor, fill: theme.primaryColor }}
            />
          ) : (
            <Bike size={20} style={{ color: theme.primaryColor }} />
          )}
        </div>

        {/* 4. Mini Corner State Badge */}
        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white shadow-xs border border-white"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {isBusy && <Package size={10} className="stroke-[2.5]" />}
          {isAvailable && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          {isStale && <WifiOff size={9} className="stroke-[2.5]" />}
          {isOffDuty && <Moon size={9} className="stroke-[2.5]" />}
        </div>
      </div>

      {/* 5. Floating Rider Name Tag Pill */}
      <div
        className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded-md text-[10px] font-extrabold shadow-md border flex items-center gap-1 transition-all"
        style={{
          backgroundColor: isSelected ? "#0F172A" : "rgba(15, 23, 42, 0.85)",
          color: "#FFFFFF",
          borderColor: isSelected ? theme.primaryColor : "rgba(255, 255, 255, 0.2)",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: theme.primaryColor }}
        />
        <span className="truncate max-w-[70px]">{firstName}</span>
        {isBusy && <span className="text-amber-300 text-[9px]">● #{rider.activeOrdersCount}</span>}
      </div>
    </div>
  );
};

export default function LiveFleetMap({
  riders,
  center = { lat: 6.671, lng: 124.6644 },
  selectedRiderId,
  onSelectRider,
  hideOffline = false,
  filterStatus = "ALL",
  routeGeometry = null,
  routeStops = [],
  routeDestination = null,
}: LiveFleetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<{ [key: string]: { marker: google.maps.marker.AdvancedMarkerElement; root: Root } }>({});
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const routeMarkersRef = useRef<google.maps.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const markerLibraryRef = useRef<any>(null);

  // Draws the selected errand's road-network route: the decoded polyline plus
  // numbered store stops and the delivery destination. Rebuilt whenever the
  // selection changes, and fully torn down when nothing is selected so a stale
  // route can never linger over a different errand.
  useEffect(() => {
    if (!isMapLoaded || !mapInstance.current) return;
    const g = (window as any).google;
    if (!g?.maps) return;

    routePolylineRef.current?.setMap(null);
    routePolylineRef.current = null;
    routeMarkersRef.current.forEach((marker) => marker.setMap(null));
    routeMarkersRef.current = [];

    if (!routeGeometry) return;

    const path = decodePolyline(routeGeometry);
    if (path.length < 2) return;

    routePolylineRef.current = new g.maps.Polyline({
      path,
      map: mapInstance.current,
      strokeColor: "#1E3A5F",
      strokeOpacity: 0.85,
      strokeWeight: 4,
    });

    routeStops.forEach((stop, index) => {
      routeMarkersRef.current.push(
        new g.maps.Marker({
          position: { lat: Number(stop.latitude), lng: Number(stop.longitude) },
          map: mapInstance.current,
          title: `Stop ${index + 1}: ${stop.storeName}`,
          label: { text: String(index + 1), color: "#FFFFFF", fontWeight: "700" },
        })
      );
    });

    if (routeDestination) {
      routeMarkersRef.current.push(
        new g.maps.Marker({
          position: {
            lat: Number(routeDestination.latitude),
            lng: Number(routeDestination.longitude),
          },
          map: mapInstance.current,
          title: "Delivery destination",
        })
      );
    }
  }, [isMapLoaded, routeGeometry, routeStops, routeDestination]);

  // Filter riders based on visibility criteria
  const visibleRiders = riders.filter((r) => {
    if (!r.plottableLocation) return false;
    if (hideOffline && r.presence === "OFF_DUTY") return false;
    if (filterStatus !== "ALL" && r.presence !== filterStatus) return false;
    return true;
  });

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      try {
        const [{ Map }, markerLibrary] = await Promise.all([
          importGoogleMapsLibrary("maps"),
          importGoogleMapsLibrary("marker"),
        ]);

        markerLibraryRef.current = markerLibrary;
        if (!mapRef.current || !isMounted) return;

        mapInstance.current = new Map(mapRef.current, {
          center,
          zoom: 14,
          // AdvancedMarkerElement requires a Map ID. "DEMO_MAP_ID" is Google's
          // placeholder: it renders, but silently ignores cloud styling and is
          // rate-limited. Set VITE_GOOGLE_MAP_ID to a real one from the Google
          // Cloud console; the placeholder stays as a fallback so a missing env
          // var degrades rather than breaking the map outright.
          mapId: (import.meta as any).env?.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID",
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: false,
          streetViewControl: false,
        });

        setIsMapLoaded(true);
      } catch (err) {
        console.error("Failed to load Google Maps:", err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      Object.values(markersRef.current).forEach(({ marker, root }) => {
        marker.map = null;
        root.unmount();
      });
      markersRef.current = {};
    };
  }, []);

  // Update Markers when riders list, selectedRiderId, or filters change
  useEffect(() => {
    if (!isMapLoaded || !mapInstance.current || !markerLibraryRef.current) return;

    const { AdvancedMarkerElement } = markerLibraryRef.current;
    const plottableIds = new Set<string>();

    visibleRiders.forEach((rider) => {
      const idStr = String(rider.id);
      plottableIds.add(idStr);

      const position = {
        lat: rider.plottableLocation!.lat,
        lng: rider.plottableLocation!.lng,
      };

      const isSelected = selectedRiderId === rider.id;

      if (markersRef.current[idStr]) {
        // Update position
        markersRef.current[idStr].marker.position = position;
        markersRef.current[idStr].marker.zIndex = isSelected ? 999 : 10;
        // Re-render React root content
        markersRef.current[idStr].root.render(
          <CustomRiderMarkerPin
            rider={rider}
            isSelected={isSelected}
            onClick={() => onSelectRider?.(rider.id)}
          />
        );
      } else {
        // Create new AdvancedMarkerElement with React Root container
        const markerContainer = document.createElement("div");
        markerContainer.className = "rider-marker-wrapper";

        const root = createRoot(markerContainer);
        root.render(
          <CustomRiderMarkerPin
            rider={rider}
            isSelected={isSelected}
            onClick={() => onSelectRider?.(rider.id)}
          />
        );

        const marker = new AdvancedMarkerElement({
          map: mapInstance.current,
          position,
          content: markerContainer,
          title: rider.name,
          zIndex: isSelected ? 999 : 10,
        });

        markersRef.current[idStr] = { marker, root };
      }
    });

    // Cleanup markers that are no longer visible or plottable
    Object.keys(markersRef.current).forEach((idStr) => {
      if (!plottableIds.has(idStr)) {
        markersRef.current[idStr].marker.map = null;
        markersRef.current[idStr].root.unmount();
        delete markersRef.current[idStr];
      }
    });
  }, [visibleRiders, isMapLoaded, selectedRiderId, onSelectRider]);

  // Smooth Camera Panning when a rider is selected in sidebar
  useEffect(() => {
    if (!isMapLoaded || !mapInstance.current || selectedRiderId === null || selectedRiderId === undefined) return;
    const selected = riders.find((r) => r.id === selectedRiderId);
    if (selected && selected.plottableLocation) {
      mapInstance.current.panTo({
        lat: selected.plottableLocation.lat,
        lng: selected.plottableLocation.lng,
      });
      if (mapInstance.current.getZoom()! < 15) {
        mapInstance.current.setZoom(16);
      }
    }
  }, [selectedRiderId, isMapLoaded, riders]);

  // Fit all active pins to screen boundary
  const handleFitBounds = useCallback(() => {
    if (!mapInstance.current || visibleRiders.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    visibleRiders.forEach((r) => {
      if (r.plottableLocation) {
        bounds.extend({ lat: r.plottableLocation.lat, lng: r.plottableLocation.lng });
      }
    });
    mapInstance.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [visibleRiders]);

  const activeReadyCount = riders.filter((r) => r.presence === "AVAILABLE").length;
  const activeBusyCount = riders.filter((r) => r.presence === "BUSY").length;

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
      <div ref={mapRef} className="w-full h-full bg-slate-100" />

      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-xs z-30">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600"></div>
            <p className="text-xs font-bold text-slate-600">Loading Live Fleet Map...</p>
          </div>
        </div>
      )}

      {/* Floating Status & Controls Bar */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        {/* Re-center / Fit Bounds Button */}
        <button
          onClick={handleFitBounds}
          title="Fit all riders on map"
          className="h-9 px-3 bg-white/95 hover:bg-white text-slate-700 text-xs font-bold rounded-xl shadow-md border border-slate-200 flex items-center gap-1.5 transition active:scale-95"
        >
          <Target size={15} className="text-blue-600" />
          <span className="hidden sm:inline">Fit All</span>
        </button>

        {/* Live Active Pill */}
        <div className="bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl shadow-md border border-slate-200 text-xs font-extrabold text-slate-800 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>
            {activeReadyCount} Ready • {activeBusyCount} Busy
          </span>
        </div>
      </div>
    </div>
  );
}
