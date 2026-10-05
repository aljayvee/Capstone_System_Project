import React, { useState, useEffect } from "react";
import {
  KeyRound,
  Mail,
  User,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Send,
  Sparkles,
  X,
  Laptop,
  Smartphone,
  Trash2,
  Shield,
} from "lucide-react";
import { useSysAdminAuth } from "../../context/SysAdminAuthContext";
import { useSysAdminLanguage } from "../../context/SysAdminLanguageContext";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import type { SysAdminTrustedDevice } from "../../../../types/sysAdmin";

export const AccountSettingsModule: React.FC = () => {
  const { admin, updateCurrentAdmin } = useSysAdminAuth();
  const { t } = useSysAdminLanguage();

  // Form State
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status / Feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 3-Layer Security Gate Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<"credentials" | "otp">("credentials");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // OTP State
  const [otp, setOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // 2FA Policy & Step-Up Modal State
  const [is2FaModalOpen, setIs2FaModalOpen] = useState(false);
  const [stepUpPassword, setStepUpPassword] = useState("");
  const [showStepUpPassword, setShowStepUpPassword] = useState(false);
  const [isUpdating2Fa, setIsUpdating2Fa] = useState(false);
  const [stepUpError, setStepUpError] = useState<string | null>(null);

  // Trusted Devices State
  const [trustedDevices, setTrustedDevices] = useState<SysAdminTrustedDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);
  const [deviceActionMsg, setDeviceActionMsg] = useState<string | null>(null);

  // Fetch trusted devices on mount
  const fetchTrustedDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const res = await sysAdminApiService.getTrustedDevices();
      setTrustedDevices(res.devices || []);
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchTrustedDevices();
  }, []);

  // Initialize fields from active admin
  useEffect(() => {
    if (admin) {
      setUsername(admin.username || "");
      setFirstName(admin.firstName || "");
      setMiddleName(admin.middleName || "");
      setLastName(admin.lastName || "");
      setNickname(admin.nickname || "");
      setEmail(admin.email || "");
    }
  }, [admin]);

  // Determine what has changed
  const getChangedPayload = () => {
    const changes: {
      username?: string;
      firstName?: string;
      lastName?: string;
      middleName?: string;
      nickname?: string;
      email?: string;
      password?: string;
    } = {};

    if (username.trim() && username.trim() !== admin?.username) {
      changes.username = username.trim();
    }
    if (firstName.trim() && firstName.trim() !== (admin?.firstName || "")) {
      changes.firstName = firstName.trim();
    }
    if (lastName.trim() && lastName.trim() !== (admin?.lastName || "")) {
      changes.lastName = lastName.trim();
    }
    if (middleName.trim() !== (admin?.middleName || "")) {
      changes.middleName = middleName.trim();
    }
    if (nickname.trim() && nickname.trim() !== admin?.nickname) {
      changes.nickname = nickname.trim();
    }
    if (email.trim() && email.trim() !== admin?.email) {
      changes.email = email.trim();
    }
    if (newPassword) {
      changes.password = newPassword;
    }

    return changes;
  };

  const handleOpenSecurityGate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Validate passwords if changing (minimum 12 characters and complexity)
    if (newPassword) {
      if (newPassword.length < 12) {
        setFormError("New password must be at least 12 characters long.");
        return;
      }
      if (
        !/[A-Z]/.test(newPassword) ||
        !/[a-z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword) ||
        !/[^A-Za-z0-9]/.test(newPassword)
      ) {
        setFormError("Password must include uppercase, lowercase, number, and special character.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setFormError("New password and confirmation do not match.");
        return;
      }
    }

    // Validate email format if changed
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("Please provide a valid email address.");
      return;
    }

    const changes = getChangedPayload();
    if (Object.keys(changes).length === 0) {
      setFormError("No changes detected in your profile fields.");
      return;
    }

    // Reset modal state and open
    setCurrentPassword("");
    setConfirmText("");
    setOtp("");
    setModalError(null);
    setModalStep("credentials");
    setIsModalOpen(true);
  };

  // Step 1: Validate current password & confirmation text, then request OTP
  const handleProceedToOtp = async () => {
    setModalError(null);

    if (!currentPassword) {
      setModalError("Please enter your current IT Admin password.");
      return;
    }

    if (confirmText.trim() !== "CONFIRM") {
      setModalError("You must type CONFIRM in all capital letters to continue.");
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await sysAdminApiService.requestProfileOtp();
      setOtpSentTo(res.email);
      setModalStep("otp");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send email verification code.";
      setModalError(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Verify OTP and apply changes
  const handleVerifyOtpAndSave = async () => {
    setModalError(null);

    if (!otp || otp.trim().length !== 6) {
      setModalError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    setIsSubmittingUpdate(true);
    try {
      // 1. Verify OTP to get authorization change token
      const { changeToken } = await sysAdminApiService.verifyProfileOtp(otp.trim());

      // 2. Submit changes with changeToken & currentPassword
      const changes = getChangedPayload();
      const res = await sysAdminApiService.updateProfile({
        changeToken,
        currentPassword,
        ...changes,
      });

      // 3. Update context state
      updateCurrentAdmin(res.admin);

      // 4. Reset passwords and close modal
      setNewPassword("");
      setConfirmPassword("");
      setIsModalOpen(false);
      setSuccessMessage("Your IT Administrator profile was successfully updated!");
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to verify code or update profile.";
      setModalError(msg);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleResendOtp = async () => {
    setModalError(null);
    setIsSendingOtp(true);
    try {
      const res = await sysAdminApiService.requestProfileOtp();
      setOtpSentTo(res.email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend code.";
      setModalError(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    setRevokingDeviceId(deviceId);
    setDeviceActionMsg(null);
    try {
      await sysAdminApiService.revokeTrustedDevice(deviceId);
      setTrustedDevices((prev) => prev.filter((d) => d.id !== deviceId));
      setDeviceActionMsg("Trusted device revoked successfully. Next login will require 2FA.");
      setTimeout(() => setDeviceActionMsg(null), 5000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Failed to revoke device.";
      setFormError(msg);
    } finally {
      setRevokingDeviceId(null);
    }
  };

  const handleConfirmToggle2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepUpPassword) {
      setStepUpError("Please enter your current administrator password.");
      return;
    }
    setIsUpdating2Fa(true);
    setStepUpError(null);
    try {
      const targetEnforce = !admin?.enforceTwoFactor;
      const res = await sysAdminApiService.toggle2FaPolicy(targetEnforce, stepUpPassword);
      if (admin) {
        updateCurrentAdmin({
          ...admin,
          enforceTwoFactor: res.enforceTwoFactor,
        });
      }
      setIs2FaModalOpen(false);
      setStepUpPassword("");
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Failed to update 2FA policy.";
      setStepUpError(msg);
    } finally {
      setIsUpdating2Fa(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">
            {t("settingsHeaderTitle")}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t("settingsHeaderSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-lg bg-red-950/60 border border-red-800/60 text-red-400 font-semibold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            3-Layer Security Gated
          </span>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center gap-3 text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {formError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center gap-3 text-rose-300 text-xs font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{formError}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleOpenSecurityGate} className="space-y-6">
        {/* Section: Account & Authentication */}
        <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-slate-800/80 pb-3">
            <KeyRound className="w-4 h-4 text-red-400" />
            <span>IT Account Credentials</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Admin Username <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#0B132B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Used to log in to the /sysadmin console.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#0B132B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Receives magic links and security authorization OTPs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                New Password (Optional)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-3 py-2 pr-9 rounded-xl bg-[#0B132B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Min 12 characters (uppercase, lowercase, number, symbol). Cannot reuse last 3 passwords.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  disabled={!newPassword}
                  className="w-full px-3 py-2 pr-9 rounded-xl bg-[#0B132B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 font-mono disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={!newPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 disabled:opacity-50"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Personal Identity */}
        <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-slate-800/80 pb-3">
            <User className="w-4 h-4 text-sky-400" />
            <span>Administrator Identity &amp; Display Name</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#0B132B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Middle Name (Optional)
              </label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B132B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#0B132B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Preferred Nickname <span className="text-red-400">*</span>
            </label>
            <div className="max-w-xs">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#0B132B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Displayed in the header bar as @{nickname || "nickname"}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white flex items-center gap-2 transition-colors shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Proceed to 3-Layer Verification</span>
          </button>
        </div>
      </form>

      {/* ─────────────────────────────────────────────────────────────────────────────
          Two-Factor Authentication & Trusted Workstations Governance
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: 2FA Enforcement Policy */}
        <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Two-Factor Authentication Policy</span>
              </div>
              <span
                className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-semibold border ${
                  admin?.enforceTwoFactor
                    ? "bg-emerald-950/70 border-emerald-800 text-emerald-300"
                    : "bg-sky-950/70 border-sky-800 text-sky-300"
                }`}
              >
                {admin?.enforceTwoFactor ? "Enforced on Every Login" : "Adaptive Mode"}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {admin?.enforceTwoFactor
                ? "Two-factor authentication is currently ENFORCED on every single login attempt. Even recognized browsers with trusted device cookies will be prompted for an email OTP."
                : "Adaptive security is ACTIVE. The system monitors client IPs and browser signatures. Logins from unrecognized devices or IPs require a 6-digit OTP verification."}
            </p>

            <div className="p-3 rounded-lg bg-[#0B132B] border border-slate-800/80 text-[11px] text-slate-400 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Adaptive Challenge:</span>
                <span className="text-emerald-400 font-semibold">Enabled (Unrecognized IP/Device)</span>
              </div>
              <div className="flex justify-between">
                <span>Trusted Device Window:</span>
                <span className="text-slate-300 font-semibold">30 Days (Rolling)</span>
              </div>
              <div className="flex justify-between">
                <span>Lockout Defense:</span>
                <span className="text-amber-400 font-semibold">5 Attempts / 15 Min Lockout</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Step-up authentication required</span>
            <button
              type="button"
              onClick={() => {
                setStepUpPassword("");
                setStepUpError(null);
                setIs2FaModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700"
            >
              <KeyRound className="w-3.5 h-3.5 text-red-400" />
              <span>{admin?.enforceTwoFactor ? "Switch to Adaptive 2FA" : "Enforce on Every Login"}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Authorized Trusted Devices */}
        <div className="p-5 rounded-xl bg-[#0F1A30] border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Laptop className="w-4 h-4 text-sky-400" />
                <span>Authorized Trusted Devices ({trustedDevices.length})</span>
              </div>
              <button
                type="button"
                onClick={fetchTrustedDevices}
                disabled={isLoadingDevices}
                className="text-slate-400 hover:text-white p-1"
                title="Refresh Devices"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDevices ? "animate-spin" : ""}`} />
              </button>
            </div>

            {deviceActionMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{deviceActionMsg}</span>
              </div>
            )}

            {trustedDevices.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No active trusted devices recorded.</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  When you sign in and check &quot;Trust this device for 30 days&quot;, your browser signature will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {trustedDevices.map((device) => (
                  <div
                    key={device.id}
                    className="p-3 rounded-lg bg-[#0B132B] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate text-xs">
                          {device.deviceInfo || "Authorized Browser Workstation"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                        <span>IP: {device.ipAddress}</span>
                        <span>&bull;</span>
                        <span>Expires: {new Date(device.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevokeDevice(device.id)}
                      disabled={revokingDeviceId === device.id}
                      className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-xs transition-colors shrink-0 disabled:opacity-50"
                      title="Revoke Device"
                    >
                      {revokingDeviceId === device.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>Revoking removes the 30-day token.</span>
            <span>Next login triggers 2FA</span>
          </div>
        </div>
      </div>


      {/* ─────────────────────────────────────────────────────────────────────────────
          3-Layer Security Gate Modal
      ───────────────────────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0F1A30] border border-slate-700/80 shadow-2xl p-6 space-y-5 text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold tracking-wide">
                  IT Security Gate Authorization
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Indicator */}
            <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-800/80 pb-3">
              <div
                className={`flex items-center gap-1.5 ${
                  modalStep === "credentials" ? "text-red-400 font-bold" : "text-slate-400"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Password &amp; CONFIRM</span>
              </div>
              <span className="text-slate-600">&rarr;</span>
              <div
                className={`flex items-center gap-1.5 ${
                  modalStep === "otp" ? "text-red-400 font-bold" : "text-slate-500"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Email OTP Code</span>
              </div>
            </div>

            {/* Modal Error */}
            {modalError && (
              <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-xs text-rose-300 flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Step 1: Credentials & Type CONFIRM */}
            {modalStep === "credentials" && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-300">
                  To protect administrative credentials, please enter your current IT Admin password and type the confirmation phrase.
                </p>

                {/* Layer 1: Current Password */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Layer 1: Current IT Admin Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      autoFocus
                      className="w-full px-3 py-2 pr-9 rounded-xl bg-[#0B132B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Layer 2: Type CONFIRM */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Layer 2: Type <span className="font-mono text-red-400 font-bold">CONFIRM</span> to Continue <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type CONFIRM exactly"
                    className="w-full px-3 py-2 rounded-xl bg-[#0B132B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 font-mono uppercase tracking-wider"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Case sensitive: must match <span className="font-mono text-slate-400">CONFIRM</span>.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleProceedToOtp}
                    disabled={isSendingOtp || !currentPassword || confirmText !== "CONFIRM"}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2"
                  >
                    {isSendingOtp ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Email OTP Code &rarr;</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Email OTP Code */}
            {modalStep === "otp" && (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/60 text-sky-300">
                  <p className="font-medium">Layer 3: Email Verification Code Sent</p>
                  <p className="text-[11px] text-sky-400/80 mt-0.5">
                    We sent a 6-digit one-time code to <strong>{otpSentTo || admin?.email}</strong>.
                    Code expires in 10 minutes.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Enter 6-Digit Verification Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    autoFocus
                    className="w-full px-3 py-3 rounded-xl bg-[#0B132B] border border-slate-800 text-center text-xl font-bold tracking-[10px] text-white placeholder-slate-600 focus:outline-none focus:border-red-500/60 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Didn't receive code?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isSendingOtp}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50 underline font-mono"
                  >
                    {isSendingOtp ? "Resending..." : "Resend OTP Code"}
                  </button>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalStep("credentials")}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    &larr; Back
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyOtpAndSave}
                    disabled={isSubmittingUpdate || otp.length !== 6}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2"
                  >
                    {isSubmittingUpdate ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying &amp; Applying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verify &amp; Apply Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          Step-Up Password Modal (for 2FA Policy Toggle)
      ───────────────────────────────────────────────────────────────────────────── */}
      {is2FaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0F1A30] border border-slate-700/80 shadow-2xl p-6 space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold tracking-wide">
                  Step-Up Authentication Required
                </h3>
              </div>
              <button
                onClick={() => {
                  setIs2FaModalOpen(false);
                  setStepUpPassword("");
                  setStepUpError(null);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {stepUpError && (
              <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-xs text-rose-300 flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{stepUpError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmToggle2Fa} className="space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                You are about to modify the Administrative Two-Factor Authentication policy to:{" "}
                <strong className="text-white font-mono">
                  {admin?.enforceTwoFactor ? "Adaptive 2FA Mode" : "Enforce on Every Login"}
                </strong>
                . Please enter your administrator password to authorize this change.
              </p>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Administrator Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showStepUpPassword ? "text" : "password"}
                    value={stepUpPassword}
                    onChange={(e) => setStepUpPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoFocus
                    required
                    className="w-full px-3 py-2 pr-9 rounded-xl bg-[#0B132B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStepUpPassword(!showStepUpPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showStepUpPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIs2FaModalOpen(false);
                    setStepUpPassword("");
                    setStepUpError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isUpdating2Fa || !stepUpPassword}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2"
                >
                  {isUpdating2Fa ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying &amp; Applying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Confirm Policy Change</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
