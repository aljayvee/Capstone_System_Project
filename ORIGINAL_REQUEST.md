# Original User Request

## Follow-up — 2026-07-29T15:03:40Z

# Teamwork Project Prompt — Draft

Develop production-ready features for the Customer Portal React Native Expo App, focusing on the Order Creation flow and setting up Google Maps for future live tracking.

Working directory: c:\Capstone_Project_Web\CustomerApp
Integrity mode: benchmark

## Requirements

### R1. Order Creation Flow
Implement the Order Creation flow (Services selection, forms, and checkout). Translate the existing web prototype (`CustomerPortal.tsx`) into functional React Native components using `react-navigation`.

### R2. Google Maps Setup
Integrate `react-native-maps` configured to use the Google Maps provider. (Note: Stub the API key integration so it can be provided via environment variables later).

### R3. Automated Testing
Write programmatic tests using Jest and/or React Native Testing Library to verify that the Order Creation components render correctly and handle user input.

## Acceptance Criteria

### UI & Forms
- [ ] The Order Creation screens (Services list, Order Form, Checkout) are navigable without crashing.
- [ ] The forms capture user input and update local state correctly.

### Maps Integration
- [ ] The `react-native-maps` library is installed and a MapView component is rendered (even if it shows a placeholder without the API key).

### Verification
- [ ] Jest tests are written for the Order Creation flow.
- [ ] Running `npm run test` passes without errors.

## Follow-up — 2026-07-29T19:51:23Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Build a Node.js/Express backend server that connects to a local MariaDB instance to handle User Registration and User Login (Authentication) from the React Native app. Additionally, configure the CustomerApp to use the correct Android emulator IP (`10.0.2.2`) to resolve the `ConnectException`.

Working directory: c:\Capstone_Project_Web\Backend
Integrity mode: benchmark

## Requirements

### R1. Backend API (Node.js/Express)
Initialize a new Node.js project in the `Backend` directory. Create an Express server running on port 5000 with a `/register` POST endpoint and a `/login` POST endpoint.

### R2. MariaDB Database Integration
Use a standard library (e.g., `mysql2` or `mariadb`) to connect to the local MariaDB instance. 
- The `/register` endpoint must securely insert new user data into a `users` table (hashing passwords with bcrypt is recommended).
- The `/login` endpoint must authenticate the user against the `users` table and return a success token/response.
Provide a database initialization script (`init.sql` or inline setup) if the table doesn't exist.

### R3. React Native Network Configuration & Integration
Update the React Native CustomerApp (`c:\Capstone_Project_Web\CustomerApp`) to point its API calls for both Registration and Login to `http://10.0.2.2:5000` (or dynamic local IP for physical devices) instead of `localhost` to resolve the Android network isolation issue. Ensure both flows work end-to-end.

## Acceptance Criteria

### API Functionality & DB
- [ ] The backend server starts up successfully on port 5000.
- [ ] A test script or Jest test can successfully send a POST request to `/register` and `/login` and verify a successful response for both.
- [ ] The inserted data persists correctly in the MariaDB `users` table.

### React Native App Connection
- [ ] The app's registration and login flows successfully reach the backend without a `java.net.ConnectException` and correctly handle the response.

## Follow-up — 2026-08-17T14:43:36Z

# Teamwork Project Prompt — Launched

> Requested team: Full team

Implement the complete Dispatcher Console safeguards pipeline (store-to-item itemization, customer order confirmation card, gated payment verification, and nearest-radius/repeat-customer rider dispatching with a 3-transaction cap) along with an emoji-free, psychology-driven Rider Mobile App UI revamp supporting sequential multi-errand queuing and silent re-routing.

Working directory: c:\Capstone_Project_Web and c:\Capstone_Project_Mobile_App\RiderMobileApp
Integrity mode: benchmark

## Requirements

### R1. Store-to-Item Itemization & Customer In-Chat Confirmation Card
- In the Dispatcher Console, enforce structured mapping between item requests and store pinpoints (e.g. *Store 1: Jollibee ➔ Chicken Joy*, *Store 2: Mercury Drug ➔ Foam Wash*).
- When the dispatcher commits the checklist, render an interactive, store-grouped Order Confirmation Card in the Customer Live Chat.
- Display exact calculated Delivery Fee upfront, while items are clearly marked *"Actual store receipt upon purchase"* (or estimated subtotal if provided).
- Include an interactive customer CTA button to confirm the itemized breakdown.

