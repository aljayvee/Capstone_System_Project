# Backend Architecture & MariaDB Setup Analysis Report

**Date**: 2026-07-30
**Explorer**: Explorer 1 (Backend Architecture & MariaDB Setup Explorer)
**Target Directory**: `c:\Capstone_Project_Web\Backend`
**Working Directory**: `c:\Capstone_Project_Web\.agents\teamwork_preview_explorer_m1_1`

---

## Executive Summary
This report presents a comprehensive investigation of the local environment, MariaDB database configuration, existing project files (`PROJECT.md`, `server/database_setup.sql`, `server/prisma/schema.prisma`), and frontend endpoint contracts (`CustomerApp/src/screens/LoginScreen.tsx`, `RegisterScreen.tsx`). Based on empirical testing and schema inspection, we have verified that a local MariaDB instance is active on port `3306` with database `errand_system_db` already created and populated. We detail the exact implementation strategy for initializing `c:\Capstone_Project_Web\Backend` with Node.js, Express, `mysql2`, `bcryptjs`, connection pooling with automatic host fallback, auto-table creation, and multi-route authentication endpoints.

---

## 1. Findings from Empirical Investigation

### 1.1 Local MariaDB Environment Discovery
- **Status**: Port `3306` is open and active on `127.0.0.1` and `localhost`.
- **Credentials**: Probed and verified successful connection with user `root` and empty password (`""`).
- **Database Presence**: `errand_system_db` exists on the local MariaDB server.
- **Existing Tables**: 10 tables were found in `errand_system_db`:
  - `addresses`
  - `barangays`
  - `dispatch_logs`
  - `errands`
  - `merchant_categories`
  - `pabili_details_tbl`
  - `payment_modes`
  - `rate_configs`
  - `roles_tbl`
  - `users`

### 1.2 Database Schema Inspection (`users` table)
Inspection of `errand_system_db.users` via SQL `DESCRIBE users;` revealed the active table structure:
```sql
+--------------+---------------------------------------+------+-----+---------+----------------+
| Field        | Type                                  | Null | Key | Default | Extra          |
+--------------+---------------------------------------+------+-----+---------+----------------+
| id           | int(11)                               | NO   | PRI | NULL    | auto_increment |
| username     | varchar(191)                          | NO   | UNI | NULL    |                |
| passwordHash | varchar(191)                          | NO   |     | NULL    |                |
| role         | enum('OWNER','DISPATCHER','RIDER','CUSTOMER') | NO |  | NULL    |                |
| firstName    | varchar(191)                          | NO   |     | NULL    |                |
| middleName   | varchar(191)                          | YES  |     | NULL    |                |
| lastName     | varchar(191)                          | NO   |     | NULL    |                |
| name         | varchar(191)                          | NO   |     | NULL    |                |
| email        | varchar(191)                          | NO   | UNI | NULL    |                |
| phone        | varchar(191)                          | NO   |     | NULL    |                |
| avatar       | varchar(191)                          | YES  |     | NULL    |                |
| status       | varchar(191)                          | NO   |     | Active  |                |
| createdAt    | datetime(3)                           | NO   |     | NULL    |                |
| updatedAt    | datetime(3)                           | NO   |     | NULL    |                |
+--------------+---------------------------------------+------+-----+---------+----------------+
```

#### Key Schema Discovery & Discrepancy Reconciliation
- **Prisma Schema (`server/prisma/schema.prisma`)**: Live DB was previously generated using Prisma, creating camelCase column names (`passwordHash`, `firstName`, `lastName`, `createdAt`, `updatedAt`).
- **Raw DDL (`server/database_setup.sql`)**: Contains snake_case column names (`password_hash`, `first_name`, `last_name`).
- **Resolution**: To maintain compatibility with both existing data in the live MariaDB database AND fresh setups initialized via `init.sql`, the SQL queries in `c:\Capstone_Project_Web\Backend` should target camelCase column names matching the active database (`passwordHash`, `firstName`, `lastName`), while `init.sql` will define the schema with camelCase columns.

### 1.3 Seed User Account Verification
Querying `errand_system_db.users` yielded 3 existing records:
1. `username`: `owner` | `email`: `aj.versola@company.ph` | `role`: `OWNER`
2. `username`: `dispatcher` | `email`: `md.batcharo@company.ph` | `role`: `DISPATCHER`
3. `username`: `rider01` | `email`: `ad.musali@company.ph` | `role`: `RIDER`

Empirical bcrypt verification confirmed that passwords `owner123`, `dispatch123`, and `rider123` match the stored `$2a$10$...` hashes in the database.

---

## 2. Recommended Backend Architecture & Strategy for `c:\Capstone_Project_Web\Backend`

### 2.1 File & Directory Layout
```
c:\Capstone_Project_Web\Backend/
├── package.json          # Node.json package configuration & scripts
├── .env.example          # Environment variable template
├── .env                  # Active environment variables
├── init.sql              # MariaDB database DDL script for users table & seed data
├── src/
│   ├── db.js             # MariaDB connection pool & auto-table creation logic
│   └── server.js         # Express HTTP server & API endpoints (/register, /login, etc.)
└── test/
    └── backend.test.js   # Automated integration test suite for registration and login
```

