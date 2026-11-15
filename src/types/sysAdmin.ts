export interface SysAdminUser {
  id: number;
  username: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  name: string;
  nickname: string;
  email: string;
  phone?: string | null;
  role: "SYSADMIN";
  status: string;
  profileCompleted: boolean;
  emailVerified: boolean;
  enforceTwoFactor?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface SysAdminLoginSuccess {
  message: string;
  profileSetupRequired: false;
  twoFactorRequired?: false;
  user: SysAdminUser;
  token: string;
  refreshToken?: string;
  sessionId: string;
}

export interface SysAdminLoginSetupRequired {
  message: string;
  profileSetupRequired: true;
  twoFactorRequired?: false;
  challengeToken: string;
  admin: SysAdminUser;
}

export interface SysAdminLogin2FaRequired {
  message: string;
  profileSetupRequired: false;
  twoFactorRequired: true;
  challengeToken: string;
  emailMasked: string;
  admin: SysAdminUser;
}

export type SysAdminLoginResult =
  | SysAdminLoginSuccess
  | SysAdminLoginSetupRequired
  | SysAdminLogin2FaRequired;

export interface SysAdminTrustedDevice {
  id: string;
  deviceFingerprint: string;
  ipAddress: string;
  deviceInfo: string;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface SysAdminProfileInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  nickname: string;
  email: string;
}

export interface SysAdminCompleteProfileResponse {
  message: string;
  email: string;
  expiresAt: string;
  expiryMinutes: number;
}

export interface MonitoredAccount {
  id: number;
  username: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  role: "OWNER" | "DISPATCHER" | "RIDER" | "CUSTOMER";
  status: string;
  isOnline: boolean;
  isMainOwner?: boolean;
  activeSessionsCount: number;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoredAccountSession {
  id: string;
  deviceId: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  role: string;
}

export interface MonitoredAccountsResponse {
  accounts: MonitoredAccount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: {
    all: number;
    owners: number;
    dispatchers: number;
    riders: number;
    customers: number;
    onlineTotal: number;
  };
}

export interface AuthAuditLog {
  id: number;
  userId: number;
  username: string;
  name: string;
  role: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo: string | null;
  status: string;
  sessionId: string | null;
  isOnline: boolean;
  revokedAt: string | null;
  revokedReason: string | null;
  createdAt: string;
}

export interface AuthAuditResponse {
  logs: AuthAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ModificationAuditLog {
  id: number;
  role: string;
  targetId: number | null;
  username: string;
  name: string;
  fieldModified: string;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  verifiedVia: string;
  createdAt: string;
}

export interface ModificationAuditResponse {
  logs: ModificationAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SecurityThreatLog {
  id: string;
  eventType: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  targetIdentifier: string;
  targetName: string;
  details: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface SecurityThreatResponse {
  events: SecurityThreatLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SystemActivityLog {
  errandId: string;
  referenceCode: string;
  category: string;
  status: string;
  dispatcher: string;
  rider: string;
  route: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemActivityResponse {
  activities: SystemActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** One Owner report sent to the print screen, recorded by the server before it sent the PDF. */
export interface ReportPrintLog {
  id: number;
  userId: number | null;
  /** The name as it was when printed, the one on the printout's signature line. */
  printedByName: string;
  role: string;
  reportType: string;
  reportName: string;
  period: string;
  coverageLabel: string;
  rangeStart: string;
  rangeEnd: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ReportPrintLogResponse {
  logs: ReportPrintLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TrafficSummary {
  isLiveVps: boolean;
  generatedAt: string;
  totalRequests: number;
  validRequests: number;
  failedRequests: number;
  uniqueVisitors: number;
  uniqueVisitorsPercentage: number;
  bandwidthBytes: number;
  bandwidthFormatted: string;
  logPath: string;
  topEndpoints: { url: string; hits: number; percent: number; bandwidth: string }[];
  visitorOs: { name: string; count: number; percent: number }[];
  visitorBrowsers: { name: string; count: number; percent: number }[];
  statusCodes: { code: number; count: number; label: string }[];
  geoLocations: { country: string; city: string; hits: number }[];
}

export interface SystemTelemetry {
  server: {
    nodeVersion: string;
    platform: string;
    osType: string;
    osRelease: string;
    hostname: string;
    uptimeSeconds: number;
    uptimeFormatted: string;
    pid: number;
  };
  cpu: {
    cores: number;
    model: string;
    loadAverage: number[];
  };
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    heapUsedBytes: number;
    totalFormatted: string;
    freeFormatted: string;
    usedFormatted: string;
    heapUsedFormatted: string;
    usagePercent: number;
  };
  database: {
    status: "CONNECTED" | "ERROR";
    latencyMs: number;
    dbName: string;
    counts: {
      staffUsers: number;
      customerAccounts: number;
      totalErrands: number;
      activeSessions: number;
      loginLogs: number;
      sysAdmins: number;
    };
  };
  maintenance: Record<PortalKey, PortalMaintenanceStatus>;
  serverErrorSimulated?: boolean;
  dispatcherAiSuggestionsEnabled?: boolean;
  kuyaSugoEnabled?: boolean;
}

export type PortalKey = "owner" | "dispatcher" | "rider" | "customer";
export type MaintenanceType = "SCHEDULED" | "EMERGENCY" | "UPGRADE" | "SECURITY" | "ADVISORY" | "LIVE_NOTICE";

export interface PortalMaintenanceStatus {
  portal?: PortalKey;
  isActive: boolean;
  maintenanceType?: MaintenanceType;
  header?: string;
  message?: string;
  notice?: string;
  supportContact?: string;
  customColor?: string;
  footnote?: string;
  activatedAt?: string | null;
  updatedAt?: string;
}


export interface ItAdminUser {
  id: number;
  username: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  name: string;
  nickname: string;
  email: string | null;
  phone: string | null;
  role: "SYSADMIN";
  status: string;
  profileCompleted: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  isMainSysAdmin?: boolean;
  accessGroupId?: number | null;
  accessGroupName?: string | null;
  baselineName?: string;
}

// ── Security Threat Center & IP Defense Types ────────────────────────────────

export type BanType = "AUTOMATIC" | "MANUAL";
export type ThreatSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type BanStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export interface BlockedIpRecord {
  id: number;
  ipAddress: string;
  reason: string;
  banType: BanType;
  severity: ThreatSeverity;
  status: BanStatus;
  blockedUntil: string | null;
  attackCount: number;
  lastSeenAt: string;
  bannedById: number | null;
  bannedBy?: {
    id: number;
    username: string;
    nickname: string;
  } | null;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface WhitelistedIpRecord {
  id: number;
  ipAddress: string;
  cidrBlock?: string | null;
  description: string;
  isImmune: boolean;
  createdById?: number | null;
  createdBy?: {
    id: number;
    username: string;
    nickname: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThreatOverview {
  totalActiveBans: number;
  permanentBans: number;
  temporaryBans: number;
  totalAttacksBlocked24h: number;
  totalWhitelisted: number;
  recentIntrusions: BlockedIpRecord[];
}

export interface BlockedIpsResponse {
  records: BlockedIpRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ManualBanInput {
  ipAddress: string;
  reason: string;
  durationHours?: number | null;
  severity?: ThreatSeverity;
  stepUpPassword?: string;
}

export interface WhitelistInput {
  ipAddress: string;
  cidrBlock?: string;
  description: string;
}

// ── Phase 2: Service Controls, Backups, Logs & Telegram Alerts ───────────────

export interface DatabaseBackupRecord {
  id: number;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  backupType: "AUTOMATED" | "MANUAL";
  /** The server writes COMPLETED; SUCCESS is kept for older rows and clients. */
  status: "COMPLETED" | "SUCCESS" | "FAILED";
  createdBy: string;
  createdAt: string;
  /** Encrypted copy in Cloudflare R2; null = not attempted (before 2026-11-15, or still uploading). */
  offsiteStatus?: "UPLOADED" | "FAILED" | "SKIPPED" | null;
  offsiteAt?: string | null;
  offsiteError?: string | null;
}

export interface BackupRestoreCheckRecord {
  id: number;
  trigger: "SCHEDULED" | "MANUAL";
  status: "RUNNING" | "PASSED" | "FAILED";
  backupFile: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  tablesRestored: number | null;
  rowsRestored: number | null;
  error: string | null;
  triggeredBy: string | null;
  details?: {
    keyTables?: Record<string, { restored: number; live: number }>;
    missingTables?: string[];
  } | null;
}

export interface OffsiteBackupStatus {
  configured: boolean;
  bucket: string | null;
  keyFileOk: boolean | null;
  keyFileProblem: string | null;
  lastUploadedAt: string | null;
  lastUploadedFile: string | null;
  lastFailedAt: string | null;
  lastError: string | null;
  restoreChecks: BackupRestoreCheckRecord[];
}

export type SysAdminAlertType =
  | "CRITICAL_INTRUSION"
  | "SERVICE_RESTART"
  | "DB_DISCONNECT"
  | "DISK_WARNING"
  | "BACKEND_CRASH"
  | "SERVICE_RECOVERED"
  | "BACKUP_FAILURE"
  | "TEST_ALERT";

export interface SysAdminAlertRecord {
  id: number;
  alertType: SysAdminAlertType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  message: string;
  channel: "TELEGRAM";
  status: "SENT" | "FAILED" | "SUPPRESSED";
  metadata?: any;
  createdAt: string;
}

export interface AlertStatusResponse {
  isConfigured: boolean;
  maskedChatId: string | null;
  totalAlertsSent: number;
  recentAlerts: SysAdminAlertRecord[];
}

// Incident records (server sysAdminIncidentService.ts). OPEN = broken,
// MONITORING = working again with the report pending, RESOLVED = report done.
export type IncidentStatus = "OPEN" | "MONITORING" | "RESOLVED";
export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentView = "active" | "resolved" | "all";

export interface SysAdminIncident {
  id: number;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  /** "DB_DOWN" | "DISK" | "BACKEND_CRASH" when opened by the health watch; null when by hand. */
  sourceKey: string | null;
  startedAt: string;
  detectedAt: string;
  recoveredAt: string | null;
  resolvedAt: string | null;
  impact: string | null;
  cause: string | null;
  fix: string | null;
  prevention: string | null;
  openedBy: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  alertCount: number;
}

export interface SysAdminIncidentAlert {
  id: number;
  alertType: SysAdminAlertType;
  severity: IncidentSeverity;
  title: string;
  status: SysAdminAlertRecord["status"];
  createdAt: string;
}

export interface SysAdminIncidentDetail extends SysAdminIncident {
  alerts: SysAdminIncidentAlert[];
}

export interface IncidentListResponse {
  incidents: SysAdminIncident[];
  total: number;
  activeCount: number;
  page: number;
  pageSize: number;
}

export interface CreateIncidentPayload {
  title: string;
  severity: IncidentSeverity;
  startedAt: string;
  impact?: string | null;
}

export interface UpdateIncidentPayload {
  title?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  impact?: string | null;
  cause?: string | null;
  fix?: string | null;
  prevention?: string | null;
  recoveredAt?: string | null;
}

export type LogSource = "pm2_out" | "pm2_error" | "nginx_access" | "nginx_error";

export interface LogTailResult {
  source: LogSource;
  filePath: string;
  totalLines: number;
  lines: string[];
}

export interface ServiceControlResponse {
  success: boolean;
  message: string;
}

export type AppReleaseTarget = "customer" | "rider";

export interface AppReleaseInfo {
  target: AppReleaseTarget;
  appName: string;
  packageName: string;
  version: string;
  minAndroid: string;
  fileSize: string;
  fileSizeBytes: number;
  fileName: string;
  downloadUrl: string;
  updatedAt: string;
  whatsNew: string[];
  features?: string[];
  fixes?: string[];
  logs?: string[];
  sha256?: string;
}

export interface AppReleasesResponse {
  success: boolean;
  releases: {
    customer: AppReleaseInfo;
    rider: AppReleaseInfo;
  };
}

export interface AppReleaseUpdateInput {
  version?: string;
  minAndroid?: string;
  fileSize?: string;
  whatsNew?: string[];
  features?: string[];
  fixes?: string[];
  logs?: string[];
}

// ── SysAdmin Permission Management & Access (PMA) Types ──────────────────────

export type SysAdminPermissionArea =
  | "Monitoring & Logs"
  | "Users & Sessions"
  | "Security & Threats"
  | "DevOps & Infrastructure"
  | "App Releases & IT Staff";

export interface SysAdminPermissionDef {
  key: string;
  area: SysAdminPermissionArea;
  label: string;
  note: string;
  requires: string[];
  baselineReadOnly: boolean;
}

export interface SysAdminPermissionCatalog {
  areas: SysAdminPermissionArea[];
  baselineKeys: string[];
  allKeys: string[];
  permissions: SysAdminPermissionDef[];
}

export interface SysAdminAccessGroupSummary {
  id: number;
  name: string;
  description: string | null;
  version: number;
  permissions: string[];
  memberCount: number;
  createdByActorRole?: string | null;
  updatedByActorRole?: string | null;
  createdAt?: string;
  updatedAt: string;
}

export interface SysAdminOverrideEntry {
  permissionKey: string;
  effect: "GRANT" | "DENY";
}

export interface SysAdminAccountAccessSummary {
  id: number;
  username: string;
  email: string | null;
  nickname: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  status: string;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  isMainSysAdmin: boolean;
  accessGroupId: number | null;
  accessGroupName: string | null;
  baselineName: string;
  overrides: SysAdminOverrideEntry[];
  effectivePermissions: string[];
}

export interface MySysAdminPermissionsResponse {
  sysAdminId: number;
  isMainSysAdmin: boolean;
  group: { id: number; name: string } | null;
  baselineName: string;
  permissions: string[];
}

export interface SysAdminPmaAuditRecord {
  id: number;
  action: string;
  sysAdminId: number | null;
  targetUsername: string | null;
  groupId: number | null;
  groupName: string | null;
  actorRole: string;
  actorId: number;
  actorUsername: string;
  fieldModified: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface SysAdminPmaAuditResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  logs: SysAdminPmaAuditRecord[];
}

