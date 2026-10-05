import React, { useState, useEffect, useCallback } from "react";
import {
  Server,
  RefreshCw,
  AlertTriangle,
  Power,
  Database,
  Terminal,
  Bell,
  Activity,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { useSysAdminLanguage } from "../../context/SysAdminLanguageContext";
import type { SystemTelemetry } from "../../../../types/sysAdmin";
import { TelemetryTab } from "./TelemetryTab";
import { ServiceControlsTab } from "./ServiceControlsTab";
import { BackupsTab } from "./BackupsTab";
import { LogsTab } from "./LogsTab";
import { TelegramAlertsTab } from "./TelegramAlertsTab";

type DevOpsSubTab = "telemetry" | "services" | "backups" | "logs" | "alerts";

export const DevOpsModule: React.FC = () => {
  const { t } = useSysAdminLanguage();
  const [activeTab, setActiveTab] = useState<DevOpsSubTab>("telemetry");
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTelemetry = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sysAdminApiService.getTelemetry();
      setTelemetry(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load telemetry.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">
            {t("devopsHeaderTitle")}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t("devopsHeaderSubtitle")}
          </p>
        </div>

        {activeTab === "telemetry" && (
          <button
            onClick={fetchTelemetry}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1A30] hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-red-400" : "text-slate-400"}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Top 5-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "telemetry"
              ? "bg-red-600 text-white font-semibold shadow-sm"
              : "bg-[#0F1A30] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{t("devopsTabTelemetry")}</span>
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "services"
              ? "bg-red-600 text-white font-semibold shadow-sm"
              : "bg-[#0F1A30] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{t("devopsTabServices")}</span>
        </button>

        <button
          onClick={() => setActiveTab("backups")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "backups"
              ? "bg-red-600 text-white font-semibold shadow-sm"
              : "bg-[#0F1A30] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>{t("devopsTabBackups")}</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "logs"
              ? "bg-red-600 text-white font-semibold shadow-sm"
              : "bg-[#0F1A30] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>{t("devopsTabLogs")}</span>
        </button>

        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "alerts"
              ? "bg-red-600 text-white font-semibold shadow-sm"
              : "bg-[#0F1A30] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{t("devopsTabAlerts")}</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchTelemetry} className="underline text-red-400 hover:text-red-300">
            Retry
          </button>
        </div>
      )}

      {/* Active Tab Content */}
      {activeTab === "telemetry" && (
        <TelemetryTab
          telemetry={telemetry}
          onRefresh={fetchTelemetry}
          onTelemetryUpdate={setTelemetry}
        />
      )}

      {activeTab === "services" && (
        <ServiceControlsTab
          telemetry={telemetry}
          onRefreshTelemetry={fetchTelemetry}
        />
      )}

      {activeTab === "backups" && <BackupsTab />}

      {activeTab === "logs" && <LogsTab />}

      {activeTab === "alerts" && <TelegramAlertsTab />}
    </div>
  );
};
