import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../services/apiClient";
import type { Errand } from "../types/errand";
import { acquireFleetSocket, releaseFleetSocket, type RiderFleetMember } from "./useRiderFleetPresence";

/**
 * The road route of the errand a selected rider is working, shaped for
 * LiveFleetMap's route props.
 *
 * LiveFleetMap could always draw a route, but no screen ever handed it one, so
 * neither the owner nor the dispatcher map showed where a rider was headed.
 * This resolves it from the errand list a screen already holds (the dispatcher
 * portal), and otherwise fetches the one errand, once, and caches it (the owner
 * portal holds no errand list, and pulling the whole list over a slow link to
 * draw one line would be the wrong trade).
 *
 * Every failure resolves to "no route". The rider pins are the map's job; a
 * missing route line must never be able to break them.
 */
export interface RiderActiveRoute {
  routeGeometry: string | null;
  routeStops: Array<{ latitude: number; longitude: number; storeName: string }>;
  routeDestination: { latitude: number; longitude: number } | null;
  /**
   * ADDITIVE, 2026-11-10: the line the rider is following right now, as Sugo
   * Rider was given it, to their next store or the customer's door. Null when
   * there is none to show; the map then draws `routeGeometry` alone.
   */
  liveLine?: RiderLiveLine | null;
}

/** The line a rider's own app is following (server services/riderRouteService.ts). */
export interface RiderLiveLine {
  version: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
  distanceMeters: number;
  durationSeconds: number;
  /** When the rider last left a route to this stop and was given a new one, epoch ms. */
  reroutedAt: number | null;
}

const NO_ROUTE: RiderActiveRoute = { routeGeometry: null, routeStops: [], routeDestination: null };

/**
 * Asked again this often without a notice: a notice can be missed while the
 * socket reconnects, and the server forgets lines when it restarts. An
 * unchanged line is answered with `unchanged`, not resent.
 */
const LIVE_LINE_POLL_MS = 30 * 1000;

function toLiveLine(raw: any): RiderLiveLine | null {
  if (!raw || !Array.isArray(raw.coordinates)) return null;
  const coordinates = raw.coordinates
    .map((p: any) => ({ latitude: Number(p?.latitude), longitude: Number(p?.longitude) }))
    .filter((p: { latitude: number; longitude: number }) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
  if (coordinates.length < 2) return null;
  return {
    version: Number(raw.version) || 0,
    coordinates,
    distanceMeters: Number(raw.distanceMeters) || 0,
    durationSeconds: Number(raw.durationSeconds) || 0,
    reroutedAt: typeof raw.reroutedAt === "number" ? raw.reroutedAt : null,
  };
}

/**
 * "Rerouted 3 min ago", for the selected rider's card. Null when the rider has
 * not left their route to this stop, or did so long enough ago not to matter.
 */
export function describeReroute(reroutedAt: number | null | undefined, now: number = Date.now()): string | null {
  if (reroutedAt == null) return null;
  const minutes = Math.floor(Math.max(0, now - reroutedAt) / 60_000);
  if (minutes >= 30) return null;
  return minutes < 1 ? "Rerouted just now" : `Rerouted ${minutes} min ago`;
}

/**
 * The selected rider's live line, kept current by `rider:route` notices and a
 * slow poll. Staff only, as the endpoint is; a refusal resolves to no line.
 */
function useRiderLiveLine(riderId: number | null, onDelivery: boolean): RiderLiveLine | null {
  const [line, setLine] = useState<RiderLiveLine | null>(null);
  const versionRef = useRef<number | null>(null);

  useEffect(() => {
    versionRef.current = null;
    setLine(null);
    if (riderId == null || !onDelivery) return;

    let disposed = false;
    let inFlight: AbortController | null = null;

    const load = () => {
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;
      const params: Record<string, number> = { riderId };
      if (versionRef.current != null) params.since = versionRef.current;
      apiClient
        .get("/routing/rider-route", { params, signal: controller.signal })
        .then((response) => {
          if (disposed || controller.signal.aborted) return;
          const data = response.data ?? {};
          if (data.unchanged) return;
          const next = toLiveLine(data.route);
          versionRef.current = next ? next.version : null;
          setLine(next);
        })
        // The line on screen stays; the next notice or poll asks again.
        .catch(() => {});
    };

    const onNotice = (notice: { riderId?: number; version?: number } | null | undefined) => {
      if (Number(notice?.riderId) !== riderId) return;
      if (notice?.version != null && notice.version === versionRef.current) return;
      load();
    };

    load();
    const poll = window.setInterval(load, LIVE_LINE_POLL_MS);
    const socket = acquireFleetSocket();
    socket.on("rider:route", onNotice);
    socket.on("connect", load);

    return () => {
      disposed = true;
      inFlight?.abort();
      window.clearInterval(poll);
      socket.off("rider:route", onNotice);
      socket.off("connect", load);
      releaseFleetSocket();
    };
  }, [riderId, onDelivery]);

  return line;
}

/** A route is recomputed when fees are; a minute is fresh enough to draw. */
const FETCH_TTL_MS = 60 * 1000;

const FINISHED = new Set(["Delivered", "Completed", "Cancelled", "DELIVERED", "COMPLETED", "CANCELLED"]);

const fetched = new Map<string, { at: number; route: RiderActiveRoute }>();

function toRoute(errand: Partial<Errand> | null | undefined): RiderActiveRoute {
  if (!errand?.routeGeometry) return NO_ROUTE;
  const stops = [...(errand.pinpoints ?? [])]
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .filter((p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)))
    .map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude), storeName: p.storeName }));
  const lat = errand.deliveryLatitude;
  const lng = errand.deliveryLongitude;
  return {
    routeGeometry: errand.routeGeometry,
    routeStops: stops,
    routeDestination:
      lat != null && lng != null ? { latitude: Number(lat), longitude: Number(lng) } : null,
  };
}

