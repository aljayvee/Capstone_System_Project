import type { ApiRouteReplay, ApiTrackPoint } from "../../services/apiService";

/**
 * The arithmetic behind the route replay, kept free of React and Google Maps so
 * node:test can check it.
 *
 * The trail is sparse on purpose: the rider app stores one reading every 60 s
 * or every 100 m. So the model is honest about what lies between two readings.
 * Inside an ordinary step it interpolates, because the rider was plainly
 * moving from one to the next. Across a long silence or a change of rider it
 * does not, because a straight line there would draw a path nobody drove.
 */

/** A silence longer than this is a gap: drawn dashed, never interpolated. */
export const GAP_MS = 3 * 60 * 1000;

export interface ReplayPoint extends ApiTrackPoint {
  /** recordedAt in epoch milliseconds. */
  t: number;
}

export interface ReplayGap {
  from: ReplayPoint;
  to: ReplayPoint;
  minutes: number;
  /** The next reading belongs to another rider (the errand was reassigned). */
  riderChanged: boolean;
}

export interface ReplaySegment {
  riderId: number | null;
  points: ReplayPoint[];
}

export type ReplayEventKind = "accepted" | "first_fix" | "arrived" | "departed" | "gap" | "delivered" | "last_fix";

export interface ReplayEvent {
  kind: ReplayEventKind;
  at: number;
  label: string;
  stopId?: number;
}

export interface ReplayPosition {
  /** The last reading at or before the time, or -1 before the first one. */
  index: number;
  lat: number;
  lng: number;
  headingDeg: number | null;
  /** False while held at a reading through a gap, or before the trail starts. */
  moving: boolean;
}

export interface ReplaySummary {
  count: number;
  firstAt: number | null;
  lastAt: number | null;
  /** 0..1, or null for an empty trail. */
  mapMatchedShare: number | null;
  offlineCount: number;
  gapCount: number;
  /** Distance along the readings, gaps excluded. */
  trailKm: number;
  nearestToDoorMeters: number | null;
}

const toMs = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

/** Readings with a usable time, oldest first. The server orders them; this does not rely on it. */
export function preparePoints(points: ApiTrackPoint[]): ReplayPoint[] {
  const out: ReplayPoint[] = [];
  for (const point of points) {
    const t = toMs(point.recordedAt);
    if (t === null) continue;
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) continue;
    out.push({ ...point, t });
  }
  return out.sort((a, b) => a.t - b.t);
}

const breaksBetween = (a: ReplayPoint, b: ReplayPoint) => b.t - a.t > GAP_MS || a.riderId !== b.riderId;

/** Splits the trail at long silences and at a change of rider. */
export function segmentsOf(points: ReplayPoint[]): { segments: ReplaySegment[]; gaps: ReplayGap[] } {
  const segments: ReplaySegment[] = [];
  const gaps: ReplayGap[] = [];
  let current: ReplaySegment | null = null;

  points.forEach((point, i) => {
    const previous = i > 0 ? points[i - 1] : null;
    if (!current || (previous && breaksBetween(previous, point))) {
      if (current && previous) {
        gaps.push({
          from: previous,
          to: point,
          minutes: Math.round((point.t - previous.t) / 60000),
          riderChanged: previous.riderId !== point.riderId,
        });
      }
      current = { riderId: point.riderId, points: [] };
      segments.push(current);
    }
    current.points.push(point);
  });

  return { segments, gaps };
}

