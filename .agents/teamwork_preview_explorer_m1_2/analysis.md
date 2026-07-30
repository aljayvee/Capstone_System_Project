# API Design & Auth Endpoint Specification Analysis

## 1. Executive Summary & Scope
This document provides the complete API design and auth endpoint specification for the Node.js/Express backend server connected to MariaDB (`c:\Capstone_Project_Web\server` and `c:\Capstone_Project_Web\Backend`).

The specification covers:
- User Registration endpoints: `POST /register` and alias `POST /api/users`.
- User Login endpoints: `POST /login` and alias `POST /api/auth/login`.
- Request and response schemas (DTOs) and data sanitization.
- Field validation rules and error payload normalization.
- Cryptographic password security using `bcrypt` (10 salt rounds and verification).
- HTTP Status Codes (`201 Created`, `200 OK`, `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`).
- Cross-Origin Resource Sharing (CORS) middleware configuration for web clients and React Native mobile apps (including Android emulator IP `10.0.2.2`).

---

## 2. Endpoint Architecture & Route Aliasing
To ensure seamless integration with multiple mobile and web frontends (`CustomerApp`, `RiderMobileApp`, web dashboards) that call either standard REST routes (`/register`, `/login`) or namespace routes (`/api/users`, `/api/auth/login`), the backend MUST support both paths with identical handler logic.

### Endpoint Mapping Table
| Functionality | Primary Route | Alias Route | HTTP Method | Auth Required | Success Status |
|---|---|---|---|---|---|
| User Registration | `POST /register` | `POST /api/users` | `POST` | Public | `201 Created` |
| User Authentication | `POST /login` | `POST /api/auth/login` | `POST` | Public | `200 OK` |

### Express Controller Sharing Pattern
```typescript
import { Request, Response, Router } from "express";

// Define controller handlers
export const handleRegister = async (req: Request, res: Response) => { /* ... */ };
export const handleLogin = async (req: Request, res: Response) => { /* ... */ };

// Mount on primary and alias routes
app.post("/register", handleRegister);
app.post("/api/users", handleRegister);

app.post("/login", handleLogin);
app.post("/api/auth/login", handleLogin);
```

---

## 3. User Registration Specification (`POST /register` & `POST /api/users`)

### 3.1 Request Payload Schema
- **Content-Type**: `application/json`

#### Request Body Fields
| Field Name | Type | Required | Default | Validation & Constraints |
|---|---|---|---|---|
| `username` | string | **Yes** | N/A | Non-empty string, min 3 chars, max 50 chars, trimmed. |
| `password` | string | **Yes** | N/A | Non-empty string, min 6 chars, max 100 chars. |
| `email` | string | **Yes** | N/A | Non-empty valid email syntax (`^[^\s@]+@[^\s@]+\.[^\s@]+$`), trimmed, lowercased. |
| `firstName` | string | Optional | Derived | Trimmed string. If omitted, derived from `name` or defaulted to `"User"`. |
| `lastName` | string | Optional | Derived | Trimmed string. If omitted, derived from `name` or defaulted to `"Account"`. |
| `middleName` | string | Optional | `""` | Trimmed string. |
| `name` | string | Optional | Derived | Combined name string (e.g. `"John Doe"`). |
| `phone` | string | Optional | `""` | Phone number string (e.g. `"+639391234567"` or `"09391234567"`). |
| `role` | string | Optional | `"CUSTOMER"` | Upper-cased string (`"CUSTOMER"`, `"RIDER"`, `"MERCHANT"`, `"ADMIN"`). |

#### Example Request Body
```json
{
  "username": "johndoe",
  "password": "Password123!",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "09391234567",
  "role": "CUSTOMER"
}
```

### 3.2 Processing & Business Logic
1. **Input Normalization & Sanitation**:
   - `username = req.body.username?.trim()`
   - `email = req.body.email?.trim().toLowerCase()`
   - `password = req.body.password`
2. **Field Presence Validation**:
   - Verify `username`, `password`, and `email` are non-empty strings.
   - If missing/invalid, return HTTP `400 Bad Request` with error payload.
3. **Duplicate User Verification**:
   - Query MariaDB (`users` table) for existing record matching `username` OR `email`.
   - If user exists, return HTTP `400 Bad Request` with error `"User already exists with provided username or email"`.
4. **Password Hashing**:
   - Generate salt and hash using `bcrypt.hash(password, 10)`.
5. **Database Insertion**:
   - Create user record storing `passwordHash`.
6. **Sanitized Response Construction**:
   - Exclude `passwordHash` from the output object.

### 3.3 Response Payload Schemas

#### Success Response (`201 Created`)
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john.doe@example.com",
  "firstName": "John",
  "middleName": "",
  "lastName": "Doe",
  "name": "John Doe",
  "phone": "09391234567",
  "role": "CUSTOMER",
  "createdAt": "2026-07-29T19:53:33.000Z"
}
```
*Note*: For clients expecting wrapped response payloads, the response can also include top-level `message` and `user` keys or a spread response:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "09391234567",
    "role": "CUSTOMER"
  }
}
```

