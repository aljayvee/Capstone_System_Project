# Server API & User Management Guidelines

## 1. Server-Side Rate-Limiting & Validation Invariants
- All Express backend API endpoints modifying database resources MUST pass through:
  1. **Rate Limiting Middleware**: Prevent API abuse and request flooding before reaching the database.
  2. **Server-Side Input Validation**: Strictly check data types, string lengths, regex patterns, and security constraints on the server side. Return explicit HTTP 400 or HTTP 429 status codes if validation or rate limiting fails.
  3. **Database Execution**: Database queries (MariaDB/Prisma/mysql2) MUST ONLY execute after passing both rate limiting and input validation filters.

## 2. Owner Portal User Scoping Invariants
- User Management in the Owner Portal is dedicated to operational personnel (`owner`, `dispatcher`, `rider`).
- NEVER include the `customer` role option in the Owner Portal Add User or Edit User modals. Customer registration must be managed via dedicated customer registration flows.
