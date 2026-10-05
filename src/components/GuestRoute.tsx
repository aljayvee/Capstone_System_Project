import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useOptionalSysAdminAuth } from "../portals/sysadmin/context/SysAdminAuthContext";

export const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const sysAdminAuth = useOptionalSysAdminAuth();

  if (sysAdminAuth?.isAuthenticated && sysAdminAuth.admin) {
    return <Navigate to="/sysadmin" replace />;
  }

  if (isAuthenticated && user) {
    const normalizedRole = user.role.toLowerCase();
    return <Navigate to={`/${normalizedRole}`} replace />;
  }

  return <>{children}</>;
};
