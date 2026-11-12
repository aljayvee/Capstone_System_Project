import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Loader2, Map as MapIcon } from "lucide-react";
import {
  loadGoogleMapsScript,
  importGoogleMapsLibrary,
  onGoogleMapsStatus,
  type GoogleMapsStatus,
} from "../utils/loadGoogleMaps";
import { GOOGLE_MAP_ID, canUseAdvancedMarkers } from "../utils/googleMapId";
import { TACURONG_CENTER } from "../constants/serviceArea";

/**
 * A read-only map of verified places.
 *
 * Deliberately not an editor. There is no click-to-drop, no draggable marker
 * and no form — the owner's place editor already exists in PlacesTab, and
 * mixing the two would make it possible to move a store's ground truth by
 * misclicking while browsing a category. Panning and zooming stay enabled,
 * because those are ways of reading a map, not editing one.
 */

export interface MiniMapPlace {
  id: string;
  name: string;
  address?: string;
  barangay?: string | null;
  latitude: number;
  longitude: number;
  isActive?: boolean;
}

interface PlacesMiniMapProps {
  places: MiniMapPlace[];
  /** Tailwind height classes. Kept a prop so callers control their own layout. */
  heightClass?: string;
  /** Highlighted and centred on when set — used when a row is hovered. */
  focusId?: string | null;
}

const ACTIVE = { fill: "#059669", stroke: "#065F46" };
const RETIRED = { fill: "#94A3B8", stroke: "#64748B" };

/** A classic-Marker icon, since a map with no Map ID cannot draw Advanced Markers. */
function pinIcon(g: any, active: boolean, focused: boolean) {
  const c = active ? ACTIVE : RETIRED;
  return {
    path: "M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z",
    fillColor: c.fill,
    fillOpacity: 1,
    strokeColor: focused ? "#1E3A5F" : c.stroke,
    strokeWeight: focused ? 3 : 1.5,
    scale: focused ? 0.85 : 0.62,
    anchor: new g.maps.Point(0, 0),
  };
}

