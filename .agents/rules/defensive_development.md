# Defensive Development & Non-Happy-Path Rules

## 1. Zero-Assumption Rule (Strict Verification)
- NEVER guess API endpoints, database schemas, field names, or object structures.
- ALWAYS inspect existing source files, schemas, or docs before writing code that consumes them.
- If a data model or requirement is ambiguous, explicitly list the open questions rather than defaulting to a guess.

## 2. Anti-Happy-Path & Edge-Case Mandate
Every feature implementation MUST handle non-happy-path scenarios before declaring completion:
- **Network Interruptions & Offline Mode**: How does the app behave when connectivity drops (e.g., rider in low-signal areas)?
- **Input Validation & Sanitization**: Validate all inputs (phone numbers, price estimates, item lists, file uploads) on both frontend and backend.
- **Race Conditions & Concurrency**: What happens if two riders attempt to accept the same errand dispatch simultaneously?
- **Empty & Error States**: Provide clear UI empty states, loading indicators, retry buttons, and human-readable error messages.

## 3. Mandatory Empirical Verification
- NEVER declare a task fixed or complete without running build checks, unit tests, or runtime verification.
- Always include error logging and boundary checks (`try/catch`, null-checks, status code checks).

## 4. State Machine Strictness
- Define explicit, immutable state transitions for core business workflows (e.g., Errand Status: `PENDING` -> `ASSIGNED` -> `IN_TRANSIT` -> `DELIVERED` -> `COMPLETED` / `CANCELLED`).
- Prevent illegal state skips (e.g., transitioning directly from `PENDING` to `DELIVERED`).

## 5. Defensive Database Type Casting & Native Maps Type Safety
- ALWAYS explicitly cast numerical/decimal database values (such as `latitude`, `longitude`, `price`, `totalCost`, `amount`) using `Number(val)` or `parseFloat(String(val))` before invoking numeric prototype methods like `.toFixed()`.
- Perform null/undefined and `isNaN()` checks before dereferencing or passing coordinate objects to map markers or API payloads.
- **`react-native-maps` Invariant**: `initialRegion.latitude`, `initialRegion.longitude`, and `Marker.coordinate` MUST strictly receive JavaScript numbers (`typeof lat === 'number' && !isNaN(lat)`). Passing unparsed string representations (e.g., `"6.6710000"` from MySQL/MariaDB DECIMAL columns) causes native Android `AirMapViewManager` casting crashes.

## 6. React Rules of Hooks Top-Level Invariant
- NEVER invoke React custom hooks (functions starting with `use`) inside inline event handlers, callbacks, condition branches, or loops.
- ALWAYS destructure and call hooks strictly at the top level of function components, and pass destructured helper methods down to child props.