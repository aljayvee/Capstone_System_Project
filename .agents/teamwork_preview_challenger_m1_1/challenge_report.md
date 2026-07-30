# Backend Authentication & API Stress Test Report

## Summary
- **Target Host**: `http://localhost:5000`
- **Target Service**: Backend Express / MariaDB Server (`c:\Capstone_Project_Web\Backend`)
- **Execution Date**: 2026-07-30
- **Total Test Cases Executed**: 13 single-request validation/auth tests + 50 concurrent request stress test

---

## 1. Input Validation & Edge Case Handling

| Scenario | Endpoint | Request Payload | Expected Status | Actual Status | Latency | Pass/Fail |
|---|---|---|---|---|---|---|
| Missing password field | `POST /register` | `{ username, email }` | `400` | `400` | 4 ms | PASS |
| Missing username field | `POST /register` | `{ password, email }` | `400` | `400` | 5 ms | PASS |
| Missing email field | `POST /register` | `{ username, password }` | `400` | `400` | 3 ms | PASS |
| Empty string username | `POST /register` | `{ username: "   ", ... }` | `400` | `400` | 3 ms | PASS |
| Empty string password | `POST /register` | `{ password: "  ", ... }` | `400` | `400` | 2 ms | PASS |
| Login missing username | `POST /login` | `{ password }` | `400` | `400` | 4 ms | PASS |
| Login missing password | `POST /login` | `{ username }` | `400` | `400` | 4 ms | PASS |
| Invalid JSON body payload | `POST /register` | `"{ invalid_json: "` | `400` | `400` | 17 ms | PASS |

**Observations**:
- Express built-in `express.json()` middleware cleanly intercepts malformed JSON strings and returns `400 Bad Request`.
- Explicit controller validation checks (`!username || typeof username !== 'string' || !username.trim()`) correctly filter missing or whitespace-only inputs.

---

## 2. Duplicate Account & Collision Handling

| Scenario | Endpoint | Request Payload | Expected Status | Actual Status | Result |
|---|---|---|---|---|---|
| Initial Registration | `POST /register` | `perf_user_<ts>` | `201` | `201` | Created user successfully |
| Duplicate Username Collision | `POST /register` | `perf_user_<ts>` (same username, diff email) | `400` | `400` | Reject: `User already exists with provided username or email` |
| Duplicate Email Collision | `POST /register` | `PERF_<ts>@EXAMPLE.COM` (uppercase duplicate email) | `400` | `400` | Reject: `User already exists with provided username or email` |

---

## 3. Authentication & Failure Scenarios

| Scenario | Endpoint | Credentials | Expected Status | Actual Status | Result |
|---|---|---|---|---|---|
| Incorrect Password Login | `POST /login` | Valid user, wrong password | `401` | `401` | `Invalid username or password` |
| Non-existent User Login | `POST /login` | Non-existent username | `401` | `401` | `Invalid username or password` |
| Valid Credentials Login | `POST /login` | Valid username & password | `200` | `200` | Success token & sanitized user returned |

---

## 4. Concurrent Load & Performance Stress Test

A stress test was conducted sending 50 concurrent requests simultaneously (25 `POST /register` requests with unique payloads + 25 `POST /login` requests).

### Performance Metrics:
- **Total Requests Executed**: 50
- **Total Concurrency Duration**: 2722 ms
- **Throughput**: 18.37 requests / sec
- **Success Rate**: 100.0% (25 x 201 Created, 25 x 200 OK)
- **Status Code Breakdown**: `{ '200': 25, '201': 25 }`
- **Latency Summary**:
  - **Min Latency**: 284 ms
  - **Average Latency**: 1489.66 ms
  - **P95 Latency**: 2695 ms
  - **Max Latency**: 2709 ms

### Performance Analysis:
- Password hashing (`bcrypt` cost factor 10) CPU cost accounts for the bulk of request latency under concurrent load (~284ms - 2709ms), which is expected behavior for secure password hashing.
- Zero requests dropped or failed with 500 Internal Server Errors under concurrent load.
