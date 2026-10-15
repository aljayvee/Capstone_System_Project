import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Eye, EyeOff, ChevronRight, Check,
  Loader2, ShieldAlert, Laptop, Globe, Clock, Lock, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { UserRole, User as UserType } from "../types/auth";
import { apiService, isLoginChallenge, isAnotherDeviceActive } from "../services/apiService";
import type { LoginSuccessResponse, LoginChallengeResponse, LoginErrorResponse } from "../services/apiService";
import { apiClient } from "../services/apiClient";
import { io, Socket } from "socket.io-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { lazyWithRetry } from "../utils/lazyWithRetry";
const MobileAppNoticeModal = lazyWithRetry(() =>
  import("./MobileAppNoticeModal").then((m) => ({ default: m.MobileAppNoticeModal }))
);
import { ProfileSetupStep } from "./login/ProfileSetupStep";
import { OtpStep } from "./login/OtpStep";
import { ForgotPasswordFlow } from "./login/ForgotPasswordFlow";
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
// FORGOT_PASSWORD hands the whole card to ForgotPasswordFlow, which runs its
// own steps and only reports back when the password has changed.
type Stage = "CREDENTIALS" | "PROFILE_SETUP" | "OTP" | "FORGOT_PASSWORD";

const RESEND_COOLDOWN_MS = 60_000;

// "Remember me" keeps only the email or username exactly as the user typed it:
// never the password, never a token. Every read and write tolerates storage
// being unavailable (blocked site data, some private modes), in which case the
// box simply forgets and sign-in carries on as normal.
const REMEMBERED_IDENTIFIER_KEY = "sugo_staff_login_remembered_identifier";

