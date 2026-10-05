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
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { useSysAdminLanguage } from "../../context/SysAdminLanguageContext";
import type { ItAdminUser } from "../../../../types/sysAdmin";

export const ItStaffModule: React.FC = () => {
  const { t } = useSysAdminLanguage();
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
      });

      setModalMessage({ type: "success", text: "IT Administrator provisioned successfully!" });
      setTimeout(() => {
        setIsModalOpen(false);
        setUsername("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setNickname("");
        setEmail("");
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
          <h2 className="text-base font-bold text-white tracking-wide">{t("staffHeaderTitle")}</h2>
          <p className="text-xs text-slate-400">
            {t("staffHeaderSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Provision New Admin</span>
          </button>

          <button
            onClick={fetchAdmins}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1A30] hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-red-400" : "text-slate-400"}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Isolation Notice Banner */}
      <div className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Database Isolation Invariant: </span>
          All System Administrator accounts are securely housed in the dedicated{" "}
          <span className="font-mono text-slate-200">tbl_sys_admin</span> table with dedicated session subjects, completely isolated from operational tables (<span className="font-mono text-slate-400">users</span> and <span className="font-mono text-slate-400">customer_accounts</span>).
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchAdmins} className="underline text-red-400 hover:text-red-300">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-[#0F1A30] border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0B132B] border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Admin Principal</th>
                <th className="py-3 px-4">Contact Email</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Profile Wizard</th>
                <th className="py-3 px-4 text-center">Email Magic Link</th>
                <th className="py-3 px-4 text-right">Last Sign In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-mono text-xs">
                    <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Querying tbl_sys_admin...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    No administrators found
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-950/80 border border-red-800/60 flex items-center justify-center text-xs font-bold text-red-300">
                          {admin.nickname ? admin.nickname[0].toUpperCase() : admin.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span>{admin.name}</span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              @{admin.nickname || admin.username}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">ID: {admin.id} &bull; tbl_sys_admin</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {admin.email || <span className="text-slate-500 font-mono">Not specified</span>}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
                        {admin.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {admin.profileCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending First Login</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {admin.emailVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                          <span>Unverified</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : "Never"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Provision New IT Administrator */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-none">
          <div className="w-full max-w-md rounded-2xl bg-[#0B132B] border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold text-white">Provision IT Administrator</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-mono mb-4 border ${
                  modalMessage.type === "success"
                    ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                    : "bg-red-950/60 border-red-800 text-red-300"
                }`}
              >
                {modalMessage.text}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., it_specialist"
                  className="w-full px-3 py-2 rounded-xl bg-[#0F1A30] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Temporary Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="12+ characters: upper and lower case, a number, a symbol"
                  className="w-full px-3 py-2 rounded-xl bg-[#0F1A30] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  The admin will be challenged with the profile setup wizard upon first sign-in.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    className="w-full px-3 py-2 rounded-xl bg-[#0F1A30] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full px-3 py-2 rounded-xl bg-[#0F1A30] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Preferred Nickname</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g., Alex"
                    className="w-full px-3 py-2 rounded-xl bg-[#0F1A30] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sugo-express.org"
                    className="w-full px-3 py-2 rounded-xl bg-[#0F1A30] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
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
