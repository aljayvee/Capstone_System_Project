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
  Smartphone,
  ClipboardList,
  Plug,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { useSysAdminLanguage } from "../../context/SysAdminLanguageContext";
import type { SystemTelemetry } from "../../../../types/sysAdmin";
import { TelemetryTab } from "./TelemetryTab";
import { ServiceControlsTab } from "./ServiceControlsTab";
import { BackupsTab } from "./BackupsTab";
import { LogsTab } from "./LogsTab";
import { TelegramAlertsTab } from "./TelegramAlertsTab";
import { AppReleasesTab } from "./AppReleasesTab";
import { IncidentsTab } from "./IncidentsTab";
import { IntegrationsTab } from "./IntegrationsTab";

type DevOpsSubTab = "telemetry" | "services" | "backups" | "logs" | "alerts" | "incidents" | "integrations" | "releases";

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
          <h2 className="text-base font-bold text-ink tracking-wide">
            {t("devopsHeaderTitle")}
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {t("devopsHeaderSubtitle")}
          </p>
        </div>

        {activeTab === "telemetry" && (
          <button
            onClick={fetchTelemetry}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-board-plate hover:bg-board-ground border border-edge text-xs font-medium text-ink transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-status-act-ink" : "text-ink-muted"}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Top 5-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-edge pb-3">
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "telemetry"
              ? "bg-signal text-white font-semibold shadow-sm"
              : "bg-board-plate text-ink-muted hover:text-white hover:bg-board-ground border border-edge"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{t("devopsTabTelemetry")}</span>
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "services"
              ? "bg-signal text-white font-semibold shadow-sm"
              : "bg-board-plate text-ink-muted hover:text-white hover:bg-board-ground border border-edge"
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{t("devopsTabServices")}</span>
        </button>

        <button
          onClick={() => setActiveTab("backups")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "backups"
              ? "bg-signal text-white font-semibold shadow-sm"
              : "bg-board-plate text-ink-muted hover:text-white hover:bg-board-ground border border-edge"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>{t("devopsTabBackups")}</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "logs"
              ? "bg-signal text-white font-semibold shadow-sm"
              : "bg-board-plate text-ink-muted hover:text-white hover:bg-board-ground border border-edge"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>{t("devopsTabLogs")}</span>
        </button>

        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "alerts"
              ? "bg-signal text-white font-semibold shadow-sm"
              : "bg-board-plate text-ink-muted hover:text-white hover:bg-board-ground border border-edge"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{t("devopsTabAlerts")}</span>
        </button>

        <button
          onClick={() => setActiveTab("incidents")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "incidents"
              ? "bg-signal text-white font-semibold shadow-sm"
              : "bg-board-plate text-ink-muted hover:text-white hover:bg-board-ground border border-edge"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>{t("devopsTabIncidents")}</span>
        </button>

        <button
          onClick={() => setActiveTab("integrations")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "integrations"
              ? "bg-signal text-white font-semibold shadow-sm"
              : "bg-board-plate text-ink-muted hover:text-white hover:bg-board-ground border border-edge"
          }`}
        >
          <Plug className="w-4 h-4" />
          <span>{t("devopsTabIntegrations")}</span>
        </button>

        <button
          onClick={() => setActiveTab("releases")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === "releases"
              ? "bg-signal text-white font-semibold shadow-sm"
              : "bg-board-plate text-ink-muted hover:text-white hover:bg-board-ground border border-edge"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>{t("devopsTabReleases")}</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-act-ink shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchTelemetry} className="underline text-status-act-ink hover:text-status-act-ink">
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

      {activeTab === "incidents" && <IncidentsTab />}

      {activeTab === "integrations" && <IntegrationsTab />}

      {activeTab === "releases" && <AppReleasesTab />}
    </div>
  );
};
