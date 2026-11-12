import * as React from "react";
import {
  accessApi,
  type AccessCatalog,
  type AccessGroup,
  type PermissionDefinition,
  type PermissionScope,
} from "../../../../services/accessApi";

/**
 * Shared by Settings > Access groups and Settings > Account access: the
 * catalog and the group list, loaded together, and the catalog arithmetic
 * the two editors both need. Nothing here names a permission key; whatever
 * the server's catalog lists is what both screens render.
 */

export const SCOPE_LABEL: Record<PermissionScope, string> = {
  OWNER: "Admin",
  DISPATCHER: "Dispatcher",
};

type LoadState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: null; error: string };

export function useAccessCatalog() {
  const [state, setState] = React.useState<LoadState<{ catalog: AccessCatalog; groups: AccessGroup[] }>>({
    status: "loading",
    data: null,
    error: null,
  });

  const load = React.useCallback(async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const [catalog, groups] = await Promise.all([accessApi.getCatalog(), accessApi.listGroups()]);
      setState({ status: "ready", data: { catalog, groups }, error: null });
    } catch (err) {
      setState({ status: "error", data: null, error: err instanceof Error ? err.message : "Access could not be loaded." });
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  /** Replace one group in place after a save, without a full reload. */
  const upsertGroup = React.useCallback((group: AccessGroup) => {
    setState((current) =>
      current.status !== "ready"
        ? current
        : {
            ...current,
            data: {
              ...current.data,
              groups: current.data.groups.some((g) => g.id === group.id)
                ? current.data.groups.map((g) => (g.id === group.id ? group : g))
                : [...current.data.groups, group].sort((a, b) => a.name.localeCompare(b.name)),
            },
          },
    );
  }, []);

  const removeGroup = React.useCallback((id: number) => {
    setState((current) =>
      current.status !== "ready"
        ? current
        : { ...current, data: { ...current.data, groups: current.data.groups.filter((g) => g.id !== id) } },
    );
  }, []);

  return { ...state, reload: load, upsertGroup, removeGroup };
}

export function permissionsFor(catalog: AccessCatalog, scope: PermissionScope): PermissionDefinition[] {
  return catalog.permissions.filter((p) => p.scope === scope);
}

/** In catalog order, area by area. */
export function byArea(permissions: PermissionDefinition[]): Array<{ area: string; items: PermissionDefinition[] }> {
  const areas: Array<{ area: string; items: PermissionDefinition[] }> = [];
  for (const permission of permissions) {
    const existing = areas.find((a) => a.area === permission.area);
    if (existing) existing.items.push(permission);
    else areas.push({ area: permission.area, items: [permission] });
  }
  return areas;
}

/**
 * Turning a key on turns on what it requires; turning one off turns off what
 * requires it. Follows chains, so the catalog can nest requirements freely.
 */
export function toggleKey(
  keys: ReadonlySet<string>,
  key: string,
  on: boolean,
  permissions: PermissionDefinition[],
): Set<string> {
  const next = new Set(keys);
  const byKey = new Map(permissions.map((p) => [p.key, p]));
  const visit = (k: string) => {
    if (on) {
      if (next.has(k)) return;
      next.add(k);
      for (const req of byKey.get(k)?.requires ?? []) visit(req);
    } else {
      if (!next.has(k)) return;
      next.delete(k);
      for (const p of permissions) if (p.requires?.includes(k)) visit(p.key);
    }
  };
  visit(key);
  return next;
}

/** In catalog order, so a draft compares equal however it was ticked. */
export function orderedKeys(keys: ReadonlySet<string>, permissions: PermissionDefinition[]): string[] {
  return permissions.filter((p) => keys.has(p.key)).map((p) => p.key);
}

export function readDraft<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: unknown | null): void {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The draft lives until a tab switch instead; nothing to report.
  }
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
