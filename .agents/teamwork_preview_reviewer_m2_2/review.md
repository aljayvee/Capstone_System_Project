# Quality & Critical Review: CustomerApp (Customer Portal)

## Review Summary

**Verdict**: REQUEST_CHANGES

The CustomerApp implementation successfully satisfies requirements **R1** (Order Creation Flow screen implementation) and **R2** (Google Maps setup with `react-native-maps`, `PROVIDER_GOOGLE`, and stub API key configuration). However, it fails **R3** (Automated Testing) because both `npm run test` and `npx tsc --noEmit` fail with exit code 1.

---

## Requirement Compliance Matrix

| Requirement | Status | Verification Result | Rationale / Details |
|---|---|---|---|
| **R1: Order Creation Flow** | **PASS** | VERIFIED | `ServiceListScreen`, `OrderFormScreen`, `CheckoutScreen`, and `OrderConfirmationScreen` are fully implemented with interactive state management, itemized pricing, payment selection, and tracking. |
| **R2: Google Maps Setup** | **PASS** | VERIFIED | `react-native-maps` version `^1.29.0` installed in `package.json`. `PROVIDER_GOOGLE` imported and configured on `MapView` components. Stub API key `AIzaSy_STUB_KEY_FOR_DEV_TESTING` present in `.env` and `app.json` (iOS and Android). |
| **R3: Automated Testing** | **FAIL** | VERIFIED | `npm run test` fails (6/6 test suites failed, 18/18 tests failed). `npx tsc --noEmit` fails with type errors across test files due to synchronous destructuring of async `render()` from `@testing-library/react-native` v14. |

---

## Findings

### [Critical] Finding 1: R3 Test Suite and Type Checking Failure

- **What**: Executing `npm run test` and `npx tsc --noEmit` in `c:\Capstone_Project_Web\CustomerApp` fails with exit code 1.
- **Where**: All test files in `src/__tests__/` (`ServiceListScreen.test.tsx`, `OrderFormScreen.test.tsx`, `CheckoutScreen.test.tsx`, `OrderConfirmationScreen.test.tsx`, `Navigation.test.tsx`, `EmpiricalChallenger.test.tsx`).
- **Why**: Under `@testing-library/react-native` v14 (with React 19), `render()` returns a `Promise<RenderResult>`. The test files call `const { getByTestId } = render(...)` synchronously without `await` inside async test functions. This causes:
  1. TypeScript type mismatch (`Property 'getByTestId' does not exist on type 'Promise<...>'`).
  2. Runtime test failure (`TypeError: getByTestId is not a function`).
- **Suggestion**: Update test functions in `src/__tests__/` to be `async () => { ... }` and use `await render(...)`.

---

### [Major] Finding 2: Missing Validation for Receiver Address in Padala Service

- **What**: Padala order submission does not enforce entering a Receiver Address.
- **Where**: `c:\Capstone_Project_Web\CustomerApp\src\screens\OrderFormScreen.tsx:117-126`
- **Why**: `validateAndSubmit` checks `!padalaItem.trim()` and `!padalaReceiverPhone.trim()`, but omits checking `!padalaReceiver.trim()`.
- **Impact**: A customer can place a courier delivery request with a receiver phone number but no delivery address.
- **Suggestion**: Add `if (!padalaReceiver.trim()) { setValidationError('Please enter receiver address for Padala.'); return; }` in `validateAndSubmit`.

---

### [Major] Finding 3: Commission Fee Discontinuity at ₱3,000 Threshold

- **What**: Severe pricing step jump between ₱3,000 and ₱3,001 total purchase amount.
- **Where**: `c:\Capstone_Project_Web\CustomerApp\src\screens\CheckoutScreen.tsx:33-38`
- **Why**: Commission is computed as:
  ```ts
  if (totalPurchaseAmount > 3000) {
    commission = Math.round(totalPurchaseAmount * 0.1);
  } else if (totalPurchaseAmount > 0) {
    commission = 50;
  }
  ```
- **Impact**: 
  - For a ₱3,000 bill, commission is ₱50.00.
  - For a ₱3,001 bill, commission jumps to ₱300.00 (6x increase for ₱1 difference).
- **Suggestion**: Consider smooth tiered commission or applying the 10% rate only on the amount exceeding ₱3,000 (e.g. `50 + Math.round((totalPurchaseAmount - 3000) * 0.1)`).

---

### [Minor] Finding 4: Unselected Category Stale Data Retention

- **What**: Deselecting a Pabili category does not remove its previously entered items from `catItems`.
- **Where**: `c:\Capstone_Project_Web\CustomerApp\src\screens\OrderFormScreen.tsx:50-66`
- **Why**: `toggleCategory` removes the category string from `selectedCats`, but leaves `catItems[catName]` intact.
- **Impact**: If a user selects "Retail Store", types items, deselects "Retail Store", and submits, the payload `catItems` object still contains the stale "Retail Store" items.
- **Suggestion**: In `toggleCategory`, when unselecting a category, clean up `catItems` using `delete updatedCatItems[catName]`.

---

## Verified Claims

- `npm run test` executed via `run_command` in `CustomerApp` → **FAILED** (6/6 failed)
- `npx tsc --noEmit` executed via `run_command` in `CustomerApp` → **FAILED** (exit code 1)
- `react-native-maps` package in `package.json` → **VERIFIED** (`^1.29.0`)
- `PROVIDER_GOOGLE` in `CheckoutScreen` & `OrderConfirmationScreen` → **VERIFIED**
- Stub API Key in `.env` and `app.json` → **VERIFIED**

---

## Adversarial Stress-Test Summary

| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| Run automated test suite | `npm run test` passes 100% | Exit code 1; 18/18 tests throw `TypeError` | **FAIL** |
| Run TypeScript compiler | `npx tsc --noEmit` passes with 0 errors | Exit code 1; 26+ TS errors in test files | **FAIL** |
| Submit Padala with blank Receiver Address | Validation error requesting receiver address | Order accepted and navigated to Checkout | **FAIL** |
| Calculate commission for ₱3,000 vs ₱3,001 | Smooth fee scale | ₱50.00 at ₱3,000 vs ₱300.00 at ₱3,001 | **FAIL** |
| COD selection for Bills Payment > ₱3,000 | COD tile disabled, warning shown | COD disabled and switched to GCash | **PASS** |
