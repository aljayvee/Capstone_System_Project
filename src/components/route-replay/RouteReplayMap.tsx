import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Map as MapIcon } from "lucide-react";
import {
  loadGoogleMapsScript,
  importGoogleMapsLibrary,
  onGoogleMapsStatus,
  type GoogleMapsStatus,
} from "../../utils/loadGoogleMaps";
import { GOOGLE_MAP_ID } from "../../utils/googleMapId";
import { decodePolyline } from "../../utils/polyline";
import { TACURONG_CENTER } from "../../constants/serviceArea";
import type { ApiRouteReplay } from "../../services/apiService";
import { positionAt, segmentsOf, type ReplayPoint } from "./replayModel";

/**
 * The map half of the route replay.
 *
 * Classic markers and shapes only, never Advanced Markers: those need a Map ID
 * and draw nothing without one (see utils/googleMapId.ts), and a replay that
 * silently shows no readings would read as "the rider was never there".
 *
 * Drawn in two layers so playback stays cheap. The static layer (route, stops,
 * door, every reading, gaps) is built once per replay. The moving layer is one
 * "travelled" line per segment plus the rider marker, and playback only calls
 * setPath / setPosition on those.
 */

/** One colour per rider in the trail; a reassigned errand has two. No purple. */
export const RIDER_COLORS = ["#1E3A5F", "#0E7490", "#475569"];
export const riderColor = (index: number) => RIDER_COLORS[Math.max(0, index) % RIDER_COLORS.length];

const PRICED_ROUTE = "#94A3B8";
const STOP_INK = "#0B132B";
const DOOR_RED = "#E53935";
const NOT_SNAPPED = "#B45309";

interface RouteReplayMapProps {
  replay: ApiRouteReplay;
  points: ReplayPoint[];
  currentTime: number;
  /** Changes whenever the map should centre on a place (a jump to an event). */
  panTarget?: { lat: number; lng: number; key: number } | null;
  /** A reading was clicked: move the playhead to it. */
  onSeek?: (t: number) => void;
  heightClass?: string;
}

const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });

