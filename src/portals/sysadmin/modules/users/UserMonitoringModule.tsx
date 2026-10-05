import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Monitor,
  LogOut,
  X,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Lock,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { useSysAdminLanguage } from "../../context/SysAdminLanguageContext";
import { MobileResponsiveTable } from "../../../../components/table";
import type {
  MonitoredAccount,
  MonitoredAccountSession,
  MonitoredAccountsResponse,
} from "../../../../types/sysAdmin";

type RoleFilter = "ALL" | "OWNER" | "DISPATCHER" | "RIDER" | "CUSTOMER";
type StatusFilter = "ALL" | "Active" | "Suspended" | "Locked" | "Inactive";

export const UserMonitoringModule: React.FC = () => {
  const { t } = useSysAdminLanguage();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [data, setData] = useState<MonitoredAccountsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session Drawer State
  const [selectedUserForSessions, setSelectedUserForSessions] = useState<MonitoredAccount | null>(null);
  const [sessions, setSessions] = useState<MonitoredAccountSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionActionMessage, setSessionActionMessage] = useState<string | null>(null);

  // Status Change Modal State
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<MonitoredAccount | null>(null);
  const [newStatus, setNewStatus] = useState<string>("Active");
  const [statusReason, setStatusReason] = useState<string>("");
  const [stepUpPassword, setStepUpPassword] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusActionMessage, setStatusActionMessage] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await sysAdminApiService.getMonitoredAccounts({
        role: roleFilter === "ALL" ? undefined : roleFilter,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
        page,
        limit,
      });
      setData(response);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load user accounts.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, statusFilter, searchQuery, page, limit]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Load sessions when drawer opens
  const openSessionsDrawer = async (account: MonitoredAccount) => {
    setSelectedUserForSessions(account);
    setIsLoadingSessions(true);
    setSessionActionMessage(null);
    try {
      const activeSessions = await sysAdminApiService.getAccountSessions(account.role, account.id);
      setSessions(activeSessions);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load sessions.";
      setSessionActionMessage(msg);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to terminate this active session? The user will be immediately logged out.")) {
      return;
    }
    try {
      await sysAdminApiService.terminateSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSessionActionMessage("Session terminated successfully. Token invalidated.");
      // Refresh count in list
      fetchAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to terminate session.";
      setSessionActionMessage(msg);
    }
  };

  const openStatusModal = (account: MonitoredAccount) => {
    setSelectedUserForStatus(account);
    setNewStatus(account.status);
    setStatusReason("");
    setStepUpPassword("");
    setStatusActionMessage(null);
  };

  const handleUpdateStatus = async () => {
    if (!selectedUserForStatus) return;
    if (!stepUpPassword) {
      setStatusActionMessage("Administrator password is required to confirm this action.");
      return;
    }
    setIsUpdatingStatus(true);
    setStatusActionMessage(null);
    try {
      await sysAdminApiService.updateAccountStatus(
        selectedUserForStatus.role,
        selectedUserForStatus.id,
        newStatus,
        statusReason.trim() || undefined,
        stepUpPassword
      );
      setStatusActionMessage(`Account status changed to ${newStatus}.`);
      setTimeout(() => {
        setSelectedUserForStatus(null);
        setStepUpPassword("");
        fetchAccounts();
      }, 900);
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.error ||
        (err instanceof Error ? err.message : "Failed to update account status.");
      setStatusActionMessage(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-purple-950/80 text-purple-300 border-purple-800/60";
      case "DISPATCHER":
        return "bg-amber-950/80 text-amber-300 border-amber-800/60";
      case "RIDER":
        return "bg-emerald-950/80 text-emerald-300 border-emerald-800/60";
      case "CUSTOMER":
        return "bg-sky-950/80 text-sky-300 border-sky-800/60";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-emerald-950/70 text-emerald-400 border-emerald-800/50";
      case "suspended":
        return "bg-amber-950/70 text-amber-400 border-amber-800/50";
      case "locked":
        return "bg-rose-950/70 text-rose-400 border-rose-800/50";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mission Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">{t("usersHeaderTitle")}</h2>
          <p className="text-xs text-slate-400">
            {t("usersHeaderSubtitle")}
          </p>
        </div>

        <button
          onClick={fetchAccounts}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F1A30] hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-red-400" : "text-slate-400"}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0F1A30] border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 mb-1">Total Monitored</div>
          <div className="text-xl font-bold font-mono tabular-nums text-white">
            {data ? data.counts.all.toLocaleString() : "--"}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Across 4 System Roles</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0F1A30] border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online Presence</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-400">
            {data ? data.counts.onlineTotal.toLocaleString() : "--"}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1">Live Sockets &amp; Telemetry</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0F1A30] border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 mb-1">Staff Fleet</div>
          <div className="text-xl font-bold font-mono tabular-nums text-white">
            {data ? (data.counts.owners + data.counts.dispatchers + data.counts.riders).toLocaleString() : "--"}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {data ? `${data.counts.owners} Owners • ${data.counts.dispatchers} Disp • ${data.counts.riders} Riders` : "Loading..."}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0F1A30] border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 mb-1">Registered Customers</div>
          <div className="text-xl font-bold font-mono tabular-nums text-sky-400">
            {data ? data.counts.customers.toLocaleString() : "--"}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Verified App Accounts</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0F1A30] border border-slate-800 col-span-2 lg:col-span-1">
          <div className="text-[11px] font-medium text-slate-400 mb-1">System Security</div>
          <div className="text-xs font-semibold text-white flex items-center gap-1.5 mt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>IDOR &amp; BOLA Protected</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Audit Trail Enabled</div>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex items-center gap-1 bg-[#0B132B] p-1 rounded-xl border border-slate-800 overflow-x-auto">
        <button
          onClick={() => {
            setRoleFilter("ALL");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            roleFilter === "ALL"
              ? "bg-[#0F1A30] text-white border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>{t("usersTabAll")}</span>
          {data && (
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {data.counts.all}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setRoleFilter("OWNER");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            roleFilter === "OWNER"
              ? "bg-[#0F1A30] text-white border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>{t("usersTabOwner")}</span>
          {data && (
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {data.counts.owners}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setRoleFilter("DISPATCHER");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            roleFilter === "DISPATCHER"
              ? "bg-[#0F1A30] text-white border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>{t("usersTabDispatcher")}</span>
          {data && (
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {data.counts.dispatchers}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setRoleFilter("RIDER");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            roleFilter === "RIDER"
              ? "bg-[#0F1A30] text-white border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>{t("usersTabRider")}</span>
          {data && (
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {data.counts.riders}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setRoleFilter("CUSTOMER");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            roleFilter === "CUSTOMER"
              ? "bg-[#0F1A30] text-white border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>{t("usersTabCustomer")}</span>
          {data && (
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {data.counts.customers}
            </span>
          )}
        </button>
      </div>

      <MobileResponsiveTable<MonitoredAccount>
        data={data?.accounts || []}
        keyExtractor={(acc) => `${acc.role}-${acc.id}`}
        isLoading={isLoading}
        primaryHeader="User / Role"
        secondaryHeader="Presence / Status"
        renderPrimary={(acc) => (
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-300">
                {acc.firstName ? acc.firstName[0].toUpperCase() : acc.username[0].toUpperCase()}
              </div>
              <span
                className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border border-[#0F1A30] ${
                  acc.isOnline ? "bg-emerald-500" : "bg-slate-600"
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white text-xs truncate flex items-center gap-1">
                <span>{acc.name || `${acc.firstName} ${acc.lastName}`}</span>
                {acc.emailVerified && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">@{acc.username}</div>
            </div>
          </div>
        )}
        renderSecondary={(acc) => (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`inline-block text-[9px] font-mono font-semibold uppercase px-1.5 py-0.2 rounded border ${getRoleBadge(
                acc.role
              )}`}
            >
              {acc.role}
            </span>
            <span
              className={`inline-block text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border ${getStatusBadge(
                acc.status
              )}`}
            >
              {acc.status}
            </span>
          </div>
        )}
        renderPreview={(acc) => (
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Email:</span>
              <span className="text-slate-200 truncate max-w-[180px]">{acc.email || "No email"}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Phone:</span>
              <span className="text-slate-200 font-mono">{acc.phone || "No phone"}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Active Sessions:</span>
              <span className="font-mono font-bold text-white">{acc.activeSessionsCount} active</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Presence:</span>
              <span className={`font-medium ${acc.isOnline ? "text-emerald-400" : "text-slate-500"}`}>
                {acc.isOnline ? "Online Now" : "Offline"}
              </span>
            </div>
          </div>
        )}
        renderRowActions={(acc) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openSessionsDrawer(acc)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition-all min-h-[44px] flex items-center gap-1.5 cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5 text-slate-400" />
              <span>Sessions ({acc.activeSessionsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => openStatusModal(acc)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition-all min-h-[44px] flex items-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Status</span>
            </button>
          </div>
        )}
        inspectorTitle={(acc) => acc.name || `${acc.firstName} ${acc.lastName}`}
        inspectorSubtitle={(acc) => `@${acc.username} · ${acc.role} Account`}
        inspectorStatusBadge={(acc) => (
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${getStatusBadge(
              acc.status
            )}`}
          >
            {acc.status}
          </span>
        )}
        inspectorSections={(acc) => [
          {
            title: "Account Identity",
            items: [
              { label: "Full Name", value: acc.name || `${acc.firstName} ${acc.lastName}` },
              { label: "Username", value: `@${acc.username}`, copyable: true, copyValue: acc.username },
              { label: "Assigned Role", value: acc.role },
              { label: "Account Status", value: acc.status },
              {
                label: "Email Verified",
                value: acc.emailVerified ? "Verified (Proof on File)" : "Unverified",
              },
              { label: "Presence", value: acc.isOnline ? "🟢 Online" : "⚪ Offline" },
            ],
          },
          {
            title: "Contact & Communications",
            items: [
              {
                label: "Email Address",
                value: acc.email || "N/A",
                copyable: Boolean(acc.email),
                copyValue: acc.email || undefined,
              },
              {
                label: "Phone Number",
                value: acc.phone || "N/A",
                copyable: Boolean(acc.phone),
                copyValue: acc.phone || undefined,
              },
            ],
          },
          {
            title: "Active JWT Sessions",
            items: [
              {
                label: "Active Handsets / Browsers",
                value: `${acc.activeSessionsCount} concurrent sessions`,
              },
            ],
          },
        ]}
        inspectorActions={(acc, onClose) => (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                openSessionsDrawer(acc);
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs min-h-[48px] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Monitor className="w-4 h-4 text-slate-300" />
              <span>Manage Sessions</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                openStatusModal(acc);
              }}
              className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs min-h-[48px] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>Change Status</span>
            </button>
          </div>
        )}
        searchPlaceholder="Search accounts by username, name, email..."
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setPage(1);
        }}
        filterDrawerTitle="Filter Accounts"
        activeFilterCount={(roleFilter !== "ALL" ? 1 : 0) + (statusFilter !== "ALL" ? 1 : 0)}
        onResetFilters={() => {
          setRoleFilter("ALL");
          setStatusFilter("ALL");
          setPage(1);
        }}
        filterDrawerContent={
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">User Role</label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as RoleFilter);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white min-h-[44px]"
              >
                <option value="ALL">All Roles</option>
                <option value="OWNER">Owner</option>
                <option value="DISPATCHER">Dispatcher</option>
                <option value="RIDER">Rider</option>
                <option value="CUSTOMER">Customer</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Security Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusFilter);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white min-h-[44px]"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Locked">Locked</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        }
        pagination={
          data && data.totalPages > 1
            ? {
                currentPage: page,
                totalPages: data.totalPages,
                onPageChange: setPage,
                totalItems: data.total,
              }
            : undefined
        }
        desktopView={
          <div className="space-y-4">
            {/* Desktop Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search accounts by username, name, email, or phone..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0F1A30] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StatusFilter);
                    setPage(1);
                  }}
                  aria-label="Filter accounts by status"
                  className="px-3 py-2 rounded-xl bg-[#0F1A30] border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-red-500/60"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Locked">Locked</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Desktop Table Work Surface */}
            <div className="rounded-xl bg-[#0F1A30] border border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0B132B] border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Account User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4 text-center">Presence &amp; Sessions</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400 font-mono text-xs">
                          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Querying account database...
                        </td>
                      </tr>
                    ) : !data || data.accounts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-xs font-medium text-slate-300">
                            No accounts match the active filter criteria
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Try widening your search terms or role filters
                          </p>
                        </td>
                      </tr>
                    ) : (
                      data.accounts.map((acc) => (
                        <tr key={`${acc.role}-${acc.id}`} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                  {acc.firstName ? acc.firstName[0].toUpperCase() : acc.username[0].toUpperCase()}
                                </div>
                                {acc.isOnline ? (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0F1A30] absolute -bottom-0.5 -right-0.5"
                                    title="Online now"
                                  />
                                ) : (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-[#0F1A30] absolute -bottom-0.5 -right-0.5"
                                    title="Offline"
                                  />
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-white flex items-center gap-1.5">
                                  <span>{acc.name || `${acc.firstName} ${acc.lastName}`}</span>
                                  {acc.emailVerified && (
                                    <span title="Email verified">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">@{acc.username}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-block text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${getRoleBadge(
                                acc.role
                              )}`}
                            >
                              {acc.role}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-slate-300">{acc.email || "No email"}</div>
                            <div className="text-[11px] font-mono text-slate-400">{acc.phone || "No phone"}</div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <button
                                onClick={() => openSessionsDrawer(acc)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B132B] hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 transition-colors"
                                title="View active JWT sessions and devices"
                              >
                                <Monitor className="w-3 h-3 text-slate-400" />
                                <span className="font-bold tabular-nums text-white">
                                  {acc.activeSessionsCount}
                                </span>
                                <span className="text-slate-500 text-[10px]">active</span>
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${getStatusBadge(
                                acc.status
                              )}`}
                            >
                              {acc.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => openSessionsDrawer(acc)}
                                className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                                title="Inspect active sessions & kick out"
                              >
                                <Monitor className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => openStatusModal(acc)}
                                className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                                title="Change account security status (Active / Suspended / Locked)"
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Desktop Pagination Footer */}
              {data && data.totalPages > 1 && (
                <div className="px-4 py-3 bg-[#0B132B] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    Showing <span className="font-mono text-white">{(page - 1) * limit + 1}</span> to{" "}
                    <span className="font-mono text-white">{Math.min(page * limit, data.total)}</span> of{" "}
                    <span className="font-mono text-white">{data.total}</span> accounts
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg bg-[#0F1A30] border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] text-slate-300">
                      Page {page} of {data.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                      disabled={page === data.totalPages}
                      className="p-1.5 rounded-lg bg-[#0F1A30] border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* Slide-over Drawer: Active Sessions */}
      {selectedUserForSessions && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-none">
          <div className="w-full max-w-md bg-[#0B132B] border-l border-slate-800 h-full flex flex-col p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  <span>Active Device Sessions</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedUserForSessions.name} (@{selectedUserForSessions.username}) &bull;{" "}
                  <span className="uppercase font-mono text-[10px] text-slate-300">{selectedUserForSessions.role}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedUserForSessions(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sessionActionMessage && (
              <div className="p-3 mb-4 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200 font-mono">
                {sessionActionMessage}
              </div>
            )}

            {isLoadingSessions ? (
              <div className="py-12 text-center text-slate-400 text-xs font-mono">
                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Querying session store...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Smartphone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-300">No active device sessions found</p>
                <p className="text-[11px] text-slate-500 mt-0.5">The user is currently signed out on all devices.</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                <div className="text-[11px] font-mono text-slate-400">
                  Found {sessions.length} active JWT {sessions.length === 1 ? "session" : "sessions"}
                </div>
                {sessions.map((sess) => (
                  <div key={sess.id} className="p-3.5 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Monitor className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sess.userAgent || "Unknown Device / Browser"}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          IP: {sess.ipAddress || "Unknown"}
                        </div>
                      </div>

                      <button
                        onClick={() => handleTerminateSession(sess.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800 text-[10px] font-medium text-red-300 transition-colors shrink-0"
                        title="Invalidate session and kick out"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Kick Out</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Issued: {new Date(sess.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>Expires: {new Date(sess.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={() => setSelectedUserForSessions(null)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Account Security Status */}
      {selectedUserForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-none">
          <div className="w-full max-w-md rounded-2xl bg-[#0B132B] border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Modify Account Status</h3>
              </div>
              <button
                onClick={() => setSelectedUserForStatus(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-400">Target Account:</div>
                <div className="text-sm font-bold text-white">
                  {selectedUserForStatus.name} (@{selectedUserForStatus.username})
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Role: {selectedUserForStatus.role} &bull; Current Status: {selectedUserForStatus.status}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select New Security Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus("Active")}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-colors ${
                      newStatus === "Active"
                        ? "bg-emerald-950/80 border-emerald-600 text-emerald-300"
                        : "bg-[#0F1A30] border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus("Suspended")}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-colors ${
                      newStatus === "Suspended"
                        ? "bg-amber-950/80 border-amber-600 text-amber-300"
                        : "bg-[#0F1A30] border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Suspended
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus("Locked")}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-colors ${
                      newStatus === "Locked"
                        ? "bg-rose-950/80 border-rose-600 text-rose-300"
                        : "bg-[#0F1A30] border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Locked
                  </button>
                </div>
              </div>

              {newStatus !== "Active" && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Setting status to <strong>{newStatus}</strong> will immediately revoke all active JWT sessions and kick the user off all devices.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reason for Status Modification (Optional / Audit Trail)
                </label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g., Investigating suspicious activity or account requested deactivation"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-[#0F1A30] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Administrator Step-Up Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={stepUpPassword}
                    onChange={(e) => setStepUpPassword(e.target.value)}
                    placeholder="Enter current administrator password..."
                    disabled={isUpdatingStatus}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F1A30] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Required to authorize modifying live user operational status.
                </p>
              </div>

              {statusActionMessage && (
                <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono">
                  {statusActionMessage}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForStatus(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={isUpdatingStatus || !stepUpPassword}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                >
                  {isUpdatingStatus ? "Applying..." : "Confirm Change"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
