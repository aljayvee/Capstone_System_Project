import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarkerTween, distanceMetres, tweenDuration } from '../src/components/markerTween.ts';

interface RafDriver {
  raf: (cb: FrameRequestCallback) => number;
  cancelRaf: (id: number) => void;
  now: () => number;
  advanceTo: (ms: number) => void;
  pendingCount: () => number;
}

function createRafDriver(startMs = 1000): RafDriver {
  let nowMs = startMs;
  let nextId = 1;
  const queue = new Map<number, FrameRequestCallback>();

  return {
    raf(cb) {
      const id = nextId++;
      queue.set(id, cb);
      return id;
    },
    cancelRaf(id) {
      queue.delete(id);
    },
    now: () => nowMs,
    advanceTo(ms) {
      nowMs = ms;
      const entries = Array.from(queue.entries());
      queue.clear();
      for (const [, cb] of entries) {
        cb(nowMs);
      }
    },
    pendingCount: () => queue.size,
  };
}

test('EMA interval matching adapts tween duration across update cadences', () => {
  const driver = createRafDriver(10_000);
  const marker = { position: { lat: 6.69, lng: 124.67 } };
  const tween = createMarkerTween(marker, { lat: 6.69, lng: 124.67 }, driver.raf, driver.cancelRaf, driver.now);

  // Feed slower 2000ms fixes repeatedly so EMA climbs above default 1100ms
  tween.moveTo({ lat: 6.6902, lng: 124.67 }, { recordedAt: 10_000, speedMps: 5 });
  tween.moveTo({ lat: 6.6904, lng: 124.67 }, { recordedAt: 12_000, speedMps: 5 });
  tween.moveTo({ lat: 6.6906, lng: 124.67 }, { recordedAt: 14_000, speedMps: 5 });
  tween.moveTo({ lat: 6.6908, lng: 124.67 }, { recordedAt: 16_000, speedMps: 5 });

  // EMA starts at 1100; after three 2000ms gaps:
  // 1) 0.65*1100 + 0.35*2000 = 1415
  // 2) 0.65*1415 + 0.35*2000 = 1619.75
  // 3) 0.65*1619.75 + 0.35*2000 = 1752.8375
  // Duration = 1752.8375 * 1.12 = ~1963ms. At t + 1100ms it is ~56% through [6.69 -> 6.6908].
  driver.advanceTo(driver.now() + 1100);
  assert.ok(marker.position.lat > 6.6904 && marker.position.lat < 6.6905, `expected ~56% mid-flight lat, got ${marker.position.lat}`);
  assert.ok(driver.pendingCount() > 0, 'tween should still be animating past 1100ms under 2000ms EMA');

  // Verify tweenDuration clamps properly at bounds
  assert.equal(tweenDuration(0, 1500), 450);
  assert.ok(tweenDuration(10, 500) >= 850);
  assert.ok(tweenDuration(10, 5000) <= 2600);
});

test('mid-flight retargeting interpolates cleanly from current rendered position without snapping back', () => {
  const driver = createRafDriver(0);
  const marker = { position: { lat: 6.69, lng: 124.67 } };
  const tween = createMarkerTween(marker, { lat: 6.69, lng: 124.67 }, driver.raf, driver.cancelRaf, driver.now);

  // Move north with 1100*1.12 = 1232ms duration (first fix keeps default EMA)
  tween.moveTo({ lat: 6.691, lng: 124.67 }, { recordedAt: 1000, speedMps: 8 });
  driver.advanceTo(616); // Halfway -> lat ~ 6.6905
  const midLat = marker.position.lat;
  assert.ok(midLat > 6.6904 && midLat < 6.6906, `expected halfway ~6.6905, got ${midLat}`);

  // Retarget east from current interpolated position
  tween.moveTo({ lat: 6.6905, lng: 124.671 }, { recordedAt: 2000, speedMps: 8 });
  driver.advanceTo(616); // t=0 of new tween should start from midLat, NOT 6.69 or 6.691
  assert.ok(Math.abs(marker.position.lat - midLat) < 1e-6);
  assert.ok(Math.abs(marker.position.lng - 124.67) < 1e-6);
});

test('coasting advances along heading and caps cleanly at 1200ms', () => {
  const driver = createRafDriver(0);
  const start = { lat: 6.69, lng: 124.67 };
  const marker = { position: { ...start } };
  const tween = createMarkerTween(marker, start, driver.raf, driver.cancelRaf, driver.now);

  const fix1 = { lat: 6.6902, lng: 124.67 };
  tween.moveTo(fix1, { recordedAt: 1000, speedMps: 10, heading: 0 });

  // Duration is ~1232ms; step RAF frames through the main tween first
  for (let t = 200; t <= 1250; t += 200) {
    driver.advanceTo(t);
  }
  assert.ok(driver.pendingCount() > 0, 'should enter bounded coast phase');

  // Step forward during coasting (400ms into 1200ms coast)
  driver.advanceTo(1640);
  const duringCoastLat = marker.position.lat;
  assert.ok(duringCoastLat > fix1.lat, `marker should coast north along heading=0 (got ${duringCoastLat})`);

  // Advance past duration + MAX_COAST_MS (1232 + 1200 = 2432ms)
  driver.advanceTo(2500);
  const atCapLat = marker.position.lat;
  assert.equal(driver.pendingCount(), 0, 'coasting must terminate after 1200ms cap');

  // Ensure another frame (if any) cannot advance past cap
  driver.advanceTo(4000);
  assert.equal(marker.position.lat, atCapLat);
});

test('teleports immediately without animation when jump exceeds 2000m', () => {
  const driver = createRafDriver(0);
  const start = { lat: 6.69, lng: 124.67 };
  const far = { lat: 6.72, lng: 124.67 }; // ~3.33 km north
  assert.ok(distanceMetres(start, far) > 2000);

  const marker = { position: { ...start } };
  const tween = createMarkerTween(marker, start, driver.raf, driver.cancelRaf, driver.now);
  tween.moveTo(far, { recordedAt: 1000, speedMps: 10 });

  assert.equal(driver.pendingCount(), 0, 'teleport should not schedule RAF');
  assert.deepEqual(marker.position, far);
});
