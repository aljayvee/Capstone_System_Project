# Handoff Report — API Design & Auth Endpoint Specification (M1 Explorer 2)

## 1. Observation
1. **Existing Server Implementation (`c:\Capstone_Project_Web\server\src\index.ts`)**:
   - `POST /api/auth/login` (lines 26–61): Accepts `{ username, password }`, performs non-empty string validation, queries Prisma `user.findUnique({ where: { username } })`, verifies password via `bcrypt.compare(password, user.passwordHash)`, omits `passwordHash`, and returns sanitized user object with `200 OK` (or `401 Unauthorized` for invalid credentials).
   - `POST /api/users` (lines 76–122): Accepts `{ username, password, role, name, email, phone, firstName, middleName, lastName }`, validates non-empty username/password, computes `bcrypt.hash(password, 10)`, handles duplicate username/email error `P2002` returning `400 Bad Request`, and returns sanitized user object with `201 Created`.
2. **Client Endpoint Invocation**:
   - `CustomerApp/src/screens/LoginScreen.tsx` (line 18): Sends POST to `http://localhost:5000/api/auth/login`.
   - `CustomerApp/src/screens/RegisterScreen.tsx` (line 23): Sends POST to `http://localhost:5000/api/users`.
   - `RiderMobileApp/src/context/RiderAuthContext.tsx` (line 65): Sends POST to `${API_BASE_URL}/auth/login` (requires `/login` or `/api/auth/login`).
   - `c:\Capstone_Project_Web\PROJECT.md` (lines 22–27): Explicitly requires `/register` (alias `/api/users`) and `/login` (alias `/api/auth/login`).

---

## 2. Logic Chain
1. **Route Aliasing Requirement**: Because different client modules (`CustomerApp`, `RiderMobileApp`, web dashboards) and legacy API specs call either `/register` / `/login` or `/api/users` / `/api/auth/login`, mounting identical controller functions on both paths ensures 100% backward and cross-app compatibility without duplicating business logic.
2. **Security & Cryptography**: Utilizing `bcrypt` with `10` salt rounds guarantees secure password hashing (`$2a$10$` or `$2b$10$`) with ~50-100ms execution time, avoiding CPU bottleneck while protecting against dictionary and rainbow table attacks.
3. **Data Sanitization**: Excluding `passwordHash` from all HTTP response objects (`const { passwordHash: _, ...sanitizedUser } = user`) prevents security token/credential leakage.
4. **Normalized Error Structure**: Standardizing error payloads to `{ "error": "Message" }` ensures uniform exception handling across React Native screens (`LoginScreen`, `RegisterScreen`, `RiderAuthContext`).
5. **CORS Configuration**: Mobile clients connecting via Metro bundler (`localhost:8081`), Android Emulator (`10.0.2.2:5000`), or LAN IP require explicit CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`).

---

## 3. Caveats
- **JWT Token Generation**: JWT token generation is currently stubbed/optional (`token?: string`). If full JWT session signing is enabled, a `JWT_SECRET` key should be configured in `server/.env`.
- **Android Emulator Network Binding**: Android emulators cannot reach host `localhost:5000` directly and require `10.0.2.2:5000`. The server must listen on `0.0.0.0` or `PORT 5000` and permit CORS for `http://10.0.2.2:5000`.

---

## 4. Conclusion
The comprehensive API design and endpoint specification for user registration (`POST /register` & `POST /api/users`) and user login (`POST /login` & `POST /api/auth/login`) has been fully formulated and documented in `c:\Capstone_Project_Web\.agents\teamwork_preview_explorer_m1_2\analysis.md`. The design fulfills all security, validation, status code, error payload, and CORS requirements.

---

## 5. Verification Method
1. Inspect `analysis.md` in `c:\Capstone_Project_Web\.agents\teamwork_preview_explorer_m1_2\analysis.md` for exact DTO schemas and controller definitions.
2. Verify route aliases in Express backend:
   ```bash
   # Start server
   cd c:\Capstone_Project_Web\server
   npm start
   ```
3. Test Registration via curl:
   ```bash
   curl -X POST http://localhost:5000/register -H "Content-Type: application/json" -d "{\"username\":\"testuser\",\"password\":\"password123\",\"email\":\"test@example.com\"}"
   curl -X POST http://localhost:5000/api/users -H "Content-Type: application/json" -d "{\"username\":\"testuser2\",\"password\":\"password123\",\"email\":\"test2@example.com\"}"
   ```
4. Test Login via curl:
   ```bash
   curl -X POST http://localhost:5000/login -H "Content-Type: application/json" -d "{\"username\":\"testuser\",\"password\":\"password123\"}"
   curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"testuser\",\"password\":\"password123\"}"
   ```
