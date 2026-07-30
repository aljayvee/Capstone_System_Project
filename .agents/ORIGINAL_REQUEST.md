# Original User Request

## Initial Request — 2026-07-29T10:03:43Z

Implement a login interface for the Rider Mobile App and connect it to the existing Node.js/Prisma backend connected to a Laragon MariaDB database.

Working directory: c:/Capstone_Project_Web
Integrity mode: development

## Requirements

### R1. Backend Authentication API
Modify the backend in `server/` to support secure authentication. Update the existing user registration endpoint (`POST /api/users`) to hash passwords using `bcrypt`. Create a new login endpoint (`POST /api/auth/login`) that verifies the `username` and hashed `password` using Prisma, returning the user object on success or a 401 on failure.

### R2. Mobile Auth State & Persistence
In `RiderMobileApp/`, implement an `AuthContext` to manage the authentication state globally. Persist the session using `@react-native-async-storage/async-storage` so users remain logged in across app restarts.

### R3. Mobile Navigation Restructuring
Update `App.tsx` in `RiderMobileApp/` to use `@react-navigation/stack`. Conditionally render a `LoginScreen` if the user is unauthenticated, or the existing `Tab.Navigator` (Main App) if the user is authenticated. 

### R4. Login Screen UI
Create `src/modules/auth/LoginScreen.tsx` that matches the app's current theme (using existing tokens in `theme.ts`). It must include username and password inputs, a submit button, and proper error handling/display for invalid credentials. Use the local IP address (e.g., `192.168.8.138`) to connect to the backend API.

## Acceptance Criteria

### Backend Verification
- [ ] A script or curl command can successfully register a new user, and the database shows a `bcrypt` hashed password in the `passwordHash` field.
- [ ] A script or curl command can successfully log in with the correct credentials and receive a 200 OK response with the user data.
- [ ] A script or curl command receives a 401 Unauthorized response when attempting to log in with an incorrect password.

### Mobile App Verification
- [ ] The app compiles successfully (`npx tsc --noEmit` returns 0 errors) in `RiderMobileApp/`.
- [ ] The `package.json` in `RiderMobileApp/` includes `@react-native-async-storage/async-storage`.
- [ ] The `App.tsx` file correctly wraps the navigation in an Auth Provider and conditionally renders the stack screens.

## Follow-up — 2026-07-29T11:10:00Z

Fix a critical runtime crash in the Rider Mobile App (`c:/Capstone_Project_Web/RiderMobileApp`) that prevents the app from launching on Android due to a React Navigation / gesture handler context incompatibility.

Working directory: c:/Capstone_Project_Web/RiderMobileApp
Integrity mode: development

## Error

The app crashes on launch with:

```
ERROR  Warning: Rendering <Context> directly is not supported and will be removed in a future major release.
ERROR  TypeError: render is not a function (it is Object)
   in GestureHandlerRootView (created by StackView)
   in StackNavigator (created by AppContent)
```

## Root Cause

`@react-navigation/stack` v6 depends on `react-native-gesture-handler`, which is **not listed** in `package.json`. Without it, the `GestureHandlerRootView` inside `StackView` uses the legacy React Context API pattern (`<Context>` directly) which is incompatible with the React 18 version bundled with Expo 51.

## Requirements

### R1. Eliminate the Crash
Fix the crash so the app launches successfully on Android without any `TypeError: render is not a function` or `Rendering <Context> directly is not supported` errors. The login screen must be displayed when unauthenticated.

### R2. Maintain Existing Architecture
The fix must preserve the existing authentication flow: `RiderAuthProvider` wrapping `AppContent`, which conditionally renders `LoginScreen` (unauthenticated) or `MainTabNavigator` (authenticated) via a stack-style navigator. Do not remove or replace `RiderAuthContext` or the auth logic.

### R3. No Breaking Changes
After the fix, the app must still compile cleanly with zero TypeScript errors (`npx tsc --noEmit`). All four main tab screens (Home, Tasks, Earnings, Profile) must remain navigable once authenticated.

## Acceptance Criteria

### Runtime Crash Eliminated
- [ ] Running `npx expo start --android` (or equivalent) produces no `TypeError: render is not a function` error.
- [ ] The app renders the Login screen on cold start without crashing.

### TypeScript Build
- [ ] `npx tsc --noEmit` in `RiderMobileApp/` returns 0 errors.

### Architecture Preserved
- [ ] `App.tsx` still wraps everything in `<RiderAuthProvider>`.
- [ ] Conditional navigation between Login and Main tabs remains intact.
- [ ] The `package.json` reflects any newly added or changed dependencies.

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
