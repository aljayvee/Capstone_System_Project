# Explorer 3 Analysis Report: CustomerApp Network Integration & Backend Verification

## Executive Summary
This report provides a comprehensive analysis and design specification for Milestone 1 & 2 network integration and backend test verification in `c:\Capstone_Project_Web`. Specifically, it addresses:
1. **Android Emulator Network Compatibility**: The root cause of `java.net.ConnectException` when using `http://localhost:5000` inside React Native Android emulator, and the design of a centralized configuration module (`CustomerApp/src/config/api.ts`) pointing to `http://10.0.2.2:5000`.
2. **CustomerApp Screen Refactoring**: Specific code modifications for `LoginScreen.tsx` and `RegisterScreen.tsx` to adopt the centralized API configuration.
3. **Backend Test Verification Suite**: Complete design of `verify-backend.js` to test registration, MariaDB database persistence and bcrypt password hash verification, login success (200 OK), and invalid credential failure (401 Unauthorized).

---

## 1. Problem Statement & Root Cause Analysis

### 1.1 Android Emulator Loopback Networking (`java.net.ConnectException`)
- **Current Code Inspection**:
  - `CustomerApp/src/screens/LoginScreen.tsx:18`: `fetch('http://localhost:5000/api/auth/login', ...)`
  - `CustomerApp/src/screens/RegisterScreen.tsx:23`: `fetch('http://localhost:5000/api/users', ...)`
- **Root Cause**:
  - On the Android operating system running inside the Android emulator, `localhost` (IP `127.0.0.1`) refers to the emulator instance itself (the Android device), NOT the host machine (Windows workstation) running the Express server.
  - Attempting to send HTTP requests to `http://localhost:5000` from within the Android emulator throws a `java.net.ConnectException: Failed to connect to localhost/127.0.0.1:5000`.
- **Solution**:
  - The Android emulator provides a special network alias: `10.0.2.2`.
  - IP `10.0.2.2` routes traffic from the virtual device loopback interface to `127.0.0.1` on the development host computer.

---

## 2. CustomerApp Network Configuration Design

### 2.1 Centralized Configuration (`CustomerApp/src/config/api.ts`)
To prevent hardcoded IP addresses scattered across multiple screens and enable seamless switching between Android emulator, iOS simulator, physical devices, and environment variables, a centralized API config module must be created.

#### Proposed File: `CustomerApp/src/config/api.ts`
```typescript
import { Platform } from 'react-native';

/**
 * Default API Base URL for CustomerApp.
 * - Android Emulator uses `http://10.0.2.2:5000` to reach localhost on host machine.
 * - iOS Simulator / Web / standard local dev uses `http://localhost:5000`.
 * - Can be overridden via Expo public environment variable `EXPO_PUBLIC_API_BASE_URL`.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');

