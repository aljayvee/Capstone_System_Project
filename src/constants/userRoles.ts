import { UserRole } from "../types/auth";

// Single source of truth for how system roles are LABELLED in the web portal.
//
// The wire/DB value stays "owner"/"OWNER" (it is what /owner routing, the JWT
// payload and every existing row already carry) — only the words the operator
// reads say "Admin". Renaming the stored value would be a data migration, not
// a copy change, so the two are deliberately kept apart here.
export const ROLE_LABELS: Record<string, string> = {
  owner: "Admin",
  dispatcher: "Dispatcher",
  rider: "Rider",
  customer: "Customer",
};

// Longer form used on the directory's role badge column.
export const ROLE_BADGE_LABELS: Record<string, string> = {
  owner: "System Admin",
  dispatcher: "Dispatcher",
  rider: "Delivery Rider",
};

export const roleLabel = (role: string): string =>
  ROLE_LABELS[String(role).toLowerCase()] || role;

// Sentinel for "the admin has not picked a role yet". Never sent to the API —
// the modals refuse to submit while a role still holds this value.
export const UNASSIGNED_ROLE = "";
export type AssignableRole = Extract<UserRole, "rider" | "dispatcher" | "owner">;

export const ASSIGNABLE_ROLES: Array<{ value: AssignableRole; label: string }> = [
  { value: "rider", label: "Rider" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "owner", label: "Admin" },
];

// Display order for the "Assigned Role" sort: most privileged first.
export const ROLE_SORT_RANK: Record<string, number> = {
  owner: 0,
  dispatcher: 1,
  rider: 2,
};

// Re-assigning an operational account (Dispatcher / Rider) changes what that
// person can see and do in the live dispatch board, so it is gated behind the
// acting admin re-entering their own password. Enforced again server-side in
// Backend/src/server.js — this helper only decides when to ASK.
export const ROLE_CHANGE_REAUTH_ROLES = ["dispatcher", "rider"];

export function requiresRoleChangeApproval(currentRole: string, nextRole: string): boolean {
  const from = String(currentRole).toLowerCase();
  const to = String(nextRole).toLowerCase();
  return from !== to && ROLE_CHANGE_REAUTH_ROLES.includes(from);
}