export function PlacesMiniMap({
  places,
  heightClass = "h-56",
  focusId = null,
}: PlacesMiniMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoRef = useRef<any>(null);

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mapsStatus, setMapsStatus] = useState<GoogleMapsStatus>("ok");
  // Assigning a ref does not re-render, so the marker effect below would run
  // once against a null map and never again. This is what makes it re-run.
  const [mapReady, setMapReady] = useState(false);

  const mapUnavailable = mapsStatus !== "ok";

  useEffect(() => onGoogleMapsStatus(setMapsStatus), []);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setScriptLoaded(true))
      .catch((err) => console.warn("Google Maps script load failed:", err));
  }, []);

  // ── create the map once ──────────────────────────────────────────────────
  useEffect(() => {
    if (!scriptLoaded || mapUnavailable) return;
    let cancelled = false;

    (async () => {
      try {
        const mapsLib = await importGoogleMapsLibrary("maps");
        if (cancelled || !hostRef.current || mapRef.current) return;

        const MapClass = mapsLib?.Map || (window as any).google?.maps?.Map;
        if (!MapClass) return;

        const options: any = {
          center: { lat: TACURONG_CENTER.lat, lng: TACURONG_CENTER.lng },
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          // Fullscreen stays ON deliberately. "View only" is about not being
          // able to CHANGE anything, not about seeing less - and a 256px strip
          // is a poor way to judge whether a category's coverage has a hole in
          // it. Panning, zooming and fullscreen are all ways of reading a map.
          fullscreenControl: true,
          // Google's own POI pins stay unclickable, so the only thing that
          // responds to a click is one of our stores.
          clickableIcons: false,
        };
        if (GOOGLE_MAP_ID) options.mapId = GOOGLE_MAP_ID;

        mapRef.current = new MapClass(hostRef.current, options);
        setMapReady(true);
      } catch (err) {
        console.warn("Places map initialisation failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scriptLoaded, mapUnavailable]);

  // ── draw the pins ────────────────────────────────────────────────────────
  useEffect(() => {
    const g = (window as any).google;
    if (!mapReady || !mapRef.current || !g?.maps) return;

    markersRef.current.forEach((m) => {
      if (m.setMap) m.setMap(null);
      else m.map = null;
    });
    markersRef.current = [];
    if (!infoRef.current) infoRef.current = new g.maps.InfoWindow();

    const bounds = new g.maps.LatLngBounds();
    let plotted = 0;

    places.forEach((place) => {
      const lat = Number(place.latitude);
      const lng = Number(place.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const position = { lat, lng };
      const active = place.isActive !== false;
      const focused = focusId === place.id;
      let marker: any;

      if (canUseAdvancedMarkers(g)) {
        marker = new g.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position,
          title: place.name,
          content: new g.maps.marker.PinElement({
            background: active ? ACTIVE.fill : RETIRED.fill,
            borderColor: focused ? "#1E3A5F" : active ? ACTIVE.stroke : RETIRED.stroke,
            glyphColor: "#FFFFFF",
            scale: focused ? 1.2 : 1,
          }).element,
        });
      } else {
        marker = new g.maps.Marker({
          map: mapRef.current,
          position,
          title: place.name,
          icon: pinIcon(g, active, focused),
          zIndex: focused ? 999 : undefined,
        });
      }

      const detail = [place.barangay, place.address].filter(Boolean).join(" · ");
      marker.addListener(
        canUseAdvancedMarkers(g) ? "gmp-click" : "click",
        () => {
          infoRef.current.setContent(
            `<div style="font-size:12px;color:#0F172A;padding:1px 2px;max-width:220px;">
               <div style="font-weight:800;">${place.name}</div>
               ${detail ? `<div style="color:#64748B;margin-top:2px;">${detail}</div>` : ""}
               ${active ? "" : `<div style="color:#94A3B8;margin-top:2px;font-weight:700;">Retired</div>`}
             </div>`
          );
          infoRef.current.open(mapRef.current, marker);
        }
      );

      markersRef.current.push(marker);
      bounds.extend(position);
      plotted += 1;
    });

    if (plotted === 0) return;
    if (plotted === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(16);
    } else {
      mapRef.current.fitBounds(bounds, 40);
    }
  }, [places, mapReady, focusId]);

  // Recentre when a row is hovered, without refitting the whole view.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !focusId) return;
    const place = places.find((p) => p.id === focusId);
    if (!place) return;
    const lat = Number(place.latitude);
    const lng = Number(place.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) mapRef.current.panTo({ lat, lng });
  }, [focusId, places, mapReady]);

  if (mapUnavailable) {
    return (
      <div
        className={`${heightClass} rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-center px-4`}
      >
        <div className="text-center max-w-xs">
          <MapIcon size={20} className="text-amber-700 mx-auto" />
          <p className="text-xs font-extrabold text-amber-900 mt-1.5 mb-0">
            The map isn&rsquo;t available right now
          </p>
          <p className="text-[11px] text-amber-900/80 mt-1 mb-0 leading-relaxed">
            Every store is still listed — switch back to the list to see them.
          </p>
          <p className="text-[10px] font-mono text-amber-900/60 mt-2 mb-0">
            {mapsStatus === "no-key" ? "Tell your admin: map key missing" : "Tell your admin: map key rejected"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${heightClass} rounded-xl overflow-hidden border border-slate-200 bg-slate-100`}>
      <div ref={hostRef} className="w-full h-full" />
      {!mapReady && (
        <div className="absolute inset-0 grid place-items-center bg-slate-50/80 text-slate-400 text-[11px] font-medium gap-2">
          <Loader2 size={16} className="animate-spin" />
          Loading the map…
        </div>
      )}
    </div>
  );
}
