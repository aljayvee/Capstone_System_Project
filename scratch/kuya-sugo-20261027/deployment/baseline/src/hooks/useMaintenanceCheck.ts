/**
 * useMaintenanceCheck.ts
 *
 * Real-time + Polling maintenance detection hook for client portals.
 * - Listens for Socket.io "maintenance:update" events for zero-delay instant updates.
 * - Polls public GET /api/maintenance/status?portal=<key> every 30 seconds as fallback.
 * - Calculates a graceful 60-second countdown window when maintenance is declared during an active session.
 */

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import type { PortalKey, PortalMaintenanceStatus } from "../types/sysAdmin";

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:5000/api";

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api\/?$/, "")
  : "http://localhost:5000";

const POLL_INTERVAL_MS = 30_000; // 30 seconds fallback

export interface MaintenanceCheckState extends PortalMaintenanceStatus {
  countdownSeconds: number;
  showWarningBanner: boolean;
  showFullScreenOverlay: boolean;
  isAdvisory: boolean;
  showAdvisoryModal: boolean;
  dismissAdvisory: (permanent?: boolean) => void;
}

export function useMaintenanceCheck(portal: PortalKey): MaintenanceCheckState {
  const [status, setStatus] = useState<PortalMaintenanceStatus>({
    portal,
    isActive: false,
    maintenanceType: "SCHEDULED",
    header: "System Under Maintenance",
    message: "Scheduled system maintenance in progress. Services will resume shortly.",
    notice: "Scheduled system maintenance in progress. Services will resume shortly.",
    supportContact: "support@sugo-express.org",
    customColor: "",
    footnote: "",
    activatedAt: null,
    updatedAt: "",
  });

  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [sessionDismissed, setSessionDismissed] = useState<boolean>(false);
  const mountedRef = useRef(true);

  const isAdvisory =
    status.isActive &&
    (status.maintenanceType === "ADVISORY" || status.maintenanceType === "LIVE_NOTICE");

  const storageKey = `sugo_advisory_dismissed_${portal}_${status.updatedAt || status.activatedAt || "default"}`;
  const sessionKey = `sugo_advisory_session_${portal}_${status.updatedAt || status.activatedAt || "default"}`;

  // Reset session dismissal if notice update timestamp changes
  useEffect(() => {
    setSessionDismissed(false);
  }, [status.updatedAt, status.isActive]);

  const isSessionDismissed = (): boolean => {
    if (sessionDismissed) return true;
    try {
      return typeof window !== "undefined" && window.sessionStorage?.getItem(sessionKey) === "1";
    } catch {
      return false;
    }
  };

  const isPermanentlyDismissed = (): boolean => {
    try {
      return typeof window !== "undefined" && window.localStorage?.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  };

  const dismissAdvisory = (permanent = false) => {
    setSessionDismissed(true);
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(sessionKey, "1");
      }
    } catch {
      // Fail open silently
    }
    if (permanent) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(storageKey, "1");
        }
      } catch {
        // Fail open silently
      }
    }
  };

  // 1. Dual-Sync: HTTP polling fallback + Socket.io push listener
  useEffect(() => {
    mountedRef.current = true;

    // HTTP polling
    const fetchStatus = async () => {
      try {
        const res = await axios.get<PortalMaintenanceStatus>(
          `${API_BASE_URL}/maintenance/status`,
          { params: { portal }, timeout: 5000 }
        );
        if (mountedRef.current && res.data) {
          setStatus((prev) => {
            const nextMsg = res.data.message || res.data.notice || prev.message;
            if (
              prev.isActive === res.data.isActive &&
              prev.maintenanceType === res.data.maintenanceType &&
              prev.updatedAt === res.data.updatedAt &&
              prev.header === res.data.header &&
              prev.message === nextMsg &&
              prev.footnote === res.data.footnote &&
              prev.customColor === res.data.customColor &&
              prev.supportContact === res.data.supportContact
            ) {
              return prev;
            }
            return {
              ...prev,
              ...res.data,
              // Fallback for legacy notice field
              message: nextMsg,
            };
          });
        }
      } catch {
        // Fail open silently
      }
    };

    fetchStatus();
    const intervalId = setInterval(fetchStatus, POLL_INTERVAL_MS);

    // Socket.io real-time push subscription
    let socket: Socket | null = null;
    try {
      socket = io(BACKEND_URL, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socket.on("maintenance:update", (payload: PortalMaintenanceStatus) => {
        if (!mountedRef.current) return;
        if (payload && payload.portal === portal) {
          setStatus((prev) => ({
            ...prev,
            ...payload,
            message: payload.message || payload.notice || prev.message,
          }));
        }
      });
    } catch {
      // If socket initialization fails, polling will continue as fallback
    }

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [portal]);

  // 2. Dynamic 60-Second Grace Period Countdown Engine (Locks only for actual downtime)
  useEffect(() => {
    if (!status.isActive || isAdvisory) {
      setCountdownSeconds(0);
      return;
    }

    const computeRemaining = (): number => {
      if (!status.activatedAt) return 0;
      const activatedMs = new Date(status.activatedAt).getTime();
      const elapsedMs = Date.now() - activatedMs;
      // 60-second grace window
      return Math.max(0, Math.ceil((60_000 - elapsedMs) / 1000));
    };

    const initial = computeRemaining();
    setCountdownSeconds(initial);

    if (initial <= 0) return;

    const timer = setInterval(() => {
      const remaining = computeRemaining();
      setCountdownSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status.isActive, status.activatedAt, isAdvisory]);

  const showWarningBanner = !isAdvisory && status.isActive && countdownSeconds > 0;
  const showFullScreenOverlay = !isAdvisory && status.isActive && countdownSeconds === 0;
  const showAdvisoryModal = isAdvisory && !isSessionDismissed() && !isPermanentlyDismissed();

  return {
    ...status,
    countdownSeconds,
    showWarningBanner,
    showFullScreenOverlay,
    isAdvisory,
    showAdvisoryModal,
    dismissAdvisory,
  };
}

export default useMaintenanceCheck;
