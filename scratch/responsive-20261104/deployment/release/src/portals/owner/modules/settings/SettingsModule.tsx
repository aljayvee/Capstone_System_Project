import * as React from "react";
import { KeyRound, Palette, ShieldCheck, UsersRound } from "lucide-react";
import { OwnerPanelShell } from "../../components/OwnerPanelShell";
import { OwnerTabs, type OwnerTab } from "../../components/OwnerTabs";
import { AccountSecurityLogsView } from "../../../../components/account/AccountSecurityLogsView";
import { AppearanceSettings } from "./AppearanceSettings";
import { AccessGroupsSettings } from "./AccessGroupsSettings";
import { AccountAccessSettings } from "./AccountAccessSettings";
import type { SettingsTab } from "./settingsTabs";

/**
 * Settings, opened from the sidebar footer.
 *
 * Every Admin gets Appearance (their own look, on this browser) and Account &
 * security (their own sessions and sign-in history, which used to be its own
 * screen behind the profile button). The Main Owner, the first Admin account,
 * also gets the two Access tabs; nobody else is offered them, and the server
 * refuses them anyway.
 */

const EVERYONE: ReadonlyArray<OwnerTab<SettingsTab>> = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "account", label: "Account & security", icon: ShieldCheck },
];

const MAIN_OWNER: ReadonlyArray<OwnerTab<SettingsTab>> = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "groups", label: "Access groups", icon: KeyRound },
  { id: "accounts", label: "Account access", icon: UsersRound },
  { id: "account", label: "Account & security", icon: ShieldCheck },
];

interface SettingsModuleProps {
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  /** The Main Owner only. */
  canManageAccess: boolean;
}

export function SettingsModule({ tab, onTabChange, canManageAccess }: SettingsModuleProps) {
  const tabs = canManageAccess ? MAIN_OWNER : EVERYONE;
  return (
    <OwnerPanelShell
      title="Settings"
      className="owner-reports-enter"
      controls={
        <OwnerTabs
          label="Settings section"
          idPrefix="settings"
          tabs={tabs}
          active={tab}
          onChange={(id) => onTabChange(id)}
        />
      }
    >
      <div
        key={tab}
        className="owner-report-enter"
        role="tabpanel"
        id={`settings-panel-${tab}`}
        aria-labelledby={`settings-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "appearance" && <AppearanceSettings />}
        {tab === "groups" && canManageAccess && (
          <AccessGroupsSettings onOpenAccounts={() => onTabChange("accounts")} />
        )}
        {tab === "accounts" && canManageAccess && <AccountAccessSettings />}
        {tab === "account" && <AccountSecurityLogsView showHeader={false} />}
      </div>
    </OwnerPanelShell>
  );
}
