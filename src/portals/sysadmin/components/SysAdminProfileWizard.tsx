import React, { useState, useEffect } from "react";
import { UserCheck, Mail, Clock, RefreshCw, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { useSysAdminAuth } from "../context/SysAdminAuthContext";

export const SysAdminProfileWizard: React.FC = () => {
  const { pendingAdmin, submitProfileWizard, resendVerificationLink, cancelSetupWizard } = useSysAdminAuth();

  const [step, setStep] = useState<"FORM" | "LINK_SENT">("FORM");
  const [firstName, setFirstName] = useState(pendingAdmin?.firstName || "");
  const [middleName, setMiddleName] = useState(pendingAdmin?.middleName || "");
  const [lastName, setLastName] = useState(pendingAdmin?.lastName || "");
  const [nickname, setNickname] = useState(pendingAdmin?.nickname || "");
  const [email, setEmail] = useState(pendingAdmin?.email || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // 5-minute countdown timer (300 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "LINK_SENT" && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, secondsRemaining]);

  useEffect(() => {
    let cooldownTimer: NodeJS.Timeout;
    if (step === "LINK_SENT" && resendCooldown > 0) {
      cooldownTimer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(cooldownTimer);
  }, [step, resendCooldown]);

  const formatCountdown = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !nickname.trim() || !email.trim()) {
      setErrorMessage("First Name, Last Name, Nickname, and Email are all required.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await submitProfileWizard({
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        nickname: nickname.trim(),
        email: email.trim(),
      });
      setStep("LINK_SENT");
      setSecondsRemaining(300);
      setResendCooldown(30);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Failed to submit profile setup.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendLink = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    try {
      await resendVerificationLink();
      setSecondsRemaining(300);
      setResendCooldown(30);
      setSuccessNotice("A fresh 5-minute verification link has been dispatched to your inbox.");
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Failed to resend verification link.";
      setErrorMessage(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D1B] text-slate-100 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl bg-[#0F1A30] border border-slate-800 rounded-xl shadow-2xl p-6 md:p-8">
        {step === "FORM" ? (
          <>
            <div className="flex items-start justify-between border-b border-slate-800 pb-5 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight">Setup Administrator Profile</h1>
                  <p className="text-xs text-slate-400">
                    Welcome <span className="font-mono text-red-400">sysadminit</span>. Complete your details below.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                Step 1 of 2
              </span>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-lg bg-red-950/50 border border-red-800/60 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="first-name">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Alexander"
                    className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="middle-name">
                    Middle Name <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    id="middle-name"
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="e.g. Vance"
                    className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="last-name">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Wright"
                    className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="nickname">
                    Preferred Nickname <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Astro / RootAdmin"
                    className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Displayed in portal headers and audit trails.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="email-account">
                  Email Address for Verification Link <span className="text-red-400">*</span>
                </label>
                <input
                  id="email-account"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin.it@sugo-express.org"
                  className="w-full px-3 py-2 bg-[#0B132B] border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  A 1-click verification link will be sent here (valid for 5 minutes).
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                <button
                  type="button"
                  onClick={cancelSetupWizard}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel &amp; Sign Out
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-5 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Link</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Step 2: Magic Link Dispatched State */
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 mx-auto flex items-center justify-center mb-5">
              <Mail className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-bold text-white mb-2">Check Your Email</h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed mb-4">
              We sent a 1-click verification link to <span className="font-semibold text-white">{email}</span>. Click the link in your inbox to verify your administrator account.
            </p>

            {successNotice && (
              <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-200 text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{successNotice}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Live 5-minute countdown card */}
            <div className="my-6 p-4 rounded-xl bg-[#0B132B] border border-slate-800/80 inline-flex flex-col items-center">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-red-400" /> Link Validity Window
              </div>
              <div
                className={`text-2xl font-mono font-bold tabular-nums tracking-wider ${
                  secondsRemaining < 60 ? "text-red-400 animate-pulse" : "text-white"
                }`}
              >
                {formatCountdown(secondsRemaining)}
              </div>
              {secondsRemaining === 0 && (
                <div className="text-[11px] text-red-400 mt-1 font-medium">
                  Link expired. Please click resend below.
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleResendLink}
                disabled={resendCooldown > 0 || isResending}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
                {resendCooldown > 0 ? (
                  <span>Resend link in {resendCooldown}s</span>
                ) : (
                  <span>Resend Verification Link</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep("FORM")}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                &larr; Change Email or Edit Information
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
