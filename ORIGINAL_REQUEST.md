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
