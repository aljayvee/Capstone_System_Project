import assert from 'node:assert/strict';
import test from 'node:test';
import { computeSoftFollowCameraAction } from '../src/components/softFollowCamera.ts';

const WIDE_BOUNDS = {
  southWest: { lat: 6.65, lng: 124.63 },
  northEast: { lat: 6.75, lng: 124.73 },
};

test('initial rider selection always centers and zooms to 16 even when inside zoomed-out comfort box', () => {
  // Rider is inside inner 60% of a wide zoomed-out map (zoom 12), off-center from (6.70, 124.68).
  const action = computeSoftFollowCameraAction({
    target: { lat: 6.685, lng: 124.665 },
    followSelected: true,
    needsInitialZoom: true,
    currentZoom: 12,
    bounds: WIDE_BOUNDS,
  });

  assert.deepEqual(action, { shouldPan: true, nextZoom: 16 });
});

test('subsequent rider updates while following preserve operator zoom-out below 15', () => {
  // Operator zoomed out to zoom 12 while followSelected remains true; rider moves outside comfort box.
  const actionOutside = computeSoftFollowCameraAction({
    target: { lat: 6.655, lng: 124.635 },
    followSelected: true,
    needsInitialZoom: false,
    currentZoom: 12,
    bounds: WIDE_BOUNDS,
  });
  assert.deepEqual(actionOutside, { shouldPan: true, nextZoom: null });

  // Rider stays inside inner 60% comfort box -> no pan and no zoom snap-back.
  const actionInside = computeSoftFollowCameraAction({
    target: { lat: 6.70, lng: 124.68 },
    followSelected: true,
    needsInitialZoom: false,
    currentZoom: 12,
    bounds: WIDE_BOUNDS,
  });
  assert.deepEqual(actionInside, { shouldPan: false, nextZoom: null });
});

test('paused followSelected issues no camera pan or zoom', () => {
  const action = computeSoftFollowCameraAction({
    target: { lat: 6.655, lng: 124.635 },
    followSelected: false,
    needsInitialZoom: true,
    currentZoom: 11,
    bounds: WIDE_BOUNDS,
  });

  assert.deepEqual(action, { shouldPan: false, nextZoom: null });
});

test('initial selection without bounds centers and only zooms if currentZoom < 15', () => {
  assert.deepEqual(
    computeSoftFollowCameraAction({
      target: { lat: 6.69, lng: 124.67 },
      followSelected: true,
      needsInitialZoom: true,
      currentZoom: 17,
      bounds: null,
    }),
    { shouldPan: true, nextZoom: null }
  );

  assert.deepEqual(
    computeSoftFollowCameraAction({
      target: { lat: 6.69, lng: 124.67 },
      followSelected: true,
      needsInitialZoom: true,
      currentZoom: undefined,
      bounds: null,
    }),
    { shouldPan: true, nextZoom: 16 }
  );
});
