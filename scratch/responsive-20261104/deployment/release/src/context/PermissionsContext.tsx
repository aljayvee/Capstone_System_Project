import * as React from "react";
import { useAuth } from "./AuthContext";
import { AccessApiError, accessApi, type MyPermissions } from "../services/accessApi";

/**
 * What the signed-in Admin or dispatcher may see and do, for hiding what their
 * access group leaves out.
 *
 * This is presentation, not enforcement. Every rule is enforced by the server
 * (requirePermission), so the failure modes here lean toward showing too much
 * rather than too little:
 * - a server from before access groups answers 404, and the portal behaves
 *   exactly as it did then (everything shown, no Access tabs);
 * - a failed load keeps the last known access, or shows everything when there
 *   is none, with a Retry. A blip must not empty the sidebar, and a screen
 *   shown in error still meets the server's 403.
 *
 * Refetches when the Main Owner changes this account (the permissions:changed
 * socket event, relayed by AuthContext), and when the tab regains focus.
 */

type Status = "loading" | "ready" | "error";

interface PermissionsValue {
  status: Status;
  /** The server's message when status is "error". */
  error: string | null;
  /** True when the server has no access groups yet (an older deployment). */
  legacy: boolean;
  isMainOwner: boolean;
  group: MyPermissions["group"] | null;
  permissions: readonly string[] | null;
  can: (key: string) => boolean;
  reload: () => void;
}

const PermissionsContext = React.createContext<PermissionsValue | null>(null);

const FOCUS_REFETCH_MS = 30_000;

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [data, setData] = React.useState<MyPermissions | null>(null);
  const [status, setStatus] = React.useState<Status>("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [legacy, setLegacy] = React.useState(false);
  const lastLoad = React.useRef(0);
  const requestId = React.useRef(0);

  const role = String(user?.role ?? "").toUpperCase();
  const grouped = role === "OWNER" || role === "DISPATCHER";
  const hasToken = Boolean(token);

  const load = React.useCallback(async () => {
    if (!grouped || !hasToken) return;
    const id = ++requestId.current;
    lastLoad.current = Date.now();
    try {
      const next = await accessApi.getMyPermissions();
      if (id !== requestId.current) return;
      setData(next);
      setLegacy(false);
      setError(null);
      setStatus("ready");
    } catch (err) {
      if (id !== requestId.current) return;
      if (err instanceof AccessApiError && err.status === 404) {
        setLegacy(true);
        setError(null);
        setStatus("ready");
        return;
      }
      setError(err instanceof Error ? err.message : "Your access could not be loaded.");
      setStatus("error");
    }
  }, [grouped, hasToken]);

  // A different account on this tab starts from nothing.
  React.useEffect(() => {
    setData(null);
    setLegacy(false);
    setStatus("loading");
    void load();
  }, [user?.id, load]);

  React.useEffect(() => {
    const onChanged = () => void load();
    const onFocus = () => {
      if (Date.now() - lastLoad.current > FOCUS_REFETCH_MS) void load();
    };
    window.addEventListener("sugo:permissions-changed", onChanged);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("sugo:permissions-changed", onChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const permissions = data?.permissions ?? null;
  const can = React.useCallback(
    (key: string) => {
      if (legacy || !permissions) return true;
      return permissions.includes(key);
    },
    [legacy, permissions],
  );

  const value = React.useMemo<PermissionsValue>(
    () => ({
      status,
      error,
      legacy,
      isMainOwner: !legacy && Boolean(data?.isMainOwner),
      group: data?.group ?? null,
      permissions,
      can,
      reload: () => void load(),
    }),
    [status, error, legacy, data, permissions, can, load],
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsValue {
  const value = React.useContext(PermissionsContext);
  if (!value) throw new Error("usePermissions must be used inside PermissionsProvider");
  return value;
}

/** For shared components that may render outside a portal: everything allowed there. */
export function useOptionalPermissions(): PermissionsValue | null {
  return React.useContext(PermissionsContext);
}
