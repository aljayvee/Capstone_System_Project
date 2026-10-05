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
}

export type PortalKey = "owner" | "dispatcher" | "rider" | "customer";
export type MaintenanceType = "SCHEDULED" | "EMERGENCY" | "UPGRADE" | "SECURITY";

export interface PortalMaintenanceStatus {
  portal?: PortalKey;
  isActive: boolean;
  maintenanceType?: MaintenanceType;
  header?: string;
  message?: string;
  notice?: string;
  supportContact?: string;
  customColor?: string;
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
  status: "SUCCESS" | "FAILED";
  createdBy: string;
  createdAt: string;
}

export type SysAdminAlertType =
  | "CRITICAL_INTRUSION"
  | "SERVICE_RESTART"
  | "DB_DISCONNECT"
  | "DISK_WARNING"
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

