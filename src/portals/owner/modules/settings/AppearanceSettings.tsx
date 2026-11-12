import * as React from "react";
import { Check, Monitor, Moon, RotateCcw, Sun, TriangleAlert } from "lucide-react";
import { Field, fieldInputClasses, PanelButton } from "@/components/panel";
import { useAuth } from "../../../../context/AuthContext";
import { useOwnerAppearance } from "../../appearance/OwnerAppearanceContext";
import {
  FONT_SCALES,
  SUGO_ACCENT,
  SUGO_SIDEBAR,
  type FontScale,
  type OwnerTheme,
} from "../../appearance/appearancePrefs";
import {
  STATE_CONTRAST,
  checkAccent,
  checkSidebar,
  contrastRatio,
  normalizeHex,
  sidebarTrim,
  type ColorCheck,
} from "../../appearance/colorMath";
import { ChoiceGroup, type Choice } from "./ChoiceGroup";

/**
 * Settings > Appearance: theme, the two owner-chosen colours and text size.
 *
 * Everything applies the moment it is valid, so the whole portal is the
 * preview. A colour that would leave white text unreadable is never applied:
 * the field keeps what was typed, says why it was refused, and offers the
 * nearest shade that passes.
 */

const THEME_CHOICES: ReadonlyArray<Choice<OwnerTheme>> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match this device", icon: Monitor },
];

const SIZE_LABELS: Record<FontScale, string> = {
  0.9: "Small",
  1: "Default",
  1.125: "Large",
  1.25: "Extra large",
};

const SIZE_CHOICES: ReadonlyArray<Choice<string>> = FONT_SCALES.map((scale) => ({
  value: String(scale),
  label: SIZE_LABELS[scale],
  glyph: (
    <span aria-hidden className="leading-none font-semibold" style={{ fontSize: `${15 * scale}px` }}>
      Aa
    </span>
  ),
}));

function draftKey(userId: number | undefined, slot: string) {
  return `sugo:owner-appearance-draft:${userId ?? "anon"}:${slot}`;
}

function readDraft(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeDraft(key: string, value: string | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // A draft that cannot be kept is only lost on a tab switch; nothing to report.
  }
}

interface ColorRowProps {
  label: string;
  hint: string;
  /** What is applied now, or the SUGO default when nothing is. */
  applied: string;
  fallback: string;
  check: (hex: string) => ColorCheck;
  /** Null restores the SUGO default. */
  onApply: (hex: string | null) => void;
  storageKey: string;
}

function ColorRow({ label, hint, applied, fallback, check, onApply, storageKey }: ColorRowProps) {
  const [draft, setDraft] = React.useState(() => readDraft(storageKey) ?? applied);

  // A reset or another tab changed the applied colour: follow it, unless the
  // owner has an unapplied edit in progress here.
  React.useEffect(() => {
    if (readDraft(storageKey) === null) setDraft(applied);
  }, [applied, storageKey]);

  const normalized = normalizeHex(draft);
  const result = normalized ? check(normalized) : null;

  const commit = (value: string) => {
    setDraft(value);
    const hex = normalizeHex(value);
    if (hex && check(hex).ok) {
      writeDraft(storageKey, null);
      if (hex !== applied) onApply(hex === fallback ? null : hex);
    } else {
      writeDraft(storageKey, value);
    }
  };

  const error = !normalized
    ? "Enter a color as # followed by 6 digits, like #0F2035."
    : result && !result.ok
      ? `White text on this color measures ${result.ratio.toFixed(1)}:1. It needs 4.5:1 to stay readable, so it was not applied.`
      : null;

  return (
    <div className="flex flex-col gap-2">
      <Field label={label} hint={error ? undefined : hint} error={error}>
        {(control) => (
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={`${label} picker`}
              value={(normalized ?? applied).toLowerCase()}
              onChange={(event) => commit(event.target.value.toUpperCase())}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-plate border border-edge bg-board-plate p-1"
            />
            <input
              {...control}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={7}
              value={draft}
              onChange={(event) => commit(event.target.value.trim())}
              className={`${fieldInputClasses} max-w-36 font-mono uppercase`}
            />
          </div>
        )}
      </Field>
      {result?.ok ? (
        <p className="flex items-center gap-1.5 text-label text-ink-muted">
          <Check size={14} className="shrink-0 text-status-done-ink" />
          White text measures {result.ratio.toFixed(1)}:1
        </p>
      ) : null}
      {result && !result.ok && result.suggestion ? (
        <div>
          <PanelButton
            size="sm"
            variant="secondary"
            onClick={() => commit(result.suggestion as string)}
            icon={
              <span
                aria-hidden
                className="inline-block size-3.5 shrink-0 rounded-trim border border-edge"
                style={{ backgroundColor: result.suggestion }}
              />
            }
          >
            Use {result.suggestion} instead
          </PanelButton>
        </div>
      ) : null}
    </div>
  );
}

