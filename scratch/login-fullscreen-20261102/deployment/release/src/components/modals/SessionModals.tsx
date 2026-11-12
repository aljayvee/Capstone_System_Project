import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Clock,
  LogOut,
  Laptop,
  Globe,
  AlertCircle,
  Lock,
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SupersededSessionInfo } from "../../types/auth";
import { useAuth } from "../../context/AuthContext";
import { apiService, isLoginChallenge, isAnotherDeviceActive } from "../../services/apiService";

// Formats seconds into MM:SS
function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

interface AnotherDeviceEvictionModalProps {
  info: SupersededSessionInfo | null;
  onDismiss: () => void;
}

export const AnotherDeviceEvictionModal: React.FC<AnotherDeviceEvictionModalProps> = ({
  info,
  onDismiss,
}) => {
  if (!info) return null;

  return (
    <Dialog open={true} onOpenChange={() => onDismiss()}>
      <DialogContent className="max-w-md bg-slate-900 border border-amber-500/20 text-white shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert size={24} />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-white tracking-tight">
              Another Device Signed In
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-sm mt-1">
              Your active session on this computer has been signed out because your account was accessed from another machine.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="my-4 p-3.5 rounded-xl bg-slate-950 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Laptop size={14} className="text-slate-400" />
              Device Info
            </span>
            <span className="font-medium text-slate-200">{info.deviceInfo || "Unknown Device"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Globe size={14} className="text-slate-400" />
              IP Address
            </span>
            <span className="font-mono text-slate-200">{info.ipAddress || "Unknown IP"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock size={14} className="text-slate-400" />
              Time
            </span>
            <span className="font-mono text-slate-200">
              {new Date(info.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/20 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 text-red-400 mt-0.5" />
          <p>
            If you did not authorize this login, please contact your administrator or change your password immediately.
          </p>
        </div>

        <DialogFooter className="mt-4 sm:justify-end">
          <button
            onClick={onDismiss}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/40"
          >
            Return to Sign In
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface SessionExpiryWarningModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onSuccess: () => void;
  onSignOut: () => void;
}

export const SessionExpiryWarningModal: React.FC<SessionExpiryWarningModalProps> = ({
  isOpen,
  remainingSeconds,
  onSuccess,
  onSignOut,
}) => {
  const { user, login } = useAuth();
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Reset internal state whenever modal visibility changes
  useEffect(() => {
    if (!isOpen) {
      setShowPasswordPrompt(false);
      setPassword("");
      setShowPassword(false);
      setError(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your password to resume.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const identifier = user?.username || user?.email || "";
      const response = await apiService.login(identifier, password.trim(), true);

      if ("error" in response) {
        setIsVerifying(false);
        setError(response.error || "Incorrect password. Please try again.");
        return;
      }

      if (isAnotherDeviceActive(response)) {
        setIsVerifying(false);
        onSignOut();
        return;
      }

      if (isLoginChallenge(response)) {
        // Multi-factor challenge triggered, direct user to regular login
        setIsVerifying(false);
        onSignOut();
        return;
      }

      // Session verified and renewed
      const token = response.token;
      const portalUser = {
        id: response.user.id || user?.id || Date.now(),
        username: response.user.username || user?.username || identifier,
        role: (response.user.role || user?.role || "owner").toString().toLowerCase() as any,
        name: response.user.name || user?.name || identifier,
        email: response.user.email || user?.email || "",
        phone: response.user.phone || user?.phone || "",
        avatar: (response.user.username || identifier).substring(0, 2).toUpperCase(),
        token,
      };

      login(portalUser, token);
      setShowPasswordPrompt(false);
      setPassword("");
      setError(null);
      setIsVerifying(false);
      onSuccess();
    } catch (err: any) {
      setIsVerifying(false);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Authentication failed. Please verify your password."
      );
    }
  };

  if (!showPasswordPrompt) {
    return (
      <Dialog open={true}>
        <DialogContent className="max-w-md bg-slate-900 border border-amber-500/20 text-white shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="gap-3 text-center sm:text-center items-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <Clock size={24} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight">
                Session Expiring Soon
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-sm mt-1">
                You have been inactive. For administrative security, your session will automatically expire in:
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="my-5 py-4 text-center rounded-xl bg-slate-950 border border-white/10">
            <div className="font-mono text-3xl font-bold tracking-widest text-amber-400 tabular-nums">
              {formatTime(remainingSeconds)}
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mt-1">
              Minutes Remaining
            </p>
          </div>

          <DialogFooter className="mt-2 flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onSignOut}
              className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-medium text-sm transition-colors cursor-pointer"
            >
              Sign Out Now
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPasswordPrompt(true);
                setError(null);
              }}
              className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/40"
            >
              Stay Signed In
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-md bg-slate-900 border border-amber-500/20 text-white shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="gap-3 text-left">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock size={22} />
            </div>
            {/* Live countdown badge in header */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-amber-500/30 text-amber-400 font-mono text-xs tabular-nums">
              <Clock size={13} className="animate-pulse" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-white tracking-tight">
              Confirm Identity
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs mt-1 leading-relaxed">
              Re-enter your password to confirm it is you and continue your session without losing your current progress.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* User Identity Pill */}
        <div className="p-3 rounded-xl bg-slate-950 border border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
            {user?.name?.[0] || user?.username?.[0] || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">
              {user?.name || user?.username || "Active Staff"}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {user?.email || `Role: ${user?.role || "Operational"}`}
            </p>
          </div>
        </div>

        {/* Re-auth Password Form */}
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Account Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoFocus
                disabled={isVerifying}
                className="w-full text-xs px-3.5 py-2.5 pr-10 rounded-xl bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 transition cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-200">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                setShowPasswordPrompt(false);
                setPassword("");
                setError(null);
              }}
              disabled={isVerifying}
              className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={isVerifying || !password.trim()}
              className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/40"
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Lock size={14} />
                  <span>Resume Session</span>
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface SessionExpiredNoticeModalProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export const SessionExpiredNoticeModal: React.FC<SessionExpiredNoticeModalProps> = ({
  isOpen,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <Dialog open={true} onOpenChange={() => onDismiss()}>
      <DialogContent className="max-w-md bg-slate-900 border border-white/10 text-white shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
            <LogOut size={24} />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-white tracking-tight">
              Session Expired
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-sm mt-1">
              Your session has ended due to 30 minutes of inactivity. Please sign in again to continue your operations.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4 sm:justify-end">
          <button
            onClick={onDismiss}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors cursor-pointer"
          >
            Sign In Again
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
