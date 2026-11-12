import * as React from "react";
import { Check, Lock, Plus, RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog, Field, fieldInputClasses, PanelButton, PanelState } from "@/components/panel";
import {
  AccessApiError,
  accessApi,
  type AccessGroup,
  type PermissionDefinition,
  type PermissionScope,
} from "../../../../services/accessApi";
import { ChoiceGroup } from "./ChoiceGroup";
import {
  SCOPE_LABEL,
  byArea,
  orderedKeys,
  permissionsFor,
  plural,
  readDraft,
  toggleKey,
  useAccessCatalog,
  writeDraft,
} from "./accessShared";

/**
 * Settings > Access groups (Main Owner only).
 *
 * A group is a named checklist for one role. "Full access" is built in, read
 * only, and is what every account with no group gets, including keys added
 * to the catalog later. Edits are drafts kept per group in sessionStorage, so
 * moving between groups or tabs never loses them.
 */

type Selection = "full" | "new" | number;

interface Draft {
  name: string;
  description: string;
  keys: string[];
}

const draftKey = (scope: PermissionScope, id: number | "new") => `sugo:access-group-draft:${scope}:${id}`;

const SCOPE_CHOICES = [
  { value: "OWNER" as const, label: "Admin groups" },
  { value: "DISPATCHER" as const, label: "Dispatcher groups" },
];