function SettingsSection({
  title,
  detail,
  children,
}: {
  title: string;
  detail: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="grid gap-4 px-5 pb-6 pt-7 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-8">
      <div>
        <h2 id={id} className="text-panel text-ink">
          {title}
        </h2>
        <p className="mt-1 text-body text-ink-muted">{detail}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function AppearanceSettings() {
  const { user } = useAuth();
  const { prefs, resolvedTheme, update, reset, persisted } = useOwnerAppearance();

  const sidebar = prefs.sidebarColor ?? SUGO_SIDEBAR;
  const accent = prefs.accentColor ?? SUGO_ACCENT;
  const rowContrast = contrastRatio(accent, sidebar);
  const isDefault =
    prefs.theme === "light" && !prefs.sidebarColor && !prefs.accentColor && prefs.fontScale === 1;

  const resetAll = () => {
    writeDraft(draftKey(user?.id, "sidebar"), null);
    writeDraft(draftKey(user?.id, "accent"), null);
    reset();
  };

  return (
    <div className="space-y-4">
      {!persisted ? (
        <p role="alert" className="flex items-start gap-2 rounded-plate bg-status-waiting-fill px-4 py-3 text-label text-status-waiting-ink">
          <TriangleAlert size={16} className="mt-px shrink-0" />
          This browser did not save your last change, so it lasts only until you reload. Private windows and blocked site data do this.
        </p>
      ) : null}

      <div className="divide-y divide-hairline rounded-plate border border-edge bg-board-plate">
        <SettingsSection
          title="Theme"
          detail={
            prefs.theme === "system"
              ? `Following this device, which is set to ${resolvedTheme} right now.`
              : "Light or dark for the Owner portal on this browser."
          }
        >
          <ChoiceGroup
            label="Theme"
            choices={THEME_CHOICES}
            value={prefs.theme}
            onChange={(theme) => update({ theme })}
            className="max-w-xl"
          />
        </SettingsSection>

        <SettingsSection
          title="Colors"
          detail="Your sidebar and accent. Status colors stay fixed, so a warning always looks like a warning."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <ColorRow
              label="Sidebar"
              hint="Behind the menu and the brand line."
              applied={sidebar}
              fallback={SUGO_SIDEBAR}
              check={checkSidebar}
              onApply={(hex) => update({ sidebarColor: hex })}
              storageKey={draftKey(user?.id, "sidebar")}
            />
            <ColorRow
              label="Accent"
              hint="The selected menu item, primary buttons and text selection."
              applied={accent}
              fallback={SUGO_ACCENT}
              check={checkAccent}
              onApply={(hex) => update({ accentColor: hex })}
              storageKey={draftKey(user?.id, "accent")}
            />
          </div>

          {/* The live rail is hidden on phones, so the pairing is shown here too. */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div
              aria-hidden
              className="w-48 rounded-plate p-2"
              style={{ backgroundColor: sidebar }}
            >
              <div className="rounded-trim px-3 py-2 text-label text-white" style={{ backgroundColor: accent }}>
                Dashboard
              </div>
              <div className="px-3 py-2 text-label" style={{ color: sidebarTrim(sidebar) }}>
                Reports
              </div>
            </div>
            <PanelButton variant="primary" tabIndex={-1} aria-hidden>
              Primary action
            </PanelButton>
          </div>
          {rowContrast < STATE_CONTRAST ? (
            <p className="mt-3 flex items-start gap-1.5 text-label text-status-waiting-ink">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" />
              The selected menu item is hard to tell apart from the sidebar ({rowContrast.toFixed(1)}:1). A darker sidebar or a brighter accent fixes it.
            </p>
          ) : null}
        </SettingsSection>

        <SettingsSection title="Text size" detail="Makes text larger or smaller across the Owner portal. Layout stays the same size.">
          <ChoiceGroup
            label="Text size"
            choices={SIZE_CHOICES}
            value={String(prefs.fontScale)}
            onChange={(value) => update({ fontScale: Number(value) as FontScale })}
            className="max-w-2xl"
          />
          <p className="mt-4 max-w-xl text-body text-ink">
            Sales today reached ₱12,480 across 36 completed orders.
          </p>
        </SettingsSection>
      </div>

      {/* Left-aligned: the Kuya Sugo button floats over the bottom right. */}
      <div className="flex flex-col items-start gap-3 px-1 pb-8">
        <p className="text-label text-ink-muted">
          Saved in this browser for your account only. Other Admins, and your account on other devices, keep their own.
        </p>
        <PanelButton
          variant="secondary"
          size="sm"
          icon={<RotateCcw size={14} />}
          disabled={isDefault}
          onClick={resetAll}
        >
          Reset to SUGO defaults
        </PanelButton>
      </div>
    </div>
  );
}
