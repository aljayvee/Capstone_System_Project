import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Key,
  Edit3,
  ShieldAlert,
  Activity,
  Search,
  Download,
  RefreshCw,
  Filter,
  Lock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Monitor,
  Printer,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { formatErrandId } from "../../../../utils/formatErrandId";
import { useSysAdminLanguage } from "../../context/SysAdminLanguageContext";
import { MobileResponsiveTable } from "../../../../components/table";
import type {
  AuthAuditLog,
  ModificationAuditLog,
  SecurityThreatLog,
  SystemActivityLog,
  ReportPrintLog,
} from "../../../../types/sysAdmin";

type AuditCategory = "auth" | "modifications" | "security" | "lifecycle" | "prints";

/** The six Owner reports, as the Owner portal's tabs name them. */
const REPORT_TYPE_OPTIONS = [
  { value: "sales", label: "Sales Report" },
  { value: "rider-performance", label: "Rider Performance" },
  { value: "commission", label: "Commission" },
  { value: "settlement", label: "Settlement" },
  { value: "transactions", label: "Transaction Summary" },
  { value: "exceptions", label: "Help Desk Report" },
];

const getStatusBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case "SUCCESS":
      return "bg-status-done-fill text-status-done-ink border-status-done-ink/30";
    case "FAILED":
      return "bg-status-act-fill text-status-act-ink border-status-act-ink/30";
    case "BLOCKED":
      return "bg-status-act-fill text-status-act-ink border-status-act-ink/30";
    case "REVOKED":
      return "bg-status-waiting-fill text-status-waiting-ink border-status-waiting-ink/30";
    default:
      return "bg-board-ground text-ink-muted border-edge";
  }
};

