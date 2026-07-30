# Milestone 1 Re-verification Challenge Report (Backend Auth API Remediation)

**Verdict**: **PASSED**

## 1. Observation

Direct code inspection of `c:/Capstone_Project_Web/server/src/index.ts` reveals the following implementations for authentication and input validation:

1. **Input Validation Guard (`POST /api/auth/login`, lines 30-39)**:
   ```typescript
   if (
     typeof username !== "string" ||
     typeof password !== "string" ||
     username.trim() === "" ||
     password.trim() === ""
   ) {
     return res
       .status(400)
       .json({ error: "Username and password must be non-empty strings" });
   }
   ```
   - Evaluates `typeof` for both `username` and `password`.
   - Rejects non-string types (`number`, `array`, `object`, `boolean`, `null`, `undefined`) and empty/whitespace strings.
   - Responds with HTTP `400 Bad Request` and JSON payload `{ error: "Username and password must be non-empty strings" }`.

2. **Authentication & Unauthorized Handling (`POST /api/auth/login`, lines 41-53)**:
   ```typescript
   const user = await prisma.user.findUnique({
     where: { username },
   });

   if (!user) {
     return res.status(401).json({ error: "Invalid username or password" });
   }

   const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

   if (!isPasswordValid) {
     return res.status(401).json({ error: "Invalid username or password" });
   }
   ```
   - For non-existent users (`!user`), responds with HTTP `401 Unauthorized` and `{ error: "Invalid username or password" }`.
   - For invalid passwords (`!isPasswordValid`), responds with HTTP `401 Unauthorized` and `{ error: "Invalid username or password" }`.

3. **Data Sanitization & Successful Authentication (`POST /api/auth/login`, lines 55-56)**:
   ```typescript
   const { passwordHash: _, ...sanitizedUser } = user;
   return res.status(200).json(sanitizedUser);
   ```
   - Strips `passwordHash` field via object rest destructuring.
   - Responds with HTTP `200 OK` and returns only the sanitized user record.

4. **User Creation Validation & Sanitization (`POST /api/users`, lines 80-89 & 111-112)**:
   - Validates `username` and `password` string types and non-empty status, returning HTTP `400 Bad Request` on invalid input.
   - Strips `passwordHash` before returning HTTP `201 Created` with sanitized user object.

5. **User List Sanitization (`GET /api/users`, lines 67-68)**:
   - Maps users array to omit `passwordHash` before returning HTTP `200 OK`.

---

## 2. Logic Chain

1. **Requirement 1 (Non-string payloads return 400 Bad Request)**:
   - **Step A**: Payload inputs such as `{ username: 123 }`, `{ password: 12345 }`, arrays `["admin"]`, objects `{ key: "val" }`, `null`, `boolean`, or whitespace strings trigger `typeof username !== "string" || typeof password !== "string" || username.trim() === "" || password.trim() === ""`.
   - **Step B**: The condition evaluates to `true` prior to executing database lookup (`prisma.user.findUnique`) or `bcrypt.compare`.
   - **Step C**: The response immediately executes `res.status(400).json(...)`, preventing internal server error (500) unhandled type exceptions during DB query or hash comparison.

2. **Requirement 2 (Invalid passwords and non-existent users return 401 Unauthorized)**:
   - **Step A**: If `username` does not exist in `users` table, `user` is `null`. Line 45 `if (!user)` triggers and returns status `401` with message `"Invalid username or password"`.
   - **Step B**: If `username` exists but `password` fails `bcrypt.compare`, `isPasswordValid` is `false`. Line 51 `if (!isPasswordValid)` triggers and returns status `401` with message `"Invalid username or password"`.
   - **Step C**: Both failure branches consistently return HTTP status `401 Unauthorized`.

3. **Requirement 3 (Valid credentials return 200 OK with sanitized user object)**:
   - **Step A**: For valid credentials, `user` is retrieved and `bcrypt.compare(password, user.passwordHash)` returns `true`.
   - **Step B**: Object destructuring `const { passwordHash: _, ...sanitizedUser } = user` creates a new object without `passwordHash`.
   - **Step C**: `res.status(200).json(sanitizedUser)` returns HTTP status `200 OK` with `passwordHash` completely omitted.

---

## 3. Caveats

- **Database Connection Failure**: In the event of a total MariaDB database disconnect or network failure, `prisma.user.findUnique` will throw an unhandled database exception caught by `catch (err)` (line 57), returning status `500 Internal Server Error`. This is standard error handling behavior for unexpected infrastructure failures.
- **No caveats** regarding the specific verification criteria.

---

## 4. Conclusion

The Backend Auth API in `c:/Capstone_Project_Web/server/src/index.ts` has successfully addressed all reported issues:
1. Non-string payloads (numbers, objects, arrays, booleans, null) and empty/whitespace inputs return **400 Bad Request**.
2. Invalid passwords and non-existent users return **401 Unauthorized**.
3. Valid credentials return **200 OK** with a sanitized user object (`passwordHash` omitted).

Final Verdict: **PASSED**

---

## 5. Verification Method

To independently verify the Auth API implementation:

1. **Inspect Source File**:
   - Inspect `c:/Capstone_Project_Web/server/src/index.ts` (lines 26–61 for login endpoint, lines 76–122 for user registration endpoint).

2. **Run Verification Test Suite**:
   - Test suite written at `c:/Capstone_Project_Web/.agents/teamwork_preview_challenger_m1_remediation/test_auth_verification.ts`.

3. **HTTP API Request Verification**:
   - `POST /api/auth/login` with `{ "username": 123, "password": "password" }` -> expect status `400`.
   - `POST /api/auth/login` with `{ "username": "nonexistent", "password": "password" }` -> expect status `401`.
   - `POST /api/auth/login` with `{ "username": "owner", "password": "wrongpassword" }` -> expect status `401`.
   - `POST /api/auth/login` with `{ "username": "owner", "password": "owner123" }` -> expect status `200` with user object lacking `passwordHash`.

4. **Invalidation Conditions**:
   - If non-string payloads return 500 or crash the process.
   - If invalid password / unknown user returns status other than 401.
   - If `passwordHash` field is present in 200 OK response.
