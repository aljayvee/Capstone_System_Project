# Code Quality, Architecture & Engineering Standards

> **ENFORCEMENT LEVEL: STRICT**
> All generated code MUST comply with every section below.
> Non-compliant code must be refactored BEFORE being considered complete.
> Spaghetti code is NEVER acceptable — no exceptions.

---

## 1. SDLC (Software Development Life Cycle) Standards

### 1.1 Phase Gates — Never Skip
Every feature or fix MUST pass through these phases in order:

```
PLAN → DESIGN → IMPLEMENT → VERIFY → DEPLOY
```

| Phase | Required Actions |
|---|---|
| **PLAN** | Clarify requirements, identify affected modules, list edge cases |
| **DESIGN** | Define data flow, identify which design pattern applies, draft interfaces/types first |
| **IMPLEMENT** | Write code following SOLID + pattern rules below |
| **VERIFY** | Run build, check TypeScript errors, manually test happy + non-happy paths |
| **DEPLOY** | Commit only verified, working code — never push broken builds |

### 1.2 Definition of Done (DoD)
A task is ONLY complete when ALL of the following are true:
- [ ] TypeScript compiles with zero errors (`tsc --noEmit`)
- [ ] No `console.log` or debug artifacts left in code
- [ ] All edge cases (empty state, error state, loading state) are handled
- [ ] No hardcoded values — all constants in `src/constants/` or `.env`
- [ ] Code is readable without inline comments explaining "what" — only "why"
- [ ] No dead code, unused imports, or commented-out blocks left behind

### 1.3 Change Impact Analysis
Before modifying any existing file:
1. Identify ALL other files that import or depend on it
2. Assess risk of breaking existing features
3. If high-risk, implement behind a feature flag or in a new module first

---

## 2. SOLID Architecture Principles (Strict Enforcement)

### S — Single Responsibility Principle
- **One file = one responsibility.**
- A React component renders UI only — it does NOT fetch data, manage auth, or run business logic.
- A service file handles one domain only (e.g., `errandService.ts` handles errands — not users).
- If a function exceeds **30 lines**, it is doing too much — decompose it.
- If a file exceeds **200 lines**, it has too many responsibilities — split it.

```ts
// ❌ WRONG — component doing everything
const ErrandList = () => {
  const [errands, setErrands] = useState([]);
  useEffect(() => { axios.get('/errands').then(r => setErrands(r.data)); }, []);
  const assign = (id) => axios.post(`/errands/${id}/assign`);
  return <div>...</div>;
};

// ✅ CORRECT — UI only, logic in hook + service
const ErrandList = () => {
  const { errands, assignErrand } = useErrandQueue();
  return <div>...</div>;
};
```

### O — Open/Closed Principle
- Modules MUST be **open for extension, closed for modification**.
- Add new behavior by creating new files/classes, not by editing stable existing ones.
- Use composition and interfaces to extend functionality.
- NEVER modify a working service to add an unrelated feature — create a new service or extend via inheritance/composition.

### L — Liskov Substitution Principle
- Subtypes must be substitutable for their base types without breaking behavior.
- If a component or function accepts a `User` interface, any object satisfying `User` must work correctly.
- NEVER add properties to subtypes that break the parent contract.

### I — Interface Segregation Principle
- NEVER create "god interfaces" with 10+ properties that not all consumers use.
- Split large interfaces into smaller, focused ones:
```ts
// ❌ WRONG
interface User { id: string; name: string; role: string; riderVehicle: string; customerAddress: string; }

// ✅ CORRECT
interface BaseUser { id: string; name: string; role: UserRole; }
interface RiderProfile extends BaseUser { vehicle: string; }
interface CustomerProfile extends BaseUser { defaultAddress: string; }
```

### D — Dependency Inversion Principle
- High-level modules (components, hooks) MUST NOT depend on low-level modules (Axios, Firebase SDK) directly.
- Always depend on **abstractions (interfaces/service functions)**, not concrete implementations.
- Components call `errandService.getAll()` — NOT `axios.get('/api/errands')` directly.

---

## 3. Design Patterns — Mandatory Usage Guide

### 3.1 Creational Patterns

