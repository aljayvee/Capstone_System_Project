# Customer Portal Implementation Review & Critic Report

## Review Summary

**Verdict**: **REQUEST_CHANGES**

**Summary Rationale**:
While the Customer Portal implementation in `CustomerApp` includes well-structured React Native navigation (`AppNavigator.tsx`), UI screens (`ServiceListScreen`, `OrderFormScreen`, `CheckoutScreen`, `OrderConfirmationScreen`), Google Maps integration (`react-native-maps`), and test files, the codebase **fails both automated test execution (`npm run test`) and TypeScript type checking (`npx tsc --noEmit`)**. In addition, adversarial stress-testing revealed multiple state retention bugs and input validation gaps in `OrderFormScreen`.

---

## Findings

### [Critical] Finding 1: Automated Test Suite Suite Execution Failure (`npm run test`)

- **What**: All 6 test suites in `src/__tests__/` (18 out of 18 test cases) fail at runtime with `TypeError: getByTestId is not a function` / `TypeError: getByText is not a function`.
- **Where**: `src/__tests__/ServiceListScreen.test.tsx`, `src/__tests__/OrderFormScreen.test.tsx`, `src/__tests__/CheckoutScreen.test.tsx`, `src/__tests__/OrderConfirmationScreen.test.tsx`, `src/__tests__/Navigation.test.tsx`, `src/__tests__/EmpiricalChallenger.test.tsx`.
- **Why**: Package `@testing-library/react-native` v14.0.1 with React 19 returns a `Promise` from `render(...)`. The test suite calls `const { getByTestId } = render(...)` synchronously without `await`, leaving `getByTestId` undefined on the unresolved Promise object.
- **Suggestion**: Update test cases to be `async` and `await render(...)` (or adjust testing library setup for React 19 compatibility) so all assertions receive valid DOM query utilities.

### [Critical] Finding 2: TypeScript Compilation Failures (`npx tsc --noEmit`)

- **What**: `npx tsc --noEmit` fails with 20 TS2339 compiler errors across test files.
- **Where**: `src/__tests__/CheckoutScreen.test.tsx`, `src/__tests__/OrderConfirmationScreen.test.tsx`, `src/__tests__/OrderFormScreen.test.tsx`, `src/__tests__/ServiceListScreen.test.tsx`, `src/__tests__/Navigation.test.tsx`, `src/__tests__/EmpiricalChallenger.test.tsx`.
- **Why**: TypeScript detects that `render(...)` returns `Promise<{ getByTestId: ... }>` instead of the destructure result, flagging property access errors like `Property 'getByTestId' does not exist on type 'Promise<...>'`.
- **Suggestion**: Fix the return typing / `await` calls in test suites so TypeScript compilation passes with zero errors.

### [Major] Finding 3: Form Validation Gap — Missing Padala Receiver Address Check

- **What**: `OrderFormScreen` allows users to submit a Padala (Parcel Delivery) order with a completely blank receiver address.
- **Where**: `src/screens/OrderFormScreen.tsx`, lines 117–126 (`validateAndSubmit`).
- **Why**: `validateAndSubmit` checks `!padalaItem.trim()` and `!padalaReceiverPhone.trim()`, but neglects to check `!padalaReceiver.trim()`.
- **Suggestion**: Add `if (!padalaReceiver.trim()) { setValidationError('Please enter receiver address for Padala.'); return; }` to `OrderFormScreen.tsx`.

### [Major] Finding 4: Stale Form State Retention upon Category Unselection

- **What**: Unselecting a store category in Pabili does not purge previously entered items from state payload `catItems`.
- **Where**: `src/screens/OrderFormScreen.tsx`, lines 50–66 (`toggleCategory`).
- **Why**: When `toggleCategory` removes `catName` from `selectedCats`, `catItems[catName]` remains intact. When submitting, `orderPayload.catItems` still contains items for categories the user deselected.
- **Suggestion**: In `toggleCategory`, when removing a category from `selectedCats`, delete `catItems[catName]` from the state object.

