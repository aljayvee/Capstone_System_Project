/**
 * Dispatcher-side ETA presentation.
 *
 * The server returns a P50/P80 band rather than a point estimate, because an
 * errand is mostly time the rider spends inside a shop and that varies far more
 * than the ride does. Collapsing it back to one number here would throw away the
 * only honest thing about it.
 */
export interface EtaSummary {
  label: string;
  /** True once the high end of the window has passed. */
  isLate: boolean;
  minutesUntilLow: number;
}

export function summarizeEta(
  etaLowAt: string | null | undefined,
  etaHighAt: string | null | undefined,
  now: number = Date.now()
): EtaSummary | null {
  if (!etaLowAt || !etaHighAt) return null;

  const low = new Date(etaLowAt).getTime();
  const high = new Date(etaHighAt).getTime();
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;

  const lowMinutes = Math.round((low - now) / 60000);
  const highMinutes = Math.round((high - now) / 60000);

  if (highMinutes < 0) {
    return {
      label: `${Math.abs(highMinutes)} min overdue`,
      isLate: true,
      minutesUntilLow: lowMinutes,
    };
  }

  const clampedLow = Math.max(0, lowMinutes);
  const label =
    clampedLow === highMinutes ? `~${highMinutes} min` : `${clampedLow}–${highMinutes} min`;

  return { label, isLate: false, minutesUntilLow: clampedLow };
}