#### Factory Pattern
- Use when creating objects of varying types based on a condition.
- Apply for: creating different notification types, user profile objects by role.
```ts
// src/factories/userFactory.ts
export const createUserProfile = (role: UserRole, data: BaseUser): UserProfile => {
  switch (role) {
    case 'rider': return new RiderProfile(data);
    case 'customer': return new CustomerProfile(data);
    case 'owner': return new OwnerProfile(data);
    default: throw new Error(`Unknown role: ${role}`);
  }
};
```

#### Singleton Pattern
- Use for: API client instance, global config, WebSocket connection.
- The Axios instance in `src/services/apiClient.ts` MUST be a singleton.
- NEVER instantiate multiple Axios clients across the app.

#### Builder Pattern
- Use when constructing complex objects step-by-step.
- Apply for: building complex query filters, constructing errand request payloads.

---

### 3.2 Structural Patterns

#### Adapter Pattern
- Use when integrating third-party APIs or SDKs whose interfaces differ from your internal data shapes.
- Wrap Firebase, Google Maps, or payment SDKs behind adapter classes in `src/adapters/`.
- Internal code NEVER calls Firebase directly — always through an adapter.
```ts
// src/adapters/authAdapter.ts
export const authAdapter = {
  login: (email: string, pw: string) => firebaseSignIn(auth, email, pw),
  logout: () => firebaseSignOut(auth),
};
```

#### Facade Pattern
- Use to simplify complex subsystems behind a single clean interface.
- Apply for: combining auth + user profile fetch into one `loginAndLoadUser()` function.
- Apply for: wrapping multiple Firebase/DB operations behind one service call.

#### Decorator Pattern
- Use to add behavior to functions/classes without modifying them.
- Apply for: adding logging, caching, or retry logic to service functions.

#### Composite Pattern
- Use for tree-structured UI components (nested menus, permission trees, errand item lists with sub-tasks).

---

### 3.3 Behavioral Patterns

#### Observer Pattern
- Use for: real-time updates (errand status changes, rider location updates).
- Implement via React Context + subscriptions, or WebSocket event emitters.
- Firebase `onSnapshot` listeners ARE the observer pattern — use them consistently for real-time data.

#### Strategy Pattern
- Use when behavior needs to be swappable at runtime.
- Apply for: different payment calculation strategies, route optimization algorithms, dispatch assignment logic.
```ts
// src/strategies/dispatchStrategy.ts
interface DispatchStrategy { assign(errand: Errand, riders: Rider[]): Rider; }
class NearestRiderStrategy implements DispatchStrategy { ... }
class RatingBasedStrategy implements DispatchStrategy { ... }
```

#### Command Pattern
- Use for: undo/redo operations, queuing user actions, audit logging.
- Apply for: errand cancellation with rollback, batch errand assignments.

#### State Pattern
- Errand lifecycle MUST use the State Pattern — each status is an explicit state object with defined transitions.
- NEVER use raw `if/else if` chains to determine errand behavior — use state objects.
```ts
// src/states/errandStates.ts
const ErrandStates = {
  PENDING:    { next: ['ASSIGNED'], prev: [] },
  ASSIGNED:   { next: ['IN_TRANSIT', 'CANCELLED'], prev: ['PENDING'] },
  IN_TRANSIT: { next: ['DELIVERED'], prev: ['ASSIGNED'] },
  DELIVERED:  { next: ['COMPLETED'], prev: ['IN_TRANSIT'] },
  COMPLETED:  { next: [], prev: ['DELIVERED'] },
  CANCELLED:  { next: [], prev: ['PENDING', 'ASSIGNED'] },
};
```

#### Template Method Pattern
- Use for: defining a skeleton algorithm where subclasses fill in specific steps.
- Apply for: base form submission flow, base data-fetch lifecycle.

---

## 4. Software Quality Assurance (SQA) Standards

