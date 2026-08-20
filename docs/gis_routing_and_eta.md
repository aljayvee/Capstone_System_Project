# GIS Routing, Location Tracking & Errand ETA

How the system reasons about roads, keeps tracking honest through Tacurong's
weak-signal areas, and estimates arrival for a *pasuyo* rather than a food
delivery.

---

## 1. Why this exists

Four defects motivated the work:

1. **Fare and map disagreed.** The server priced errands on straight-line
   Haversine distance while the customer's map drew the real road route from a
   different code path. Measured on real Tacurong POI pairs, road distance runs
   about **1.48x** straight-line — so every customer was quoted against a
   distance shorter than the route they could watch on their own screen.
2. **"Nearest rider" was fiction.** Dispatch ranked candidates against a
   hardcoded three-entry coordinate table keyed by database ids 3/4/5. Any other
   rider compared against a constant. Real GPS lived in Firebase, which the
   server could not read.
3. **ETA ignored the errand.** The only duration in the system was a routing
   engine's free-flow driving time, computed on the phone and never stored. It
   contained no allowance for the part of a Pabili that actually takes the time:
   hunting items through a supermarket, the checkout queue, a pharmacy counter.
4. **Nothing survived a signal drop.** Rider GPS writes went straight to
   Firebase and a failed write was gone. The customer app had no connectivity
   awareness at all, so a rider whose phone died twenty minutes ago still
   rendered as a confident "Live GPS" pin.

---

## 2. Data pipeline (QGIS to OSRM)

One OpenStreetMap extract of Tacurong City feeds the routing engine, the fare,
and the figures in the paper — so all three are provably the same data.

```
Geofabrik philippines-latest.osm.pbf
        |  osmium extract --bbox 124.60,6.62,124.73,6.74
        v
   tacurong.osm.pbf ------------+---------------------------+
        |  osrm-extract         |  QGIS road layer          |
        |  osrm-partition       |                           |
        |  osrm-customize       v                           v
        v                verified-places.geojson    tacurong-service-area.geojson
   osrm-routed           (scripts/exportPlacesGeoJson.ts)   |
        |                                                    |
        v                                                    v
   OSRM_BASE_URL  <--  server/src/lib/routing/      src/lib/serviceArea.ts
```

Build and calibration steps live in [`server/gis/README.md`](../server/gis/README.md).

The bounding box is shared with the dispatcher console's Places search
(`src/constants/serviceArea.ts`). Widening one without the other would let a
dispatcher pin a store the routing graph has no roads for.

---

## 3. Routing layer

`server/src/lib/routing/` — one Adapter per engine behind a single
`RoutingProvider` interface, selected by `ROUTING_PROVIDER_ORDER`:

| Provider | Role | `route` | `matrix` | `match` |
|---|---|---|---|---|
| `osrm` | Primary, self-hosted | yes | yes | yes |
| `google` | Hosted fallback (billed per request) | yes | yes | no |
| `haversine` | Terminal fallback, needs no network | yes | yes | no |

OSRM is primary because it is the only one that provides a **distance/duration
matrix** and **map matching** at no per-request cost — the two operations that
make real proximity dispatch and breadcrumb snapping affordable.

**Failure semantics.** An adapter *throws* when the provider itself is unhealthy
and *returns null* when the provider answered fine but has no result for that
input. Only a throw counts against the circuit breaker (3 consecutive failures,
open for 60 s, then one probe). Conflating the two would let a rider parked on an
unmapped private lot trip the OSRM breaker and disable routing for everyone.

**OSRM behaviours worth knowing** (each cost a debugging cycle):

- It speaks `longitude,latitude` — the opposite of the rest of the codebase.
- It serves `NoMatch` with HTTP **400** but `NoRoute` with HTTP **200**. Keying
  off HTTP status alone misclassifies a normal unmatchable trace as an outage.
- `/match` is capped by `--max-matching-size`; long traces are chunked
  automatically with a 2-point overlap.
- Its `confidence` field reads **0.000 even for a perfect match** unless
  timestamps are supplied. Thresholding on it would silently disable map matching
  entirely — snap *distance* (reject beyond 50 m) is the quality gate instead.

**Calibration.** `ROAD_DETOUR_FACTOR` and `FALLBACK_AVG_SPEED_KMH` feed the
offline fallback, which feeds fare calculation, so they are measured rather than
guessed: `npx tsx gis/calibrate.ts`. Current Tacurong values: **1.48** (range
1.42-1.66) and **25 km/h** (21-30). Pairs under 1 km are excluded as unstable —
two POIs 133 m apart measured 1.8 km by road around a one-way loop, a ratio of
13.6, which would badly skew the median.

---

## 4. Location tracking

### Ownership split

Live map pins stay in **Firebase RTDB** (`riders/{id}`), unchanged. The backend
receives a separate **low-rate, map-matched breadcrumb** (about one point a
minute, or on 100 m of movement) at `POST /api/errands/:id/track`, stored in
`errand_track_points`.

The two exist for different jobs. The live channel is ephemeral and needs
sub-5-second latency. The archive is durable and needs history: it is what dwell
learning trains on, what a disputed delivery is replayed from, and what dispatch
ranks riders by.

### Quality gate (enforced on both sides)

