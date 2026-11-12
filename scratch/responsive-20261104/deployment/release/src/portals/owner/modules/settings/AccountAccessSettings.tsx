import * as React from "react";
import { Check, Crown, RotateCcw, TriangleAlert } from "lucide-react";
import { useSearchParams } from "react-router";
import { cn } from "@/lib/utils";
import { Field, fieldInputClasses, PanelButton, PanelState, SearchField } from "@/components/panel";
import {
  accessApi,
  type AccessAccount,
  type PermissionDefinition,
  type PermissionEffect,
  type PermissionOverride,
} from "../../../../services/accessApi";
import { ChoiceGroup } from "./ChoiceGroup";
import { SCOPE_LABEL, byArea, permissionsFor, plural, readDraft, useAccessCatalog, writeDraft } from "./accessShared";

/**
 * Settings > Account access (Main Owner only): which group each Admin and
 * dispatcher account is in, and its exceptions to that group.
 *
 * Each permission is Inherit (whatever the group says, shown beside it),
 * Allow or Deny. The preview under the list is what the account will be able
 * to do once saved, computed the way the server computes it. The Main Owner's
 * own row is pinned at the top and cannot be changed.
 */

type RoleFilter = "ALL" | "OWNER" | "DISPATCHER";
type Choice3 = "INHERIT" | PermissionEffect;

interface Draft {
  accessGroupId: number | null;
  overrides: PermissionOverride[];
}

const draftKey = (userId: number) => `sugo:account-access-draft:${userId}`;

const ROLE_FILTERS = [
  { value: "ALL" as const, label: "All" },
  { value: "OWNER" as const, label: "Admins" },
  { value: "DISPATCHER" as const, label: "Dispatchers" },
];

function sameDraft(a: Draft, b: Draft): boolean {
  if (a.accessGroupId !== b.accessGroupId) return false;
  const key = (d: Draft) =>
    [...d.overrides]
      .sort((x, y) => x.permissionKey.localeCompare(y.permissionKey))
      .map((o) => `${o.permissionKey}:${o.effect}`)
      .join(",");
  return key(a) === key(b);
}

