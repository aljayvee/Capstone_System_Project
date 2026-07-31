# Backend Server, Database & API Architecture Rules

> **ENFORCEMENT LEVEL: STRICT**
> This rule governs how the API server, MariaDB, and Firebase interact.
> ALL client apps (Web Dashboard, CustomerApp, RiderMobileApp) connect
> through this single server. Never bypass the server to call databases directly.

---

## 0. Firebase Project Reference (This Project)

| Detail | Value |
|---|---|
| **Firebase Project ID** | `capstonedata-3589c` |
| **Realtime Database URL** | `https://capstonedata-3589c-default-rtdb.asia-southeast1.firebasedatabase.app/` |
| **Region** | `asia-southeast1` |
| **CustomerApp Firebase config file** | `C:\Capstone_Project_Mobile_App\CustomerApp\src\firebase\config.ts` |

## Third-Party API Keys (This Project)

| Key | Service | Variable Name | Used In |
|---|---|---|---|
| `AIzaSyDkEylg4TZnylcK3QI7KRekDCG30XeeC3o` | Google Maps API | `GOOGLE_MAPS_API_KEY` | `server/.env` |
| `AIzaSyDkEylg4TZnylcK3QI7KRekDCG30XeeC3o` | Google Maps API | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | `CustomerApp/.env` |

> All credentials are stored in `.env` files — NEVER hardcode these values in source code.
> The `config.ts` file MUST read from `process.env.EXPO_PUBLIC_FIREBASE_*` variables only.
> Google Maps API keys start with `AIzaSy` — always recognize and handle them as sensitive credentials.

---



---

## 1. API Server — Single Source of Truth

### 1.1 Server Location & Identity
- The **one and only API server** lives at: `C:\Capstone_Project_Web\server\`
- Stack: **Node.js + Express + TypeScript**, entry point: `server/src/index.ts`
- Runs on port defined in `server/.env` → `PORT=5000` (default)
- ALL three client applications connect to this single server:

```
C:\Capstone_Project_Web\src\          (Web Dashboard)  ──┐
C:\Capstone_Project_Mobile_App\CustomerApp\             ──┼──► server/ (Port 5000)
C:\Capstone_Project_Mobile_App\RiderMobileApp\          ──┘
```

### 1.2 API Server Rules
- NEVER create a second Express server in any other folder.
- The `Backend/` folder contains legacy/reference code only — do NOT run it in production. The canonical server is `server/`.
- All new API routes MUST be added to `server/src/index.ts` or organized as Express routers imported into it.
- The server MUST start correctly with `npm run dev` from the `server/` directory before any feature is considered complete.

### 1.3 CORS Configuration
- The server MUST have CORS configured to allow requests from:
  - Web Dashboard: `http://localhost:5173` (development) and the production domain
  - Mobile apps: React Native / Expo origins
- NEVER use wildcard `*` CORS in production — always whitelist specific origins.

```ts
// server/src/index.ts
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));
```

---

## 2. Hybrid Database Architecture — MariaDB + Firebase

### 2.1 Architecture Overview
The system uses a **hybrid approach** — each database handles what it does best:

```
┌─────────────────────────────────────────────────────┐
│                   API SERVER (server/)               │
│                                                     │
│   ┌─────────────────────┐  ┌─────────────────────┐ │
│   │  MariaDB (Prisma)   │  │  Firebase (SDK)      │ │
│   │  Structured Data    │  │  Real-time + Auth    │ │
│   └─────────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 2.2 MariaDB — Responsibilities (via Prisma ORM)
MariaDB is the **primary relational database** for all structured, persistent business data:

| Stores | Examples |
|---|---|
| User accounts & profiles | `users`, `rider_profiles`, `customer_profiles` |
| Errand records | `errands`, `errand_items`, `errand_history` |
| Transactions & payments | `transactions`, `rates`, `fees` |
| Business configuration | `service_areas`, `pricing_rules` |
| Audit logs | `activity_logs`, `status_change_logs` |

- **ORM:** Prisma (`@prisma/client`) — NEVER write raw SQL queries; always use Prisma client methods.
- **Schema:** Managed via `server/prisma/schema.prisma` — all table changes MUST go through Prisma migrations.
- **Connection:** Via `DATABASE_URL` in `server/.env` only.

```ts
// server/src/db.ts — Singleton Prisma client
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export default prisma;
```

### 2.3 Firebase — Responsibilities
Firebase handles **real-time, event-driven, and authentication** concerns:

| Stores | Examples |
|---|---|
| Authentication | User sign-in, sign-up, token issuance, session management |
| Real-time errand tracking | Live errand status updates pushed to clients |
| Rider location (live) | GPS coordinates streamed in real-time |
| Push notifications | FCM (Firebase Cloud Messaging) to mobile apps |
| File/image storage | Profile photos, errand item images (Firebase Storage) |

- Firebase Admin SDK is initialized **once** in the server — never in client apps directly for sensitive operations.
- Firebase client SDK may be used in mobile/web apps **only** for: Authentication sign-in UI, real-time listeners (`onSnapshot`), and FCM token registration.
- NEVER store business-critical relational data in Firestore — that belongs in MariaDB.

### 2.4 Hybrid Decision Rule
When adding a new data concern, use this decision guide:

```
Is the data relational, transactional, or needs complex queries?
  YES → MariaDB (Prisma)

