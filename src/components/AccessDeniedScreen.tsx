import React from "react";
import { ShieldAlert, ArrowLeft, Home, Lock } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

interface AccessDeniedScreenProps {
  requiredRole?: string;
  currentRole?: string;
  customMessage?: string;
  onGoBack?: () => void;
}

export const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({
  requiredRole,
  currentRole,
  customMessage,
  onGoBack,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const activeRole = currentRole || user?.role || "GUEST";

  const getHomeRoute = () => {
    if (!isAuthenticated || !user) return "/";
    const role = (user.role || "").toLowerCase();
    if (role === "owner") return "/owner";
    if (role === "dispatcher") return "/dispatcher";
    return "/";
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex items-center justify-center p-5 font-sans select-none">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-6">
        {/* Shield Icon Badge */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 relative">
            <ShieldAlert size={32} strokeWidth={2.2} />
            <span className="absolute -bottom-1 -right-1 p-1 bg-slate-900 text-white rounded-full">
              <Lock size={12} strokeWidth={3} />
            </span>
          </div>
        </div>

        {/* Header & Status */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full text-rose-700 text-[11px] font-bold tracking-wider uppercase">
            <span>HTTP 403 Forbidden</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h1>

          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto font-medium">
            {customMessage ||
              `Your account role (${activeRole.toUpperCase()}) does not possess authorization privileges to access this area.`}
          </p>

          {requiredRole && (
            <p className="text-[11px] text-slate-500">
              Required privilege level: <span className="font-bold text-slate-700">{requiredRole.toUpperCase()}</span>
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={onGoBack || (() => navigate(-1))}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs border border-slate-300 transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>

          <button
            onClick={() => navigate(getHomeRoute())}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition active:scale-95 cursor-pointer shadow-xs"
          >
            <Home size={14} />
            <span>Return Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedScreen;
