import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getSysAdminMemoryToken, sysAdminApiService } from "../../../services/sysAdminApiService";
import { useSysAdminAuth } from "./SysAdminAuthContext";
import { apiErrorText } from "../lib/apiErrorText";

export type SysAdminPermissionsStatus = "idle" | "loading" | "ready" | "error";

export interface SysAdminPermissionsContextValue {
  status: SysAdminPermissionsStatus;
  error: string | null;
  isMainSysAdmin: boolean;
  group: { id: number; name: string } | null;
  baselineName: string;
  permissions: ReadonlySet<string>;
  /** Fail-closed capability check: false until loaded or if missing. */
  can: (key: string) => boolean;
  canAny: (...keys: string[]) => boolean;
  reload: () => Promise<void>;
}

const SysAdminPermissionsContext = createContext<SysAdminPermissionsContextValue | null>(null);

const SOCKET_ORIGIN = String(
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000")
).replace(/\/api\/?$/, "");

export const SysAdminPermissionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { admin, isAuthenticated, logout } = useSysAdminAuth();
  const [status, setStatus] = useState<SysAdminPermissionsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isMainSysAdmin, setIsMainSysAdmin] = useState(false);
  const [group, setGroup] = useState<{ id: number; name: string } | null>(null);
  const [baselineName, setBaselineName] = useState("Read-Only Monitoring (Default)");
  const [permissionList, setPermissionList] = useState<string[]>([]);

  const socketRef = useRef<Socket | null>(null);

  const reload = useCallback(async () => {
    if (!isAuthenticated || !admin) {
      setStatus("idle");
      setIsMainSysAdmin(false);
      setGroup(null);
      setPermissionList([]);
      setError(null);
      return;
    }

    setStatus((prev) => (prev === "ready" ? prev : "loading"));
    setError(null);
    try {
      const res = await sysAdminApiService.getMyPermissions();
      setIsMainSysAdmin(Boolean(res.isMainSysAdmin));
      setGroup(res.group ?? null);
      setBaselineName(res.baselineName || "Read-Only Monitoring (Default)");
      setPermissionList(Array.isArray(res.permissions) ? res.permissions : []);
      setStatus("ready");
    } catch (err: unknown) {
      setError(apiErrorText(err, "Could not load your SysAdmin permissions."));
      setStatus("error");
    }
  }, [isAuthenticated, admin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Connect isolated SysAdmin Socket.IO channel so Main SysAdmin / Main Owner
  // PMA updates apply immediately to active secondary IT Admin consoles.
  useEffect(() => {
    if (!isAuthenticated || !admin) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const token = getSysAdminMemoryToken();
    if (!token) return;

    const socket = io(SOCKET_ORIGIN, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socket.on("sysadmin:permissions_changed", () => {
      void reload();
    });

    socket.on("session:revoked", () => {
      void logout();
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, admin, reload, logout]);

  const permissions = useMemo(() => new Set(permissionList), [permissionList]);

  const can = useCallback(
    (key: string) => {
      if (status !== "ready") return false;
      if (isMainSysAdmin) return true;
      return permissions.has(key);
    },
    [status, isMainSysAdmin, permissions]
  );

  const canAny = useCallback(
    (...keys: string[]) => keys.some((k) => can(k)),
    [can]
  );

  const value = useMemo<SysAdminPermissionsContextValue>(
    () => ({
      status,
      error,
      isMainSysAdmin,
      group,
      baselineName,
      permissions,
      can,
      canAny,
      reload,
    }),
    [status, error, isMainSysAdmin, group, baselineName, permissions, can, canAny, reload]
  );

  return (
    <SysAdminPermissionsContext.Provider value={value}>
      {children}
    </SysAdminPermissionsContext.Provider>
  );
};

export function useSysAdminPermissions(): SysAdminPermissionsContextValue {
  const ctx = useContext(SysAdminPermissionsContext);
  if (!ctx) {
    throw new Error("useSysAdminPermissions must be used within a SysAdminPermissionsProvider");
  }
  return ctx;
}
