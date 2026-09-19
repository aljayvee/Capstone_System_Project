import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, AuthContextType, SupersededSessionInfo } from "../types/auth";
import { setMemoryAccessToken, getMemoryAccessToken, setOnLogoutCallback, apiClient } from "../services/apiClient";
import { endRealtimeSession, ensureRealtimeSession } from "../firebase/realtimeSession";
import { io } from "socket.io-client";

const USER_SESSION_KEY = "errand_system_session_user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = sessionStorage.getItem(USER_SESSION_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setTokenState] = useState<string | null>(() => getMemoryAccessToken());
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [supersededInfo, setSupersededInfo] = useState<SupersededSessionInfo | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);

  const updateToken = useCallback((newToken: string | null) => {
    setMemoryAccessToken(newToken);
    setTokenState(newToken);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout").catch(() => {});
    } finally {
      // Before the local session is cleared, so the Firebase credential does
      // not outlive the account that owns it. A browser left holding one would
      // keep reading rider positions after the portal believes nobody is
      // signed in.
      await endRealtimeSession();
      setUser(null);
      updateToken(null);
      sessionStorage.removeItem(USER_SESSION_KEY);
      if (typeof document !== "undefined") {
        document.cookie = "sugo_session_active=; path=/; max-age=0; SameSite=Lax; Secure";
      }
    }
  }, [updateToken]);

  const login = useCallback(
    (newUser: User, newToken?: string) => {
      setUser(newUser);
      sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(newUser));
      if (typeof document !== "undefined") {
        document.cookie = "sugo_session_active=1; path=/; max-age=2592000; SameSite=Lax; Secure";
      }
      const authToken = newToken || newUser.token || null;
      updateToken(authToken);

      // Fire and forget. The real-time identity is what the live map and the
      // chat panes need; every other surface runs over REST and must not wait
      // on it, nor fail with it.
      void ensureRealtimeSession();
    },
    [updateToken]
  );

  // Register global logout callback for 401 refresh failures
  useEffect(() => {
    setOnLogoutCallback(logout);
  }, [logout]);

  // Sync user state to sessionStorage
  useEffect(() => {
    if (user) {
      sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_SESSION_KEY);
    }
  }, [user]);

  // Initial silent token refresh on page load/mount. Only executed if there is
  // evidence of an existing session (either session cookie or sessionStorage).
  // Fresh guest visits and search crawlers skip this to avoid unnecessary network latency
  // and prevent false 401 unauthorized errors in the browser console.
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      const hasPossibleSession =
        typeof document !== "undefined" &&
        (document.cookie.includes("sugo_session_active=1") || !!sessionStorage.getItem(USER_SESSION_KEY));

      if (!hasPossibleSession) {
        if (isMounted) {
          setIsInitializing(false);
        }
        return;
      }

      try {
        const res = await apiClient.post("/auth/refresh");
        if (isMounted && res.data?.token) {
          updateToken(res.data.token);
          if (res.data.user) {
            setUser(res.data.user);
          }
          // A reload restores the JWT session silently, and the Firebase one
          // has to come back with it. Without this, the map worked only on the
          // tab where the user actually typed their password.
          void ensureRealtimeSession();
        }
      } catch (err) {
        if (isMounted) {
          // No valid refresh cookie (or it's expired/revoked) — genuinely logged out.
          setUser(null);
          updateToken(null);
          sessionStorage.removeItem(USER_SESSION_KEY);
          if (typeof document !== "undefined") {
            document.cookie = "sugo_session_active=; path=/; max-age=0; SameSite=Lax; Secure";
          }
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const dismissSupersededNotice = useCallback(() => {
    setSupersededInfo(null);
    void logout();
  }, [logout]);

  const dismissSessionExpiredNotice = useCallback(() => {
    setIsSessionExpired(false);
    void logout();
  }, [logout]);

  const notifySessionExpired = useCallback(() => {
    setIsSessionExpired(true);
    void logout();
  }, [logout]);

  // Listen for custom window event from apiClient 401 interceptor
  useEffect(() => {
    const handleSuperseded = (e: Event) => {
      const customEvent = e as CustomEvent<SupersededSessionInfo>;
      if (customEvent.detail) {
        setSupersededInfo(customEvent.detail);
        void endRealtimeSession();
        setUser(null);
        updateToken(null);
        sessionStorage.removeItem(USER_SESSION_KEY);
        if (typeof document !== "undefined") {
          document.cookie = "sugo_session_active=; path=/; max-age=0; SameSite=Lax; Secure";
        }
      }
    };

    window.addEventListener("sugo:session-superseded", handleSuperseded);
    return () => {
      window.removeEventListener("sugo:session-superseded", handleSuperseded);
    };
  }, [updateToken]);

  // Connect Socket.IO to receive instant push eviction when superseded
  useEffect(() => {
    if (!token || !user) return;

    const backendUrl = (import.meta as any).env?.VITE_API_URL
      ? (import.meta as any).env.VITE_API_URL.replace(/\/api\/?$/, "")
      : "http://localhost:5000";

    const socket = io(backendUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("session:revoked", (payload: any) => {
      if (payload?.reason === "SUPERSEDED_BY_ANOTHER_DEVICE") {
        setSupersededInfo({
          ipAddress: payload.newDevice?.ipAddress || "Another IP",
          deviceInfo: payload.newDevice?.deviceInfo || "Another Device",
          timestamp: payload.newDevice?.timestamp || new Date().toISOString(),
        });
        void endRealtimeSession();
        setUser(null);
        updateToken(null);
        sessionStorage.removeItem(USER_SESSION_KEY);
        if (typeof document !== "undefined") {
          document.cookie = "sugo_session_active=; path=/; max-age=0; SameSite=Lax; Secure";
        }
      } else if (payload?.reason === "REVOKED_BY_USER" || payload?.reason === "REVOKED_ALL_OTHERS") {
        void logout();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user?.id, updateToken, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        isInitializing,
        supersededInfo,
        dismissSupersededNotice,
        isSessionExpired,
        dismissSessionExpiredNotice,
        notifySessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
