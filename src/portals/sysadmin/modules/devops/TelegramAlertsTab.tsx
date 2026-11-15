import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Server,
  Database,
  HardDrive,
  Info,
  X,
  Code,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { useSysAdminPermissions } from "../../context/SysAdminPermissionsContext";
import type { AlertStatusResponse, SysAdminAlertRecord } from "../../../../types/sysAdmin";
import { MobileResponsiveTable } from "../../../../components/table";

export const TelegramAlertsTab: React.FC = () => {
  const { can } = useSysAdminPermissions();
  const canSendTestAlert = can("devops.services");
  const [alertStatus, setAlertStatus] = useState<AlertStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Metadata inspector modal
  const [inspectAlert, setInspectAlert] = useState<SysAdminAlertRecord | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sysAdminApiService.getAlertStatus();
      setAlertStatus(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load Telegram alert status.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSendTestAlert = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await sysAdminApiService.sendTestAlert();
      setTestResult(res);
      await fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to trigger test alert.";
      setTestResult({ success: false, message: msg });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Integration Status KPI & Dispatch Test */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Status Card */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-board-plate border border-edge space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-status-moving-fill border border-status-moving-ink/30 flex items-center justify-center text-status-moving-ink">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Emergency Telegram Alert Webhook</h3>
                <span className="text-[11px] font-mono text-ink-muted">Automated IT Incident Bot</span>
              </div>
            </div>

            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                alertStatus?.isConfigured
                  ? "bg-status-done-fill text-status-done-ink border-status-done-ink/30"
                  : "bg-status-waiting-fill text-status-waiting-ink border-status-waiting-ink/30"
              }`}
            >
              {alertStatus?.isConfigured ? "BOT CONFIGURED & ACTIVE" : "BOT UNCONFIGURED"}
            </span>
          </div>

          <p className="text-xs text-ink leading-relaxed">
            The emergency bot delivers high-priority infrastructure and security incidents directly to the authorized IT Telegram channel via HTTP Bot API webhooks.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-board-ground border border-edge">
              <div className="text-[10px] uppercase font-mono text-ink-muted">Channel Chat ID</div>
              <div className="text-xs font-mono font-bold text-ink mt-1">
                {alertStatus?.maskedChatId || "Not Configured"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-board-ground border border-edge">
              <div className="text-[10px] uppercase font-mono text-ink-muted">Total Alerts Sent</div>
              <div className="text-lg font-mono font-bold text-status-done-ink mt-0.5 tabular-nums">
                {alertStatus?.totalAlertsSent ?? "--"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-board-ground border border-edge col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase font-mono text-ink-muted">Dispatch Protocol</div>
              <div className="text-xs font-mono font-bold text-status-moving-ink mt-1">
                HTML + Strict SSL
              </div>
            </div>
          </div>
        </div>

        {/* Action Card: Test Dispatcher */}
        <div className="p-5 rounded-xl bg-board-plate border border-edge flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h3 className="text-xs font-bold font-mono uppercase text-ink flex items-center gap-2">
              <Send className="w-4 h-4 text-status-act-ink" />
              <span>Diagnostic Trigger</span>
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Verify webhook deliverability by sending an immediate test notification to the configured Telegram chat.
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                testResult.success
                  ? "bg-status-done-fill border border-status-done-ink/30 text-status-done-ink"
                  : "bg-status-act-fill border border-status-act-ink/30 text-status-act-ink"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-status-done-ink shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-status-act-ink shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {canSendTestAlert ? (
            <button
              onClick={handleSendTestAlert}
              disabled={isSendingTest}
              className="w-full py-2.5 px-4 rounded-xl bg-signal hover:bg-signal-deep font-semibold text-xs text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${isSendingTest ? "animate-spin" : ""}`} />
              <span>{isSendingTest ? "Dispatching..." : "Send Test Alert"}</span>
            </button>
          ) : (
            <div className="rounded-lg border border-hairline bg-board-ground px-3 py-2 text-[11px] text-ink-muted">
              Read-only view: dispatching test alerts requires Service & Maintenance permissions.
            </div>
          )}
        </div>
      </div>

      {/* Monitored Trigger Categories */}
      <div className="p-5 rounded-xl bg-board-plate border border-edge space-y-4">
        <h3 className="text-xs font-bold font-mono uppercase text-ink flex items-center gap-2">
          <Info className="w-4 h-4 text-status-moving-ink" />
          <span>Core Automated Trigger Rules</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-board-ground border border-edge space-y-1.5">
            <div className="flex items-center gap-2 text-status-act-ink text-xs font-bold font-mono">
              <ShieldAlert className="w-4 h-4" />
              <span>Critical IP Auto-Ban</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Dispatches when the Dual-Tier Threat Engine blocks a malicious bot probe or directory traversal attempt.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-board-ground border border-edge space-y-1.5">
            <div className="flex items-center gap-2 text-status-moving-ink text-xs font-bold font-mono">
              <Server className="w-4 h-4" />
              <span>Service Restarts</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Dispatches when PM2 backend or Nginx reverse proxy reload is initiated by an administrator.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-board-ground border border-edge space-y-1.5">
            <div className="flex items-center gap-2 text-status-waiting-ink text-xs font-bold font-mono">
              <Database className="w-4 h-4" />
              <span>Database Disconnect</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Dispatches when MariaDB roundtrip fails, latency spikes, or nightly database backup fails.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-board-ground border border-edge space-y-1.5">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold font-mono">
              <HardDrive className="w-4 h-4" />
              <span>Disk Space &gt;85%</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Dispatches when host storage exceeds safety thresholds, warning of impending capacity limits.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Alerts Audit Table */}
      {(() => {
        const rawAlerts = alertStatus?.recentAlerts || [];
        const filteredAlerts = rawAlerts.filter(
          (a) =>
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.alertType.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.message.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const desktopTable = (
          <div className="p-5 rounded-xl bg-board-plate border border-edge space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase text-ink flex items-center gap-2">
                <Bell className="w-4 h-4 text-status-done-ink" />
                <span>Recent Telegram Alerts History (Last 10)</span>
              </h3>
              <button
                onClick={fetchStatus}
                disabled={isLoading}
                className="p-1.5 rounded-lg bg-board-ground hover:bg-board-ground border border-edge text-ink transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-status-act-ink" : ""}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-edge text-ink-muted font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-ink-muted font-mono">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-status-act-ink" />
                        Loading alert audit history...
                      </td>
                    </tr>
                  ) : filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-ink-muted font-mono">
                        No emergency alerts recorded in audit logs.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((a) => (
                      <tr key={a.id} className="hover:bg-board-ground transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-ink">
                          {a.alertType}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                              a.severity === "CRITICAL"
                                ? "bg-status-act-fill text-status-act-ink border-status-act-ink/30"
                                : a.severity === "HIGH"
                                ? "bg-status-waiting-fill text-status-waiting-ink border-status-waiting-ink/30"
                                : "bg-status-moving-fill text-status-moving-ink border-status-moving-ink/30"
                            }`}
                          >
                            {a.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-ink font-medium max-w-xs truncate">
                          {a.title}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                              a.status === "SENT"
                                ? "bg-status-done-fill text-status-done-ink border-status-done-ink/30"
                                : a.status === "SUPPRESSED"
                                ? "bg-board-ground text-ink-muted border-edge"
                                : "bg-status-act-fill text-status-act-ink border-status-act-ink/30"
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-ink-muted text-[11px]">
                          {new Date(a.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setInspectAlert(a)}
                            className="px-2.5 py-1 rounded-lg bg-board-ground hover:bg-board-ground border border-edge text-ink text-[11px] font-mono transition-colors inline-flex items-center gap-1.5"
                          >
                            <Code className="w-3 h-3 text-status-moving-ink" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

        return (
          <MobileResponsiveTable<SysAdminAlertRecord>
            data={filteredAlerts}
            keyExtractor={(a) => a.id}
            isLoading={isLoading}
            desktopView={desktopTable}
            primaryHeader="Alert / Type"
            secondaryHeader="Severity & Status"
            renderPrimary={(a) => (
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-status-done-ink shrink-0" />
                <div className="min-w-0">
                  <div className="font-mono font-medium text-ink text-xs truncate" title={a.title}>
                    {a.title}
                  </div>
                  <div className="text-[10px] text-ink-muted font-mono">
                    {a.alertType} · {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            )}
            renderSecondary={(a) => (
              <div className="text-right flex flex-col items-end gap-1">
                <span
                  className={`inline-block text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                    a.severity === "CRITICAL"
                      ? "bg-status-act-fill text-status-act-ink border-status-act-ink/30"
                      : a.severity === "HIGH"
                      ? "bg-status-waiting-fill text-status-waiting-ink border-status-waiting-ink/30"
                      : "bg-status-moving-fill text-status-moving-ink border-status-moving-ink/30"
                  }`}
                >
                  {a.severity}
                </span>
                <span
                  className={`inline-block text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                    a.status === "SENT"
                      ? "bg-status-done-fill text-status-done-ink border-status-done-ink/30"
                      : a.status === "SUPPRESSED"
                      ? "bg-board-ground text-ink-muted border-edge"
                      : "bg-status-act-fill text-status-act-ink border-status-act-ink/30"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            )}
            renderPreview={(a) => (
              <div className="space-y-1.5 pt-1 text-ink">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-muted">Timestamp:</span>
                  <span className="font-mono text-ink-muted text-[10px]">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-[11px]">
                  <span className="text-ink-muted block mb-0.5">Message:</span>
                  <div className="font-mono text-[10px] text-ink bg-board-ground p-2 rounded border border-edge line-clamp-2">
                    {a.message}
                  </div>
                </div>
              </div>
            )}
            renderRowActions={(a) => (
              <button
                type="button"
                onClick={() => setInspectAlert(a)}
                className="w-full py-2 px-3 rounded-xl bg-board-ground hover:bg-board-ground border border-edge text-ink text-xs font-mono flex items-center justify-center gap-1.5 min-h-[44px] active:scale-95 transition-all"
              >
                <Code className="w-3.5 h-3.5 text-status-moving-ink" />
                <span>Inspect Payload</span>
              </button>
            )}
            inspectorTitle={(a) => a.title}
            inspectorSubtitle={(a) => `${a.alertType} Incident Telemetry`}
            inspectorStatusBadge={(a) => (
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                  a.severity === "CRITICAL"
                    ? "bg-status-act-fill text-status-act-ink border-status-act-ink/30"
                    : a.severity === "HIGH"
                    ? "bg-status-waiting-fill text-status-waiting-ink border-status-waiting-ink/30"
                    : "bg-status-moving-fill text-status-moving-ink border-status-moving-ink/30"
                }`}
              >
                {a.severity}
              </span>
            )}
            inspectorSections={(a) => [
              {
                title: "Alert Overview",
                items: [
                  { label: "Incident Type", value: a.alertType },
                  { label: "Severity Level", value: a.severity },
                  { label: "Delivery Status", value: a.status },
                  { label: "Timestamp", value: new Date(a.createdAt).toLocaleString(), fullWidth: true },
                  { label: "Incident Title", value: a.title, fullWidth: true },
                ],
              },
              {
                title: "Message & Payload",
                items: [
                  { label: "Message Content", value: a.message, fullWidth: true },
                  ...(a.metadata
                    ? [{ label: "Metadata JSON", value: JSON.stringify(a.metadata, null, 2), fullWidth: true, isCode: true }]
                    : []),
                ],
              },
            ]}
            searchPlaceholder="Search alerts by title or message..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />
        );
      })()}

      {/* Inspect Alert Modal */}
      {inspectAlert && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-board-plate border border-edge rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div className="flex items-center gap-2 text-ink font-bold text-sm">
                <Bell className="w-4 h-4 text-status-done-ink" />
                <span>Alert Incident Details</span>
              </div>
              <button
                onClick={() => setInspectAlert(null)}
                className="text-ink-muted hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-board-ground border border-edge space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-ink-muted">Type:</span>
                  <span className="text-ink font-semibold">{inspectAlert.alertType}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-ink-muted">Severity:</span>
                  <span className="text-status-waiting-ink font-semibold">{inspectAlert.severity}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-ink-muted">Status:</span>
                  <span className="text-status-done-ink font-semibold">{inspectAlert.status}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-ink-muted">Dispatched At:</span>
                  <span className="text-ink">{new Date(inspectAlert.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-ink-muted mb-1">Message Content:</label>
                <div className="p-3 rounded-lg bg-board-ground border border-edge text-ink font-mono text-[11px] leading-relaxed">
                  {inspectAlert.message}
                </div>
              </div>

              {inspectAlert.metadata && (
                <div>
                  <label className="block text-[11px] font-mono text-ink-muted mb-1">Metadata Payload:</label>
                  <pre className="p-3 rounded-lg bg-board-ground border border-edge text-status-moving-ink font-mono text-[10px] overflow-x-auto max-h-40">
                    {JSON.stringify(inspectAlert.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-edge">
              <button
                type="button"
                onClick={() => setInspectAlert(null)}
                className="px-4 py-1.5 rounded-lg bg-board-ground hover:bg-board-ground border border-edge text-xs text-ink font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
