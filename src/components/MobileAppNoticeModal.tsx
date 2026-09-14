import React, { useState } from "react";
import { Smartphone, LogOut, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface MobileAppNoticeModalProps {
  isOpen: boolean;
  roleName: string;
  onClose?: () => Promise<void> | void;
}

export const MobileAppNoticeModal: React.FC<MobileAppNoticeModalProps> = ({
  isOpen,
  roleName,
  onClose,
}) => {
  const { logout } = useAuth();
  const [isExiting, setIsExiting] = useState(false);

  if (!isOpen) return null;

  const handleExit = async () => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      if (onClose) {
        await onClose();
      }
      await logout();
    } catch (err) {
      console.error("Failed to cleanly exit mobile role session:", err);
    } finally {
      window.location.replace("/");
    }
  };

  const formattedRole = roleName.toUpperCase();
  const isRider = formattedRole === "RIDER";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl overflow-hidden text-center">
        {/* Top Accent Gradient Bar */}
        <div className={`absolute top-0 left-0 right-0 h-2.5 ${isRider ? "bg-amber-500" : "bg-sky-500"}`} />

        {/* Icon Badge */}
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-800 border border-slate-700 shadow-inner">
          <Smartphone size={32} className={isRider ? "text-amber-400" : "text-sky-400"} />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white tracking-wide">
          Dedicated App Required
        </h2>

        {/* Role Tag */}
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
          <ShieldAlert size={14} className={isRider ? "text-amber-400" : "text-sky-400"} />
          <span>{formattedRole} ACCOUNT DETECTED</span>
        </div>

        {/* Description Message */}
        <p className="mt-4 text-slate-300 text-sm leading-relaxed">
          <span className="font-semibold text-white">{formattedRole} accounts</span> have dedicated mobile applications and cannot be used in the Web Administrative Portal.
        </p>
        <p className="mt-2 text-slate-400 text-xs">
          Please access your account services using the dedicated <span className="text-slate-200 font-medium">{isRider ? "Rider Mobile App" : "Customer Mobile App"}</span>.
        </p>

        {/* Exit Button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleExit}
            disabled={isExiting}
            className="w-full py-3.5 px-5 rounded-xl font-semibold text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 active:scale-98 cursor-pointer"
          >
            {isExiting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOut size={18} />
                <span>Exit & Return to Login</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
