import React, { useState, useEffect, useCallback } from "react";
import {
  UserCog,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Clock,
  Crown,
  UsersRound,
  KeyRound,
  History,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { useSysAdminLanguage } from "../../context/SysAdminLanguageContext";
import { useSysAdminPermissions } from "../../context/SysAdminPermissionsContext";
import { SysAdminPmaConsole, type PmaConsoleSection } from "./SysAdminPmaConsole";
import type { ItAdminUser } from "../../../../types/sysAdmin";

type StaffTab = "directory" | PmaConsoleSection;

export const ItStaffModule: React.FC = () => {
  const { t } = useSysAdminLanguage();
  const { can, isMainSysAdmin, reload: reloadMyPermissions } = useSysAdminPermissions();
  const canManageStaff = can("staff.manage") || isMainSysAdmin;
  const [activeTab, setActiveTab] = useState<StaffTab>("directory");
  const [admins, setAdmins] = useState<ItAdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  // Empty, not a shared default: the old prefilled password was public.
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [stepUpPassword, setStepUpPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const fetchAdmins = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sysAdminApiService.getItAdmins();
      setAdmins(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load IT administrators.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setModalMessage({ type: "error", text: "Username is required." });
      return;
    }
    // The server enforces the full policy; this only stops an empty submit.
    if (!password.trim()) {
      setModalMessage({ type: "error", text: "Set a temporary password for this administrator." });
      return;
    }

    if (!stepUpPassword.trim()) {
      setModalMessage({ type: "error", text: "Enter your current administrator password to authorize provisioning." });
      return;
    }

    setIsSubmitting(true);
    setModalMessage(null);
    try {
      await sysAdminApiService.createItAdmin({
        username: username.trim(),
        password: password.trim() || undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        nickname: nickname.trim() || undefined,
        email: email.trim() || undefined,
        stepUpPassword: stepUpPassword.trim(),
      });

      setModalMessage({
        type: "success",
        text: "IT Administrator provisioned on Read-Only Monitoring baseline.",
      });
      setTimeout(() => {
        setIsModalOpen(false);
        setUsername("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setNickname("");
        setEmail("");
        setStepUpPassword("");
        setModalMessage(null);
        fetchAdmins();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create IT Administrator.";
      setModalMessage({ type: "error", text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink tracking-wide">{t("staffHeaderTitle")}</h2>
          <p className="text-xs text-ink-muted">
            {t("staffHeaderSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canManageStaff && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-signal hover:bg-signal-deep text-xs font-semibold text-white transition-colors min-h-[40px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Provision New Admin</span>
            </button>
          )}

          {activeTab === "directory" && (
            <button
              onClick={fetchAdmins}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-board-plate hover:bg-board-ground border border-edge text-xs font-medium text-ink transition-colors min-h-[40px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-status-act-ink" : "text-ink-muted"}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Main SysAdmin PMA Governance Tabs */}
      {isMainSysAdmin && (
        <div className="flex flex-wrap items-center gap-2 border-b border-edge pb-3" role="tablist" aria-label="IT Staff and PMA Sections">
          {(
            [
              { id: "directory", label: "IT Administrators", icon: UserCog },
              { id: "accounts", label: "Account Permissions", icon: KeyRound },
              { id: "groups", label: "Access Groups", icon: UsersRound },
              { id: "audit", label: "PMA Audit Trail", icon: History },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors min-h-[42px] ${
                  active
                    ? "bg-signal text-white border-signal"
                    : "bg-board-plate text-ink-muted border-edge hover:text-ink"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {isMainSysAdmin && activeTab !== "directory" ? (
        <SysAdminPmaConsole
          section={activeTab}
          onChanged={() => {
            void fetchAdmins();
            void reloadMyPermissions();
          }}
        />
      ) : (
        <>

      {/* Isolation Notice Banner */}
      <div className="p-3.5 rounded-xl bg-board-ground border border-edge text-xs text-ink-muted flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-status-moving-ink shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-ink">Database Isolation Invariant: </span>
          All System Administrator accounts are securely housed in the dedicated{" "}
          <span className="font-mono text-ink">tbl_sys_admin</span> table with dedicated session subjects, completely isolated from operational tables (<span className="font-mono text-ink-muted">users</span> and <span className="font-mono text-ink-muted">customer_accounts</span>).
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="p-4 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-act-ink shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchAdmins} className="underline text-status-act-ink hover:text-status-act-ink">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-board-plate border border-edge overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-board-ground border-b border-edge text-ink-muted font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Admin Principal</th>
                <th className="py-3 px-4">Access Tier</th>
                <th className="py-3 px-4">Contact Email</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Profile Wizard</th>
                <th className="py-3 px-4 text-center">Email Magic Link</th>
                <th className="py-3 px-4 text-right">Last Sign In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-ink-muted font-mono text-xs">
                    <div className="w-6 h-6 border-2 border-status-act-ink/30 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Querying tbl_sys_admin...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-ink-muted">
                    No administrators found
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-board-ground transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-status-act-fill border border-status-act-ink/30 flex items-center justify-center text-xs font-bold text-status-act-ink">
                          {admin.nickname ? admin.nickname[0].toUpperCase() : admin.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-ink flex items-center gap-2">
                            <span>{admin.name}</span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-board-ground text-ink">
                              @{admin.nickname || admin.username}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-ink-muted">ID: {admin.id} &bull; tbl_sys_admin</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {admin.isMainSysAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-status-done-fill text-status-done-ink border border-status-done-ink/30">
                          <Crown className="w-3 h-3" />
                          <span>Main SysAdmin</span>
                        </span>
                      ) : admin.accessGroupName ? (
                        <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-status-moving-fill text-status-moving-ink border border-status-moving-ink/30">
                          {admin.accessGroupName}
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-board-ground text-ink-muted border border-edge">
                          {admin.baselineName || "Read-Only Monitoring (Default)"}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-ink">
                      {admin.email || <span className="text-ink-muted font-mono">Not specified</span>}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-status-done-fill text-status-done-ink border border-status-done-ink/30">
                        {admin.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {admin.profileCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-status-done-ink">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-status-waiting-ink">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending First Login</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {admin.emailVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-status-done-ink">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-ink-muted">
                          <span>Unverified</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-[11px] text-ink-muted whitespace-nowrap">
                      {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : "Never"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Modal: Provision New IT Administrator */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-none">
          <div className="w-full max-w-md rounded-2xl bg-board-ground border border-edge p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-edge mb-4">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-status-act-ink" />
                <h3 className="text-sm font-bold text-ink">Provision IT Administrator</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-ink-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-mono mb-4 border ${
                  modalMessage.type === "success"
                    ? "bg-status-done-fill border-status-done-ink/30 text-status-done-ink"
                    : "bg-status-act-fill border-status-act-ink/30 text-status-act-ink"
                }`}
              >
                {modalMessage.text}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., it_specialist"
                  className="w-full px-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-status-act-ink/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Temporary Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="12+ characters: upper and lower case, a number, a symbol"
                  className="w-full px-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-status-act-ink/30"
                />
                <p className="text-[10px] text-ink-muted mt-0.5">
                  The admin will be challenged with the profile setup wizard upon first sign-in.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    className="w-full px-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-status-act-ink/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full px-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-status-act-ink/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Preferred Nickname</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g., Alex"
                    className="w-full px-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-status-act-ink/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sugo-express.org"
                    className="w-full px-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-status-act-ink/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Your Administrator Password (Step-Up) *
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={stepUpPassword}
                    onChange={(e) => setStepUpPassword(e.target.value)}
                    placeholder="Confirm with your current SysAdmin password..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-board-plate border border-edge text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-status-act-ink/30"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-board-plate border border-edge text-[11px] text-ink-muted">
                New secondary IT Admins start on the Read-Only Monitoring baseline (5 view permissions) until assigned an access group by the Main SysAdmin or Main Owner.
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-board-ground hover:bg-board-ground text-xs font-semibold text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-xl bg-signal hover:bg-signal-deep disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                >
                  {isSubmitting ? "Provisioning..." : "Provision Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