| Check | Threshold | Why |
|---|---|---|
| Accuracy | reject beyond 50 m | "Somewhere on this block" cannot tell which store a rider is in |
| Implied speed | reject beyond 30 m/s | Impossible on city streets — a cold-start or cell-tower fix |
| Timestamp order | reject at or before previous | A flushed backlog must not rewrite history |
| Stationary jitter | *hold* previous coordinate below 0.5 m/s and 15 m | Stops the customer watching the pin twitch around a car park |

The device filters to save battery and mobile data; the server repeats every
check because it cannot assume a well-behaved client.

### Store-and-forward

- `locationQueue.ts` — AsyncStorage ring buffer, 2000 points (about 3 hours),
  oldest dropped first. Every fix goes through the queue, online or not, so there
  is no second send path that could land points out of order.
- `actionQueue.ts` — lifecycle actions (`accept`, `items_purchased`, `status`)
  recorded with the moment they were performed. Replayed in order; a transient
  failure stops the flush so the sequence is never applied out of order.
- Idempotency: every point carries a device-generated `clientPointId`, unique per
  `(errandId, clientPointId)`. A batch retried after a timeout the server already
  committed is absorbed silently.
- Backfill: actions carry `occurredAt`, clamped to never exceed now. An action no
  longer legal on flush (the dispatcher cancelled while the rider was offline)
  returns 409 and is **surfaced to the rider**, never silently dropped.

---

## 5. ETA

```
ETA = road travel time
    + SUM(remaining dwell per stop)
    + handover (120 s)
```

The middle term is the whole point. A food delivery is travel plus a roughly
constant pickup. A pabili is dominated by the rider standing inside a shop, and
that varies by *what kind of shop it is*:

| Category | seeded P50 | seeded P80 |
|---|---|---|
| Supermarket & Grocery | 15 min | 30 min |
| Retail & General Merchandise | 10 min | 20 min |
| Food & Restaurant | 8 min | 15 min |
| Pharmacy & Health | 6 min | 12 min |

**It is a range, never a number.** P50 gives the optimistic end, P80 the
realistic one. Queue time has a long right tail, so a single point estimate is
wrong nearly always — and a *mean* is worse than a median, because a few
pathological waits drag it up until every ordinary errand is over-promised.

**It learns.** Every completed stop writes a `DwellObservation` (geofence entry
to exit, 75 m radius). `jobs/dwellLearning.ts` recomputes P50/P80 nightly from
the last 200 observations per category, requiring at least 10 samples before
overwriting a seeded default and clamping to 60-3600 s so one pathological
observation cannot poison a category.

**It degrades honestly.** A stop already reached costs only its *remaining*
dwell, floored at zero, so an overstaying rider never pulls the ETA backwards.
When the route is a fallback estimate or a category is still thin on data, only
the **upper** bound is padded (x1.25): the promise becomes more cautious, not
vaguer in both directions.

**A stall is explained, not hidden.** A rider inside a geofence longer than that
category's P80 emits `errand:stop_delayed` — *"Your rider is still at Gaisano
Grand. Stops like this usually take about 15 min."* On an errand, a rider
standing still for 25 minutes is the job working correctly, but from the
customer's side that is indistinguishable from a rider who has stopped caring
unless someone says so. This is the clearest place the pasuyo model differs from
food delivery.

---

## 6. Dispatch

`errandService.assignRider` tier 2, rewritten:

1. Candidates: role RIDER, account Active, **actually online**
   (`riderPresenceStore`), under the 3-task cap, not previously declined.
2. Positions from `riderPositionStore`, no older than 60 s — the same threshold
   the dashboard uses to paint a rider "signal lost", so the map and dispatch can
   never disagree about who is reachable.
3. Out-of-service-area candidates dropped (point-in-polygon).
4. One OSRM `/table` call ranks them by **travel time**, not straight-line
   distance: a rider 500 m away across the river is not the nearest rider.
5. If nobody has a fresh position, fall back to least-loaded — and **say so** in
   the log rather than pretending a proximity decision was made.

---

## 7. Event scoping

Every socket event used to be a global `io.emit` to every connected client,
authenticated or not. That was survivable while events carried errand metadata;
it is not once they carry a rider's live position.

Rooms are joined at connect from the verified JWT (`role:*`, `rider:{id}`,
`customer:{id}`), plus `errand:{id}` via `subscribe:errand`, authorised
server-side with the same ownership rules as `GET /errands/:id`. Location and ETA
events go only through `emitToErrand`. Verified end to end: an anonymous socket
and an unrelated customer receive nothing, while the errand's own customer and
staff receive the update.

---

## 8. Freshness, defined once

60 seconds, shared by `SIGNAL_LOST_THRESHOLD_MS` (web), `POSITION_FRESHNESS_MS`
(server), and `constants/tracking.ts` (CustomerApp). The rider a dispatcher sees
as "no signal", the rider excluded from proximity dispatch, and the rider a
customer sees as stale are always the same rider.

Customer-facing degradation: **LIVE** (under 15 s) solid pin and live ETA;
**STALE** (under 60 s) dimmed, with "Updated 45s ago"; **LOST** grey pin at the
last known position with *"Weak signal in this area — last seen 3 min ago"*.
Never a frozen pin presented as live, and never an error dialog: losing signal in
parts of Tacurong is ordinary and is not a failure of the delivery.
