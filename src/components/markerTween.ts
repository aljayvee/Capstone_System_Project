/**
 * Slides a Google Maps marker smoothly between position updates.
 *
 * Uses interval-matched linear gliding (instead of fixed 600 ms ease-in-out
 * sprints) so pins move continuously between 1-2 second GPS updates without
 * stopping and restarting on every fix, plus a bounded 1.2s heading/speed
 * coast when a cellular packet arrives slightly late.
 */

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface MoveMeta {
  speedMps?: number | null;
  heading?: number | null;
  recordedAt?: number;
}

const MIN_MOVING_DURATION_MS = 850;
const MAX_DURATION_MS = 2600;
const DEFAULT_INTERVAL_MS = 1100;
const STOP_EASE_DURATION_MS = 450;
const MAX_COAST_MS = 1200;
const MIN_COAST_SPEED_MPS = 1.5;
const MOVING_SPEED_THRESHOLD_MPS = 0.8;

/** Past this the fix is a different place, not movement, so the marker jumps. */
const TELEPORT_THRESHOLD_M = 2000;

const EARTH_RADIUS_M = 6371000;
const METERS_PER_DEGREE = 111320;

export function distanceMetres(a: LatLngLiteral, b: LatLngLiteral): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(h));
}

export function tweenDuration(metres: number, intervalMs: number = DEFAULT_INTERVAL_MS): number {
  const clampedInterval = Math.min(MAX_DURATION_MS, Math.max(MIN_MOVING_DURATION_MS, intervalMs * 1.12));
  if (metres <= 0) return STOP_EASE_DURATION_MS;
  return clampedInterval;
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) ** 2;
}

export interface MarkerTween {
  /** Move toward `next`, animating smoothly and coasting briefly if needed. */
  moveTo(next: LatLngLiteral, meta?: MoveMeta): void;
  /** Stop any animation in flight. Call before dropping the marker. */
  cancel(): void;
}

type Positionable = { position: LatLngLiteral | null | undefined };

export function createMarkerTween(
  marker: Positionable,
  start: LatLngLiteral,
  raf: (cb: FrameRequestCallback) => number = requestAnimationFrame,
  cancelRaf: (handle: number) => void = cancelAnimationFrame,
  nowFn: () => number = () => performance.now()
): MarkerTween {
  let current: LatLngLiteral = { ...start };
  let frame: number | null = null;
  let lastFixTimeMs: number | null = null;
  let emaIntervalMs = DEFAULT_INTERVAL_MS;
  let lastTarget: LatLngLiteral = { ...start };
  let lastRecordedAt: number | undefined = undefined;

  const stop = () => {
    if (frame !== null) {
      cancelRaf(frame);
      frame = null;
    }
  };

  return {
    moveTo(next: LatLngLiteral, meta?: MoveMeta) {
      if (
        meta?.recordedAt !== undefined &&
        lastRecordedAt !== undefined &&
        meta.recordedAt <= lastRecordedAt &&
        distanceMetres(lastTarget, next) < 0.05
      ) {
        return;
      }

      stop();

      const fixTime = meta?.recordedAt ?? nowFn();
      if (lastFixTimeMs !== null) {
        const gap = fixTime - lastFixTimeMs;
        if (gap >= 250 && gap <= 5000) {
          const clampedGap = Math.min(MAX_DURATION_MS, Math.max(MIN_MOVING_DURATION_MS, gap));
          emaIntervalMs = 0.65 * emaIntervalMs + 0.35 * clampedGap;
        }
      }
      lastFixTimeMs = fixTime;
      lastTarget = { ...next };
      if (meta?.recordedAt !== undefined) lastRecordedAt = meta.recordedAt;

      const metres = distanceMetres(current, next);
      if (metres > TELEPORT_THRESHOLD_M || metres < 0.05) {
        current = { ...next };
        marker.position = current;
        return;
      }

      const speedMps =
        typeof meta?.speedMps === "number" && Number.isFinite(meta.speedMps)
          ? meta.speedMps
          : metres / (emaIntervalMs / 1000);
      const isMoving = speedMps >= MOVING_SPEED_THRESHOLD_MPS;
      const canCoast =
        isMoving &&
        speedMps >= MIN_COAST_SPEED_MPS &&
        typeof meta?.heading === "number" &&
        Number.isFinite(meta.heading);

      const from = { ...current };
      const duration = isMoving ? tweenDuration(metres, emaIntervalMs) : STOP_EASE_DURATION_MS;
      const began = nowFn();
      let coastLastNow: number | null = null;

      const step = (now: number) => {
        const elapsed = Math.max(0, now - began);
        if (elapsed < duration) {
          const progress = Math.min(1, elapsed / duration);
          const factor = isMoving ? progress : easeOutQuad(progress);
          current = {
            lat: from.lat + (next.lat - from.lat) * factor,
            lng: from.lng + (next.lng - from.lng) * factor,
          };
          marker.position = current;
          frame = raf(step);
          return;
        }

        const coastElapsed = elapsed - duration;
        if (canCoast && coastElapsed < MAX_COAST_MS) {
          const prevNow = coastLastNow ?? began + duration;
          coastLastNow = now;
          const dtSec = Math.max(0, (now - prevNow) / 1000);
          const coastProgress = coastElapsed / MAX_COAST_MS;
          // Taper coast speed smoothly so the pin never overshoots turns.
          const effectiveSpeed = Math.min(speedMps, 20) * (1 - 0.5 * coastProgress);
          const rad = ((meta!.heading as number) * Math.PI) / 180;
          const cosLat = Math.max(0.2, Math.cos((current.lat * Math.PI) / 180));
          current = {
            lat: current.lat + (effectiveSpeed * dtSec * Math.cos(rad)) / METERS_PER_DEGREE,
            lng: current.lng + (effectiveSpeed * dtSec * Math.sin(rad)) / (METERS_PER_DEGREE * cosLat),
          };
          marker.position = current;
          frame = raf(step);
          return;
        }

        if (!canCoast) {
          current = { ...next };
          marker.position = current;
        }
        frame = null;
      };

      frame = raf(step);
    },
    cancel: stop,
  };
}
