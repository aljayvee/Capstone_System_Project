## 2026-07-30T03:55:23Z
<USER_REQUEST>
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You are Implementation Worker 1 (`teamwork_preview_worker_m1`).
Working directory: c:\Capstone_Project_Web\.agents\teamwork_preview_worker_m1

Your task:
1. Create your working directory `.agents/teamwork_preview_worker_m1` and initialize `progress.md` and `BRIEFING.md`.
2. Read the handoff reports from the 3 Explorers:
   - `c:\Capstone_Project_Web\.agents\teamwork_preview_explorer_m1_1\handoff.md` & `analysis.md`
   - `c:\Capstone_Project_Web\.agents\teamwork_preview_explorer_m1_2\handoff.md` & `analysis.md`
   - `c:\Capstone_Project_Web\.agents\teamwork_preview_explorer_m1_3\handoff.md` & `analysis.md`
3. Initialize the Express MariaDB Backend in `c:\Capstone_Project_Web\Backend`:
   - Create `c:\Capstone_Project_Web\Backend\package.json` with dependencies: `express`, `mysql2`, `bcrypt`, `cors`, `dotenv`. (Also include scripts `"start": "node src/server.js"`, `"test": "node verify-backend.js"`).
   - Install dependencies in `Backend` using `npm install`.
   - Create `c:\Capstone_Project_Web\Backend\init.sql` defining the `users` table schema (`id`, `username`, `passwordHash`, `email`, `firstName`, `lastName`, `phone`, `role`, `createdAt`, `updatedAt`).
   - Create `c:\Capstone_Project_Web\Backend\src\db.js` with MariaDB connection pool (connecting to localhost:3306, user `root`, password `root`/`password`/empty, database `capstone_db`) and automatic schema setup if `users` table does not exist.
   - Create `c:\Capstone_Project_Web\Backend\src\server.js` starting Express server on port 5000, host `0.0.0.0`, with CORS middleware, and endpoints:
     - `POST /register` & alias `POST /api/users` (password hashed with bcrypt, inserts into `users`, returns 201 Created / 200 OK with sanitized user object, 400 Bad Request on duplicate/missing field)
     - `POST /login` & alias `POST /api/auth/login` (verifies username & bcrypt compare, returns 200 OK with user data, 401 Unauthorized on invalid password or missing user)
   - Create `c:\Capstone_Project_Web\Backend\verify-backend.js` test suite testing:
     - 1. User registration POST (`/register` and `/api/users`)
     - 2. MariaDB database query & bcrypt passwordHash persistence verification
     - 3. User login POST 200 OK success
     - 4. User login POST 401 Unauthorized invalid password failure
     - 5. Input validation 400 Bad Request
   - Run backend server and run `node verify-backend.js` to ensure 100% passing tests!
4. Update `CustomerApp` (`c:\Capstone_Project_Web\CustomerApp`):
   - Create `CustomerApp/src/config/api.ts` with base URL `http://10.0.2.2:5000` (or `Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000'`).
   - Update `CustomerApp/src/screens/LoginScreen.tsx` to use the updated API endpoint `http://10.0.2.2:5000/api/auth/login` (or `/login`).
   - Update `CustomerApp/src/screens/RegisterScreen.tsx` to use the updated API endpoint `http://10.0.2.2:5000/api/users` (or `/register`).
   - Run `npx tsc --noEmit` in `CustomerApp` to confirm 0 TypeScript errors.
   - Run `npm test` in `CustomerApp` to confirm app tests pass.
5. Write your complete execution report, build outputs, and test logs into `.agents/teamwork_preview_worker_m1/changes.md` and `handoff.md`.
6. Report completion to the parent orchestrator via send_message.
</USER_REQUEST>
