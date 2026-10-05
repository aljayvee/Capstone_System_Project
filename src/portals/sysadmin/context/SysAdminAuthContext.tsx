import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { sysAdminApiService, setSysAdminMemoryToken } from "../../../services/sysAdminApiService";
import { Clock, ShieldAlert } from "lucide-react";

import type {
  SysAdminUser,
  SysAdminProfileInput,
  SysAdminCompleteProfileResponse,
  SysAdminLoginSuccess,
  SysAdminLoginResult,
  SysAdminLogin2FaRequired,
} from "../../../types/sysAdmin";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes total idle limit
const WARNING_THRESHOLD_MS = 13 * 60 * 1000; // Warning shown at 13 minutes (2 min left)
export const SYSADMIN_SESSION_ACTIVE_KEY = "sugo_sysadmin_active";

interface SysAdminAuthContextType {
  admin: SysAdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  challengeToken: string | null;
  pendingAdmin: SysAdminUser | null;

  // 2FA State
  twoFactorRequired: boolean;
  twoFactorEmailMasked: string | null;
  twoFactorChallengeToken: string | null;

  login: (username: string, pass: string) => Promise<{ profileSetupRequired: boolean; twoFactorRequired: boolean }>;
  verify2Fa: (code: string, trustDevice?: boolean) => Promise<void>;
  resend2Fa: () => Promise<void>;
  cancel2Fa: () => void;

  submitProfileWizard: (input: SysAdminProfileInput) => Promise<SysAdminCompleteProfileResponse>;
  resendVerificationLink: () => Promise<{ message: string; email: string; expiresAt: string }>;
  applyVerifiedSession: (data: SysAdminLoginSuccess) => void;
  updateCurrentAdmin: (updated: SysAdminUser) => void;
  logout: () => Promise<void>;
  cancelSetupWizard: () => void;
}

const SysAdminAuthContext = createContext<SysAdminAuthContextType | undefined>(undefined);

