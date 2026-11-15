import React, { useState } from "react";
import {
  Server,
  Globe,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  X,
  Terminal,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { Bot } from "lucide-react";
import type { SystemTelemetry } from "../../../../types/sysAdmin";
import { useSysAdminPermissions } from "../../context/SysAdminPermissionsContext";

interface ServiceControlsTabProps {
  telemetry: SystemTelemetry | null;
  onRefreshTelemetry: () => void;
}

export const ServiceControlsTab: React.FC<ServiceControlsTabProps> = ({
  telemetry,
  onRefreshTelemetry,
}) => {
  const { can } = useSysAdminPermissions();
  const canControlServices = can("devops.services");
  const canToggleFeatures = can("devops.features");
  const [selectedService, setSelectedService] = useState<"backend" | "nginx" | null>(null);
  const [stepUpPassword, setStepUpPassword] = useState("");
  const [isRestarting, setIsRestarting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 500 Server Error [nginx] Switch Button State
  const [isServerErrorActive, setIsServerErrorActive] = useState<boolean>(() => {
    return localStorage.getItem("sugo_simulate_500_error") === "true";
  });
  const [isTogglingServerError, setIsTogglingServerError] = useState(false);

  React.useEffect(() => {
    if (telemetry && typeof telemetry.serverErrorSimulated === "boolean") {
      setIsServerErrorActive(telemetry.serverErrorSimulated);
      localStorage.setItem("sugo_simulate_500_error", telemetry.serverErrorSimulated ? "true" : "false");
    }
  }, [telemetry]);

  const handleToggleServerError = async () => {
    if (isTogglingServerError) return;
    const nextState = !isServerErrorActive;
    setIsTogglingServerError(true);
    setResultMessage(null);
    try {
      const res = await sysAdminApiService.toggleServerError(nextState);
      setIsServerErrorActive(res.active);
      localStorage.setItem("sugo_simulate_500_error", res.active ? "true" : "false");
      window.dispatchEvent(
        new CustomEvent("sugo:server-error-update", { detail: { active: res.active } })
      );
      setResultMessage({
        type: "success",
        text: res.active
          ? '500 Server Error overlay enabled: "500 Server Error [nginx] error" on public login screen.'
          : "500 Server Error overlay disabled. Normal login screen restored.",
      });
      onRefreshTelemetry();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle 500 server error.";
      setResultMessage({
        type: "error",
        text: msg,
      });
    } finally {
      setIsTogglingServerError(false);
    }
  };

  // Dispatcher Help Desk AI suggestions switch. Read from telemetry, so the
  // card shows what the server holds rather than what this browser last set.
  const [isAiSuggestionsEnabled, setIsAiSuggestionsEnabled] = useState(false);
  const [isTogglingAiSuggestions, setIsTogglingAiSuggestions] = useState(false);

  React.useEffect(() => {
    if (telemetry && typeof telemetry.dispatcherAiSuggestionsEnabled === "boolean") {
      setIsAiSuggestionsEnabled(telemetry.dispatcherAiSuggestionsEnabled);
    }
  }, [telemetry]);

  const handleToggleAiSuggestions = async () => {
    if (isTogglingAiSuggestions) return;
    const nextState = !isAiSuggestionsEnabled;
    setIsTogglingAiSuggestions(true);
    setResultMessage(null);
    try {
      const res = await sysAdminApiService.toggleDispatcherAiSuggestions(nextState);
      setIsAiSuggestionsEnabled(res.enabled);
      setResultMessage({
        type: "success",
        text: res.enabled
          ? "AI suggestions turned on. Dispatchers see the Generate suggestion button the next time they open a reason box."
          : "AI suggestions turned off. The Generate suggestion button is hidden from every dispatcher.",
      });
      onRefreshTelemetry();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update dispatcher AI suggestions.";
      setResultMessage({
        type: "error",
        text: msg,
      });
    } finally {
      setIsTogglingAiSuggestions(false);
    }
  };

  // Kuya Sugo AI Assistant (Owner Portal) switch. Read from telemetry.
  const [isKuyaSugoEnabled, setIsKuyaSugoEnabled] = useState(true);
  const [isTogglingKuyaSugo, setIsTogglingKuyaSugo] = useState(false);

  React.useEffect(() => {
    if (telemetry && typeof telemetry.kuyaSugoEnabled === "boolean") {
      setIsKuyaSugoEnabled(telemetry.kuyaSugoEnabled);
    }
  }, [telemetry]);

  const handleToggleKuyaSugo = async () => {
    if (isTogglingKuyaSugo) return;
    const nextState = !isKuyaSugoEnabled;
    setIsTogglingKuyaSugo(true);
    setResultMessage(null);
    try {
      const res = await sysAdminApiService.toggleKuyaSugo(nextState);
      setIsKuyaSugoEnabled(res.enabled);
      setResultMessage({
        type: "success",
        text: res.enabled
          ? "Kuya Sugo turned on. The floating button and copilot drawer are visible in the Owner Portal."
          : "Kuya Sugo turned off. The floating button and copilot drawer are hidden from the Owner Portal.",
      });
      onRefreshTelemetry();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update Kuya Sugo status.";
      setResultMessage({
        type: "error",
        text: msg,
      });
    } finally {
      setIsTogglingKuyaSugo(false);
    }
  };

  const handleOpenModal = (service: "backend" | "nginx") => {
    setSelectedService(service);
    setStepUpPassword("");
    setResultMessage(null);
  };

  const handleCloseModal = () => {
    if (isRestarting) return;
    setSelectedService(null);
    setStepUpPassword("");
  };

  const handleExecuteRestart = async () => {
    if (!selectedService) return;
    setIsRestarting(true);
    setResultMessage(null);

    try {
      const res = await sysAdminApiService.restartService(selectedService, stepUpPassword || undefined);
      setResultMessage({
        type: "success",
        text: res.message || `${selectedService === "backend" ? "Backend API" : "Nginx Reverse Proxy"} restart executed cleanly.`,
      });
      setSelectedService(null);
      setStepUpPassword("");
      setTimeout(() => {
        onRefreshTelemetry();
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Service restart failed.";
      setResultMessage({
        type: "error",
        text: msg,
      });
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Operational Warning Banner */}
      <div className="p-4 rounded-xl bg-status-waiting-fill border border-status-waiting-ink/30 text-xs text-status-waiting-ink flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-status-waiting-ink shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-status-waiting-ink">Production Service Control Precaution</div>
          <p className="text-ink text-[11px] leading-relaxed">
            Triggering a service restart recycles live processes on the Linux Contabo VPS. For the Node.js backend, a 500ms response buffer is observed so that the execution result is delivered back to this console before PM2 recycles the process. For Nginx, configuration syntax is pre-validated (<code className="font-mono text-status-waiting-ink">nginx -t</code>) before reloading.
          </p>
        </div>
      </div>

      {resultMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
            resultMessage.type === "success"
              ? "bg-status-done-fill border-status-done-ink/30 text-status-done-ink"
              : "bg-status-act-fill border-status-act-ink/30 text-status-act-ink"
          }`}
        >
          <div className="flex items-center gap-2">
            {resultMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-status-done-ink shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-status-act-ink shrink-0" />
            )}
            <span>{resultMessage.text}</span>
          </div>
          <button
            onClick={() => setResultMessage(null)}
            className="text-ink-muted hover:text-ink text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PM2 Backend Service Card */}
        <div className="p-5 rounded-xl bg-board-plate border border-edge flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-status-done-fill border border-status-done-ink/30 flex items-center justify-center text-status-done-ink">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">capstone-backend</h3>
                  <span className="text-[11px] font-mono text-ink-muted">Node.js Express API Process</span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-status-done-fill text-status-done-ink border border-status-done-ink/30">
                <span className="w-1.5 h-1.5 rounded-full bg-status-done-fill animate-pulse" />
                ONLINE (PM2)
              </span>
            </div>

            <p className="text-xs text-ink leading-relaxed">
              Main REST API gateway, WebSocket/Socket.IO real-time hub, Prisma ORM database connection pool, and background cron scheduling daemon.
            </p>

            <div className="p-3 rounded-lg bg-board-ground border border-edge space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center justify-between text-ink-muted">
                <span>Process ID (PID):</span>
                <span className="text-ink font-semibold">{telemetry?.server.pid || "--"}</span>
              </div>
              <div className="flex items-center justify-between text-ink-muted">
                <span>Listening Port:</span>
                <span className="text-ink font-semibold">5000 (Internal)</span>
              </div>
              <div className="flex items-center justify-between text-ink-muted">
                <span>Node.js Version:</span>
                <span className="text-ink">{telemetry?.server.nodeVersion || "--"}</span>
              </div>
              <div className="flex items-center justify-between text-ink-muted">
                <span>Restart Command:</span>
                <span className="text-status-waiting-ink">pm2 restart capstone-backend</span>
              </div>
            </div>
          </div>

          {canControlServices ? (
            <div className="pt-2">
              <button
                onClick={() => handleOpenModal("backend")}
                className="w-full py-2.5 px-4 rounded-xl bg-signal hover:bg-signal-deep font-semibold text-xs text-white transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restart Backend Process</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 text-[11px] font-mono text-ink-muted">
              Read-only: requires Service Control permission
            </div>
          )}
        </div>

        {/* Nginx Reverse Proxy Service Card */}
        <div className="p-5 rounded-xl bg-board-plate border border-edge flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-status-moving-fill border border-status-moving-ink/30 flex items-center justify-center text-status-moving-ink">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">nginx</h3>
                  <span className="text-[11px] font-mono text-ink-muted">Edge Reverse Proxy &amp; SSL</span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-status-moving-fill text-status-moving-ink border border-status-moving-ink/30">
                <span className="w-1.5 h-1.5 rounded-full bg-status-moving-fill animate-pulse" />
                ACTIVE (systemd)
              </span>
            </div>

            <p className="text-xs text-ink leading-relaxed">
              Handles TLS/SSL termination, edge request routing, static file delivery for the web client, and edge IP blocklist filtering rules.
            </p>

            <div className="p-3 rounded-lg bg-board-ground border border-edge space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center justify-between text-ink-muted">
                <span>Public Ingress:</span>
                <span className="text-ink font-semibold">Ports 80 &bull; 443 (HTTPS)</span>
              </div>
              <div className="flex items-center justify-between text-ink-muted">
                <span>Primary Host:</span>
                <span className="text-ink">sugo-express.org</span>
              </div>
              <div className="flex items-center justify-between text-ink-muted">
                <span>Syntax Verification:</span>
                <span className="text-status-done-ink">nginx -t (Enforced)</span>
              </div>
              <div className="flex items-center justify-between text-ink-muted">
                <span>Reload Command:</span>
                <span className="text-status-waiting-ink">systemctl reload nginx</span>
              </div>
            </div>
          </div>

          {canControlServices ? (
            <div className="pt-2">
              <button
                onClick={() => handleOpenModal("nginx")}
                className="w-full py-2.5 px-4 rounded-xl bg-status-moving-ink hover:bg-status-moving-ink font-semibold text-xs text-white transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Verify &amp; Reload Nginx</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 text-[11px] font-mono text-ink-muted">
              Read-only: requires Service Control permission
            </div>
          )}
        </div>
      </div>

      {/* 500 Server Error Simulation Switch Card */}
      <div className="p-5 rounded-xl bg-board-plate border border-edge space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isServerErrorActive
                  ? "bg-status-act-fill border border-status-act-ink/30 text-status-act-ink"
                  : "bg-board-ground border border-edge text-ink-muted"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink">Nginx 500 Outage Simulation</h3>
                {isServerErrorActive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-status-act-fill text-status-act-ink border border-status-act-ink/30 animate-pulse">
                    ACTIVE ON LOGIN SCREEN
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-board-ground text-ink-muted border border-edge">
                    INACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-ink mt-1 leading-relaxed">
                Overlays a white background with message text <span className="font-mono text-status-waiting-ink">"500 Server Error [nginx] error"</span> on the public login screen only. Sysadmin portal login is strictly excluded from this overlay.
              </p>
            </div>
          </div>

          {/* Switch Button named "Turn on 500 Server Error" */}
          {canToggleFeatures ? (
            <div className="flex items-center gap-3 sm:self-center shrink-0 bg-board-ground px-4 py-2.5 rounded-xl border border-edge">
              <span className="text-xs font-semibold text-ink">
                Turn on 500 Server Error
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isServerErrorActive}
                onClick={handleToggleServerError}
                disabled={isTogglingServerError}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isServerErrorActive ? "bg-signal" : "bg-board-ground"
                } ${isTogglingServerError ? "opacity-50 cursor-not-allowed" : ""}`}
                title="Turn on 500 Server Error"
                aria-label="Turn on 500 Server Error"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isServerErrorActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ) : (
            <span className="text-[11px] font-mono text-ink-muted sm:self-center shrink-0">
              Read-only
            </span>
          )}
        </div>
      </div>

      {/* Dispatcher Help Desk AI Suggestions Switch Card */}
      <div className="p-5 rounded-xl bg-board-plate border border-edge space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isAiSuggestionsEnabled
                  ? "bg-status-done-fill border border-status-done-ink/30 text-status-done-ink"
                  : "bg-board-ground border border-edge text-ink-muted"
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink">Dispatcher AI Suggestions</h3>
                {isAiSuggestionsEnabled ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-status-done-fill text-status-done-ink border border-status-done-ink/30">
                    ON FOR DISPATCHERS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-board-ground text-ink-muted border border-edge">
                    OFF
                  </span>
                )}
              </div>
              <p className="text-xs text-ink mt-1 leading-relaxed">
                Shows the <span className="font-mono text-status-waiting-ink">Generate suggestion</span> button and the Tab shortcut in the dispatcher Help Desk, for every dispatcher. While off, the button is hidden and the server refuses suggestion requests.
              </p>
            </div>
          </div>

          {canToggleFeatures ? (
            <div className="flex items-center gap-3 sm:self-center shrink-0 bg-board-ground px-4 py-2.5 rounded-xl border border-edge">
              <span className="text-xs font-semibold text-ink">
                Turn on AI suggestions
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isAiSuggestionsEnabled}
                onClick={handleToggleAiSuggestions}
                disabled={isTogglingAiSuggestions}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAiSuggestionsEnabled ? "bg-go" : "bg-board-ground"
                } ${isTogglingAiSuggestions ? "opacity-50 cursor-not-allowed" : ""}`}
                title="Turn on AI suggestions"
                aria-label="Turn on AI suggestions"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isAiSuggestionsEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ) : (
            <span className="text-[11px] font-mono text-ink-muted sm:self-center shrink-0">
              Read-only
            </span>
          )}
        </div>
      </div>

      {/* Kuya Sugo AI Assistant (Owner Portal) Switch Card */}
      <div className="p-5 rounded-xl bg-board-plate border border-edge space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isKuyaSugoEnabled
                  ? "bg-status-done-fill border border-status-done-ink/30 text-status-done-ink"
                  : "bg-board-ground border border-edge text-ink-muted"
              }`}
            >
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink">Kuya Sugo AI Assistant</h3>
                {isKuyaSugoEnabled ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-status-done-fill text-status-done-ink border border-status-done-ink/30">
                    ON FOR OWNER
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-board-ground text-ink-muted border border-edge">
                    HIDDEN / OFF
                  </span>
                )}
              </div>
              <p className="text-xs text-ink mt-1 leading-relaxed">
                Controls visibility of the Kuya Sugo floating action button and chat companion drawer across the Owner Portal. When turned off, the button and keyboard shortcut (Ctrl+J) are completely hidden from the owner.
              </p>
            </div>
          </div>

          {canToggleFeatures ? (
            <div className="flex items-center gap-3 sm:self-center shrink-0 bg-board-ground px-4 py-2.5 rounded-xl border border-edge">
              <span className="text-xs font-semibold text-ink">
                {isKuyaSugoEnabled ? "Turn off Kuya Sugo" : "Turn on Kuya Sugo"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isKuyaSugoEnabled}
                onClick={handleToggleKuyaSugo}
                disabled={isTogglingKuyaSugo}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isKuyaSugoEnabled ? "bg-go" : "bg-board-ground"
                } ${isTogglingKuyaSugo ? "opacity-50 cursor-not-allowed" : ""}`}
                title={isKuyaSugoEnabled ? "Turn off Kuya Sugo" : "Turn on Kuya Sugo"}
                aria-label={isKuyaSugoEnabled ? "Turn off Kuya Sugo" : "Turn on Kuya Sugo"}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isKuyaSugoEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ) : (
            <span className="text-[11px] font-mono text-ink-muted sm:self-center shrink-0">
              Read-only
            </span>
          )}
        </div>
      </div>

      {/* Confirmation & Step-Up Password Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-board-plate border border-edge rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div className="flex items-center gap-2 text-ink font-bold text-sm">
                <ShieldAlert className="w-4 h-4 text-status-act-ink" />
                <span>Confirm Service Restart</span>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isRestarting}
                className="text-ink-muted hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-ink">
              <p>
                You are requesting an immediate restart of the production service:{" "}
                <span className="font-mono font-bold text-ink">
                  {selectedService === "backend" ? "capstone-backend (PM2)" : "nginx (systemd)"}
                </span>
                .
              </p>

              <div className="p-3 rounded-lg bg-board-ground border border-edge font-mono text-[11px] text-status-waiting-ink flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <span>
                  {selectedService === "backend"
                    ? "pm2 restart capstone-backend"
                    : "nginx -t && systemctl reload nginx"}
                </span>
              </div>

              <p className="text-ink-muted text-[11px]">
                Enter your IT administrator password to authorize this privileged infrastructure action.
              </p>

              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-medium text-ink-muted">
                  Step-Up Administrator Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-3" />
                  <input
                    type="password"
                    value={stepUpPassword}
                    onChange={(e) => setStepUpPassword(e.target.value)}
                    placeholder="Enter password..."
                    disabled={isRestarting}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-board-ground border border-edge text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-status-act-ink/30"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-edge">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isRestarting}
                className="px-3.5 py-1.5 rounded-lg bg-board-ground hover:bg-board-ground border border-edge text-xs text-ink font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestart}
                disabled={isRestarting || !stepUpPassword}
                className="px-4 py-1.5 rounded-lg bg-signal hover:bg-signal-deep disabled:opacity-50 text-xs font-semibold text-white transition-colors flex items-center gap-2"
              >
                {isRestarting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Restarting...</span>
                  </>
                ) : (
                  <span>Authorize &amp; Restart</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
