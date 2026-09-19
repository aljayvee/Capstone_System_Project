# SUGO On-The-Go Operations Web Portal

Web operations console for the SUGO On-The-Go on-demand delivery and logistics platform in Tacurong City, Philippines.

The portal provides desktop administrative and dispatch interfaces for operational personnel, structured into two dedicated workflows:
1. **Owner Portal**: High-level business telemetry, financial accounting, rate configuration, staff management, and fleet monitoring.
2. **Dispatcher Console**: Real-time order intake queue, errand triage, rider assignment, live customer messaging, and cash settlement reconciliation.

---

## Technical Stack

- Framework: React 18 (Vite build engine)
- Language: TypeScript (Strict mode enabled)
- Styling: Tailwind CSS
- Component Primitives: Radix UI, Base UI, Lucide React (vector icons)
- Maps Integration: Google Maps JavaScript API via `@googlemaps/js-api-loader`
- Real-Time Telemetry: Firebase Realtime Database SDK, Socket.IO Client
- HTTP Client: Centralized Axios client with automatic silent JWT token refresh

---

## Portals and Feature Modules

### 1. Owner Administration Portal (`/owner`)
- **Executive Dashboard**: Live operational metrics (on-duty riders, pending errands, active runs), period-filtered revenue curves, and completed delivery tallies.
- **Financial and Audit Reports**: Standardized reporting engine with PDFKit generation and CSV exports for:
  - Sales and revenue breakdown by merchant category
  - Rider performance and customer rating distribution
  - Commission splits (80/20 platform fee distribution)
  - Daily cash settlement reconciliation and cash variances
  - Transaction ledger summaries
  - Exception audits (divergent receipts, unverified purchases, wrong-branch visits)
- **User Management**: Creation, profile updates, and status toggles for operational personnel (`OWNER`, `DISPATCHER`, `RIDER`). Customer records are deliberately scoped out to preserve registration integrity.
- **Rider Fleet Management**: Comprehensive rider roster, duty status logs, and credential verification.
- **Live Fleet Tracking**: Interactive Google Map displaying live rider coordinates categorized across four presence states:
  - Available (Online, ready for dispatch)
  - Busy (Online, actively fulfilling an errand)
  - Disconnected (Signal lost or heartbeat stale > 60 seconds)
  - Off-Duty (Shift ended)
- **Merchant Categories**: Directory of operational store categories, icon management, handling fee configurations, and visibility toggles.
- **Service Rates Configuration**: Base delivery fee, per-kilometer excess distance surcharge, multi-stop stop fees, and purchase handling fee thresholds.

### 2. Dispatcher Fulfillment Console (`/dispatcher`)
- **Master-Detail Split View**: Dual-pane workspace keeping the incoming order queue visible while inspecting order details or chatting with customers.
- **Errand Lifecycle Triage**: Multi-step progression tracking through unassigned, accepted, in-transit, and completed states.
- **Interactive Multi-Stop Route Planning**: Store pinpoint selection with live hover previews on verified commercial branches.
- **Live Customer Chat**: Direct real-time communication channel per active errand to verify brand substitutes and item availability.
- **Conflict Protection**: Single-dispatcher ownership locking to prevent dual-handling collisions across concurrent dispatchers.

### 3. Places Directory (`/places`)
- Directory of verified commercial establishments in Tacurong City.
- Stores ground-truth GPS coordinates, street addresses, and assigned merchant categories to ensure accurate road-network routing.

---

## Architecture and Security Invariants

### 1. Token Storage and Refresh Protocol
- Access tokens are held exclusively in React state memory.
- Refresh tokens rotate upon every renewal and persist in HttpOnly cookies or protected session storage.
- A centralized Axios interceptor (`src/services/apiClient.ts`) catches HTTP 401 responses, silently negotiates a new access token via `/api/auth/refresh`, and retries the original request seamlessly.

### 2. Role-Based Route Protection (RBAC)
- All non-public routes are wrapped in `<ProtectedRoute>`.
- Client-side navigation validates the caller's active role before mounting portal components, redirecting unauthorized users to their appropriate interface.

### 3. Asynchronous Google Maps Loading
- Google Maps JavaScript API is initialized strictly through `@googlemaps/js-api-loader` via `src/utils/loadGoogleMaps.ts`.
- Direct `<script>` injections and uncontrolled `window.google` references are forbidden to ensure compliance with Google async loading standards and prevent race conditions.

---

## Directory Structure

```text
src/
├── app/
│   ├── App.tsx                  # Application root provider tree
│   └── routes.tsx               # React Router route definitions
├── components/                  # Shared UI components (dialogs, inputs, date pickers)
├── constants/                   # Tacurong service area bounds, rate standards
├── context/
│   └── AuthContext.tsx          # Centralized authentication and session provider
├── firebase/
│   └── config.ts                # Client-side Firebase SDK initialization
├── hooks/                       # Reusable data hooks (useReport, useDashboardMetrics)
├── portals/
│   ├── dispatcher/              # Dispatcher Console views and split panels
│   └── owner/                   # Owner Portal views, charts, and report modules
│       ├── modules/             # Domain modules (dashboard, reports, users, tracking)
│       └── screens/             # Standalone sub-screens (PlacesDirectoryScreen)
├── services/
│   ├── apiClient.ts             # Axios instance with auth refresh interceptor
│   └── apiService.ts            # Typed API methods mapped to backend endpoints
├── styles/                      # Tailwind styles and custom design tokens
├── types/                       # Shared TypeScript interfaces
└── utils/                       # Date formatters, currency helpers, download utilities
```

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Backend API server running on port 5000 (or remote staging URL)

### 1. Installation

Clone the repository and install dependencies:

```bash
cd Capstone_Project_Web
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
# Backend API Base URL
VITE_API_URL=https://api.sugo-express.org/api

# Google Maps API Key (Must be restricted to authorized web referrers in Google Cloud Console)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_browser_key_here

# Firebase Web Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=capstonedata-3589c.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://capstonedata-3589c-default-rtdb.asia-southeast1.firebasedatabase.app/
VITE_FIREBASE_PROJECT_ID=capstonedata-3589c
```

### 3. Development Server

Start the local Vite development server:

```bash
npm run dev
```

The portal will be accessible at `http://localhost:5173`.

### 4. Production Build

Verify TypeScript compilation and generate production assets:

```bash
# Type check and bundle
npm run build

# Preview production build locally
npm run preview
```

The output bundle is compiled into the `dist/` directory.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local Vite development server with Hot Module Replacement |
| `npm run build` | Compiles TypeScript and builds optimized production assets into `dist/` |
| `npm run preview` | Runs a local web server serving the compiled `dist/` bundle |

---

## Production Deployment

The production web assets are hosted on a Contabo Linux VPS running Nginx:

1. Generate a clean production build:
   ```bash
   npm run build
   ```

2. Sync the compiled `dist` directory to the web root on the VPS:
   ```bash
   scp -r dist/* root@109.123.239.182:/var/www/web/dist/
   ```

3. Nginx serves the static bundle over HTTPS at `https://sugoonthego.online`.

---

## Author and Project Ownership

- Project Owner and Lead Developer: Aljayvee P. Versola
- GitHub: [@aljayvee](https://github.com/aljayvee)
- Repository: [Capstone_System_Project](https://github.com/aljayvee/Capstone_System_Project)

---

## License

This project is licensed under the Apache-2.0 License.
