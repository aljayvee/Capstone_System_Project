import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import {
  Eye, EyeOff, User, Lock, ChevronRight,
  Bike, AlertCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { UserRole, User as UserType } from "../types/auth";
import { apiService, isLoginChallenge } from "../services/apiService";
import type { LoginSuccessResponse } from "../services/apiService";
import { MobileAppNoticeModal } from "./MobileAppNoticeModal";
import { ProfileSetupStep } from "./login/ProfileSetupStep";
import { OtpStep } from "./login/OtpStep";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";

// Sign-in is a small state machine, not a single request. An account that has
// not yet proven it owns its email is answered with a challenge instead of a
// token, and has to clear it before a session exists.
//
// All three stages live in this one component on purpose: GuestRoute redirects
// as soon as AuthContext reports an authenticated user, so login() must not be
// called until real tokens are in hand — which rules out navigating to a
// separate /verify route mid-challenge. The challenge token is held in React
// state only, never sessionStorage, so it stays out of reach of XSS and dies on
// refresh (by design — the user simply signs in again).
type Stage = "CREDENTIALS" | "PROFILE_SETUP" | "OTP";

const RESEND_COOLDOWN_MS = 60_000;

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
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mobileAppRoleAlert, setMobileAppRoleAlert] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage>("CREDENTIALS");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [challengeExpiresAt, setChallengeExpiresAt] = useState(0);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const resetToCredentials = useCallback((message = "") => {
    setStage("CREDENTIALS");
    setChallengeToken(null);
    setMaskedEmail(null);
    setChallengeExpiresAt(0);
    setResendAvailableAt(0);
    setPassword("");
    setIsLoading(false);
    setIsResending(false);
    setError(message);
  }, []);

  // Rider and customer accounts have no web portal to enter. Turning them away
  // here — at the challenge, before any code is consumed — beats walking someone
  // through an OTP for a door that will not open.
  const isMobileOnlyRole = (role: string) => role === "rider" || role === "customer";

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
      setIsLoading(false);
      setMobileAppRoleAlert(role);
      return;
    }

    setChallengeToken(challenge.challengeToken);
    setMaskedEmail(challenge.maskedEmail ?? null);
    setChallengeExpiresAt(Date.now() + challenge.expiresInSeconds * 1000);
    setStage(challenge.profileSetupRequired ? "PROFILE_SETUP" : "OTP");
    if (challenge.otpRequired) {
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
    }
    setError("");
    setIsLoading(false);
  };

  const completeSession = (response: LoginSuccessResponse) => {
    const rawUser = response.user as any;
    const rawRole = (rawUser.role || "owner").toString().toLowerCase();

    if (isMobileOnlyRole(rawRole)) {
      setIsLoading(false);
      setMobileAppRoleAlert(rawRole);
      return;
    }

    login(toPortalUser(rawUser, identifier.trim(), response.token), response.token);
    setIsLoading(false);
    navigate(`/${rawRole}`);
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your username or email and your password.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await apiService.login(identifier.trim(), password.trim());

      if ("error" in response) {
        setError(response.error || "Unable to connect to authentication server.");
        setIsLoading(false);
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
      setError(err.message || "An unexpected error occurred during login.");
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (input: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
  }) => {
    if (!challengeToken) return;
    setError("");
    setIsLoading(true);

    const result = await apiService.completeLoginProfile({ challengeToken, ...input });
    if ("error" in result) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    enterChallenge(result);
    toast.success(`Verification code sent to ${result.maskedEmail || "your email"}.`);
  };

  const handleOtpSubmit = async (code: string) => {
    if (!challengeToken) return;
    setError("");
    setIsLoading(true);

    const result = await apiService.verifyLoginOtp(challengeToken, code);
    if ("error" in result) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    completeSession(result);
  };

  const handleResend = async () => {
    if (!challengeToken) return;
    setError("");
    setIsResending(true);

    const result = await apiService.resendLoginOtp(challengeToken);
    setIsResending(false);

    if ("error" in result) {
      setError(result.error);
      // The server is the authority on the cooldown; re-sync from it rather
      // than trusting the local clock.
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
    CREDENTIALS: { title: "Sign In", description: "Access your system portal workspace" },
    PROFILE_SETUP: { title: "Complete Your Profile", description: "Finish setting up this administrator account" },
    OTP: { title: "Verify Your Email", description: "Enter the 6-digit code we just sent you" },
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0F1F3D 0%, #1E3A5F 50%, #162D4A 100%)" }}
    >
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "#E53935" }}>
              <Bike className="text-white" size={28} />
            </div>
            <div className="text-left">
              <h1 className="text-white text-2xl font-black tracking-wide">SUGO SYSTEM PORTAL</h1>
              <p className="text-blue-300 text-xs font-semibold tracking-wider">TACURONG CITY LOGISTICS & DISPATCH</p>
            </div>
          </div>
        </div>

        <Card className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border-slate-200">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-slate-800 font-bold text-xl">{headings[stage].title}</CardTitle>
            <CardDescription className="text-slate-500 text-sm">{headings[stage].description}</CardDescription>
          </CardHeader>

          {stage === "CREDENTIALS" && (
            <>
              <CardContent className="space-y-4 pt-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block mb-1.5 text-slate-700 text-sm font-medium">Username or Email</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g. dispatcher or juan@gmail.com"
                      autoComplete="username"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:border-indigo-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5 text-slate-700 text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="w-full pl-10 pr-10 py-3 rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:border-indigo-500 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-2 border-t-0 bg-transparent">
                <button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl text-white flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] font-semibold text-sm transition-all shadow-md disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span> <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </CardFooter>
            </>
          )}

          {stage === "PROFILE_SETUP" && (
            <CardContent className="pt-4 pb-6">
              <ProfileSetupStep
                onSubmit={handleProfileSubmit}
                onCancel={() => resetToCredentials()}
                serverError={error}
                isSubmitting={isLoading}
              />
            </CardContent>
          )}

          {stage === "OTP" && (
            <CardContent className="pt-4 pb-6">
              <OtpStep
                maskedEmail={maskedEmail}
                expiresAt={challengeExpiresAt}
                resendAvailableAt={resendAvailableAt}
                serverError={error}
                isSubmitting={isLoading}
                isResending={isResending}
                onSubmit={handleOtpSubmit}
                onResend={handleResend}
                onExpire={handleChallengeExpired}
                onCancel={() => resetToCredentials()}
              />
            </CardContent>
          )}
        </Card>
      </div>

      <MobileAppNoticeModal
        isOpen={!!mobileAppRoleAlert}
        roleName={mobileAppRoleAlert || ""}
        onClose={() => setMobileAppRoleAlert(null)}
      />
    </div>
  );
}
