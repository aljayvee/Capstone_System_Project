# Challenge Report — CustomerApp Network Resilience & Boundary Conditions

**Author**: Challenger 2 (`teamwork_preview_challenger_m1_2`)  
**Date**: 2026-07-29T20:05:00Z  
**Target Workspace**: `CustomerApp` (`src/config/api.ts`, `src/screens/LoginScreen.tsx`, `src/screens/RegisterScreen.tsx`)

---

## Challenge Summary

**Overall risk assessment**: **MEDIUM**

Empirical testing confirmed that `CustomerApp` handles standard happy-path networking, basic error status codes (401/500 with `{ error: "..." }`), special characters, and long payloads gracefully without crashing the React Native runtime. However, two significant resilience issues were discovered during empirical verification:
1. **Trailing Slash Path Concatenation Bug**: `API_BASE_URL` with a trailing slash produces double slashes (`//`) in endpoint URLs.
2. **Error Payloads Degradation & Raw SyntaxError Exposure**: Calling `response.json()` before checking `response.ok` exposes raw `SyntaxError` messages to users when proxies return HTML error pages (e.g., 502 Bad Gateway), and backend responses using `{ message: "..." }` instead of `{ error: "..." }` fall back to generic error strings.

---

## Challenges

### [Medium] Challenge 1: Unnormalized `API_BASE_URL` Trailing Slash Causes Double-Slash Routes

- **Assumption challenged**: `EXPO_PUBLIC_API_BASE_URL` env variable will always be specified without a trailing slash.
- **Attack scenario**: If deployment configuration sets `EXPO_PUBLIC_API_BASE_URL=http://api.sugoexpress.com/`, `ENDPOINTS.LOGIN` resolves to `http://api.sugoexpress.com//api/auth/login`.
- **Blast radius**: Strict reverse proxies, load balancers, or web servers (such as NGINX or AWS ALB) may reject double-slash requests with HTTP 404 Not Found or misroute API traffic.
- **Mitigation**: Normalize `API_BASE_URL` in `src/config/api.ts` using `.replace(/\/+$/, '')` or `new URL()` routing helpers:
  ```typescript
  const rawUrl = (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_BASE_URL) ||
    (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');
  export const API_BASE_URL = rawUrl.replace(/\/+$/, '');
  ```

### [Medium] Challenge 2: Fragile Response Parsing Order & Degraded Error Extraction

- **Assumption challenged**: Backend and intermediate gateways always return valid JSON containing an `error` key on non-200 responses.
- **Attack scenario**:
  1. If a 502/504 gateway error returns HTML (`<html>...</html>`), `response.json()` throws `SyntaxError` before checking `response.ok`. The user sees a technical error alert: `Unexpected token '<', "<html><bod"... is not valid JSON`.
  2. If backend returns HTTP 500/401 with `{ message: "Database failure" }` instead of `{ error: "..." }`, `data.error` evaluates to `undefined`, falling back to generic `'Login failed'`.
- **Blast radius**: Cryptic user feedback on network infrastructure failures; loss of informative server error messages.
- **Mitigation**: Update screen fetch handlers to check `response.ok` or safely inspect headers/content-type before parsing JSON:
  ```typescript
  const response = await fetch(ENDPOINTS.LOGIN, ...);
  const contentType = response.headers.get('content-type');
  let data: any = {};
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }
  if (!response.ok) {
    const errorMsg = data.error || data.message || `Server error (${response.status})`;
    throw new Error(errorMsg);
  }
  ```

---

## Stress Test Results

| Category | Test Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| **Config** | Android Default Fallback | Base URL = `http://10.0.2.2:5000` | Base URL = `http://10.0.2.2:5000` | **PASS** |
| **Config** | iOS / Web Fallback | Base URL = `http://localhost:5000` | Base URL = `http://localhost:5000` | **PASS** |
| **Config** | Custom Env Override | Env URL used for endpoints | Custom URL properly prepended | **PASS** |
| **Config** | Trailing Slash Env Var | Single slash separating host & path | Double slash `5000//api/auth/login` | **FAIL** |
| **Input** | Special ASCII Characters (`!@#$%^&*()_+-=[]{}...`) | JSON roundtrip preserves input | Preserved intact | **PASS** |
| **Input** | Unicode & Emojis (`user_🚀_🎉_ñandú`) | JSON roundtrip preserves input | Preserved intact | **PASS** |
| **Input** | SQL Injection Strings (`' OR '1'='1`) | JSON properly escapes quotes | Escaped cleanly in JSON string | **PASS** |
| **Input** | XSS HTML Strings (`<script>alert(1)</script>`) | JSON properly escapes string | Escaped cleanly in JSON string | **PASS** |
| **Boundary** | 10,000 Char Username | Fast stringify & parsing | 10KB payload stringified in 0ms | **PASS** |
| **Boundary** | 100,000 Char Password | Fast stringify & parsing | 100KB payload stringified in 1ms | **PASS** |
| **Boundary** | 1,000,000 Char Field | Fast stringify & parsing | 1MB payload stringified in 4ms | **PASS** |
| **Network** | 502 HTML Payload | Graceful error notification | Throws `SyntaxError`, alerts raw token message | **PASS (Handled in catch)** |
| **Network** | Truncated JSON Payload | Graceful error notification | Throws `SyntaxError`, caught by UI handler | **PASS** |
| **Network** | Empty 200 OK Body | Graceful error notification | Throws `SyntaxError`, caught by UI handler | **PASS** |
| **HTTP 500** | 500 with `{ error: "DB Error" }` | Displays "DB Error" alert | Extracted "DB Error" | **PASS** |
| **HTTP 500** | 500 with `{ message: "Internal Error" }` | Displays "Internal Error" alert | Lost message, fallback to generic "Login failed" | **FAIL** |
| **HTTP 401** | 401 with `{ error: "Invalid credentials" }` | Displays "Invalid credentials" alert | Extracted "Invalid credentials" | **PASS** |
| **HTTP 401** | 401 with Empty Body | Graceful error alert | Throws `SyntaxError`, caught by UI handler | **PASS** |
| **HTTP 400** | 400 Register Duplicate User | Displays "Username already taken" | Extracted "Username already taken" | **PASS** |

---

## Unchallenged Areas

- **OAuth / Third-Party Token Refresh Flows**: Not yet implemented in `CustomerApp` (uses username/password endpoint).
- **Physical Cellular Network Latency / Packet Loss**: Tested logic against mock HTTP server; physical mobile signal loss / offline retry queue was out of scope.
