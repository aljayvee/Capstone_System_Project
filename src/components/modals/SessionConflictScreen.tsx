import React, { useState } from "react";
import { ShieldAlert, ArrowLeft, LogOut, Terminal, Users } from "lucide-react";

interface SessionConflictScreenProps {
  variant: "operational_active" | "sysadmin_active";
  operationalUser?: { username: string; role: string } | null;
  sysAdminUser?: { username: string; nickname?: string } | null;
  onReturn: () => void;
  onSignOutAndProceed: () => Promise<void> | void;
}

export const SessionConflictScreen: React.FC<SessionConflictScreenProps> = ({
  variant,
  operationalUser,
  sysAdminUser,
  onReturn,
  onSignOutAndProceed,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSignOut = async () => {
    setIsProcessing(true);
    try {
      await onSignOutAndProceed();
    } finally {
      setIsProcessing(false);
    }
  };

  const isOperational = variant === "operational_active";
  const roleName = operationalUser?.role ? operationalUser.role.toUpperCase() : "STAFF";
  const portalName = roleName === "OWNER" ? "Owner Portal" : roleName === "DISPATCHER" ? "Dispatcher Portal" : "Staff Portal";

  return (
    <div className="min-h-screen min-h-dvh bg-[#070D1B] text-slate-100 flex items-center justify-center p-3.5 sm:p-4 pt-safe pb-safe select-none">
      <div className="w-full max-w-lg bg-[#0F1A30] border border-red-900/60 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Accent top line */}
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

        <div className="p-5 sm:p-7 md:p-8 space-y-5 sm:space-y-6">
          {/* Header Icon & Title */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-red-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Security Protocol • Cross-Session Segregation</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {isOperational ? "Operational Session Active" : "SysAdmin Session Active"}
              </h1>
              <p className="text-xs text-slate-400">
                {isOperational
                  ? "Access to the IT Infrastructure Console is restricted while signed in to an operational account."
                  : "Access to operational staff portals is restricted while signed in to the IT SysAdmin Console."}
              </p>
            </div>
          </div>

          {/* Active Identity Summary Card */}
          <div className="p-4 rounded-xl bg-[#0B132B] border border-slate-800 space-y-2.5">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Currently Authenticated As:
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isOperational ? (
                  <Users className="w-4 h-4 text-sky-400" />
                ) : (
                  <Terminal className="w-4 h-4 text-amber-400" />
                )}
                <span className="font-bold text-sm text-white font-mono">
                  @{isOperational ? operationalUser?.username || "unknown" : sysAdminUser?.nickname || sysAdminUser?.username || "sysadmin"}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {isOperational ? roleName : "SYSADMIN"}
              </span>
            </div>
          </div>

          {/* Explanation Notice */}
          <div className="text-xs text-slate-300 leading-relaxed space-y-2">
            <p>
              To maintain strict role segregation and prevent cross-account privilege leakage, operational personnel
              accounts and IT infrastructure administrator sessions are strictly isolated and cannot be operated concurrently
              in the same browser.
            </p>
            <p className="text-[11px] text-slate-400">
              {isOperational
                ? `Please return to your ${portalName}, or sign out of your operational account to proceed to the SysAdmin Console.`
                : "Please return to the SysAdmin Console, or sign out of your administrator account to proceed to the staff portal."}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onReturn}
              disabled={isProcessing}
              className="w-full sm:flex-1 py-3 px-4 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span>{isOperational ? `Return to ${portalName}` : "Return to SysAdmin"}</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isProcessing}
              className="w-full sm:flex-1 py-3 px-4 min-h-[48px] rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.98]"
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>{isOperational ? "Sign Out & Proceed" : "Sign Out of SysAdmin"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