### 4.1 Code Review Checklist (Self-Review Before Every Commit)
Before writing `git commit`, verify:
- [ ] No function longer than 30 lines
- [ ] No file longer than 200 lines
- [ ] No magic numbers or strings — use named constants
- [ ] No `any` TypeScript type
- [ ] No direct DOM manipulation (`document.getElementById`) inside React
- [ ] No business logic inside React component bodies
- [ ] All async calls have `try/catch` and loading/error states
- [ ] No duplicate code — DRY (Don't Repeat Yourself) enforced

### 4.2 Naming Conventions (Non-Negotiable)
| Construct | Convention | Example |
|---|---|---|
| React Components | PascalCase | `ErrandCard`, `RiderStatusBadge` |
| Hooks | camelCase + `use` prefix | `useErrandQueue`, `useRiderLocation` |
| Services | camelCase + `Service` suffix | `errandService`, `authService` |
| Interfaces/Types | PascalCase | `ErrandStatus`, `RiderProfile` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_DELIVERY_RADIUS`, `TOKEN_EXPIRY_MS` |
| Enums | PascalCase values | `UserRole.OWNER`, `ErrandStatus.PENDING` |
| Files (components) | PascalCase | `ErrandQueueTable.tsx` |
| Files (services/hooks) | camelCase | `errandService.ts`, `useAuth.ts` |

### 4.3 Anti-Patterns — STRICTLY FORBIDDEN
The following patterns are BANNED in this codebase:

| Anti-Pattern | Why Banned | Correct Approach |
|---|---|---|
| God Component | One component doing everything | Decompose into container + presentational |
| Prop Drilling (3+ levels) | Makes refactoring painful | Use Context or Zustand/state manager |
| Magic Numbers | `if (status === 3)` is unreadable | Use enums: `if (status === ErrandStatus.IN_TRANSIT)` |
| Inline Styles | Unmaintainable, inconsistent | Use CSS modules or design token classes |
| Direct State Mutation | Breaks React reactivity | Always return new objects/arrays |
| Nested Ternaries | `a ? b ? c : d : e` is unreadable | Use early returns or switch statements |
| Copy-Paste Code | Creates divergent bugs | Extract to shared utility/hook/component |
| `useEffect` Overuse | Side-effect spaghetti | Prefer derived state, event handlers, or React Query |

### 4.4 File & Folder Structure Enforcement
```
src/
├── adapters/        ← Third-party SDK wrappers (Firebase, Maps, etc.)
├── components/      ← Shared, reusable UI components only
├── constants/       ← App-wide constants and enums
├── context/         ← React Context providers (AuthContext, etc.)
├── factories/       ← Factory functions for object creation
├── hooks/           ← All custom React hooks
├── portals/
│   ├── owner/       ← Owner portal pages + portal-specific components
│   ├── dispatcher/  ← Dispatcher portal
│   ├── rider/       ← Rider portal
│   └── customer/    ← Customer portal
├── services/        ← All API calls and business logic functions
├── states/          ← State machine definitions (errand states, etc.)
├── strategies/      ← Strategy pattern implementations
├── types/           ← TypeScript interfaces and type definitions
└── utils/           ← Pure utility functions (no side effects)
```
> Files placed in the **wrong folder** must be moved before a PR/commit is accepted.

### 4.5 Testing Standards
- Write tests for: all service functions, all custom hooks, all state machines.
- Use **React Testing Library** for component tests — test behavior, not implementation.
- Every bug fix MUST include a regression test that would have caught the bug.
- Minimum test coverage targets:
  - `src/services/` → 80% coverage
  - `src/states/` → 100% coverage (state machines must be fully tested)
  - `src/utils/` → 90% coverage

---

## 5. Anti-Spaghetti Code Rules (Zero Tolerance)

1. **No function does more than ONE thing.** Name it after that one thing.
2. **No file mixes layers.** A service file has NO JSX. A component file has NO `axios` calls.
3. **No circular imports.** If A imports B and B imports A, redesign the architecture.
4. **No implicit side effects.** A function named `getUser()` must NOT also log analytics or modify state.
5. **Fail fast, fail loudly.** Validate inputs at the boundary of every function. Throw explicit errors with descriptive messages.
6. **One source of truth.** Data lives in one place — derived data is computed, not duplicated.
7. **Flat is better than nested.** Maximum nesting depth in JSX: **4 levels**. Maximum nesting in logic: **3 levels** of conditions.
8. **Explicit over implicit.** Code should read like prose. A new developer must understand a function's purpose within 10 seconds.
