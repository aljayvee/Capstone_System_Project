import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Eye, EyeOff, ChevronRight,
  Bike, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { UserRole, User as UserType } from "../types/auth";
import { apiService, isLoginChallenge } from "../services/apiService";
import type { LoginSuccessResponse } from "../services/apiService";
import { apiClient } from "../services/apiClient";
const MobileAppNoticeModal = React.lazy(() =>
  import("./MobileAppNoticeModal").then((m) => ({ default: m.MobileAppNoticeModal }))
);
import { ProfileSetupStep } from "./login/ProfileSetupStep";
import { OtpStep } from "./login/OtpStep";
import { LoginAlertBanner, AlertVariant } from "./login/LoginAlertBanner";

// Sign-in is a small state machine, not a single request. An account that has
// not yet proven it owns its email is answered with a challenge instead of a
// token, and has to clear it before a session exists.
//
// All three stages live in this one component on purpose: GuestRoute redirects
// as soon as AuthContext reports an authenticated user, so login() must not be
// called until real tokens are in hand (which rules out navigating to a
// separate /verify route mid-challenge). The challenge token is held in React
// state only, never sessionStorage, so it stays out of reach of XSS and dies on
// refresh (by design: the user simply signs in again).
type Stage = "CREDENTIALS" | "PROFILE_SETUP" | "OTP";

const RESEND_COOLDOWN_MS = 60_000;

interface ActiveAlert {
  variant: AlertVariant;
  title: string;
  message: string;
  cooldownSeconds?: number;
  onCooldownExpire?: () => void;
  actionText?: string;
  onAction?: () => void;
  autoDismissMs?: number;
}

