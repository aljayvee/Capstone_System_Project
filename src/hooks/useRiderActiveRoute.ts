import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../services/apiClient";
import type { Errand } from "../types/errand";
import type { RiderFleetMember } from "./useRiderFleetPresence";

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
}

const NO_ROUTE: RiderActiveRoute = { routeGeometry: null, routeStops: [], routeDestination: null };

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
  return listRoute ?? route;
}