function TriState({
  value,
  inherited,
  onChange,
  name,
}: {
  value: Choice3;
  inherited: boolean;
  onChange: (value: Choice3) => void;
  name: string;
}) {
  const options: Array<{ value: Choice3; label: string }> = [
    { value: "INHERIT", label: `Inherit (${inherited ? "on" : "off"})` },
    { value: "GRANT", label: "Allow" },
    { value: "DENY", label: "Deny" },
  ];
  return (
    <div role="radiogroup" aria-label={name} className="flex shrink-0 overflow-hidden rounded-trim border border-edge">
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-8 cursor-pointer whitespace-nowrap border-l border-hairline px-2.5 text-micro transition-colors first:border-l-0",
              checked
                ? option.value === "DENY"
                  ? "bg-status-act-fill text-status-act-ink"
                  : option.value === "GRANT"
                    ? "bg-status-done-fill text-status-done-ink"
                    : "bg-board-field text-white"
                : "text-ink-muted hover:bg-board-ground hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function AccountEditor({
  account,
  permissions,
  groups,
  fullAccessName,
  onSaved,
  onDraftChange,
}: {
  account: AccessAccount;
  permissions: PermissionDefinition[];
  groups: Array<{ id: number; name: string; permissions: string[] }>;
  fullAccessName: string;
  onSaved: (account: AccessAccount) => void;
  /** The list marks accounts with unsaved drafts, so it re-reads on every change. */
  onDraftChange: () => void;
}) {
  const saved: Draft = React.useMemo(
    () => ({ accessGroupId: account.group.id, overrides: account.overrides }),
    [account],
  );
  const [draft, setDraft] = React.useState<Draft>(() => readDraft<Draft>(draftKey(account.id)) ?? saved);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [justSaved, setJustSaved] = React.useState(false);

  const groupKeys = React.useMemo(() => {
    if (draft.accessGroupId === null) return new Set(permissions.map((p) => p.key));
    return new Set(groups.find((g) => g.id === draft.accessGroupId)?.permissions ?? []);
  }, [draft.accessGroupId, groups, permissions]);
  const effectByKey = new Map(draft.overrides.map((o) => [o.permissionKey, o.effect]));
  const effective = permissions.filter((p) => {
    const effect = effectByKey.get(p.key);
    return effect === "GRANT" || (effect !== "DENY" && groupKeys.has(p.key));
  });
  const dirty = !sameDraft(draft, saved);
  const groupMissing = draft.accessGroupId !== null && !groups.some((g) => g.id === draft.accessGroupId);

  const update = (next: Draft) => {
    setJustSaved(false);
    setDraft(next);
    writeDraft(draftKey(account.id), sameDraft(next, saved) ? null : next);
    onDraftChange();
  };

  const setChoice = (key: string, choice: Choice3) => {
    const rest = draft.overrides.filter((o) => o.permissionKey !== key);
    update({ ...draft, overrides: choice === "INHERIT" ? rest : [...rest, { permissionKey: key, effect: choice }] });
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await accessApi.updateAccountAccess(account.id, draft);
      writeDraft(draftKey(account.id), null);
      setJustSaved(true);
      onDraftChange();
      onSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This account's access could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="truncate text-panel text-ink" title={account.name}>
          {account.name}
        </h2>
        <p className="mt-0.5 text-label text-ink-muted">
          @{account.username} · {SCOPE_LABEL[account.role]}
          {account.status !== "Active" ? ` · ${account.status}` : ""}
        </p>
      </div>

      <Field
        label="Access group"
        hint="Overrides below apply on top of the group."
        error={groupMissing ? "That group was deleted. Pick another one." : null}
      >
        {(control) => (
          <select
            {...control}
            value={draft.accessGroupId ?? ""}
            onChange={(event) =>
              update({ ...draft, accessGroupId: event.target.value ? Number(event.target.value) : null })
            }
            className={cn(fieldInputClasses, "max-w-sm")}
          >
            <option value="">{fullAccessName}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="space-y-5">
        {byArea(permissions).map(({ area, items }) => (
          <fieldset key={area}>
            <legend className="mb-2 text-micro uppercase text-ink-muted">{area}</legend>
            <div className="divide-y divide-hairline rounded-plate border border-edge">
              {items.map((permission) => (
                <div key={permission.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
                  <div className="min-w-48 flex-1">
                    <p className="text-label text-ink">{permission.title}</p>
                    <p className="text-body text-ink-muted">{permission.description}</p>
                  </div>
                  <TriState
                    name={permission.title}
                    value={effectByKey.get(permission.key) ?? "INHERIT"}
                    inherited={groupKeys.has(permission.key)}
                    onChange={(choice) => setChoice(permission.key, choice)}
                  />
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="rounded-plate bg-board-ground px-4 py-3">
        <p className="text-micro uppercase text-ink-muted">After saving</p>
        <p className="mt-1 text-body text-ink">
          {effective.length === 0
            ? "This account can open Settings and nothing else."
            : `Can use ${effective.length} of ${permissions.length}: ${effective.map((p) => p.title).join(", ")}.`}
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
        <PanelButton
          variant="field"
          loading={busy}
          loadingText="Saving"
          disabled={!dirty || groupMissing}
          icon={<Check size={15} />}
          onClick={() => void save()}
        >
          Save access
        </PanelButton>
        {dirty ? (
          <PanelButton variant="secondary" icon={<RotateCcw size={14} />} disabled={busy} onClick={() => update(saved)}>
            Discard changes
          </PanelButton>
        ) : null}
        {justSaved && !dirty ? (
          <span role="status" className="flex items-center gap-1 text-label text-status-done-ink">
            <Check size={14} /> Saved. Their portal updates right away.
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AccountAccessSettings() {
  const access = useAccessCatalog();
  const [accounts, setAccounts] = React.useState<AccessAccount[] | null>(null);
  const [accountsError, setAccountsError] = React.useState<string | null>(null);
  // Users links here with ?account=<id> to open that account directly.
  const [params] = useSearchParams();
  const [selectedId, setSelectedId] = React.useState<number | null>(() => {
    const id = Number(params.get("account"));
    return Number.isInteger(id) && id > 0 ? id : null;
  });
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("ALL");
  const [, redraw] = React.useReducer((n: number) => n + 1, 0);

  const loadAccounts = React.useCallback(async () => {
    setAccounts(null);
    setAccountsError(null);
    try {
      setAccounts(await accessApi.listAccounts());
    } catch (err) {
      setAccountsError(err instanceof Error ? err.message : "Accounts could not be loaded.");
    }
  }, []);

  React.useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const mainOwner = accounts?.find((a) => a.isMainOwner) ?? null;
  const term = search.trim().toLowerCase();
  const rows = (accounts ?? []).filter(
    (a) =>
      !a.isMainOwner &&
      (roleFilter === "ALL" || a.role === roleFilter) &&
      (!term || a.name.toLowerCase().includes(term) || a.username.toLowerCase().includes(term)),
  );
  const selected = accounts?.find((a) => a.id === selectedId && !a.isMainOwner) ?? null;
  const catalog = access.data?.catalog;
  const fullAccessName = catalog?.fullAccessName ?? "Full access";

  const loading = access.status === "loading" || (accounts === null && !accountsError);
  const error = access.status === "error" ? access.error : accountsError;

  return (
    <div className="space-y-4 pb-8">
      <PanelState
        isLoading={loading}
        error={error}
        errorTitle="Account access did not load"
        onRetry={() => {
          if (access.status === "error") void access.reload();
          void loadAccounts();
        }}
        isEmpty={(accounts ?? []).filter((a) => !a.isMainOwner).length === 0}
        emptyTitle="No other Admin or dispatcher accounts"
        emptyBody="Accounts you create in Users appear here, ready for a group."
        loadingRows={5}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          {/* min-w-0: a grid item will not shrink below its content otherwise,
              and the filter row at large text is wider than a phone. */}
          <div className="min-w-0 space-y-3">
            {mainOwner ? (
              <div className="flex items-center gap-3 rounded-plate border border-edge bg-board-plate px-3 py-2.5">
                <Crown size={16} className="shrink-0 text-status-waiting-ink" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label text-ink" title={mainOwner.name}>
                    {mainOwner.name}
                  </p>
                  <p className="text-micro uppercase text-ink-muted">Main Owner, always full access</p>
                </div>
              </div>
            ) : null}

            <SearchField
              aria-label="Search accounts"
              placeholder="Search by name or username"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <ChoiceGroup label="Show" choices={ROLE_FILTERS} value={roleFilter} onChange={(value) => setRoleFilter(value)} />

            <ul aria-label="Accounts" className="divide-y divide-hairline rounded-plate border border-edge bg-board-plate lg:max-h-[56vh] lg:overflow-y-auto">
              {rows.map((account) => {
                const active = account.id === selectedId;
                const hasDraft = readDraft(draftKey(account.id)) !== null;
                return (
                  <li key={account.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(account.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        active ? "bg-board-field text-white" : "hover:bg-board-ground",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-label", active ? "text-white" : "text-ink")} title={account.name}>
                          {account.name}
                        </span>
                        <span className={cn("block truncate text-micro", active ? "text-board-trim" : "text-ink-muted")}>
                          {SCOPE_LABEL[account.role]} · {account.group.name}
                          {account.overrides.length > 0 ? ` · ${plural(account.overrides.length, "override", "overrides")}` : ""}
                          {account.status !== "Active" ? ` · ${account.status}` : ""}
                        </span>
                      </span>
                      {hasDraft ? (
                        <span className={cn("shrink-0 text-micro uppercase", active ? "text-board-trim" : "text-status-waiting-ink")}>
                          Unsaved
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {rows.length === 0 ? (
              <div className="flex flex-col items-start gap-2 px-1">
                <p className="text-body text-ink-muted">No account matches these filters.</p>
                <PanelButton
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("ALL");
                  }}
                >
                  Clear filters
                </PanelButton>
              </div>
            ) : null}
          </div>

          <section aria-label="Account access editor" className="min-w-0 rounded-plate border border-edge bg-board-plate p-5">
            {selected && catalog ? (
              <AccountEditor
                key={selected.id}
                account={selected}
                permissions={permissionsFor(catalog, selected.role)}
                groups={(access.data?.groups ?? []).filter((g) => g.scope === selected.role)}
                fullAccessName={fullAccessName}
                onDraftChange={redraw}
                onSaved={(updated) => setAccounts((current) => current?.map((a) => (a.id === updated.id ? updated : a)) ?? null)}
              />
            ) : (
              <div className="flex flex-col items-start gap-2 py-6">
                <p className="text-panel text-ink">Pick an account</p>
                <p className="max-w-md text-body text-ink-muted">
                  Choose who to change on the left. A new group is made in Access groups, then assigned here.
                </p>
                {(access.data?.groups.length ?? 0) === 0 ? (
                  <p className="mt-1 flex items-start gap-1.5 text-label text-status-waiting-ink">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                    There are no groups yet, so every account has {fullAccessName}. Overrides still work on their own.
                  </p>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </PanelState>
    </div>
  );
}
