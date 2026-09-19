import React, { useEffect, useState, useCallback } from "react";
import {
  Laptop,
  Globe,
  Clock,
  ShieldCheck,
  LogOut,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { apiService } from "../../services/apiService";
import { ActiveSession, AccountLoginLog } from "../../types/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function getDeviceIcon(deviceInfo: string) {
  const lower = deviceInfo.toLowerCase();
  if (lower.includes("android") || lower.includes("ios") || lower.includes("phone")) {
    return <Smartphone size={18} className="text-slate-400" />;
  }
  return <Laptop size={18} className="text-slate-400" />;
}

function getStatusBadge(status: string, reason?: string | null) {
  const norm = status.toUpperCase();
  if (norm === "SUCCESS") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-plate text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 size={12} />
        Signed In
      </span>
    );
  }
  if (norm === "LOGOUT") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-plate text-[11px] font-medium bg-board-ground text-ink-muted border border-edge">
        <LogOut size={12} />
        Signed Out
      </span>
    );
  }
  if (norm === "SUPERSEDED" || reason === "SUPERSEDED_BY_ANOTHER_DEVICE") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-plate text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <AlertTriangle size={12} />
        Superseded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-plate text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
      <AlertCircle size={12} />
      {reason || status}
    </span>
  );
}

interface AccountSecurityLogsViewProps {
  showHeader?: boolean;
}

export const AccountSecurityLogsView: React.FC<AccountSecurityLogsViewProps> = ({
  showHeader = true,
}) => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [logs, setLogs] = useState<AccountLoginLog[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);
  const [confirmRevokeOthersOpen, setConfirmRevokeOthersOpen] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    const data = await apiService.getActiveSessions();
    setSessions(data);
    setLoadingSessions(false);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    const data = await apiService.getAccountLoginLogs(30);
    setLogs(data);
    setLoadingLogs(false);
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchLogs();
  }, [fetchSessions, fetchLogs]);

  const handleRevokeSingle = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    const success = await apiService.revokeSession(sessionId);
    setRevokingSessionId(null);
    if (success) {
      toast.success("Device session signed out.");
      fetchSessions();
      fetchLogs();
    } else {
      toast.error("Failed to sign out device.");
    }
  };

  const handleRevokeOthers = async () => {
    setIsRevokingOthers(true);
    const success = await apiService.revokeOtherSessions();
    setIsRevokingOthers(false);
    setConfirmRevokeOthersOpen(false);
    if (success) {
      toast.success("All other device sessions have been signed out.");
      fetchSessions();
      fetchLogs();
    } else {
      toast.error("Failed to sign out other devices.");
    }
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Optional Header */}
      {showHeader && (
        <div className="border-b border-hairline pb-4">
          <h2 className="text-xl font-bold text-ink tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="text-signal" size={24} />
            Account &amp; Security Logs
          </h2>
          <p className="text-body text-ink-muted mt-1">
            Monitor your active login sessions, manage trusted devices, and inspect account access history.
          </p>
        </div>
      )}

      {/* SECTION 1: ACTIVE SESSIONS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-ink">Active Devices</h3>
            <span className="text-xs px-2 py-0.5 rounded-plate bg-board-ground text-ink-muted border border-edge font-mono">
              {sessions.length}
            </span>
          </div>

          {otherSessions.length > 0 && (
            <button
              onClick={() => setConfirmRevokeOthersOpen(true)}
              className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 px-3 py-1.5 rounded-plate border border-rose-500/30 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              Sign Out All Other Devices
            </button>
          )}
        </div>

        {loadingSessions ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-32 rounded-plate bg-board-plate border border-edge animate-pulse"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center rounded-plate bg-board-plate border border-edge text-ink-muted text-body">
            No active sessions found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className={`p-4 rounded-plate border transition-all ${
                  sess.isCurrent
                    ? "bg-board-plate border-emerald-500/40 ring-1 ring-emerald-500/20"
                    : "bg-board-plate border-edge hover:border-ink/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-plate bg-board-ground border border-edge flex items-center justify-center shrink-0">
                      {getDeviceIcon(sess.deviceInfo)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-label text-ink font-medium truncate">
                          {sess.deviceInfo}
                        </h4>
                        {sess.isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-plate text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            This Device
                          </span>
                        )}
                      </div>
                      <p className="text-micro font-mono text-ink-muted flex items-center gap-1 mt-0.5 truncate">
                        <Globe size={12} className="text-ink-muted shrink-0" />
                        {sess.ipAddress}
                      </p>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <button
                      onClick={() => handleRevokeSingle(sess.id)}
                      disabled={revokingSessionId === sess.id}
                      className="text-xs text-ink-muted hover:text-rose-600 dark:hover:text-rose-400 px-2.5 py-1 rounded-plate border border-edge hover:border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      title="Sign out this device"
                    >
                      {revokingSessionId === sess.id ? "Ending..." : "Sign Out"}
                    </button>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-hairline flex items-center justify-between text-micro text-ink-muted">
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-ink-muted" />
                    First login: {new Date(sess.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                  <span>
                    Last active: {new Date(sess.lastUsedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: LOGIN HISTORY & AUDIT LOG */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Login History &amp; Security Logs</h3>
          <button
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="text-xs flex items-center gap-1.5 text-ink-muted hover:text-ink px-2.5 py-1 rounded-plate hover:bg-board-ground border border-edge transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loadingLogs ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loadingLogs ? (
          <div className="h-48 rounded-plate bg-board-plate border border-edge animate-pulse" />
        ) : logs.length === 0 ? (
          <div className="p-8 text-center rounded-plate bg-board-plate border border-edge text-ink-muted text-body">
            No login history records found.
          </div>
        ) : (
          <div className="rounded-plate border border-edge bg-board-plate overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-board-ground border-b border-edge text-ink-muted font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Date &amp; Time</th>
                    <th className="px-4 py-3">Device / Browser</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-ink">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-board-ground/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString([], {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          {getDeviceIcon(log.deviceInfo || log.userAgent)}
                          {log.deviceInfo || "Unknown Device"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                        {log.ipAddress}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(log.status, log.revokedReason)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Revoke All Other Devices Confirmation Modal */}
      {confirmRevokeOthersOpen && (
        <Dialog open={true} onOpenChange={() => setConfirmRevokeOthersOpen(false)}>
          <DialogContent className="max-w-md bg-board-plate border border-edge text-ink p-6 rounded-modal">
            <DialogHeader className="gap-3">
              <div className="w-12 h-12 rounded-plate bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <LogOut size={24} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-ink tracking-tight">
                  Sign Out Other Devices?
                </DialogTitle>
                <DialogDescription className="text-ink-muted text-body mt-1">
                  This will immediately terminate all active sessions on other computers, tablets, or phones. Only your current device will remain logged in.
                </DialogDescription>
              </div>
            </DialogHeader>

            <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setConfirmRevokeOthersOpen(false)}
                className="w-full sm:w-1/2 px-4 py-2.5 rounded-plate border border-edge hover:bg-board-ground text-ink font-medium text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeOthers}
                disabled={isRevokingOthers}
                className="w-full sm:w-1/2 px-4 py-2.5 rounded-plate bg-signal hover:bg-signal-deep text-white font-medium text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isRevokingOthers ? "Signing out..." : "Confirm Sign Out"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
