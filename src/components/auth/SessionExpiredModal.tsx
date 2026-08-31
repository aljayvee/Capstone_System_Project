import React, { useState } from "react";
import { Lock, LogIn, AlertCircle, RefreshCw, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiClient } from "../../services/apiClient";

interface SessionExpiredModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const { user, login, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your password to resume your session.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: Record<string, string> = {
        password: password.trim(),
      };

      if (user?.email) {
        payload.email = user.email;
      } else if (user?.username) {
        payload.username = user.username;
      }

      const res = await apiClient.post("/auth/login", payload);
      if (res.data?.user && res.data?.token) {
        login(res.data.user, res.data.token);
        setPassword("");
        onSuccess?.();
      } else {
        throw new Error("Invalid credentials received from server.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Authentication failed. Please verify your password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullLogout = () => {
    logout();
    onCancel?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-up text-left">
        {/* Header Badge */}
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
            <Lock size={22} strokeWidth={2.2} />
          </div>
          <button
            onClick={handleFullLogout}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
            title="Close and log out"
          >
            <X size={18} />
          </button>
        </div>

        {/* Title and Context */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Session Paused</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your session expired for security. Re-enter your password to continue without losing your in-progress work.
          </p>
        </div>

        {/* User Identity Display */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 uppercase shrink-0">
            {user?.name?.[0] || user?.username?.[0] || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">
              {user?.name || user?.username || "Active User"}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {user?.email || `Role: ${user?.role || "Operational"}`}
            </p>
          </div>
        </div>

        {/* Re-auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
          </div>

          {error && (
            <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleFullLogout}
              className="flex-1 py-2.5 px-3 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition cursor-pointer"
            >
              Sign Out Instead
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Resuming...</span>
                </>
              ) : (
                <>
                  <LogIn size={14} />
                  <span>Resume Session</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
