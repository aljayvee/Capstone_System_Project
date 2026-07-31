# Authentication, Security & Stability Rule Set

## 1. JWT Authentication Architecture

### 1.1 Token Storage
- **NEVER store JWT tokens in `localStorage`** — vulnerable to XSS attacks.
- Store `accessToken` in **memory (React state/context)** only.
- Store `refreshToken` in an **HttpOnly cookie** (set by the backend) so JavaScript cannot access it.
- If HttpOnly cookies are not yet set up, use `sessionStorage` as a temporary fallback — NEVER `localStorage`.

### 1.2 Token Structure & Expiry
- `accessToken` → short-lived (15 minutes recommended).
- `refreshToken` → longer-lived (7 days recommended).
- Always decode and check token expiry before making API calls using a utility like:
  ```ts
  // src/utils/tokenUtils.ts
  export const isTokenExpired = (token: string): boolean => {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= exp * 1000;
  };
  ```

### 1.3 Token Refresh Flow
- Implement a **silent refresh** mechanism: before every API call, check if `accessToken` is expired and automatically call `/auth/refresh` to get a new one.
- All API calls MUST go through a centralized Axios instance (`src/services/apiClient.ts`) with an **interceptor** that handles refresh automatically.
- Example interceptor pattern:
  ```ts
  // src/services/apiClient.ts
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Attempt token refresh
        const newToken = await refreshAccessToken();
        if (newToken) {
          error.config.headers['Authorization'] = `Bearer ${newToken}`;
          return axiosInstance.request(error.config);
        } else {
          // Refresh failed — force logout
          logout();
        }
      }
      return Promise.reject(error);
    }
  );
  ```

### 1.4 Auth Context
- Wrap the entire app in a single `AuthProvider` (`src/context/AuthContext.tsx`).
- Expose: `user`, `accessToken`, `login()`, `logout()`, `isAuthenticated`.
- NEVER pass raw tokens as props — consume auth state via the context hook only.

---

## 2. Protected Routes

- ALL non-public pages MUST be wrapped in a `<ProtectedRoute>` component.
- `ProtectedRoute` checks `isAuthenticated` from `AuthContext` and redirects to `/login` if false.
- Implement **role-based access control (RBAC)**:
  - Roles: `owner`, `dispatcher`, `rider`, `customer`
  - Each portal route MUST verify the correct role before rendering.
  ```tsx
  // src/components/ProtectedRoute.tsx
  <ProtectedRoute allowedRoles={['owner', 'dispatcher']}>
    <OwnerDashboard />
  </ProtectedRoute>
  ```

---

## 3. API Communication Standards

### 3.1 Centralized API Client
- ALL HTTP calls MUST use the single Axios instance at `src/services/apiClient.ts`.
- NEVER use raw `fetch()` or create ad-hoc Axios instances in components.
- Always attach `Authorization: Bearer <token>` header via the interceptor — not manually per call.

### 3.2 Request & Response Handling
- Every API call MUST be wrapped in `try/catch`.
- On error, extract the `error.response.data.message` for user-facing messages, not raw error objects.
- Always handle these HTTP status codes explicitly:
  | Status | Action |
  |---|---|
  | `200/201` | Success — update UI state |
  | `400` | Show field-level validation error to user |
  | `401` | Attempt token refresh, then re-request |
  | `403` | Show "Access Denied" and redirect to appropriate portal |
  | `404` | Show "Not Found" empty state |
  | `500` | Show generic "Server Error, please try again" toast |

### 3.3 Loading & Error States
- Every async operation MUST track three states: `isLoading`, `data`, `error`.
- NEVER show raw API error messages to the user — always use human-readable equivalents.
- Use toast notifications (e.g., `react-hot-toast`) for non-blocking feedback.
- Use inline error messages for form field validation errors.

---

## 4. Input Validation & Sanitization

- Validate ALL user inputs on **both frontend and backend** — never trust frontend-only validation.
- Frontend: use `zod` or `yup` schema validation on all forms.
- Backend: sanitize and validate every request body before processing.
- Specific rules:
  - Phone numbers: validate format before submission.
  - Prices/amounts: must be positive numbers, enforce min/max limits.
  - File uploads: validate file type and size on both ends.
  - Free-text fields: strip HTML tags to prevent XSS injection.

---

## 5. Bug Control & Stability Practices

### 5.1 Error Boundaries
- Wrap all major page-level components in a React `ErrorBoundary` to prevent full app crashes from isolated component errors.
- Display a friendly fallback UI instead of a blank screen on render errors.

### 5.2 Console Discipline
- `console.log()` is **forbidden in production code**. Use a centralized logger utility:
  ```ts
  // src/utils/logger.ts
  const logger = {
    info: (msg: string, data?: unknown) => { if (import.meta.env.DEV) console.log(msg, data); },
    error: (msg: string, err?: unknown) => { if (import.meta.env.DEV) console.error(msg, err); },
  };
  export default logger;
  ```

### 5.3 TypeScript Strictness
- NEVER use `any` type — use proper interfaces or `unknown` with type guards.
- All API response shapes MUST be typed in `src/types/` (e.g., `src/types/errand.ts`, `src/types/user.ts`).
- Enable `strict: true` in `tsconfig.json` — do not disable it.

### 5.4 Null & Undefined Safety
- Always use optional chaining (`?.`) and nullish coalescing (`??`) for potentially undefined values.
- NEVER assume API responses are non-null without checking.

### 5.5 Async Safety
- Always `await` promises inside `try/catch`.
- Cancel async operations on component unmount using `AbortController` to prevent memory leaks:
  ```ts
  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, []);
  ```

---

## 6. Environment & Secret Management

- ALL sensitive values (API URLs, Firebase keys, DB credentials) MUST live in `.env` files.
- `.env` MUST be listed in `.gitignore` — NEVER commit secrets to GitHub.
- Access env vars only via `import.meta.env.VITE_*` (Vite) — never hardcode values.
- Maintain separate `.env.development` and `.env.production` files.

---

## 7. Logout & Session Cleanup

- On logout, MUST:
  1. Clear `accessToken` from memory/context.
  2. Call backend `/auth/logout` endpoint to invalidate `refreshToken` on server.
  3. Clear any cached user data from state.
  4. Redirect to `/login`.
- Implement **auto-logout** on token refresh failure or on `403` responses.

---

## 8. Client-Side Key Exposure & Rate Limiting Rules

### 8.1 Client-Side Environment Exposure
- All `VITE_*` environment variables in Vite are compiled into the client JS bundle and exposed to browser DevTools (F12).
- NEVER place backend secrets (DB passwords, `JWT_SECRET`, private API keys) in frontend code or `.env` files.

### 8.2 API Key Provider Restrictions
- Public client-side API keys (e.g. `VITE_GOOGLE_MAPS_API_KEY`) MUST be secured at the provider level:
  - **Google Maps**: Restrict key usage in Google Cloud Console to authorized HTTP referrers (`https://yourdomain.com/*`).
  - **Firebase**: Enforce Firebase Security Rules to restrict unauthorized database reads/writes.

### 8.3 Rate Limiting for Auth Endpoints
- Authentication routes (`/api/auth/login`, `/api/customers/login`) MUST be protected with `express-rate-limit` (e.g. max 5-10 failed login attempts per 15-minute window per IP) to defend against brute-force attacks.

