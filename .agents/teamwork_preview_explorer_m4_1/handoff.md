# Milestone 4 (Login Screen UI R4) Technical Handoff & Implementation Blueprint

## 1. Observation

### Source File Inspections & Verbatim Findings

1. **`c:/Capstone_Project_Web/RiderMobileApp/src/modules/auth/LoginScreen.tsx`**:
   - Theme Token Usage: Lines 67-81 use hardcoded hex values and raw numbers instead of importing tokens from `src/config/theme.ts`:
     ```ts
     // Line 67: container: { flex: 1, backgroundColor: "#F9FAFB", ... }
     // Line 69: avatarBadge: { ..., backgroundColor: "#DC2626", ... }
     // Line 74: card: { backgroundColor: "#FFFFFF", borderRadius: 20, borderColor: "#E5E7EB", ... }
     // Line 77: loginBtn: { backgroundColor: "#DC2626", borderRadius: 12, ... }
     ```
   - Input Validation & Submit Handler: Lines 10-16 only validate `username`:
     ```ts
     const handleLogin = () => {
       if (!username.trim()) {
         Alert.alert("Error", "Please enter your Rider ID or Username.");
         return;
       }
       login(username);
     };
     ```
     `password` is neither validated for presence nor passed into `login()`.
   - Loading State & Spinner: `LoginScreen.tsx` has no `isLoading` state, no `ActivityIndicator`, and no disabled state on `loginBtn` while a request is in flight.
   - Error Display: Uses native `Alert.alert` instead of an inline UI error banner styled with theme tokens for 401 Unauthorized or network errors.

2. **`c:/Capstone_Project_Web/RiderMobileApp/src/config/theme.ts`**:
   - Contains exported theme tokens: `Colors` (`primary: "#DC2626"`, `bgLight: "#F9FAFB"`, `textDark: "#1F2937"`, `border: "#E5E7EB"`, `primaryLight: "#FEE2E2"`, `primaryDark: "#B91C1C"`), `FontSizes`, `FontWeights`, `Spacing`, and `BorderRadius`.

3. **`c:/Capstone_Project_Web/RiderMobileApp/src/config/apiConfig.ts`**:
   - Line 1: `export const API_BASE_URL = "http://localhost:5000/api";`
   - Requirement R4 explicitly specifies connecting via local IP address (e.g. `http://192.168.8.138:5000/api`).

4. **`c:/Capstone_Project_Web/RiderMobileApp/src/context/RiderAuthContext.tsx`**:
   - Lines 62-84: `login` function is currently a mock handler:
     ```ts
     const login = async (username: string, _password?: string) => {
       // mock user object creation without fetch call to POST /api/auth/login
     }
     ```
   - Needs real `fetch` call to `${API_BASE_URL}/auth/login` to authenticate against backend MariaDB database.

5. **`c:/Capstone_Project_Web/server/src/index.ts`**:
   - Lines 26-61: Endpoint `POST /api/auth/login` is implemented, validating `username` and `password` against Prisma `user.passwordHash` using `bcrypt.compare`. Returns 200 with sanitized user object or 401 `{ error: "Invalid username or password" }`.

6. **TypeScript Compiler Check**:
   - Executed `npx tsc --noEmit` in `c:/Capstone_Project_Web/RiderMobileApp`:
     Result: 0 errors returned.

---

## 2. Logic Chain

1. **Requirement R4 Alignment**: Requirement R4 mandates that `LoginScreen.tsx` matches the app's current theme using tokens in `theme.ts`, includes username and password inputs, a submit button with loading state, proper error handling/display for invalid credentials, and connects to the backend API via the local IP address (`http://192.168.8.138:5000/api`).
2. **Theme Token Refactoring**: `LoginScreen.tsx` currently hardcodes styling properties. Importing `Colors`, `FontSizes`, `FontWeights`, `Spacing`, `BorderRadius` from `../../config/theme` ensures 100% design system compliance and UI consistency across the Rider App.
3. **Backend Integration & Host Configuration**: `apiConfig.ts` currently defaults to `localhost`. Setting `API_BASE_URL` to `"http://192.168.8.138:5000/api"` allows mobile devices/emulators to connect to the backend server. Updating `login` in `RiderAuthContext.tsx` to execute `fetch(`${API_BASE_URL}/auth/login`, ...)` connects the UI state seamlessly to the Node.js/Express backend authentication endpoint.
4. **Validation & UI State Management**: Adding `password` validation ensures empty inputs are caught early. Maintaining `isLoading` and `errorMessage` states in `LoginScreen.tsx` enables rendering an `ActivityIndicator` on the login button and displaying an inline error banner for 401 Unauthorized / network failures.

