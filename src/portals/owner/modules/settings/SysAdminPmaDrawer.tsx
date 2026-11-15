import * as React from "react";
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
import { toast } from "sonner";
import { accessApi, AccessApiError } from "../../../../services/accessApi";
import { PanelButton } from "@/components/panel";
import type {
  SysAdminAccessGroupSummary,
  SysAdminAccountAccessSummary,
  SysAdminOverrideEntry,
  SysAdminPermissionCatalog,
  SysAdminPmaAuditRecord,
} from "../../../../types/sysAdmin";
import {
  SYSADMIN_READ_ONLY_BASELINE_KEYS,
  findMissingSysAdminDependencies,
  resolveSysAdminEffectiveKeys,
  togglePermissionWithDependencies,
} from "../../../sysadmin/lib/sysAdminAccessRules";

type DrawerTab = "accounts" | "groups" | "audit";

interface SysAdminPmaDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const SysAdminPmaDrawer: React.FC<SysAdminPmaDrawerProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<DrawerTab>("accounts");
  const [catalog, setCatalog] = React.useState<SysAdminPermissionCatalog | null>(null);
  const [groups, setGroups] = React.useState<SysAdminAccessGroupSummary[]>([]);
  const [accounts, setAccounts] = React.useState<SysAdminAccountAccessSummary[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<SysAdminPmaAuditRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Account editor draft (preserved on error)
  const [selectedAccountId, setSelectedAccountId] = React.useState<number | null>(null);
  const [draftGroupId, setDraftGroupId] = React.useState<number | null>(null);
  const [draftOverrides, setDraftOverrides] = React.useState<Map<string, "GRANT" | "DENY">>(new Map());
  const [draftStatus, setDraftStatus] = React.useState<"Active" | "Suspended" | "Inactive">("Active");
  const [statusReason, setStatusReason] = React.useState("");
  const [savingAccount, setSavingAccount] = React.useState(false);
  const [savingStatus, setSavingStatus] = React.useState(false);

  // Group editor draft
  const [editingGroupId, setEditingGroupId] = React.useState<number | "new" | null>(null);
  const [groupName, setGroupName] = React.useState("");
  const [groupDescription, setGroupDescription] = React.useState("");
  const [groupVersion, setGroupVersion] = React.useState(1);
  const [groupPermissions, setGroupPermissions] = React.useState<Set<string>>(new Set());
  const [savingGroup, setSavingGroup] = React.useState(false);
  const [deletingGroupId, setDeletingGroupId] = React.useState<number | null>(null);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cat, grp, acc, audit] = await Promise.all([
        accessApi.getSysAdminCatalog(),
        accessApi.listSysAdminGroups(),
        accessApi.listSysAdminAccounts(),
        accessApi.listSysAdminPmaAuditLogs({ page: 1, limit: 30 }),
      ]);
      setCatalog(cat);
      setGroups(grp);
      setAccounts(acc);
      setAuditLogs(audit.logs);
    } catch (err: unknown) {
      setError(err instanceof AccessApiError ? err.message : "Could not load SysAdmin PMA data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      void loadAll();
    }
  }, [open, loadAll]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Select first secondary IT Admin (or first IT Admin) once accounts load
  React.useEffect(() => {
    if (accounts.length === 0) return;
    const currentStillExists = accounts.some((a) => a.id === selectedAccountId);
    if (!currentStillExists) {
      const firstSecondary = accounts.find((a) => !a.isMainSysAdmin) ?? accounts[0];
      selectAccountForEdit(firstSecondary);
    }
  }, [accounts, selectedAccountId]);

  const selectAccountForEdit = (acct: SysAdminAccountAccessSummary) => {
    setSelectedAccountId(acct.id);
    setDraftGroupId(acct.accessGroupId);
    const map = new Map<string, "GRANT" | "DENY">();
    for (const ov of acct.overrides) {
      map.set(ov.permissionKey, ov.effect);
    }
    setDraftOverrides(map);
    const normStatus =
      acct.status === "Suspended" || acct.status === "Inactive" ? acct.status : "Active";
    setDraftStatus(normStatus);
    setStatusReason("");
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  const selectedGroupKeys = React.useMemo(() => {
    if (draftGroupId === null) return null;
    return groups.find((g) => g.id === draftGroupId)?.permissions ?? [];
  }, [draftGroupId, groups]);

  const baseEffectiveSet = React.useMemo(
    () => new Set(selectedGroupKeys ?? SYSADMIN_READ_ONLY_BASELINE_KEYS),
    [selectedGroupKeys]
  );

  const previewEffectiveKeys = React.useMemo(() => {
    if (!catalog || !selectedAccount) return [];
    const overridesList: SysAdminOverrideEntry[] = Array.from(draftOverrides.entries()).map(
      ([permissionKey, effect]) => ({ permissionKey, effect })
    );
    return resolveSysAdminEffectiveKeys(
      selectedGroupKeys,
      overridesList,
      catalog.allKeys,
      selectedAccount.isMainSysAdmin
    );
  }, [catalog, selectedAccount, selectedGroupKeys, draftOverrides]);

  const previewMissingDeps = React.useMemo(() => {
    if (!catalog || !selectedAccount || selectedAccount.isMainSysAdmin) return [];
    return findMissingSysAdminDependencies(previewEffectiveKeys, catalog.permissions);
  }, [catalog, selectedAccount, previewEffectiveKeys]);

  const handleCycleOverride = (key: string) => {
    if (!selectedAccount || selectedAccount.isMainSysAdmin) return;
    setDraftOverrides((prev) => {
      const next = new Map(prev);
      const current = next.get(key);
      const inBase = baseEffectiveSet.has(key);
      if (current) {
        next.delete(key);
      } else {
        next.set(key, inBase ? "DENY" : "GRANT");
      }
      return next;
    });
  };

  const handleSaveAccountAccess = async () => {
    if (!selectedAccount || selectedAccount.isMainSysAdmin) return;
    if (previewMissingDeps.length > 0 && catalog) {
      const first = previewMissingDeps[0];
      const kLabel = catalog.permissions.find((p) => p.key === first.key)?.label ?? first.key;
      const rLabel = catalog.permissions.find((p) => p.key === first.requires)?.label ?? first.requires;
      toast.error(`"${kLabel}" requires "${rLabel}" to remain enabled.`);
      return;
    }

    setSavingAccount(true);
    try {
      const overrides: SysAdminOverrideEntry[] = Array.from(draftOverrides.entries()).map(
        ([permissionKey, effect]) => ({ permissionKey, effect })
      );
      await accessApi.updateSysAdminAccountAccess(selectedAccount.id, {
        accessGroupId: draftGroupId,
        overrides,
      });
      toast.success(`Updated SysAdmin access for @${selectedAccount.username}.`);
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof AccessApiError ? err.message : "Could not save SysAdmin access.");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSaveAccountStatus = async () => {
    if (!selectedAccount || selectedAccount.isMainSysAdmin) return;
    setSavingStatus(true);
    try {
      await accessApi.updateSysAdminAccountStatus(selectedAccount.id, {
        status: draftStatus,
        reason: statusReason.trim() || undefined,
      });
      toast.success(`@${selectedAccount.username} status set to ${draftStatus}.`);
      setStatusReason("");
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof AccessApiError ? err.message : "Could not update SysAdmin status.");
    } finally {
      setSavingStatus(false);
    }
  };

  const startNewGroup = () => {
    setEditingGroupId("new");
    setGroupName("");
    setGroupDescription("");
    setGroupVersion(1);
    setGroupPermissions(new Set(SYSADMIN_READ_ONLY_BASELINE_KEYS));
  };

  const startEditGroup = (group: SysAdminAccessGroupSummary) => {
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupDescription(group.description ?? "");
    setGroupVersion(group.version);
    setGroupPermissions(new Set(group.permissions));
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error("Provide a name for the SysAdmin access group.");
      return;
    }
    setSavingGroup(true);
    try {
      const permissions = Array.from(groupPermissions);
      if (editingGroupId === "new") {
        await accessApi.createSysAdminGroup({
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          permissions,
        });
        toast.success(`Created SysAdmin access group "${groupName.trim()}".`);
      } else if (typeof editingGroupId === "number") {
        await accessApi.updateSysAdminGroup(editingGroupId, {
          name: groupName.trim(),
          description: groupDescription.trim() || null,
          permissions,
          version: groupVersion,
        });
        toast.success(`Saved changes to "${groupName.trim()}".`);
      }
      setEditingGroupId(null);
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof AccessApiError ? err.message : "Could not save SysAdmin access group.");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (group: SysAdminAccessGroupSummary) => {
    setDeletingGroupId(group.id);
    try {
      await accessApi.deleteSysAdminGroup(group.id);
      toast.success(`Deleted SysAdmin access group "${group.name}".`);
      if (editingGroupId === group.id) setEditingGroupId(null);
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof AccessApiError ? err.message : "Could not delete SysAdmin access group.");
    } finally {
      setDeletingGroupId(null);
    }
  };

  if (!open) return null;

  return (
    <div
      data-surface="owner"
      className="fixed inset-0 z-50 flex justify-end bg-black/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sysadmin-pma-drawer-title"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-4xl flex-col bg-board-plate text-ink border-l border-edge overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4 bg-board-ground">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-field-ink shrink-0" />
              <h2 id="sysadmin-pma-drawer-title" className="text-panel font-bold text-ink truncate">
                SysAdmin Access Management (PMA)
              </h2>
            </div>
            <p className="mt-1 text-label text-ink-muted">
              Dual-governance access control for IT Administrator accounts. SysAdmin accounts remain separate from business Staff.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void loadAll()}
              disabled={loading}
              aria-label="Reload SysAdmin PMA"
              className="min-h-11 min-w-11 grid place-items-center rounded-plate border border-edge bg-board-plate text-ink-muted hover:text-ink transition-colors"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close SysAdmin PMA"
              className="min-h-11 min-w-11 grid place-items-center rounded-plate border border-edge bg-board-plate text-ink-muted hover:text-ink transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-5 py-3 bg-board-plate">
          {(
            [
              { id: "accounts", label: `IT Admins (${accounts.length})`, icon: UsersRound },
              { id: "groups", label: `Access Groups (${groups.length})`, icon: KeyRound },
              { id: "audit", label: "PMA Audit Trail", icon: History },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 min-h-11 px-3.5 rounded-plate text-label font-medium transition-colors ${
                  active
                    ? "bg-board-field text-white"
                    : "bg-board-ground text-ink-muted hover:text-ink border border-edge"
                }`}
              >
                <Icon size={15} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {error && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-plate border border-status-act-ink/30 bg-status-act-fill px-4 py-3 text-label text-status-act-ink">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
              <PanelButton size="sm" variant="secondary" onClick={() => void loadAll()}>
                Try Again
              </PanelButton>
            </div>
          )}

          {loading && !catalog && (
            <div className="space-y-3" aria-busy="true">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-16 rounded-plate bg-board-ground animate-pulse border border-hairline" />
              ))}
            </div>
          )}

          {/* Tab 1: IT Admin Accounts */}
          {!loading && catalog && activeTab === "accounts" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left list */}
              <div className="lg:col-span-5 space-y-2">
                <p className="text-micro uppercase text-ink-muted px-1">
                  IT Administrator Roster
                </p>
                {accounts.length === 0 ? (
                  <div className="rounded-plate border border-hairline bg-board-ground p-5 text-center space-y-2">
                    <p className="text-label font-medium text-ink">No IT Administrator accounts found.</p>
                    <p className="text-micro text-ink-muted">
                      IT Administrator accounts are provisioned from the SysAdmin portal.
                    </p>
                  </div>
                ) : (
                  accounts.map((acct) => {
                    const isSelected = selectedAccount?.id === acct.id;
                    return (
                      <button
                        key={acct.id}
                        type="button"
                        onClick={() => selectAccountForEdit(acct)}
                        className={`w-full text-left rounded-plate border p-3.5 transition-colors ${
                          isSelected
                            ? "border-board-field bg-board-ground"
                            : "border-hairline bg-board-plate hover:bg-board-ground"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-label font-semibold text-ink truncate">
                              @{acct.username}
                            </p>
                            <p className="text-micro text-ink-muted truncate">
                              {acct.nickname || acct.email || `SysAdmin #${acct.id}`}
                            </p>
                          </div>
                          {acct.isMainSysAdmin ? (
                            <span className="inline-flex items-center gap-1 rounded-trim bg-status-done-fill px-2 py-0.5 text-[11px] font-medium text-status-done-ink shrink-0">
                              <Crown size={11} />
                              Root
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center rounded-trim px-2 py-0.5 text-[11px] font-medium shrink-0 ${
                                acct.status === "Active"
                                  ? "bg-status-done-fill text-status-done-ink"
                                  : "bg-status-act-fill text-status-act-ink"
                              }`}
                            >
                              {acct.status}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-micro text-ink-muted">
                          <span className="truncate">{acct.baselineName}</span>
                          <span>•</span>
                          <span className="font-mono">{acct.effectivePermissions.length}/19</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right inspector */}
              <div className="lg:col-span-7">
                {!selectedAccount ? (
                  <div className="rounded-plate border border-hairline bg-board-ground p-6 text-center text-label text-ink-muted">
                    Select an IT Administrator account to review or configure access.
                  </div>
                ) : selectedAccount.isMainSysAdmin ? (
                  <div className="rounded-plate border border-hairline bg-board-ground p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-panel font-bold text-ink">
                          @{selectedAccount.username}
                        </h3>
                        <p className="text-label text-ink-muted">
                          Root Main SysAdmin Account
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-status-done-fill px-3 py-1 text-micro font-semibold text-status-done-ink">
                        <Lock size={12} />
                        Root Protected
                      </span>
                    </div>
                    <div className="rounded-plate border border-edge bg-board-plate p-4 text-label text-ink-muted leading-relaxed">
                      Mutual Root Protection is active. The Main SysAdmin account permanently retains all 19 IT Admin capabilities and cannot be restricted, reassigned to a limited group, or suspended by secondary IT Admins or the Main Owner.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Group Assignment & Overrides Card */}
                    <div className="rounded-plate border border-hairline bg-board-ground p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-panel font-bold text-ink">
                            @{selectedAccount.username} Access Profile
                          </h3>
                          <p className="text-micro text-ink-muted">
                            Effective capabilities: <span className="font-mono font-semibold text-ink">{previewEffectiveKeys.length} / {catalog.allKeys.length}</span>
                          </p>
                        </div>
                        <PanelButton
                          variant="primary"
                          size="sm"
                          disabled={savingAccount || previewMissingDeps.length > 0}
                          onClick={() => void handleSaveAccountAccess()}
                          icon={<Save size={14} />}
                        >
                          {savingAccount ? "Saving..." : "Save Access"}
                        </PanelButton>
                      </div>

                      <div>
                        <label htmlFor="owner-sysadmin-group-select" className="block text-label font-medium text-ink mb-1.5">
                          Assigned Access Group
                        </label>
                        <select
                          id="owner-sysadmin-group-select"
                          value={draftGroupId === null ? "" : String(draftGroupId)}
                          onChange={(e) =>
                            setDraftGroupId(e.target.value === "" ? null : Number(e.target.value))
                          }
                          className="w-full min-h-11 rounded-plate border border-edge bg-board-plate px-3 text-label text-ink"
                        >
                          <option value="">Read-Only Monitoring (Default - 5 baseline permissions)</option>
                          {groups.map((g) => (
                            <option key={g.id} value={String(g.id)}>
                              {g.name} ({g.permissions.length} capabilities)
                            </option>
                          ))}
                        </select>
                      </div>

                      {previewMissingDeps.length > 0 && (
                        <div role="alert" className="rounded-plate border border-status-act-ink/30 bg-status-act-fill px-3.5 py-2.5 text-micro text-status-act-ink">
                          One or more enabled action permissions require their parent view permission before saving.
                        </div>
                      )}

                      <div className="space-y-4 pt-1">
                        {catalog.areas.map((area) => {
                          const areaItems = catalog.permissions.filter((p) => p.area === area);
                          return (
                            <div key={area} className="space-y-2">
                              <h4 className="text-micro uppercase font-semibold text-ink-muted">
                                {area}
                              </h4>
                              <div className="divide-y divide-hairline rounded-plate border border-hairline bg-board-plate">
                                {areaItems.map((perm) => {
                                  const override = draftOverrides.get(perm.key);
                                  const effective = previewEffectiveKeys.includes(perm.key);
                                  const inBase = baseEffectiveSet.has(perm.key);
                                  return (
                                    <div
                                      key={perm.key}
                                      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-label font-medium text-ink">{perm.label}</p>
                                        <p className="text-micro text-ink-muted">{perm.note}</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCycleOverride(perm.key)}
                                        className={`min-h-10 px-3 rounded-plate border text-micro font-semibold whitespace-nowrap transition-colors ${
                                          override === "GRANT"
                                            ? "bg-status-done-fill text-status-done-ink border-status-done-ink/30"
                                            : override === "DENY"
                                            ? "bg-status-act-fill text-status-act-ink border-status-act-ink/30"
                                            : effective
                                            ? "bg-board-ground text-ink border-edge"
                                            : "bg-board-plate text-ink-muted border-hairline"
                                        }`}
                                        title="Click to toggle per-account override"
                                      >
                                        {override === "GRANT"
                                          ? "Override: GRANT"
                                          : override === "DENY"
                                          ? "Override: DENY"
                                          : inBase
                                          ? "Inherited: Allow"
                                          : "Default: Blocked"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Account Status Enforcement Card */}
                    <div className="rounded-plate border border-hairline bg-board-ground p-4 space-y-3">
                      <h4 className="text-label font-semibold text-ink">
                        Account Standing
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="owner-sysadmin-status-select" className="block text-micro text-ink-muted mb-1">
                            Status
                          </label>
                          <select
                            id="owner-sysadmin-status-select"
                            value={draftStatus}
                            onChange={(e) =>
                              setDraftStatus(e.target.value as "Active" | "Suspended" | "Inactive")
                            }
                            className="w-full min-h-11 rounded-plate border border-edge bg-board-plate px-3 text-label text-ink"
                          >
                            <option value="Active">Active</option>
                            <option value="Suspended">Suspended (Terminates active sessions)</option>
                            <option value="Inactive">Inactive (Terminates active sessions)</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="owner-sysadmin-status-reason" className="block text-micro text-ink-muted mb-1">
                            Audit Reason (Optional)
                          </label>
                          <input
                            id="owner-sysadmin-status-reason"
                            type="text"
                            value={statusReason}
                            onChange={(e) => setStatusReason(e.target.value)}
                            placeholder="e.g. Temporary access restriction"
                            className="w-full min-h-11 rounded-plate border border-edge bg-board-plate px-3 text-label text-ink"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <PanelButton
                          variant="secondary"
                          size="sm"
                          disabled={savingStatus || draftStatus === selectedAccount.status}
                          onClick={() => void handleSaveAccountStatus()}
                          icon={<UserCheck size={14} />}
                        >
                          {savingStatus ? "Updating..." : "Update Account Status"}
                        </PanelButton>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: SysAdmin Access Groups */}
          {!loading && catalog && activeTab === "groups" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-label text-ink-muted">
                  Reusable role templates shared between Main Owner and Main SysAdmin.
                </p>
                <PanelButton
                  variant="primary"
                  size="sm"
                  onClick={startNewGroup}
                  icon={<Plus size={15} />}
                >
                  New SysAdmin Group
                </PanelButton>
              </div>

              {editingGroupId !== null && (
                <form
                  onSubmit={handleSaveGroup}
                  className="rounded-plate border border-board-field bg-board-ground p-4 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-panel font-bold text-ink">
                      {editingGroupId === "new" ? "Create SysAdmin Access Group" : `Edit "${groupName}"`}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingGroupId(null)}
                      className="min-h-10 min-w-10 grid place-items-center rounded-plate text-ink-muted hover:text-ink"
                      aria-label="Cancel editing group"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-micro text-ink-muted mb-1">Group Name</label>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g. Incident Responder"
                        className="w-full min-h-11 rounded-plate border border-edge bg-board-plate px-3 text-label text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-micro text-ink-muted mb-1">Description</label>
                      <input
                        type="text"
                        maxLength={255}
                        value={groupDescription}
                        onChange={(e) => setGroupDescription(e.target.value)}
                        placeholder="Short operational summary"
                        className="w-full min-h-11 rounded-plate border border-edge bg-board-plate px-3 text-label text-ink"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {catalog.areas.map((area) => {
                      const items = catalog.permissions.filter((p) => p.area === area);
                      return (
                        <div key={area} className="space-y-2">
                          <h4 className="text-micro uppercase font-semibold text-ink-muted">
                            {area}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {items.map((perm) => {
                              const checked = groupPermissions.has(perm.key);
                              return (
                                <button
                                  key={perm.key}
                                  type="button"
                                  onClick={() =>
                                    setGroupPermissions((prev) =>
                                      togglePermissionWithDependencies(prev, perm.key, catalog.permissions)
                                    )
                                  }
                                  className={`flex items-start gap-2.5 rounded-plate border p-3 text-left transition-colors ${
                                    checked
                                      ? "border-board-field bg-board-plate"
                                      : "border-hairline bg-board-plate/60 hover:bg-board-plate"
                                  }`}
                                >
                                  <span
                                    className={`mt-0.5 size-4 rounded-trim border flex items-center justify-center shrink-0 ${
                                      checked
                                        ? "bg-board-field border-board-field text-white"
                                        : "border-edge bg-board-ground"
                                    }`}
                                  >
                                    {checked && <Check size={11} />}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-label font-medium text-ink">
                                      {perm.label}
                                    </span>
                                    <span className="block text-micro text-ink-muted">
                                      {perm.note}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <PanelButton
                      type="button"
                      variant="secondary"
                      onClick={() => setEditingGroupId(null)}
                    >
                      Cancel
                    </PanelButton>
                    <PanelButton
                      type="submit"
                      variant="primary"
                      disabled={savingGroup}
                      icon={<Save size={15} />}
                    >
                      {savingGroup ? "Saving..." : `Save Group (${groupPermissions.size} permissions)`}
                    </PanelButton>
                  </div>
                </form>
              )}

              {groups.length === 0 ? (
                <div className="rounded-plate border border-hairline bg-board-ground p-6 text-center space-y-3">
                  <p className="text-label font-medium text-ink">No custom SysAdmin access groups yet.</p>
                  <p className="text-micro text-ink-muted">
                    Secondary IT Admins start on the Read-Only Monitoring baseline until assigned a group.
                  </p>
                  <PanelButton variant="primary" size="sm" onClick={startNewGroup} icon={<Plus size={14} />}>
                    Create First Group
                  </PanelButton>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {groups.map((g) => (
                    <div
                      key={g.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-plate border border-hairline bg-board-ground p-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-label font-semibold text-ink">{g.name}</h4>
                          <span className="rounded-trim bg-board-plate border border-edge px-2 py-0.5 text-[11px] font-mono text-ink-muted">
                            {g.permissions.length}/19 keys
                          </span>
                          <span className="rounded-trim bg-board-plate border border-edge px-2 py-0.5 text-[11px] font-mono text-ink-muted">
                            {g.memberCount} members
                          </span>
                        </div>
                        {g.description && (
                          <p className="mt-1 text-micro text-ink-muted">{g.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <PanelButton
                          size="sm"
                          variant="secondary"
                          onClick={() => startEditGroup(g)}
                        >
                          Edit
                        </PanelButton>
                        <PanelButton
                          size="sm"
                          variant="danger-ghost"
                          disabled={deletingGroupId === g.id || g.memberCount > 0}
                          onClick={() => void handleDeleteGroup(g)}
                          title={g.memberCount > 0 ? "Reassign all members before deleting" : "Delete group"}
                          icon={<Trash2 size={14} />}
                        >
                          Delete
                        </PanelButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Audit Trail */}
          {!loading && activeTab === "audit" && (
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <div className="rounded-plate border border-hairline bg-board-ground p-6 text-center text-label text-ink-muted">
                  No SysAdmin PMA modifications have been recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-hairline rounded-plate border border-hairline bg-board-ground">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3.5 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-trim bg-board-plate border border-edge px-2 py-0.5 text-[11px] font-mono font-semibold text-ink">
                            {log.action}
                          </span>
                          <span className="text-label font-medium text-ink">
                            {log.actorRole === "OWNER" ? "Main Owner" : "Main SysAdmin"} (@{log.actorUsername})
                          </span>
                        </div>
                        <span className="text-micro font-mono text-ink-muted">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-micro text-ink-muted">
                        Target: <span className="text-ink font-medium">{log.targetUsername || log.groupName || "SysAdmin PMA"}</span>
                        {" • "}
                        {log.oldValue ? `${log.oldValue} -> ` : ""}
                        {log.newValue || "Removed"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