export function RouteReplayMap({
  replay,
  points,
  currentTime,
  panTarget = null,
  onSeek,
  heightClass = "h-80",
}: RouteReplayMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const staticRef = useRef<any[]>([]);
  const travelledRef = useRef<any[]>([]);
  const riderMarkerRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mapsStatus, setMapsStatus] = useState<GoogleMapsStatus>("ok");
  const [mapReady, setMapReady] = useState(false);
  const mapUnavailable = mapsStatus !== "ok";

  const { segments, gaps } = useMemo(() => segmentsOf(points), [points]);
  const riderIndex = useMemo(() => {
    const ids: Array<number | null> = [];
    for (const point of points) if (!ids.includes(point.riderId)) ids.push(point.riderId);
    return (id: number | null) => ids.indexOf(id);
  }, [points]);

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
          fullscreenControl: true,
          clickableIcons: false,
        };
        if (GOOGLE_MAP_ID) options.mapId = GOOGLE_MAP_ID;
        mapRef.current = new MapClass(hostRef.current, options);
        setMapReady(true);
      } catch (err) {
        console.warn("Route replay map initialisation failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scriptLoaded, mapUnavailable]);

  // ── static layer: built once per replay ──────────────────────────────────
  useEffect(() => {
    const g = (window as any).google;
    const map = mapRef.current;
    if (!mapReady || !map || !g?.maps) return;

    const clear = (list: any[]) => list.forEach((o) => o?.setMap?.(null));
    clear(staticRef.current);
    clear(travelledRef.current);
    staticRef.current = [];
    travelledRef.current = [];
    if (!infoRef.current) infoRef.current = new g.maps.InfoWindow();

    const add = <T,>(o: T) => {
      staticRef.current.push(o);
      return o;
    };
    const bounds = new g.maps.LatLngBounds();
    let plotted = 0;
    const extend = (lat: number, lng: number) => {
      bounds.extend({ lat, lng });
      plotted += 1;
    };

    // The route the fare was priced on, faint, so leaving it is visible.
    if (replay.errand?.routeGeometry) {
      try {
        const path = decodePolyline(replay.errand.routeGeometry);
        if (path.length > 1) {
          add(new g.maps.Polyline({ map, path, strokeColor: PRICED_ROUTE, strokeOpacity: 0.55, strokeWeight: 5, zIndex: 1 }));
          path.forEach((p) => extend(p.lat, p.lng));
        }
      } catch (err) {
        console.warn("Could not decode the priced route:", err);
      }
    }

    // Each segment: the whole of it faint, and a travelled line on top that
    // playback grows.
    for (const segment of segments) {
      const color = riderColor(riderIndex(segment.riderId));
      const path = segment.points.map((p) => ({ lat: p.latitude, lng: p.longitude }));
      add(new g.maps.Polyline({ map, path, strokeColor: color, strokeOpacity: 0.28, strokeWeight: 3, zIndex: 2 }));
      travelledRef.current.push(
        new g.maps.Polyline({ map, path: [], strokeColor: color, strokeOpacity: 0.95, strokeWeight: 4, zIndex: 3 })
      );
    }

    // A silence is dashed: the rider went from here to there by a road the
    // trail does not show.
    for (const gap of gaps) {
      add(
        new g.maps.Polyline({
          map,
          path: [
            { lat: gap.from.latitude, lng: gap.from.longitude },
            { lat: gap.to.latitude, lng: gap.to.longitude },
          ],
          strokeOpacity: 0,
          zIndex: 2,
          icons: [
            {
              icon: { path: "M 0,-1 0,1", strokeOpacity: 0.7, strokeColor: "#64748B", scale: 3 },
              offset: "0",
              repeat: "12px",
            },
          ],
        })
      );
    }

    // Every reading as a dot: these, not the lines between them, are the
    // evidence. Hollow = sent late after a signal loss; amber edge = not
    // snapped to a road.
    points.forEach((point) => {
      const color = riderColor(riderIndex(point.riderId));
      const dot = add(
        new g.maps.Marker({
          map,
          position: { lat: point.latitude, lng: point.longitude },
          zIndex: 4,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 3.5,
            fillColor: color,
            fillOpacity: point.wasOffline ? 0 : 1,
            strokeColor: point.isMapMatched ? "#FFFFFF" : NOT_SNAPPED,
            strokeWeight: point.isMapMatched ? 1 : 2,
          },
        })
      );
      dot.addListener("click", () => {
        const facts = [
          fmtTime(point.t),
          point.accuracyMeters != null ? `accurate to ${Math.round(point.accuracyMeters)} m` : null,
          point.speedMps != null ? `${Math.round(point.speedMps * 3.6)} km/h` : null,
          point.isMapMatched ? "snapped to road" : "raw GPS, not snapped",
          point.wasOffline ? "sent late after a signal loss" : null,
        ].filter(Boolean);
        infoRef.current.setContent(
          `<div style="font-size:12px;color:#0F172A;max-width:220px;line-height:1.45">${facts.join("<br/>")}</div>`
        );
        infoRef.current.open(map, dot);
        onSeekRef.current?.(point.t);
      });
      extend(point.latitude, point.longitude);
    });

    // Stops, with the circle the geofence used.
    [...replay.stops]
      .sort((a, b) => a.sequence - b.sequence)
      .forEach((stop, i) => {
        add(
          new g.maps.Circle({
            map,
            center: { lat: stop.latitude, lng: stop.longitude },
            radius: stop.geofenceRadiusMeters || 75,
            strokeColor: STOP_INK,
            strokeOpacity: 0.6,
            strokeWeight: 1.5,
            fillColor: STOP_INK,
            fillOpacity: 0.06,
            clickable: false,
            zIndex: 1,
          })
        );
        add(
          new g.maps.Marker({
            map,
            position: { lat: stop.latitude, lng: stop.longitude },
            title: stop.storeName,
            zIndex: 5,
            label: { text: String(i + 1), color: "#FFFFFF", fontSize: "11px", fontWeight: "700" },
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: STOP_INK,
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
            },
          })
        );
        extend(stop.latitude, stop.longitude);
      });

    // The door.
    const doorLat = replay.errand?.deliveryLatitude;
    const doorLng = replay.errand?.deliveryLongitude;
    if (typeof doorLat === "number" && typeof doorLng === "number") {
      add(
        new g.maps.Marker({
          map,
          position: { lat: doorLat, lng: doorLng },
          title: "Delivery address",
          zIndex: 6,
          icon: {
            path: "M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z",
            fillColor: DOOR_RED,
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 1.5,
            scale: 0.8,
            anchor: new g.maps.Point(0, 0),
          },
        })
      );
      extend(doorLat, doorLng);
    }

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = new g.maps.Marker({ map, zIndex: 10, clickable: false });
    } else {
      riderMarkerRef.current.setMap(map);
    }

    if (plotted === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(16);
    } else if (plotted > 1) {
      map.fitBounds(bounds, 48);
    }
  }, [mapReady, replay, points, segments, gaps, riderIndex]);

  // ── moving layer: the travelled lines and the rider ──────────────────────
  useEffect(() => {
    const g = (window as any).google;
    if (!mapReady || !g?.maps) return;
    const position = positionAt(points, currentTime);

    segments.forEach((segment, i) => {
      const line = travelledRef.current[i];
      if (!line) return;
      const done = segment.points.filter((p) => p.t <= currentTime).map((p) => ({ lat: p.latitude, lng: p.longitude }));
      const last = segment.points[segment.points.length - 1];
      if (position?.moving && done.length > 0 && done.length < segment.points.length && currentTime < last.t) {
        done.push({ lat: position.lat, lng: position.lng });
      }
      line.setPath(done);
    });

    const marker = riderMarkerRef.current;
    if (!marker) return;
    if (!position || position.index === -1) {
      marker.setVisible(false);
      return;
    }
    const point = points[position.index];
    const color = riderColor(riderIndex(point.riderId));
    marker.setVisible(true);
    marker.setPosition({ lat: position.lat, lng: position.lng });
    marker.setIcon(
      position.headingDeg != null
        ? {
            path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            rotation: position.headingDeg,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
          }
        : {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 3,
          }
    );
  }, [mapReady, points, segments, currentTime, riderIndex]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !panTarget) return;
    mapRef.current.panTo({ lat: panTarget.lat, lng: panTarget.lng });
  }, [mapReady, panTarget]);

  // Shapes outlive the component unless removed.
  useEffect(
    () => () => {
      [...staticRef.current, ...travelledRef.current, riderMarkerRef.current].forEach((o) => o?.setMap?.(null));
      infoRef.current?.close?.();
    },
    []
  );

  if (mapUnavailable) {
    return (
      <div className={`${heightClass} rounded-lg border border-edge bg-board-ground grid place-items-center px-4`}>
        <div className="max-w-xs text-center">
          <MapIcon size={20} className="mx-auto text-ink-muted" aria-hidden="true" />
          <p className="mt-1.5 text-label font-semibold text-ink">The map is not available right now</p>
          <p className="mt-1 text-micro text-ink-muted">
            The timeline and the facts below still come from the stored trail.
          </p>
          <p className="mt-2 font-mono text-micro text-ink-muted">
            {mapsStatus === "no-key" ? "Tell your admin: map key missing" : "Tell your admin: map key rejected"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${heightClass} overflow-hidden rounded-lg border border-edge bg-board-ground`}>
      <div ref={hostRef} className="h-full w-full" />
      {!mapReady && (
        <div className="absolute inset-0 grid place-items-center bg-board-ground/80 text-micro text-ink-muted">
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Loading the map
          </span>
        </div>
      )}
    </div>
  );
}
