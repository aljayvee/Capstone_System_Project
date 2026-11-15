import assert from "node:assert/strict";
import test from "node:test";
import {
  SYSADMIN_READ_ONLY_BASELINE_KEYS,
  findMissingSysAdminDependencies,
  resolveSysAdminEffectiveKeys,
  togglePermissionWithDependencies,
} from "../src/portals/sysadmin/lib/sysAdminAccessRules.ts";
import type { SysAdminPermissionDef } from "../src/types/sysAdmin.ts";

const CATALOG: SysAdminPermissionDef[] = [
  { key: "telemetry.view", area: "Monitoring & Logs", label: "Telemetry", note: "", requires: [], baselineReadOnly: true },
  { key: "traffic.view", area: "Monitoring & Logs", label: "Web Traffic", note: "", requires: [], baselineReadOnly: true },
  { key: "logs.view", area: "Monitoring & Logs", label: "Server Logs", note: "", requires: [], baselineReadOnly: true },
  { key: "audit.view", area: "Monitoring & Logs", label: "Audit Logs", note: "", requires: [], baselineReadOnly: true },
  { key: "incidents.view", area: "Monitoring & Logs", label: "Incidents View", note: "", requires: [], baselineReadOnly: true },
  { key: "users.view", area: "Users & Sessions", label: "View Accounts", note: "", requires: [], baselineReadOnly: false },
  { key: "users.sessions", area: "Users & Sessions", label: "Terminate Sessions", note: "", requires: ["users.view"], baselineReadOnly: false },
  { key: "users.status", area: "Users & Sessions", label: "Change Status", note: "", requires: ["users.view"], baselineReadOnly: false },
  { key: "threats.view", area: "Security & Threats", label: "View Threats", note: "", requires: [], baselineReadOnly: false },
  { key: "threats.manage", area: "Security & Threats", label: "Manage Threats", note: "", requires: ["threats.view"], baselineReadOnly: false },
  { key: "incidents.manage", area: "DevOps & Infrastructure", label: "Manage Incidents", note: "", requires: ["incidents.view"], baselineReadOnly: false },
  { key: "devops.backups.view", area: "DevOps & Infrastructure", label: "View Backups", note: "", requires: [], baselineReadOnly: false },
  { key: "devops.backups.manage", area: "DevOps & Infrastructure", label: "Manage Backups", note: "", requires: ["devops.backups.view"], baselineReadOnly: false },
  { key: "devops.services", area: "DevOps & Infrastructure", label: "Service Controls", note: "", requires: [], baselineReadOnly: false },
  { key: "devops.features", area: "DevOps & Infrastructure", label: "Feature Toggles", note: "", requires: [], baselineReadOnly: false },
  { key: "releases.view", area: "App Releases & IT Staff", label: "View Releases", note: "", requires: [], baselineReadOnly: false },
  { key: "releases.manage", area: "App Releases & IT Staff", label: "Manage Releases", note: "", requires: ["releases.view"], baselineReadOnly: false },
  { key: "staff.view", area: "App Releases & IT Staff", label: "View IT Staff", note: "", requires: [], baselineReadOnly: false },
  { key: "staff.manage", area: "App Releases & IT Staff", label: "Provision IT Staff", note: "", requires: ["staff.view"], baselineReadOnly: false },
];

const ALL_KEYS = CATALOG.map((p) => p.key);

test("least-privilege baseline gives newly provisioned secondary IT Admins only the 5 monitoring view keys", () => {
  assert.deepEqual([...SYSADMIN_READ_ONLY_BASELINE_KEYS], [
    "telemetry.view",
    "traffic.view",
    "logs.view",
    "audit.view",
    "incidents.view",
  ]);
  const resolved = resolveSysAdminEffectiveKeys(null, [], ALL_KEYS, false);
  assert.deepEqual([...resolved].sort(), [...SYSADMIN_READ_ONLY_BASELINE_KEYS].sort());
});

test("resolveSysAdminEffectiveKeys applies GRANT and DENY overrides on group permissions", () => {
  const resolved = resolveSysAdminEffectiveKeys(
    ["telemetry.view", "threats.view", "threats.manage"],
    [
      { permissionKey: "threats.manage", effect: "DENY" },
      { permissionKey: "users.view", effect: "GRANT" },
    ],
    ALL_KEYS,
    false
  );
  assert.deepEqual([...resolved].sort(), ["telemetry.view", "threats.view", "users.view"]);
});

test("Main SysAdmin keeps all catalog keys even if overrides attempt DENY", () => {
  const resolved = resolveSysAdminEffectiveKeys(
    ["telemetry.view"],
    [{ permissionKey: "staff.manage", effect: "DENY" }],
    ALL_KEYS,
    true
  );
  assert.equal(resolved.length, 19);
  assert.ok(resolved.includes("staff.manage"));
});

test("togglePermissionWithDependencies enables prerequisites and cascades removals", () => {
  const afterGrant = togglePermissionWithDependencies(new Set(), "threats.manage", CATALOG);
  assert.ok(afterGrant.has("threats.view"), "enabling threats.manage should auto-enable threats.view");
  assert.ok(afterGrant.has("threats.manage"));

  const multi = togglePermissionWithDependencies(new Set(["users.view", "users.sessions"]), "users.status", CATALOG);
  assert.ok(multi.has("users.status"));

  const afterRevokeView = togglePermissionWithDependencies(multi, "users.view", CATALOG);
  assert.equal(afterRevokeView.has("users.view"), false);
  assert.equal(afterRevokeView.has("users.sessions"), false);
  assert.equal(afterRevokeView.has("users.status"), false);
});

test("findMissingSysAdminDependencies detects management capabilities missing view prerequisites", () => {
  const missing = findMissingSysAdminDependencies(
    new Set(["threats.manage", "users.status", "telemetry.view"]),
    CATALOG
  );
  assert.deepEqual(
    missing.map((m) => [m.key, m.requires]),
    [
      ["threats.manage", "threats.view"],
      ["users.status", "users.view"],
    ]
  );
});
