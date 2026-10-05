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
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950/80 text-red-400 border border-red-800/80">CRITICAL</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-950/80 text-orange-400 border border-orange-800/80">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-800/80">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">LOW</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-300"
              : "bg-red-950/60 border-red-800/60 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-wide">{t("threatsHeaderTitle")}</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1A30] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowBanModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Blacklist IP</span>
          </button>
        </div>
      </div>

      {/* Metric Cards (Minimalist, High Information Density) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#0F1A30] border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Blacklisted IPs</span>
            <Ban className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {isOverviewLoading ? "..." : overview?.totalActiveBans ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
            <span className="text-red-400 font-mono font-medium">{overview?.permanentBans ?? 0} permanent</span>
            <span>&bull;</span>
            <span className="text-amber-400 font-mono font-medium">{overview?.temporaryBans ?? 0} temporary</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F1A30] border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Attacks Dropped (24h)</span>
            <ShieldX className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {isOverviewLoading ? "..." : overview?.totalAttacksBlocked24h ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            HTTP 403 Forbidden drops across edge &amp; API
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F1A30] border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Whitelisted Addresses</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {isOverviewLoading ? "..." : overview?.totalWhitelisted ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Loopback, server IP &amp; immune subnets
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F1A30] border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Dual-Tier Engine</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-emerald-400">ENFORCING</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Nginx conf.d + O(1) in-memory
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-slate-800 flex items-center gap-2">
        <button
          onClick={() => setSubTab("blocklist")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === "blocklist"
              ? "border-red-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>{t("threatsTabBlocklist")} ({totalRecords})</span>
        </button>

        <button
          onClick={() => setSubTab("whitelist")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === "whitelist"
              ? "border-red-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t("threatsTabWhitelist")}</span>
        </button>

        <button
          onClick={() => setSubTab("stream")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === "stream"
              ? "border-red-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t("threatsTabStream")}</span>
        </button>

        <button
          onClick={() => setSubTab("policies")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === "policies"
              ? "border-red-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
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
              <span className="font-mono font-bold text-white text-xs truncate">
                {row.ipAddress}
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">
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
                    ? "bg-red-950/60 text-red-400 border border-red-800/60"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {row.status}
              </span>
            </div>
          )}
          renderPreview={(row) => (
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 text-[11px] shrink-0">Reason:</span>
                <span className="text-slate-200 text-right truncate max-w-[200px]" title={row.reason}>
                  {row.reason}
                </span>
              </div>
              {row.metadata?.path && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-400 text-[11px] shrink-0">Probe:</span>
                  <span className="text-red-400 font-mono text-[11px] truncate max-w-[200px]">
                    {row.metadata.path}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Attack Hits:</span>
                <span className="font-mono font-bold text-slate-200">{row.attackCount}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Duration:</span>
                <span className="font-mono text-amber-400">
                  {row.blockedUntil
                    ? new Date(row.blockedUntil) > new Date()
                      ? `Until ${new Date(row.blockedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "Expired"
                    : "Permanent"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Last Seen:</span>
                <span className="text-slate-400 font-mono text-[10px]">
                  {new Date(row.lastSeenAt).toLocaleDateString()}{" "}
                  {new Date(row.lastSeenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          )}
          renderRowActions={(row) =>
            row.status === "ACTIVE" ? (
              <button
                type="button"
                onClick={() => {
                  setUnbanTarget(row);
                  setUnbanReason("");
                  setUnbanPassword("");
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 active:scale-95 transition-all min-h-[44px]"
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
            row.status === "ACTIVE" ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setUnbanTarget(row);
                  setUnbanReason("");
                  setUnbanPassword("");
                }}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs min-h-[48px] active:scale-95 transition-all shadow-lg"
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
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Ban Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white min-h-[44px]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="REVOKED">Revoked / Unbanned</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => {
                    setSeverityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white min-h-[44px]"
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
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by IP address or reason..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#0F1A30] border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-[#0F1A30] border border-slate-800 text-slate-300 focus:outline-none focus:border-red-500 font-sans"
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
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-[#0F1A30] border border-slate-800 text-slate-300 focus:outline-none focus:border-red-500 font-sans"
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
              <div className="rounded-xl border border-slate-800 bg-[#0F1A30] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-[#0B132B] text-slate-400 font-medium">
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
                    <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
                      {isBlocklistLoading ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            Querying active blocklist records...
                          </td>
                        </tr>
                      ) : blockedIps.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500">
                            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                            <p className="font-semibold text-white text-xs">No Blacklisted IPs Found</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {searchTerm || statusFilter !== "ALL"
                                ? "No IP records match your filter criteria."
                                : "No malicious IPs are currently banned."}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        blockedIps.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-semibold text-white whitespace-nowrap">
                              {row.ipAddress}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {getSeverityBadge(row.severity)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                  row.banType === "AUTOMATIC"
                                    ? "bg-slate-800 text-slate-400"
                                    : "bg-blue-950/80 text-blue-300 border border-blue-800/60"
                                }`}
                              >
                                {row.banType}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 max-w-xs truncate" title={row.reason}>
                              <span className="text-slate-200">{row.reason}</span>
                              {row.metadata?.path && (
                                <div className="text-[10px] font-mono text-red-400 truncate mt-0.5">
                                  Probe: {row.metadata.path}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-200 whitespace-nowrap">
                              {row.attackCount}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {row.blockedUntil ? (
                                <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(row.blockedUntil) > new Date()
                                    ? `Until ${new Date(row.blockedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                    : "Expired"}
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono text-red-400 font-semibold">
                                  Permanent
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                              {new Date(row.lastSeenAt).toLocaleDateString()}{" "}
                              <span className="font-mono text-[10px] text-slate-500">
                                {new Date(row.lastSeenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                              {row.status === "ACTIVE" ? (
                                <button
                                  onClick={() => {
                                    setUnbanTarget(row);
                                    setUnbanReason("");
                                    setUnbanPassword("");
                                  }}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-colors"
                                >
                                  Revoke Ban
                                </button>
                              ) : (
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800/50 text-slate-500">
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
                  <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div>
                      Page <span className="text-white font-bold">{page}</span> of{" "}
                      <span className="text-white font-bold">{totalPages}</span> ({totalRecords} records)
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="p-1 rounded bg-[#0B132B] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-slate-300"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1 rounded bg-[#0B132B] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-slate-300"
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
              <span className="font-mono font-bold text-white text-xs truncate">
                {wl.ipAddress}
                {wl.cidrBlock ? `/${wl.cidrBlock}` : ""}
              </span>
              <span className="text-[11px] text-slate-400 truncate mt-0.5">
                {wl.description || "No description"}
              </span>
            </div>
          )}
          renderSecondary={(wl) => (
            <div className="flex flex-col items-end gap-1 shrink-0">
              {wl.isImmune ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                  IMMUNE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                  Standard
                </span>
              )}
            </div>
          )}
          renderPreview={(wl) => (
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 text-[11px] shrink-0">Description:</span>
                <span className="text-slate-200 text-right">{wl.description}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Created By:</span>
                <span className="font-mono text-slate-300">
                  {wl.createdBy ? `@${wl.createdBy.nickname || wl.createdBy.username}` : "System Core"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Date Added:</span>
                <span className="font-mono text-slate-400 text-[10px]">
                  {new Date(wl.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
          renderRowActions={(wl) =>
            wl.isImmune ? (
              <span className="text-[11px] text-slate-500 font-mono px-2 py-1">Protected</span>
            ) : (
              <button
                type="button"
                onClick={() => handleRemoveWhitelist(wl.id, wl.ipAddress)}
                className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60 active:scale-95 transition-all text-xs font-semibold min-h-[44px]"
              >
                Remove
              </button>
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
            <button
              type="button"
              onClick={() => setShowWhitelistModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all min-h-[44px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          }
          desktopView={
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Whitelisted IP Addresses &amp; Subnets</h3>
                  <p className="text-xs text-slate-400">
                    These addresses bypass all blacklist rules, rate limits, and automated probe triggers.
                  </p>
                </div>

                <button
                  onClick={() => setShowWhitelistModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Whitelist Entry</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0F1A30] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-[#0B132B] text-slate-400 font-medium">
                      <th className="py-2.5 px-4 font-mono">IP Address / CIDR</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-3">Immunity</th>
                      <th className="py-2.5 px-3">Created By</th>
                      <th className="py-2.5 px-3">Date Added</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
                    {isWhitelistLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading whitelist table...
                        </td>
                      </tr>
                    ) : whitelists.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No whitelist entries recorded.
                        </td>
                      </tr>
                    ) : (
                      whitelists.map((wl) => (
                        <tr key={wl.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-semibold text-white">
                            {wl.ipAddress}
                            {wl.cidrBlock && (
                              <span className="ml-1 text-slate-500 font-mono">/{wl.cidrBlock}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">{wl.description}</td>
                          <td className="py-2.5 px-3">
                            {wl.isImmune ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                                IMMUNE (LOCKED)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                                Standard
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                            {wl.createdBy ? `@${wl.createdBy.nickname || wl.createdBy.username}` : "System Core"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {new Date(wl.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {wl.isImmune ? (
                              <span className="text-[11px] text-slate-600 font-mono" title="Core server IPs cannot be deleted">
                                Protected
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRemoveWhitelist(wl.id, wl.ipAddress)}
                                className="p-1.5 rounded hover:bg-red-950/50 text-slate-400 hover:text-red-400 transition-colors"
                                title="Remove from Whitelist"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Intrusion Stream
              </h3>
              <p className="text-xs text-slate-400">
                Recent intrusion attempts detected and mitigated by the automated threat engine.
              </p>
            </div>

            <button
              onClick={() => fetchOverview()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1A30] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Poll Updates</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#070D1B] p-4 font-mono text-xs space-y-2">
            {!overview?.recentIntrusions || overview.recentIntrusions.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                No intrusion attacks detected in recent telemetry.
              </div>
            ) : (
              overview.recentIntrusions.map((hit, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[#0F1A30]/80 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2 text-[11px]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-bold">{hit.ipAddress}</span>
                      {getSeverityBadge(hit.severity)}
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-slate-400">{hit.reason}</span>
                    </div>

                    {hit.metadata && (
                      <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-3">
                        {hit.metadata.path && (
                          <span className="text-red-300">Target: {hit.metadata.path}</span>
                        )}
                        {hit.metadata.method && (
                          <span className="text-slate-400 font-bold">[{hit.metadata.method}]</span>
                        )}
                        {hit.metadata.userAgent && (
                          <span className="text-slate-500 truncate max-w-sm">
                            UA: {hit.metadata.userAgent}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-slate-500 text-[10px] whitespace-nowrap">
                    <div>Hits: <span className="text-white font-bold">{hit.attackCount}</span></div>
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
          <div className="p-4 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Server className="w-4 h-4 text-red-400" />
              <span>Tier 1: Nginx Kernel Edge Defense</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Blacklisted IP entries in MariaDB are synced to <code className="text-red-400">/etc/nginx/conf.d/blocked_ips.conf</code>.
              Malicious requests from dropped IPs are terminated at the Nginx reverse-proxy kernel layer before touching Node.js event loop resources.
            </p>
            <div className="p-3 rounded-lg bg-[#070D1B] border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
              <div className="text-emerald-400 font-semibold">● Edge Sync: Active</div>
              <div className="text-slate-500">Auto-generation on ban/unban + 60s cron fallback</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              <span>Tier 2: Directory Probe Auto-Ban</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated regex engine flags path traversal (<code className="text-red-400">../</code>) and scans for sensitive configuration files (<code className="text-red-400">.env</code>, <code className="text-red-400">.git</code>, <code className="text-red-400">wp-admin</code>, <code className="text-red-400">phpmyadmin</code>).
              Triggers an instant permanent ban with severity CRITICAL.
            </p>
            <div className="p-3 rounded-lg bg-[#070D1B] border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
              <div className="text-emerald-400 font-semibold">● Heuristic Filter: Active</div>
              <div className="text-slate-500">Express pre-routing threat interceptor</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Tier 3: Brute-Force Auth Defense</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tracks repeated authentication failures per IP address. When 10 failed login attempts occur within a 10-minute sliding window, the IP is automatically quarantined with a 24-hour temporary ban.
            </p>
            <div className="p-3 rounded-lg bg-[#070D1B] border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
              <div className="text-emerald-400 font-semibold">● Auth Guard: Active</div>
              <div className="text-slate-500">Threshold: 10 failures / 10 mins &rarr; 24h ban</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Self-Ban Protection &amp; Emergency CLI</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              SysAdmin active session IP and core server IPs (<code className="text-emerald-400">127.0.0.1</code>, <code className="text-emerald-400">109.123.239.182</code>) cannot be banned.
              In case of emergency lockout, administrators can unban via SSH console:
            </p>
            <div className="p-3 rounded-lg bg-[#070D1B] border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
              <div className="text-amber-400 font-semibold">$ npm run security:unban &lt;ip_address&gt;</div>
              <div className="text-slate-500">Instant database removal + Nginx config rebuild</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: MANUAL BAN MODAL */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#0F1A30] border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <Ban className="w-4 h-4" />
                <span>Blacklist Malicious IP</span>
              </div>
              <button onClick={() => setShowBanModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualBanSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target IP Address</label>
                <input
                  type="text"
                  required
                  value={banIpInput}
                  onChange={(e) => setBanIpInput(e.target.value)}
                  placeholder="e.g. 198.51.100.4"
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Duration</label>
                  <select
                    value={banDuration === null ? "permanent" : banDuration}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBanDuration(v === "permanent" ? null : Number(v));
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="2">2 Hours</option>
                    <option value="24">24 Hours</option>
                    <option value="168">7 Days</option>
                    <option value="720">30 Days</option>
                    <option value="permanent">Permanent Ban</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Threat Severity</label>
                  <select
                    value={banSeverity}
                    onChange={(e) => setBanSeverity(e.target.value as ThreatSeverity)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Justification Reason</label>
                <textarea
                  required
                  rows={2}
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  placeholder="Explain why this IP is being blacklisted (for audit logs)..."
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Step-Up Administrator Password</label>
                <input
                  type="password"
                  required
                  value={banPassword}
                  onChange={(e) => setBanPassword(e.target.value)}
                  placeholder="Confirm with your account password"
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBanModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBan}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
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
          <div className="bg-[#0F1A30] border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Revoke Ban for IP</span>
              </div>
              <button onClick={() => setUnbanTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUnbanSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-[#070D1B] border border-slate-800 space-y-1">
                <div className="text-white font-mono font-bold">{unbanTarget.ipAddress}</div>
                <div className="text-slate-400 text-[11px]">Banned for: {unbanTarget.reason}</div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Revocation Audit Note</label>
                <textarea
                  rows={2}
                  value={unbanReason}
                  onChange={(e) => setUnbanReason(e.target.value)}
                  placeholder="Reason for unbanning (e.g. verified false positive)..."
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Step-Up Administrator Password</label>
                <input
                  type="password"
                  required
                  value={unbanPassword}
                  onChange={(e) => setUnbanPassword(e.target.value)}
                  placeholder="Enter administrator password to authorize"
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUnbanTarget(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUnban}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
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
          <div className="bg-[#0F1A30] border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Plus className="w-4 h-4" />
                <span>Add IP to Whitelist</span>
              </div>
              <button onClick={() => setShowWhitelistModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWhitelistSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">IP Address</label>
                <input
                  type="text"
                  required
                  value={wlIp}
                  onChange={(e) => setWlIp(e.target.value)}
                  placeholder="e.g. 192.168.1.100"
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Optional CIDR Block</label>
                <input
                  type="text"
                  value={wlCidr}
                  onChange={(e) => setWlCidr(e.target.value)}
                  placeholder="e.g. 24 or 32"
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={wlDesc}
                  onChange={(e) => setWlDesc(e.target.value)}
                  placeholder="e.g. Office Static IP / Monitoring Server"
                  className="w-full px-3 py-2 rounded-lg bg-[#070D1B] border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWhitelistModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWl}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
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
