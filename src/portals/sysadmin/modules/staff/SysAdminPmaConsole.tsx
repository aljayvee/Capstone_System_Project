import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Crown,
  History,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { apiErrorText } from "../../lib/apiErrorText";
import {
  SYSADMIN_READ_ONLY_BASELINE_KEYS,
  findMissingSysAdminDependencies,
  resolveSysAdminEffectiveKeys,
  togglePermissionWithDependencies,
} from "../../lib/sysAdminAccessRules";
import type {
  SysAdminAccessGroupSummary,
  SysAdminAccountAccessSummary,
  SysAdminOverrideEntry,
  SysAdminPermissionCatalog,
  SysAdminPmaAuditRecord,
} from "../../../../types/sysAdmin";

export type PmaConsoleSection = "accounts" | "groups" | "audit";

function accountDisplayName(acc: SysAdminAccountAccessSummary): string {
  const full = [acc.firstName, acc.lastName].filter(Boolean).join(" ").trim();
  return full || acc.nickname || acc.username;
}

interface SysAdminPmaConsoleProps {
  section: PmaConsoleSection;
  onChanged?: () => void;
}

export const SysAdminPmaConsole: React.FC<SysAdminPmaConsoleProps> = ({
  section,
  onChanged,
}) => {
  const [catalog, setCatalog] = useState<SysAdminPermissionCatalog | null>(null);
  const [groups, setGroups] = useState<SysAdminAccessGroupSummary[]>([]);
  const [accounts, setAccounts] = useState<SysAdminAccountAccessSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<SysAdminPmaAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Account access & status drafts (preserved across errors)
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [draftGroupId, setDraftGroupId] = useState<number | null>(null);
  const [draftOverrides, setDraftOverrides] = useState<Map<string, "GRANT" | "DENY">>(new Map());
  const [accessStepUpPassword, setAccessStepUpPassword] = useState("");
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  const [draftStatus, setDraftStatus] = useState<"Active" | "Suspended" | "Inactive">("Active");
  const [statusReason, setStatusReason] = useState("");
  const [statusStepUpPassword, setStatusStepUpPassword] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Group editor drafts
  const [editingGroupId, setEditingGroupId] = useState<number | "new" | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupVersion, setGroupVersion] = useState(1);
  const [groupPermissions, setGroupPermissions] = useState<Set<string>>(new Set());
  const [groupStepUpPassword, setGroupStepUpPassword] = useState("");
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  // Group delete confirmation state
  const [groupToDelete, setGroupToDelete] = useState<SysAdminAccessGroupSummary | null>(null);
  const [deleteStepUpPassword, setDeleteStepUpPassword] = useState("");
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [cat, grp, acc, audit] = await Promise.all([
        sysAdminApiService.getPmaCatalog(),
        sysAdminApiService.listPmaGroups(),
        sysAdminApiService.listPmaAccounts(),
        sysAdminApiService.listPmaAuditLogs({ page: 1, limit: 40 }),
      ]);
      setCatalog(cat);
      setGroups(grp);
      setAccounts(acc);
      setAuditLogs(audit.logs);
    } catch (err: unknown) {
      setLoadError(apiErrorText(err, "Failed to load SysAdmin permission data."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const hydrateAccountDraft = useCallback((account: SysAdminAccountAccessSummary) => {
    setSelectedAccountId(account.id);
    setDraftGroupId(account.accessGroupId);
    const map = new Map<string, "GRANT" | "DENY">();
    for (const ov of account.overrides) {
      map.set(ov.permissionKey, ov.effect);
    }
    setDraftOverrides(map);
    setDraftStatus(
      account.status === "Suspended" || account.status === "Inactive"
        ? account.status
        : "Active"
    );
    setStatusReason("");
    setAccessStepUpPassword("");
    setStatusStepUpPassword("");
  }, []);

  useEffect(() => {
    if (accounts.length === 0) return;
    if (selectedAccountId !== null) {
      const stillExists = accounts.find((a) => a.id === selectedAccountId);
      if (stillExists) return;
    }
    const firstSecondary = accounts.find((a) => !a.isMainSysAdmin) ?? accounts[0];
    hydrateAccountDraft(firstSecondary);
  }, [accounts, selectedAccountId, hydrateAccountDraft]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const selectedDraftGroup = useMemo(
    () => groups.find((g) => g.id === draftGroupId) ?? null,
    [groups, draftGroupId]
  );

  const resolvedEffective = useMemo(() => {
    if (!selectedAccount || !catalog) return new Set<string>();
    const allKeys = catalog.permissions.map((p) => p.key);
    if (selectedAccount.isMainSysAdmin) {
      return new Set(allKeys);
    }
    const overrides: SysAdminOverrideEntry[] = Array.from(draftOverrides.entries()).map(
      ([permissionKey, effect]) => ({ permissionKey, effect })
    );
    return new Set(
      resolveSysAdminEffectiveKeys(
        selectedDraftGroup ? selectedDraftGroup.permissions : null,
        overrides,
        allKeys,
        false
      )
    );
  }, [selectedAccount, selectedDraftGroup, draftOverrides, catalog]);

  const accountMissingDeps = useMemo(() => {
    if (!catalog || !selectedAccount || selectedAccount.isMainSysAdmin) return [];
    return findMissingSysAdminDependencies(resolvedEffective, catalog.permissions);
  }, [catalog, selectedAccount, resolvedEffective]);

  const groupMissingDeps = useMemo(() => {
    if (!catalog) return [];
    return findMissingSysAdminDependencies(groupPermissions, catalog.permissions);
  }, [catalog, groupPermissions]);

  const openNewGroup = () => {
    setEditingGroupId("new");
    setGroupName("");
    setGroupDescription("");
    setGroupVersion(1);
    setGroupPermissions(new Set(SYSADMIN_READ_ONLY_BASELINE_KEYS));
    setGroupStepUpPassword("");
    setFeedback(null);
  };

  const openEditGroup = (group: SysAdminAccessGroupSummary) => {
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupDescription(group.description ?? "");
    setGroupVersion(group.version);
    setGroupPermissions(new Set(group.permissions));
    setGroupStepUpPassword("");
    setFeedback(null);
  };

  const handleToggleGroupPermission = (key: string) => {
    if (!catalog) return;
    setGroupPermissions((prev) =>
      togglePermissionWithDependencies(prev, key, catalog.permissions)
    );
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setFeedback({ type: "error", text: "Access group name is required." });
      return;
    }
    if (!groupStepUpPassword) {
      setFeedback({
        type: "error",
        text: "Enter your administrator password to confirm access group changes.",
      });
      return;
    }
    if (groupMissingDeps.length > 0) {
      setFeedback({
        type: "error",
        text: `Missing prerequisite permission: ${groupMissingDeps[0].requires} is required for ${groupMissingDeps[0].key}.`,
      });
      return;
    }

    setIsSavingGroup(true);
    setFeedback(null);
    try {
      if (editingGroupId === "new") {
        await sysAdminApiService.createPmaGroup({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          permissions: Array.from(groupPermissions),
          stepUpPassword: groupStepUpPassword,
        });
        setFeedback({ type: "success", text: `Created access group "${groupName.trim()}".` });
      } else if (typeof editingGroupId === "number") {
        await sysAdminApiService.updatePmaGroup(editingGroupId, {
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          permissions: Array.from(groupPermissions),
          version: groupVersion,
          stepUpPassword: groupStepUpPassword,
        });
        setFeedback({ type: "success", text: `Updated access group "${groupName.trim()}".` });
      }
      setEditingGroupId(null);
      setGroupStepUpPassword("");
      await loadAll();
      onChanged?.();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: apiErrorText(err, "Failed to save access group.") });
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    if (!deleteStepUpPassword) {
      setFeedback({
        type: "error",
        text: "Enter your administrator password to delete this access group.",
      });
      return;
    }

    setIsDeletingGroup(true);
    setFeedback(null);
    try {
      await sysAdminApiService.deletePmaGroup(groupToDelete.id, deleteStepUpPassword);
      setFeedback({
        type: "success",
        text: `Deleted access group "${groupToDelete.name}".`,
      });
      if (editingGroupId === groupToDelete.id) {
        setEditingGroupId(null);
      }
      setGroupToDelete(null);
      setDeleteStepUpPassword("");
      await loadAll();
      onChanged?.();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: apiErrorText(err, "Could not delete access group.") });
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const setOverrideChoice = (key: string, choice: "DEFAULT" | "GRANT" | "DENY") => {
    setDraftOverrides((prev) => {
      const next = new Map(prev);
      if (choice === "DEFAULT") {
        next.delete(key);
      } else {
        next.set(key, choice);
      }
      return next;
    });
  };

  const handleSaveAccountAccess = async () => {
    if (!selectedAccount || selectedAccount.isMainSysAdmin) return;
    if (!accessStepUpPassword) {
      setFeedback({
        type: "error",
        text: "Enter your administrator password to apply permission changes.",
      });
      return;
    }
    if (accountMissingDeps.length > 0) {
      setFeedback({
        type: "error",
        text: `Missing prerequisite permission: ${accountMissingDeps[0].requires} is required for ${accountMissingDeps[0].key}.`,
      });
      return;
    }

    setIsSavingAccess(true);
    setFeedback(null);
    try {
      const overrides: SysAdminOverrideEntry[] = Array.from(draftOverrides.entries()).map(
        ([permissionKey, effect]) => ({ permissionKey, effect })
      );
      await sysAdminApiService.updatePmaAccountAccess(selectedAccount.id, {
        accessGroupId: draftGroupId,
        overrides,
        stepUpPassword: accessStepUpPassword,
      });
      setAccessStepUpPassword("");
      setFeedback({
        type: "success",
        text: `Updated permissions for @${selectedAccount.username}. Active sessions refreshed immediately.`,
      });
      await loadAll();
      onChanged?.();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: apiErrorText(err, "Failed to save SysAdmin account permissions."),
      });
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleSaveAccountStatus = async () => {
    if (!selectedAccount || selectedAccount.isMainSysAdmin) return;
    if (!statusStepUpPassword) {
      setFeedback({
        type: "error",
        text: "Enter your administrator password to change account status.",
      });
      return;
    }

    setIsSavingStatus(true);
    setFeedback(null);
    try {
      await sysAdminApiService.updatePmaAccountStatus(selectedAccount.id, {
        status: draftStatus,
        reason: statusReason.trim() || undefined,
        stepUpPassword: statusStepUpPassword,
      });
      setStatusStepUpPassword("");
      setStatusReason("");
      setFeedback({
        type: "success",
        text: `Set @${selectedAccount.username} status to ${draftStatus}.`,
      });
      await loadAll();
      onChanged?.();
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: apiErrorText(err, "Failed to update IT Admin status."),
      });
    } finally {
      setIsSavingStatus(false);
    }
  };

  if (isLoading && !catalog) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading SysAdmin permission matrix">
        <div className="h-24 rounded-xl bg-board-plate border border-edge animate-pulse" />
        <div className="h-64 rounded-xl bg-board-plate border border-edge animate-pulse" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
        <button
          type="button"
          onClick={() => void loadAll()}
          className="px-3 py-2 rounded-lg bg-board-ground border border-edge text-ink text-xs font-semibold min-h-[40px]"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-status-done-fill border-status-done-ink/30 text-status-done-ink"
              : "bg-status-act-fill border-status-act-ink/30 text-status-act-ink"
          }`}
        >
          <div className="flex items-start gap-2">
            {feedback.type === "success" ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-ink-muted hover:text-ink underline text-[11px] shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: ACCOUNT PERMISSIONS & STATUS */}
      {section === "accounts" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Master List */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                IT Admin Accounts ({accounts.length})
              </h3>
              <button
                type="button"
                onClick={() => void loadAll()}
                disabled={isLoading}
                className="p-1.5 rounded-lg bg-board-plate border border-edge text-ink-muted hover:text-ink"
                title="Refresh accounts"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="p-6 rounded-xl bg-board-plate border border-edge text-center text-xs text-ink-muted">
                No SysAdmin accounts found.
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((acc) => {
                  const selected = acc.id === selectedAccountId;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setFeedback(null);
                        hydrateAccountDraft(acc);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors min-h-[48px] ${
                        selected
                          ? "bg-board-plate border-signal"
                          : "bg-board-ground border-edge hover:bg-board-plate"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-ink truncate flex items-center gap-1.5">
                            {acc.isMainSysAdmin && (
                              <Crown className="w-3.5 h-3.5 text-status-waiting-ink shrink-0" />
                            )}
                            <span className="truncate">{accountDisplayName(acc)}</span>
                          </div>
                          <div className="text-[11px] font-mono text-ink-muted truncate">
                            @{acc.username}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border shrink-0 ${
                            acc.status === "Active"
                              ? "bg-status-done-fill text-status-done-ink border-status-done-ink/30"
                              : "bg-status-act-fill text-status-act-ink border-status-act-ink/30"
                          }`}
                        >
                          {acc.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-ink-muted">
                        <span className="truncate">
                          {acc.isMainSysAdmin
                            ? "Main SysAdmin (Full access)"
                            : acc.accessGroupName ?? acc.baselineName}
                        </span>
                        <span className="font-mono text-ink tabular-nums shrink-0">
                          {acc.effectivePermissions.length}/{catalog?.permissions.length ?? 19}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Detail Editor */}
          <div className="lg:col-span-8">
            {!selectedAccount ? (
              <div className="p-8 rounded-xl bg-board-plate border border-edge text-center text-xs text-ink-muted">
                Select an IT Administrator to inspect or configure permissions.
              </div>
            ) : selectedAccount.isMainSysAdmin ? (
              <div className="p-6 rounded-xl bg-board-plate border border-edge space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-status-done-fill border border-status-done-ink/30 flex items-center justify-center text-status-done-ink shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-ink">
                      {accountDisplayName(selectedAccount)} (@{selectedAccount.username})
                    </h3>
                    <p className="text-xs text-status-done-ink font-semibold">
                      Main SysAdmin - Root Protected (19/19 Capabilities)
                    </p>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      The root Main SysAdmin always retains unrestricted IT governance access and cannot be downgraded, restricted by overrides, or suspended via PMA.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-5 rounded-xl bg-board-plate border border-edge space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-edge pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-ink">
                        {accountDisplayName(selectedAccount)} (@{selectedAccount.username})
                      </h3>
                      <p className="text-[11px] text-ink-muted">
                        Effective Access: {resolvedEffective.size} of {catalog?.permissions.length ?? 19} capabilities
                      </p>
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-board-ground border border-edge text-ink">
                      {selectedDraftGroup
                        ? `Group: ${selectedDraftGroup.name}`
                        : "Baseline: Read-Only Monitoring (5)"}
                    </span>
                  </div>

                  {/* Group Selector */}
                  <div>
                    <label
                      htmlFor="pma-account-group"
                      className="block text-xs font-semibold text-ink mb-1.5"
                    >
                      Assigned Access Group
                    </label>
                    <select
                      id="pma-account-group"
                      value={draftGroupId ?? ""}
                      onChange={(e) =>
                        setDraftGroupId(e.target.value ? Number(e.target.value) : null)
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-board-ground border border-edge text-xs text-ink min-h-[44px]"
                    >
                      <option value="">
                        None - Read-Only Monitoring (Default, 5 view capabilities)
                      </option>
                      {groups.map((grp) => (
                        <option key={grp.id} value={grp.id}>
                          {grp.name} ({grp.permissions.length} permissions)
                        </option>
                      ))}
                    </select>
                  </div>

                  {accountMissingDeps.length > 0 && (
                    <div className="p-3 rounded-lg bg-status-waiting-fill border border-status-waiting-ink/30 text-xs text-status-waiting-ink flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Prerequisite missing: <strong>{accountMissingDeps[0].key}</strong> requires{" "}
                        <strong>{accountMissingDeps[0].requires}</strong>.
                      </span>
                    </div>
                  )}

                  {/* Per-Permission Overrides Matrix */}
                  <div className="space-y-4">
                    <div className="text-xs font-semibold text-ink">
                      Per-Account Permission Overrides (GRANT / DENY)
                    </div>
                    {catalog?.areas.map((area) => {
                      const items = catalog.permissions.filter((p) => p.area === area);
                      return (
                        <div
                          key={area}
                          className="rounded-xl border border-edge bg-board-ground overflow-hidden"
                        >
                          <div className="px-3.5 py-2 bg-board-plate border-b border-edge text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                            {area}
                          </div>
                          <div className="divide-y divide-hairline">
                            {items.map((perm) => {
                              const overrideEffect = draftOverrides.get(perm.key) ?? "DEFAULT";
                              const effectiveOn = resolvedEffective.has(perm.key);
                              const inherited =
                                selectedDraftGroup
                                  ? selectedDraftGroup.permissions.includes(perm.key)
                                  : SYSADMIN_READ_ONLY_BASELINE_KEYS.includes(perm.key);
                              return (
                                <div
                                  key={perm.key}
                                  className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-semibold text-ink">
                                        {perm.label}
                                      </span>
                                      <span
                                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                          effectiveOn
                                            ? "bg-status-done-fill text-status-done-ink border-status-done-ink/30"
                                            : "bg-board-plate text-ink-muted border-edge"
                                        }`}
                                      >
                                        {effectiveOn ? "ACTIVE" : "OFF"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-ink-muted mt-0.5">
                                      {perm.note}
                                      {perm.requires.length > 0 ? ` (Requires ${perm.requires.join(", ")})` : ""}
                                    </p>
                                  </div>

                                  <div className="inline-flex rounded-lg border border-edge bg-board-plate p-0.5 shrink-0">
                                    {(["DEFAULT", "GRANT", "DENY"] as const).map((choice) => {
                                      const active = overrideEffect === choice;
                                      const label =
                                        choice === "DEFAULT"
                                          ? inherited
                                            ? "Default (On)"
                                            : "Default (Off)"
                                          : choice;
                                      return (
                                        <button
                                          key={choice}
                                          type="button"
                                          onClick={() => setOverrideChoice(perm.key, choice)}
                                          className={`px-2.5 py-1.5 rounded-md text-[11px] font-mono font-semibold transition-colors min-h-[36px] ${
                                            active
                                              ? choice === "GRANT"
                                                ? "bg-status-done-fill text-status-done-ink"
                                                : choice === "DENY"
                                                ? "bg-status-act-fill text-status-act-ink"
                                                : "bg-board-ground text-ink"
                                              : "text-ink-muted hover:text-ink"
                                          }`}
                                        >
                                          {label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Step-Up Confirm & Save Access */}
                  <div className="pt-3 border-t border-edge space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1">
                        Confirm with Your Administrator Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-3" />
                        <input
                          type="password"
                          value={accessStepUpPassword}
                          onChange={(e) => setAccessStepUpPassword(e.target.value)}
                          placeholder="Enter current SysAdmin password..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-board-ground border border-edge text-xs text-ink placeholder-ink-muted"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveAccountAccess}
                        disabled={
                          isSavingAccess ||
                          !accessStepUpPassword ||
                          accountMissingDeps.length > 0
                        }
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-signal hover:bg-signal-deep disabled:opacity-50 text-xs font-semibold text-white min-h-[44px]"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>
                          {isSavingAccess ? "Applying Access..." : "Save Group & Overrides"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Secondary IT Admin Account Status Card */}
                <div className="p-5 rounded-xl bg-board-plate border border-edge space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-status-waiting-ink" />
                      <span>Secondary IT Admin Account Status</span>
                    </h4>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      Suspending or deactivating an IT Admin immediately revokes active sessions and blocks portal access.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">
                        Account Status
                      </label>
                      <select
                        value={draftStatus}
                        onChange={(e) =>
                          setDraftStatus(
                            e.target.value as "Active" | "Suspended" | "Inactive"
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-board-ground border border-edge text-xs text-ink min-h-[44px]"
                      >
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">
                        Reason (Audit Log)
                      </label>
                      <input
                        type="text"
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        placeholder="Optional reason for status change..."
                        className="w-full px-3 py-2 rounded-xl bg-board-ground border border-edge text-xs text-ink placeholder-ink-muted min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-ink mb-1">
                        Step-Up Password *
                      </label>
                      <div className="relative">
                        <KeyRound className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-3" />
                        <input
                          type="password"
                          value={statusStepUpPassword}
                          onChange={(e) => setStatusStepUpPassword(e.target.value)}
                          placeholder="Enter current SysAdmin password..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-board-ground border border-edge text-xs text-ink placeholder-ink-muted min-h-[44px]"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveAccountStatus}
                      disabled={isSavingStatus || !statusStepUpPassword}
                      className="px-4 py-2.5 rounded-xl bg-board-ground hover:bg-board-ground border border-edge disabled:opacity-50 text-xs font-semibold text-ink min-h-[44px] shrink-0"
                    >
                      {isSavingStatus ? "Updating..." : "Update Account Status"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: ACCESS GROUPS CRUD */}
      {section === "groups" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <UsersRound className="w-4 h-4 text-status-moving-ink" />
                <span>SysAdmin Access Groups ({groups.length})</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Define reusable permission templates for secondary IT Administrators.
              </p>
            </div>
            <button
              type="button"
              onClick={openNewGroup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-signal hover:bg-signal-deep text-xs font-semibold text-white min-h-[44px] self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Access Group</span>
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="p-8 rounded-xl bg-board-plate border border-edge text-center space-y-3">
              <UsersRound className="w-7 h-7 text-ink-muted mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">No SysAdmin access groups yet</p>
                <p className="text-xs text-ink-muted">
                  Secondary IT Admins default to Read-Only Monitoring (5 view permissions) until assigned a group.
                </p>
              </div>
              <button
                type="button"
                onClick={openNewGroup}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-signal hover:bg-signal-deep text-xs font-semibold text-white min-h-[44px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Access Group</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map((grp) => (
                <div
                  key={grp.id}
                  className="p-4 rounded-xl bg-board-plate border border-edge flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-ink">{grp.name}</h4>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {grp.description || "No description provided."}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-board-ground border border-edge text-ink shrink-0">
                        v{grp.version}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono text-ink-muted">
                      <span>{grp.permissions.length} capabilities</span>
                      <span>&bull;</span>
                      <span>{grp.memberCount} IT Admin{grp.memberCount === 1 ? "" : "s"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                    <button
                      type="button"
                      onClick={() => openEditGroup(grp)}
                      className="px-3 py-1.5 rounded-lg bg-board-ground border border-edge text-xs font-semibold text-ink hover:text-ink min-h-[40px]"
                    >
                      Edit Permissions
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupToDelete(grp);
                        setDeleteStepUpPassword("");
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-act-fill border border-status-act-ink/30 text-xs font-semibold text-status-act-ink min-h-[40px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create / Edit Group Form */}
          {editingGroupId !== null && catalog && (
            <form
              onSubmit={handleSaveGroup}
              className="p-5 rounded-xl bg-board-plate border border-edge space-y-4"
            >
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <h4 className="text-sm font-bold text-ink">
                  {editingGroupId === "new" ? "New SysAdmin Access Group" : `Edit Group: ${groupName}`}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingGroupId(null)}
                  className="p-1.5 rounded-lg text-ink-muted hover:text-ink"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Incident & Threat Operator"
                    className="w-full px-3 py-2 rounded-xl bg-board-ground border border-edge text-xs text-ink placeholder-ink-muted"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Scope of duties for this IT role..."
                    className="w-full px-3 py-2 rounded-xl bg-board-ground border border-edge text-xs text-ink placeholder-ink-muted"
                  />
                </div>
              </div>

              {groupMissingDeps.length > 0 && (
                <div className="p-3 rounded-lg bg-status-waiting-fill border border-status-waiting-ink/30 text-xs text-status-waiting-ink flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Prerequisite missing: <strong>{groupMissingDeps[0].key}</strong> requires{" "}
                    <strong>{groupMissingDeps[0].requires}</strong>.
                  </span>
                </div>
              )}

              <div className="space-y-3">
                <div className="text-xs font-semibold text-ink">
                  Capabilities ({groupPermissions.size}/{catalog.permissions.length} selected)
                </div>
                {catalog.areas.map((area) => {
                  const items = catalog.permissions.filter((p) => p.area === area);
                  return (
                    <div
                      key={area}
                      className="rounded-xl border border-edge bg-board-ground overflow-hidden"
                    >
                      <div className="px-3.5 py-2 bg-board-plate border-b border-edge text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        {area}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
                        {items.map((perm) => {
                          const checked = groupPermissions.has(perm.key);
                          return (
                            <label
                              key={perm.key}
                              className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                checked
                                  ? "bg-board-plate border-signal/50"
                                  : "bg-board-ground border-edge hover:bg-board-plate"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleGroupPermission(perm.key)}
                                className="mt-0.5 rounded border-edge"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-ink">
                                  {perm.label}
                                </div>
                                <div className="text-[11px] text-ink-muted">
                                  {perm.note}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-edge flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Confirm with Administrator Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-3" />
                    <input
                      type="password"
                      value={groupStepUpPassword}
                      onChange={(e) => setGroupStepUpPassword(e.target.value)}
                      placeholder="Enter current SysAdmin password..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-board-ground border border-edge text-xs text-ink placeholder-ink-muted min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingGroupId(null)}
                    className="px-4 py-2.5 rounded-xl bg-board-ground border border-edge text-xs font-semibold text-ink min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSavingGroup ||
                      !groupStepUpPassword ||
                      groupMissingDeps.length > 0
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-signal hover:bg-signal-deep disabled:opacity-50 text-xs font-semibold text-white min-h-[44px]"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingGroup ? "Saving..." : "Save Access Group"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Delete Group Step-Up Modal */}
          {groupToDelete && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-board-plate border border-edge p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-edge pb-3">
                  <h4 className="text-sm font-bold text-status-act-ink flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Access Group</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setGroupToDelete(null)}
                    disabled={isDeletingGroup}
                    className="text-ink-muted hover:text-ink"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-ink">
                  Delete access group <strong>{groupToDelete.name}</strong>? Groups with assigned IT Admins must be unassigned before deletion.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Administrator Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-3" />
                    <input
                      type="password"
                      value={deleteStepUpPassword}
                      onChange={(e) => setDeleteStepUpPassword(e.target.value)}
                      placeholder="Enter current SysAdmin password..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-board-ground border border-edge text-xs text-ink placeholder-ink-muted min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                  <button
                    type="button"
                    onClick={() => setGroupToDelete(null)}
                    disabled={isDeletingGroup}
                    className="px-4 py-2 rounded-xl bg-board-ground border border-edge text-xs font-semibold text-ink min-h-[40px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteGroup}
                    disabled={isDeletingGroup || !deleteStepUpPassword}
                    className="px-4 py-2 rounded-xl bg-signal hover:bg-signal-deep disabled:opacity-50 text-xs font-semibold text-white min-h-[40px]"
                  >
                    {isDeletingGroup ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: PMA AUDIT TRAIL */}
      {section === "audit" && (
        <div className="p-5 rounded-xl bg-board-plate border border-edge space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <History className="w-4 h-4 text-status-moving-ink" />
                <span>SysAdmin PMA Audit Trail</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Every permission, access group, and secondary SysAdmin status change by Main SysAdmin or Main Owner.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAll()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-board-ground border border-edge text-xs text-ink min-h-[40px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-10 text-center text-xs text-ink-muted">
              No SysAdmin PMA edits recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-hairline">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-board-ground border border-edge text-ink">
                        {log.actorRole === "OWNER" ? "MAIN OWNER" : "MAIN SYSADMIN"}
                      </span>
                      <span className="text-xs font-semibold text-ink">
                        @{log.actorUsername}
                      </span>
                      <span className="text-[11px] font-mono text-status-moving-ink">
                        {log.action}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted break-words">
                      Target: <span className="text-ink font-medium">{log.targetUsername || log.groupName || "SysAdmin PMA"}</span>
                      {" - "}
                      {log.oldValue ? `${log.oldValue} -> ` : ""}
                      {log.newValue || "Removed"}
                    </p>
                  </div>
                  <div className="text-[11px] font-mono text-ink-muted shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
