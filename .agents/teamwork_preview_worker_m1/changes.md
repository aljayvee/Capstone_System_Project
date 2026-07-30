# Execution & Modification Report — teamwork_preview_worker_m1

## Executive Summary
This document provides the full execution report, code modification summary, build output logs, and test verification results for Milestone 1 Backend Initialization & CustomerApp Network Integration.

---

## 1. Summary of Changes

### Backend (`c:\Capstone_Project_Web\Backend`)
1. **`package.json`**:
   - Initialized project with `express`, `mysql2`, `bcrypt`, `bcryptjs`, `cors`, and `dotenv`.
   - Defined start script `"start": "node src/server.js"` and test script `"test": "node verify-backend.js"`.
2. **`init.sql`**:
   - Created database initialization script defining the `users` and `customers` table schemas.
3. **`src/db.js`**:
   - Implemented MariaDB connection pool supporting automatic credential fallback (`root` user with passwords `'root'`, `'password'`, or `''`).
   - Automatically creates `capstone_db` database and table schemas if non-existent.
4. **`src/server.js`**:
   - Express server listening on `PORT 5000`, host `0.0.0.0` with CORS middleware and JSON error handling middleware.
   - User Registration endpoints: `POST /register` and alias `POST /api/users`. Validates input, checks duplicate username/email (HTTP 400), hashes password using `bcrypt` salt round 10, inserts into MariaDB, and returns HTTP 201 Created with sanitized user object (omitting `passwordHash`).
   - User Login endpoints: `POST /login` and alias `POST /api/auth/login`. Validates input, queries MariaDB, verifies password with `bcrypt.compare`, and returns HTTP 200 OK with user profile and session token (or HTTP 401 Unauthorized on invalid credentials).
5. **`verify-backend.js`**:
   - Comprehensive test suite covering 5 test categories:
     1. User registration POST (`/register` and `/api/users`)
     2. MariaDB database query & bcrypt passwordHash persistence verification across separated tables
     3. User login POST 200 OK success
     4. User login POST 401 Unauthorized invalid password failure
     5. Input validation 400 Bad Request (missing required fields, duplicate users, malformed JSON)

### CustomerApp (`c:\Capstone_Project_Web\CustomerApp`)
1. **`src/config/api.ts`**:
   - Created centralized API configuration module setting `API_BASE_URL` to `http://10.0.2.2:5000` on Android emulator and `http://localhost:5000` elsewhere, stripped of trailing slashes.
   - Defined `ENDPOINTS` object for `LOGIN` (`/api/auth/login`) and `REGISTER` (`/api/users`).
2. **`src/screens/LoginScreen.tsx`**:
   - Updated login fetch call to import and use `ENDPOINTS.LOGIN` with error fallback handling.
3. **`src/screens/RegisterScreen.tsx`**:
   - Updated registration fetch call to import and use `ENDPOINTS.REGISTER` with error fallback handling.
4. **`src/__tests__/AuthApiConfig.test.tsx`**:
   - Added unit test suite verifying `API_BASE_URL` (no trailing slashes) and `ENDPOINTS` (no double slashes).

---

## 2. Verification Command Log & Test Outputs

### A. Backend Integration Verification (`node verify-backend.js`)
```
==================================================
Backend & MariaDB Integration Verification Suite
==================================================
Starting server in verification process...
MariaDB connected successfully with password: ""
Database schemas (users & customers) verified/initialized in database "capstone_db".

1. Testing User Registration POST (/register and /api/users)...
Express MariaDB Backend Server running on http://0.0.0.0:5000
  [PASS] POST /register returns 201/200 HTTP status (got 201)
  [PASS] POST /register response returns matching username
  [PASS] POST /register response sanitizes/omits passwordHash
  [PASS] POST /api/users returns 201/200 HTTP status (got 201)
  [PASS] POST /api/users response returns matching username

2. Testing MariaDB Database Query & Table Separation...
  [PASS] CUSTOMER user record is persisted in MariaDB `customers` table
  [PASS] Customer record contains password hash column
  [PASS] Stored customer password is encrypted using valid bcrypt hash format ($2a$/$2b$)
  [PASS] bcrypt.compare returns true for customer password vs DB hash
  [PASS] RIDER user record is persisted in separate MariaDB `users` table

3. Testing User Login POST 200 OK Success...
  [PASS] POST /login returns HTTP 200 OK (got 200)
  [PASS] POST /login response returns user profile data
  [PASS] POST /login response omits passwordHash
  [PASS] POST /api/auth/login returns HTTP 200 OK (got 200)

4. Testing User Login POST 401 Unauthorized Failure...
  [PASS] Incorrect password returns HTTP 401 Unauthorized (got 401)
  [PASS] 401 response contains error payload
  [PASS] Non-existent user returns HTTP 401 Unauthorized (got 401)

5. Testing Input Validation 400 Bad Request...
  [PASS] Registration missing required fields returns HTTP 400 Bad Request (got 400)
  [PASS] Login missing password returns HTTP 400 Bad Request (got 400)
  [PASS] Duplicate user registration returns HTTP 400 Bad Request (got 400)
  [PASS] Malformed JSON payload returns HTTP 400 Bad Request (got 400)

==================================================
Verification Complete: 21 PASSED, 0 FAILED
==================================================
```

### B. CustomerApp Typecheck (`npx tsc --noEmit`)
```
Exit Code: 0 (0 compilation errors)
```

### C. CustomerApp Jest Unit Tests (`npm test`)
```
> customerapp@1.0.0 test
> jest

PASS src/__tests__/AuthApiConfig.test.tsx (5.906 s)
PASS src/__tests__/OrderFormScreen.test.tsx (9.639 s)
PASS src/__tests__/OrderConfirmationScreen.test.tsx (10.029 s)
PASS src/__tests__/CheckoutScreen.test.tsx (10.277 s)
PASS src/__tests__/ServiceListScreen.test.tsx (10.548 s)
PASS src/__tests__/Navigation.test.tsx (13.476 s)

Test Suites: 6 passed, 6 total
Tests:       13 passed, 13 total
Snapshots:   0 total
Time:        16.822 s
Ran all test suites.
```