// Shared by the credentials path and the post-OTP path so the two can never
// build a different user object from the same server payload.
function toPortalUser(rawUser: any, fallbackIdentifier: string, token: string): UserType {
  const rawRole = (rawUser.role || "owner").toString().toLowerCase();
  return {
    id: rawUser.id || Date.now(),
    username: rawUser.username || fallbackIdentifier,
    role: rawRole as UserRole,

    name: rawUser.name || rawUser.firstName || fallbackIdentifier,
    email: rawUser.email || `${fallbackIdentifier}@capstone.ph`,
    phone: rawUser.phone || "09170000000",
    avatar: (rawUser.username || fallbackIdentifier).substring(0, 2).toUpperCase(),
    token,
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [mobileAppRoleAlert, setMobileAppRoleAlert] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage>("CREDENTIALS");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [challengeExpiresAt, setChallengeExpiresAt] = useState(0);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Automatically focus the username/email input when the login authentication UI is active
  useEffect(() => {
    if (stage === "CREDENTIALS") {
      usernameInputRef.current?.focus();
    }
  }, [stage]);

  const resetToCredentials = useCallback((message = "") => {
    setStage("CREDENTIALS");
    setChallengeToken(null);
    setMaskedEmail(null);
    setChallengeExpiresAt(0);
    setResendAvailableAt(0);
    setPassword("");
    setIsLoading(false);
    setIsResending(false);
    if (message) {
      setActiveAlert({
        variant: "info",
        title: "Session Reset",
        message,
      });
    } else {
      setActiveAlert(null);
    }
  }, []);

  // Rider and customer accounts have no web portal to enter. Turning them away
  // here (at the challenge, before any code is consumed) beats walking someone
  // through an OTP for a door that will not open.
  const isMobileOnlyRole = (role: string) => role === "rider" || role === "customer";

  const triggerMobileRoleNotice = (role: string) => {
    setIsLoading(false);
    setMobileAppRoleAlert(role);
    setActiveAlert({
      variant: "role_notice",
      title: "Mobile App Access Only",
      message: `You are signed in as a ${role.toUpperCase()}. Dispatch management is restricted to operations staff. Please use the mobile app.`,
      actionText: "View Mobile Apps",
      onAction: () => setMobileAppRoleAlert(role),
    });
  };

  const enterChallenge = (challenge: {
    challengeToken: string;
    maskedEmail?: string | null;
    role: string;
    expiresInSeconds: number;
    profileSetupRequired?: boolean;
    otpRequired?: boolean;
  }) => {
    const role = String(challenge.role || "").toLowerCase();
    if (isMobileOnlyRole(role)) {
      void apiClient.post("/auth/logout").catch(() => {});
      triggerMobileRoleNotice(role);
      return;
    }

    setChallengeToken(challenge.challengeToken);
    setMaskedEmail(challenge.maskedEmail ?? null);
    setChallengeExpiresAt(Date.now() + challenge.expiresInSeconds * 1000);
    setStage(challenge.profileSetupRequired ? "PROFILE_SETUP" : "OTP");
    if (challenge.otpRequired) {
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
    }
    setActiveAlert(null);
    setIsLoading(false);
  };

  const completeSession = (response: LoginSuccessResponse) => {
    const rawUser = response.user as any;
    const rawRole = (rawUser.role || "owner").toString().toLowerCase();

    if (isMobileOnlyRole(rawRole)) {
      void apiClient.post("/auth/logout").catch(() => {});
      triggerMobileRoleNotice(rawRole);
      return;
    }

    login(toPortalUser(rawUser, identifier.trim(), response.token), response.token);
    setIsLoading(false);
    navigate(`/${rawRole}`);
  };

  const handleLogin = async () => {
    const errors: { email?: string; password?: string } = {};

    if (!identifier.trim()) {
      errors.email = "Email or username is required.";
    }
    if (!password.trim()) {
      errors.password = "Password is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setActiveAlert(null);
    setIsLoading(true);

    try {
      const response = await apiService.login(identifier.trim(), password.trim());

      if ("error" in response) {
        setIsLoading(false);

        // Check for rate limit or security cooldown
        if (response.isRateLimit || response.statusCode === 429) {
          setActiveAlert({
            variant: "security_cooldown",
            title: "Security Rate Limit Activated",
            message: response.error || "Too many failed attempts. Access is temporarily paused.",
            cooldownSeconds: response.retryAfterSeconds || 900,
            onCooldownExpire: () => {
              setActiveAlert({
                variant: "info",
                title: "Cooldown Expired",
                message: "You may now try signing in again.",
              });
            },
          });
          return;
        }

        // Standard authentication error
        setPassword("");
        usernameInputRef.current?.focus();
        setActiveAlert({
          variant: "error",
          title: "Invalid Credentials",
          message: response.error || "Unable to connect to authentication server. Please check your credentials.",
          autoDismissMs: 1500,
        });
        return;
      }

      // Must be checked before touching response.user: a challenge response has
      // no user object to read a role off.
      if (isLoginChallenge(response)) {
        enterChallenge(response);
        return;
      }

      completeSession(response);
    } catch (err: any) {
      console.error("Login execution error:", err);
      setIsLoading(false);
      setActiveAlert({
        variant: "error",
        title: "Connection Error",
        message: err.message || "An unexpected error occurred during login.",
        autoDismissMs: 1500,
      });
    }
  };

  const handleProfileSubmit = async (input: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
  }) => {
    if (!challengeToken) return;
    setActiveAlert(null);
    setIsLoading(true);

    const result = await apiService.completeLoginProfile({ challengeToken, ...input });
    if ("error" in result) {
      setActiveAlert({
        variant: "error",
        title: "Profile Error",
        message: result.error,
        autoDismissMs: 1500,
      });
      setIsLoading(false);
      return;
    }
    enterChallenge(result);
    toast.success(`Verification code sent to ${result.maskedEmail || "your email"}.`);
  };

  const handleOtpSubmit = async (code: string) => {
    if (!challengeToken) return;
    setActiveAlert(null);
    setIsLoading(true);

    const result = await apiService.verifyLoginOtp(challengeToken, code);
    if ("error" in result) {
      setActiveAlert({
        variant: "error",
        title: "Verification Failed",
        message: result.error,
        autoDismissMs: 1500,
      });
      setIsLoading(false);
      return;
    }
    completeSession(result);
  };

  const handleResend = async () => {
    if (!challengeToken) return;
    setActiveAlert(null);
    setIsResending(true);

    const result = await apiService.resendLoginOtp(challengeToken);
    setIsResending(false);

    if ("error" in result) {
      setActiveAlert({
        variant: "error",
        title: "Resend Failed",
        message: result.error,
        autoDismissMs: 1500,
      });
      if (result.retryAfterSeconds) {
        setResendAvailableAt(Date.now() + result.retryAfterSeconds * 1000);
      }
      return;
    }

    setChallengeToken(result.challengeToken);
    setMaskedEmail(result.maskedEmail ?? null);
    setChallengeExpiresAt(Date.now() + result.expiresInSeconds * 1000);
    setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
    toast.success(`A new code has been sent to ${result.maskedEmail || "your email"}.`);
  };

  const handleChallengeExpired = useCallback(() => {
    resetToCredentials("Your sign-in session expired. Please sign in again.");
  }, [resetToCredentials]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) handleLogin();
  };

  const headings: Record<Stage, { title: string; description: string }> = {
    CREDENTIALS: { title: "System Portal", description: "Tacurong City Logistics & Fleet Operations" },
    PROFILE_SETUP: { title: "Complete Your Profile", description: "Finish setting up this administrator account" },
    OTP: { title: "Verify Your Email", description: "Enter the 6-digit verification code sent to your email" },
  };

  const isCooldownActive = activeAlert?.variant === "security_cooldown" && (activeAlert.cooldownSeconds ?? 0) > 0;

  return (
    <main
      role="main"
      className="min-h-screen flex flex-col items-center justify-center p-4 relative select-none bg-[#0B132B]"
    >
      {/* Flat Minimalist Console */}
      <div className="relative w-full max-w-md z-10 my-auto">
        <div className="bg-slate-900 rounded-2xl overflow-hidden">
          
          {/* Header Section */}
          <div className="px-6 pt-8 pb-4 text-center">
            {/* Flat Red Brand Badge */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 bg-[#DC2626]"
            >
              <Bike className="text-white" size={24} strokeWidth={2.4} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-800 text-[11px] font-bold text-slate-300 tracking-wider uppercase mb-2">
              SUGO Express
            </div>

            <h1 className="text-white text-2xl font-bold tracking-tight">
              {headings[stage].title}
            </h1>
            <p className="text-slate-400 text-xs font-medium tracking-wide mt-1">
              {headings[stage].description}
            </p>
          </div>

          {/* STAGE 1: CREDENTIALS (Sign In) */}
          {stage === "CREDENTIALS" && (
            <div className="px-6 pb-8 space-y-4">
              
              {/* Alert Banner System */}
              {activeAlert && (
                <LoginAlertBanner
                  variant={activeAlert.variant}
                  title={activeAlert.title}
                  message={activeAlert.message}
                  cooldownSeconds={activeAlert.cooldownSeconds}
                  actionText={activeAlert.actionText}
                  onAction={activeAlert.onAction}
                  onDismiss={() => setActiveAlert(null)}
                  onCooldownExpire={activeAlert.onCooldownExpire}
                  autoDismissMs={activeAlert.autoDismissMs ?? (activeAlert.variant === "error" ? 1500 : undefined)}
                />
              )}

              {/* Email / Username Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                    Email
                  </label>
                  {fieldErrors.email && (
                    <span className="text-rose-400 text-[11px] font-medium">
                      {fieldErrors.email}
                    </span>
                  )}
                </div>
                <input
                  ref={usernameInputRef}
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    if (activeAlert?.variant === "error") setActiveAlert(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter Email or Username"
                  autoComplete="username"
                  autoFocus
                  disabled={isLoading || isCooldownActive}
                  className={`w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors duration-150 text-white placeholder-slate-500 disabled:opacity-60 ${
                    fieldErrors.email
                      ? "border border-rose-500 bg-rose-950/30"
                      : "border border-slate-700 bg-slate-800 focus:border-red-500"
                  }`}
                />
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                    Password
                  </label>
                  {fieldErrors.password && (
                    <span className="text-rose-400 text-[11px] font-medium">
                      {fieldErrors.password}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      if (activeAlert?.variant === "error") setActiveAlert(null);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    disabled={isLoading || isCooldownActive}
                    className={`w-full pl-4 pr-10 py-3 rounded-xl outline-none text-sm transition-colors duration-150 text-white placeholder-slate-500 disabled:opacity-60 ${
                      fieldErrors.password
                        ? "border border-rose-500 bg-rose-950/30"
                        : "border border-slate-700 bg-slate-800 focus:border-red-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit CTA Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoading || isCooldownActive}
                  className="w-full py-3.5 rounded-xl text-white flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-colors disabled:opacity-50 cursor-pointer hover:bg-red-700"
                  style={{
                    background: isCooldownActive ? "#475569" : "#DC2626",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>

              {/* Operational Security Footnote */}
              <div className="pt-2 text-center">
                <p className="text-[11px] text-slate-500 font-medium">
                  Authorized dispatch and administrative personnel only
                </p>
              </div>
            </div>
          )}

          {/* STAGE 2: PROFILE SETUP (First-time Admin Setup) */}
          {stage === "PROFILE_SETUP" && (
            <div className="px-6 pb-8">
              {activeAlert && (
                <div className="mb-4">
                  <LoginAlertBanner
                    variant={activeAlert.variant}
                    title={activeAlert.title}
                    message={activeAlert.message}
                    onDismiss={() => setActiveAlert(null)}
                    autoDismissMs={activeAlert.autoDismissMs ?? (activeAlert.variant === "error" ? 1500 : undefined)}
                  />
                </div>
              )}
              <div className="bg-slate-800 rounded-xl p-4">
                <ProfileSetupStep
                  onSubmit={handleProfileSubmit}
                  onCancel={() => resetToCredentials()}
                  serverError={activeAlert?.message || ""}
                  isSubmitting={isLoading}
                />
              </div>
            </div>
          )}

          {/* STAGE 3: OTP VERIFICATION */}
          {stage === "OTP" && (
            <div className="px-6 pb-8">
              {activeAlert && (
                <div className="mb-4">
                  <LoginAlertBanner
                    variant={activeAlert.variant}
                    title={activeAlert.title}
                    message={activeAlert.message}
                    onDismiss={() => setActiveAlert(null)}
                    autoDismissMs={activeAlert.autoDismissMs ?? (activeAlert.variant === "error" ? 1500 : undefined)}
                  />
                </div>
              )}
              <div className="bg-slate-800 rounded-xl p-4">
                <OtpStep
                  maskedEmail={maskedEmail}
                  expiresAt={challengeExpiresAt}
                  resendAvailableAt={resendAvailableAt}
                  serverError={activeAlert?.message || ""}
                  isSubmitting={isLoading}
                  isResending={isResending}
                  onSubmit={handleOtpSubmit}
                  onResend={handleResend}
                  onExpire={handleChallengeExpired}
                  onCancel={() => resetToCredentials()}
                />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Website Copyright Footer at Bottom Edge */}
      <footer className="w-full pt-6 pb-4 md:absolute md:bottom-4 md:left-0 md:right-0 text-center select-none z-10" role="contentinfo">
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          &copy; {new Date().getFullYear()} Sugo on the Go. All rights reserved.
        </p>
        <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
          Tacurong City Logistics &amp; Fleet Operations
        </p>
      </footer>

      {/* Rider / Customer Mobile Redirection Modal */}
      {mobileAppRoleAlert && (
        <React.Suspense fallback={null}>
          <MobileAppNoticeModal
            isOpen={true}
            roleName={mobileAppRoleAlert}
            onClose={() => setMobileAppRoleAlert(null)}
          />
        </React.Suspense>
      )}
    </main>
  );
}
