import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    const normalizedRole = user.role.toLowerCase();
    return <Navigate to={`/${normalizedRole}`} replace />;
  }

  return <>{children}</>;
};
