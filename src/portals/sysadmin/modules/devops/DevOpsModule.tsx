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
import { useSysAdminPermissions } from "../../context/SysAdminPermissionsContext";
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
  const { can, canAny } = useSysAdminPermissions();
  const [activeTab, setActiveTab] = useState<DevOpsSubTab>("telemetry");
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canTelemetry = can("telemetry.view");
  const canServices = canAny("devops.services", "devops.features");
  const canBackups = can("devops.backups.view");
  const canLogs = can("logs.view");
  const canAlerts = can("telemetry.view");
  const canIncidents = can("incidents.view");
  const canIntegrations = can("telemetry.view");
  const canReleases = can("releases.view");

  const allowedSubTabs = React.useMemo<DevOpsSubTab[]>(() => {
    const tabs: DevOpsSubTab[] = [];
    if (canTelemetry) tabs.push("telemetry");
    if (canServices) tabs.push("services");
    if (canBackups) tabs.push("backups");
    if (canLogs) tabs.push("logs");
    if (canAlerts) tabs.push("alerts");
    if (canIncidents) tabs.push("incidents");
    if (canIntegrations) tabs.push("integrations");
    if (canReleases) tabs.push("releases");
    return tabs;
  }, [canTelemetry, canServices, canBackups, canLogs, canAlerts, canIncidents, canIntegrations, canReleases]);

  React.useEffect(() => {
    if (allowedSubTabs.length > 0 && !allowedSubTabs.includes(activeTab)) {
      setActiveTab(allowedSubTabs[0]);
    }
  }, [allowedSubTabs, activeTab]);

  const fetchTelemetry = useCallback(async () => {
    if (!canTelemetry) {
      setTelemetry(null);
      setIsLoading(false);
      return;
    }
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
  }, [canTelemetry]);

  useEffect(() => {
    void fetchTelemetry();
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

      {/* Top Permission-Filtered Sub-Tab Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-edge pb-3">
        {canTelemetry && (
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
        )}

        {canServices && (
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
        )}

        {canBackups && (
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
        )}

        {canLogs && (
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
        )}

        {canAlerts && (
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
        )}

        {canIncidents && (
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
        )}

        {canIntegrations && (
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
        )}

        {canReleases && (
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
        )}
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
      {activeTab === "telemetry" && canTelemetry && (
        <TelemetryTab
          telemetry={telemetry}
          onRefresh={fetchTelemetry}
          onTelemetryUpdate={setTelemetry}
        />
      )}

      {activeTab === "services" && canServices && (
        <ServiceControlsTab
          telemetry={telemetry}
          onRefreshTelemetry={fetchTelemetry}
        />
      )}

      {activeTab === "backups" && canBackups && <BackupsTab />}

      {activeTab === "logs" && canLogs && <LogsTab />}

      {activeTab === "alerts" && canAlerts && <TelegramAlertsTab />}

      {activeTab === "incidents" && canIncidents && <IncidentsTab />}

      {activeTab === "integrations" && canIntegrations && <IntegrationsTab />}

      {activeTab === "releases" && canReleases && <AppReleasesTab />}
    </div>
  );
};
