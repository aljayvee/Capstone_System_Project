import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  Ban,
  KeyRound,
  CheckCircle2,
  X,
  Lock,
  Server,
  Globe,
  Activity,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { useSysAdminLanguage } from "../../context/SysAdminLanguageContext";
import { useSysAdminPermissions } from "../../context/SysAdminPermissionsContext";
import { MobileResponsiveTable } from "../../../../components/table";
import type {
  ThreatOverview,
  BlockedIpRecord,
  WhitelistedIpRecord,
  ThreatSeverity,
  BanType,
  BanStatus,
} from "../../../../types/sysAdmin";

type ThreatSubTab = "blocklist" | "whitelist" | "stream" | "policies";

export const ThreatCenterModule: React.FC = () => {
  const { t } = useSysAdminLanguage();
  const { can } = useSysAdminPermissions();
  const canManageThreats = can("threats.manage");
  const [subTab, setSubTab] = useState<ThreatSubTab>("blocklist");

  // Overview Data
  const [overview, setOverview] = useState<ThreatOverview | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);

  // Blocklist Data
  const [blockedIps, setBlockedIps] = useState<BlockedIpRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [isBlocklistLoading, setIsBlocklistLoading] = useState(false);

  // Whitelist Data
  const [whitelists, setWhitelists] = useState<WhitelistedIpRecord[]>([]);
  const [isWhitelistLoading, setIsWhitelistLoading] = useState(false);

  // UI State: Alerts & Modals
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Manual Ban Modal
  const [showBanModal, setShowBanModal] = useState(false);
  const [banIpInput, setBanIpInput] = useState("");
  const [banReasonInput, setBanReasonInput] = useState("");
  const [banDuration, setBanDuration] = useState<number | null>(24);
  const [banSeverity, setBanSeverity] = useState<ThreatSeverity>("HIGH");
  const [banPassword, setBanPassword] = useState("");
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);

  // Revoke/Unban Modal
  const [unbanTarget, setUnbanTarget] = useState<BlockedIpRecord | null>(null);
  const [unbanReason, setUnbanReason] = useState("");
  const [unbanPassword, setUnbanPassword] = useState("");
  const [isSubmittingUnban, setIsSubmittingUnban] = useState(false);

  // Add Whitelist Modal
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [wlIp, setWlIp] = useState("");
  const [wlCidr, setWlCidr] = useState("");
  const [wlDesc, setWlDesc] = useState("");
  const [isSubmittingWl, setIsSubmittingWl] = useState(false);

  // Fetch Threat Overview
  const fetchOverview = useCallback(async () => {
    try {
      setIsOverviewLoading(true);
      const data = await sysAdminApiService.getThreatOverview();
      setOverview(data);
    } catch (err: unknown) {
      console.error("Failed to load threat overview:", err);
    } finally {
      setIsOverviewLoading(false);
    }
  }, []);

  // Fetch Blocked IPs
  const fetchBlocklist = useCallback(async () => {
    try {
      setIsBlocklistLoading(true);
      const data = await sysAdminApiService.getBlockedIps({
        search: searchTerm.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        severity: severityFilter !== "ALL" ? severityFilter : undefined,
        page,
        limit: 15,
      });
      setBlockedIps(data.records);
      setTotalRecords(data.pagination.total);
      setTotalPages(data.pagination.totalPages || 1);
    } catch (err: unknown) {
      console.error("Failed to load blocklist:", err);
    } finally {
      setIsBlocklistLoading(false);
    }
  }, [searchTerm, statusFilter, severityFilter, page]);

  // Fetch Whitelist
  const fetchWhitelist = useCallback(async () => {
    try {
      setIsWhitelistLoading(true);
      const data = await sysAdminApiService.getWhitelistedIps();
      setWhitelists(data.whitelists);
    } catch (err: unknown) {
      console.error("Failed to load whitelist:", err);
    } finally {
      setIsWhitelistLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (subTab === "blocklist") {
      fetchBlocklist();
    } else if (subTab === "whitelist") {
      fetchWhitelist();
    }
  }, [subTab, fetchBlocklist, fetchWhitelist]);

  // Handle Manual Ban Submit
  const handleManualBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banIpInput.trim() || !banReasonInput.trim()) {
      setActionMessage({ type: "error", text: "IP address and written reason are mandatory." });
      return;
    }
    if (!banPassword) {
      setActionMessage({ type: "error", text: "Step-Up administrator password is required." });
      return;
    }

    try {
      setIsSubmittingBan(true);
      setActionMessage(null);
      const res = await sysAdminApiService.manuallyBlockIp({
        ipAddress: banIpInput.trim(),
        reason: banReasonInput.trim(),
        durationHours: banDuration,
        severity: banSeverity,
        stepUpPassword: banPassword,
      });

      setActionMessage({ type: "success", text: res.message || `IP ${banIpInput} banned.` });
      setShowBanModal(false);
      setBanIpInput("");
      setBanReasonInput("");
      setBanPassword("");
      fetchOverview();
      fetchBlocklist();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to blacklist IP.";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setIsSubmittingBan(false);
    }
  };

  // Handle Unban Submit
  const handleUnbanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unbanTarget) return;
    if (!unbanPassword) {
      setActionMessage({ type: "error", text: "Step-Up administrator password is required." });
      return;
    }

    try {
      setIsSubmittingUnban(true);
      setActionMessage(null);
      const res = await sysAdminApiService.unblockIp(
        unbanTarget.id,
        unbanReason.trim() || "Administrative unban via Threat Center",
        unbanPassword
      );

      setActionMessage({ type: "success", text: res.message || `IP ${unbanTarget.ipAddress} ban revoked.` });
      setUnbanTarget(null);
      setUnbanReason("");
      setUnbanPassword("");
      fetchOverview();
      fetchBlocklist();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to revoke IP ban.";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setIsSubmittingUnban(false);
    }
  };

  // Handle Add Whitelist Submit
  const handleAddWhitelistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wlIp.trim() || !wlDesc.trim()) {
      setActionMessage({ type: "error", text: "IP address and description are mandatory." });
      return;
    }

    try {
      setIsSubmittingWl(true);
      setActionMessage(null);
      const res = await sysAdminApiService.addWhitelistedIp({
        ipAddress: wlIp.trim(),
        cidrBlock: wlCidr.trim() || undefined,
        description: wlDesc.trim(),
      });

      setActionMessage({ type: "success", text: res.message || `IP ${wlIp} added to whitelist.` });
      setShowWhitelistModal(false);
      setWlIp("");
      setWlCidr("");
      setWlDesc("");
      fetchOverview();
      fetchWhitelist();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to add IP to whitelist.";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setIsSubmittingWl(false);
    }
  };

  // Handle Remove Whitelist
  const handleRemoveWhitelist = async (id: number, ip: string) => {
    if (!window.confirm(`Are you sure you want to remove ${ip} from the whitelist?`)) {
      return;
    }

    try {
      setActionMessage(null);
      await sysAdminApiService.removeWhitelistedIp(id);
      setActionMessage({ type: "success", text: `Whitelist entry for ${ip} removed.` });
      fetchOverview();
      fetchWhitelist();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to remove whitelist entry.";
      setActionMessage({ type: "error", text: msg });
    }
  };

  // Severity Badges
  const getSeverityBadge = (severity: ThreatSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-act-fill text-status-act-ink border border-status-act-ink/30">CRITICAL</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-950/80 text-orange-400 border border-orange-800/80">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-waiting-fill text-status-waiting-ink border border-status-waiting-ink/30">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-board-ground text-ink border border-edge">LOW</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-status-done-fill border-status-done-ink/30 text-status-done-ink"
              : "bg-status-act-fill border-status-act-ink/30 text-status-act-ink"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-status-done-ink" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-status-act-ink" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:text-ink">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-status-act-fill border border-status-act-ink/30 flex items-center justify-center text-status-act-ink">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-ink tracking-wide">{t("threatsHeaderTitle")}</h2>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            {t("threatsHeaderSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchOverview();
              if (subTab === "blocklist") fetchBlocklist();
              if (subTab === "whitelist") fetchWhitelist();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-board-plate hover:bg-board-ground border border-edge text-xs text-ink transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {canManageThreats && (
            <button
              onClick={() => setShowBanModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-signal hover:bg-signal-deep text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Blacklist IP</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards (Minimalist, High Information Density) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-board-plate border border-edge">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Active Blacklisted IPs</span>
            <Ban className="w-4 h-4 text-status-act-ink" />
          </div>
          <div className="text-2xl font-bold font-mono text-ink">
            {isOverviewLoading ? "..." : overview?.totalActiveBans ?? 0}
          </div>
          <div className="text-[11px] text-ink-muted mt-1 flex items-center gap-2">
            <span className="text-status-act-ink font-mono font-medium">{overview?.permanentBans ?? 0} permanent</span>
            <span>&bull;</span>
            <span className="text-status-waiting-ink font-mono font-medium">{overview?.temporaryBans ?? 0} temporary</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-board-plate border border-edge">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Attacks Dropped (24h)</span>
            <ShieldX className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-ink">
            {isOverviewLoading ? "..." : overview?.totalAttacksBlocked24h ?? 0}
          </div>
          <div className="text-[11px] text-ink-muted mt-1">
            HTTP 403 Forbidden drops across edge &amp; API
          </div>
        </div>

        <div className="p-4 rounded-xl bg-board-plate border border-edge">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Whitelisted Addresses</span>
            <ShieldCheck className="w-4 h-4 text-status-done-ink" />
          </div>
          <div className="text-2xl font-bold font-mono text-ink">
            {isOverviewLoading ? "..." : overview?.totalWhitelisted ?? 0}
          </div>
          <div className="text-[11px] text-ink-muted mt-1">
            Loopback, server IP &amp; immune subnets
          </div>
        </div>

        <div className="p-4 rounded-xl bg-board-plate border border-edge">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Dual-Tier Engine</span>
            <Activity className="w-4 h-4 text-status-done-ink" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-go animate-pulse" />
            <span className="text-sm font-bold text-status-done-ink">ENFORCING</span>
          </div>
          <div className="text-[11px] text-ink-muted mt-1 font-mono">
            Nginx conf.d + O(1) in-memory
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-edge flex items-center gap-2">
        <button
          onClick={() => setSubTab("blocklist")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === "blocklist"
              ? "border-status-act-ink/30 text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>{t("threatsTabBlocklist")} ({totalRecords})</span>
        </button>

        <button
          onClick={() => setSubTab("whitelist")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === "whitelist"
              ? "border-status-act-ink/30 text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t("threatsTabWhitelist")}</span>
        </button>

        <button
          onClick={() => setSubTab("stream")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === "stream"
              ? "border-status-act-ink/30 text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t("threatsTabStream")}</span>
        </button>

        <button
          onClick={() => setSubTab("policies")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === "policies"
              ? "border-status-act-ink/30 text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{t("threatsTabPolicies")}</span>
        </button>
      </div>

      {/* TAB 1: BLOCKLIST */}
      {subTab === "blocklist" && (
        <MobileResponsiveTable<BlockedIpRecord>
          data={blockedIps}
          keyExtractor={(row) => row.id}
          isLoading={isBlocklistLoading}
          primaryHeader="IP / Type"
          secondaryHeader="Severity / Status"
          renderPrimary={(row) => (
            <div className="flex flex-col min-w-0">
              <span className="font-mono font-bold text-ink text-xs truncate">
                {row.ipAddress}
              </span>
              <span className="text-[10px] text-ink-muted font-mono mt-0.5">
                {row.banType}
              </span>
            </div>
          )}
          renderSecondary={(row) => (
            <div className="flex flex-col items-end gap-1 shrink-0">
              {getSeverityBadge(row.severity)}
              <span
                className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                  row.status === "ACTIVE"
                    ? "bg-status-act-fill text-status-act-ink border border-status-act-ink/30"
                    : "bg-board-ground text-ink-muted"
                }`}
              >
                {row.status}
              </span>
            </div>
          )}
          renderPreview={(row) => (
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-ink-muted text-[11px] shrink-0">Reason:</span>
                <span className="text-ink text-right truncate max-w-[200px]" title={row.reason}>
                  {row.reason}
                </span>
              </div>
              {row.metadata?.path && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-ink-muted text-[11px] shrink-0">Probe:</span>
                  <span className="text-status-act-ink font-mono text-[11px] truncate max-w-[200px]">
                    {row.metadata.path}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ink-muted">Attack Hits:</span>
                <span className="font-mono font-bold text-ink">{row.attackCount}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ink-muted">Duration:</span>
                <span className="font-mono text-status-waiting-ink">
                  {row.blockedUntil
                    ? new Date(row.blockedUntil) > new Date()
                      ? `Until ${new Date(row.blockedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "Expired"
                    : "Permanent"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ink-muted">Last Seen:</span>
                <span className="text-ink-muted font-mono text-[10px]">
                  {new Date(row.lastSeenAt).toLocaleDateString()}{" "}
                  {new Date(row.lastSeenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          )}
          renderRowActions={(row) =>
            canManageThreats && row.status === "ACTIVE" ? (
              <button
                type="button"
                onClick={() => {
                  setUnbanTarget(row);
                  setUnbanReason("");
                  setUnbanPassword("");
                }}
                className="px-3 py-2 rounded-xl bg-board-ground hover:bg-board-ground text-ink hover:text-ink text-xs font-semibold border border-edge active:scale-95 transition-all min-h-[44px]"
              >
                Revoke Ban
              </button>
            ) : null
          }
          inspectorTitle={(row) => row.ipAddress}
          inspectorSubtitle={(row) => `Detected as ${row.banType} Threat (${row.severity})`}
          inspectorStatusBadge={(row) => getSeverityBadge(row.severity)}
          inspectorSections={(row) => [
            {
              title: "IP Telemetry",
              items: [
                { label: "IP Address", value: row.ipAddress, copyable: true, copyValue: row.ipAddress },
                { label: "Ban Status", value: row.status },
                { label: "Ban Type", value: row.banType },
                { label: "Severity Level", value: row.severity },
              ],
            },
            {
              title: "Attack Diagnostics",
              items: [
                { label: "Hits / Probe Frequency", value: `${row.attackCount} requests` },
                { label: "Detection Trigger", value: row.reason, fullWidth: true },
                { label: "Probe Target", value: row.metadata?.path || "N/A", fullWidth: true },
                {
                  label: "Last Seen",
                  value: `${new Date(row.lastSeenAt).toLocaleDateString()} ${new Date(row.lastSeenAt).toLocaleTimeString()}`,
                },
                {
                  label: "Blocked Duration",
                  value: row.blockedUntil ? new Date(row.blockedUntil).toLocaleString() : "Permanent / No Expiry",
                },
              ],
            },
          ]}
          inspectorActions={(row, onClose) =>
            canManageThreats && row.status === "ACTIVE" ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setUnbanTarget(row);
                  setUnbanReason("");
                  setUnbanPassword("");
                }}
                className="w-full py-3 rounded-xl bg-signal hover:bg-signal-deep text-white font-semibold text-xs min-h-[48px] active:scale-95 transition-all shadow-lg"
              >
                Revoke Ban for {row.ipAddress}
              </button>
            ) : undefined
          }
          searchPlaceholder="Search by IP address or reason..."
          searchValue={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setPage(1);
          }}
          filterDrawerTitle="Filter Blocklist"
          activeFilterCount={(statusFilter !== "ALL" ? 1 : 0) + (severityFilter !== "ALL" ? 1 : 0)}
          onResetFilters={() => {
            setStatusFilter("ALL");
            setSeverityFilter("ALL");
            setPage(1);
          }}
          filterDrawerContent={
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1.5">Ban Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-board-ground border border-edge text-ink min-h-[44px]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="REVOKED">Revoked / Unbanned</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink block mb-1.5">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => {
                    setSeverityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-board-ground border border-edge text-ink min-h-[44px]"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
          }
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            onPageChange: setPage,
            totalItems: totalRecords,
          }}
          desktopView={
            <div className="space-y-4">
              {/* Desktop Filters Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by IP address or reason..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-board-plate border border-edge text-ink placeholder-ink-muted focus:outline-none focus:border-status-act-ink/30 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-board-plate border border-edge text-ink focus:outline-none focus:border-status-act-ink/30 font-sans"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="REVOKED">Revoked / Unbanned</option>
                  </select>

                  <select
                    value={severityFilter}
                    onChange={(e) => {
                      setSeverityFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-board-plate border border-edge text-ink focus:outline-none focus:border-status-act-ink/30 font-sans"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="rounded-xl border border-edge bg-board-plate overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-edge bg-board-ground text-ink-muted font-medium">
                        <th className="py-2.5 px-4 font-mono">IP Address</th>
                        <th className="py-2.5 px-3">Severity</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-4">Reason / Detection Trigger</th>
                        <th className="py-2.5 px-3 font-mono">Hits</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Last Seen</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline font-sans text-ink">
                      {isBlocklistLoading ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-ink-muted font-mono">
                            <div className="w-6 h-6 border-2 border-status-act-ink/30 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            Querying active blocklist records...
                          </td>
                        </tr>
                      ) : blockedIps.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-ink-muted">
                            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-status-done-ink" />
                            <p className="font-semibold text-ink text-xs">No Blacklisted IPs Found</p>
                            <p className="text-[11px] text-ink-muted mt-0.5">
                              {searchTerm || statusFilter !== "ALL"
                                ? "No IP records match your filter criteria."
                                : "No malicious IPs are currently banned."}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        blockedIps.map((row) => (
                          <tr key={row.id} className="hover:bg-board-ground transition-colors">
                            <td className="py-2.5 px-4 font-mono font-semibold text-ink whitespace-nowrap">
                              {row.ipAddress}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {getSeverityBadge(row.severity)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                  row.banType === "AUTOMATIC"
                                    ? "bg-board-ground text-ink-muted"
                                    : "bg-status-moving-fill text-status-moving-ink border border-status-moving-ink/30"
                                }`}
                              >
                                {row.banType}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 max-w-xs truncate" title={row.reason}>
                              <span className="text-ink">{row.reason}</span>
                              {row.metadata?.path && (
                                <div className="text-[10px] font-mono text-status-act-ink truncate mt-0.5">
                                  Probe: {row.metadata.path}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-ink whitespace-nowrap">
                              {row.attackCount}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {row.blockedUntil ? (
                                <span className="text-[11px] font-mono text-status-waiting-ink flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(row.blockedUntil) > new Date()
                                    ? `Until ${new Date(row.blockedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                    : "Expired"}
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono text-status-act-ink font-semibold">
                                  Permanent
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-ink-muted whitespace-nowrap text-[11px]">
                              {new Date(row.lastSeenAt).toLocaleDateString()}{" "}
                              <span className="font-mono text-[10px] text-ink-muted">
                                {new Date(row.lastSeenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                              {canManageThreats && row.status === "ACTIVE" ? (
                                <button
                                  onClick={() => {
                                    setUnbanTarget(row);
                                    setUnbanReason("");
                                    setUnbanPassword("");
                                  }}
                                  className="px-2.5 py-1 rounded bg-board-ground hover:bg-board-ground text-ink hover:text-ink text-[11px] font-medium border border-edge transition-colors"
                                >
                                  Revoke Ban
                                </button>
                              ) : (
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-board-ground text-ink-muted">
                                  {row.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="p-3 border-t border-edge flex items-center justify-between text-xs text-ink-muted">
                    <div>
                      Page <span className="text-ink font-bold">{page}</span> of{" "}
                      <span className="text-ink font-bold">{totalPages}</span> ({totalRecords} records)
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="p-1 rounded bg-board-ground hover:bg-board-ground disabled:opacity-40 disabled:cursor-not-allowed border border-edge text-ink"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1 rounded bg-board-ground hover:bg-board-ground disabled:opacity-40 disabled:cursor-not-allowed border border-edge text-ink"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
        />
      )}

      {/* TAB 2: WHITELIST MANAGER */}
      {subTab === "whitelist" && (
        <MobileResponsiveTable<WhitelistedIpRecord>
          data={whitelists}
          keyExtractor={(wl) => wl.id}
          isLoading={isWhitelistLoading}
          primaryHeader="IP / CIDR"
          secondaryHeader="Status / Immunity"
          renderPrimary={(wl) => (
            <div className="flex flex-col min-w-0">
              <span className="font-mono font-bold text-ink text-xs truncate">
                {wl.ipAddress}
                {wl.cidrBlock ? `/${wl.cidrBlock}` : ""}
              </span>
              <span className="text-[11px] text-ink-muted truncate mt-0.5">
                {wl.description || "No description"}
              </span>
            </div>
          )}
          renderSecondary={(wl) => (
            <div className="flex flex-col items-end gap-1 shrink-0">
              {wl.isImmune ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-done-fill text-status-done-ink border border-status-done-ink/30">
                  IMMUNE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-board-ground text-ink-muted">
                  Standard
                </span>
              )}
            </div>
          )}
          renderPreview={(wl) => (
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-ink-muted text-[11px] shrink-0">Description:</span>
                <span className="text-ink text-right">{wl.description}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ink-muted">Created By:</span>
                <span className="font-mono text-ink">
                  {wl.createdBy ? `@${wl.createdBy.nickname || wl.createdBy.username}` : "System Core"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ink-muted">Date Added:</span>
                <span className="font-mono text-ink-muted text-[10px]">
                  {new Date(wl.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
          renderRowActions={(wl) =>
            wl.isImmune ? (
              <span className="text-[11px] text-ink-muted font-mono px-2 py-1">Protected</span>
            ) : canManageThreats ? (
              <button
                type="button"
                onClick={() => handleRemoveWhitelist(wl.id, wl.ipAddress)}
                className="px-3 py-2 rounded-xl bg-status-act-fill hover:bg-status-act-fill text-status-act-ink border border-status-act-ink/30 active:scale-95 transition-all text-xs font-semibold min-h-[44px]"
              >
                Remove
              </button>
            ) : (
              <span className="text-[11px] text-ink-muted font-mono px-2 py-1">Read-only</span>
            )
          }
          inspectorTitle={(wl) => wl.ipAddress}
          inspectorSubtitle={(wl) => (wl.cidrBlock ? `Subnet / CIDR /${wl.cidrBlock}` : "Direct IP Whitelist")}
          inspectorSections={(wl) => [
            {
              title: "IP Whitelist Telemetry",
              items: [
                { label: "IP Address", value: wl.ipAddress, copyable: true, copyValue: wl.ipAddress },
                { label: "CIDR Subnet", value: wl.cidrBlock ? `/${wl.cidrBlock}` : "Single IP (/32)" },
                { label: "Immunity Status", value: wl.isImmune ? "Immune (System Core Locked)" : "Standard Whitelist" },
                { label: "Created By", value: wl.createdBy ? `@${wl.createdBy.username}` : "System Core" },
                { label: "Date Added", value: new Date(wl.createdAt).toLocaleString() },
                { label: "Description", value: wl.description, fullWidth: true },
              ],
            },
          ]}
          headerAction={
            canManageThreats ? (
              <button
                type="button"
                onClick={() => setShowWhitelistModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-go hover:bg-go-deep text-white text-xs font-semibold shadow-sm active:scale-95 transition-all min-h-[44px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            ) : undefined
          }
          desktopView={
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink">Whitelisted IP Addresses &amp; Subnets</h3>
                  <p className="text-xs text-ink-muted">
                    These addresses bypass all blacklist rules, rate limits, and automated probe triggers.
                  </p>
                </div>

                {canManageThreats && (
                  <button
                    onClick={() => setShowWhitelistModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-go hover:bg-go-deep text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Whitelist Entry</span>
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-edge bg-board-plate overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-edge bg-board-ground text-ink-muted font-medium">
                      <th className="py-2.5 px-4 font-mono">IP Address / CIDR</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-3">Immunity</th>
                      <th className="py-2.5 px-3">Created By</th>
                      <th className="py-2.5 px-3">Date Added</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline font-sans text-ink">
                    {isWhitelistLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-ink-muted font-mono">
                          <div className="w-6 h-6 border-2 border-status-done-ink/30 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading whitelist table...
                        </td>
                      </tr>
                    ) : whitelists.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-ink-muted">
                          No whitelist entries recorded.
                        </td>
                      </tr>
                    ) : (
                      whitelists.map((wl) => (
                        <tr key={wl.id} className="hover:bg-board-ground transition-colors">
                          <td className="py-2.5 px-4 font-mono font-semibold text-ink">
                            {wl.ipAddress}
                            {wl.cidrBlock && (
                              <span className="ml-1 text-ink-muted font-mono">/{wl.cidrBlock}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-ink">{wl.description}</td>
                          <td className="py-2.5 px-3">
                            {wl.isImmune ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-done-fill text-status-done-ink border border-status-done-ink/30">
                                IMMUNE (LOCKED)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-board-ground text-ink-muted">
                                Standard
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-ink-muted font-mono text-[11px]">
                            {wl.createdBy ? `@${wl.createdBy.nickname || wl.createdBy.username}` : "System Core"}
                          </td>
                          <td className="py-2.5 px-3 text-ink-muted text-[11px]">
                            {new Date(wl.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {wl.isImmune ? (
                              <span className="text-[11px] text-ink-muted font-mono" title="Core server IPs cannot be deleted">
                                Protected
                              </span>
                            ) : canManageThreats ? (
                              <button
                                onClick={() => handleRemoveWhitelist(wl.id, wl.ipAddress)}
                                className="p-1.5 rounded hover:bg-status-act-fill text-ink-muted hover:text-status-act-ink transition-colors"
                                title="Remove from Whitelist"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-ink-muted font-mono">Read-only</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          }
        />
      )}

      {/* TAB 3: LIVE INTRUSION FEED */}
      {subTab === "stream" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-signal animate-pulse" />
                Live Intrusion Stream
              </h3>
              <p className="text-xs text-ink-muted">
                Recent intrusion attempts detected and mitigated by the automated threat engine.
              </p>
            </div>

            <button
              onClick={() => fetchOverview()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-board-plate hover:bg-board-ground border border-edge text-xs text-ink transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Poll Updates</span>
            </button>
          </div>

          <div className="rounded-xl border border-edge bg-board-ground p-4 font-mono text-xs space-y-2">
            {!overview?.recentIntrusions || overview.recentIntrusions.length === 0 ? (
              <div className="py-8 text-center text-ink-muted">
                No intrusion attacks detected in recent telemetry.
              </div>
            ) : (
              overview.recentIntrusions.map((hit, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-board-plate border border-edge flex flex-col md:flex-row md:items-center justify-between gap-2 text-[11px]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-status-act-ink font-bold">{hit.ipAddress}</span>
                      {getSeverityBadge(hit.severity)}
                      <span className="text-ink-muted">&bull;</span>
                      <span className="text-ink-muted">{hit.reason}</span>
                    </div>

                    {hit.metadata && (
                      <div className="text-[10px] text-ink-muted flex flex-wrap items-center gap-3">
                        {hit.metadata.path && (
                          <span className="text-status-act-ink">Target: {hit.metadata.path}</span>
                        )}
                        {hit.metadata.method && (
                          <span className="text-ink-muted font-bold">[{hit.metadata.method}]</span>
                        )}
                        {hit.metadata.userAgent && (
                          <span className="text-ink-muted truncate max-w-sm">
                            UA: {hit.metadata.userAgent}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-ink-muted text-[10px] whitespace-nowrap">
                    <div>Hits: <span className="text-ink font-bold">{hit.attackCount}</span></div>
                    <div>{new Date(hit.lastSeenAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DEFENSE POLICY MATRIX */}
      {subTab === "policies" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-board-plate border border-edge space-y-3">
            <div className="flex items-center gap-2 text-ink font-bold text-sm">
              <Server className="w-4 h-4 text-status-act-ink" />
              <span>Tier 1: Nginx Kernel Edge Defense</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Blacklisted IP entries in MariaDB are synced to <code className="text-status-act-ink">/etc/nginx/conf.d/blocked_ips.conf</code>.
              Malicious requests from dropped IPs are terminated at the Nginx reverse-proxy kernel layer before touching Node.js event loop resources.
            </p>
            <div className="p-3 rounded-lg bg-board-ground border border-edge text-[11px] font-mono text-ink space-y-1">
              <div className="text-status-done-ink font-semibold">● Edge Sync: Active</div>
              <div className="text-ink-muted">Auto-generation on ban/unban + 60s cron fallback</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-board-plate border border-edge space-y-3">
            <div className="flex items-center gap-2 text-ink font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              <span>Tier 2: Directory Probe Auto-Ban</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Automated regex engine flags path traversal (<code className="text-status-act-ink">../</code>) and scans for sensitive configuration files (<code className="text-status-act-ink">.env</code>, <code className="text-status-act-ink">.git</code>, <code className="text-status-act-ink">wp-admin</code>, <code className="text-status-act-ink">phpmyadmin</code>).
              Triggers an instant permanent ban with severity CRITICAL.
            </p>
            <div className="p-3 rounded-lg bg-board-ground border border-edge text-[11px] font-mono text-ink space-y-1">
              <div className="text-status-done-ink font-semibold">● Heuristic Filter: Active</div>
              <div className="text-ink-muted">Express pre-routing threat interceptor</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-board-plate border border-edge space-y-3">
            <div className="flex items-center gap-2 text-ink font-bold text-sm">
              <KeyRound className="w-4 h-4 text-status-waiting-ink" />
              <span>Tier 3: Brute-Force Auth Defense</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Tracks repeated authentication failures per IP address. When 10 failed login attempts occur within a 10-minute sliding window, the IP is automatically quarantined with a 24-hour temporary ban.
            </p>
            <div className="p-3 rounded-lg bg-board-ground border border-edge text-[11px] font-mono text-ink space-y-1">
              <div className="text-status-done-ink font-semibold">● Auth Guard: Active</div>
              <div className="text-ink-muted">Threshold: 10 failures / 10 mins &rarr; 24h ban</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-board-plate border border-edge space-y-3">
            <div className="flex items-center gap-2 text-ink font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-status-done-ink" />
              <span>Self-Ban Protection &amp; Emergency CLI</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              SysAdmin active session IP and core server IPs (<code className="text-status-done-ink">127.0.0.1</code>, <code className="text-status-done-ink">109.123.239.182</code>) cannot be banned.
              In case of emergency lockout, administrators can unban via SSH console:
            </p>
            <div className="p-3 rounded-lg bg-board-ground border border-edge text-[11px] font-mono text-ink space-y-1">
              <div className="text-status-waiting-ink font-semibold">$ npm run security:unban &lt;ip_address&gt;</div>
              <div className="text-ink-muted">Instant database removal + Nginx config rebuild</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: MANUAL BAN MODAL */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-board-plate border border-edge rounded-2xl max-w-md w-full p-6 text-ink shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div className="flex items-center gap-2 text-status-act-ink font-bold text-sm">
                <Ban className="w-4 h-4" />
                <span>Blacklist Malicious IP</span>
              </div>
              <button onClick={() => setShowBanModal(false)} className="text-ink-muted hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualBanSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-ink font-medium mb-1">Target IP Address</label>
                <input
                  type="text"
                  required
                  value={banIpInput}
                  onChange={(e) => setBanIpInput(e.target.value)}
                  placeholder="e.g. 198.51.100.4"
                  className="w-full px-3 py-2 rounded-lg bg-board-ground border border-edge text-ink font-mono focus:outline-none focus:border-status-act-ink/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink font-medium mb-1">Duration</label>
                  <select
                    value={banDuration === null ? "permanent" : banDuration}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBanDuration(v === "permanent" ? null : Number(v));
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-board-ground border border-edge text-ink focus:outline-none focus:border-status-act-ink/30"
                  >
                    <option value="2">2 Hours</option>
                    <option value="24">24 Hours</option>
                    <option value="168">7 Days</option>
                    <option value="720">30 Days</option>
                    <option value="permanent">Permanent Ban</option>
                  </select>
                </div>

                <div>
                  <label className="block text-ink font-medium mb-1">Threat Severity</label>
                  <select
                    value={banSeverity}
                    onChange={(e) => setBanSeverity(e.target.value as ThreatSeverity)}
                    className="w-full px-3 py-2 rounded-lg bg-board-ground border border-edge text-ink focus:outline-none focus:border-status-act-ink/30"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">Justification Reason</label>
                <textarea
                  required
                  rows={2}
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  placeholder="Explain why this IP is being blacklisted (for audit logs)..."
                  className="w-full px-3 py-2 rounded-lg bg-board-ground border border-edge text-ink focus:outline-none focus:border-status-act-ink/30"
                />
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">Step-Up Administrator Password</label>
                <input
                  type="password"
                  required
                  value={banPassword}
                  onChange={(e) => setBanPassword(e.target.value)}
                  placeholder="Confirm with your account password"
                  className="w-full px-3 py-2 rounded-lg bg-board-ground border border-edge text-ink focus:outline-none focus:border-status-act-ink/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                <button
                  type="button"
                  onClick={() => setShowBanModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-board-ground text-ink hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBan}
                  className="px-4 py-1.5 rounded-lg bg-signal hover:bg-signal-deep text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingBan ? "Enforcing Ban..." : "Enforce IP Ban"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REVOKE / UNBAN MODAL */}
      {unbanTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-board-plate border border-edge rounded-2xl max-w-md w-full p-6 text-ink shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div className="flex items-center gap-2 text-status-done-ink font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Revoke Ban for IP</span>
              </div>
              <button onClick={() => setUnbanTarget(null)} className="text-ink-muted hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUnbanSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-board-ground border border-edge space-y-1">
                <div className="text-ink font-mono font-bold">{unbanTarget.ipAddress}</div>
                <div className="text-ink-muted text-[11px]">Banned for: {unbanTarget.reason}</div>
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">Revocation Audit Note</label>
                <textarea
                  rows={2}
                  value={unbanReason}
                  onChange={(e) => setUnbanReason(e.target.value)}
                  placeholder="Reason for unbanning (e.g. verified false positive)..."
                  className="w-full px-3 py-2 rounded-lg bg-board-ground border border-edge text-ink focus:outline-none focus:border-status-act-ink/30"
                />
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">Step-Up Administrator Password</label>
                <input
                  type="password"
                  required
                  value={unbanPassword}
                  onChange={(e) => setUnbanPassword(e.target.value)}
                  placeholder="Enter administrator password to authorize"
                  className="w-full px-3 py-2 rounded-lg bg-board-ground border border-edge text-ink focus:outline-none focus:border-status-act-ink/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                <button
                  type="button"
                  onClick={() => setUnbanTarget(null)}
                  className="px-3 py-1.5 rounded-lg bg-board-ground text-ink hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUnban}
                  className="px-4 py-1.5 rounded-lg bg-go hover:bg-go-deep text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingUnban ? "Revoking..." : "Authorize Unban"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD WHITELIST MODAL */}
      {showWhitelistModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-board-plate border border-edge rounded-2xl max-w-md w-full p-6 text-ink shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div className="flex items-center gap-2 text-status-done-ink font-bold text-sm">
                <Plus className="w-4 h-4" />
                <span>Add IP to Whitelist</span>
              </div>
              <button onClick={() => setShowWhitelistModal(false)} className="text-ink-muted hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWhitelistSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-ink font-medium mb-1">IP Address</label>
                <input
                  type="text"
                  required
                  value={wlIp}
                  onChange={(e) => setWlIp(e.target.value)}
                  placeholder="e.g. 192.168.1.100"
                  className="w-full px-3 py-2 rounded-lg bg-board-ground border border-edge text-ink font-mono focus:outline-none focus:border-status-done-ink/30"
                />
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">Optional CIDR Block</label>
                <input
                  type="text"
                  value={wlCidr}
                  onChange={(e) => setWlCidr(e.target.value)}
                  placeholder="e.g. 24 or 32"
                  className="w-full px-3 py-2 rounded-lg bg-board-ground border border-edge text-ink font-mono focus:outline-none focus:border-status-done-ink/30"
                />
              </div>

              <div>
                <label className="block text-ink font-medium mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={wlDesc}
                  onChange={(e) => setWlDesc(e.target.value)}
                  placeholder="e.g. Office Static IP / Monitoring Server"
                  className="w-full px-3 py-2 rounded-lg bg-board-ground border border-edge text-ink focus:outline-none focus:border-status-done-ink/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                <button
                  type="button"
                  onClick={() => setShowWhitelistModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-board-ground text-ink hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWl}
                  className="px-4 py-1.5 rounded-lg bg-go hover:bg-go-deep text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingWl ? "Saving..." : "Add to Whitelist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreatCenterModule;
