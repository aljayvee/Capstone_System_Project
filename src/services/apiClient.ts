import axios from "axios";

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000/api";

// Requests that must never trigger the silent-refresh retry below.
const AUTH_ENDPOINT_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/complete-profile",
  "/auth/verify-login-otp",
  "/auth/resend-login-otp",
];

// In-Memory Access Token Storage (Never written to localStorage/sessionStorage)
let memoryAccessToken: string | null = null;
let onLogoutCallback: (() => void) | null = null;

export const setMemoryAccessToken = (token: string | null) => {
  memoryAccessToken = token;
};

export const getMemoryAccessToken = (): string | null => {
  return memoryAccessToken;
};

export const setOnLogoutCallback = (cb: () => void) => {
  onLogoutCallback = cb;
};

/**
 * A stable identity for this browser, sent as `x-device-id`.
 *
 * Both mobile apps have always sent one; the portal never did, so the server's
 * single-device guard had no way to tell "the same dispatcher signing in again
 * on the browser they always use" from "someone on another machine". It treated
 * every portal login as a new device, reported the dispatcher's own earlier
 * session back to them as "another device active", and confirming it signed
 * out any tab still holding that session - the reload that logged people out.
 *
 * localStorage rather than sessionStorage: it has to be the same across every
 * tab of this browser, since the tabs share one refresh cookie. Where storage
 * is unavailable (some private modes) no header is sent at all, which leaves
 * the server behaving exactly as it did before this existed.
 */
const DEVICE_ID_KEY = "sugo_device_id";

function getDeviceId(): string | null {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `web-${crypto.randomUUID()}`
          : `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** Headers every call must carry, including the raw axios refresh below. */
export const deviceHeaders = (): Record<string, string> => {
  const id = getDeviceId();
  return id ? { "x-device-id": id } : {};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Required for HttpOnly refresh cookie support
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor — Attach JWT Bearer token from memory
apiClient.interceptors.request.use(
  (config) => {
    if (memoryAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${memoryAccessToken}`;
    }
    // On every request, not only login: the server also compares it on each
    // refresh rotation, so a refresh that arrived without it would read as a
    // different device from the one that signed in.
    if (config.headers) {
      for (const [name, value] of Object.entries(deviceHeaders())) {
        config.headers[name] = value;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor — Silent Token Refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite refresh loops on the endpoints that establish a session in
    // the first place. The sign-in challenge endpoints belong here too: they can
    // legitimately 401 (expired or already-used challenge), and letting the
    // interceptor react to that would silently re-submit an OTP — burning an
    // attempt — and then log the user out of an unrelated tab when the refresh
    // it attempted also failed.
    const isAuthEndpoint = AUTH_ENDPOINT_PATHS.some((path) => originalRequest?.url?.includes(path));

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt silent token refresh via HttpOnly cookie
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          // Raw axios, not apiClient, so the request interceptor never sees it -
          // the device header has to be attached by hand or this one refresh
          // would reach the server looking like a different device.
          { withCredentials: true, headers: deviceHeaders() }
        );

        const newAccessToken = res.data.token;
        setMemoryAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr: any) {
        processQueue(refreshErr, null);
        setMemoryAccessToken(null);
        const errorMsg = String(
          refreshErr?.response?.data?.error || refreshErr?.response?.data?.message || ""
        );
        const isSuperseded =
          errorMsg.toLowerCase().includes("another device") ||
          errorMsg.includes("SUPERSEDED");

        if (isSuperseded && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("sugo:session-superseded", {
              detail: {
                reason: "SUPERSEDED_BY_ANOTHER_DEVICE",
                deviceInfo: "Another Device",
                ipAddress: "External IP",
                timestamp: new Date().toISOString(),
              },
            })
          );
        } else if (onLogoutCallback) {
          onLogoutCallback();
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
