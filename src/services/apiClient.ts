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
          { withCredentials: true }
        );

        const newAccessToken = res.data.token;
        setMemoryAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setMemoryAccessToken(null);
        if (onLogoutCallback) {
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
