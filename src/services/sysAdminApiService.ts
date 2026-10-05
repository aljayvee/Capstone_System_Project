/**
 * sysAdminApiService.ts
 *
 * Uses a DEDICATED Axios instance that is completely isolated from the
 * shared `apiClient` used by the operational staff portals (Owner / Dispatcher / Rider).
 *
 * Isolation is required because:
 *  - The shared apiClient interceptor wires to /api/auth/refresh (operational staff endpoint).
 *  - SysAdmin auth lives at /api/sysadmin/auth/* — a completely separate auth system.
 *  - If getMe() returns 401 on the /sysadmin/verify-email page (no session yet), the shared
 *    interceptor would cascade through /auth/refresh → /auth/logout, flooding the console with
 *    errors and corrupting the operational staff token slot.
 *  - This dedicated instance silently rejects 401s on sysadmin routes without cascading.
 */

import axios from "axios";
import type {
  SysAdminUser,
  SysAdminLoginResult,
  SysAdminLoginSuccess,
  SysAdminLogin2FaRequired,
  SysAdminTrustedDevice,
  SysAdminProfileInput,
  SysAdminCompleteProfileResponse,
  MonitoredAccountsResponse,
  MonitoredAccountSession,
  AuthAuditResponse,
  ModificationAuditResponse,
  SecurityThreatResponse,
  SystemActivityResponse,
  TrafficSummary,
  SystemTelemetry,
  ItAdminUser,
  ThreatOverview,
  BlockedIpsResponse,
  BlockedIpRecord,
  WhitelistedIpRecord,
  ManualBanInput,
  WhitelistInput,
  DatabaseBackupRecord,
  AlertStatusResponse,
  LogSource,
  LogTailResult,
  ServiceControlResponse,
  PortalMaintenanceStatus,
} from "../types/sysAdmin";

// ─── Dedicated SysAdmin Axios Instance ───────────────────────────────────────

const SYSADMIN_API_BASE =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:5000/api";

// Private in-memory token slot — NEVER shared with the operational staff token slot
let sysAdminAccessToken: string | null = null;

export const setSysAdminMemoryToken = (token: string | null): void => {
  sysAdminAccessToken = token;
};

export const getSysAdminMemoryToken = (): string | null => sysAdminAccessToken;

const sysAdminAxios = axios.create({
  baseURL: SYSADMIN_API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-SysAdmin-Client": "sugo-sysadmin-web",
  },
});

