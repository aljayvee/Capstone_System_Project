import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { SessionConflictScreen } from "../../components/modals/SessionConflictScreen";
import { useSysAdminAuth } from "./context/SysAdminAuthContext";
import { SysAdminPermissionsProvider, useSysAdminPermissions } from "./context/SysAdminPermissionsContext";
import { useSysAdminLanguage } from "./context/SysAdminLanguageContext";
import { SysAdminLoginView } from "./components/SysAdminLoginView";
import { SysAdminProfileWizard } from "./components/SysAdminProfileWizard";
import { UserMonitoringModule } from "./modules/users/UserMonitoringModule";
import { AuditLogsModule } from "./modules/audit/AuditLogsModule";
import { TrafficMonitoringModule } from "./modules/traffic/TrafficMonitoringModule";
import { DevOpsModule } from "./modules/devops/DevOpsModule";
import { ItStaffModule } from "./modules/staff/ItStaffModule";
import { AccountSettingsModule } from "./modules/settings/AccountSettingsModule";
import { ThreatCenterModule } from "./modules/threats/ThreatCenterModule";
import {
  Terminal,
  Activity,
  Users,
  FileText,
  Globe,
  Wrench,
  UserCog,
  KeyRound,
  LogOut,
  Server,
  Database,
  Cpu,
  ShieldAlert,
  AlertTriangle,
  Lock,
  RefreshCw,
} from "lucide-react";
import { sysAdminApiService } from "../../services/sysAdminApiService";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import { MobileHeader } from "../../components/navigation/MobileHeader";
import { BrandMark } from "../../components/brand/BrandMark";
import { MobileBottomNav, type MobileNavTab } from "../../components/navigation/MobileBottomNav";
import { ScrollToTopButton } from "../../components/common/ScrollToTopButton";

type SysAdminTab = "overview" | "threats" | "users" | "audit" | "traffic" | "devops" | "it-staff" | "settings";