/** Index of the last reading at or before t (binary search), or -1. */
export function indexAt(points: ReplayPoint[], t: number): number {
  let lo = 0;
  let hi = points.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** Where the rider marker sits at time t. Null for an empty trail. */
export function positionAt(points: ReplayPoint[], t: number): ReplayPosition | null {
  if (points.length === 0) return null;
  const index = indexAt(points, t);
  if (index === -1) {
    const first = points[0];
    return { index: -1, lat: first.latitude, lng: first.longitude, headingDeg: first.headingDeg, moving: false };
  }
  const here = points[index];
  const next = points[index + 1];
  if (!next || breaksBetween(here, next) || next.t === here.t) {
    return { index, lat: here.latitude, lng: here.longitude, headingDeg: here.headingDeg, moving: false };
  }
  const f = Math.min(1, Math.max(0, (t - here.t) / (next.t - here.t)));
  return {
    index,
    lat: here.latitude + (next.latitude - here.latitude) * f,
    lng: here.longitude + (next.longitude - here.longitude) * f,
    headingDeg: bearingDeg(here, next) ?? here.headingDeg,
    moving: true,
  };
}

/** Compass bearing from a to b, or null when they are the same place. */
export function bearingDeg(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number | null {
  if (a.latitude === b.latitude && a.longitude === b.longitude) return null;
  const rad = Math.PI / 180;
  const lat1 = a.latitude * rad;
  const lat2 = b.latitude * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) / rad) + 360) % 360;
}

export function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "7 min", "1 h 5 min". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** Everything worth jumping to, oldest first. */
export function timelineEvents(replay: ApiRouteReplay, points: ReplayPoint[]): ReplayEvent[] {
  const events: ReplayEvent[] = [];
  const push = (kind: ReplayEventKind, at: number | null, label: string, stopId?: number) => {
    if (at !== null) events.push({ kind, at, label, ...(stopId !== undefined ? { stopId } : {}) });
  };

  push("accepted", toMs(replay.errand?.acceptedAt), "Rider accepted");
  if (points.length > 0) push("first_fix", points[0].t, "First GPS reading");

  const stops = [...replay.stops].sort((a, b) => a.sequence - b.sequence);
  for (const stop of stops) {
    push("arrived", toMs(stop.arrivedAt), `Arrived at ${stop.storeName}`, stop.id);
    push("departed", toMs(stop.departedAt), `Left ${stop.storeName}`, stop.id);
  }

  for (const gap of segmentsOf(points).gaps) {
    push(
      "gap",
      gap.from.t,
      gap.riderChanged ? "Errand passed to another rider" : `No GPS for ${formatDuration(gap.minutes)}`
    );
  }

  push("delivered", toMs(replay.errand?.deliveredAt), "Marked delivered");
  if (points.length > 1) push("last_fix", points[points.length - 1].t, "Last GPS reading");

  // Stable on ties, in the order pushed: a stop's arrival before its departure.
  return events.map((e, i) => ({ e, i })).sort((a, b) => a.e.at - b.e.at || a.i - b.i).map(({ e }) => e);
}

/** The span the scrubber covers: every reading and every event. Null when there is nothing. */
export function timeRange(points: ReplayPoint[], events: ReplayEvent[]): { start: number; end: number } | null {
  const times = [...points.map((p) => p.t), ...events.map((e) => e.at)];
  if (times.length === 0) return null;
  return { start: Math.min(...times), end: Math.max(...times) };
}

export function summaryOf(replay: ApiRouteReplay, points: ReplayPoint[]): ReplaySummary {
  const { segments, gaps } = segmentsOf(points);
  let meters = 0;
  for (const segment of segments) {
    for (let i = 1; i < segment.points.length; i += 1) {
      meters += haversineMeters(segment.points[i - 1], segment.points[i]);
    }
  }
  return {
    count: points.length,
    firstAt: points.length ? points[0].t : null,
    lastAt: points.length ? points[points.length - 1].t : null,
    mapMatchedShare: points.length ? points.filter((p) => p.isMapMatched).length / points.length : null,
    offlineCount: points.filter((p) => p.wasOffline).length,
    gapCount: gaps.filter((g) => !g.riderChanged).length,
    trailKm: meters / 1000,
    nearestToDoorMeters: replay.nearestToDoorMeters,
  };
}

/** "120 m", "1.4 km". */
export function formatMeters(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}
