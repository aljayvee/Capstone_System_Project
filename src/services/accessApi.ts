import { apiClient } from "./apiClient";
import type {
  SysAdminAccessGroupSummary,
  SysAdminAccountAccessSummary,
  SysAdminOverrideEntry,
  SysAdminPermissionCatalog,
  SysAdminPmaAuditResponse,
} from "../types/sysAdmin";

/**
 * Access groups (RBAC). The server owns every rule: which keys exist
 * (GET /access/catalog), who may change them (the Main Owner alone), and what
 * each account may do (GET /account/permissions). The portal only renders it.
 *
 * Failures throw AccessApiError with the server's own sentence and status, so
 * screens can tell a refusal (403), a stale edit (409) and an outage apart.
 */

export type PermissionScope = "OWNER" | "DISPATCHER";

export interface PermissionDefinition {
  key: string;
  scope: PermissionScope;
  area: string;
  /** The checklist line in the group editor. */
  title: string;
  /** Keys this one is useless without (ticked with it, unticked with them). */
  requires?: string[];
  /** Sentence fragment the server's refusals end with. */
  label: string;
  description: string;
}

export interface AccessCatalog {
  fullAccessName: string;
  scopes: Array<{ scope: PermissionScope; label: string }>;
  permissions: PermissionDefinition[];
}

export interface MyPermissions {
  scope: PermissionScope;
  isMainOwner: boolean;
  group: { id: number | null; name: string };
  permissions: string[];
}

export interface AccessGroup {
  id: number;
  name: string;
  description: string | null;
  scope: PermissionScope;
  version: number;
  updatedAt: string;
  permissions: string[];
  memberCount: number;
}

export type PermissionEffect = "GRANT" | "DENY";

export interface PermissionOverride {
  permissionKey: string;
  effect: PermissionEffect;
}

export interface AccessAccount {
  id: number;
  username: string;
  name: string;
  role: PermissionScope;
  status: string;
  isMainOwner: boolean;
  group: { id: number | null; name: string };
  overrides: PermissionOverride[];
  /** What the group alone grants; the screen's "Inherit" values. */
  groupPermissions: string[];
  effectivePermissions: string[];
}

export class AccessApiError extends Error {
  status: number | null;
  code: string | null;
  details: unknown;

  constructor(message: string, status: number | null, code: string | null, details: unknown) {
    super(message);
    this.name = "AccessApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function toAccessError(err: any, fallback: string): AccessApiError {
  const data = err?.response?.data;
  const details = data?.details;
  return new AccessApiError(
    // The server's sentence is in `error`, never `message` (api-errors-use-error-field).
    typeof data?.error === "string" && data.error ? data.error : fallback,
    typeof err?.response?.status === "number" ? err.response.status : null,
    data?.code ?? details?.code ?? null,
    details ?? null,
  );
}

async function call<T>(request: () => Promise<{ data: T }>, fallback: string): Promise<T> {
  try {
    return (await request()).data;
  } catch (err) {
    throw toAccessError(err, fallback);
  }
}

export const accessApi = {
  getMyPermissions: () =>
    call(() => apiClient.get<MyPermissions>("/account/permissions"), "Your access could not be loaded."),

  getCatalog: () => call(() => apiClient.get<AccessCatalog>("/access/catalog"), "The permission list could not be loaded."),

  listGroups: async () =>
    (await call(() => apiClient.get<{ groups: AccessGroup[] }>("/access/groups"), "Access groups could not be loaded."))
      .groups,

  createGroup: (input: { name: string; description: string; scope: PermissionScope; permissions: string[] }) =>
    call(() => apiClient.post<AccessGroup>("/access/groups", input), "The group could not be created."),

  updateGroup: (
    id: number,
    input: { name?: string; description?: string | null; permissions?: string[]; version: number },
  ) => call(() => apiClient.put<AccessGroup>(`/access/groups/${id}`, input), "The group could not be saved."),

  deleteGroup: (id: number) =>
    call(() => apiClient.delete<{ deleted: boolean }>(`/access/groups/${id}`), "The group could not be deleted."),

  listAccounts: async () =>
    (await call(() => apiClient.get<{ accounts: AccessAccount[] }>("/access/accounts"), "Accounts could not be loaded."))
      .accounts,

  updateAccountAccess: (userId: number, input: { accessGroupId: number | null; overrides: PermissionOverride[] }) =>
    call(
      () => apiClient.put<AccessAccount>(`/access/accounts/${userId}`, input),
      "This account's access could not be saved.",
    ),

  // ── Dual-Governance SysAdmin PMA (Main Owner only; isolated from Staff) ──
  getSysAdminCatalog: () =>
    call(() => apiClient.get<SysAdminPermissionCatalog>("/access/sysadmin/catalog"), "SysAdmin permissions could not be loaded."),

  listSysAdminGroups: async () =>
    (await call(() => apiClient.get<{ groups: SysAdminAccessGroupSummary[] }>("/access/sysadmin/groups"), "SysAdmin access groups could not be loaded."))
      .groups,

  createSysAdminGroup: async (input: { name: string; description: string | null; permissions: string[] }) =>
    (await call(() => apiClient.post<{ group: SysAdminAccessGroupSummary }>("/access/sysadmin/groups", input), "SysAdmin access group could not be created."))
      .group,

  updateSysAdminGroup: async (
    groupId: number,
    input: { name: string; description: string | null; permissions: string[]; version: number },
  ) =>
    (await call(() => apiClient.put<{ group: SysAdminAccessGroupSummary }>(`/access/sysadmin/groups/${groupId}`, input), "SysAdmin access group could not be saved."))
      .group,

  deleteSysAdminGroup: (groupId: number) =>
    call(() => apiClient.delete<{ deleted: boolean; id: number }>(`/access/sysadmin/groups/${groupId}`), "SysAdmin access group could not be deleted."),

  listSysAdminAccounts: async () =>
    (await call(() => apiClient.get<{ accounts: SysAdminAccountAccessSummary[] }>("/access/sysadmin/accounts"), "IT Administrator accounts could not be loaded."))
      .accounts,

  updateSysAdminAccountAccess: (
    sysAdminId: number,
    input: { accessGroupId: number | null; overrides: SysAdminOverrideEntry[] },
  ) =>
    call(
      () => apiClient.put(`/access/sysadmin/accounts/${sysAdminId}`, input),
      "IT Administrator access could not be saved.",
    ),

  updateSysAdminAccountStatus: (
    sysAdminId: number,
    input: { status: "Active" | "Suspended" | "Inactive"; reason?: string },
  ) =>
    call(
      () => apiClient.patch(`/access/sysadmin/accounts/${sysAdminId}/status`, input),
      "IT Administrator status could not be updated.",
    ),

  listSysAdminPmaAuditLogs: (params?: { page?: number; limit?: number }) =>
    call(
      () => apiClient.get<SysAdminPmaAuditResponse>("/access/sysadmin/audit", { params }),
      "SysAdmin PMA audit history could not be loaded.",
    ),
};
