# Separation of Concerns & Feature Architecture Rules

## 1. Frontend UI vs. Backend/Service Layer Decoupling
- **Zero Business Logic in UI Components**: React components (`.tsx`) must focus purely on rendering UI layouts, handling user events, and styling.
- **Service Layer Abstraction**: All API calls, data mutations, and data fetching MUST be placed in `src/services/` (e.g., `src/services/errandService.ts`, `src/services/authService.ts`).
- **Custom Hook Encapsulation**: Complex state management, async data fetching, and state machine transitions MUST be encapsulated inside domain-specific custom hooks (e.g., `useOwnerMetrics`, `useDispatchQueue`, `useRiderStatus`).

## 2. Feature Module Isolation
- Each major domain or portal must reside in its own dedicated directory (e.g. `src/portals/owner/`, `src/portals/dispatcher/`).
- Sub-components must be decomposed into single-responsibility, modular files rather than single monolithic files (e.g. `MetricsGrid.tsx`, `UserDirectoryTable.tsx`, `RateConfigForm.tsx`, `ErrandQueueTable.tsx`).

## 3. Maintenance & Debuggability Invariant
- A bug in data fetching or state transitions must be debuggable solely within `src/services/` or `src/hooks/` without touching presentational UI styling.
- A bug in UI layout or styling must be fixable in presentational components without risking corruption of core data models or business state.
