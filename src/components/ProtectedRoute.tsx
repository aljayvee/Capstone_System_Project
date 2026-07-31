import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types/auth";
import { ShieldAlert, LogOut } from "lucide-react";
import { MobileAppNoticeModal } from "./MobileAppNoticeModal";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const normalizedUserRole = user.role.toLowerCase();
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

  // Dedicated Mobile App Notice Modal for Rider and Customer accounts
  if (normalizedUserRole === "rider" || normalizedUserRole === "customer") {
    return (
      <MobileAppNoticeModal
        isOpen={true}
        roleName={user.role}
        onClose={() => logout()}
      />
    );
  }

  if (!normalizedAllowed.includes(normalizedUserRole)) {
    const handleExit = () => {
      logout();
      window.location.href = "/";
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Access Restricted</h2>
            <p className="text-slate-400 text-sm mt-2">
              Your account role <span className="font-semibold text-amber-400">({user.role.toUpperCase()})</span> does not have authorization to view this portal.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            <button
              onClick={handleExit}
              className="w-full py-3 px-5 rounded-xl font-semibold text-sm text-white bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <LogOut size={16} />
              <span>Exit & Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

