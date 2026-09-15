import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, AuthContextType } from "../types/auth";
import { setMemoryAccessToken, getMemoryAccessToken, setOnLogoutCallback, apiClient } from "../services/apiClient";

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

  const updateToken = useCallback((newToken: string | null) => {
    setMemoryAccessToken(newToken);
    setTokenState(newToken);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout").catch(() => {});
    } finally {
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        isInitializing,
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