export const SysAdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<SysAdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [pendingAdmin, setPendingAdmin] = useState<SysAdminUser | null>(null);

  // 2FA State
  const [twoFactorRequired, setTwoFactorRequired] = useState<boolean>(false);
  const [twoFactorEmailMasked, setTwoFactorEmailMasked] = useState<string | null>(null);
  const [twoFactorChallengeToken, setTwoFactorChallengeToken] = useState<string | null>(null);

  // Idle Timer State
  const [showIdleWarning, setShowIdleWarning] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(120);
  const lastActivityRef = useRef<number>(Date.now());
  const idleCheckIntervalRef = useRef<any>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showIdleWarning) {
      setShowIdleWarning(false);
      setCountdownSeconds(120);
    }
  }, [showIdleWarning]);

  // Check existing session on mount with silent refresh fallback
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      const hasPossibleSysAdminSession =
        typeof window !== "undefined" &&
        (sessionStorage.getItem(SYSADMIN_SESSION_ACTIVE_KEY) === "1" ||
          window.location.pathname.startsWith("/sysadmin"));

      if (!hasPossibleSysAdminSession) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const user = await sysAdminApiService.getMe();
        if (mounted && user && user.role === "SYSADMIN") {
          setAdmin(user);
          sessionStorage.setItem(SYSADMIN_SESSION_ACTIVE_KEY, "1");
        }
      } catch {
        // Attempt silent refresh via HttpOnly sysAdminRefreshToken cookie
        try {
          const refreshRes = await sysAdminApiService.refreshSession();
          if (mounted && refreshRes.user && refreshRes.user.role === "SYSADMIN") {
            setAdmin(refreshRes.user);
            sessionStorage.setItem(SYSADMIN_SESSION_ACTIVE_KEY, "1");
          }
        } catch {
          // No active session
          sessionStorage.removeItem(SYSADMIN_SESSION_ACTIVE_KEY);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    checkSession();
    return () => {
      mounted = false;
    };
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await sysAdminApiService.logout();
    } finally {
      setSysAdminMemoryToken(null);
      setAdmin(null);
      setChallengeToken(null);
      setPendingAdmin(null);
      setTwoFactorRequired(false);
      setTwoFactorChallengeToken(null);
      setTwoFactorEmailMasked(null);
      setShowIdleWarning(false);
      sessionStorage.removeItem(SYSADMIN_SESSION_ACTIVE_KEY);
      setIsLoading(false);
    }
  }, []);

  // Idle timeout detector (15 min idle, 2 min warning banner)
  useEffect(() => {
    if (!admin) {
      if (idleCheckIntervalRef.current) clearInterval(idleCheckIntervalRef.current);
      return;
    }

    lastActivityRef.current = Date.now();

    const handleUserActivity = () => {
      if (!showIdleWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("click", handleUserActivity);
    window.addEventListener("scroll", handleUserActivity);

    idleCheckIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        logout();
      } else if (elapsed >= WARNING_THRESHOLD_MS) {
        setShowIdleWarning(true);
        const remaining = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
        setCountdownSeconds(remaining);
      } else {
        setShowIdleWarning(false);
      }
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
      if (idleCheckIntervalRef.current) clearInterval(idleCheckIntervalRef.current);
    };
  }, [admin, logout, showIdleWarning]);

  const purgeOperationalSession = () => {
    try {
      sessionStorage.removeItem("errand_system_session_user");
      if (typeof document !== "undefined") {
        document.cookie = "sugo_session_active=; path=/; max-age=0; SameSite=Lax; Secure";
      }
    } catch {
      // ignore
    }
  };

  const login = useCallback(async (username: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await sysAdminApiService.login(username, pass);
      if (res.profileSetupRequired) {
        setChallengeToken(res.challengeToken);
        setPendingAdmin(res.admin);
        setAdmin(null);
        setTwoFactorRequired(false);
        return { profileSetupRequired: true, twoFactorRequired: false };
      } else if ((res as any).twoFactorRequired) {
        const twoFa = res as SysAdminLogin2FaRequired;
        setTwoFactorRequired(true);
        setTwoFactorChallengeToken(twoFa.challengeToken);
        setTwoFactorEmailMasked(twoFa.emailMasked);
        setPendingAdmin(twoFa.admin);
        setAdmin(null);
        return { profileSetupRequired: false, twoFactorRequired: true };
      } else {
        const success = res as SysAdminLoginSuccess;
        purgeOperationalSession();
        sessionStorage.setItem(SYSADMIN_SESSION_ACTIVE_KEY, "1");
        setAdmin(success.user);
        setChallengeToken(null);
        setPendingAdmin(null);
        setTwoFactorRequired(false);
        return { profileSetupRequired: false, twoFactorRequired: false };
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verify2Fa = useCallback(
    async (code: string, trustDevice: boolean = false) => {
      if (!twoFactorChallengeToken) {
        throw new Error("Missing 2FA verification session. Please sign in again.");
      }
      setIsLoading(true);
      try {
        const result = await sysAdminApiService.verify2Fa(twoFactorChallengeToken, code, trustDevice);
        purgeOperationalSession();
        sessionStorage.setItem(SYSADMIN_SESSION_ACTIVE_KEY, "1");
        setAdmin(result.user);
        setTwoFactorRequired(false);
        setTwoFactorChallengeToken(null);
        setTwoFactorEmailMasked(null);
        setPendingAdmin(null);
      } finally {
        setIsLoading(false);
      }
    },
    [twoFactorChallengeToken]
  );

  const resend2Fa = useCallback(async () => {
    if (!twoFactorChallengeToken) {
      throw new Error("Missing 2FA verification session. Please sign in again.");
    }
    await sysAdminApiService.resend2Fa(twoFactorChallengeToken);
  }, [twoFactorChallengeToken]);

  const cancel2Fa = useCallback(() => {
    setTwoFactorRequired(false);
    setTwoFactorChallengeToken(null);
    setTwoFactorEmailMasked(null);
    setPendingAdmin(null);
  }, []);

  const submitProfileWizard = useCallback(
    async (input: SysAdminProfileInput) => {
      if (!challengeToken) {
        throw new Error("Missing active setup session. Please sign in again.");
      }
      return await sysAdminApiService.completeProfile(challengeToken, input);
    },
    [challengeToken]
  );

  const resendVerificationLink = useCallback(async () => {
    if (!challengeToken) {
      throw new Error("Missing active setup session. Please sign in again.");
    }
    return await sysAdminApiService.resendMagicLink(challengeToken);
  }, [challengeToken]);

  const applyVerifiedSession = useCallback((data: SysAdminLoginSuccess) => {
    purgeOperationalSession();
    sessionStorage.setItem(SYSADMIN_SESSION_ACTIVE_KEY, "1");
    setAdmin(data.user);
    setChallengeToken(null);
    setPendingAdmin(null);
  }, []);

  const updateCurrentAdmin = useCallback((updated: SysAdminUser) => {
    setAdmin(updated);
  }, []);

  const cancelSetupWizard = useCallback(() => {
    setChallengeToken(null);
    setPendingAdmin(null);
  }, []);

  const value: SysAdminAuthContextType = {
    admin,
    isAuthenticated: !!admin,
    isLoading,
    challengeToken,
    pendingAdmin,
    twoFactorRequired,
    twoFactorEmailMasked,
    twoFactorChallengeToken,
    login,
    verify2Fa,
    resend2Fa,
    cancel2Fa,
    submitProfileWizard,
    resendVerificationLink,
    applyVerifiedSession,
    updateCurrentAdmin,
    logout,
    cancelSetupWizard,
  };

  return (
    <SysAdminAuthContext.Provider value={value}>
      {children}

      {/* 15-Minute Idle Warning Modal */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0F1A30] border border-amber-500/40 rounded-xl p-6 shadow-2xl animate-fade-in text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Session Inactivity Warning</h3>
                <p className="text-xs text-slate-400">High-privilege console security timeout</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              You have been inactive for over 13 minutes. To protect sensitive infrastructure resources, your administrator session will automatically terminate in:
            </p>

            <div className="bg-[#0B132B] border border-slate-700/80 rounded-lg py-3 text-center mb-5">
              <span className="text-2xl font-mono font-bold text-amber-400 tracking-wider">
                {Math.floor(countdownSeconds / 60)}:{(countdownSeconds % 60).toString().padStart(2, "0")}
              </span>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Remaining time before auto-logout</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={logout}
                className="flex-1 py-2.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Sign Out Now
              </button>
              <button
                type="button"
                onClick={resetActivity}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-lg shadow-red-900/40 transition-colors"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </SysAdminAuthContext.Provider>
  );
};

export const useSysAdminAuth = () => {
  const ctx = useContext(SysAdminAuthContext);
  if (!ctx) {
    throw new Error("useSysAdminAuth must be used within a SysAdminAuthProvider");
  }
  return ctx;
};

export const useOptionalSysAdminAuth = () => {
  return useContext(SysAdminAuthContext);
};
