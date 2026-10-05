import React, { useState, useEffect } from "react";
import {
  Server,
  Cpu,
  Database,
  HardDrive,
  Clock,
  Power,
  CheckCircle2,
  RefreshCw,
  Eye,
  Lock,
  Palette,
  X,
  Wrench,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { MaintenanceOverlay } from "../../../../components/MaintenanceOverlay";
import type { SystemTelemetry, PortalKey, MaintenanceType } from "../../../../types/sysAdmin";

const PORTALS: { key: PortalKey; label: string; description: string; badge: string }[] = [
  {
    key: "owner",
    label: "Owner Portal",
    description: "Web Portal for Owner & Business Intelligence",
    badge: "WEB",
  },
  {
    key: "dispatcher",
    label: "Dispatcher Portal",
    description: "Web Console for Order Queuing & Rider Fleet Dispatch",
    badge: "WEB",
  },
  {
    key: "rider",
    label: "Rider Mobile App",
    description: "Mobile App for Rider Telemetry & Errand Delivery",
    badge: "MOBILE",
  },
  {
    key: "customer",
    label: "Customer Mobile App",
    description: "Mobile App for Customer Ordering & Errand Requests",
    badge: "MOBILE",
  },
];

const TYPE_DEFAULTS: Record<
  MaintenanceType,
  { header: string; message: string; defaultAccent: string }
> = {
  SCHEDULED: {
    header: "Scheduled System Maintenance",
    message: "Scheduled maintenance is currently underway to optimize platform reliability. Services will resume shortly.",
    defaultAccent: "#F59E0B",
  },
  EMERGENCY: {
    header: "Emergency System Maintenance",
    message: "We are addressing an unexpected operational issue. System services are temporarily paused while our engineers resolve it.",
    defaultAccent: "#EF4444",
  },
  UPGRADE: {
    header: "Database & Infrastructure Upgrade",
    message: "System data structures and infrastructure components are being upgraded for enhanced performance.",
    defaultAccent: "#3B82F6",
  },
  SECURITY: {
    header: "Security Protocol Enforcement",
    message: "System access is temporarily restricted to enforce critical administrative security protocols.",
    defaultAccent: "#8B5CF6",
  },
};

const PRESET_COLORS = ["#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#10B981", "#EC4899", "#14B8A6"];

interface TelemetryTabProps {
  telemetry: SystemTelemetry | null;
  onRefresh: () => void;
  onTelemetryUpdate: React.Dispatch<React.SetStateAction<SystemTelemetry | null>>;
}

export const TelemetryTab: React.FC<TelemetryTabProps> = ({
  telemetry,
  onTelemetryUpdate,
}) => {
  const [updatingPortal, setUpdatingPortal] = useState<PortalKey | null>(null);
  const [portalConfigs, setPortalConfigs] = useState<
    Record<
      PortalKey,
      {
        maintenanceType: MaintenanceType;
        header: string;
        message: string;
        supportContact: string;
        customColor: string;
      }
    >
  >({
    owner: {
      maintenanceType: telemetry?.maintenance?.owner?.maintenanceType || "SCHEDULED",
      header: telemetry?.maintenance?.owner?.header || TYPE_DEFAULTS.SCHEDULED.header,
      message: telemetry?.maintenance?.owner?.message || telemetry?.maintenance?.owner?.notice || TYPE_DEFAULTS.SCHEDULED.message,
      supportContact: telemetry?.maintenance?.owner?.supportContact || "support@sugo-express.org",
      customColor: telemetry?.maintenance?.owner?.customColor || "",
    },
    dispatcher: {
      maintenanceType: telemetry?.maintenance?.dispatcher?.maintenanceType || "SCHEDULED",
      header: telemetry?.maintenance?.dispatcher?.header || TYPE_DEFAULTS.SCHEDULED.header,
      message: telemetry?.maintenance?.dispatcher?.message || telemetry?.maintenance?.dispatcher?.notice || TYPE_DEFAULTS.SCHEDULED.message,
      supportContact: telemetry?.maintenance?.dispatcher?.supportContact || "support@sugo-express.org",
      customColor: telemetry?.maintenance?.dispatcher?.customColor || "",
    },
    rider: {
      maintenanceType: telemetry?.maintenance?.rider?.maintenanceType || "SCHEDULED",
      header: telemetry?.maintenance?.rider?.header || TYPE_DEFAULTS.SCHEDULED.header,
      message: telemetry?.maintenance?.rider?.message || telemetry?.maintenance?.rider?.notice || TYPE_DEFAULTS.SCHEDULED.message,
      supportContact: telemetry?.maintenance?.rider?.supportContact || "support@sugo-express.org",
      customColor: telemetry?.maintenance?.rider?.customColor || "",
    },
    customer: {
      maintenanceType: telemetry?.maintenance?.customer?.maintenanceType || "SCHEDULED",
      header: telemetry?.maintenance?.customer?.header || TYPE_DEFAULTS.SCHEDULED.header,
      message: telemetry?.maintenance?.customer?.message || telemetry?.maintenance?.customer?.notice || TYPE_DEFAULTS.SCHEDULED.message,
      supportContact: telemetry?.maintenance?.customer?.supportContact || "support@sugo-express.org",
      customColor: telemetry?.maintenance?.customer?.customColor || "",
    },
  });

  const [previewPortal, setPreviewPortal] = useState<PortalKey | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    portal: PortalKey;
    activate: boolean;
  } | null>(null);
  const [stepUpPassword, setStepUpPassword] = useState<string>("");
  const [maintenanceSuccessMessage, setMaintenanceSuccessMessage] = useState<string | null>(null);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

  useEffect(() => {
    if (!telemetry?.maintenance) return;
    setPortalConfigs((prev) => {
      const next = { ...prev };
      for (const p of ["owner", "dispatcher", "rider", "customer"] as PortalKey[]) {
        const m = telemetry.maintenance[p];
        if (m) {
          const type = m.maintenanceType || "SCHEDULED";
          next[p] = {
            maintenanceType: type,
            header: m.header || prev[p]?.header || TYPE_DEFAULTS[type].header,
            message: m.message || m.notice || prev[p]?.message || TYPE_DEFAULTS[type].message,
            supportContact: m.supportContact || prev[p]?.supportContact || "support@sugo-express.org",
            customColor: m.customColor || prev[p]?.customColor || "",
          };
        }
      }
      return next;
    });
  }, [telemetry]);

  const handleOpenStepUpModal = (portal: PortalKey, activate: boolean) => {
    setPendingAction({ portal, activate });
    setStepUpPassword("");
    setMaintenanceError(null);
  };

  const handleConfirmMaintenance = async () => {
    if (!pendingAction) return;
    const { portal, activate } = pendingAction;
    if (!stepUpPassword) {
      setMaintenanceError("Administrator step-up password is required.");
      return;
    }

    setUpdatingPortal(portal);
    setMaintenanceSuccessMessage(null);
    setMaintenanceError(null);
    const config = portalConfigs[portal];

    try {
      const res = await sysAdminApiService.toggleMaintenance(portal, activate, {
        maintenanceType: config.maintenanceType,
        header: config.header,
        message: config.message,
        supportContact: config.supportContact,
        customColor: config.customColor,
        stepUpPassword,
      });

      onTelemetryUpdate((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          maintenance: {
            ...prev.maintenance,
            [portal]: res,
          },
        };
      });

      setMaintenanceSuccessMessage(
        activate
          ? `[${portal.toUpperCase()}] Maintenance mode activated (${config.maintenanceType}). 60s countdown warning and lockdown deployed.`
          : `[${portal.toUpperCase()}] Maintenance mode deactivated. Normal live operations resumed.`
      );
      setPendingAction(null);
      setStepUpPassword("");
      setTimeout(() => setMaintenanceSuccessMessage(null), 6000);
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.error ||
        (err instanceof Error ? err.message : "Failed to update maintenance mode.");
      setMaintenanceError(msg);
    } finally {
      setUpdatingPortal(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Node.js Process */}
        <div className="p-3 sm:p-4 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-medium truncate">Node.js Process</span>
            <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-white">
            {telemetry ? telemetry.server.nodeVersion : "--"}
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate">
            PID: {telemetry ? telemetry.server.pid : "--"} &bull; OS: {telemetry ? telemetry.server.platform : "--"}
          </div>
        </div>

        {/* Process Uptime */}
        <div className="p-3 sm:p-4 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-medium truncate">Process Uptime</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-white truncate">
            {telemetry ? telemetry.server.uptimeFormatted : "--"}
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono text-emerald-400 flex items-center gap-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">PM2 Online</span>
          </div>
        </div>

        {/* MariaDB Latency */}
        <div className="p-3 sm:p-4 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-medium truncate">MariaDB Roundtrip</span>
            <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white">
            {telemetry ? `${telemetry.database.latencyMs} ms` : "--"}
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate">
            Pool: {telemetry ? telemetry.database.status : "--"} &bull; 3306
          </div>
        </div>

        {/* System Memory */}
        <div className="p-3 sm:p-4 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-medium truncate">RAM Utilization</span>
            <HardDrive className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0 ml-1" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white">
            {telemetry ? `${telemetry.memory.usagePercent}%` : "--"}
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate">
            Heap: {telemetry ? telemetry.memory.heapUsedFormatted : "--"}
          </div>
        </div>
      </div>

      {/* Row: Memory Details & Database Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Breakdown */}
        <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>System &amp; Process Memory Gauge</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {telemetry ? `${telemetry.cpu.cores} CPU Cores Detected` : ""}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1 text-slate-300">
                <span>Total System RAM</span>
                <span className="text-white font-bold">{telemetry ? telemetry.memory.totalFormatted : "--"}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${telemetry?.memory.usagePercent || 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-1">
                <span>Used: {telemetry?.memory.usedFormatted}</span>
                <span>Free: {telemetry?.memory.freeFormatted}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Node.js Heap Allocation</span>
                <span className="text-white font-bold">{telemetry ? telemetry.memory.heapUsedFormatted : "--"}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Active V8 JavaScript heap allocated inside the backend Express cluster.
              </p>
            </div>
          </div>
        </div>

        {/* Database Health & Tables */}
        <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono uppercase text-slate-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>MariaDB Table Volume (Prisma 3NF)</span>
            </h3>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Healthy
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-[#0B132B] border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Staff Users</div>
              <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                {telemetry?.database.counts.staffUsers.toLocaleString() || "--"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0B132B] border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Customers</div>
              <div className="text-lg font-bold font-mono tabular-nums text-sky-400 mt-0.5">
                {telemetry?.database.counts.customerAccounts.toLocaleString() || "--"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0B132B] border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Total Errands</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                {telemetry?.database.counts.totalErrands.toLocaleString() || "--"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0B132B] border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Active Sessions</div>
              <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                {telemetry?.database.counts.activeSessions.toLocaleString() || "--"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0B132B] border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">Login Logs</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-300 mt-0.5">
                {telemetry?.database.counts.loginLogs.toLocaleString() || "--"}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0B132B] border border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400">IT Admins</div>
              <div className="text-lg font-bold font-mono tabular-nums text-red-400 mt-0.5">
                {telemetry?.database.counts.sysAdmins.toLocaleString() || "--"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Portal System Maintenance Governance */}
      <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Power className="w-4 h-4 text-red-400" />
              <span>Per-Portal System Maintenance Governance</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Selectively declare downtime and broadcast announcement notices per individual client application
            </p>
          </div>
        </div>

        {maintenanceSuccessMessage && (
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{maintenanceSuccessMessage}</span>
          </div>
        )}

        {maintenanceError && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/60 text-xs text-red-300 font-mono flex items-center gap-2">
            <span>{maintenanceError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {PORTALS.map((portal) => {
            const portalState = telemetry?.maintenance?.[portal.key] ?? { isActive: false };
            const isUpdating = updatingPortal === portal.key;
            const config = portalConfigs[portal.key];

            const handleTypeChange = (type: MaintenanceType) => {
              setPortalConfigs((prev) => {
                const current = prev[portal.key];
                const isDefaultHeader =
                  !current.header ||
                  Object.values(TYPE_DEFAULTS).some((d) => d.header === current.header);
                const isDefaultMsg =
                  !current.message ||
                  Object.values(TYPE_DEFAULTS).some((d) => d.message === current.message);

                return {
                  ...prev,
                  [portal.key]: {
                    ...current,
                    maintenanceType: type,
                    header: isDefaultHeader ? TYPE_DEFAULTS[type].header : current.header,
                    message: isDefaultMsg ? TYPE_DEFAULTS[type].message : current.message,
                  },
                };
              });
            };

            return (
              <div
                key={portal.key}
                className="p-5 rounded-xl bg-[#0B132B] border border-slate-800 space-y-4 flex flex-col justify-between"
              >
                {/* Header Row */}
                <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{portal.label}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                        {portal.badge}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border tracking-wider ${
                        portalState.isActive
                          ? "bg-rose-950 text-rose-400 border-rose-800"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {portalState.isActive
                        ? `${portalState.maintenanceType || "MAINTENANCE"} ACTIVE`
                        : "OPERATIONAL"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{portal.description}</p>
                </div>

                {/* Form Controls */}
                <div className="space-y-3">
                  {/* Maintenance Type Selector */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                      Maintenance Type & Visual Theme
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {(["SCHEDULED", "EMERGENCY", "UPGRADE", "SECURITY"] as MaintenanceType[]).map(
                        (t) => {
                          const isSelected = config.maintenanceType === t;
                          let pillStyle = "bg-[#070D1B] border-slate-800 text-slate-400 hover:text-white";
                          if (isSelected) {
                            if (t === "SCHEDULED") pillStyle = "bg-amber-950/80 border-amber-600 text-amber-300 font-bold";
                            else if (t === "EMERGENCY") pillStyle = "bg-rose-950/80 border-rose-600 text-rose-300 font-bold";
                            else if (t === "UPGRADE") pillStyle = "bg-blue-950/80 border-blue-600 text-blue-300 font-bold";
                            else if (t === "SECURITY") pillStyle = "bg-purple-950/80 border-purple-600 text-purple-300 font-bold";
                          }
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => handleTypeChange(t)}
                              className={`py-1.5 px-2 rounded-lg text-[11px] border transition-all text-center ${pillStyle}`}
                            >
                              {t}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Header / Title */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Overlay Heading
                    </label>
                    <input
                      type="text"
                      value={config.header}
                      onChange={(e) =>
                        setPortalConfigs((prev) => ({
                          ...prev,
                          [portal.key]: { ...prev[portal.key], header: e.target.value },
                        }))
                      }
                      placeholder="e.g., Scheduled System Maintenance"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#070D1B] border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/60"
                    />
                  </div>

                  {/* Message / Notice */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Announcement Notice & Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={config.message}
                      onChange={(e) =>
                        setPortalConfigs((prev) => ({
                          ...prev,
                          [portal.key]: { ...prev[portal.key], message: e.target.value },
                        }))
                      }
                      placeholder="Enter detailed maintenance instructions for client users..."
                      className="w-full px-3 py-1.5 rounded-lg bg-[#070D1B] border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/60"
                    />
                  </div>

                  {/* Support Contact */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Support Contact / Hotline (Optional)
                    </label>
                    <input
                      type="text"
                      value={config.supportContact}
                      onChange={(e) =>
                        setPortalConfigs((prev) => ({
                          ...prev,
                          [portal.key]: { ...prev[portal.key], supportContact: e.target.value },
                        }))
                      }
                      placeholder="e.g. support@sugo-express.org | +63 912 345 6789"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#070D1B] border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500/60"
                    />
                  </div>

                  {/* Custom Accent Color Override */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-slate-400" />
                        <span>Custom Accent Color Override</span>
                      </label>
                      {config.customColor && (
                        <button
                          type="button"
                          onClick={() =>
                            setPortalConfigs((prev) => ({
                              ...prev,
                              [portal.key]: { ...prev[portal.key], customColor: "" },
                            }))
                          }
                          className="text-[10px] text-slate-400 hover:text-white transition-colors"
                        >
                          Reset to Theme Default
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() =>
                              setPortalConfigs((prev) => ({
                                ...prev,
                                [portal.key]: { ...prev[portal.key], customColor: c },
                              }))
                            }
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 rounded-full border transition-transform ${
                              config.customColor === c
                                ? "scale-110 border-white ring-2 ring-white/30"
                                : "border-transparent opacity-80 hover:opacity-100"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={config.customColor}
                          onChange={(e) =>
                            setPortalConfigs((prev) => ({
                              ...prev,
                              [portal.key]: { ...prev[portal.key], customColor: e.target.value },
                            }))
                          }
                          placeholder="#Hex (e.g. #F59E0B)"
                          maxLength={7}
                          className="w-full px-2.5 py-1 font-mono rounded-lg bg-[#070D1B] border border-slate-800 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-red-500/60"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewPortal(portal.key)}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Preview Overlay</span>
                  </button>

                  {portalState.isActive ? (
                    <button
                      type="button"
                      onClick={() => handleOpenStepUpModal(portal.key, false)}
                      disabled={isUpdating}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>Resume Live Ops</span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenStepUpModal(portal.key, true)}
                      disabled={isUpdating}
                      className="flex-1 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>Activate Downtime</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 1. Full-Screen Live Overlay Preview Simulation Modal */}
        {previewPortal && (
          <div className="fixed inset-0 z-[10000] overflow-hidden">
            <button
              onClick={() => setPreviewPortal(null)}
              className="fixed top-5 right-5 z-[10001] px-4 py-2 rounded-xl bg-[#0F1A30]/95 hover:bg-slate-800 border border-white/20 text-white text-xs font-semibold flex items-center gap-2 shadow-2xl transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Close Live Preview</span>
            </button>
            <MaintenanceOverlay
              portal={previewPortal}
              header={portalConfigs[previewPortal].header}
              message={portalConfigs[previewPortal].message}
              maintenanceType={portalConfigs[previewPortal].maintenanceType}
              supportContact={portalConfigs[previewPortal].supportContact}
              customColor={portalConfigs[previewPortal].customColor}
            />
          </div>
        )}

        {/* 2. Step-Up Administrator Password Authorization Modal */}
        {pendingAction && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md p-5 rounded-2xl bg-[#0F1A30] border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-800 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Authorize Maintenance Mode
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {pendingAction.activate ? "Declare system downtime" : "Resume normal operations"} for{" "}
                      <span className="font-semibold text-white uppercase">{pendingAction.portal}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPendingAction(null)}
                  disabled={updatingPortal !== null}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {pendingAction.activate ? (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Activating maintenance will broadcast a <strong>60-second countdown warning</strong> to active sessions, followed by full lockdown.
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Deactivating maintenance will immediately lift the lockdown and resume normal operations.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Administrator Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={stepUpPassword}
                    onChange={(e) => setStepUpPassword(e.target.value)}
                    placeholder="Enter current administrator password..."
                    disabled={updatingPortal !== null}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#070D1B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Required to authenticate privileged infrastructure actions.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPendingAction(null)}
                  disabled={updatingPortal !== null}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMaintenance}
                  disabled={updatingPortal !== null || !stepUpPassword}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                    pendingAction.activate ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {updatingPortal !== null ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    <span>{pendingAction.activate ? "Confirm Downtime" : "Confirm Resume"}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
