import assert from "node:assert/strict";
import test from "node:test";
import type { ApiRouteReplay, ApiTrackPoint } from "../src/services/apiService.ts";
import {
  GAP_MS,
  formatDuration,
  formatMeters,
  indexAt,
  positionAt,
  preparePoints,
  segmentsOf,
  summaryOf,
  timeRange,
  timelineEvents,
} from "../src/components/route-replay/replayModel.ts";

const T0 = Date.parse("2026-11-20T02:00:00.000Z");
const at = (minutes: number) => new Date(T0 + minutes * 60000).toISOString();

function fix(minutes: number, lat: number, lng: number, extra: Partial<ApiTrackPoint> = {}): ApiTrackPoint {
  return {
    latitude: lat,
    longitude: lng,
    accuracyMeters: 8,
    speedMps: 5,
    headingDeg: null,
    recordedAt: at(minutes),
    receivedAt: at(minutes),
    isMapMatched: true,
    wasOffline: false,
    riderId: 11,
    ...extra,
  };
}

function replay(points: ApiTrackPoint[], over: Partial<ApiRouteReplay> = {}): ApiRouteReplay {
  return {
    errandId: "e1",
    points,
    truncated: false,
    errand: {
      referenceNo: "261120-00001-0001",
      status: "DELIVERED",
      acceptedAt: at(-2),
      deliveredAt: at(20),
      deliveryLatitude: 6.68,
      deliveryLongitude: 124.67,
      routeGeometry: null,
      etaPromisedHighAt: null,
    },
    stops: [],
    riders: [{ id: 11, name: "Rider One" }],
    nearestToDoorMeters: 35,
    ...over,
  };
}

test("preparePoints sorts by the phone's clock and drops unusable readings", () => {
  const points = preparePoints([
    fix(2, 6.672, 124.665),
    fix(0, 6.671, 124.664),
    { ...fix(1, 6.6715, 124.6645), recordedAt: "not a date" },
    { ...fix(3, Number.NaN, 124.666) },
  ]);
  assert.deepEqual(points.map((p) => p.recordedAt), [at(0), at(2)]);
});

test("segmentsOf splits at a silence longer than the gap limit and at a change of rider", () => {
  const points = preparePoints([
    fix(0, 6.671, 124.664),
    fix(1, 6.672, 124.665),
    fix(9, 6.673, 124.666), // 8 minutes of silence
    fix(10, 6.674, 124.667, { riderId: 12 }), // reassigned
  ]);
  const { segments, gaps } = segmentsOf(points);
  assert.equal(segments.length, 3);
  assert.deepEqual(segments.map((s) => s.points.length), [2, 1, 1]);
  assert.equal(gaps.length, 2);
  assert.deepEqual(gaps.map((g) => [g.minutes, g.riderChanged]), [[8, false], [1, true]]);
});

test("a step exactly at the gap limit is still one segment", () => {
  const points = preparePoints([fix(0, 6.671, 124.664), fix(GAP_MS / 60000, 6.672, 124.665)]);
  assert.equal(segmentsOf(points).segments.length, 1);
});

test("positionAt interpolates inside a step and holds through a gap", () => {
  const points = preparePoints([fix(0, 6.0, 124.0), fix(2, 6.002, 124.0), fix(12, 6.01, 124.0)]);

  const mid = positionAt(points, T0 + 60000)!;
  assert.equal(mid.index, 0);
  assert.equal(mid.moving, true);
  assert.ok(Math.abs(mid.lat - 6.001) < 1e-9);
  assert.ok(mid.headingDeg !== null && Math.abs(mid.headingDeg) < 1e-6, "due north");

  const inGap = positionAt(points, T0 + 5 * 60000)!;
  assert.equal(inGap.index, 1);
  assert.equal(inGap.moving, false);
  assert.equal(inGap.lat, 6.002);

  const before = positionAt(points, T0 - 60000)!;
  assert.equal(before.index, -1);
  assert.equal(before.moving, false);

  assert.equal(positionAt([], T0), null);
});

test("indexAt finds the last reading at or before a time", () => {
  const points = preparePoints([fix(0, 6, 124), fix(1, 6, 124), fix(2, 6, 124)]);
  assert.equal(indexAt(points, T0 - 1), -1);
  assert.equal(indexAt(points, T0), 0);
  assert.equal(indexAt(points, T0 + 90000), 1);
  assert.equal(indexAt(points, T0 + 10 * 60000), 2);
});

test("timelineEvents orders stops, gaps and delivery, arrival before departure on a tie", () => {
  const points = preparePoints([fix(0, 6.671, 124.664), fix(1, 6.672, 124.665), fix(15, 6.68, 124.67)]);
  const events = timelineEvents(
    replay(points, {
      stops: [
        {
          id: 5,
          storeName: "Store A",
          sequence: 1,
          latitude: 6.672,
          longitude: 124.665,
          arrivedAt: at(1),
          departedAt: at(1),
          geofenceRadiusMeters: 75,
        },
      ],
    }),
    points
  );
  assert.deepEqual(
    events.map((e) => e.kind),
    ["accepted", "first_fix", "arrived", "departed", "gap", "last_fix", "delivered"]
  );
  assert.equal(events.find((e) => e.kind === "gap")!.label, "No GPS for 14 min");
});

test("timelineEvents works for an older server that sends no errand or stops", () => {
  const points = preparePoints([fix(0, 6.671, 124.664)]);
  const events = timelineEvents(replay(points, { errand: null, stops: [], riders: [] }), points);
  assert.deepEqual(events.map((e) => e.kind), ["first_fix"]);
});

test("timeRange covers readings and events; an empty replay has none", () => {
  const points = preparePoints([fix(0, 6.671, 124.664), fix(5, 6.672, 124.665)]);
  const events = timelineEvents(replay(points), points);
  assert.deepEqual(timeRange(points, events), { start: T0 - 2 * 60000, end: T0 + 20 * 60000 });
  assert.equal(timeRange([], []), null);
});

test("summaryOf counts readings, road share, late readings, and leaves gaps out of the distance", () => {
  const points = preparePoints([
    fix(0, 6.0, 124.0),
    fix(1, 6.001, 124.0, { isMapMatched: false }),
    fix(20, 6.1, 124.0, { wasOffline: true }), // far away, after a gap: not counted as distance
  ]);
  const s = summaryOf(replay(points), points);
  assert.equal(s.count, 3);
  assert.ok(Math.abs((s.mapMatchedShare ?? 0) - 2 / 3) < 1e-9);
  assert.equal(s.offlineCount, 1);
  assert.equal(s.gapCount, 1);
  assert.ok(s.trailKm > 0.1 && s.trailKm < 0.12, `about 111 m, got ${s.trailKm}`);
  assert.equal(s.nearestToDoorMeters, 35);

  const empty = summaryOf(replay([]), []);
  assert.equal(empty.mapMatchedShare, null);
  assert.equal(empty.firstAt, null);
});

test("formatDuration and formatMeters", () => {
  assert.equal(formatDuration(7), "7 min");
  assert.equal(formatDuration(65), "1 h 5 min");
  assert.equal(formatDuration(120), "2 h");
  assert.equal(formatMeters(120.4), "120 m");
  assert.equal(formatMeters(1440), "1.4 km");
});