Is the data real-time, event-driven, or needs push to clients?
  YES → Firebase (Firestore / RTDB)

Is the data authentication-related?
  YES → Firebase Auth

Is the data a file or binary asset?
  YES → Firebase Storage
```

### 2.5 Data Sync Strategy
- Firebase Firestore may store **lightweight, denormalized snapshots** of MariaDB records for real-time display (e.g., current errand status, rider name, ETA).
- The **MariaDB record is always the source of truth** — Firestore is a read-optimized projection.
- When a MariaDB record changes, the server MUST update the corresponding Firestore document as part of the same operation.

---

## 3. Environment Variables & Secret Management (Strict)

### 3.1 Non-Negotiable Rules
- **ALL** API keys, database credentials, Firebase config, JWT secrets, and third-party service keys MUST be stored in `.env` files ONLY.
- `.env` files MUST be listed in `.gitignore` in EVERY project folder — NEVER commit secrets to GitHub.
- NEVER hardcode any credential, URL, or secret key anywhere in source code.
- NEVER log environment variable values, even in development.

### 3.2 Required `.env` Variables per Location

#### `server/.env`
```env
# Server
PORT=5000
NODE_ENV=development

# MariaDB (via Prisma)
DATABASE_URL="mysql://root:<password>@localhost:3306/errand_system_db"

# JWT
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<strong-random-secret>
JWT_REFRESH_EXPIRES_IN=7d

# Firebase Admin SDK
FIREBASE_PROJECT_ID=<your-project-id>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY=<service-account-private-key>
FIREBASE_DATABASE_URL=<realtime-db-url>
FIREBASE_STORAGE_BUCKET=<storage-bucket>

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081
```

#### `src/.env` (Web Dashboard — Vite)
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=<firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<auth-domain>
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_STORAGE_BUCKET=<storage-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
VITE_FIREBASE_APP_ID=<app-id>
```

#### `CustomerApp/.env` and `RiderMobileApp/.env`
```env
EXPO_PUBLIC_API_BASE_URL=http://<your-local-ip>:5000
EXPO_PUBLIC_FIREBASE_API_KEY=<firebase-api-key>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<auth-domain>
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<storage-bucket>
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
EXPO_PUBLIC_FIREBASE_APP_ID=<app-id>
```

### 3.3 Accessing Environment Variables in Code
- **Server (Node.js):** `process.env.VARIABLE_NAME` — always validated on startup.
- **Web (Vite):** `import.meta.env.VITE_VARIABLE_NAME` — only `VITE_` prefixed vars are exposed.
- **Mobile (Expo):** `process.env.EXPO_PUBLIC_VARIABLE_NAME` — only `EXPO_PUBLIC_` prefixed vars are exposed.
- On server startup, validate ALL required env vars exist — fail fast with a clear error if any are missing:

```ts
// server/src/validateEnv.ts
const required = ['DATABASE_URL', 'JWT_SECRET', 'FIREBASE_PROJECT_ID'];
required.forEach(key => {
  if (!process.env[key]) throw new Error(`Missing required env variable: ${key}`);
});
```

---

## 4. API Route Structure Standards

### 4.1 REST Conventions
All API routes MUST follow RESTful conventions:

| Action | Method | Route Example |
|---|---|---|
| Get all | `GET` | `/api/errands` |
| Get one | `GET` | `/api/errands/:id` |
| Create | `POST` | `/api/errands` |
| Update (full) | `PUT` | `/api/errands/:id` |
| Update (partial) | `PATCH` | `/api/errands/:id/status` |
| Delete | `DELETE` | `/api/errands/:id` |

### 4.2 Route Organization
Group routes by domain in separate router files:
```
server/src/
├── routes/
│   ├── authRoutes.ts       ← /api/auth/*
│   ├── errandRoutes.ts     ← /api/errands/*
│   ├── userRoutes.ts       ← /api/users/*
│   ├── riderRoutes.ts      ← /api/riders/*
│   └── rateRoutes.ts       ← /api/rates/*
├── middleware/
│   ├── authMiddleware.ts   ← JWT verification
│   ├── roleMiddleware.ts   ← Role-based access
│   └── errorHandler.ts     ← Global error handler
├── services/
│   ├── errandService.ts    ← Business logic
│   └── userService.ts
└── index.ts                ← App entry point
```

### 4.3 Mandatory Middleware on ALL Protected Routes
Every route that requires authentication MUST use:
1. `authMiddleware` — verifies JWT token
2. `roleMiddleware` — verifies user role has permission

```ts
router.get('/errands', authMiddleware, roleMiddleware(['owner', 'dispatcher']), getErrands);
```

### 4.4 Consistent API Response Format
ALL API responses MUST follow this structure:
```ts
// Success
{ success: true, data: <payload>, message: 'Optional message' }

// Error
{ success: false, error: '<error code>', message: '<human-readable message>' }
```
NEVER send raw error objects, stack traces, or database error messages to clients in production.
