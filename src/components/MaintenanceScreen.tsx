import React, { useState, useEffect } from "react";
import { Wrench, RefreshCw, CheckCircle2 } from "lucide-react";
import { apiClient } from "../services/apiClient";

interface MaintenanceScreenProps {
  estimatedEndTime?: string;
  maintenanceReason?: string;
  onRestored?: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  estimatedEndTime = "Short maintenance window",
  maintenanceReason = "We are performing planned database upgrades and optimizations to improve dispatch performance.",
  onRestored,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    let intervalId: any;

    const checkHealth = async () => {
      try {
        const res = await apiClient.get("/health");
        if (res.status === 200) {
          setIsOnline(true);
          setTimeout(() => {
            if (onRestored) {
              onRestored();
            } else {
              window.location.reload();
            }
          }, 1500);
        }
      } catch {
        // Still down
      }
    };

    intervalId = setInterval(checkHealth, 10000);
    return () => clearInterval(intervalId);
  }, [onRestored]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const res = await apiClient.get("/health");
      if (res.status === 200) {
        setIsOnline(true);
        setTimeout(() => {
          if (onRestored) {
            onRestored();
          } else {
            window.location.reload();
          }
        }, 1000);
      }
    } catch {
      // Still maintenance mode
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex items-center justify-center p-5 select-none font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-6">
        {/* Maintenance Icon Badge */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Wrench size={32} strokeWidth={2.2} />
          </div>
        </div>

        {/* Title & Status */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-amber-700 text-[11px] font-bold tracking-wider uppercase">
            <span>HTTP 503 / Scheduled Maintenance</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Under Maintenance</h1>

          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto font-medium">
            {maintenanceReason}
          </p>

          <div className="pt-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600">
            <span className="font-bold text-slate-800">Estimated Duration:</span> {estimatedEndTime}
          </div>
        </div>

        {/* Dynamic Status / Actions */}
        <div className="pt-2">
          {isOnline ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-emerald-800 text-xs font-bold animate-pulse">
              <CheckCircle2 size={16} />
              <span>System restored! Redirecting...</span>
            </div>
          ) : (
            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} className={isChecking ? "animate-spin" : ""} />
              <span>{isChecking ? "Checking Status..." : "Check Status Now"}</span>
            </button>
          )}
          <p className="text-[11px] text-slate-400 mt-2">
            This screen automatically checks every 10 seconds and will resume when services are live.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