---

## 3. Caveats

- **Network IP Range**: `192.168.8.138` is specified in requirement R4. If running on a different local network adapter, the host IP can be configured in `apiConfig.ts`.
- **Offline / Development Testing**: Retaining a demo quick-login option or graceful network fallback ensures developers can test UI screens even when the local server is temporarily stopped.

---

## 4. Conclusion & Step-by-Step Implementation Blueprint

The existing `LoginScreen.tsx` and `RiderAuthContext.tsx` provide the layout skeleton but require theme token integration, real backend `POST /api/auth/login` fetch requests, input validation, loading indicator, and inline error banner display to fully satisfy Requirement R4.

### Step-by-Step Implementation Blueprint

#### Step 1: Update API Base URL (`RiderMobileApp/src/config/apiConfig.ts`)
- Update `API_BASE_URL` to point to `http://192.168.8.138:5000/api`.

#### Step 2: Implement Real Authentication in `RiderAuthContext.tsx` (`RiderMobileApp/src/context/RiderAuthContext.tsx`)
- Import `API_BASE_URL` from `../config/apiConfig`.
- Update `login(username: string, password?: string)`:
  1. Make HTTP `POST` request to `${API_BASE_URL}/auth/login` with body `{ username, password }`.
  2. If response is not OK (`!res.ok`), parse JSON error message (or fallback to `"Invalid username or password"`) and throw an `Error`.
  3. If response is 200 OK, parse user object (`userData`), create `RiderUser` object (`id`, `username`, `name`, `phone`, `isOnline: true`, `vehicle`), generate token, store `AuthSession` in `AsyncStorage`, and update `rider` state and `token` state.

#### Step 3: Refactor and Enhance `LoginScreen.tsx` (`RiderMobileApp/src/modules/auth/LoginScreen.tsx`)
- Import theme tokens: `import { Colors, FontSizes, FontWeights, Spacing, BorderRadius } from "../../config/theme";`.
- Import `ActivityIndicator` from `react-native` and `AlertCircle` from `lucide-react-native`.
- Add local state:
  - `username`: string (default `"rider01"`)
  - `password`: string (default `"password123"`)
  - `isLoading`: boolean (default `false`)
  - `errorMessage`: string | null (default `null`)
- Implement `handleLogin`:
  1. Clear existing `errorMessage`.
  2. Validate `username.trim()` and `password.trim()`. If either is empty, set `errorMessage` accordingly (e.g. `"Please enter both username and password."`).
  3. Set `isLoading(true)`.
  4. Call `await login(trimmedUsername, trimmedPassword)`.
  5. In `catch (err)`, set `errorMessage(err.message || "Login failed. Please check your credentials.")`.
  6. In `finally`, set `isLoading(false)`.
- Render UI components:
  - **Inline Error Banner**: Render styled `<View style={styles.errorBanner}>` with `AlertCircle` icon and `errorMessage` text when present.
  - **Inputs**: Apply `Colors.bgLight`, `Colors.border`, `Colors.textDark`, `FontSizes.md`, `BorderRadius.md`.
  - **Submit Button**: Render `ActivityIndicator` when `isLoading` is true; disable button when `isLoading` is true. Apply `Colors.primary` and `BorderRadius.md`.
  - **Quick Login Helper**: Retain demo quick-login helper button for convenience.

---

## 5. Verification Method

To verify the implementation independently:

1. **TypeScript Type Safety**:
   ```cmd
   cd c:\Capstone_Project_Web\RiderMobileApp
   npx tsc --noEmit
   ```
   Must return 0 errors.

2. **Source Code Inspection**:
   - Inspect `LoginScreen.tsx` to verify zero raw hex colors/magic numbers remain and all styling uses `Colors`, `FontSizes`, `FontWeights`, `Spacing`, `BorderRadius` from `src/config/theme.ts`.
   - Inspect `apiConfig.ts` to confirm `API_BASE_URL` contains `192.168.8.138:5000/api`.
   - Inspect `RiderAuthContext.tsx` to confirm `fetch` call to `${API_BASE_URL}/auth/login` is implemented.

3. **Backend API End-to-End Test**:
   - Ensure `server/` is running (`node dist/index.js` or `npx ts-node src/index.ts`).
   - Trigger login with valid credentials (`rider01` / `password123`) -> expecting 200 OK and navigation to Main Tab Bar.
   - Trigger login with invalid password (`rider01` / `wrongpass`) -> expecting inline error banner displaying "Invalid username or password".