// Attach SysAdmin Bearer token and CSRF client identity on every request
sysAdminAxios.interceptors.request.use(
  (config) => {
    if (sysAdminAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${sysAdminAccessToken}`;
    }
    if (config.headers) {
      config.headers["X-SysAdmin-Client"] = "sugo-sysadmin-web";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handles silent token refresh via /sysadmin/auth/refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

sysAdminAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/sysadmin/auth/login") &&
      !originalRequest.url?.includes("/sysadmin/auth/refresh") &&
      // A logout that 401s means the session is already gone, which is the
      // outcome logout wanted. Refreshing first, only to end the session, is
      // a wasted round trip that fails the same way.
      !originalRequest.url?.includes("/sysadmin/auth/logout") &&
      !originalRequest.url?.includes("/sysadmin/auth/verify-email") &&
      !originalRequest.url?.includes("/sysadmin/auth/verify-2fa")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return sysAdminAxios(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await sysAdminAxios.post<{ token: string; user: SysAdminUser }>(
          "/sysadmin/auth/refresh"
        );
        const newToken = refreshRes.data?.token;
        if (newToken) {
          setSysAdminMemoryToken(newToken);
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return sysAdminAxios(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setSysAdminMemoryToken(null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ─── SysAdmin API Service ─────────────────────────────────────────────────────

export const sysAdminApiService = {
  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(username: string, password: string): Promise<SysAdminLoginResult> {
    const response = await sysAdminAxios.post<SysAdminLoginResult>("/sysadmin/auth/login", {
      username,
      password,
    });
    if (
      !response.data.profileSetupRequired &&
      (response.data as SysAdminLoginSuccess).token
    ) {
      setSysAdminMemoryToken((response.data as SysAdminLoginSuccess).token);
    }
    return response.data;
  },

  async completeProfile(
    challengeToken: string,
    profileData: SysAdminProfileInput
  ): Promise<SysAdminCompleteProfileResponse> {
    const response = await sysAdminAxios.post<SysAdminCompleteProfileResponse>(
      "/sysadmin/auth/complete-profile",
      { challengeToken, ...profileData }
    );
    return response.data;
  },

  async verifyMagicLink(token: string): Promise<SysAdminLoginSuccess> {
    const response = await sysAdminAxios.get<SysAdminLoginSuccess>(
      `/sysadmin/auth/verify-email?token=${encodeURIComponent(token)}`
    );
    if (response.data.token) {
      setSysAdminMemoryToken(response.data.token);
    }
    return response.data;
  },

  async resendMagicLink(challengeToken: string): Promise<{
    message: string;
    email: string;
    expiresAt: string;
    expiryMinutes: number;
  }> {
    const response = await sysAdminAxios.post("/sysadmin/auth/resend-verification", {
      challengeToken,
    });
    return response.data;
  },

  async getMe(): Promise<SysAdminUser> {
    const response = await sysAdminAxios.get<{ user: SysAdminUser }>("/sysadmin/auth/me");
    return response.data.user;
  },

  async logout(sessionId?: string): Promise<void> {
    try {
      await sysAdminAxios.post("/sysadmin/auth/logout", { sessionId });
    } finally {
      setSysAdminMemoryToken(null);
    }
  },

  // ── Profile Change Security Gate ──────────────────────────────────────────

  async requestProfileOtp(): Promise<{
    message: string;
    email: string;
    expiresAt: string;
    expiryMinutes: number;
  }> {
    const response = await sysAdminAxios.post("/sysadmin/auth/request-profile-otp");
    return response.data;
  },

  async verifyProfileOtp(otp: string): Promise<{ changeToken: string }> {
    const response = await sysAdminAxios.post("/sysadmin/auth/verify-profile-otp", { otp });
    return response.data;
  },

  async updateProfile(payload: {
    changeToken: string;
    currentPassword: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    nickname?: string;
    email?: string;
    password?: string;
  }): Promise<{ message: string; admin: SysAdminUser }> {
    const response = await sysAdminAxios.patch<{ message: string; admin: SysAdminUser }>(
      "/sysadmin/auth/update-profile",
      payload
    );
    return response.data;
  },

  // ── User Monitoring ───────────────────────────────────────────────────────

  async getMonitoredAccounts(params?: {
    role?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<MonitoredAccountsResponse> {
    const response = await sysAdminAxios.get<MonitoredAccountsResponse>("/sysadmin/users", { params });
    return response.data;
  },

  async getAccountSessions(role: string, id: number): Promise<MonitoredAccountSession[]> {
    const response = await sysAdminAxios.get<{ sessions: MonitoredAccountSession[] }>(
      `/sysadmin/users/${role}/${id}/sessions`
    );
    return response.data.sessions;
  },

  async terminateSession(sessionId: string): Promise<{ message: string }> {
    const response = await sysAdminAxios.post<{ message: string }>(
      `/sysadmin/users/sessions/${sessionId}/terminate`
    );
    return response.data;
  },

  async updateAccountStatus(
    role: string,
    id: number,
    status: string,
    reason?: string,
    stepUpPassword?: string
  ): Promise<{ message: string; account: unknown }> {
    const response = await sysAdminAxios.patch<{ message: string; account: unknown }>(
      `/sysadmin/users/${role}/${id}/status`,
      { status, reason, stepUpPassword }
    );
    return response.data;
  },

  // ── Audit Logs ────────────────────────────────────────────────────────────

  async getAuthAuditLogs(params?: {
    role?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<AuthAuditResponse> {
    const response = await sysAdminAxios.get<AuthAuditResponse>("/sysadmin/audit/auth", { params });
    return response.data;
  },

  async getModificationAuditLogs(params?: {
    role?: string;
    fieldModified?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ModificationAuditResponse> {
    const response = await sysAdminAxios.get<ModificationAuditResponse>("/sysadmin/audit/modifications", {
      params,
    });
    return response.data;
  },

  async getSecurityAuditLogs(params?: {
    severity?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<SecurityThreatResponse> {
    const response = await sysAdminAxios.get<SecurityThreatResponse>("/sysadmin/audit/security", { params });
    return response.data;
  },

  async getSystemActivityLogs(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<SystemActivityResponse> {
    const response = await sysAdminAxios.get<SystemActivityResponse>("/sysadmin/audit/system-activity", {
      params,
    });
    return response.data;
  },

  // ── Traffic & GoAccess ────────────────────────────────────────────────────

  async getTrafficSummary(): Promise<TrafficSummary> {
    const response = await sysAdminAxios.get<TrafficSummary>("/sysadmin/traffic/summary");
    return response.data;
  },

  getGoAccessReportUrl(): string {
    const token = getSysAdminMemoryToken();
    return `${SYSADMIN_API_BASE}/sysadmin/traffic/report?token=${encodeURIComponent(token ?? "")}`;
  },

  // ── DevOps & Telemetry ────────────────────────────────────────────────────

  async getTelemetry(): Promise<SystemTelemetry> {
    const response = await sysAdminAxios.get<SystemTelemetry>("/sysadmin/devops/telemetry");
    return response.data;
  },

  async toggleMaintenance(
    portal: "owner" | "dispatcher" | "rider" | "customer",
    active: boolean,
    options?: {
      maintenanceType?: "SCHEDULED" | "EMERGENCY" | "UPGRADE" | "SECURITY";
      header?: string;
      message?: string;
      notice?: string;
      supportContact?: string;
      customColor?: string;
      stepUpPassword?: string;
    }
  ): Promise<PortalMaintenanceStatus> {
    const response = await sysAdminAxios.post<PortalMaintenanceStatus>(
      "/sysadmin/devops/maintenance",
      {
        portal,
        active,
        maintenanceType: options?.maintenanceType,
        header: options?.header,
        message: options?.message || options?.notice,
        supportContact: options?.supportContact,
        customColor: options?.customColor,
        stepUpPassword: options?.stepUpPassword,
      }
    );
    return response.data;
  },

  async triggerBackup(stepUpPassword?: string): Promise<{
    success: boolean;
    backupFile: string;
    backupSizeFormatted: string;
    timestamp: string;
  }> {
    const response = await sysAdminAxios.post<{
      success: boolean;
      backupFile: string;
      backupSizeFormatted: string;
      timestamp: string;
    }>("/sysadmin/devops/backup-db", { stepUpPassword });
    return response.data;
  },

  async restartService(
    service: "backend" | "nginx",
    stepUpPassword?: string
  ): Promise<ServiceControlResponse> {
    const response = await sysAdminAxios.post<ServiceControlResponse>(
      `/sysadmin/devops/services/${service}/restart`,
      { stepUpPassword }
    );
    return response.data;
  },

  async getServerErrorStatus(): Promise<{ active: boolean }> {
    const response = await sysAdminAxios.get<{ active: boolean }>("/system/server-error-status");
    return response.data;
  },

  async toggleServerError(active: boolean): Promise<{ active: boolean; message: string }> {
    const response = await sysAdminAxios.post<{ active: boolean; message: string }>(
      "/sysadmin/devops/server-error",
      { active }
    );
    return response.data;
  },

  async getBackups(): Promise<{ backups: DatabaseBackupRecord[] }> {
    const response = await sysAdminAxios.get<{ backups: DatabaseBackupRecord[] }>("/sysadmin/devops/backups");
    return response.data;
  },

  async downloadBackup(id: number, fileName: string): Promise<void> {
    const response = await sysAdminAxios.get(`/sysadmin/devops/backups/${id}/download`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/gzip" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async deleteBackup(id: number, stepUpPassword?: string): Promise<{ success: boolean; fileName: string }> {
    const response = await sysAdminAxios.delete<{ success: boolean; fileName: string }>(
      `/sysadmin/devops/backups/${id}`,
      { data: { stepUpPassword } }
    );
    return response.data;
  },

  async getLogs(source: LogSource, lines?: number, search?: string): Promise<LogTailResult> {
    const response = await sysAdminAxios.get<LogTailResult>("/sysadmin/devops/logs", {
      params: { source, lines, search },
    });
    return response.data;
  },

  async getAlertStatus(): Promise<AlertStatusResponse> {
    const response = await sysAdminAxios.get<AlertStatusResponse>("/sysadmin/devops/alerts/status");
    return response.data;
  },

  async sendTestAlert(): Promise<{ success: boolean; message: string }> {
    const response = await sysAdminAxios.post<{ success: boolean; message: string }>("/sysadmin/devops/alerts/test");
    return response.data;
  },

  async getItAdmins(): Promise<ItAdminUser[]> {
    const response = await sysAdminAxios.get<{ admins: ItAdminUser[] }>("/sysadmin/it-admins");
    return response.data.admins;
  },

  async createItAdmin(data: {
    username: string;
    password?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    nickname?: string;
    stepUpPassword?: string;
  }): Promise<{ message: string; admin: ItAdminUser }> {
    const response = await sysAdminAxios.post<{ message: string; admin: ItAdminUser }>(
      "/sysadmin/it-admins",
      data
    );
    return response.data;
  },

  // ── 2FA, Account Unlock, and Security Controls ─────────────────────────────

  async verify2Fa(
    challengeToken: string,
    code: string,
    trustDevice: boolean = false,
    deviceFingerprint?: string
  ): Promise<SysAdminLoginSuccess> {
    const response = await sysAdminAxios.post<SysAdminLoginSuccess>("/sysadmin/auth/verify-2fa", {
      challengeToken,
      code,
      trustDevice,
      deviceFingerprint,
    });
    if (response.data.token) {
      setSysAdminMemoryToken(response.data.token);
    }
    return response.data;
  },

  async resend2Fa(challengeToken: string): Promise<{ message: string; emailMasked: string }> {
    const response = await sysAdminAxios.post("/sysadmin/auth/resend-2fa", { challengeToken });
    return response.data;
  },

  async unlockAccount(token: string): Promise<{ message: string; username?: string }> {
    const response = await sysAdminAxios.post("/sysadmin/auth/unlock-account", { token });
    return response.data;
  },

  async refreshSession(): Promise<{ token: string; user: SysAdminUser }> {
    const response = await sysAdminAxios.post<{ token: string; user: SysAdminUser }>("/sysadmin/auth/refresh");
    if (response.data.token) {
      setSysAdminMemoryToken(response.data.token);
    }
    return response.data;
  },

  async toggle2FaPolicy(enforceTwoFactor: boolean, stepUpPassword: string): Promise<{ message: string; enforceTwoFactor: boolean }> {
    const response = await sysAdminAxios.post("/sysadmin/auth/2fa-policy", { enforceTwoFactor, stepUpPassword });
    return response.data;
  },

  async getTrustedDevices(): Promise<{ devices: SysAdminTrustedDevice[] }> {
    const response = await sysAdminAxios.get<{ devices: SysAdminTrustedDevice[] }>("/sysadmin/auth/trusted-devices");
    return response.data;
  },

  async revokeTrustedDevice(deviceId: string): Promise<{ message: string }> {
    const response = await sysAdminAxios.delete(`/sysadmin/auth/trusted-devices/${encodeURIComponent(deviceId)}`);
    return response.data;
  },

  // ── Threat Center & IP Defense ─────────────────────────────────────────────

  async getThreatOverview(): Promise<ThreatOverview> {
    const response = await sysAdminAxios.get<ThreatOverview>("/sysadmin/threats/overview");
    return response.data;
  },

  async getBlockedIps(params?: {
    search?: string;
    status?: string;
    banType?: string;
    severity?: string;
    page?: number;
    limit?: number;
  }): Promise<BlockedIpsResponse> {
    const response = await sysAdminAxios.get<BlockedIpsResponse>("/sysadmin/threats/blocklist", {
      params,
    });
    return response.data;
  },

  async manuallyBlockIp(data: ManualBanInput): Promise<{ message: string; record: BlockedIpRecord }> {
    const response = await sysAdminAxios.post<{ message: string; record: BlockedIpRecord }>(
      "/sysadmin/threats/blocklist",
      data
    );
    return response.data;
  },

  async unblockIp(
    id: number | string,
    reason?: string,
    stepUpPassword?: string
  ): Promise<{ message: string; result: any }> {
    const response = await sysAdminAxios.delete<{ message: string; result: any }>(
      `/sysadmin/threats/blocklist/${id}`,
      {
        data: { reason, stepUpPassword },
      }
    );
    return response.data;
  },

  async getWhitelistedIps(): Promise<{ whitelists: WhitelistedIpRecord[] }> {
    const response = await sysAdminAxios.get<{ whitelists: WhitelistedIpRecord[] }>("/sysadmin/threats/whitelist");
    return response.data;
  },

  async addWhitelistedIp(data: WhitelistInput): Promise<{ message: string; record: WhitelistedIpRecord }> {
    const response = await sysAdminAxios.post<{ message: string; record: WhitelistedIpRecord }>(
      "/sysadmin/threats/whitelist",
      data
    );
    return response.data;
  },

  async removeWhitelistedIp(id: number): Promise<{ message: string }> {
    const response = await sysAdminAxios.delete<{ message: string }>(`/sysadmin/threats/whitelist/${id}`);
    return response.data;
  },
};

