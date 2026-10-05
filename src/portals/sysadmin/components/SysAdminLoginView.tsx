import React, { useState } from "react";
import { Shield, Lock, User, Terminal, AlertCircle, Eye, EyeOff, ArrowLeft, KeyRound, RefreshCw, CheckCircle2, Globe } from "lucide-react";
import { useSysAdminAuth } from "../context/SysAdminAuthContext";
import { useSysAdminLanguage } from "../context/SysAdminLanguageContext";
import { Link } from "react-router";

export const SysAdminLoginView: React.FC = () => {
  const {
    login,
    isLoading,
    twoFactorRequired,
    twoFactorEmailMasked,
    verify2Fa,
    resend2Fa,
    cancel2Fa,
  } = useSysAdminAuth();
  const { language, setLanguage, t } = useSysAdminLanguage();

  // Primary Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 2FA Verification State
  const [otpCode, setOtpCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState("CapsLock"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg(t("twoFactorMissingCredentials"));
      return;
    }

    setErrorMsg(null);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || (language === "zh" ? "无效的系统管理员鉴权凭证。" : "Invalid administrative credentials.");
      setErrorMsg(msg);
    }
  };

  const handleVerify2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim().replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setErrorMsg(t("twoFactorMissingCode"));
      return;
    }

    setErrorMsg(null);
    setIsVerifying(true);
    try {
      await verify2Fa(cleanCode, trustDevice);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || (language === "zh" ? "安全验证码无效或已过期。" : "Invalid or expired security code.");
      setErrorMsg(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend2Fa = async () => {
    setErrorMsg(null);
    setIsResending(true);
    setResendSuccess(false);
    try {
      await resend2Fa();
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || (language === "zh" ? "重新发送验证码失败，请稍后重试。" : "Failed to resend verification code.");
      setErrorMsg(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh bg-[#070D1B] text-slate-100 flex flex-col justify-between pt-safe pb-safe select-none">
      {/* Top Utility Bar */}
      <header className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold text-sm tracking-wider">
            SG
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
              {t("brandTitle")}
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {t("brandSubtitle")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Top Bar Language Switcher */}
          <div className="flex items-center rounded-lg bg-[#0F1A30] border border-slate-800 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setLanguage("zh")}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
                language === "zh"
                  ? "bg-red-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
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
                  ? "bg-red-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Switch to English"
            >
              English
            </button>
          </div>

          <Link
            to="/"
            className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("staffPortalLink")}
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4">
        {twoFactorRequired ? (
          /* ── 2FA Verification Card ─────────────────────────────────────── */
          <div className="w-full max-w-md bg-[#0F1A30] border border-slate-800 rounded-xl shadow-2xl p-7 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">{t("twoFactorTitle")}</h1>
                <p className="text-xs text-slate-400">{t("twoFactorSubtitle")}</p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-lg bg-red-950/50 border border-red-800/60 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {resendSuccess && (
              <div className="mb-5 p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t("twoFactorResentSuccess")}</span>
              </div>
            )}

            <div className="mb-5 p-3.5 rounded-lg bg-[#0B132B] border border-slate-800 text-xs text-slate-300 leading-relaxed">
              {t("twoFactorEmailSent")}{" "}
              <span className="font-semibold text-white font-mono">{twoFactorEmailMasked || (language === "zh" ? "绑定的管理员邮箱" : "your authorized email")}</span>。
            </div>

            <form onSubmit={handleVerify2Fa} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2 text-center" htmlFor="otp-code">
                  {t("twoFactorCodeLabel")}
                </label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={isVerifying || isLoading}
                  placeholder={t("twoFactorCodePlaceholder")}
                  className="w-full py-3 bg-[#0B132B] border border-slate-700/80 rounded-lg text-2xl text-center text-white placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors font-mono tracking-[10px] font-bold"
                />
              </div>

              {/* Trust Device Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    disabled={isVerifying || isLoading}
                    className="mt-0.5 rounded bg-[#0B132B] border-slate-700 text-red-600 focus:ring-red-500 focus:ring-offset-0 focus:ring-1"
                  />
                  <div>
                    <span className="text-xs font-medium text-slate-200">{t("twoFactorTrustDevice")}</span>
                    <p className="text-[11px] text-slate-400">
                      {language === "zh"
                        ? "在接下来的 30 天内，此受信任浏览器将免除双因素身份质询。"
                        : "Bypass two-factor prompts on this browser for the next 30 days."}
                    </p>
                  </div>
                </label>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isVerifying || isLoading || otpCode.length !== 6}
                className="w-full mt-2 py-2.5 px-4 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t("twoFactorVerifyingButton")}</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>{t("twoFactorVerifyButton")}</span>
                  </>
                )}
              </button>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <button
                  type="button"
                  onClick={handleResend2Fa}
                  disabled={isResending || isVerifying}
                  className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
                  <span>{isResending ? t("twoFactorResendingCode") : t("twoFactorResendCode")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setOtpCode("");
                    cancel2Fa();
                  }}
                  disabled={isVerifying}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  {t("twoFactorCancelButton")}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ── Standard Login Card ───────────────────────────────────────── */
          <div className="w-full max-w-md bg-[#0F1A30] border border-slate-800 rounded-xl shadow-2xl p-7 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">{t("loginCardTitle")}</h1>
                <p className="text-xs text-slate-400">{t("loginCardSubtitle")}</p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-lg bg-red-950/50 border border-red-800/60 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMsg}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="admin-username">
                  {t("usernameLabel")}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="admin-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    placeholder={t("usernamePlaceholder")}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0B132B] border border-slate-700/80 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300" htmlFor="admin-password">
                    {t("passwordLabel")}
                  </label>
                  {capsLockActive && (
                    <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {t("capsLockWarning")}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyDown}
                    disabled={isLoading}
                    placeholder={t("passwordPlaceholder")}
                    className="w-full pl-9 pr-10 py-2.5 bg-[#0B132B] border border-slate-700/80 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t("loginButtonVerifying")}</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>{t("loginButton")}</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t("loginFooterNotice")}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer with Small Bottom Text Language Selector */}
      <footer className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-mono">
        <div>
          {t("copyrightNotice")}
        </div>

        {/* Small text button in bottom screen to select english or chinese screen (default is mandarin chinese) */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Language:</span>
          <button
            type="button"
            onClick={() => setLanguage("zh")}
            className={`transition-colors font-medium flex items-center gap-1 ${
              language === "zh"
                ? "text-red-400 font-bold underline underline-offset-4"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>简体中文 (默认)</span>
          </button>
          <span className="text-slate-700">&bull;</span>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`transition-colors font-medium ${
              language === "en"
                ? "text-red-400 font-bold underline underline-offset-4"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            English
          </button>
        </div>
      </footer>
    </div>
  );
};

