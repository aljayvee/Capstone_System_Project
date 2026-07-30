# Handoff Report: Explorer 3 (CustomerApp Network Integration & Verification)

## 1. Observation
- **CustomerApp API URLs**:
  - `CustomerApp/src/screens/LoginScreen.tsx` line 18: `fetch('http://localhost:5000/api/auth/login', ...)`
  - `CustomerApp/src/screens/RegisterScreen.tsx` line 23: `fetch('http://localhost:5000/api/users', ...)`
- **Android Emulator Connectivity Error**:
  - When running inside the Android emulator, `localhost` maps to `127.0.0.1` on the Android VM itself. This fails with `java.net.ConnectException: Failed to connect to localhost/127.0.0.1:5000`.
  - Android emulator loopback IP for accessing the host system is `10.0.2.2`.
- **Existing Backend Verification Script Pattern**:
  - `server/verify-auth-tests.js` demonstrates unit/mock assertions using `bcrypt.hash` and `bcrypt.compare`.
  - Direct integration testing requires HTTP requests to port 5000 and `mysql2` direct query against the MariaDB `users` table.

---

## 2. Logic Chain
1. **Observation**: `LoginScreen.tsx` and `RegisterScreen.tsx` hardcode `http://localhost:5000/...`.
2. **Reasoning**: Hardcoding `localhost` causes runtime network failure (`java.net.ConnectException`) on Android emulators and makes switching environments (dev, test, physical device) error-prone.
3. **Deduction**: Centralizing the host URL into `CustomerApp/src/config/api.ts` with dynamic fallback (`Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000'`) resolves Android emulator connectivity while retaining cross-platform compatibility.
4. **Observation**: `PROJECT.md` requires backend testing for registration, DB persistence with bcrypt hashing, 200 OK login success, and 401 Unauthorized failure.
5. **Deduction**: Creating a standalone test script `Backend/verify-backend.js` utilizing `fetch` and `mysql2` provides end-to-end verification of registration, MariaDB state, and login authentication.

---

## 3. Caveats
- MariaDB connection parameters in `verify-backend.js` depend on environment variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`). Default fallback values match standard local development (`root`, no password, `capstone_db`).
- Node.js version 18+ is recommended for built-in `fetch` support; otherwise, `node-fetch` or standard `http` module can be used.

---

## 4. Conclusion
1. Create `CustomerApp/src/config/api.ts` defining `API_BASE_URL` (defaulting to `http://10.0.2.2:5000` on Android) and endpoint constants.
2. Update `LoginScreen.tsx` and `RegisterScreen.tsx` to import and use `ENDPOINTS.LOGIN` and `ENDPOINTS.REGISTER`.
3. Provide `Backend/verify-backend.js` test suite covering:
   - Registration POST (`/api/users` / `/register`)
   - DB persistence & bcrypt hash verification (`$2a$` / `$2b$`)
   - Login POST 200 OK success
   - Login POST 401 Unauthorized failure for invalid password or missing user
   - Input validation 400 Bad Request

---

## 5. Verification Method
1. **TypeScript Typecheck**:
   ```bash
   cd c:\Capstone_Project_Web\CustomerApp
   npx tsc --noEmit
   ```
   *Expected result*: 0 errors.
2. **Backend Integration Verification Test**:
   ```bash
   cd c:\Capstone_Project_Web\Backend
   node verify-backend.js
   ```
   *Expected result*: All 5 test suites output `[PASS]` and exit with code 0.
3. **Files to Inspect**:
   - `c:\Capstone_Project_Web\CustomerApp\src\config\api.ts`
   - `c:\Capstone_Project_Web\CustomerApp\src\screens\LoginScreen.tsx`
   - `c:\Capstone_Project_Web\CustomerApp\src\screens\RegisterScreen.tsx`
   - `c:\Capstone_Project_Web\.agents\teamwork_preview_explorer_m1_3\analysis.md`
