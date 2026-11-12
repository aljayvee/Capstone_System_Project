/**
 * Settings tab ids, kept apart from SettingsModule.tsx so the portal shell can
 * read `?tab=` without pulling the lazily loaded module into its own chunk.
 */
export const SETTINGS_TAB_IDS = ["appearance", "groups", "accounts", "account"] as const;

export type SettingsTab = (typeof SETTINGS_TAB_IDS)[number];

export function isSettingsTab(value: string | null): value is SettingsTab {
  return SETTINGS_TAB_IDS.some((id) => id === value);
}

/** Access groups and Account access: the Main Owner's tabs. */
export function isAccessTab(tab: SettingsTab): boolean {
  return tab === "groups" || tab === "accounts";
}