#### Error Response (`400 Bad Request` - Missing Fields)
```json
{
  "error": "Username, password, and email must be non-empty strings"
}
```

#### Error Response (`400 Bad Request` - Duplicate User)
```json
{
  "error": "User already exists with provided username or email"
}
```

---

## 4. User Login Specification (`POST /login` & `POST /api/auth/login`)

### 4.1 Request Payload Schema
- **Content-Type**: `application/json`

#### Request Body Fields
| Field Name | Type | Required | Constraints |
|---|---|---|---|
| `username` | string | **Yes** | Non-empty string, trimmed. |
| `password` | string | **Yes** | Non-empty string. |

#### Example Request Body
```json
{
  "username": "johndoe",
  "password": "Password123!"
}
```

### 4.2 Processing & Business Logic
1. **Input Validation**:
   - Check if `username` and `password` are provided as non-empty strings.
   - If invalid/missing, return HTTP `400 Bad Request` (`"Username and password must be non-empty strings"`).
2. **User Lookup**:
   - Query MariaDB (`users` table) by `username`.
   - If user record is not found, return HTTP `401 Unauthorized` (`"Invalid username or password"`).
3. **Password Hash Verification**:
   - Execute `const isMatch = await bcrypt.compare(password, user.passwordHash)`.
   - If `isMatch` is `false`, return HTTP `401 Unauthorized` (`"Invalid username or password"`).
4. **Session / Token Generation**:
   - Generate session auth token (e.g. `jwt-token-string` or stub session token).
5. **Sanitized Response Construction**:
   - Omit `passwordHash` and return sanitized user data.

### 4.3 Response Payload Schemas

#### Success Response (`200 OK`)
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john.doe@example.com",
  "firstName": "John",
  "middleName": "",
  "lastName": "Doe",
  "name": "John Doe",
  "phone": "09391234567",
  "role": "CUSTOMER",
  "token": "sugo-jwt-session-token-12345",
  "message": "Login successful"
}
```

#### Error Response (`400 Bad Request`)
```json
{
  "error": "Username and password must be non-empty strings"
}
```

#### Error Response (`401 Unauthorized`)
```json
{
  "error": "Invalid username or password"
}
```

---

## 5. Security & Password Hashing Standard

### 5.1 Cryptographic Hash Specification
- **Library**: `bcrypt` (native) or `bcryptjs` (JS implementation).
- **Salt Cost Factor**: `10` rounds (`bcrypt.hash(password, 10)`).
- **Hash Output Format**: Standard Modular Crypt Format (`$2a$10$...` or `$2b$10$...`), 60 characters length.
- **Database Column Spec**: `passwordHash VARCHAR(255) NOT NULL`.

### 5.2 Verification Logic
Password comparison must use `bcrypt.compare` to prevent timing attacks:
```typescript
import bcrypt from "bcryptjs";

const isPasswordValid = await bcrypt.compare(plainPassword, user.passwordHash);
```

---

## 6. Error Payload & Status Code Standards

### 6.1 Status Code Mapping
| Status Code | Reason | Endpoint Scenarios |
|---|---|---|
| `200 OK` | Request succeeded | `POST /login`, `POST /api/auth/login` |
| `201 Created` | Resource successfully created | `POST /register`, `POST /api/users` |
| `400 Bad Request` | Invalid payload, missing fields, or duplicate user | Invalid inputs, missing credentials, duplicate username/email |
| `401 Unauthorized` | Invalid credentials | Login username not found, or password comparison failed |
| `500 Internal Error` | Unexpected backend or database error | Database connectivity error, unhandled thrown exception |

### 6.2 Error Response Format
All error responses MUST conform to a consistent JSON structure containing the `error` string property:
```json
{
  "error": "Human readable error description",
  "details": []
}
```

---

## 7. CORS Middleware Configuration

To allow seamless cross-origin requests from web browsers, Expo CLI, React Native Metro bundler (`http://localhost:8081`), and Android Emulators (`http://10.0.2.2:5000`), Express CORS middleware must be configured as follows:

```typescript
import cors from "cors";

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:8081",
  "http://10.0.2.2:5000",
  "http://10.0.2.2:8081"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://192.168.")) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev mode
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);
```

---

## 8. MariaDB `users` Table Schema Reference

```sql
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `passwordHash` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(255) NOT NULL DEFAULT 'User',
  `middleName` VARCHAR(255) NOT NULL DEFAULT '',
  `lastName` VARCHAR(255) NOT NULL DEFAULT 'Account',
  `name` VARCHAR(255) NOT NULL DEFAULT '',
  `phone` VARCHAR(50) NOT NULL DEFAULT '',
  `role` VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