function readRememberedIdentifier(): string {
  try {
    return localStorage.getItem(REMEMBERED_IDENTIFIER_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeRememberedIdentifier(value: string | null): void {
  try {
    if (value) {
      localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, value);
    } else {
      localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
    }
  } catch {
    // Storage blocked: nothing is kept, which is the safe outcome.
  }
}

// When the API's sign-in limit stops this browser, the pause is kept here so a
// reload does not bring back a form the API would only refuse again. It holds
// the end time and which limit it was, nothing about the account. Shared by
// every tab, like the device id the API counts against.
const SIGN_IN_PAUSE_KEY = "sugo_staff_login_paused_until";
// The API's window is 15 minutes; anything stored further out than this is a
// corrupt or hand-edited value, not a pause, and is ignored.
const MAX_SIGN_IN_PAUSE_MS = 60 * 60 * 1000;
const DEFAULT_PAUSE_SECONDS = 15 * 60;
const FEW_ATTEMPTS_LEFT = 3;

interface SignInPause {
  until: number;
  scope: "device" | "network" | null;
  // Set when the pause began with a wrong password that used the last attempt,
  // rather than with a request the API refused outright. Not kept on reload.
  lastAttemptUsed?: boolean;
}

function readSignInPause(): SignInPause | null {
  try {
    const raw = localStorage.getItem(SIGN_IN_PAUSE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    const until = Number(stored?.until);
    const left = until - Date.now();
    if (!Number.isFinite(until) || left <= 0 || left > MAX_SIGN_IN_PAUSE_MS) return null;
    const scope = stored.scope === "device" || stored.scope === "network" ? stored.scope : null;
    return { until, scope };
  } catch {
    return null;
  }
}

function writeSignInPause(pause: SignInPause | null): void {
  try {
    if (pause) {
      localStorage.setItem(SIGN_IN_PAUSE_KEY, JSON.stringify({ until: pause.until, scope: pause.scope }));
    } else {
      localStorage.removeItem(SIGN_IN_PAUSE_KEY);
    }
  } catch {
    // Storage blocked: the pause lasts until a reload, and the API still enforces it.
  }
}

// Rounded up to the minute, so the form never opens later than it says.
function formatPauseEnd(until: number): string {
  return new Date(Math.ceil(until / 60_000) * 60_000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function signInPauseMessage(pause: SignInPause): string {
  const why = pause.lastAttemptUsed
    ? "That password was not accepted, and it was the last attempt allowed for now."
    : pause.scope === "network"
      ? "Too many sign-ins from your network have failed. This limit covers everyone on the same connection."
      : pause.scope === "device"
        ? "Too many sign-ins from this browser have failed."
        : "Too many sign-in attempts have failed.";
  return `${why} For security, sign-in is paused until ${formatPauseEnd(pause.until)}. If you have forgotten your password, you can reset it now.`;
}

interface ActiveAlert {
  variant: AlertVariant;
  title: string;
  message: string;
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
  // Read once on mount: prefills the field and ticks the box when a previous
  // sign-in asked to be remembered.
  const [rememberedIdentifier] = useState(readRememberedIdentifier);
  const [identifier, setIdentifier] = useState(rememberedIdentifier);
  const [rememberMe, setRememberMe] = useState(rememberedIdentifier !== "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [mobileAppRoleAlert, setMobileAppRoleAlert] = useState<string | null>(null);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [signInPause, setSignInPause] = useState<SignInPause | null>(readSignInPause);
  // Failed sign-ins this browser has left before the API pauses it, as the API
  // reported on the last refusal (null when unknown).
  const [attemptsLeft, setAttemptsLeft] = useState<{ count: number; scope: SignInPause["scope"] } | null>(null);
  const isCooldownActive = signInPause !== null;

  const [stage, setStage] = useState<Stage>("CREDENTIALS");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [challengeExpiresAt, setChallengeExpiresAt] = useState(0);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [takeoverNotice, setTakeoverNotice] = useState<{
    ipAddress: string;
    deviceInfo: string;
    lastUsedAt: string;
    createdAt: string;
  } | null>(null);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  // A failed sign-in wants the cursor back in the username field, but at that
  // moment the field is still disabled from the request, and the browser drops
  // focus() on a disabled input. So the request is noted here and carried out
  // once loading ends and the field is enabled again.
  const refocusUsernameRef = useRef(false);

  // 500 Server Error [nginx] Outage Simulation State
  const [isServerErrorOverlayActive, setIsServerErrorOverlayActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sugo_simulate_500_error") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let isMounted = true;

    const checkServerError = async () => {
      try {
        const res = await apiClient.get<{ active: boolean }>("/system/server-error-status", {
          timeout: 4000,
        });
        if (isMounted && typeof res.data?.active === "boolean") {
          setIsServerErrorOverlayActive(res.data.active);
          localStorage.setItem("sugo_simulate_500_error", res.data.active ? "true" : "false");
        }
      } catch {
        // Fail silently; fallback to cached state
      }
    };

    checkServerError();
    const pollInterval = setInterval(checkServerError, 5000);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sugo_simulate_500_error") {
        setIsServerErrorOverlayActive(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorageChange);

    const handleCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<{ active: boolean }>;
      if (custom.detail && typeof custom.detail.active === "boolean") {
        setIsServerErrorOverlayActive(custom.detail.active);
      }
    };
    window.addEventListener("sugo:server-error-update", handleCustomEvent as EventListener);

    let socket: Socket | null = null;
    try {
      const backendUrl = (import.meta as any).env?.VITE_API_URL
        ? (import.meta as any).env.VITE_API_URL.replace(/\/api\/?$/, "")
        : "http://localhost:5000";

      socket = io(backendUrl, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socket.on("system:server_error_update", (payload: { active: boolean }) => {
        if (!isMounted) return;
        if (payload && typeof payload.active === "boolean") {
          setIsServerErrorOverlayActive(payload.active);
          localStorage.setItem("sugo_simulate_500_error", payload.active ? "true" : "false");
        }
      });
    } catch {
      // Polling fallback active
    }

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("sugo:server-error-update", handleCustomEvent as EventListener);
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Automatically focus the username/email input when the login authentication UI is active.
  // An identifier already filled in (remembered, or carried back from another
  // step) leaves the password as what is left to type. Read through a ref so
  // typing in the field does not re-run this and yank the cursor away.
  const identifierRef = useRef(identifier);
  identifierRef.current = identifier;
  useEffect(() => {
    if (stage === "CREDENTIALS" && !isServerErrorOverlayActive) {
      (identifierRef.current.trim() ? passwordInputRef : usernameInputRef).current?.focus();
    }
  }, [stage, isServerErrorOverlayActive]);

  useEffect(() => {
    if (!isLoading && refocusUsernameRef.current) {
      refocusUsernameRef.current = false;
      usernameInputRef.current?.focus();
    }
  }, [isLoading]);

  // A pause disables every field, and the browser drops focus from a disabled
  // one, so focus goes to the banner that explains it. When the pause ends,
  // it comes back to the field still to fill in.
  const pauseBannerRef = useRef<HTMLDivElement>(null);
  const wasPausedRef = useRef(isCooldownActive);
  useEffect(() => {
    if (stage === "CREDENTIALS") {
      if (isCooldownActive) {
        pauseBannerRef.current?.focus();
      } else if (wasPausedRef.current) {
        (identifierRef.current.trim() ? passwordInputRef : usernameInputRef).current?.focus();
      }
    }
    wasPausedRef.current = isCooldownActive;
  }, [isCooldownActive, stage]);

  // Another tab of this browser hitting the limit pauses this one too.
  useEffect(() => {
    const handlePauseStorage = (e: StorageEvent) => {
      if (e.key === SIGN_IN_PAUSE_KEY) setSignInPause(readSignInPause());
    };
    window.addEventListener("storage", handlePauseStorage);
    return () => window.removeEventListener("storage", handlePauseStorage);
  }, []);

  useEffect(() => {
    if (isServerErrorOverlayActive) {
      const prevTitle = document.title;
      document.title = "500 Internal Server Error";
      return () => {
        document.title = prevTitle;
      };
    }
  }, [isServerErrorOverlayActive]);

  const resetToCredentials = useCallback((message = "") => {
    setStage("CREDENTIALS");
    setChallengeToken(null);
    setMaskedEmail(null);
    setMaskedPhone(null);
    setPhone(null);
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

  const enterChallenge = (challenge: LoginChallengeResponse) => {
    const role = String(challenge.role || "").toLowerCase();
    if (isMobileOnlyRole(role)) {
      void apiClient.post("/auth/logout").catch(() => {});
      triggerMobileRoleNotice(role);
      return;
    }

    setChallengeToken(challenge.challengeToken);
    setMaskedEmail(challenge.maskedEmail ?? null);
    setMaskedPhone(challenge.maskedPhone ?? null);
    setPhone(challenge.phone ?? null);
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

    // Only here, once a portal session really exists. Every success path (plain
    // sign-in, takeover, OTP, SMS) ends in this function, and every failure or
    // challenge leaves before it, so a wrong password never touches what is kept.
    writeRememberedIdentifier(rememberMe ? identifier.trim() : null);

    login(
      toPortalUser(rawUser, identifier.trim(), response.token),
      response.token,
      (response as any).refreshToken
    );
    setIsLoading(false);
    navigate(`/${rawRole}`);
  };

  // The API stops a sign-in for the rest of its window in two ways: a request
  // it refuses outright (429), or a wrong password that used the last attempt
  // (nothing left, so the next try would be that 429). Both pause the form
  // until the window resets. Returns false for any other refusal.
  const pauseIfLimited = (response: LoginErrorResponse): boolean => {
    const isLimited = response.isRateLimit || response.statusCode === 429;
    const lastAttemptUsed = !isLimited && response.attemptsRemaining === 0;
    if (!isLimited && !lastAttemptUsed) return false;

    const seconds = response.retryAfterSeconds || DEFAULT_PAUSE_SECONDS;
    const pause: SignInPause = {
      until: Date.now() + seconds * 1000,
      scope: response.limitScope ?? null,
      lastAttemptUsed,
    };
    writeSignInPause(pause);
    setSignInPause(pause);
    setAttemptsLeft(null);
    setActiveAlert(null);
    setPassword("");
    return true;
  };

  const handlePauseExpired = () => {
    writeSignInPause(null);
    setSignInPause(null);
    setActiveAlert({
      variant: "info",
      title: "You can sign in again",
      message: "Sign-in is no longer paused. If you are not sure of the password, reset it rather than guessing.",
    });
  };

  // Called on every refused password: from a few attempts out, the form says
  // how many are left, so the pause never comes as a surprise.
  const noteAttemptsLeft = (response: LoginErrorResponse) => {
    setAttemptsLeft(
      response.attemptsRemaining === undefined
        ? null
        : { count: response.attemptsRemaining, scope: response.limitScope ?? null }
    );
  };

  const handleLogin = async () => {
    if (isCooldownActive) return;
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
        if (pauseIfLimited(response)) return;

        // Standard authentication error
        noteAttemptsLeft(response);
        setPassword("");
        refocusUsernameRef.current = true;
        setActiveAlert({
          variant: "error",
          title: "Invalid Credentials",
          message: response.error || "Unable to connect to authentication server. Please check your credentials.",
        });
        return;
      }

      // Check if this staff account is already actively signed in on another device
      if (isAnotherDeviceActive(response)) {
        setIsLoading(false);
        setTakeoverNotice(response.existingSession);
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
      setIsLoading(false);
      setActiveAlert({
        variant: "error",
        title: "Connection Error",
        message: err.message || "An unexpected error occurred during login.",
      });
    }
  };

  const handleConfirmTakeover = async () => {
    setTakeoverNotice(null);
    setIsLoading(true);
    try {
      const response = await apiService.login(identifier.trim(), password.trim(), true);
      if ("error" in response) {
        setIsLoading(false);
        if (pauseIfLimited(response)) return;
        noteAttemptsLeft(response);
        setActiveAlert({
          variant: "error",
          title: "Sign In Failed",
          message: response.error || "Unable to complete session takeover.",
        });
        return;
      }
      if (isAnotherDeviceActive(response)) {
        setIsLoading(false);
        setTakeoverNotice(response.existingSession);
        return;
      }
      if (isLoginChallenge(response)) {
        enterChallenge(response);
        return;
      }
      completeSession(response);
    } catch (err: any) {
      setIsLoading(false);
      setActiveAlert({
        variant: "error",
        title: "Connection Error",
        message: err.message || "Unable to complete takeover.",
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
      });
      setIsLoading(false);
      return;
    }
    completeSession(result);
  };

  const handleFirebasePhoneSubmit = async (firebaseIdToken: string) => {
    if (!challengeToken) return;
    setActiveAlert(null);
    setIsLoading(true);

    const result = await apiService.verifyLoginOtp(challengeToken, undefined, firebaseIdToken);
    if ("error" in result) {
      setActiveAlert({
        variant: "error",
        title: "SMS Verification Failed",
        message: result.error,
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
      });
      if (result.retryAfterSeconds) {
        setResendAvailableAt(Date.now() + result.retryAfterSeconds * 1000);
      }
      return;
    }

    setChallengeToken(result.challengeToken);
    setMaskedEmail(result.maskedEmail ?? null);
    setMaskedPhone(result.maskedPhone ?? null);
    setPhone(result.phone ?? null);
    setChallengeExpiresAt(Date.now() + result.expiresInSeconds * 1000);
    setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
    toast.success(`A new code has been sent to ${result.maskedEmail || "your email"}.`);
  };

  const handleChallengeExpired = useCallback(() => {
    resetToCredentials("Your sign-in session expired. Please sign in again.");
  }, [resetToCredentials]);

  const openForgotPassword = () => {
    setPassword("");
    setFieldErrors({});
    setActiveAlert(null);
    setStage("FORGOT_PASSWORD");
  };

  // The flow only searches by email or mobile number, so a username typed here
  // is not carried over.
  const forgotPasswordPrefill = /@|^[\d\s()+-]{10,}$/.test(identifier.trim()) ? identifier.trim() : "";

  const handlePasswordResetComplete = (email: string | null) => {
    if (email) setIdentifier(email);
    setPassword("");
    setStage("CREDENTIALS");
    setActiveAlert({
      variant: "success",
      title: "Password reset",
      message:
        "Your password was changed and every device was signed out. Sign in with your new password.",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) handleLogin();
  };

  const headings: Record<Stage, { title: string; description: string }> = {
    CREDENTIALS: { title: "Sugo On the Go Portal", description: "Tacurong City Logistics & Fleet Management" },
    PROFILE_SETUP: { title: "Complete Your Profile", description: "Finish setting up this administrator account" },
    OTP: { title: "Two-Factor Authentication", description: "Verify your identity using Email (Gmail) or SMS OTP" },
    FORGOT_PASSWORD: { title: "Reset Your Password", description: "Sugo On the Go Portal" },
  };

  if (isServerErrorOverlayActive) {
    return (
      <div
        data-testid="server-error-500-overlay"
        className="fixed inset-0 z-[99999] bg-white text-black font-serif select-none overflow-auto"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        <div className="w-full pt-4">
          <h1 className="text-center text-2xl sm:text-3xl font-bold my-3 text-black">
            500 Internal Server Error
          </h1>
          <hr className="w-full border-t border-slate-300 my-2" />
          <div className="text-center text-sm sm:text-base text-black mt-2">
            nginx
          </div>
        </div>
      </div>
    );
  }

  const showAttemptsWarning =
    !isCooldownActive && attemptsLeft !== null && attemptsLeft.count > 0 && attemptsLeft.count <= FEW_ATTEMPTS_LEFT;

  return (
    <main
      role="main"
      className="min-h-screen min-h-dvh flex flex-col items-center justify-center p-4 pt-safe pb-safe relative select-none bg-[#0B132B]"
    >
      {/* Flat Minimalist Form */}
      <div className="relative w-full max-w-md z-10 my-auto selection:bg-red-950 selection:text-white">
        {/* Header Section */}
        <div className="pb-6 text-center pt-2">
          <h1 className="text-white text-2xl sm:text-3xl font-bold tracking-tight">
            {headings[stage].title}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium tracking-wide mt-1.5">
            {headings[stage].description}
          </p>
        </div>

        {/* STAGE 1: CREDENTIALS (Sign In) */}
        {stage === "CREDENTIALS" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            
            {/* Alert Banner System. During a pause only a password-reset
                success shows beside it, so the person who just reset knows
                both that it worked and when they can use it. */}
            {activeAlert && (!isCooldownActive || activeAlert.variant === "success") && (
              <LoginAlertBanner
                variant={activeAlert.variant}
                title={activeAlert.title}
                message={activeAlert.message}
                actionText={activeAlert.actionText}
                onAction={activeAlert.onAction}
                onDismiss={() => setActiveAlert(null)}
                autoDismissMs={activeAlert.autoDismissMs}
              />
            )}

            {/* No dismiss button: closing it used to re-enable a form the
                API would only refuse again. It ends by itself. */}
            {signInPause && (
              <div ref={pauseBannerRef} tabIndex={-1} className="outline-none">
                <LoginAlertBanner
                  variant="security_cooldown"
                  title="Sign-in paused"
                  message={signInPauseMessage(signInPause)}
                  cooldownEndsAt={signInPause.until}
                  onCooldownExpire={handlePauseExpired}
                  actionText="Reset password"
                  onAction={openForgotPassword}
                />
              </div>
            )}

            {/* Email / Username Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-identifier" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  Email
                </label>
                {fieldErrors.email && (
                  <span className="text-rose-400 text-[11px] font-medium">
                    {fieldErrors.email}
                  </span>
                )}
              </div>
              <input
                id="login-identifier"
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
                className={`w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors duration-150 text-white placeholder-slate-400 caret-red-500 disabled:opacity-60 ${
                  fieldErrors.email
                    ? "border border-rose-500 bg-rose-950/30"
                    : "border border-slate-700 bg-slate-800 focus:border-red-500"
                }`}
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label htmlFor="login-password" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                    Password
                  </label>
                  {isCapsLockOn && (
                    <span className="text-amber-400 text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                      Caps Lock ON
                    </span>
                  )}
                </div>
                {fieldErrors.password && (
                  <span className="text-rose-400 text-[11px] font-medium">
                    {fieldErrors.password}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    if (activeAlert?.variant === "error") setActiveAlert(null);
                  }}
                  onKeyDown={handleKeyDown}
                  onKeyUp={(e) => {
                    if (e.getModifierState) {
                      setIsCapsLockOn(e.getModifierState("CapsLock"));
                    }
                  }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={isLoading || isCooldownActive}
                  className={`w-full pl-4 pr-10 py-3 rounded-xl outline-none text-sm transition-colors duration-150 text-white placeholder-slate-400 caret-red-500 disabled:opacity-60 ${
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me: a native checkbox (Tab to reach, Space to toggle) styled flat */}
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="login-remember-me"
                className="inline-flex items-center gap-2.5 py-1 text-sm text-slate-300 cursor-pointer select-none has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
              >
                <span className="relative inline-flex h-4 w-4 shrink-0">
                  <input
                    id="login-remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading || isCooldownActive}
                    className="peer h-4 w-4 appearance-none rounded border border-slate-500 bg-slate-800 transition-colors cursor-pointer checked:border-red-600 checked:bg-red-600 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B132B]"
                  />
                  <Check
                    size={12}
                    strokeWidth={3}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100"
                  />
                </span>
                Remember me
              </label>
              {/* Not disabled during a sign-in cooldown: that is exactly when it is needed */}
              <button
                type="button"
                onClick={openForgotPassword}
                disabled={isLoading}
                className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors cursor-pointer rounded px-1 py-1 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Forgot password?
              </button>
            </div>

            {/* Warns while there is still time to stop guessing */}
            {showAttemptsWarning && (
              <p role="status" className="flex items-start gap-2 text-xs leading-relaxed text-amber-300">
                <AlertTriangle size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-amber-400" />
                <span>
                  {attemptsLeft!.count === 1 ? "1 attempt" : `${attemptsLeft!.count} attempts`} left before sign-in
                  is paused{attemptsLeft!.scope === "network" ? " for your whole network" : ""}. If you are not sure
                  of the password, reset it rather than guessing.
                </span>
              </p>
            )}

            {/* Submit CTA Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || isCooldownActive}
                className="w-full py-3.5 rounded-xl text-white flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B132B]"
                style={{
                  background: isCooldownActive ? "#475569" : "#DC2626",
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : isCooldownActive ? (
                  <>
                    <Lock size={16} aria-hidden="true" />
                    <span>Sign-in paused</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD: find account, verify by email or SMS, set a new password */}
        {stage === "FORGOT_PASSWORD" && (
          <ForgotPasswordFlow
            initialIdentifier={forgotPasswordPrefill}
            onCancel={() => setStage("CREDENTIALS")}
            onComplete={handlePasswordResetComplete}
          />
        )}

        {/* STAGE 2: PROFILE SETUP (First-time Admin Setup) */}
        {stage === "PROFILE_SETUP" && (
          <div className="space-y-4">
            {activeAlert && (
              <div className="mb-4">
                <LoginAlertBanner
                  variant={activeAlert.variant}
                  title={activeAlert.title}
                  message={activeAlert.message}
                  onDismiss={() => setActiveAlert(null)}
                  autoDismissMs={activeAlert.autoDismissMs}
                />
              </div>
            )}
            <ProfileSetupStep
              onSubmit={handleProfileSubmit}
              onCancel={() => resetToCredentials()}
              serverError={activeAlert?.message || ""}
              isSubmitting={isLoading}
            />
          </div>
        )}

        {/* STAGE 3: OTP VERIFICATION */}
        {stage === "OTP" && (
          <div className="space-y-4">
            {activeAlert && (
              <div className="mb-4">
                <LoginAlertBanner
                  variant={activeAlert.variant}
                  title={activeAlert.title}
                  message={activeAlert.message}
                  onDismiss={() => setActiveAlert(null)}
                  autoDismissMs={activeAlert.autoDismissMs}
                />
              </div>
            )}
            <OtpStep
              maskedEmail={maskedEmail}
              maskedPhone={maskedPhone}
              phone={phone}
              expiresAt={challengeExpiresAt}
              resendAvailableAt={resendAvailableAt}
              serverError={activeAlert?.message || ""}
              isSubmitting={isLoading}
              isResending={isResending}
              onSubmit={handleOtpSubmit}
              onSubmitFirebasePhone={handleFirebasePhoneSubmit}
              onResend={handleResend}
              onExpire={handleChallengeExpired}
              onCancel={() => resetToCredentials()}
            />
          </div>
        )}
      </div>

      {/* Website Copyright Footer at Bottom Edge. In normal flow at every width:
          absolutely positioned on desktop it sat on top of any step tall enough
          to reach it (the forgot-password steps on a 768px screen) and took
          the clicks meant for the links underneath. */}
      <footer className="w-full pt-6 pb-4 text-center select-none" role="contentinfo">
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          &copy; {new Date().getFullYear()} Sugo on the Go. All rights reserved.
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
          Tacurong City Logistics &amp; Fleet Operations
        </p>
      </footer>

      {/* Another Device Active Takeover Confirmation Modal */}
      {takeoverNotice && (
        <Dialog open={true} onOpenChange={() => setTakeoverNotice(null)}>
          <DialogContent className="max-w-md bg-slate-900 border border-amber-500/20 text-white shadow-2xl p-6 rounded-2xl">
            <DialogHeader className="gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldAlert size={24} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white tracking-tight">
                  Another Device Is Signed In
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-sm mt-1">
                  This account is currently active on another device. Signing in here will sign out the other device.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="my-4 p-3.5 rounded-xl bg-slate-950 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Laptop size={14} className="text-slate-400" />
                  Active Device
                </span>
                <span className="font-medium text-slate-200">{takeoverNotice.deviceInfo || "Unknown Device"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Globe size={14} className="text-slate-400" />
                  IP Address
                </span>
                <span className="font-mono text-slate-200">{takeoverNotice.ipAddress || "Unknown IP"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock size={14} className="text-slate-400" />
                  Last Active
                </span>
                <span className="font-mono text-slate-200">
                  {new Date(takeoverNotice.lastUsedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setTakeoverNotice(null)}
                className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-medium text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTakeover}
                disabled={isLoading}
                className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500/40"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Continue Here</span>
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