### R2. Step-Gated Dispatcher Operations Pipeline
- Enforce strict sequential gating in the Dispatcher Console:
  1. **Step 1 (Verify Items & Pin Stores)**: Map items to store pinpoints and send confirmation card.
  2. **Step 2 (Customer Confirmation)**: Customer approves the store & item breakdown.
  3. **Step 3 (Payment Verification)**: Dispatcher enables payment mode; customer selects payment mode (COD/GCash).
  4. **Step 4 (Rider Assignment)**: "Assign Rider Now" button unlocks strictly after payment verification is confirmed.

### R3. "Assign Rider Now" Intelligent Nearest & Repeat Customer Algorithm (Max 3 Transactions Cap)
- Replace all manual assignment buttons with a single **"Assign Rider Now"** action.
- **Assignment Logic**:
  1. **Repeat Customer Priority (Capped at 3)**: If the customer already has an active errand currently assigned to a rider, queue the new errand transaction ID (`#SGO-XXXX`) to that same rider **up to a maximum limit of three (3) active/queued transactions** for that customer.
  2. **Capacity / Proximity Radius Fallback**: If the repeat rider already has 3 transactions from that customer or is offline, calculate the distance from all online (`AVAILABLE`) riders to Store Pinpoint 1 and automatically assign the nearest eligible rider.

### R4. Multi-Task Queuing & Silent Re-Routing Lifecycle
- Support multi-errand queuing in the Rider Mobile App: a rider can accept up to 3 sequential tasks from the same or different customers without interrupting or abandoning their current in-progress task.
- **Rejection & Timeout Safeguard**:
  - If a rider declines or does not respond within 45 seconds, silently re-route the errand to the next nearest available rider.
  - The customer's chat and tracking screen update smoothly with *"Finding the best rider for your delivery..."* without alarming the customer.
  - The dispatcher is alerted only if all eligible riders decline or are out of radius.

### R5. Rider Mobile App UI/UX Revamp & Visual Ergonomics
- Overhaul the Rider Mobile App interface using cognitive ergonomic principles for riders operating vehicles in bright sunlight/road environments.
- **Strict Visual Rules**:
  - **Zero Emojis**: Replace all emojis with crisp, semantic SVG icons (Lucide React Native).
  - **Strict Color Accents**: Use official brand colors (`#DC2626` Crimson Red, `#1E3A5F` Navy Slate, `#10B981` Emerald Green, `#F59E0B` Amber).
  - **Incoming Mission Alert**: High-contrast, elevated bottom-sheet modal displaying customer name, numbered store waypoints, guaranteed rider earnings, 45s countdown timer bar, and bold Accept/Decline CTAs.
  - **Multi-Errand Header & Queue View**: Clean tab switcher showing Active Mission vs. Queued Next Delivery (supporting up to 3 tasks).

---

## Acceptance Criteria

### Dispatcher Safeguards & Gated Workflow
- [ ] Dispatcher cannot trigger "Assign Rider Now" until both store itemization and customer payment verification have been successfully confirmed.
- [ ] Customer chat renders a clean, store-grouped order card with clear item-to-store mapping and fixed delivery fee.

### Assignment Algorithm & Multi-Errand Lifecycle
- [ ] "Assign Rider Now" automatically assigns the repeat customer's rider (if < 3 active tasks) or the nearest online rider by GPS radius to Store 1.
- [ ] If a rider already has 3 transactions for that customer, the 4th transaction automatically falls back to the next nearest rider.
- [ ] Declining a queued task re-routes the errand to the next nearest rider while preserving the rider's current active mission.
- [ ] Customer is notified transparently during re-routing without alarming error messages.

### Rider Mobile App Experience & Quality
- [ ] All emoji characters removed from the Rider Mobile App in favor of crisp SVG icons.
- [ ] Incoming assignment bottom-sheet modal renders properly with store waypoints, earnings, and 45s auto-reassign countdown.
- [ ] Multi-task queue renders up to 3 sequenced errands cleanly.
- [ ] Zero TypeScript compilation errors (`npx tsc --noEmit`) across both `Capstone_Project_Web` and `RiderMobileApp`.
