/**
 * Slides a Google Maps marker between position updates.
 *
 * Assigning `marker.position` teleports it, which is what the fleet map used to
 * do: a rider's pin sat still and then jumped each time a new fix arrived over
 * Firebase. Dispatch reads those pins to judge whether a rider is moving at all,
 * and a stationary-then-jumping pin makes that impossible to see.
 *
 * Mirrors the customer app's useSmoothedRiderPosition — same duration scaling,
 * same jump threshold — so the two views agree about how a rider moves.
 */

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

const MIN_DURATION_MS = 600;
const MAX_DURATION_MS = 2500;
const METRES_PER_MS = 0.03;

/** Past this the fix is a different place, not movement, so the marker jumps. */
const TELEPORT_THRESHOLD_M = 2000;

const EARTH_RADIUS_M = 6371000;

export function distanceMetres(a: LatLngLiteral, b: LatLngLiteral): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(h));
}

export function tweenDuration(metres: number): number {
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, metres / METRES_PER_MS));
}

/** Smooth start and end, so the pin does not jerk into motion. */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export interface MarkerTween {
  /** Move toward `next`, animating unless the step is implausibly large. */
  moveTo(next: LatLngLiteral): void;
  /** Stop any animation in flight. Call before dropping the marker. */
  cancel(): void;
}

type Positionable = { position: LatLngLiteral | null | undefined };

export function createMarkerTween(
  marker: Positionable,
  start: LatLngLiteral,
  raf: (cb: FrameRequestCallback) => number = requestAnimationFrame,
  cancelRaf: (handle: number) => void = cancelAnimationFrame
): MarkerTween {
  let current: LatLngLiteral = { ...start };
  let frame: number | null = null;

  const stop = () => {
    if (frame !== null) {
      cancelRaf(frame);
      frame = null;
    }
  };

  return {
    moveTo(next: LatLngLiteral) {
      stop();

      const metres = distanceMetres(current, next);
      if (metres > TELEPORT_THRESHOLD_M || metres === 0) {
        current = { ...next };
        marker.position = current;
        return;
      }

      const from = { ...current };
      const duration = tweenDuration(metres);
      const began = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - began) / duration);
        const eased = easeInOutQuad(progress);

        current = {
          lat: from.lat + (next.lat - from.lat) * eased,
          lng: from.lng + (next.lng - from.lng) * eased,
        };
        marker.position = current;

        if (progress < 1) {
          frame = raf(step);
        } else {
          frame = null;
        }
      };

      frame = raf(step);
    },
    cancel: stop,
  };
}