export const ENDPOINTS = {
  // Authentication & Registration endpoints
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/users`,
  
  // Direct endpoint aliases supported by backend
  LOGIN_DIRECT: `${API_BASE_URL}/login`,
  REGISTER_DIRECT: `${API_BASE_URL}/register`,
};
```

---

### 2.2 Refactoring CustomerApp Screens

#### A. `CustomerApp/src/screens/LoginScreen.tsx`
- **Current**:
```typescript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});
```
- **Proposed Patch**:
```typescript
import { ENDPOINTS } from '../config/api';

// Inside handleLogin:
const response = await fetch(ENDPOINTS.LOGIN, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});
```

#### B. `CustomerApp/src/screens/RegisterScreen.tsx`
- **Current**:
```typescript
const response = await fetch('http://localhost:5000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...formData, role: 'CUSTOMER' }),
});
```
- **Proposed Patch**:
```typescript
import { ENDPOINTS } from '../config/api';

// Inside handleRegister:
const response = await fetch(ENDPOINTS.REGISTER, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...formData, role: 'CUSTOMER' }),
});
```

---

## 3. Backend Verification Test Suite Design

### 3.1 Test Suite Requirements
The backend verification script (`Backend/verify-backend.js`) must programmatically test and validate the following acceptance criteria:
1. **User Registration**: `POST /register` or `POST /api/users` handles payload `{ username, password, email, firstName, lastName, phone, role }` and returns 201 Created / 200 OK.
2. **MariaDB Persistence & Password Hashing**: Verifies that user data is inserted into the `users` database table and that the stored password is encrypted using `bcrypt` (starts with `$2a$` or `$2b$`).
3. **Login Success**: `POST /login` or `POST /api/auth/login` with valid credentials returns 200 OK and a sanitized user object (omitting sensitive fields like `passwordHash`).
4. **401 Login Failure**: `POST /login` or `POST /api/auth/login` with an incorrect password or non-existent username returns HTTP status 401 Unauthorized.
5. **Validation Failure**: Missing required fields returns HTTP status 400 Bad Request.

---

### 3.2 Full Test Script Specification: `Backend/verify-backend.js`

```javascript
/**
 * Backend & MariaDB Integration Verification Script
 * Executed via: node verify-backend.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'capstone_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

async function runVerification() {
  console.log("==================================================");
  console.log("Backend & MariaDB Integration Verification Suite");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  async function postJSON(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await response.json();
      return { status: response.status, body };
    } catch (err) {
      return { status: 0, error: err.message };
    }
  }

  const timestamp = Date.now();
  const testUser = {
    username: `customer_${timestamp}`,
    password: 'SecurePassword123!',
    email: `customer_${timestamp}@example.com`,
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '09171234567',
    role: 'CUSTOMER',
  };

  // ----------------------------------------------------
  // Test 1: Registration Endpoint (POST /api/users & POST /register)
  // ----------------------------------------------------
  console.log("\n1. Testing Registration Endpoint (POST /api/users)...");
  const regRes = await postJSON('/api/users', testUser);
  assert(
    regRes.status === 201 || regRes.status === 200,
    `Registration returns 201/200 HTTP status (got ${regRes.status})`
  );
  assert(
    regRes.body && (regRes.body.user?.username === testUser.username || regRes.body.username === testUser.username),
    "Registration response returns matching username"
  );
  assert(
    regRes.body && !regRes.body.user?.passwordHash && !regRes.body.passwordHash,
    "Registration response sanitizes/omits passwordHash"
  );

  // ----------------------------------------------------
  // Test 2: Database Persistence & Bcrypt Hashing
  // ----------------------------------------------------
  console.log("\n2. Testing MariaDB Database Persistence & Password Hashing...");
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      [testUser.username]
    );

    assert(rows.length > 0, "User record is persisted in MariaDB `users` table");
    if (rows.length > 0) {
      const dbUser = rows[0];
      const hashField = dbUser.password_hash || dbUser.passwordHash;
      assert(Boolean(hashField), "Database row contains password hash column");
      assert(
        typeof hashField === 'string' && (hashField.startsWith('$2a$') || hashField.startsWith('$2b$')),
        "Stored password is encrypted using valid bcrypt hash format"
      );
      
      const isBcryptMatch = await bcrypt.compare(testUser.password, hashField);
      assert(isBcryptMatch === true, "bcrypt.compare returns true for plain password vs DB hash");
    }
  } catch (dbErr) {
    console.error(`  [FAIL] MariaDB Connection / Query Error: ${dbErr.message}`);
    failed++;
  } finally {
    if (connection) await connection.end();
  }

  // ----------------------------------------------------
  // Test 3: Login Success (200 OK)
  // ----------------------------------------------------
  console.log("\n3. Testing Successful Login (POST /api/auth/login)...");
  const loginSuccess = await postJSON('/api/auth/login', {
    username: testUser.username,
    password: testUser.password,
  });
  assert(loginSuccess.status === 200, `Valid credentials return HTTP 200 OK (got ${loginSuccess.status})`);
  assert(
    loginSuccess.body && (loginSuccess.body.user?.username === testUser.username || loginSuccess.body.username === testUser.username),
    "Login response returns user profile data"
  );
  assert(
    loginSuccess.body && !loginSuccess.body.user?.passwordHash && !loginSuccess.body.passwordHash,
    "Login response omits passwordHash"
  );

  // ----------------------------------------------------
  // Test 4: 401 Unauthorized Login Failures
  // ----------------------------------------------------
  console.log("\n4. Testing 401 Unauthorized Login Failures...");
  
  // 4a. Wrong Password
  const loginBadPass = await postJSON('/api/auth/login', {
    username: testUser.username,
    password: 'WrongPassword999!',
  });
  assert(loginBadPass.status === 401, `Incorrect password returns HTTP 401 Unauthorized (got ${loginBadPass.status})`);
  assert(Boolean(loginBadPass.body?.error), "401 response contains error message");

  // 4b. Non-Existent User
  const loginUnknownUser = await postJSON('/api/auth/login', {
    username: 'non_existent_user_999999',
    password: 'Password123!',
  });
  assert(loginUnknownUser.status === 401, `Non-existent username returns HTTP 401 Unauthorized (got ${loginUnknownUser.status})`);

  // ----------------------------------------------------
  // Test 5: Input Validation (400 Bad Request)
  // ----------------------------------------------------
  console.log("\n5. Testing Input Validation (400 Bad Request)...");
  const regMissingFields = await postJSON('/api/users', { username: 'incomplete_user' });
  assert(regMissingFields.status === 400, `Registration missing required fields returns HTTP 400 Bad Request (got ${regMissingFields.status})`);

  console.log("\n==================================================");
  console.log(`Verification Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
```

---

## 4. Verification & Testing Matrix

| Scenario | Target | Input / Action | Expected Result |
|---|---|---|---|
| Android Emulator Networking | `CustomerApp/src/config/api.ts` | Request from Android device | Resolves to `10.0.2.2:5000` avoiding `ConnectException` |
| Registration Success | `POST /api/users` | `{ username, password, email, ... }` | HTTP 201/200, user created, password hashed |
| DB Persistence & Security | MariaDB `users` table | `SELECT * FROM users` | Password column contains bcrypt `$2a$` / `$2b$` string |
| Login Success | `POST /api/auth/login` | Valid `{ username, password }` | HTTP 200 OK, user object returned without `passwordHash` |
| Login Unauthorized | `POST /api/auth/login` | Invalid password or unknown user | HTTP 401 Unauthorized, error string returned |
| TypeScript Compilation | `CustomerApp` | `npx tsc --noEmit` | Returns 0 compilation errors |

---

## 5. Summary & Handoff Recommendation
- **Actionable Files**:
  1. `CustomerApp/src/config/api.ts` (new file)
  2. `CustomerApp/src/screens/LoginScreen.tsx` (update fetch URL import)
  3. `CustomerApp/src/screens/RegisterScreen.tsx` (update fetch URL import)
  4. `Backend/verify-backend.js` (new integration test suite)
- All proposed changes are fully documented with concrete snippets and verification steps.
