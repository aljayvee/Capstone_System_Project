# Execution Plan: Express Backend Server & CustomerApp Integration

## Overview
Build a Node.js/Express backend server in `c:\Capstone_Project_Web\Backend` that connects to a local MariaDB instance to handle User Registration (`/register` & `/api/users`) and User Login (`/login` & `/api/auth/login`).
Configure the React Native CustomerApp (`c:\Capstone_Project_Web\CustomerApp`) to point to `http://10.0.2.2:5000` for Android emulator compatibility, resolving the `ConnectException` and providing seamless end-to-end functionality.

## Milestone Breakdown

### Milestone 1: Backend Server & MariaDB Setup
- **Objective**: Initialize `c:\Capstone_Project_Web\Backend`, install dependencies (`express`, `mysql2`/`mariadb`, `bcrypt`, `cors`, `dotenv`), connect to MariaDB database, initialize `users` table via `init.sql` / auto-migration, and build authentication API endpoints (`POST /register`, `POST /login`, plus aliases `/api/users` & `/api/auth/login`).
- **Deliverables**:
  - `Backend/package.json` with scripts and dependencies.
  - `Backend/init.sql` for table schema.
  - `Backend/src/server.js` or `server.ts` Express application listening on port 5000.
  - Integration test suite (`Backend/test/` or `verify-backend.js`) testing registration, password hashing in DB, login with valid credentials (200), and login with invalid credentials (401).

### Milestone 2: CustomerApp Android Emulator Network Integration
- **Objective**: Configure CustomerApp (`c:\Capstone_Project_Web\CustomerApp`) to point API requests to `http://10.0.2.2:5000` (the host loopback IP for Android emulator).
- **Deliverables**:
  - `CustomerApp/src/config/api.ts` or central config for base API URL `http://10.0.2.2:5000`.
  - Updated `LoginScreen.tsx` and `RegisterScreen.tsx` using `10.0.2.2:5000` endpoints (`/login` or `/api/auth/login`, `/register` or `/api/users`).
  - Correct error handling, status checks, and navigation upon login/registration success.
  - Verification with `npx tsc --noEmit` and Jest tests passing.

### Milestone 3: End-to-End Verification & Forensic Integrity Audit
- **Objective**: Execute comprehensive end-to-end tests, stress tests with Challengers, and Forensic Integrity Audit verification.
- **Deliverables**:
  - Reviewer pass verdicts.
  - Challenger stress test pass reports.
  - Forensic Auditor CLEAN integrity report (zero hardcoded values, authentic DB persistence, genuine bcrypt validation).

## Subagent Workflow & Dispatch Topology
Per Project Pattern guidelines:
1. **Exploration**: 3 Explorers analyze existing MariaDB setup in `server/`, database credentials/schema, `CustomerApp` screens, and dependency configs.
2. **Implementation**: 1 Worker executes code and dependency changes in `Backend/` and `CustomerApp/`, running builds and tests.
3. **Review**: 2 Reviewers independently evaluate code quality, completeness, and adherence to requirements.
4. **Challenge**: 2 Challengers run empirical stress tests and edge cases.
5. **Audit**: 1 Forensic Auditor performs integrity verification (hard binary veto).
