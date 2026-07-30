# Forensic Audit Report

**Work Product**: `c:\Capstone_Project_Web\Backend` and `c:\Capstone_Project_Web\CustomerApp`  
**Auditor**: Forensic Auditor 1 (`teamwork_preview_auditor_m1_1`)  
**Profile**: General Project (Development / Demo / Benchmark strict integrity standard)  
**Verdict**: **CLEAN**

---

## 1. Executive Summary

A comprehensive, empirical forensic integrity audit was conducted on the Milestone 1 codebase covering `Backend` (`c:\Capstone_Project_Web\Backend`) and `CustomerApp` (`c:\Capstone_Project_Web\CustomerApp`). All source code, database drivers, authentication mechanisms, network configurations, screen controllers, build processes, typechecks, and test suites were independently inspected and executed.

No facade implementations, dummy functions, hardcoded test results, or mock network responses were detected. Real MariaDB SQL queries and real `bcrypt` operations are implemented in the Express backend, and genuine `fetch` HTTP requests targeting `http://10.0.2.2:5000` (Android) / `http://localhost:5000` (iOS/Web) are implemented in CustomerApp. All automated tests and static analysis checks passed without error.

---

## 2. Phase Inspection & Forensic Results

### Phase 1: Source Code Integrity & Facade Check
- **Hardcoded Test Results / Static Mocks**: **PASS** — No hardcoded outputs or fake returns exist in production code paths.
- **Facade / Dummy Implementations**: **PASS** — All controllers and utility modules contain genuine operational logic.
- **Pre-populated Verification Artifacts**: **PASS** — No pre-baked log files or fake verification certificates exist.

### Phase 2: Backend Core Implementation (`Backend/src/server.js` & `db.js`)
- **MariaDB Connection Pool**: **PASS** — `Backend/src/db.js` uses `mysql2/promise` to establish connection pools and executes `CREATE TABLE IF NOT EXISTS users` schema initialization.
- **SQL Execution**: **PASS** — `Backend/src/server.js` executes parameterized MariaDB SQL queries:
  - Registration duplicate check: `SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1`
  - User insertion: `INSERT INTO users (username, passwordHash, email, firstName, lastName, phone, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`
  - User retrieval by ID: `SELECT * FROM users WHERE id = ?`
  - User retrieval by username: `SELECT * FROM users WHERE username = ? LIMIT 1`
- **Bcrypt Hashing & Comparison**: **PASS** — `server.js` uses `await bcrypt.hash(password, 10)` in `handleRegister` and `await bcrypt.compare(password, hashToCompare)` in `handleLogin`.

### Phase 3: CustomerApp Network & API Configuration (`CustomerApp`)
- **API Configuration (`src/config/api.ts`)**: **PASS** — Dynamically resolves `API_BASE_URL` to `http://10.0.2.2:5000` for Android emulator environment and `http://localhost:5000` for iOS/Web environments. Defines `ENDPOINTS.LOGIN` (`/api/auth/login`) and `ENDPOINTS.REGISTER` (`/api/users`).
- **Login Screen (`src/screens/LoginScreen.tsx`)**: **PASS** — Implements authentic network request via `fetch(ENDPOINTS.LOGIN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })`.
- **Register Screen (`src/screens/RegisterScreen.tsx`)**: **PASS** — Implements authentic network request via `fetch(ENDPOINTS.REGISTER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, role: 'CUSTOMER' }) })`.

### Phase 4: Verification Suite & Typecheck Execution
- **Backend Verification Suite (`verify-backend.js`)**: **PASS**
  - Command: `node verify-backend.js` in `Backend`
  - Result: 19 Passed, 0 Failed.
  - Verified: Registration HTTP 201, DB persistence, bcrypt hash format (`$2a$` / `$2b$`), `bcrypt.compare` verification, Login 200 OK, 401 Unauthorized (invalid password/user), 400 Bad Request (missing/duplicate fields).
- **CustomerApp TypeScript Verification**: **PASS**
  - Command: `npx tsc --noEmit` in `CustomerApp`
  - Result: Exit code 0 (0 errors).
- **CustomerApp Jest Test Suite**: **PASS**
  - Command: `npm test -- --passWithNoTests` in `CustomerApp`
  - Result: 6 test suites passed, 13 tests passed.

---

## 3. Raw Verification Evidence

### Command 1: `node verify-backend.js` (Cwd: `c:\Capstone_Project_Web\Backend`)
```text
==================================================
Backend & MariaDB Integration Verification Suite
==================================================
Server is already running on port 5000.

1. Testing User Registration POST (/register and /api/users)...
  [PASS] POST /register returns 201/200 HTTP status (got 201)
  [PASS] POST /register response returns matching username
  [PASS] POST /register response sanitizes/omits passwordHash
  [PASS] POST /api/users returns 201/200 HTTP status (got 201)
  [PASS] POST /api/users response returns matching username

2. Testing MariaDB Database Query & Bcrypt Persistence...
  [PASS] User record is persisted in MariaDB `users` table
  [PASS] Database record contains password hash column
  [PASS] Stored password is encrypted using valid bcrypt hash format ($2a$/$2b$)
  [PASS] bcrypt.compare returns true for plain password vs DB hash

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

==================================================
Verification Complete: 19 PASSED, 0 FAILED
==================================================
```

### Command 2: `npx tsc --noEmit` (Cwd: `c:\Capstone_Project_Web\CustomerApp`)
```text
Exit Code: 0
Stdout: (empty - clean)
Stderr: (empty - clean)
```

### Command 3: `npm test -- --passWithNoTests` (Cwd: `c:\Capstone_Project_Web\CustomerApp`)
```text
PASS src/__tests__/AuthApiConfig.test.tsx (11.071 s)
PASS src/__tests__/CheckoutScreen.test.tsx (15.969 s)
PASS src/__tests__/ServiceListScreen.test.tsx (18.126 s)
PASS src/__tests__/OrderConfirmationScreen.test.tsx (18.61 s)
PASS src/__tests__/OrderFormScreen.test.tsx (18.564 s)
PASS src/__tests__/Navigation.test.tsx (20.448 s)

Test Suites: 6 passed, 6 total
Tests:       13 passed, 13 total
Snapshots:   0 total
Time:        26.325 s
Ran all test suites.
```

---

## 4. Final Verdict

**FINAL VERDICT: CLEAN**  
The work products in `c:\Capstone_Project_Web\Backend` and `c:\Capstone_Project_Web\CustomerApp` meet all integrity and functional requirements without violations.
