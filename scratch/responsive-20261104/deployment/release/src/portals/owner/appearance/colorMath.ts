/**
 * Colour arithmetic for the Owner portal's Appearance settings.
 *
 * The owner picks any sidebar and accent colour, so nothing here can assume a
 * value was reviewed. Every derived shade is measured with the WCAG 2.2
 * contrast formula before it is used, and a pick that cannot be made readable
 * is refused with the nearest shade that can.
 *
 * Mixing is plain sRGB interpolation. It is not perceptually even, but every
 * result is checked by ratio afterwards, so the walk only has to be monotonic
 * in luminance, which mixing toward black or white always is.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export const WHITE = "#FFFFFF";
export const BLACK = "#000000";
/** WCAG AA for body text, and the floor the whole design system holds to. */
export const TEXT_CONTRAST = 4.5;
/** WCAG 1.4.11: a selected state against what surrounds it. */
export const STATE_CONTRAST = 3;

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function parseHex(value: string): Rgb | null {
  const match = HEX.exec(value.trim());
  if (!match) return null;
  let digits = match[1];
  if (digits.length === 3) digits = digits.replace(/./g, (d) => d + d);
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** `#abc` or `abc123` to `#AABBCC` / `#ABC123`, or null when it is not a colour. */
export function normalizeHex(value: string): string | null {
  const rgb = parseHex(value);
  return rgb ? toHex(rgb) : null;
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** t = 0 returns `a`, t = 1 returns `b`. */
export function mix(a: string, b: string, t: number): string {
  const x = parseHex(a);
  const y = parseHex(b);
  if (!x || !y) return normalizeHex(a) ?? a;
  return toHex({
    r: x.r + (y.r - x.r) * t,
    g: x.g + (y.g - x.g) * t,
    b: x.b + (y.b - x.b) * t,
  });
}

/**
 * The shade of `color` closest to it that reaches `target` against `against`,
 * moving toward `toward` (black to darken, white to lighten). Returns the
 * colour itself when it already passes, and null when even the far end fails.
 */
export function nearestPassing(color: string, against: string, target: number, toward: string): string | null {
  if (contrastRatio(color, against) >= target) return normalizeHex(color);
  for (let step = 1; step <= 100; step++) {
    const candidate = mix(color, toward, step / 100);
    if (contrastRatio(candidate, against) >= target) return candidate;
  }
  return null;
}

export interface ColorCheck {
  ok: boolean;
  /** The measured ratio of the pairing that decides `ok`. */
  ratio: number;
  /** The nearest passing shade, offered when `ok` is false. */
  suggestion: string | null;
}

/**
 * The accent fills the active menu row, primary buttons and the collapsed
 * brand tile, always under white text, so white on it is the test.
 */
export function checkAccent(accent: string): ColorCheck {
  const ratio = contrastRatio(WHITE, accent);
  if (ratio >= TEXT_CONTRAST) return { ok: true, ratio, suggestion: null };
  return { ok: false, ratio, suggestion: nearestPassing(accent, WHITE, TEXT_CONTRAST, BLACK) };
}

/**
 * The sidebar carries the white brand line and the muted menu labels. The
 * labels are derived from it (see sidebarTrim), so white on it is the test:
 * a colour white cannot sit on cannot hold a lighter label either.
 */
export function checkSidebar(sidebar: string): ColorCheck {
  const ratio = contrastRatio(WHITE, sidebar);
  if (ratio >= TEXT_CONTRAST) return { ok: true, ratio, suggestion: null };
  return { ok: false, ratio, suggestion: nearestPassing(sidebar, WHITE, TEXT_CONTRAST, BLACK) };
}

/** The muted menu-label colour on a sidebar: tinted toward white until it reads. */
export function sidebarTrim(sidebar: string): string {
  return nearestPassing(mix(sidebar, WHITE, 0.5), sidebar, TEXT_CONTRAST, WHITE) ?? WHITE;
}

/** Hover and pressed shade of a fill. */
export function deepen(color: string): string {
  return mix(color, BLACK, 0.12);
}

/**
 * Red-as-text on a given ground. On white the accent already passes (contrast
 * is symmetric, and checkAccent required white on it), so this matters on the
 * navy sidebar and on the dark theme's plate.
 */
export function inkOn(color: string, ground: string): string {
  return nearestPassing(color, ground, TEXT_CONTRAST, WHITE) ?? WHITE;
}
