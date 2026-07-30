import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types/auth";
import { ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Access Restricted</h2>
            <p className="text-slate-400 text-sm mt-2">
              Your account role <span className="font-semibold text-amber-400">({user.role.toUpperCase()})</span> does not have authorization to view this portal.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-700/60 flex flex-col gap-3">
            <Navigate to={`/${user.role}`} replace />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
