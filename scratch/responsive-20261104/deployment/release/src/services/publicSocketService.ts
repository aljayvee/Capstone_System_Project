/**
 * publicSocketService.ts
 *
 * Singleton Socket.io manager for unauthenticated, public real-time events:
 * - "system:server_error_update" (500 Server Error outage overlay)
 * - "maintenance:update" (Portal maintenance warnings and advisory banners)
 *
 * Eliminates redundant parallel socket connections by multiplexing listeners
 * across a single underlying connection with reference counting and debounced teardown.
 */

import { io, Socket } from "socket.io-client";
import type { PortalKey, PortalMaintenanceStatus } from "../types/sysAdmin";

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api\/?$/, "")
  : "http://localhost:5000";

let sharedSocket: Socket | null = null;
let activeSubscribersCount = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

const serverErrorListeners = new Set<(active: boolean) => void>();
const maintenanceListeners = new Map<PortalKey, Set<(status: PortalMaintenanceStatus) => void>>();
const reconnectListeners = new Set<() => void>();

function getOrCreateSharedSocket(): Socket {
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }

  if (!sharedSocket) {
    sharedSocket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    sharedSocket.on("system:server_error_update", (payload: { active: boolean }) => {
      if (payload && typeof payload.active === "boolean") {
        serverErrorListeners.forEach((listener) => {
          try {
            listener(payload.active);
          } catch {
            // Fail open silently
          }
        });
      }
    });

    sharedSocket.on("maintenance:update", (payload: PortalMaintenanceStatus) => {
      if (payload && payload.portal) {
        const listeners = maintenanceListeners.get(payload.portal);
        if (listeners) {
          listeners.forEach((listener) => {
            try {
              listener(payload);
            } catch {
              // Fail open silently
            }
          });
        }
      }
    });

    sharedSocket.on("connect", () => {
      reconnectListeners.forEach((listener) => {
        try {
          listener();
        } catch {
          // Fail open silently
        }
      });
    });
  }

  return sharedSocket;
}

function releaseSharedSocket() {
  activeSubscribersCount--;
  if (activeSubscribersCount <= 0) {
    activeSubscribersCount = 0;
    if (disconnectTimer) clearTimeout(disconnectTimer);
    // Debounce teardown by 10s so navigating between portals/login doesn't churn connections
    disconnectTimer = setTimeout(() => {
      if (activeSubscribersCount === 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
      }
      disconnectTimer = null;
    }, 10_000);
  }
}

/**
 * Subscribe to real-time 500 server error simulation updates.
 * Returns an unsubscribe callback.
 */
export function subscribePublicServerError(callback: (active: boolean) => void): () => void {
  activeSubscribersCount++;
  getOrCreateSharedSocket();
  serverErrorListeners.add(callback);

  return () => {
    serverErrorListeners.delete(callback);
    releaseSharedSocket();
  };
}

/**
 * Subscribe to real-time portal maintenance updates for a specific portal key.
 * Returns an unsubscribe callback.
 */
export function subscribePublicMaintenance(
  portal: PortalKey,
  callback: (status: PortalMaintenanceStatus) => void
): () => void {
  activeSubscribersCount++;
  getOrCreateSharedSocket();

  let listeners = maintenanceListeners.get(portal);
  if (!listeners) {
    listeners = new Set();
    maintenanceListeners.set(portal, listeners);
  }
  listeners.add(callback);

  return () => {
    const currentListeners = maintenanceListeners.get(portal);
    if (currentListeners) {
      currentListeners.delete(callback);
      if (currentListeners.size === 0) {
        maintenanceListeners.delete(portal);
      }
    }
    releaseSharedSocket();
  };
}

/**
 * Subscribe to socket reconnection events to re-sync HTTP state.
 * Returns an unsubscribe callback.
 */
export function onPublicSocketReconnected(callback: () => void): () => void {
  reconnectListeners.add(callback);
  return () => {
    reconnectListeners.delete(callback);
  };
}

/**
 * Check if the shared public socket is currently connected.
 */
export function isPublicSocketConnected(): boolean {
  return sharedSocket?.connected ?? false;
}
