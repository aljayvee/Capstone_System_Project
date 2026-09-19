import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useIdleTimer } from "../../hooks/useIdleTimer";
import { apiClient } from "../../services/apiClient";
import {
  AnotherDeviceEvictionModal,
  SessionExpiryWarningModal,
  SessionExpiredNoticeModal,
} from "./SessionModals";

export const SessionGuard: React.FC = () => {
  const {
    user,
    isAuthenticated,
    supersededInfo,
    dismissSupersededNotice,
    isSessionExpired,
    dismissSessionExpiredNotice,
    notifySessionExpired,
    logout,
  } = useAuth();

  // Inactivity idle timer only monitors authenticated administrative staff (Owner / Dispatcher)
  const roleStr = String(user?.role || "").toLowerCase();
  const isStaff = isAuthenticated && (roleStr === "owner" || roleStr === "dispatcher");

  const { isWarning, remainingSeconds, resetTimer } = useIdleTimer({
    idleTimeoutMs: 28 * 60 * 1000,
    warningDurationMs: 2 * 60 * 1000,
    enabled: isStaff,
    onExpired: () => {
      notifySessionExpired();
    },
  });

  const handleStaySignedIn = async () => {
    try {
      await apiClient.post("/auth/refresh");
      resetTimer();
    } catch {
      notifySessionExpired();
    }
  };

  return (
    <>
      <AnotherDeviceEvictionModal
        info={supersededInfo}
        onDismiss={dismissSupersededNotice}
      />
      <SessionExpiryWarningModal
        isOpen={isWarning}
        remainingSeconds={remainingSeconds}
        onStaySignedIn={handleStaySignedIn}
        onSignOut={logout}
      />
      <SessionExpiredNoticeModal
        isOpen={isSessionExpired}
        onDismiss={dismissSessionExpiredNotice}
      />
    </>
  );
};
