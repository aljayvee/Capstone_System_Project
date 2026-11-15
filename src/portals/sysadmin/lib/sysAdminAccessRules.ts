/**
 * Pure SysAdmin PMA helpers shared between SysAdminPortal, ItStaffModule,
 * Owner Portal's SysAdminPmaDrawer, and automated unit tests.
 */

export const SYSADMIN_READ_ONLY_BASELINE_KEYS: readonly string[] = [
  "telemetry.view",
  "traffic.view",
  "logs.view",
  "audit.view",
  "incidents.view",
];

export interface SysAdminPermissionRuleItem {
  readonly key: string;
  readonly label?: string;
  readonly requires?: readonly string[];
}

export interface SysAdminOverrideRuleEntry {
  readonly permissionKey: string;
  readonly effect: "GRANT" | "DENY";
}

/**
 * Mirrors server-side `resolveSysAdminPermissions`:
 * - Root Main SysAdmin always holds every key.
 * - Secondary IT Admin without an assigned group defaults to the 5 Read-Only
 *   Monitoring keys.
 * - Applies per-account GRANT/DENY overrides on top.
 */
export function resolveSysAdminEffectiveKeys(
  groupKeys: readonly string[] | null,
  overrides: readonly SysAdminOverrideRuleEntry[],
  allCatalogKeys: readonly string[],
  isMainSysAdmin: boolean
): string[] {
  if (isMainSysAdmin) {
    return [...allCatalogKeys];
  }

  const catalogSet = new Set(allCatalogKeys);
  const held = new Set<string>(
    (groupKeys ?? SYSADMIN_READ_ONLY_BASELINE_KEYS).filter((k) => catalogSet.has(k))
  );

  for (const ov of overrides) {
    if (!catalogSet.has(ov.permissionKey)) continue;
    if (ov.effect === "GRANT") held.add(ov.permissionKey);
    else if (ov.effect === "DENY") held.delete(ov.permissionKey);
  }

  return allCatalogKeys.filter((k) => held.has(k));
}

/**
 * Toggles a capability inside a group editor while honoring dependency links:
 * - Enabling an action permission automatically enables any parent `requires` view key.
 * - Disabling a parent view permission automatically disables dependent action keys.
 */
export function togglePermissionWithDependencies(
  currentKeys: ReadonlySet<string>,
  targetKey: string,
  catalog: readonly SysAdminPermissionRuleItem[]
): Set<string> {
  const next = new Set(currentKeys);
  const byKey = new Map(catalog.map((c) => [c.key, c]));

  if (next.has(targetKey)) {
    // Turn off targetKey and anything that depends on it (transitively).
    const queue = [targetKey];
    while (queue.length > 0) {
      const k = queue.shift()!;
      if (!next.has(k)) continue;
      next.delete(k);
      for (const item of catalog) {
        if (item.requires?.includes(k) && next.has(item.key)) {
          queue.push(item.key);
        }
      }
    }
  } else {
    // Turn on targetKey and all its `requires` ancestors.
    const queue = [targetKey];
    while (queue.length > 0) {
      const k = queue.shift()!;
      if (next.has(k)) continue;
      next.add(k);
      const def = byKey.get(k);
      if (def?.requires) {
        for (const req of def.requires) {
          if (!next.has(req)) queue.push(req);
        }
      }
    }
  }

  return next;
}

/**
 * Checks whether resulting effective permissions satisfy every `requires` edge.
 */
export function findMissingSysAdminDependencies(
  effectiveKeys: Iterable<string>,
  catalog: readonly SysAdminPermissionRuleItem[]
): Array<{ key: string; requires: string }> {
  const held = new Set(effectiveKeys);
  const byKey = new Map(catalog.map((c) => [c.key, c]));
  const missing: Array<{ key: string; requires: string }> = [];

  for (const key of held) {
    const def = byKey.get(key);
    if (!def?.requires) continue;
    for (const req of def.requires) {
      if (!held.has(req)) {
        missing.push({ key, requires: req });
      }
    }
  }

  return missing;
}
