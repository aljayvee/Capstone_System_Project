import { normalizeHex } from "./colorMath";

/**
 * Per-browser, per-account Appearance preferences for the Owner portal.
 *
 * Deliberately local: the owner asked for a look that is set by and for their
 * own account, never pushed to anyone else. So nothing here reaches the
 * server, and the key carries the user id, which keeps two Admins who share a
 * browser from inheriting each other's colours.
 *
 * Storage can throw (a private window, blocked site data) or come back with
 * anything at all, so every read is validated field by field and a bad value
 * falls back to the default instead of breaking the portal.
 */

export type OwnerTheme = "light" | "dark" | "system";

export const FONT_SCALES = [0.9, 1, 1.125, 1.25] as const;
export type FontScale = (typeof FONT_SCALES)[number];

export interface OwnerAppearance {
  v: 1;
  theme: OwnerTheme;
  /** Null keeps the SUGO navy. */
  sidebarColor: string | null;
  /** Null keeps the SUGO red. */
  accentColor: string | null;
  fontScale: FontScale;
}

/** The colours the portal ships with, shown as the picker's starting point. */
export const SUGO_SIDEBAR = "#0F2035";
export const SUGO_ACCENT = "#DC2626";

export const DEFAULT_APPEARANCE: OwnerAppearance = {
  v: 1,
  theme: "light",
  sidebarColor: null,
  accentColor: null,
  fontScale: 1,
};

const KEY_PREFIX = "sugo:owner-appearance:v1:";

export function appearanceKey(userId: number | string): string {
  return `${KEY_PREFIX}${userId}`;
}

export function normalizeAppearance(raw: unknown): OwnerAppearance {
  if (!raw || typeof raw !== "object") return DEFAULT_APPEARANCE;
  const value = raw as Record<string, unknown>;
  const theme: OwnerTheme =
    value.theme === "dark" || value.theme === "system" || value.theme === "light"
      ? value.theme
      : DEFAULT_APPEARANCE.theme;
  const color = (input: unknown) => (typeof input === "string" ? normalizeHex(input) : null);
  const fontScale = FONT_SCALES.find((scale) => scale === value.fontScale) ?? DEFAULT_APPEARANCE.fontScale;
  return {
    v: 1,
    theme,
    sidebarColor: color(value.sidebarColor),
    accentColor: color(value.accentColor),
    fontScale,
  };
}

export function loadAppearance(userId: number | string | null | undefined): OwnerAppearance {
  if (userId === null || userId === undefined) return DEFAULT_APPEARANCE;
  try {
    const stored = window.localStorage.getItem(appearanceKey(userId));
    return stored ? normalizeAppearance(JSON.parse(stored)) : DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

/** False when the browser refused to store it; the choice still applies until reload. */
export function saveAppearance(userId: number | string | null | undefined, prefs: OwnerAppearance): boolean {
  if (userId === null || userId === undefined) return false;
  try {
    window.localStorage.setItem(appearanceKey(userId), JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}