### [Major] Finding 5: Preservation of Empty String Inputs in Order Payload

- **What**: Item input fields created with `+ Add Another Item` that are left blank (`""`) are included in the submitted `orderPayload.catItems`.
- **Where**: `src/screens/OrderFormScreen.tsx`, lines 107–114 & 147 (`validateAndSubmit`).
- **Why**: `validateAndSubmit` checks whether at least one item has content, but passes the raw `catItems` state containing empty strings into `orderPayload`.
- **Suggestion**: Sanitize `catItems` prior to building `OrderPayload` by filtering out empty strings (`items.filter(i => i.trim() !== '')`).

### [Minor] Finding 6: Commission Calculation Discontinuity for Bills Payment

- **What**: A bill of ₱3,000 incurs a flat ₱50 commission, while a bill of ₱3,001 incurs a 10% commission (₱300.10 round to ₱300), creating a ₱250 commission jump for a ₱1 bill difference.
- **Where**: `src/screens/CheckoutScreen.tsx`, lines 33–38.
- **Why**: Step function logic directly transitions from flat fee ₱50 to 10% percentage at >₱3000 threshold.
- **Suggestion**: Apply smooth tiered scaling or marginal commission calculation to avoid sharp price jumps.

### [Minor] Finding 7: 2-Service Cap Bypass via Direct Route Parameters

- **What**: If 3 services are passed in `route.params` to `OrderFormScreen`, all 3 service sections render without error or validation.
- **Where**: `src/screens/OrderFormScreen.tsx`, line 29 & lines 98–100.
- **Why**: The 2-service limit is enforced only in `ServiceListScreen` state, not re-validated in `OrderFormScreen`.
- **Suggestion**: Add a check in `OrderFormScreen` to truncate or warn if `selectedServices.length > 2`.

---

## Verified Claims

- **App Navigator & Types**: `src/navigation/AppNavigator.tsx` & `src/navigation/types.ts` set up Native Stack Navigation with typed params -> Verified via `view_file` -> **PASS**
- **Screen Components**: `ServiceListScreen`, `OrderFormScreen`, `CheckoutScreen`, `OrderConfirmationScreen` implemented in `src/screens/` -> Verified via `view_file` -> **PASS**
- **Maps Configuration**: `app.json` has `googleMaps` API keys (`AIzaSy_STUB_KEY_FOR_DEV_TESTING`), `.env` has `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, `PROVIDER_GOOGLE` used in `CheckoutScreen` & `OrderConfirmationScreen` -> Verified via `view_file` -> **PASS**
- **Jest Test Execution**: `npm run test` -> Executed via `run_command` -> **FAIL** (18 tests failed)
- **TypeScript Compilation**: `npx tsc --noEmit` -> Executed via `run_command` -> **FAIL** (20 TS errors)

---

## Adversarial Stress-Test / Critic Assessment

**Overall Risk Assessment**: **HIGH**

### Challenge Scenarios Evaluated
1. **COD Restriction & Commission Jumps**:
   - Bill > ₱3000 disables COD correctly, but ₱3000 vs ₱3001 bill creates a discontinuous ₱250 commission step change.
2. **State Leakage on Category Unselection**:
   - Unselecting a Pabili category retains items in `orderPayload`, creating potential ghost orders in dispatch.
3. **Blank Receiver Address Submission**:
   - Padala form accepts blank receiver addresses, causing incomplete delivery orders.
4. **Test Suite Async Render Vulnerability**:
   - Entire test suite rendered unusable due to un-awaited RNTL v14 render promises.

---

## Coverage Gaps

- **Real Map Tiles Rendering**: Verified `react-native-maps` configuration statically; live rendering requires physical device / Android emulator setup — risk level: **LOW** (accept risk, stub key configured for dev).
- **Firebase Realtime Database Connectivity**: Firebase config exists; runtime network writes mocked in Jest — risk level: **LOW**.

---

## Unverified Items

- None. All source files, test suites, types, configuration, and scripts were fully inspected and executed.
