import * as React from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  DEFAULT_APPEARANCE,
  SUGO_ACCENT,
  SUGO_SIDEBAR,
  appearanceKey,
  loadAppearance,
  normalizeAppearance,
  saveAppearance,
  type OwnerAppearance,
} from "./appearancePrefs";
import { WHITE, TEXT_CONTRAST, deepen, inkOn, mix, nearestPassing, sidebarTrim } from "./colorMath";

/**
 * Applies the signed-in Admin's Appearance preferences while the Owner portal
 * is mounted, and hands the Settings screen a way to change them.
 *
 * Everything lands on <html>, not on the portal's root, because dialogs and
 * popovers portal to document.body and carry data-surface="owner" themselves.
 * An attribute on the portal root would never reach them. The cleanup removes
 * every attribute and variable it set, so the login page and the other
 * portals are never themed by an owner's choice.
 */

/** The dark theme's plate, kept equal to owner-appearance.css. */
export const DARK_PLATE = "#152233";
/** The Owner surface's navy field (portal-palette.css), behind header figures. */
const SURFACE_FIELD = "#1E3A5F";

type ResolvedTheme = "light" | "dark";

interface OwnerAppearanceValue {
  prefs: OwnerAppearance;
  resolvedTheme: ResolvedTheme;
  /** Applies at once. False when the browser would not store it. */
  update: (patch: Partial<Omit<OwnerAppearance, "v">>) => boolean;
  reset: () => boolean;
  /** False after a save the browser refused, so the screen can say so. */
  persisted: boolean;
}

const OwnerAppearanceContext = React.createContext<OwnerAppearanceValue | null>(null);

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

const COLOR_VARS = [
  "--owner-signal",
  "--owner-signal-deep",
  "--owner-signal-ink-dark",
  "--owner-signal-on-field",
  "--owner-selection",
  "--owner-selection-dark",
  "--owner-sidebar",
  "--owner-sidebar-deep",
  "--owner-sidebar-trim",
] as const;

function clearAppearance(root: HTMLElement) {
  root.removeAttribute("data-owner-theme");
  root.removeAttribute("data-owner-accent");
  root.removeAttribute("data-owner-sidebar");
  root.classList.remove("dark");
  root.style.removeProperty("--owner-font-scale");
  for (const name of COLOR_VARS) root.style.removeProperty(name);
}

function applyAppearance(root: HTMLElement, prefs: OwnerAppearance, theme: ResolvedTheme) {
  clearAppearance(root);
  root.setAttribute("data-owner-theme", theme);
  // The `dark:` variant in theme.css is `&:is(.dark *)`. A handful of shared
  // components (the notification bell, the security log) already carry dark
  // styles behind it, so the class switches those on with no further work.
  if (theme === "dark") root.classList.add("dark");
  if (prefs.fontScale !== 1) root.style.setProperty("--owner-font-scale", String(prefs.fontScale));

  const accent = prefs.accentColor ?? SUGO_ACCENT;
  const sidebar = prefs.sidebarColor ?? SUGO_SIDEBAR;

  if (prefs.accentColor) {
    root.setAttribute("data-owner-accent", "");
    root.style.setProperty("--owner-signal", accent);
    root.style.setProperty("--owner-signal-deep", deepen(accent));
    root.style.setProperty("--owner-signal-ink-dark", inkOn(accent, DARK_PLATE));
    root.style.setProperty("--owner-selection", mix(accent, WHITE, 0.78));
    root.style.setProperty("--owner-selection-dark", mix(accent, DARK_PLATE, 0.55));
  }
  if (prefs.sidebarColor) {
    root.setAttribute("data-owner-sidebar", "");
    root.style.setProperty("--owner-sidebar", sidebar);
    root.style.setProperty("--owner-sidebar-deep", deepen(sidebar));
    root.style.setProperty("--owner-sidebar-trim", sidebarTrim(sidebar));
  }
  if (prefs.accentColor || prefs.sidebarColor) {
    // Red text on navy: counts in the rail and the header figure's urgent
    // state. It has to read on the sidebar and on the surface's own field.
    const onSidebar = inkOn(accent, sidebar);
    root.style.setProperty(
      "--owner-signal-on-field",
      nearestPassing(onSidebar, SURFACE_FIELD, TEXT_CONTRAST, WHITE) ?? WHITE,
    );
  }
}

export function OwnerAppearanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [prefs, setPrefs] = React.useState<OwnerAppearance>(() => loadAppearance(userId));
  const [persisted, setPersisted] = React.useState(true);
  const [prefersDark, setPrefersDark] = React.useState(systemPrefersDark);

  // A different account signing in on this browser gets its own choices.
  React.useEffect(() => {
    setPrefs(loadAppearance(userId));
    setPersisted(true);
  }, [userId]);

  React.useEffect(() => {
    if (prefs.theme !== "system") return;
    let query: MediaQueryList;
    try {
      query = window.matchMedia(DARK_QUERY);
    } catch {
      return;
    }
    const onChange = () => setPrefersDark(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [prefs.theme]);

  // Another tab of the same account changed something.
  React.useEffect(() => {
    if (userId === null) return;
    const key = appearanceKey(userId);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      try {
        setPrefs(event.newValue ? normalizeAppearance(JSON.parse(event.newValue)) : DEFAULT_APPEARANCE);
      } catch {
        setPrefs(DEFAULT_APPEARANCE);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  const resolvedTheme: ResolvedTheme =
    prefs.theme === "system" ? (prefersDark ? "dark" : "light") : prefs.theme;

  // Layout effect, so the first painted frame already has the chosen theme.
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    applyAppearance(root, prefs, resolvedTheme);
    return () => clearAppearance(root);
  }, [prefs, resolvedTheme]);

  const update = React.useCallback<OwnerAppearanceValue["update"]>(
    (patch) => {
      const next = normalizeAppearance({ ...prefs, ...patch });
      setPrefs(next);
      const saved = saveAppearance(userId, next);
      setPersisted(saved);
      return saved;
    },
    [prefs, userId],
  );

  const reset = React.useCallback(() => {
    setPrefs(DEFAULT_APPEARANCE);
    const saved = saveAppearance(userId, DEFAULT_APPEARANCE);
    setPersisted(saved);
    return saved;
  }, [userId]);

  const value = React.useMemo(
    () => ({ prefs, resolvedTheme, update, reset, persisted }),
    [prefs, resolvedTheme, update, reset, persisted],
  );

  return <OwnerAppearanceContext.Provider value={value}>{children}</OwnerAppearanceContext.Provider>;
}

export function useOwnerAppearance(): OwnerAppearanceValue {
  const value = React.useContext(OwnerAppearanceContext);
  if (!value) throw new Error("useOwnerAppearance must be used inside OwnerAppearanceProvider");
  return value;
}
