# Handoff Report — Forensic Auditor 1 (`teamwork_preview_auditor_m1_1`)

## 1. Observation
- **Backend Database and Server Code**:
  - In `c:\Capstone_Project_Web\Backend\src\db.js` (lines 43-71), MariaDB connection pool is configured using `mysql2/promise` with schema table creation `CREATE TABLE IF NOT EXISTS users (...)`.
  - In `c:\Capstone_Project_Web\Backend\src\server.js`, user registration (`handleRegister`, lines 19-82) executes parameterized queries (`SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1`, `INSERT INTO users (...) VALUES (...)`, `SELECT * FROM users WHERE id = ?`) and computes password hash using `await bcrypt.hash(password, 10)`. User login (`handleLogin`, lines 85-132) executes `SELECT * FROM users WHERE username = ? LIMIT 1` and checks passwords using `await bcrypt.compare(password, hashToCompare)`.
- **CustomerApp API and Screen Code**:
  - In `c:\Capstone_Project_Web\CustomerApp\src\config\api.ts` (lines 10-19), `API_BASE_URL` resolves to `http://10.0.2.2:5000` on Android platforms and `http://localhost:5000` elsewhere. `ENDPOINTS.LOGIN` is `${API_BASE_URL}/api/auth/login` and `ENDPOINTS.REGISTER` is `${API_BASE_URL}/api/users`.
  - In `CustomerApp\src\screens\LoginScreen.tsx` (line 20), login triggers `fetch(ENDPOINTS.LOGIN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })`.
  - In `CustomerApp\src\screens\RegisterScreen.tsx` (line 25), registration triggers `fetch(ENDPOINTS.REGISTER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, role: 'CUSTOMER' }) })`.
- **Verification Command Execution**:
  - Ran `node verify-backend.js` in `c:\Capstone_Project_Web\Backend`: Returned `19 PASSED, 0 FAILED`.
  - Ran `npx tsc --noEmit` in `c:\Capstone_Project_Web\CustomerApp`: Exit code `0` (0 errors).
  - Ran `npm test -- --passWithNoTests` in `c:\Capstone_Project_Web\CustomerApp`: `6 passed, 6 total` test suites, `13 passed, 13 total` tests.

## 2. Logic Chain
1. Code inspection confirms that `Backend/src/server.js` and `db.js` use actual SQL queries against MariaDB via `mysql2/promise` and real `bcrypt` functions rather than dummy functions, mocks, or hardcoded return objects.
2. Code inspection confirms that `CustomerApp/src/config/api.ts`, `LoginScreen.tsx`, and `RegisterScreen.tsx` perform genuine HTTP network requests via `fetch` pointing to host port `5000` (`http://10.0.2.2:5000` / `http://localhost:5000`).
3. Running `node verify-backend.js` against the live backend server empirically proves that database records are stored in MariaDB, bcrypt password hashes (`$2a$` / `$2b$`) are saved, authentication logic correctly succeeds (HTTP 200) and rejects invalid credentials (HTTP 401), and sanitization is preserved.
4. Running `npx tsc --noEmit` and `npm test` in `CustomerApp` proves that the mobile app codebase is structurally and syntactically sound without type errors or broken assertions.
5. Therefore, no integrity violations, facade implementations, hardcoded outputs, or mock shortcuts exist. The work product is clean.

## 3. Caveats
- MariaDB must be installed and running on the local host machine (port 3306) for `Backend/src/server.js` and `verify-backend.js` to initialize its database connection pool.
- Android emulator network requests to `10.0.2.2:5000` depend on Expo / React Native environment runtime configuration for physical vs emulated devices.

## 4. Conclusion
- **Verdict**: **CLEAN**
- The implementation work in `Backend` and `CustomerApp` meets all forensic integrity standards, implements genuine database persistence and encryption, configures real network requests to target port 5000, and passes all test suites and typechecks.

## 5. Verification Method
To independently verify this audit:
1. Navigate to `c:\Capstone_Project_Web\Backend` and execute:
   ```cmd
   node verify-backend.js
   ```
   Verify that output shows `19 PASSED, 0 FAILED`.
2. Navigate to `c:\Capstone_Project_Web\CustomerApp` and execute:
   ```cmd
   npx tsc --noEmit
   ```
   Verify exit code is 0 with no errors.
3. In `c:\Capstone_Project_Web\CustomerApp`, execute:
   ```cmd
   npm test -- --passWithNoTests
   ```
   Verify all test suites pass.
4. Inspect `c:\Capstone_Project_Web\Backend\src\server.js`, `c:\Capstone_Project_Web\Backend\src\db.js`, `c:\Capstone_Project_Web\CustomerApp\src\config\api.ts`, `LoginScreen.tsx`, and `RegisterScreen.tsx` to confirm absence of mocks or facade returns.
