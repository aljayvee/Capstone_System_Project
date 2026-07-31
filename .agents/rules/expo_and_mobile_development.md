# Expo & Android Mobile Development Guardrails

## 1. Expo SDK 56+ React Navigation Conflict Protocol
When configuring React Native Expo (SDK 56+) projects with standard `@react-navigation/native`, `expo-router` is included in default templates and causes fatal bundler conflicts.
Always execute all 4 steps to cleanly sever `expo-router`:
1. Run `npm uninstall expo-router`
2. Remove `"expo-router"` from the `"plugins"` array in `app.json`.
3. Remove `"typedRoutes": true` from `"experiments"` in `app.json`.
4. Set `"web.output": "single"` in `app.json`.

## 2. Android Cleartext Traffic & Expo Go Dynamic IP Resolution
1. **Cleartext Security Policy**: Starting in Android 9 (API 28), cleartext HTTP (`http://`) traffic is blocked by default in **release builds** and throws `java.net.UnknownServiceException`. Debug builds remain permissive (React Native injects its own debug network config), so this bug surfaces only in release APKs.
   - **Managed Workflow**: Add `"usesCleartextTraffic": true` under `"android"` in `app.json`. Expo prebuild will propagate this to `AndroidManifest.xml` automatically.
   - **Bare Workflow (ejected `android/` folder)**: `app.json` alone is **NOT enough** — it does not regenerate `AndroidManifest.xml` at build time. You MUST also add `android:usesCleartextTraffic="true"` directly to the `<application>` tag in `android/app/src/main/AndroidManifest.xml`:
     ```xml
     <application
       android:name=".MainApplication"
       ...
       android:usesCleartextTraffic="true">
     ```
   - **Diagnosis tip**: If `"usesCleartextTraffic": true` exists in `app.json` but release builds still throw `UnknownServiceException`, always inspect `AndroidManifest.xml` directly — the attribute is almost certainly absent.
2. **Dynamic LAN IP Detection for Expo Go**: When connecting Expo Go on physical mobile devices to a local backend, use `Constants.expoConfig?.hostUri` from `expo-constants` to dynamically resolve the developer host machine's Wi-Fi IP address (e.g. `http://192.168.x.x:5000`).
   - **No Hardcoded IPs**: NEVER hardcode static IP addresses (e.g., `192.168.x.x`) in API configuration fallbacks. Fallbacks must strictly use `http://10.0.2.2:5000` (for Android Emulators) or `http://localhost:5000` (for iOS/Web). All dynamic host resolution must rely on `Constants.expoConfig?.hostUri` or explicit `EXPO_PUBLIC_API_BASE_URL` environment variables.

## 3. Mobile Data Storage & Firebase vs MariaDB Separation
- **Firebase Realtime Database**: Reserve exclusively for high-frequency live GPS tracking data (`locations/customers/{customerId}`). Do NOT store order tables or transaction history in Firebase RTDB.
- **MariaDB (`errand_system_db`)**: Store all persistent domain entities (`customers`, `users`, `pabili_orders`) in MariaDB. All mobile CRUD operations for orders must go through the Node.js/Express REST API.

## 4. React Native Maps & Provider Fallbacks
- Avoid specifying `provider={PROVIDER_GOOGLE}` on `<MapView>` unless an active, billed Google Maps Android API Key is verified in `app.json`.
- Omit `provider` prop to use default map rendering in Expo Go to avoid solid black map containers on physical Android devices.

## 5. Dynamic State & Empty State Handling
- Never render hardcoded fallback text (e.g. dummy rider names or status strings) for empty data states.
- Explicitly check if data exists (e.g., `activeOrder ? (...) : (<EmptyState />)`) and display action buttons (e.g. `+ Create Pabili Request`) when accounts have no active orders.
