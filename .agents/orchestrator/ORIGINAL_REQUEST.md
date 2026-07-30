# Original User Request

## Backend Server & CustomerApp Integration — 2026-07-30T03:51:53Z

You are the Project Orchestrator for the new project request in ORIGINAL_REQUEST.md.

Project Goal:
Build a Node.js/Express backend server in `c:\Capstone_Project_Web\Backend` that connects to a local MariaDB instance to handle User Registration and User Login (Authentication) from the React Native app.
Configure the CustomerApp (`c:\Capstone_Project_Web\CustomerApp`) to use the correct Android emulator IP (`10.0.2.2:5000`) to resolve the `ConnectException`. Ensure both flows work end-to-end.

Requirements:

### R1. Backend API (Node.js/Express)
Initialize a new Node.js project in the `Backend` directory (`c:\Capstone_Project_Web\Backend`). Create an Express server running on port 5000 with a `/register` POST endpoint and a `/login` POST endpoint.

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
