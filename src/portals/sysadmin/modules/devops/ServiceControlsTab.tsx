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
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import type { SystemTelemetry } from "../../../../types/sysAdmin";

interface ServiceControlsTabProps {
  telemetry: SystemTelemetry | null;
  onRefreshTelemetry: () => void;
}

export const ServiceControlsTab: React.FC<ServiceControlsTabProps> = ({
  telemetry,
  onRefreshTelemetry,
}) => {
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
      <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 text-xs text-amber-200/90 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-amber-300">Production Service Control Precaution</div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Triggering a service restart recycles live processes on the Linux Contabo VPS. For the Node.js backend, a 500ms response buffer is observed so that the execution result is delivered back to this console before PM2 recycles the process. For Nginx, configuration syntax is pre-validated (<code className="font-mono text-amber-300">nginx -t</code>) before reloading.
          </p>
        </div>
      </div>

      {resultMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
            resultMessage.type === "success"
              ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-300"
              : "bg-rose-950/60 border-rose-800/60 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {resultMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{resultMessage.text}</span>
          </div>
          <button
            onClick={() => setResultMessage(null)}
            className="text-slate-400 hover:text-white text-xs underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PM2 Backend Service Card */}
        <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">capstone-backend</h3>
                  <span className="text-[11px] font-mono text-slate-400">Node.js Express API Process</span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE (PM2)
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Main REST API gateway, WebSocket/Socket.IO real-time hub, Prisma ORM database connection pool, and background cron scheduling daemon.
            </p>

            <div className="p-3 rounded-lg bg-[#070D1B] border border-slate-800/80 space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>Process ID (PID):</span>
                <span className="text-white font-semibold">{telemetry?.server.pid || "--"}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Listening Port:</span>
                <span className="text-white font-semibold">5000 (Internal)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Node.js Version:</span>
                <span className="text-slate-200">{telemetry?.server.nodeVersion || "--"}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Restart Command:</span>
                <span className="text-amber-300">pm2 restart capstone-backend</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => handleOpenModal("backend")}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 font-semibold text-xs text-white transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart Backend Process</span>
            </button>
          </div>
        </div>

        {/* Nginx Reverse Proxy Service Card */}
        <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">nginx</h3>
                  <span className="text-[11px] font-mono text-slate-400">Edge Reverse Proxy &amp; SSL</span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                ACTIVE (systemd)
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Handles TLS/SSL termination, edge request routing, static file delivery for the web client, and edge IP blocklist filtering rules.
            </p>

            <div className="p-3 rounded-lg bg-[#070D1B] border border-slate-800/80 space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>Public Ingress:</span>
                <span className="text-white font-semibold">Ports 80 &bull; 443 (HTTPS)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Primary Host:</span>
                <span className="text-slate-200">sugo-express.org</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Syntax Verification:</span>
                <span className="text-emerald-400">nginx -t (Enforced)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Reload Command:</span>
                <span className="text-amber-300">systemctl reload nginx</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => handleOpenModal("nginx")}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-700 hover:bg-sky-600 font-semibold text-xs text-white transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Verify &amp; Reload Nginx</span>
            </button>
          </div>
        </div>
      </div>

      {/* 500 Server Error Simulation Switch Card */}
      <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isServerErrorActive
                  ? "bg-red-950/80 border border-red-800/80 text-red-400"
                  : "bg-slate-800/80 border border-slate-700/80 text-slate-400"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Nginx 500 Outage Simulation</h3>
                {isServerErrorActive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/60 animate-pulse">
                    ACTIVE ON LOGIN SCREEN
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                    INACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Overlays a white background with message text <span className="font-mono text-amber-300">"500 Server Error [nginx] error"</span> on the public login screen only. Sysadmin portal login is strictly excluded from this overlay.
              </p>
            </div>
          </div>

          {/* Switch Button named "Turn on 500 Server Error" */}
          <div className="flex items-center gap-3 sm:self-center shrink-0 bg-[#070D1B] px-4 py-2.5 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-white">
              Turn on 500 Server Error
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isServerErrorActive}
              onClick={handleToggleServerError}
              disabled={isTogglingServerError}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isServerErrorActive ? "bg-red-600" : "bg-slate-700"
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
        </div>
      </div>

      {/* Confirmation & Step-Up Password Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1A30] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Confirm Service Restart</span>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isRestarting}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                You are requesting an immediate restart of the production service:{" "}
                <span className="font-mono font-bold text-white">
                  {selectedService === "backend" ? "capstone-backend (PM2)" : "nginx (systemd)"}
                </span>
                .
              </p>

              <div className="p-3 rounded-lg bg-[#070D1B] border border-slate-800 font-mono text-[11px] text-amber-300 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {selectedService === "backend"
                    ? "pm2 restart capstone-backend"
                    : "nginx -t && systemctl reload nginx"}
                </span>
              </div>

              <p className="text-slate-400 text-[11px]">
                Enter your IT administrator password to authorize this privileged infrastructure action.
              </p>

              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-medium text-slate-400">
                  Step-Up Administrator Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={stepUpPassword}
                    onChange={(e) => setStepUpPassword(e.target.value)}
                    placeholder="Enter password..."
                    disabled={isRestarting}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/60"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isRestarting}
                className="px-3.5 py-1.5 rounded-lg bg-[#070D1B] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestart}
                disabled={isRestarting || !stepUpPassword}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors flex items-center gap-2"
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
