# Project: Node.js/Express MariaDB Backend & React Native CustomerApp Integration

## Architecture
- **Backend**: Node.js + Express server in `c:\Capstone_Project_Web\Backend` listening on port 5000 (`0.0.0.0`).
  - MariaDB database driver (`mysql2`) connecting to local MariaDB instance (port 3306).
  - User authentication endpoints (`POST /register`, `POST /login`, with aliases `POST /api/users`, `POST /api/auth/login`).
  - Password hashing with `bcrypt` (10 rounds).
  - Auto-initialization DB script `init.sql` / runtime schema creation for `users` table.
- **Frontend / Mobile**: React Native Expo CustomerApp in `c:\Capstone_Project_Web\CustomerApp`.
  - Android emulator IP integration: `http://10.0.2.2:5000` (resolving Android `java.net.ConnectException`).
  - Centralized API configuration in `CustomerApp/src/config/api.ts`.
  - Registration & Login UI screens (`RegisterScreen.tsx`, `LoginScreen.tsx`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Backend API & MariaDB Setup | Initialize Express server in `Backend`, MariaDB database connection, `users` schema setup, `/register` and `/login` endpoints, password hashing, unit/integration test suite. | none | DONE |
| 2 | CustomerApp Emulator Network Integration | Update CustomerApp API endpoints in `LoginScreen.tsx` & `RegisterScreen.tsx` to `http://10.0.2.2:5000`, matching payload specs and handling success/error responses. Verify TypeScript compilation (`npx tsc --noEmit`). | M1 | DONE |
| 3 | E2E Testing & Forensic Audit | End-to-end flow verification between CustomerApp and Backend, empirical stress testing, and Forensic Integrity Audit. | M2 | DONE |

## Interface Contracts
### API Endpoints (`Backend` ↔ `CustomerApp`)
- `POST /register` (and `POST /api/users`):
  - Request body: `{ username, password, email, firstName, lastName, phone, role }`
  - Response: 201 Created / 200 OK with `{ message: 'User registered successfully', user: { id, username, email, firstName, lastName, phone, role } }` or 400 Bad Request if missing fields / user exists.
- `POST /login` (and `POST /api/auth/login`):
  - Request body: `{ username, password }`
  - Response: 200 OK with `{ message: 'Login successful', token: string, user: { id, username, email, firstName, lastName, phone, role } }` or 401 Unauthorized if invalid credentials.

## Code Layout
- `Backend/package.json` — Backend project dependencies (`express`, `mysql2`, `bcrypt`, `cors`, `dotenv`)
- `Backend/src/server.js` — Express application entry point
- `Backend/src/db.js` — MariaDB connection pool and helper functions
- `Backend/init.sql` — SQL setup script for MariaDB `users` table
- `Backend/verify-backend.js` — Integration test suite for registration and login (19/19 PASSED)
- `CustomerApp/src/config/api.ts` — Centralized API configuration (defaulting to `http://10.0.2.2:5000`)
- `CustomerApp/src/screens/LoginScreen.tsx` — Login UI connecting to `ENDPOINTS.LOGIN`
- `CustomerApp/src/screens/RegisterScreen.tsx` — Registration UI connecting to `ENDPOINTS.REGISTER`
