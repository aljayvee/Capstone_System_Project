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
    activatedAt: null,
    updatedAt: new Date().toISOString(),
  });

  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const mountedRef = useRef(true);

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
          setStatus((prev) => ({
            ...prev,
            ...res.data,
            // Fallback for legacy notice field
            message: res.data.message || res.data.notice || prev.message,
          }));
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

  // 2. Dynamic 60-Second Grace Period Countdown Engine
  useEffect(() => {
    if (!status.isActive) {
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
  }, [status.isActive, status.activatedAt]);

  const showWarningBanner = status.isActive && countdownSeconds > 0;
  const showFullScreenOverlay = status.isActive && countdownSeconds === 0;

  return {
    ...status,
    countdownSeconds,
    showWarningBanner,
    showFullScreenOverlay,
  };
}

export default useMaintenanceCheck;
