/** Mirrors server/src/services/auditTimelineService.ts and riderActivityService.ts. */

export const AUDIT_SOURCE_LABELS = {
  signin: "Sign-ins",
  account_change: "Account changes",
  password_reset: "Password resets",
  staff_session: "Sessions",
  rider_session: "Rider shifts",
  rider_connectivity: "Rider connection drops",
  dispatch: "Dispatch",
  report_print: "Report prints",
  ip_block: "IP bans",
  it_alert: "IT alerts",
  pma: "IT admin permissions",
} as const;

export type AuditSourceKey = keyof typeof AUDIT_SOURCE_LABELS;
export type AuditSeverity = "info" | "notice" | "warning" | "critical";

export interface AuditActor {
  kind: "user" | "customer" | "sysadmin" | "system";
  id: number | null;
  name: string;
  role: string | null;
}

export interface AuditEvent {
  key: string;
  source: AuditSourceKey;
  rowId: string;
  at: string;
  severity: AuditSeverity;
  action: string;
  summary: string;
  actor: AuditActor | null;
  ip: string | null;
}

export interface AuditTimelinePage {
  events: AuditEvent[];
  nextCursor: string | null;
}

export interface AuditTimelineQuery {
  sources?: AuditSourceKey[];
  q?: string;
  ip?: string;
  from?: string;
  to?: string;
  minSeverity?: AuditSeverity;
  actor?: string;
}

export interface AuditEventDetail {
  event: AuditEvent | null;
  raw: Record<string, unknown>;
  related: AuditEvent[];
}

export interface AuditInsights {
  since: string;
  failedSignins: number;
  resetRejected: number;
  newBans: number;
  activeBans: number;
  newDevices: number;
  newSessions: number;
  topFailingIps: { ip: string; count: number }[];
}

export type RiderPeriodStatus = "ONLINE" | "OFFLINE" | "NO_DATA";

export interface RiderDay {
  riderId: number;
  name: string;
  username: string;
  accountStatus: string;
  onlineMinutes: number;
  offlineMinutes: number;
  noDataMinutes: number;
  samples: number;
  periods: { status: RiderPeriodStatus; start: string; end: string; minutes: number }[];
  sessions: { id: number; loginAt: string; logoutAt: string | null }[];
  connectionDrops: { id: number; disconnectedAt: string; reconnectedAt: string | null; errandRef: string | null }[];
}

export interface RiderActivityResponse {
  date: string;
  dayStart: string;
  dayEnd: string;
  sampleMinutes: number;
  riders: RiderDay[];
}
