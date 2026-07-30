# Customer Portal Implementation Review Handoff Report

## 1. Observation

Direct observations from repository inspection and command execution in `c:\Capstone_Project_Web\CustomerApp`:

1. **Command Execution Output**:
   - Executed `npm run test` in `c:\Capstone_Project_Web\CustomerApp`:
     ```
     Test Suites: 6 failed, 6 total
     Tests:       18 failed, 18 total
     Time:        92.569 s
     TypeError: getByTestId is not a function / TypeError: getByText is not a function
     ```
   - Executed `npx tsc --noEmit` in `c:\Capstone_Project_Web\CustomerApp`:
     ```
     Command failed with exit code: 1
     src/__tests__/CheckoutScreen.test.tsx(27,13): error TS2339: Property 'getByTestId' does not exist on type 'Promise<...>'.
     src/__tests__/EmpiricalChallenger.test.tsx(68,13): error TS2339: Property 'unmount' does not exist on type 'Promise<...>'.
     src/__tests__/Navigation.test.tsx(7,13): error TS2339: Property 'getByText' does not exist on type 'Promise<...>'.
     src/__tests__/OrderConfirmationScreen.test.tsx(32,13): error TS2339: Property 'getByTestId' does not exist on type 'Promise<...>'.
     src/__tests__/OrderFormScreen.test.tsx(23,13): error TS2339: Property 'getByTestId' does not exist on type 'Promise<...>'.
     src/__tests__/ServiceListScreen.test.tsx(22,13): error TS2339: Property 'getByTestId' does not exist on type 'Promise<...>'.
     (20 TS errors total across test files)
     ```

2. **File Structure & Navigation**:
   - `src/navigation/types.ts`: Defines `RootStackParamList`, `UserData`, `PadalaDetails`, `BillsDetails`, `OrderPayload`, `FinalOrder`.
   - `src/navigation/AppNavigator.tsx`: Configures Native Stack Navigator for `Login`, `Register`, `CustomerPortal`, `ServiceList`, `OrderForm`, `Checkout`, `OrderConfirmation`.

3. **Screen Implementations**:
   - `src/screens/ServiceListScreen.tsx`: Enforces max 2 services selection limit in state (`selectedServices.length >= 2`).
   - `src/screens/OrderFormScreen.tsx`:
     - Lines 117-126 (`validateAndSubmit`): Validates `padalaItem` and `padalaReceiverPhone`, but omits validation for `padalaReceiver`.
     - Lines 50-66 (`toggleCategory`): Removes category name from `selectedCats` on unselect, but retains entries in `catItems`.
     - Lines 224-241 (`catItems` inputs): Retains empty strings `""` in `catItems[catName]` without stripping them prior to payload creation.
   - `src/screens/CheckoutScreen.tsx`:
     - Lines 105-121: Configures `MapView` with `PROVIDER_GOOGLE` and Tacurong coordinates (`6.671, 124.6644`).
     - Lines 33-38: Commission calculated as flat ₱50 for total purchase $\le$ ₱3000, 10% for total purchase > ₱3000.
     - Lines 43-48: Restricts COD if `Bills Payment` amount > ₱3000.
   - `src/screens/OrderConfirmationScreen.tsx`: Renders Digital Receipt, Tracking Stepper (6 steps), and MapView rider location preview.

4. **Map & Test Configuration**:
   - `app.json`: `googleMapsApiKey` / `googleMaps.apiKey` configured with `AIzaSy_STUB_KEY_FOR_DEV_TESTING`.
   - `.env`: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy_STUB_KEY_FOR_DEV_TESTING`.
   - `jest.config.js` & `jest.setup.js`: Setup preset `jest-expo` and mock `react-native-maps`, `@react-navigation/native`, `firebase/app`, `firebase/database`.

---

## 2. Logic Chain

1. **Observation 1** shows that `npm run test` and `npx tsc --noEmit` fail 100% of test suites and type checks. The error messages `TypeError: getByTestId is not a function` and `error TS2339: Property 'getByTestId' does not exist on type 'Promise<...>'` confirm that `@testing-library/react-native` v14.0.1 returns a `Promise` from `render(...)` under React 19, whereas all tests call `render(...)` synchronously without `await`.
2. **Observation 3** reveals three functional logic flaws in `src/screens/OrderFormScreen.tsx`:
   - Missing validation for `padalaReceiver` allows users to submit parcel delivery requests with empty receiver locations.
   - Unselecting a store category in Pabili leaves stale items in `catItems`, causing unselected categories to persist in the submitted `orderPayload`.
   - Empty input strings created via `+ Add Another Item` are preserved in `catItems` rather than being filtered out.
3. Therefore, despite having complete UI structure and map configuration, the implementation cannot be approved due to test/type failures and form validation/state retention bugs.

---

## 3. Caveats

- **No Code Modifications Made**: Operating under review-only role constraints; no source code or test file modifications were performed in `CustomerApp`.
- **Firebase Network Writes**: Realtime Database writes in `CheckoutScreen` use try-catch and are mocked in Jest; live network connectivity was not tested against production Firebase instance.

---

## 4. Conclusion

**Verdict**: **REQUEST_CHANGES**

**Required Actions**:
1. Fix test suites in `src/__tests__/` to `await render(...)` (or adjust testing setup) so `npm run test` and `npx tsc --noEmit` execute with 0 errors.
2. In `OrderFormScreen.tsx`, validate `padalaReceiver.trim()`, delete `catItems[catName]` upon category unselection, and sanitize empty strings from `catItems`.

---

## 5. Verification Method

To independently verify this report:

1. **Run Tests**:
   ```bash
   cd c:\Capstone_Project_Web\CustomerApp
   npm run test
   ```
   *Expected behavior currently*: Fails with 18 failing tests / 6 failing suites (`TypeError: getByTestId is not a function`).

2. **Run Type Check**:
   ```bash
   cd c:\Capstone_Project_Web\CustomerApp
   npx tsc --noEmit
   ```
   *Expected behavior currently*: Fails with 20 TS2339 compiler errors in test files.

3. **Inspect Form Validation**:
   Inspect `src/screens/OrderFormScreen.tsx` lines 117-126 to verify `padalaReceiver` is missing validation.
