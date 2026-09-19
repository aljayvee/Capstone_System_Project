# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: **dispatchers on shift** at Sugo on the Go in Tacurong City, South Cotabato. They work the console for a full shift on a desktop or a tablet in mixed lighting, holding several errands in flight at once while watching for the one that needs a decision. Their shift is a queue-with-exceptions job: claim an errand, check the order with the customer, pin the stores, confirm what was actually available and at what price, take payment, hand a rider a route.

Secondary, confirmed from the codebase but not the audience this console is designed for: **owners/administrators** (separate Owner portal: users, riders, merchant categories, service rates, financial reports, rider tracking), **riders** (separate mobile app), and **customers** (separate mobile app, CustomerApp).

## Product Purpose

Sugo on the Go runs errands and *pabili* (buy-on-behalf) orders: a customer asks for goods to be bought and brought to them. The dispatcher console is where a person reconciles the messy reality of a shopping trip before money moves, then commits a rider to a route.

Success for a shift is that every errand either moves through the five stages or is declined with a recorded reason, no exception sits unresolved over money, and nothing in the interface tells the dispatcher something untrue about the state of the operation.

## Positioning

The reconciliation step is the product. A conventional delivery app moves a known item from a known menu at a known price; a *pabili* errand cannot, because stock-outs, substitutions and price overages are the normal case rather than the exception. Sugo commits a named human to resolving what was actually available and at what price, records why, and only then takes payment. The dispatcher is not overhead in this model, they are the mechanism.

## Operating Context

- **The five dispatch stages**, in order: check the order, pin the stores, confirm items and prices, payment, send the rider. The order-chat overlay is where a dispatcher works a single errand through these stages alongside a live customer conversation.
- **The claim rule.** An errand is visible to a dispatcher when it is `AVAILABLE`, or when it is already theirs. This stops two dispatchers working one queue. It is deliberately not applied to exceptions: an unreconciled shortfall needs acting on regardless of who claimed the errand.
- **The exception queue.** Overages, shortfalls and held goods, each carrying an amount at risk, resolved with a written justification that becomes an audit trail.
- **Rider presence by beacon.** A rider is presumed offline when no beacon is received. A powered-off handset and one in a dead zone send identically nothing, so presence is a presumption the interface must not overstate.
- **Live data.** Socket.io pushes errand changes; Firebase Realtime Database carries rider chat; rider positions and ETAs are scoped to authenticated staff sockets.
- **Deployment.** The built dashboard is served from `/var/www/web/dist/` on a Contabo VPS and deployed manually by the user via `scp`. The agent never runs `scp`.

## Capabilities and Constraints

- **Stack:** React 19 + Vite + TypeScript + Tailwind CSS v4, `react-router`, `lucide-react` icons, Geist Variable and Geist Mono Variable self-hosted via `@fontsource-variable`. This repository is **frontend only**.
- **Backend is a separate repository** at `C:\Capstone_Server\server`: Express + TypeScript on port 5000, 3NF MariaDB via Prisma (`errands` + `pabili_details_tbl`). Frontend work never modifies routes, controllers, schema, migrations or queries. API base URL comes from `VITE_API_URL`, falling back to `http://localhost:5000/api`.
- **Auth:** JWT access token (15m) held in memory, 30-day rotating refresh token in an `HttpOnly` cookie, silent refresh on 401. A client that does not single-flight the refresh or does not persist the rotated token revokes its own session.
- **Known data constraints:** `Errand` has no `baseFee` column, so a fee breakdown must derive the base by subtraction or it will silently fail to add up. `VerifiedPlace` is the store picker and cannot double as a landmark gazetteer without splitting those two jobs.
- **No test infrastructure.** No vitest, no testing-library, no test script. Verification is `tsc --noEmit`, `npm run build`, the Impeccable detector, and browser inspection. Seeded staff credentials no longer log in, so browser inspection of a portal needs a temporary unprotected route.
- **Quarantine:** `FigmaPrototype/` holds obsolete prototype code and is never referenced, inspected or modified.

## Brand Commitments

- Name: **Sugo on the Go**. The portal identifies itself as "Sugo On the Go Portal" with "Tacurong City Logistics & Fleet Management".
- Palette is fixed: Deep Navy (`#0B132B`, `#0F2035`, `#1E3A5F`), SUGO Red (`#E53935`, `#F62459`), and tinted slates. No purple, violet or indigo; no gradients.
- Icons are clean monochrome SVG from `lucide-react` only. No emoji as structural icons in headers, buttons, status pills or navigation.
- No em dashes in UI copy, titles, labels or documentation.
- Geometry: cards, inputs and buttons at 8-12px radius; full pills reserved for status chips; modals 16-20px.
- Voice, as already written in the product's own copy: plain, concrete, and willing to name a limit. "Presumed offline - no beacon received." "That's the limit, five stores for one errand." Errors name the problem and the recovery.

## Evidence on Hand

- A live API and a seeded database; real errand, rider and staff records.
- `docs/errand_pricing_formula.md`, `docs/gis_routing_and_eta.md`, `docs/conceptual_database_model.md`, `docs/view_erd.html`.
- Two prior design reviews under `.impeccable/critique/`: the login portal (scored 22/40) and the operational sidebar (19/40). The sidebar review's remediations have largely been applied; the login review's "Forgot Password", brandmark and engine-status-pill items are recorded in `AGENT_HANDSHAKE.md` as done but are **not** present in the code.
- **What does not exist and must never be fabricated:** customer testimonials, case studies, press, adoption or volume figures, benchmark timings, and pricing claims beyond what the rates module actually stores. The dispatcher console currently fabricates three things that must be removed rather than reproduced: a `₱85` delivery-fee fallback, a placeholder phone number `09123456789`, and a hardcoded "GPS Signal Live" indicator that never checks rider presence.

## Product Principles

1. **Truthful state outranks reassuring state.** A failed request must never render as good news. "All caught up" and "everything reconciles" are claims about money and work, and the interface may only make them when the data actually said so.
2. **The queue is never more than one action away.** A dispatcher holds several errands at once; anything that hides the queue, adds a click to claiming, or takes over the screen to show a detail has made the shift harder.
3. **A person's judgement is the product, so record the reason.** Declines, resolutions and substitutions carry written justification. A reason a dispatcher wrote and the system discarded is a defect.
4. **Presumptions are labelled as presumptions.** Rider presence, ETAs and derived totals are stated with the confidence the underlying signal supports, not with more.
5. **Nothing slower on hour ten.** Density, scanability and familiar affordances beat expression on this surface. Brand lives in precise details, never in decoration that costs a dispatcher time.

## Accessibility & Inclusion

WCAG 2.2 AA is a committed requirement: text at 4.5:1 or better (large text 3:1), no body or metadata text below 60% opacity on dark surfaces. Interactive targets are at least 36px, which the tablet usage makes load-bearing rather than nominal. The queue must be keyboard operable with visible `focus-visible` styling. Numeric data uses tabular figures so digits do not jitter as values update.
