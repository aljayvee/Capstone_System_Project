import React, { useState, useEffect } from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";

interface OfflineBannerProps {
  queuedActionsCount?: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ queuedActionsCount = 0 }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    let reconnectTimeout: any;

    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      reconnectTimeout = setTimeout(() => {
        setJustReconnected(false);
      }, 2500);
    };

    const handleOffline = () => {
      setJustReconnected(false);
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  if (justReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-emerald-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs z-50 sticky top-0 animate-fade-in select-none"
      >
        <CheckCircle2 size={15} className="shrink-0 text-emerald-200" />
        <span>Connection restored. All local changes are synced with the server.</span>
      </div>
    );
  }

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-slate-900 border-b border-amber-500/40 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 shadow-xs z-50 sticky top-0 animate-fade-in select-none"
    >
      <WifiOff size={15} className="shrink-0 text-amber-400" />
      <span>
        You are currently working offline.{" "}
        {queuedActionsCount > 0 ? (
          <span className="font-bold text-amber-300">
            ({queuedActionsCount} {queuedActionsCount === 1 ? "action" : "actions"} queued)
          </span>
        ) : (
          "Changes will sync automatically once reconnected."
        )}
      </span>
    </div>
  );
};

export default OfflineBanner;
