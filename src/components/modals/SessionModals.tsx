import React from "react";
import { ShieldAlert, Clock, LogOut, Laptop, Globe, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SupersededSessionInfo } from "../../types/auth";

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
  onStaySignedIn: () => void;
  onSignOut: () => void;
}

export const SessionExpiryWarningModal: React.FC<SessionExpiryWarningModalProps> = ({
  isOpen,
  remainingSeconds,
  onStaySignedIn,
  onSignOut,
}) => {
  if (!isOpen) return null;

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
            onClick={onStaySignedIn}
            className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/40"
          >
            Stay Signed In
          </button>
        </DialogFooter>
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