const SysAdminPortalContent: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useDeviceTier();
  const { user: operationalUser, isAuthenticated: isOperationalAuth, logout: logoutOperational } = useAuth();
  const { admin, isAuthenticated, isLoading, challengeToken, logout } = useSysAdminAuth();
  const pma = useSysAdminPermissions();
  const { language, setLanguage, t } = useSysAdminLanguage();
  const [activeTab, setActiveTab] = useState<SysAdminTab>("overview");
  const [revokedNotice, setRevokedNotice] = useState<string | null>(null);

  const canThreats = pma.can("threats.view");
  const canUsers = pma.can("users.view");
  const canAudit = pma.can("audit.view");
  const canTraffic = pma.can("traffic.view");
  const canDevOps = pma.canAny(
    "telemetry.view",
    "devops.services",
    "devops.backups.view",
    "logs.view",
    "incidents.view",
    "releases.view",
    "devops.features"
  );
  const canStaff = pma.can("staff.view") || pma.isMainSysAdmin;
  const canFeatures = pma.can("devops.features");

  React.useEffect(() => {
    if (pma.status !== "ready") return;
    const tabAllowed: Record<SysAdminTab, boolean> = {
      overview: true,
      threats: canThreats,
      users: canUsers,
      audit: canAudit,
      traffic: canTraffic,
      devops: canDevOps,
      "it-staff": canStaff,
      settings: true,
    };
    if (!tabAllowed[activeTab]) {
      setActiveTab("overview");
      setRevokedNotice("Your SysAdmin access group changed, so you were returned to Overview.");
    }
  }, [pma.status, activeTab, canThreats, canUsers, canAudit, canTraffic, canDevOps, canStaff]);

  // 500 Server Error [nginx] Outage Simulation State
  const [isServerErrorActive, setIsServerErrorActive] = useState<boolean>(() => {
    return localStorage.getItem("sugo_simulate_500_error") === "true";
  });
  const [isTogglingServerError, setIsTogglingServerError] = useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await sysAdminApiService.getServerErrorStatus();
        if (isMounted && typeof res.active === "boolean") {
          setIsServerErrorActive(res.active);
          localStorage.setItem("sugo_simulate_500_error", res.active ? "true" : "false");
        }
      } catch {
        // Fail silently
      }
    };

    if (isAuthenticated) {
      fetchStatus();
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sugo_simulate_500_error") {
        setIsServerErrorActive(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorageChange);

    const handleCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<{ active: boolean }>;
      if (custom.detail && typeof custom.detail.active === "boolean") {
        setIsServerErrorActive(custom.detail.active);
      }
    };
    window.addEventListener("sugo:server-error-update", handleCustomEvent as EventListener);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("sugo:server-error-update", handleCustomEvent as EventListener);
    };
  }, [isAuthenticated]);

  const handleToggleServerError = async () => {
    if (isTogglingServerError) return;
    const nextState = !isServerErrorActive;
    setIsTogglingServerError(true);
    try {
      const res = await sysAdminApiService.toggleServerError(nextState);
      setIsServerErrorActive(res.active);
      localStorage.setItem("sugo_simulate_500_error", res.active ? "true" : "false");
      window.dispatchEvent(
        new CustomEvent("sugo:server-error-update", { detail: { active: res.active } })
      );
    } catch {
      // Fail silently
    } finally {
      setIsTogglingServerError(false);
    }
  };

  // Strict cross-portal isolation: If an operational user (dispatcher/owner/etc.) visits /sysadmin, block access
  if (isOperationalAuth && operationalUser) {
    const rolePath = `/${operationalUser.role.toLowerCase()}`;
    return (
      <SessionConflictScreen
        variant="operational_active"
        operationalUser={operationalUser}
        onReturn={() => navigate(rolePath)}
        onSignOutAndProceed={async () => {
          await logoutOperational();
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-board-ground flex flex-col items-center justify-center text-ink">
        <div className="w-8 h-8 border-2 border-status-act-ink/30 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-ink-muted text-xs font-mono tracking-wider uppercase">{t("initializingConsole")}</p>
      </div>
    );
  }

  // First-time login: wizard required
  if (!isAuthenticated && challengeToken) {
    return <SysAdminProfileWizard />;
  }

  // Not logged in: show dedicated login screen
  if (!isAuthenticated) {
    return <SysAdminLoginView />;
  }

  const sysadminPrimaryTabs: MobileNavTab[] = [
    {
      id: "overview",
      label: t("tabOverview"),
      icon: <Activity className="w-5 h-5" />,
      isActive: activeTab === "overview",
      onClick: () => setActiveTab("overview"),
    },
    ...(canThreats
      ? [{
          id: "threats",
          label: t("tabThreats"),
          icon: <ShieldAlert className="w-5 h-5 text-status-act-ink" />,
          isActive: activeTab === "threats",
          onClick: () => setActiveTab("threats"),
        }]
      : []),
    ...(canUsers
      ? [{
          id: "users",
          label: t("tabUsers"),
          icon: <Users className="w-5 h-5" />,
          isActive: activeTab === "users",
          onClick: () => setActiveTab("users"),
        }]
      : []),
    ...(canDevOps
      ? [{
          id: "devops",
          label: t("tabDevOps"),
          icon: <Wrench className="w-5 h-5" />,
          isActive: activeTab === "devops",
          onClick: () => setActiveTab("devops"),
        }]
      : []),
  ];

  const sysadminMoreTabs: MobileNavTab[] = [
    ...(canAudit
      ? [{
          id: "audit",
          label: t("tabAudit"),
          icon: <FileText className="w-5 h-5" />,
          isActive: activeTab === "audit",
          onClick: () => setActiveTab("audit"),
        }]
      : []),
    ...(canTraffic
      ? [{
          id: "traffic",
          label: t("tabTraffic"),
          icon: <Globe className="w-5 h-5" />,
          isActive: activeTab === "traffic",
          onClick: () => setActiveTab("traffic"),
        }]
      : []),
    ...(canStaff
      ? [{
          id: "it-staff",
          label: t("tabStaff"),
          icon: <UserCog className="w-5 h-5" />,
          isActive: activeTab === "it-staff",
          onClick: () => setActiveTab("it-staff"),
        }]
      : []),
    {
      id: "settings",
      label: t("tabSettings"),
      icon: <KeyRound className="w-5 h-5" />,
      isActive: activeTab === "settings",
      onClick: () => setActiveTab("settings"),
    },
  ];

  return (
    <div className="min-h-screen bg-board-ground text-ink flex flex-col font-sans select-none">
      {isMobile ? (
        <MobileHeader
          title={t("brandTitle")}
          subtitle={`@${admin?.nickname || admin?.username || "admin"}`}
          rightElement={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
                className="h-8 px-2.5 rounded-lg bg-board-plate border border-edge text-xs font-medium text-ink active:bg-board-ground flex items-center gap-1 cursor-pointer"
                title={language === "zh" ? "Switch to English" : "切换为简体中文"}
              >
                <Globe className="w-3.5 h-3.5 text-status-act-ink" />
                <span>{language === "zh" ? "中文" : "EN"}</span>
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="w-8 h-8 rounded-lg text-ink-muted hover:text-status-act-ink active:bg-board-ground flex items-center justify-center transition-colors cursor-pointer"
                title={t("signOutTooltip")}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          }
        />
      ) : (
        <>
          {/* Top Header Mission Control */}
          <header className="px-6 py-3 bg-board-ground border-b border-edge flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-signal flex items-center justify-center text-white shadow-sm">
                  <BrandMark className="w-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-ink tracking-wide flex items-center gap-2">
                    {t("brandTitle")}
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-status-act-fill text-status-act-ink border border-status-act-ink/30 font-semibold">
                      {t("brandSubtitle")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-edge text-xs text-ink-muted font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-go animate-pulse" />
                  {t("apiOnline")}
                </span>
                <span className="text-ink">&bull;</span>
                <span className="flex items-center gap-1 text-ink-muted">
                  <Database className="w-3.5 h-3.5 text-ink-muted" />
                  {t("dbActive")}
                </span>
              </div>
            </div>

            {/* Right Admin Controls & Language Selector */}
            <div className="flex items-center gap-3">
              {/* Top Right Header Language Switcher */}
              <div className="flex items-center rounded-lg bg-board-plate border border-edge p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setLanguage("zh")}
                  className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
                    language === "zh"
                      ? "bg-signal text-white font-semibold shadow-sm"
                      : "text-ink-muted hover:text-ink"
                  }`}
                  title="切换为简体中文 (默认)"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>简体中文</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                    language === "en"
                      ? "bg-signal text-white font-semibold shadow-sm"
                      : "text-ink-muted hover:text-ink"
                  }`}
                  title="Switch to English"
                >
                  English
                </button>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-board-plate border border-edge text-xs">
                <span className="w-2 h-2 rounded-full bg-status-done-fill" />
                <span className="text-ink-muted">{t("loggedInAs")}</span>
                <span className="font-bold text-ink">@{admin?.nickname || admin?.username}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-board-ground text-ink-muted">
                  {admin?.role === "SYSADMIN" ? t("roleSysAdmin") : admin?.role}
                </span>
              </div>

              <button
                onClick={() => logout()}
                className="p-1.5 rounded-lg text-ink-muted hover:text-status-act-ink hover:bg-board-ground transition-colors"
                title={t("signOutTooltip")}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Navigation Sub-Header */}
          <nav className="px-6 bg-board-ground border-b border-edge flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-status-act-ink/30 text-ink bg-board-ground"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>{t("tabOverview")}</span>
            </button>

            {canThreats && (
              <button
                onClick={() => setActiveTab("threats")}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "threats"
                    ? "border-status-act-ink/30 text-ink bg-board-ground"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-status-act-ink" />
                <span>{t("tabThreats")}</span>
              </button>
            )}

            {canUsers && (
              <button
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "users"
                    ? "border-status-act-ink/30 text-ink bg-board-ground"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{t("tabUsers")}</span>
              </button>
            )}

            {canAudit && (
              <button
                onClick={() => setActiveTab("audit")}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "audit"
                    ? "border-status-act-ink/30 text-ink bg-board-ground"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{t("tabAudit")}</span>
              </button>
            )}

            {canTraffic && (
              <button
                onClick={() => setActiveTab("traffic")}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "traffic"
                    ? "border-status-act-ink/30 text-ink bg-board-ground"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>{t("tabTraffic")}</span>
              </button>
            )}

            {canDevOps && (
              <button
                onClick={() => setActiveTab("devops")}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "devops"
                    ? "border-status-act-ink/30 text-ink bg-board-ground"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>{t("tabDevOps")}</span>
              </button>
            )}

            {canStaff && (
              <button
                onClick={() => setActiveTab("it-staff")}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "it-staff"
                    ? "border-status-act-ink/30 text-ink bg-board-ground"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                <UserCog className="w-4 h-4" />
                <span>{t("tabStaff")}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "settings"
                  ? "border-status-act-ink/30 text-ink bg-board-ground"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>{t("tabSettings")}</span>
            </button>
          </nav>
        </>
      )}

      {/* Main Console Work Area */}
      <main className={`flex-1 p-3.5 sm:p-6 max-w-7xl w-full mx-auto ${isMobile ? "pb-24" : ""}`}>
        {pma.status === "error" && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-waiting-ink/30 bg-status-waiting-fill px-4 py-3 text-xs text-status-waiting-ink">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{pma.error || "Permissions could not be loaded. Restricted modules stay hidden until verified."}</span>
            </div>
            <button
              type="button"
              onClick={() => void pma.reload()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-board-plate px-3 py-1.5 font-semibold text-ink hover:bg-board-ground"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {revokedNotice && (
          <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-edge bg-board-plate px-4 py-3 text-xs text-ink">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-ink-muted shrink-0" />
              <span>{revokedNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setRevokedNotice(null)}
              className="text-ink-muted hover:text-ink font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}
        {/* Active 500 Server Error Outage Banner */}
        {isServerErrorActive && (
          <div className="mb-5 p-3.5 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-status-act-ink shrink-0 animate-pulse" />
              <span>
                <strong>Simulated 500 Server Error is ACTIVE</strong> on the public login screen (white background with "500 Server Error [nginx] error").
              </span>
            </div>
            {canFeatures && (
              <button
                type="button"
                onClick={handleToggleServerError}
                disabled={isTogglingServerError}
                className="px-3 py-1 rounded-lg bg-signal hover:bg-signal-deep text-white font-semibold text-xs transition-colors shrink-0 ml-3 cursor-pointer"
              >
                Turn Off 500 Error
              </button>
            )}
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">{t("overviewTitle")}</h2>
                <p className="text-xs text-ink-muted">{t("overviewSubtitle")}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-edge bg-board-plate px-2.5 py-1 text-[11px] font-mono text-ink-muted">
                  <Lock className="w-3 h-3 text-ink-muted" />
                  <span>{pma.status === "ready" ? pma.baselineName : "Verifying access..."}</span>
                </span>
                <div className="text-xs font-mono text-ink-muted flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-go" />
                  <span>{t("allSystemsOperational")}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="p-3 sm:p-4 rounded-xl bg-board-plate border border-edge">
                <div className="flex items-center justify-between text-ink-muted mb-1.5 sm:mb-2">
                  <span className="text-[11px] sm:text-xs font-medium truncate">{t("serverProcessTitle")}</span>
                  <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-status-done-ink shrink-0 ml-1" />
                </div>
                <div className="text-base sm:text-xl font-bold font-mono text-ink">Node.js v24</div>
                <div className="text-[10px] sm:text-[11px] text-status-done-ink font-mono mt-1 truncate">{t("serverProcessDesc")}</div>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-board-plate border border-edge">
                <div className="flex items-center justify-between text-ink-muted mb-1.5 sm:mb-2">
                  <span className="text-[11px] sm:text-xs font-medium truncate">{t("databaseTitle")}</span>
                  <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-status-moving-ink shrink-0 ml-1" />
                </div>
                <div className="text-base sm:text-xl font-bold font-mono text-ink">MariaDB 10.4</div>
                <div className="text-[10px] sm:text-[11px] text-ink-muted font-mono mt-1 truncate">{t("databaseDesc")}</div>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-board-plate border border-edge">
                <div className="flex items-center justify-between text-ink-muted mb-1.5 sm:mb-2">
                  <span className="text-[11px] sm:text-xs font-medium truncate">{t("securitySessionsTitle")}</span>
                  <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-status-waiting-ink shrink-0 ml-1" />
                </div>
                <div className="text-base sm:text-xl font-bold font-mono text-ink">Rotating JWT</div>
                <div className="text-[10px] sm:text-[11px] text-ink-muted font-mono mt-1 truncate">{t("securitySessionsDesc")}</div>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-board-plate border border-edge">
                <div className="flex items-center justify-between text-ink-muted mb-1.5 sm:mb-2">
                  <span className="text-[11px] sm:text-xs font-medium truncate">{t("trafficAnalyzerTitle")}</span>
                  <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0 ml-1" />
                </div>
                <div className="text-base sm:text-xl font-bold font-mono text-ink">GoAccess</div>
                <div className="text-[10px] sm:text-[11px] text-ink-muted font-mono mt-1 truncate">{t("trafficAnalyzerDesc")}</div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-board-plate border border-edge">
              <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-status-act-ink" />
                <span>{t("diagnosticHubTitle")}</span>
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {canThreats && (
                  <button
                    onClick={() => setActiveTab("threats")}
                    className="p-2.5 sm:p-3 text-left rounded-lg bg-board-ground hover:bg-board-ground border border-edge transition-colors"
                  >
                    <div className="text-xs font-semibold text-ink mb-0.5 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-status-act-ink shrink-0" />
                      <span className="truncate">{t("threatDefenseCardTitle")}</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-ink-muted line-clamp-2">{t("threatDefenseCardDesc")}</p>
                  </button>
                )}

                {canUsers && (
                  <button
                    onClick={() => setActiveTab("users")}
                    className="p-2.5 sm:p-3 text-left rounded-lg bg-board-ground hover:bg-board-ground border border-edge transition-colors"
                  >
                    <div className="text-xs font-semibold text-ink mb-0.5 truncate">{t("userAuditCardTitle")}</div>
                    <p className="text-[10px] sm:text-[11px] text-ink-muted line-clamp-2">{t("userAuditCardDesc")}</p>
                  </button>
                )}

                {canAudit && (
                  <button
                    onClick={() => setActiveTab("audit")}
                    className="p-2.5 sm:p-3 text-left rounded-lg bg-board-ground hover:bg-board-ground border border-edge transition-colors"
                  >
                    <div className="text-xs font-semibold text-ink mb-0.5 truncate">{t("securityLogsCardTitle")}</div>
                    <p className="text-[10px] sm:text-[11px] text-ink-muted line-clamp-2">{t("securityLogsCardDesc")}</p>
                  </button>
                )}

                {canTraffic && (
                  <button
                    onClick={() => setActiveTab("traffic")}
                    className="p-2.5 sm:p-3 text-left rounded-lg bg-board-ground hover:bg-board-ground border border-edge transition-colors"
                  >
                    <div className="text-xs font-semibold text-ink mb-0.5 truncate">{t("trafficCardTitle")}</div>
                    <p className="text-[10px] sm:text-[11px] text-ink-muted line-clamp-2">{t("trafficCardDesc")}</p>
                  </button>
                )}

                {!canThreats && !canUsers && !canAudit && !canTraffic && (
                  <div className="col-span-2 lg:col-span-4 rounded-lg border border-hairline bg-board-ground p-3 text-xs text-ink-muted">
                    Diagnostic shortcuts match your assigned access group. Use the navigation bar above to open your permitted consoles or manage your own account security.
                  </div>
                )}
              </div>
            </div>

            {/* Outage Simulation & Error Controls Card (Feature & Simulation Toggles permission) */}
            {canFeatures && (
            <div className="p-4 sm:p-5 rounded-xl bg-board-plate border border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                        OFF
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Overlays a white background with <span className="font-mono text-status-waiting-ink">"500 Server Error [nginx] error"</span> on the public login screen only. Sysadmin login is excluded.
                  </p>
                </div>
              </div>

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
            </div>
            )}
          </div>
        )}

        {activeTab === "threats" && canThreats && <ThreatCenterModule />}

        {activeTab === "users" && canUsers && <UserMonitoringModule />}

        {activeTab === "audit" && canAudit && <AuditLogsModule />}

        {activeTab === "traffic" && canTraffic && <TrafficMonitoringModule />}

        {activeTab === "devops" && canDevOps && <DevOpsModule />}

        {activeTab === "it-staff" && canStaff && <ItStaffModule />}
        {activeTab === "settings" && <AccountSettingsModule />}
      </main>

      {isMobile && (
        <MobileBottomNav
          primaryTabs={sysadminPrimaryTabs}
          moreTabs={sysadminMoreTabs}
        />
      )}
      <ScrollToTopButton />
    </div>
  );
};

export const SysAdminPortal: React.FC = () => {
  return (
    <div data-surface="sysadmin" data-portal="sysadmin">
      <SysAdminPermissionsProvider>
        <SysAdminPortalContent />
      </SysAdminPermissionsProvider>
    </div>
  );
};

export default SysAdminPortal;