export const AuditLogsModule: React.FC = () => {
  const { t } = useSysAdminLanguage();
  const [activeCategory, setActiveCategory] = useState<AuditCategory>("auth");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  // Filters
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [reportTypeFilter, setReportTypeFilter] = useState("ALL");

  // Data States
  const [authLogs, setAuthLogs] = useState<AuthAuditLog[]>([]);
  const [modLogs, setModLogs] = useState<ModificationAuditLog[]>([]);
  const [secLogs, setSecLogs] = useState<SecurityThreatLog[]>([]);
  const [sysLogs, setSysLogs] = useState<SystemActivityLog[]>([]);
  const [printLogs, setPrintLogs] = useState<ReportPrintLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeCategory === "auth") {
        const res = await sysAdminApiService.getAuthAuditLogs({
          role: roleFilter === "ALL" ? undefined : roleFilter,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          search: searchQuery.trim() || undefined,
          page,
          limit,
        });
        setAuthLogs(res.logs);
        setTotalCount(res.total);
        setTotalPages(res.totalPages);
      } else if (activeCategory === "modifications") {
        const res = await sysAdminApiService.getModificationAuditLogs({
          role: roleFilter === "ALL" ? undefined : roleFilter,
          search: searchQuery.trim() || undefined,
          page,
          limit,
        });
        setModLogs(res.logs);
        setTotalCount(res.total);
        setTotalPages(res.totalPages);
      } else if (activeCategory === "security") {
        const res = await sysAdminApiService.getSecurityAuditLogs({
          severity: severityFilter === "ALL" ? undefined : severityFilter,
          search: searchQuery.trim() || undefined,
          page,
          limit,
        });
        setSecLogs(res.events);
        setTotalCount(res.total);
        setTotalPages(res.totalPages);
      } else if (activeCategory === "lifecycle") {
        const res = await sysAdminApiService.getSystemActivityLogs({
          status: statusFilter === "ALL" ? undefined : statusFilter,
          search: searchQuery.trim() || undefined,
          page,
          limit,
        });
        setSysLogs(res.activities);
        setTotalCount(res.total);
        setTotalPages(res.totalPages);
      } else if (activeCategory === "prints") {
        const res = await sysAdminApiService.getReportPrintLogs({
          reportType: reportTypeFilter === "ALL" ? undefined : reportTypeFilter,
          search: searchQuery.trim() || undefined,
          page,
          limit,
        });
        setPrintLogs(res.logs);
        setTotalCount(res.total);
        setTotalPages(res.totalPages);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load audit logs.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, roleFilter, statusFilter, severityFilter, reportTypeFilter, searchQuery, page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = () => {
    let csvContent = "";
    let filename = `sugo_sysadmin_audit_${activeCategory}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeCategory === "auth") {
      const headers = ["ID", "Timestamp", "User", "Role", "IP Address", "Device/UserAgent", "Status", "Revocation Reason"];
      const rows = authLogs.map((l) => [
        l.id,
        new Date(l.createdAt).toLocaleString(),
        `"${l.username} (${l.name})"`,
        l.role,
        l.ipAddress,
        `"${l.userAgent}"`,
        l.status,
        `"${l.revokedReason || ""}"`,
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else if (activeCategory === "modifications") {
      const headers = ["ID", "Timestamp", "Target User", "Role", "Field Modified", "Old Value", "New Value", "IP Address", "Verification Method"];
      const rows = modLogs.map((m) => [
        m.id,
        new Date(m.createdAt).toLocaleString(),
        `"${m.username} (${m.name})"`,
        m.role,
        m.fieldModified,
        `"${m.oldValue || ""}"`,
        `"${m.newValue || ""}"`,
        m.ipAddress || "",
        `"${m.verifiedVia}"`,
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else if (activeCategory === "security") {
      const headers = ["Event ID", "Timestamp", "Severity", "Event Type", "Target Identifier", "Target Name", "Details", "IP Address"];
      const rows = secLogs.map((s) => [
        s.id,
        new Date(s.createdAt).toLocaleString(),
        s.severity,
        s.eventType,
        `"${s.targetIdentifier}"`,
        `"${s.targetName}"`,
        `"${s.details}"`,
        s.ipAddress || "",
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else if (activeCategory === "lifecycle") {
      const headers = ["Errand Reference", "Category", "Status", "Dispatcher", "Rider", "Route", "Created At", "Updated At"];
      const rows = sysLogs.map((y) => [
        y.referenceCode,
        y.category,
        y.status,
        `"${y.dispatcher}"`,
        `"${y.rider}"`,
        `"${y.route}"`,
        new Date(y.createdAt).toLocaleString(),
        new Date(y.updatedAt).toLocaleString(),
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else if (activeCategory === "prints") {
      const headers = ["ID", "Printed On", "Printed By", "Role", "Report", "Dates Covered", "IP Address", "Device/UserAgent"];
      const rows = printLogs.map((p) => [
        p.id,
        `"${new Date(p.createdAt).toLocaleString()}"`,
        `"${p.printedByName}"`,
        p.role,
        `"${p.reportName}"`,
        `"${p.coverageLabel}"`,
        p.ipAddress || "",
        `"${p.userAgent || ""}"`,
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-status-act-fill text-status-act-ink border-status-act-ink/30";
      case "WARNING":
        return "bg-status-waiting-fill text-status-waiting-ink border-status-waiting-ink/30";
      default:
        return "bg-board-ground text-ink border-edge";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink tracking-wide">{t("auditHeaderTitle")}</h2>
          <p className="text-xs text-ink-muted">
            {t("auditHeaderSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-board-plate hover:bg-board-ground border border-edge text-xs font-medium text-ink transition-colors"
            title="Download active audit log view as CSV"
          >
            <Download className="w-3.5 h-3.5 text-ink-muted" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-board-plate hover:bg-board-ground border border-edge text-xs font-medium text-ink transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-status-act-ink" : "text-ink-muted"}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Privacy Guarantee Invariant Banner */}
      <div className="p-3.5 rounded-xl bg-board-ground border border-edge text-xs text-ink-muted flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-status-done-ink shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-ink">System Data Privacy &amp; Security Guarantee: </span>
          Passwords and raw password hashes are strictly redacted across all views. Errand customer-rider chat communications and personal store purchase inventories are excluded from IT management logs in compliance with zero-leakage security boundaries.
        </div>
      </div>

      {/* Category Sub-Tabs */}
      <div className="flex items-center gap-1 bg-board-ground p-1 rounded-xl border border-edge overflow-x-auto">
        <button
          onClick={() => {
            setActiveCategory("auth");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeCategory === "auth"
              ? "bg-board-plate text-ink border border-edge shadow-sm"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <Key className="w-3.5 h-3.5 text-status-done-ink" />
          <span>{t("auditTabAuth")}</span>
        </button>

        <button
          onClick={() => {
            setActiveCategory("modifications");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeCategory === "modifications"
              ? "bg-board-plate text-ink border border-edge shadow-sm"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5 text-status-moving-ink" />
          <span>{t("auditTabModifications")}</span>
        </button>

        <button
          onClick={() => {
            setActiveCategory("security");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeCategory === "security"
              ? "bg-board-plate text-ink border border-edge shadow-sm"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-status-waiting-ink" />
          <span>{t("auditTabThreats")}</span>
        </button>

        <button
          onClick={() => {
            setActiveCategory("lifecycle");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeCategory === "lifecycle"
              ? "bg-board-plate text-ink border border-edge shadow-sm"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span>{t("auditTabLifecycle")}</span>
        </button>

        <button
          onClick={() => {
            setActiveCategory("prints");
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeCategory === "prints"
              ? "bg-board-plate text-ink border border-edge shadow-sm"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <Printer className="w-3.5 h-3.5 text-ink-muted" />
          <span>{t("auditTabReportPrints")}</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder={`Search ${activeCategory} audit logs by user, IP, or event keyword...`}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-status-act-ink/30"
          />
        </div>

        {activeCategory === "auth" && (
          <>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by role"
              className="px-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink focus:outline-none focus:border-status-act-ink/30"
            >
              <option value="ALL">All Roles</option>
              <option value="OWNER">Owner</option>
              <option value="DISPATCHER">Dispatcher</option>
              <option value="RIDER">Rider</option>
              <option value="CUSTOMER">Customer</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
              className="px-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink focus:outline-none focus:border-status-act-ink/30"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
            </select>
          </>
        )}

        {activeCategory === "modifications" && (
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by target role"
            className="px-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink focus:outline-none focus:border-status-act-ink/30"
          >
            <option value="ALL">All Target Roles</option>
            <option value="OWNER">Owner</option>
            <option value="DISPATCHER">Dispatcher</option>
            <option value="RIDER">Rider</option>
            <option value="CUSTOMER">Customer</option>
          </select>
        )}

        {activeCategory === "security" && (
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by event severity"
            className="px-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink focus:outline-none focus:border-status-act-ink/30"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        )}

        {activeCategory === "lifecycle" && (
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by errand status"
            className="px-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink focus:outline-none focus:border-status-act-ink/30"
          >
            <option value="ALL">All Errand Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        )}

        {activeCategory === "prints" && (
          <select
            value={reportTypeFilter}
            onChange={(e) => {
              setReportTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by report"
            className="px-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink focus:outline-none focus:border-status-act-ink/30"
          >
            <option value="ALL">All Reports</option>
            {REPORT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Error View */}
      {error && (
        <div className="p-4 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-act-ink shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchLogs} className="underline text-status-act-ink hover:text-status-act-ink">
            Retry
          </button>
        </div>
      )}

      {/* Main Table Work Surface (Desktop & Mobile) */}
      {(() => {
        const desktopTableContent = (
          <div className="rounded-xl bg-board-plate border border-edge overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              {/* Category 1: Auth & Sessions */}
              {activeCategory === "auth" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-board-ground border-b border-edge text-ink-muted font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Account User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Device / Client</th>
                      <th className="py-3 px-4 text-center">Auth Status</th>
                      <th className="py-3 px-4">Revocation / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-ink-muted font-mono text-xs">
                          <div className="w-6 h-6 border-2 border-status-act-ink/30 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading authentication logs...
                        </td>
                      </tr>
                    ) : authLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-ink-muted">
                          <FileText className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                          <p className="text-xs font-medium text-ink">No authentication logs found</p>
                        </td>
                      </tr>
                    ) : (
                      authLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-board-ground transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-ink">{log.name || `@${log.username}`}</div>
                            <div className="text-[11px] font-mono text-ink-muted">@{log.username}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-board-ground text-ink border border-edge">
                              {log.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-ink whitespace-nowrap">
                            {log.ipAddress}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-ink">{log.deviceInfo || "Desktop Browser"}</div>
                            <div className="text-[10px] font-mono text-ink-muted max-w-xs truncate" title={log.userAgent}>
                              {log.userAgent}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${getStatusBadge(log.status)}`}>
                              {log.status === "SUCCESS" ? (
                                <CheckCircle2 className="w-3 h-3 text-status-done-ink" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-status-act-ink" />
                              )}
                              <span>{log.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {log.revokedReason ? (
                              <div className="text-[11px] text-status-act-ink font-mono">
                                Revoked: {log.revokedReason}
                              </div>
                            ) : (
                              <span className="text-ink-muted text-[11px] font-mono">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* Category 2: Modifications */}
              {activeCategory === "modifications" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-board-ground border-b border-edge text-ink-muted font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Target User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Modified Field</th>
                      <th className="py-3 px-4">Previous Value</th>
                      <th className="py-3 px-4">New Value</th>
                      <th className="py-3 px-4">Admin Actor &amp; IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-ink-muted font-mono text-xs">
                          <div className="w-6 h-6 border-2 border-status-act-ink/30 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading modification audit trails...
                        </td>
                      </tr>
                    ) : modLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-ink-muted">
                          <Edit3 className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                          <p className="text-xs font-medium text-ink">No account modification logs found</p>
                        </td>
                      </tr>
                    ) : (
                      modLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-board-ground transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-ink">{log.name || `@${log.username}`}</div>
                            <div className="text-[11px] font-mono text-ink-muted">@{log.username}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-board-ground text-ink border border-edge">
                              {log.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-ink">
                            {log.fieldModified}
                          </td>
                          <td className="py-3 px-4 font-mono text-ink-muted line-through">
                            {log.oldValue || "empty"}
                          </td>
                          <td className="py-3 px-4 font-mono text-status-done-ink font-bold">
                            {log.newValue}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-ink font-mono text-[11px]">{log.ipAddress || "Internal Server"}</div>
                            <div className="text-[10px] text-ink-muted font-mono">Via {log.verifiedVia}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* Category 3: Security Threats */}
              {activeCategory === "security" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-board-ground border-b border-edge text-ink-muted font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Threat Event</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Target / Actor</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Event Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-ink-muted font-mono text-xs">
                          <div className="w-6 h-6 border-2 border-status-act-ink/30 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading security incident logs...
                        </td>
                      </tr>
                    ) : secLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-ink-muted">
                          <ShieldCheck className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                          <p className="text-xs font-medium text-ink">No security threat events recorded</p>
                        </td>
                      </tr>
                    ) : (
                      secLogs.map((evt) => (
                        <tr key={evt.id} className="hover:bg-board-ground transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                            {new Date(evt.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-semibold text-ink">
                            {evt.eventType}
                          </td>
                          <td className="py-3 px-4">
                            {getSeverityBadge(evt.severity)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-ink">{evt.targetName}</div>
                            <div className="text-[10px] font-mono text-ink-muted">{evt.targetIdentifier}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-ink">
                            {evt.ipAddress || "N/A"}
                          </td>
                          <td className="py-3 px-4 text-ink text-[11px] max-w-sm">
                            {evt.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* Category 4: Lifecycle Activities */}
              {activeCategory === "lifecycle" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-board-ground border-b border-edge text-ink-muted font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Reference Code</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Claimed Dispatcher</th>
                      <th className="py-3 px-4">Assigned Rider</th>
                      <th className="py-3 px-4">Route Info</th>
                      <th className="py-3 px-4">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-ink-muted font-mono text-xs">
                          <div className="w-6 h-6 border-2 border-status-act-ink/30 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading errand lifecycle activities...
                        </td>
                      </tr>
                    ) : sysLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-ink-muted">
                          <Activity className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                          <p className="text-xs font-medium text-ink">No errand lifecycle activities recorded</p>
                        </td>
                      </tr>
                    ) : (
                      sysLogs.map((act) => (
                        <tr key={`${act.errandId}-${act.status}`} className="hover:bg-board-ground transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-ink whitespace-nowrap">
                            {act.referenceCode || formatErrandId(act.errandId)}
                          </td>
                          <td className="py-3 px-4 text-ink">
                            {act.category}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-board-ground text-ink border border-edge">
                              {act.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-ink font-medium">
                            {act.dispatcher}
                          </td>
                          <td className="py-3 px-4 text-ink font-medium">
                            {act.rider}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-ink-muted max-w-xs truncate" title={act.route}>
                            {act.route}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                            {new Date(act.updatedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* Category 5: Report Prints */}
              {activeCategory === "prints" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-board-ground border-b border-edge text-ink-muted font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Printed On</th>
                      <th className="py-3 px-4">Printed By</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Report</th>
                      <th className="py-3 px-4">Dates Covered</th>
                      <th className="py-3 px-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-ink-muted font-mono text-xs">
                          <div className="w-6 h-6 border-2 border-status-act-ink/30 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading report prints...
                        </td>
                      </tr>
                    ) : printLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-ink-muted">
                          <Printer className="w-8 h-8 text-ink-muted mx-auto mb-2" />
                          <p className="text-xs font-medium text-ink">No reports have been printed yet</p>
                        </td>
                      </tr>
                    ) : (
                      printLogs.map((p) => (
                        <tr key={p.id} className="hover:bg-board-ground transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                            {new Date(p.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-ink font-medium whitespace-nowrap">{p.printedByName}</td>
                          <td className="py-3 px-4">
                            <span className="inline-block text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-board-ground text-ink border border-edge">
                              {p.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-ink whitespace-nowrap">{p.reportName}</td>
                          <td className="py-3 px-4 text-[11px] text-ink-muted max-w-sm truncate" title={p.coverageLabel}>
                            {p.coverageLabel}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                            {p.ipAddress || "Unknown"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-4 py-3 bg-board-ground border-t border-edge flex items-center justify-between text-xs text-ink-muted">
                <div>
                  Showing page <span className="font-mono text-ink">{page}</span> of{" "}
                  <span className="font-mono text-ink">{totalPages}</span> ({totalCount} total entries)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg bg-board-plate border border-edge disabled:opacity-40 disabled:cursor-not-allowed hover:bg-board-ground text-ink"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] text-ink">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg bg-board-plate border border-edge disabled:opacity-40 disabled:cursor-not-allowed hover:bg-board-ground text-ink"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );

        if (activeCategory === "auth") {
          return (
            <MobileResponsiveTable<AuthAuditLog>
              data={authLogs}
              keyExtractor={(log) => log.id}
              isLoading={isLoading}
              primaryHeader="User / Role"
              secondaryHeader="Status / Time"
              renderPrimary={(log) => (
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-ink text-xs truncate">
                    {log.name || `@${log.username}`}
                  </span>
                  <span className="text-[10px] text-ink-muted font-mono mt-0.5">
                    @{log.username} · <span className="uppercase text-ink">{log.role}</span>
                  </span>
                </div>
              )}
              renderSecondary={(log) => (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${getStatusBadge(
                      log.status
                    )}`}
                  >
                    {log.status === "SUCCESS" ? (
                      <CheckCircle2 className="w-3 h-3 text-status-done-ink" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-status-act-ink" />
                    )}
                    <span>{log.status}</span>
                  </span>
                  <span className="text-[10px] font-mono text-ink-muted">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              renderPreview={(log) => (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">IP Address:</span>
                    <span className="font-mono text-ink">{log.ipAddress}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">Device:</span>
                    <span className="text-ink truncate max-w-[180px]">{log.deviceInfo || "Standard Client"}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">Timestamp:</span>
                    <span className="font-mono text-ink-muted text-[10px]">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  {log.revokedReason && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-ink-muted">Revocation:</span>
                      <span className="text-status-act-ink font-mono text-[10px]">{log.revokedReason}</span>
                    </div>
                  )}
                </div>
              )}
              inspectorTitle={(log) => log.name || `@${log.username}`}
              inspectorSubtitle={(log) => `${log.role} Authentication Event`}
              inspectorSections={(log) => [
                {
                  title: "Account Identity",
                  items: [
                    { label: "Account Name", value: log.name || "N/A" },
                    { label: "Username", value: `@${log.username}`, copyable: true, copyValue: log.username },
                    { label: "Assigned Role", value: log.role },
                    {
                      label: "Session ID",
                      value: log.sessionId || "N/A",
                      copyable: Boolean(log.sessionId),
                      copyValue: log.sessionId || undefined,
                    },
                  ],
                },
                {
                  title: "Client & Network Telemetry",
                  items: [
                    { label: "IP Address", value: log.ipAddress, copyable: true, copyValue: log.ipAddress },
                    { label: "Device Info", value: log.deviceInfo || "N/A" },
                    { label: "User Agent", value: log.userAgent, fullWidth: true },
                    { label: "Timestamp", value: new Date(log.createdAt).toLocaleString() },
                  ],
                },
                {
                  title: "Outcome & Notes",
                  items: [
                    { label: "Auth Status", value: log.status },
                    { label: "Presence", value: log.isOnline ? "Online" : "Offline" },
                    { label: "Revoked Reason", value: log.revokedReason || "None" },
                    {
                      label: "Revoked At",
                      value: log.revokedAt ? new Date(log.revokedAt).toLocaleString() : "Active",
                    },
                  ],
                },
              ]}
              pagination={
                totalPages > 1
                  ? {
                      currentPage: page,
                      totalPages: totalPages,
                      onPageChange: setPage,
                      totalItems: totalCount,
                    }
                  : undefined
              }
              desktopView={desktopTableContent}
            />
          );
        }

        if (activeCategory === "modifications") {
          return (
            <MobileResponsiveTable<ModificationAuditLog>
              data={modLogs}
              keyExtractor={(log) => log.id}
              isLoading={isLoading}
              primaryHeader="Target / Role"
              secondaryHeader="Field / Time"
              renderPrimary={(log) => (
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-ink text-xs truncate">{log.name || `@${log.username}`}</span>
                  <span className="text-[10px] text-ink-muted font-mono mt-0.5">
                    @{log.username} · <span className="uppercase text-ink">{log.role}</span>
                  </span>
                </div>
              )}
              renderSecondary={(log) => (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-board-ground text-ink border border-edge">
                    {log.fieldModified}
                  </span>
                  <span className="text-[10px] font-mono text-ink-muted">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              renderPreview={(log) => (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">Previous:</span>
                    <span className="font-mono text-ink-muted line-through truncate max-w-[180px]">
                      {log.oldValue || "empty"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">New Value:</span>
                    <span className="font-mono text-status-done-ink font-bold truncate max-w-[180px]">
                      {log.newValue}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">IP Address:</span>
                    <span className="font-mono text-ink">{log.ipAddress || "Internal / System"}</span>
                  </div>
                </div>
              )}
              inspectorTitle={(log) => `${log.name || `@${log.username}`} Modified`}
              inspectorSubtitle={(log) => `Field: ${log.fieldModified}`}
              inspectorSections={(log) => [
                {
                  title: "Target Account",
                  items: [
                    { label: "Target Name", value: log.name || "N/A" },
                    { label: "Target Username", value: `@${log.username}` },
                    { label: "Target Role", value: log.role },
                    { label: "Modified Field", value: log.fieldModified },
                  ],
                },
                {
                  title: "Modification Delta",
                  items: [
                    { label: "Previous Value", value: log.oldValue || "None / Unset" },
                    { label: "Updated Value", value: log.newValue || "None" },
                    { label: "Verified Via", value: log.verifiedVia || "Step-Up Password" },
                    { label: "Timestamp", value: new Date(log.createdAt).toLocaleString() },
                  ],
                },
                {
                  title: "Network & Origin",
                  items: [
                    {
                      label: "IP Address",
                      value: log.ipAddress || "Internal Server",
                      copyable: Boolean(log.ipAddress),
                      copyValue: log.ipAddress || undefined,
                    },
                    { label: "User Agent", value: log.userAgent || "System Core", fullWidth: true },
                  ],
                },
              ]}
              pagination={
                totalPages > 1
                  ? {
                      currentPage: page,
                      totalPages: totalPages,
                      onPageChange: setPage,
                      totalItems: totalCount,
                    }
                  : undefined
              }
              desktopView={desktopTableContent}
            />
          );
        }

        if (activeCategory === "security") {
          return (
            <MobileResponsiveTable<SecurityThreatLog>
              data={secLogs}
              keyExtractor={(evt) => evt.id}
              isLoading={isLoading}
              primaryHeader="Threat / Type"
              secondaryHeader="Severity / Time"
              renderPrimary={(evt) => (
                <div className="flex flex-col min-w-0">
                  <span className="font-mono font-bold text-ink text-xs truncate">
                    {evt.targetIdentifier}
                  </span>
                  <span className="text-[10px] text-ink-muted font-mono mt-0.5 truncate">
                    {evt.eventType}
                  </span>
                </div>
              )}
              renderSecondary={(evt) => (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {getSeverityBadge(evt.severity)}
                  <span className="text-[10px] font-mono text-ink-muted">
                    {new Date(evt.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              renderPreview={(evt) => (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start justify-between gap-2 text-[11px]">
                    <span className="text-ink-muted shrink-0">Details:</span>
                    <span className="text-ink text-right truncate max-w-[200px]" title={evt.details}>
                      {evt.details}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">Target Name:</span>
                    <span className="text-ink">{evt.targetName}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">IP Address:</span>
                    <span className="font-mono text-ink">{evt.ipAddress || "N/A"}</span>
                  </div>
                </div>
              )}
              inspectorTitle={(evt) => evt.targetIdentifier}
              inspectorSubtitle={(evt) => `${evt.eventType} (${evt.severity})`}
              inspectorStatusBadge={(evt) => getSeverityBadge(evt.severity)}
              inspectorSections={(evt) => [
                {
                  title: "Incident Overview",
                  items: [
                    {
                      label: "Target Identifier",
                      value: evt.targetIdentifier,
                      copyable: true,
                      copyValue: evt.targetIdentifier,
                    },
                    { label: "Target Name", value: evt.targetName },
                    { label: "Event Type", value: evt.eventType },
                    { label: "Severity", value: evt.severity },
                    { label: "Incident Details", value: evt.details, fullWidth: true },
                  ],
                },
                {
                  title: "Origin & Forensics",
                  items: [
                    {
                      label: "IP Address",
                      value: evt.ipAddress || "N/A",
                      copyable: Boolean(evt.ipAddress),
                      copyValue: evt.ipAddress || undefined,
                    },
                    { label: "Timestamp", value: new Date(evt.createdAt).toLocaleString() },
                    { label: "User Agent", value: evt.userAgent || "N/A", fullWidth: true },
                  ],
                },
              ]}
              pagination={
                totalPages > 1
                  ? {
                      currentPage: page,
                      totalPages: totalPages,
                      onPageChange: setPage,
                      totalItems: totalCount,
                    }
                  : undefined
              }
              desktopView={desktopTableContent}
            />
          );
        }

        if (activeCategory === "prints") {
          return (
            <MobileResponsiveTable<ReportPrintLog>
              data={printLogs}
              keyExtractor={(p) => p.id}
              isLoading={isLoading}
              primaryHeader="Report / Printed By"
              secondaryHeader="Time"
              renderPrimary={(p) => (
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-ink text-xs truncate">{p.reportName}</span>
                  <span className="text-[10px] text-ink-muted truncate mt-0.5">
                    {p.printedByName} · {p.role}
                  </span>
                </div>
              )}
              renderSecondary={(p) => (
                <span className="text-[10px] font-mono text-ink-muted shrink-0">
                  {new Date(p.createdAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              renderPreview={(p) => (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start justify-between gap-2 text-[11px]">
                    <span className="text-ink-muted shrink-0">Dates:</span>
                    <span className="text-ink text-right truncate max-w-[200px]" title={p.coverageLabel}>
                      {p.coverageLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">IP:</span>
                    <span className="font-mono text-ink">{p.ipAddress || "Unknown"}</span>
                  </div>
                </div>
              )}
              inspectorTitle={(p) => p.reportName}
              inspectorSubtitle={(p) => `Printed by ${p.printedByName}`}
              inspectorSections={(p) => [
                {
                  title: "Report Print",
                  items: [
                    { label: "Report", value: p.reportName },
                    { label: "Period", value: p.period },
                    { label: "Dates Covered", value: p.coverageLabel, fullWidth: true },
                  ],
                },
                {
                  title: "Printed By",
                  items: [
                    { label: "Name", value: p.printedByName },
                    { label: "Role", value: p.role },
                    { label: "Account ID", value: p.userId != null ? `#${p.userId}` : "Deleted account" },
                    { label: "Printed On", value: new Date(p.createdAt).toLocaleString() },
                    { label: "IP Address", value: p.ipAddress || "Unknown" },
                    { label: "Device / Client", value: p.userAgent || "Unknown", fullWidth: true },
                  ],
                },
              ]}
              pagination={
                totalPages > 1
                  ? {
                      currentPage: page,
                      totalPages: totalPages,
                      onPageChange: setPage,
                      totalItems: totalCount,
                    }
                  : undefined
              }
              desktopView={desktopTableContent}
            />
          );
        }

        // Default: lifecycle
        return (
          <MobileResponsiveTable<SystemActivityLog>
            data={sysLogs}
            keyExtractor={(act) => `${act.errandId}-${act.status}`}
            isLoading={isLoading}
            primaryHeader="Order / Category"
            secondaryHeader="Status / Time"
            renderPrimary={(act) => (
              <div className="flex flex-col min-w-0">
                <span className="font-mono font-bold text-ink text-xs truncate">
                  {act.referenceCode || formatErrandId(act.errandId)}
                </span>
                <span className="text-[10px] text-ink-muted truncate mt-0.5">
                  {act.category}
                </span>
              </div>
            )}
            renderSecondary={(act) => (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="inline-block text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-board-ground text-ink border border-edge">
                  {act.status}
                </span>
                <span className="text-[10px] font-mono text-ink-muted">
                  {new Date(act.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
            renderPreview={(act) => (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-start justify-between gap-2 text-[11px]">
                  <span className="text-ink-muted shrink-0">Route:</span>
                  <span className="text-ink text-right truncate max-w-[200px]" title={act.route}>
                    {act.route}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-muted">Dispatcher:</span>
                  <span className="text-ink">{act.dispatcher}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-muted">Rider:</span>
                  <span className="text-ink">{act.rider}</span>
                </div>
              </div>
            )}
            inspectorTitle={(act) => act.referenceCode || formatErrandId(act.errandId)}
            inspectorSubtitle={(act) => `${act.category} Errand Lifecycle`}
            inspectorSections={(act) => [
              {
                title: "Errand Lifecycle Record",
                items: [
                  {
                    label: "Reference Code",
                    value: act.referenceCode || "N/A",
                    copyable: Boolean(act.referenceCode),
                    copyValue: act.referenceCode || undefined,
                  },
                  { label: "Errand ID", value: act.errandId, copyable: true, copyValue: act.errandId },
                  { label: "Merchant Category", value: act.category },
                  { label: "Status", value: act.status },
                  { label: "Route Description", value: act.route, fullWidth: true },
                ],
              },
              {
                title: "Assigned Personnel",
                items: [
                  { label: "Claiming Dispatcher", value: act.dispatcher },
                  { label: "Assigned Rider", value: act.rider },
                  { label: "Last Updated", value: new Date(act.updatedAt).toLocaleString() },
                  { label: "Created At", value: new Date(act.createdAt).toLocaleString() },
                ],
              },
            ]}
            pagination={
              totalPages > 1
                ? {
                    currentPage: page,
                    totalPages: totalPages,
                    onPageChange: setPage,
                    totalItems: totalCount,
                  }
                : undefined
            }
            desktopView={desktopTableContent}
          />
        );
      })()}
    </div>
  );
};