export function useRiderActiveRoute(
  rider: RiderFleetMember | null | undefined,
  knownErrands?: Errand[]
): RiderActiveRoute {
  // The errand id comes from the rider's own telemetry. When that feed is
  // refused it is missing, so a screen holding the list falls back to the
  // errand assigned to this rider that is not finished yet.
  const fromList = rider
    ? knownErrands?.find((e) => e.id === rider.activeErrandId) ??
      knownErrands?.find((e) => String(e.riderId) === String(rider.id) && !FINISHED.has(String(e.status)))
    : undefined;
  const errandId = fromList?.id ?? rider?.activeErrandId ?? null;

  const [route, setRoute] = useState<RiderActiveRoute>(NO_ROUTE);

  useEffect(() => {
    if (fromList || !errandId || !rider || rider.presence !== "ON_DELIVERY") {
      setRoute(NO_ROUTE);
      return;
    }

    const cached = fetched.get(errandId);
    if (cached && Date.now() - cached.at < FETCH_TTL_MS) {
      setRoute(cached.route);
      return;
    }

    const controller = new AbortController();
    apiClient
      .get(`/errands/${encodeURIComponent(errandId)}`, { signal: controller.signal })
      .then((response) => {
        const next = toRoute(response.data as Partial<Errand>);
        fetched.set(errandId, { at: Date.now(), route: next });
        setRoute(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRoute(NO_ROUTE);
      });
    return () => controller.abort();
    // `fromList` is derived from these; listing it would refire on every roster poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errandId, rider?.id, rider?.presence, Boolean(fromList)]);

  // Memoized on the errand object, so the map redraws its route when the
  // errand changes and not on every roster poll or position flush.
  const listRoute = useMemo(() => (fromList ? toRoute(fromList) : null), [fromList]);
  const liveLine = useRiderLiveLine(rider?.id ?? null, rider?.presence === "ON_DELIVERY");
  const planned = listRoute ?? route;
  return useMemo(() => ({ ...planned, liveLine }), [planned, liveLine]);
}