function PermissionChecklist({
  permissions,
  checked,
  onToggle,
  locked,
}: {
  permissions: PermissionDefinition[];
  checked: ReadonlySet<string>;
  onToggle?: (key: string, on: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className="space-y-5">
      {byArea(permissions).map(({ area, items }) => (
        <fieldset key={area}>
          <legend className="mb-2 text-micro uppercase text-ink-muted">{area}</legend>
          <div className="divide-y divide-hairline rounded-plate border border-edge">
            {items.map((permission) => {
              const on = checked.has(permission.key);
              const id = `perm-${permission.key}`;
              return (
                <label
                  key={permission.key}
                  htmlFor={id}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5",
                    locked ? "cursor-default" : "cursor-pointer hover:bg-board-ground",
                  )}
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={on}
                    disabled={locked}
                    onChange={(event) => onToggle?.(permission.key, event.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--color-field-ink)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-label text-ink">{permission.title}</span>
                    <span className="block text-body text-ink-muted">{permission.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function GroupEditor({
  scope,
  permissions,
  group,
  onSaved,
  onDraftChange,
  onDeleted,
  onOpenAccounts,
}: {
  scope: PermissionScope;
  permissions: PermissionDefinition[];
  /** Null for a new group. */
  group: AccessGroup | null;
  onSaved: (group: AccessGroup) => void;
  onDeleted: (id: number) => void;
  onOpenAccounts: () => void;
  /** The list marks groups with unsaved drafts, so it re-reads on every change. */
  onDraftChange: () => void;
}) {
  const storageKey = draftKey(scope, group?.id ?? "new");
  const saved: Draft = React.useMemo(
    () => ({ name: group?.name ?? "", description: group?.description ?? "", keys: group?.permissions ?? [] }),
    [group],
  );
  const [draft, setDraft] = React.useState<Draft>(() => readDraft<Draft>(storageKey) ?? saved);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [conflict, setConflict] = React.useState<AccessGroup | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [memberBlock, setMemberBlock] = React.useState<string | null>(null);
  const [justSaved, setJustSaved] = React.useState(false);

  const keys = React.useMemo(() => new Set(draft.keys), [draft.keys]);
  const dirty =
    draft.name.trim() !== saved.name ||
    draft.description.trim() !== (saved.description ?? "") ||
    orderedKeys(keys, permissions).join(",") !== orderedKeys(new Set(saved.keys), permissions).join(",");

  // Written before the parent redraws, so its "Unsaved" marker reads the new draft.
  const update = (patch: Partial<Draft>) => {
    setJustSaved(false);
    const next = { ...draft, ...patch };
    writeDraft(storageKey, next);
    setDraft(next);
    onDraftChange();
  };

  const discard = () => {
    writeDraft(storageKey, null);
    onDraftChange();
    setDraft(saved);
    setError(null);
    setConflict(null);
  };

  const nameError = draft.name.trim() ? null : "Give the group a name.";

  const save = async (version?: number) => {
    if (nameError) {
      setError(nameError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        permissions: orderedKeys(keys, permissions),
      };
      const result = group
        ? await accessApi.updateGroup(group.id, { ...body, version: version ?? group.version })
        : await accessApi.createGroup({ ...body, scope });
      writeDraft(storageKey, null);
      setConflict(null);
      setJustSaved(true);
      onDraftChange();
      onSaved(result);
    } catch (err) {
      if (err instanceof AccessApiError && err.code === "VERSION_CONFLICT") {
        const latest = (err.details as { latest?: AccessGroup } | null)?.latest ?? null;
        setConflict(latest);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "The group could not be saved.");
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!group) return;
    setBusy(true);
    try {
      await accessApi.deleteGroup(group.id);
      writeDraft(storageKey, null);
      setConfirmDelete(false);
      onDeleted(group.id);
    } catch (err) {
      setConfirmDelete(false);
      if (err instanceof AccessApiError && err.code === "GROUP_HAS_MEMBERS") setMemberBlock(err.message);
      else setError(err instanceof Error ? err.message : "The group could not be deleted.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {conflict ? (
        <div role="alert" className="space-y-3 rounded-plate bg-status-waiting-fill px-4 py-3 text-label text-status-waiting-ink">
          <p className="flex items-start gap-2">
            <TriangleAlert size={16} className="mt-px shrink-0" />
            Someone else changed this group while you were editing. Your edits are kept here.
          </p>
          <div className="flex flex-wrap gap-2">
            <PanelButton size="sm" variant="secondary" disabled={busy} onClick={() => void save(conflict.version)}>
              Save mine over theirs
            </PanelButton>
            <PanelButton
              size="sm"
              variant="subtle"
              disabled={busy}
              onClick={() => {
                writeDraft(storageKey, null);
                setDraft({ name: conflict.name, description: conflict.description ?? "", keys: conflict.permissions });
                setConflict(null);
                onSaved(conflict);
              }}
            >
              Use their version
            </PanelButton>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Group name" required error={draft.name && nameError ? nameError : null}>
          {(control) => (
            <input
              {...control}
              type="text"
              maxLength={60}
              value={draft.name}
              placeholder={scope === "OWNER" ? "Finance viewer" : "Junior dispatcher"}
              onChange={(event) => update({ name: event.target.value })}
              className={fieldInputClasses}
            />
          )}
        </Field>
        <Field label="Description" hint="Optional. Who this group is for.">
          {(control) => (
            <input
              {...control}
              type="text"
              maxLength={255}
              value={draft.description}
              onChange={(event) => update({ description: event.target.value })}
              className={fieldInputClasses}
            />
          )}
        </Field>
      </div>

      {group ? (
        <p className="text-label text-ink-muted">
          {group.memberCount > 0 ? (
            <>
              {plural(group.memberCount, "account uses", "accounts use")} this group. Saving changes what they can do right away.{" "}
              <button type="button" onClick={onOpenAccounts} className="cursor-pointer text-field-ink underline underline-offset-2">
                Open Account access
              </button>
            </>
          ) : (
            "No account uses this group yet. Assign it in Account access."
          )}
        </p>
      ) : null}

      <PermissionChecklist
        permissions={permissions}
        checked={keys}
        onToggle={(key, on) => update({ keys: orderedKeys(toggleKey(keys, key, on, permissions), permissions) })}
      />

      {keys.size === 0 ? (
        <p className="flex items-start gap-1.5 text-label text-status-waiting-ink">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          With nothing ticked, accounts in this group can open Settings and nothing else.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink">
          {error}
        </p>
      ) : null}
      {memberBlock ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-plate bg-status-waiting-fill px-3 py-2 text-label text-status-waiting-ink">
          <span className="min-w-0 flex-1">{memberBlock}</span>
          <PanelButton size="sm" variant="secondary" onClick={onOpenAccounts}>
            Open Account access
          </PanelButton>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
        <PanelButton
          variant="field"
          loading={busy}
          loadingText="Saving"
          disabled={!dirty && Boolean(group)}
          icon={<Check size={15} />}
          onClick={() => void save()}
        >
          {group ? "Save group" : "Create group"}
        </PanelButton>
        {dirty && group ? (
          <PanelButton variant="secondary" icon={<RotateCcw size={14} />} disabled={busy} onClick={discard}>
            Discard changes
          </PanelButton>
        ) : null}
        {justSaved && !dirty ? (
          <span role="status" className="flex items-center gap-1 text-label text-status-done-ink">
            <Check size={14} /> Saved
          </span>
        ) : null}
        {group ? (
          <PanelButton
            variant="danger-ghost"
            className="ml-auto"
            icon={<Trash2 size={14} />}
            disabled={busy}
            onClick={() => {
              setMemberBlock(null);
              setConfirmDelete(true);
            }}
          >
            Delete group
          </PanelButton>
        ) : null}
      </div>

      {group ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete ${group.name}?`}
          body="The group and its checklist are removed. This cannot be undone."
          consequence={
            group.memberCount > 0
              ? `${plural(group.memberCount, "account is", "accounts are")} still in it, so the server will refuse until they are moved.`
              : undefined
          }
          confirmLabel="Delete group"
          tone="danger"
          busy={busy}
          onConfirm={() => void remove()}
        />
      ) : null}
    </div>
  );
}

export function AccessGroupsSettings({ onOpenAccounts }: { onOpenAccounts: () => void }) {
  const access = useAccessCatalog();
  const [scope, setScope] = React.useState<PermissionScope>("OWNER");
  const [selected, setSelected] = React.useState<Selection>("full");
  const [, redraw] = React.useReducer((n: number) => n + 1, 0);

  const permissions = access.data ? permissionsFor(access.data.catalog, scope) : [];
  const groups = access.data ? access.data.groups.filter((g) => g.scope === scope) : [];
  const selectedGroup = typeof selected === "number" ? groups.find((g) => g.id === selected) ?? null : null;
  const fullAccessName = access.data?.catalog.fullAccessName ?? "Full access";

  // A group deleted elsewhere, or a role switch: fall back to the built-in row.
  React.useEffect(() => {
    if (typeof selected === "number" && access.status === "ready" && !selectedGroup) setSelected("full");
  }, [selected, selectedGroup, access.status]);

  const rowClass = (active: boolean) =>
    cn(
      "flex w-full cursor-pointer items-center gap-2 rounded-trim px-3 py-2.5 text-left transition-colors",
      active ? "bg-board-field text-white" : "text-ink hover:bg-board-ground",
    );

  return (
    <div className="space-y-4 pb-8">
      <ChoiceGroup
        label="Which role's groups"
        choices={SCOPE_CHOICES}
        value={scope}
        onChange={(value) => {
          setScope(value);
          setSelected("full");
        }}
        className="max-w-md"
      />

      <PanelState
        isLoading={access.status === "loading"}
        error={access.status === "error" ? access.error : null}
        errorTitle="Access groups did not load"
        onRetry={() => void access.reload()}
        loadingRows={4}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
          <nav aria-label={`${SCOPE_LABEL[scope]} groups`} className="min-w-0 rounded-plate border border-edge bg-board-plate p-2">
            <ul className="space-y-1 lg:max-h-[60vh] lg:overflow-y-auto">
              <li>
                <button type="button" className={rowClass(selected === "full")} onClick={() => setSelected("full")}>
                  <Lock size={14} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-label">{fullAccessName}</span>
                  <span className={cn("shrink-0 text-micro uppercase", selected === "full" ? "text-board-trim" : "text-ink-muted")}>
                    Built in
                  </span>
                </button>
              </li>
              {groups.map((group) => {
                const active = selected === group.id;
                const hasDraft = readDraft(draftKey(scope, group.id)) !== null;
                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      className={rowClass(active)}
                      title={group.name}
                      onClick={() => setSelected(group.id)}
                    >
                      <span className="min-w-0 flex-1 truncate text-label">{group.name}</span>
                      {hasDraft ? (
                        <span className={cn("shrink-0 text-micro uppercase", active ? "text-board-trim" : "text-status-waiting-ink")}>
                          Unsaved
                        </span>
                      ) : null}
                      <span data-figure className={cn("shrink-0 text-micro", active ? "text-board-trim" : "text-ink-muted")}>
                        {group.memberCount}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {groups.length === 0 ? (
              <p className="px-3 pb-2 pt-3 text-body text-ink-muted">
                Everyone has {fullAccessName}. Create a group to limit what an account can see.
              </p>
            ) : null}
            <div className="mt-2 border-t border-hairline pt-2">
              <button type="button" className={rowClass(selected === "new")} onClick={() => setSelected("new")}>
                <Plus size={14} className="shrink-0" />
                <span className="text-label">New {SCOPE_LABEL[scope]} group</span>
              </button>
            </div>
          </nav>

          <section
            aria-label={
              selected === "full" ? fullAccessName : selected === "new" ? "New group" : selectedGroup?.name ?? "Group"
            }
            className="min-w-0 rounded-plate border border-edge bg-board-plate p-5"
          >
            {selected === "full" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="flex items-center gap-2 text-panel text-ink">
                    <Lock size={16} className="shrink-0 text-ink-muted" /> {fullAccessName}
                  </h2>
                  <p className="mt-1 max-w-2xl text-body text-ink-muted">
                    Every {SCOPE_LABEL[scope]} permission, including any added later. An account with no group uses this
                    one, which is how every account worked before groups existed. It cannot be edited.
                    {scope === "OWNER" ? " The Main Owner is always here." : ""}
                  </p>
                </div>
                <PermissionChecklist permissions={permissions} checked={new Set(permissions.map((p) => p.key))} locked />
              </div>
            ) : (
              <GroupEditor
                key={`${scope}:${selected}`}
                scope={scope}
                permissions={permissions}
                group={selected === "new" ? null : selectedGroup}
                onSaved={(group) => {
                  access.upsertGroup(group);
                  setSelected(group.id);
                }}
                onDeleted={(id) => {
                  access.removeGroup(id);
                  setSelected("full");
                }}
                onOpenAccounts={onOpenAccounts}
                onDraftChange={redraw}
              />
            )}
          </section>
        </div>
      </PanelState>
    </div>
  );
}