### 2.2 Package Setup (`package.json`)
The Backend package will use ES module or CommonJS node syntax with the following core dependencies:
- `express` (`^4.19.2`): HTTP web server framework.
- `mysql2` (`^3.9.2`): MySQL/MariaDB driver with promise support (`mysql2/promise`).
- `bcryptjs` (`^2.4.3`): Pure JavaScript bcrypt implementation for cross-platform compatibility.
- `cors` (`^2.8.5`): CORS middleware to enable requests from Expo/React Native apps and web clients.
- `dotenv` (`^16.4.5`): Environment variable loader.

DevDependencies & Scripts:
- `nodemon` (`^3.1.0`): Automatic server restart during development.
- `jest` (`^29.7.0`) / `supertest` (`^6.3.4`): Automated API integration tests.

### 2.3 MariaDB Connection Pool (`src/db.js`)
The database module will:
1. Load credentials from environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
2. Implement **connection pooling** using `mysql.createPool({...})`.
3. Provide **automatic fallback** strategy:
   - Attempt connection to `DB_HOST` (e.g. `127.0.0.1`).
   - If hostname resolution or connection fails, fallback to `localhost`.
   - If database `errand_system_db` does not exist yet, create it dynamically before creating table pool.
4. Implement **auto-table creation logic**:
   - On startup, execute `CREATE TABLE IF NOT EXISTS users (...)`.
   - Check if seed user accounts exist; if empty, insert default seeded accounts with hashed passwords.

### 2.4 Database DDL Script (`init.sql`)
```sql
-- Database Initialization Script for Backend
CREATE DATABASE IF NOT EXISTS `errand_system_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `errand_system_db`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `passwordHash` VARCHAR(255) NOT NULL,
  `role` ENUM('OWNER', 'DISPATCHER', 'RIDER', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
  `firstName` VARCHAR(100) NOT NULL,
  `middleName` VARCHAR(100) DEFAULT NULL,
  `lastName` VARCHAR(100) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NOT NULL DEFAULT '',
  `avatar` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Active',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.5 Express Server & Endpoints (`src/server.js`)
Server running on port `5000` supporting the exact contract required by `PROJECT.md`, `CustomerApp`, and `RiderMobileApp`:

1. **`GET /api/health` / `GET /health`**
   - Returns `{ status: 'online', message: 'Backend MariaDB server operational', timestamp: ISOString }`.

2. **`POST /register` and `POST /api/users` (Registration)**
   - Input: `{ username, password, email, firstName, lastName, phone, role }`
   - Validation:
     - Check mandatory fields: `username`, `password`, `email`, `firstName`.
     - Ensure `username` and `password` are non-empty strings.
   - DB Check: Query existing user with `username = ? OR email = ?`.
     - Return `400 Bad Request` with `{ error: 'User already exists with provided username or email' }` if duplicate found.
   - Password Hashing: Hash `password` using `bcrypt.hash(password, 10)`.
   - Insertion: Insert into `users` table with `firstName`, `lastName`, `name` (combined `firstName lastName`), `role` (default `'CUSTOMER'`), `phone`, `email`.
   - Response: `201 Created` with sanitized user object (omitting `passwordHash`).

3. **`POST /login` and `POST /api/auth/login` (Login)**
   - Input: `{ username, password }`
   - Validation: Ensure `username` and `password` are non-empty strings. Return `400 Bad Request` if invalid input.
   - DB Lookup: Query `SELECT * FROM users WHERE username = ?`.
     - Return `401 Unauthorized` with `{ error: 'Invalid username or password' }` if user not found.
   - Password Verification: Compare candidate `password` against stored `passwordHash` using `bcrypt.compare`.
     - Return `401 Unauthorized` if match fails.
   - Response: `200 OK` with sanitized user payload `{ id, username, email, firstName, lastName, phone, role, status }` and optional message/token.

---

## 3. Step-by-Step Implementation Roadmap for Implementer

1. **Step 1**: Create directory `c:\Capstone_Project_Web\Backend` and subdirectories `src/` and `test/`.
2. **Step 2**: Create `Backend/package.json` with dependencies (`express`, `mysql2`, `bcryptjs`, `cors`, `dotenv`). Run `npm install` inside `Backend/`.
3. **Step 3**: Create `Backend/.env` and `Backend/.env.example` with MariaDB credentials (`DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_USER=root`, `DB_PASSWORD=`, `DB_NAME=errand_system_db`, `PORT=5000`).
4. **Step 4**: Create `Backend/init.sql` for reproducible database setup.
5. **Step 5**: Implement `Backend/src/db.js` featuring connection pool, host fallback (`127.0.0.1` -> `localhost`), and auto-initialization table logic.
6. **Step 6**: Implement `Backend/src/server.js` with CORS, JSON parsing, health check, registration, and login routes.
7. **Step 7**: Create `Backend/test/verify-backend.js` or `Backend/test/auth.test.js` to execute automated integration tests against `/register` and `/login`.
8. **Step 8**: Verify server startup on port 5000 and run integration test suite to validate end-to-end functionality.
