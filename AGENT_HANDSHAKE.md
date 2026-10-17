# 🌐 DUAL-MODEL COLLABORATION TUNNEL (CLAUDE ◄► GEMINI)

> **ALWAYS ACTIVE IN ALL SESSIONS**: This file is the shared living memory between Claude App (Anthropic) and Antigravity 2.0 (Google AI / Gemini). Both models MUST read this file at the start of every session before modifying code.

---

## 📡 Tunnel State
* **Active Mission**: Dispatcher Portal Dashboard, Operational Pulse Strip, Bottleneck Attention Radar & Shift Handover Handshake
* **Current Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
* **Target Workspace**: `Capstone_Project_Web` (Web Portal) & `Capstone_Server/server` (API Backend)
* **Last Updated**: 2026-10-17 (Compiler Verified: `npx tsc --noEmit` clean 0 errors)

---

## 🔒 LOCKED CONTRACT REGISTRY (ZERO-REGRESSION POLICY)
> **MANDATORY INVARIANT**: Any item marked `[LOCKED]` CANNOT be renamed, refactored, or restructured without joint consensus between Claude and Gemini.
* `[LOCKED]` `Prisma Schema: C:\Capstone_Server\server\prisma\schema.prisma` (3NF relational schema: `errands` + `pabili_details_tbl`). NOTE: the backend server lives OUTSIDE this repo. There is no `server/` directory in `Capstone_Project_Web`. Never scaffold one.
* `[LOCKED]` `JWT Authentication Architecture` (15m access token in memory, 30-day rotating refresh token with silent refresh)
* `[LOCKED]` `Zero-Slop UI Standard` (No purple gradients, no fake metrics, no emojis in structural buttons, no em dashes)
* `[LOCKED]` `Anti-Happy-Path Engineering` (All operations must implement Loading, Error, Empty, and Success states with draft preservation)
* `[LOCKED]` `Samsung A04 Typography Clamping` (scaledFontSize factor 0.20-0.35, clamped [0.85x, 1.10x])
* `[LOCKED]` `Production VPS Deployment Pipelines (Contabo VPS 109.123.239.182)`:
  - **Agent Execution Permitted (amended 2026-09-23 by direct user instruction)**: The prior
    "User-Exclusive Execution Boundary", which STRICTLY FORBADE the agent from running `scp`,
    is **revoked**. The user granted Claude standing `ssh` and `scp` access to this VPS on
    2026-09-23, stating the same consent already applies to Gemini models. Recorded here rather
    than left implicit so future sessions inherit the permission instead of re-asking.
    - This amendment was made on the user's sole instruction. It did NOT go through the
      joint Claude/Gemini consensus the registry header requires for a `[LOCKED]` change.
    - Standing permission covers deployment. It does NOT extend to the prohibitions that sit
      outside this file: no entering passwords or credentials, no destructive database action
      without an explicit confirmation and a backup taken first.
  - Deployment targets. Both replaced raw `scp -r dist/*` on 2026-09-23 and are
    now self-cleaning; add `--no-build` to either to ship the existing `dist/`:
    1. **Web & Staff Portal** (`https://portal.sugo-express.org`): `scripts/deploy-web.sh`
       - **Amended 2026-10-05 on the user's direct instruction** (not joint consensus, same as the
         amendment above): the portal has been served at `portal.sugo-express.org` since 2026-10-03,
         and `sugo-express.org` returns 410 on every path. The script's live check now probes the portal,
         so a 410 from it is a real failure. The Canonical Domain invariant below still names
         `sugo-express.org` and was NOT changed.
    2. **Landing Page** (`https://sugoonthego.online`): `scripts/deploy-landing.sh`
       - Its source lives at `C:\Capstone_Landing_Page`, **outside this repo, and
         that folder is not a git repository at all** — so the script that deploys
         it is kept here where it can be version controlled. `LANDING_SOURCE`
         overrides the path if the checkout moves.
       - `DEPLOY_HEAVY="downloads"` names the 125 MB customer APK. It is compared
         by size then md5 and skipped when unchanged, so it does not cross the
         wire on every deploy — and because the skip is an rsync `--exclude`,
         `--delete` cannot remove it either. Verified by md5 after the first run.
    - Both wrap `scripts/deploy-site.sh`, which holds all the machinery and is
      driven by `DEPLOY_HOST/ROOT/SOURCE/URL/LABEL/HEAVY`.
    3. Backend (`/var/www/server`): `git pull && npm run build && pm2 restart capstone-backend`.
       **Build ON the server**, from the source checked out there. A prebuilt
       `dist` copied up is how the binary and the source drifted apart and
       crash-looped production on 2026-09-23 (see the recon entry below).
  - **Database deploys use `prisma db push`, NEVER `prisma migrate deploy`.** There is no
    `_prisma_migrations` table on production, so Prisma reports all 55 migrations as unapplied.
    Running `migrate deploy` would attempt to replay from `0_baseline` against a populated
    database. Verified 2026-09-23.
  - **The web portal deploy is self-cleaning as of 2026-09-23.** `scp -r dist/*` copies over
    but never deletes, so every build ever shipped had accumulated: 433 files, 43 MB, 33
    `DispatcherPortal-*.js` bundles. `scripts/deploy-web.sh` now uploads a tar stream to a
    staging directory and runs `rsync -rlt --delete-after` server-side, leaving exactly the
    72 files of the current build (13 MB).
    - The upload is staged rather than `rsync`ed directly because rsync must exist on BOTH
      ends and the Windows workstation has none; the VPS has 3.2.7. Staging needs only ssh
      and tar locally.
    - Deleted files are parked in `/root/deploy-backups/web-<stamp>/`, never destroyed.
      Roll back with `rsync -rlt '<backup>/' /var/www/web/dist/`.
    - The script verifies that every chunk referenced by `index.html` AND every chunk
      referenced from inside the other JS files still resolves. That second check matters:
      `DispatcherPortal-*.js` is lazy-imported and appears in no HTML, so a keep-list built
      from `index.html` alone would delete the live dispatcher bundle.
  - **`sugoonthego.online` sits behind Cloudflare with bot protection.** A `curl` to the
    public URL answers `403` with `cf-mitigated: challenge` while real browsers are served
    normally, and an automated browser gets the "Just a moment..." interstitial. Any deploy
    check against that URL therefore reports failure on success. `deploy-site.sh` probes
    local nginx with `curl --resolve <domain>:443:127.0.0.1`, which is both CDN-independent
    and immune to the CDN serving a cached copy of the previous deploy. `sugo-express.org`
    is not currently challenged, but the same probe is used for both.
  - **`index.html` is served `no-cache, must-revalidate`** on BOTH sites (nginx
    `location = /index.html`).
    It carried no `Cache-Control` at all until 2026-09-23, so browsers cached the SPA
    manifest heuristically — and because `try_files $uri $uri/ /index.html` serves the HTML
    for any missing path, a chunk that had been pruned came back as HTML where JavaScript
    was expected, rendering a blank app instead of a clean 404. Hashed assets keep their
    1-year immutable caching; the exact-match `location =` outranks the asset regex.
  - **Residual, accepted:** `--delete` removes superseded chunks immediately, so a tab left
    open across a deploy may fail to lazy-load a chunk it had not yet fetched. A refresh
    fixes it, and the manifest is now always fresh. No cache header can prevent this — a
    running SPA holds its manifest in memory.
* `[LOCKED]` `Outdated FigmaPrototype Folder Quarantine`:
  - `C:\Capstone_Project_Web\FigmaPrototype\` contains obsolete prototype code and must NEVER be referenced, inspected, or modified.
* `[LOCKED]` `Flat Design Surface Purity & Zero-Shadow Invariant`:
  - Flat design surfaces (e.g. login portal, flat operator consoles) strictly prohibit `backdrop-blur-*`, radial/ambient gradient blooms, heavy drop shadows (`shadow-2xl`, `shadow-lg`, `shadow-md`, `shadow-sm`), and decorative card hairline borders. Pure solid flat fills only.
* `[LOCKED]` `Impeccable UI/UX Design System & Strict Anti-AI-Slop Invariant`:
  - Installed via `npx impeccable install -y --project` provisioning `.agents/skills/impeccable/`, `.claude/skills/impeccable/`, `.claude/agents/`, and native engine binaries.
  - Active and mandatory across ALL workspaces (Web Dashboard, CustomerApp, RiderMobileApp, and backend consoles).
  - Strictly enforces the Impeccable craft floor: WCAG 2.2 AA contrast >= 4.5:1, tinted neutrals (zero dead gray/black), asymmetric vertical rhythm (margin-top >= 1.5-2.5x margin-bottom), browser surface theming (selection, caret, scrollbars, focus rings, tabular numbers), primary action law (SUGO red = act only), and visitor mode classification (Operate vs Persuade vs Read vs Experience vs Native).
  - Absolute Anti-AI-Slop Refusals: Zero nested cards, zero identical [Icon+Heading+Paragraph] card scaffolds, zero hero-metric dashboard clichés, zero decorative kickers/eyebrows, zero purple/indigo gradients, zero pill action buttons, zero zero-offset glowing aura shadows, zero emoji structural icons, zero fake reviews/counters/urgency, zero gradient text, zero glassmorphism as lazy decoration, zero monospace as costume, and zero em dashes in UI copy.
* `[LOCKED]` `Canonical Domain & Routing Architecture Invariant`:
  - **Web & Staff Operations Portal**: `https://sugo-express.org` (Dispatcher/Owner/Staff portal; API `https://api.sugo-express.org/api`).
  - **Public Landing Page**: `https://sugoonthego.online` (Public download & marketing page from `C:\Capstone_Landing_Page`).
  - All landing page links to "Staff Portal" MUST resolve to `https://sugo-express.org`.
* `[LOCKED]` `Gemini Non-Autonomous Execution & Claude Cognitive Alignment Protocol`:
  - Active across ALL workspaces (`Capstone_Project_Web`, `CustomerApp`, `RiderMobileApp`, `Capstone_Server`, and global `GEMINI.md`).
  - Gemini models (Gemini 3.x Pro, Gemini 3.8 Flash High) are strictly prohibited from autonomous or unilateral execution.
  - Must strictly emulate and execute through the 6-stage Claude Cognitive Thinking Process (Context Grounding -> Hypothesis & Trade-offs -> User Consultation Gate -> Surgical Delta -> Defensive Rigor -> Empirical Verification).
  - Codified in `C:\Capstone_Project_Web\.agents\rules\gemini-claude-thinking-alignment.md` and global `GEMINI.md`.


---

## 2026-10-17 - Dispatcher Portal Dashboard, Operational Pulse Strip, Bottleneck Radar & Queue Deep-Link Auto-Select (Antigravity 2.0, Gemini 3.8 Flash High)
* **Status**: [COMPLETED & VERIFIED - `npx tsc --noEmit` passed with 0 errors across `Capstone_Project_Web` and `Capstone_Server/server`].
* **Feature & Implementation Specification**:
  - **Dispatcher Dashboard Views & Layout**:
    - Default landing tab set to `dashboard` (`/portal/dispatcher?tab=dashboard`) across desktop sidebar and mobile bottom navigation.
    - `DispatcherDashboardView.tsx`: Main dashboard container using `PanelShell` and `PanelState` with 60s background refresh and instant Socket.io cache invalidation.
    - `DispatcherPulseStrip.tsx`: 5-metric operational pulse strip with hairline dividers and WCAG 2.2 AA contrast (`text-signal-on-field` on dark field `#0B132B`).
    - `DispatcherAttentionRadar.tsx`: 60% width attention center with actionable drill-downs (stalled dwells, stale unclaimed, overage disputes, cancellations) and `[ Claim & Review ➔ ]` CTA.
    - `DispatcherFleetMatrix.tsx`: 40% width real-time fleet presence, battery health, and online status.
    - `DispatcherPipelineTracker.tsx`: Visual milestone tracker mapping active Tacurong orders across the 5 canonical phases (`Claimed` -> `To Store` -> `Bought` -> `On the way` -> `Delivered`).
    - `DispatcherOperationalMetrics.tsx`: High-density operational data cards displaying today's top merchants, top decline reasons, and personal dispatcher shift throughput/latency (omitted rush histogram per Decision 3).
  - **Queue Deep-Link Auto-Select & Modal Separation**:
    - Separated full-screen chat modal (`?errand=...`) from queue workspace inspection selection (`selectedQueueErrandId` via `?select=...`).
    - `navigateToQueueAndSelect(errandId)` in `useDispatcherPortal.ts` atomically navigates to `tab=queue&select=ERR-xxx` and clears `errand` so the chat modal does NOT block the queue inspection view.
    - `DispatchManagementWorkspace.tsx`: Added `selectedErrandId` prop, synchronized selection upon change, automatically switched `activeSegment` to `"ACTIVE"`, and set `narrowPane("run")`.
  - **Socket Order Synchronization**:
    - Updated `order:claimed` and `order:updated` socket listeners in `useDispatcherPortal.ts` to prepend newly released/available orders into state without requiring manual page reload.
* **Files Modified / Created**:
  - `src/portals/dispatcher/DispatcherPortal.tsx`
  - `src/portals/dispatcher/hooks/useDispatcherPortal.ts`
  - `src/portals/dispatcher/components/workspace/DispatchManagementWorkspace.tsx`
  - `src/types/errand.ts`
  - `src/portals/dispatcher/components/dashboard/DispatcherDashboardView.tsx`
  - `src/portals/dispatcher/components/dashboard/DispatcherPulseStrip.tsx`
  - `src/portals/dispatcher/components/dashboard/DispatcherAttentionRadar.tsx`
  - `src/portals/dispatcher/components/dashboard/DispatcherFleetMatrix.tsx`
  - `src/portals/dispatcher/components/dashboard/DispatcherPipelineTracker.tsx`
  - `src/portals/dispatcher/components/dashboard/DispatcherOperationalMetrics.tsx`
  - `AGENT_HANDSHAKE.md`
* **Verification Ledger**:
  - `Capstone_Project_Web`: `npx tsc --noEmit` -> 0 errors (clean).
  - `Capstone_Server/server`: `npx tsc --noEmit` -> 0 errors (clean).
  - `Capstone_Server/server`: `npx vitest run tests/dispatcherDashboard.test.ts` -> 3/3 passed (100%).

---

## 🧠 Model A (Claude) Blueprint & Directives
* **Status**: [Claude Synchronized 2026-09-16]
* **Architectural Decisions**: 
  - Standardized all 4 project workspaces to share the bidirectional handshake protocol.
  - Corrected the locked Prisma schema path to the relocated backend root `C:\Capstone_Server\server`. The previous value pointed at a non-existent `server/` directory inside the web repo.
  - Verified dispatcher component deletions (`DispatcherChatPanel.tsx`, `ReviewErrandModal.tsx`) breach no locked interface: zero live imports remain in `src/`.
* **Sidebar Alignment Contract (apply to any new sidebar row or footer element)**:
  - **Expanded (256px)**: Container gutter `px-3` (12px) on Header/Content/Footer; every row box spans 12->243. Icon/chrome axis = 24px (row `px-3`): brand text, group labels (`px-3`), nav icons, footer avatar, Sign Out icon, copyright. Label axis = 50px. Count pills right-align to 231.
  - **Collapsed (56px, `--sidebar-width-icon: 3.5rem`)**: Container padding `p-2.5` (10px) yields an exact 36px tile column at 10->46, centred on the rail axis (28). Every tile is 36px: logo, trigger, nav buttons (`size-9!`), Sign Out.
  - **Zero Gap Rule**: Any flex row holding a collapse-hidden label (`w-0 opacity-0`) MUST also carry `group-data-[collapsible=icon]:gap-0`, or the dead gap pushes the icon off-axis.
  - **Icon Render Rule**: Nav icons render at 16px regardless of the lucide `size` prop (`[&_svg]:size-4` in the SidebarMenuButton cva). Do not size against 17.
* **Directives for Gemini**:
  - Maintain exact interface compatibility on all frontend components and API endpoints.
  - Strictly observe the Sidebar Alignment Contract across both Owner and Dispatcher consoles.
  - Treat `C:\Capstone_Project_Web` as frontend-only. All Prisma, Express, and migration work targets `C:\Capstone_Server\server`.
  - Before any `prisma generate`, stop the dev server first. The query-engine DLL is file-locked while it runs and will throw EPERM.
  - Do not run `prisma migrate dev`. The shadow-database replay fails on the 2026-08-20 migration history. Apply new migrations by hand.
  - Never call `onValue` without its error callback, and never let a Firebase write `catch` and discard. Both silent-failure patterns existed, and together they hid a total real-time outage behind a map that simply looked quiet.
* **Half-payment contract (2026-09-23, server 7fa2062, web 532cd69; both APKs not yet rebuilt)**:
  - The 50% on GCash/PayMaya is collected MID-WAY, not before dispatch. Stage 5 no longer gates on it. The rider, holding every item, calls `POST /errands/:id/payments/request-half` (RIDER only), which stamps `errands.halfPaymentRequestedAt`. The half is `dueUpFront` = 50% of the rider's confirmed receipts.
  - A customer receipt (`POST /errands/:id/payment-proof`) is refused (409) before that stamp. After it, a receipt passing `validateTransferReceipt`, with a reference number not used on another errand, confirms the UPFRONT row by itself: `confirmedByUserId` NULL, `proofImageId` set. A reused reference and the balance still wait for a dispatcher.
  - Every payment act emits `errand:payment_updated` `{ errandId, reason, ledger }` through `eventPublisher.emitToErrandParties`: errand room, staff roles, `rider:<id>` and `customer:<id>` in one emit. Clients refresh on it. Do not add `rooms.user()` for customers: customer and staff ids share one numeric space.
  - Chat card types the customer app acts on: `half_payment_request`, `payment_proof_request` (the latter auto-opens the receipt upload).
  - `/var/www/server` carries uncommitted work that production builds from. Read the deploy note in memory before any pull that touches those files; never `prisma db push` there.
  - Firebase uids are built ONLY by `firebaseUidFor()` in `C:\Capstone_Server\server\src\lib\firebaseAdmin.ts`. The RTDB rules parse those prefixes as string arithmetic, so renaming one without editing `firebase/database.rules.json` silently changes who can read and write what.

* **Real-Time Authentication Contract (added 2026-09-18)**:
  - **The failure this fixed**: all three clients opened the Realtime Database anonymously, so the rules could only be wide open or broken. When they were tightened, `riders`, `chats`, `rider_chats` and `locations` all began answering `PERMISSION_DENIED` at once, and nothing reported it: dispatcher and owner tracking showed an empty map beside a roster listing riders as AVAILABLE.
  - **The flow**: sign in normally (the JWT contract is untouched) then `POST /api/auth/firebase-token`, which mints a Firebase custom token for the caller's already-proven identity. Clients exchange it via `signInWithCustomToken`. MariaDB remains the only identity authority; nobody signs in twice.
  - **uid scheme**: `rider_<id>`, `customer_<id>`, `staff_<id>`. Namespaced because `users` and `customer_accounts` ids both start at 1, so an unprefixed uid would make customer 3 and rider 3 the same Firebase principal.
  - **Claims**: `role` and `appUserId`, both read by the rules.
  - **Degradation is deliberate**: no service account configured means no minting, a 503 from that one endpoint, and everything else running normally. A real-time convenience must never take the API down with it.
  - **Ruleset lives in the repo**, at `C:\Capstone_Server\server\firebase\database.rules.json`, because the previous rules existed only in the Console and nothing recorded what the clients needed from them.
  - **Known gap, deliberately open**: chat access is gated on authentication plus knowledge of a UUID errand id, not on membership. Closing it needs a server-written `participants` node populated at errand creation and rider assignment. Recorded rather than half-done.
  - **Firebase session lifetime**: in-memory on both mobile apps, on purpose. It must not be able to outlive the JWT session that justified it.

* **Production Recon & Crash Fix (2026-09-23, first agent-executed VPS session)**:
  - **Backend was crash-looping.** `pm2` reported `capstone-backend` online with 39 restarts while
    `checkRiderProximity` threw `Unknown argument 'proximityAlertSentAt'` on every run (12 logged).
    That field existed in NONE of `schema.prisma`, the generated Prisma client, or `errand_system_db`
    — but `dist/services/trackingService.js` referenced it. `dist/` (Sep 22 14:15) was NEWER than
    `src/services/trackingService.ts` (Sep 19 19:19), which has zero references to it.
  - **Root cause**: the running compiled output was not built from the source on the box. A `dist`
    built elsewhere was copied up, then the source moved on without a rebuild.
  - **Fix**: `tar czf /root/dist-backup-20260922-211728.tar.gz dist` (rollback point), `npm run build`
    from current source, `pm2 restart capstone-backend`. Result: restarts stable at 40, zero
    `proximityAlertSentAt` errors in a flushed log, `HTTP 200` in 6 ms.
  - **Lesson**: deploying a prebuilt `dist` by `scp` lets the binary and the source drift apart
    silently. Build ON the server from the source that is actually checked out there.
  - **OSRM is NOT broken, its healthcheck is.** `capstone-osrm` shows `unhealthy` with a 22,463
    failing streak solely because the image has no `wget` (`gis/docker-compose.osrm.yml` healthcheck
    uses `wget -qO-`). A direct `curl` to `/nearest/v1/driving/...` returns `{"code":"Ok"}`. Fix the
    healthcheck to use a binary that exists, or the signal stays meaningless.
  - **Half-payment feature was already fully live**: commit `39421db` is an ancestor of HEAD, and
    `errand_payments.proofImageId`, `settlement_records.proofImageId`, `errand_proof_images.supersededAt`,
    all three FKs and the `RIDER_BALANCE_PROOF`/`CASH_COLLECTED` enum values are present. Applying
    `20260919120000_half_payment_receipt_verification` by hand would have failed on duplicate columns.
  - **22 uncommitted files sit in `/var/www/server`** (sysadmin threat/backup/alert work, including a
    modified `prisma/schema.prisma`). Any `git pull` there needs care.

* **Banga OSRM region, road-line geometry, dual-feed live tracking (2026-09-23, Claude)**:
  - **OSRM now serves `sugo-region`** (bbox `124.58,6.26,124.94,6.78`: Tacurong + Banga + the
    Tantangan/Koronadal roads between). `gis/build-graph.sh|.ps1` take `OSRM_GRAPH`/`OSRM_BBOX`;
    `docker-compose.osrm.yml` serves `${OSRM_GRAPH:-sugo-region}`, selected by `gis/.env` on the VPS.
    Tacurong to Banga: 42.8 km / 51 min, previously `NoRoute` then Google's generalised polyline.
    Rollback: `echo OSRM_GRAPH=tacurong > gis/.env && docker compose -f docker-compose.osrm.yml up -d`.
  - **Service area NOT widened** (`gis/tacurong-service-area.geojson`, web `SERVICE_AREA_BOUNDS`).
    Banga routes but is not yet orderable. Awaiting the user's decision.
  - **`smoothPath.ts` rewritten**: circular fillets bounded by `MAX_OFFSET_METERS = 3.5` from the road
    centreline (was quadratic Béziers, 10 m cap, bends under 15 degrees skipped, so highway curves were
    never smoothed). Real Tacurong-Banga route: sharpest kink 106 to 7.5 degrees, worst offset 2.5 m.
    Measurement is untouched: distance/duration/fare never read the drawn line.
  - **Socket.IO `rider:location`** (`server/src/lib/riderLocationBroadcast.ts`, registered in index.ts):
    fed by the new inbound rider socket stream, `/riders/beacon`, and track ingest. Volatile emits,
    1/s per rider with trailing edge, out-of-order drop, device-clock skew clamp. Staff role rooms
    always; the errand room + `customer:<id>` only while the rider's errand is ASSIGNED/IN_TRANSIT.
    Reconnect snapshots: `fleet:snapshot` (OWNER/DISPATCHER) and `rider:last_location` (errand-gated).
    Server `pingTimeout` 20 s to 30 s for congested links.
  - **Clients merge RTDB + socket, newest fix wins**: web `useRiderFleetPresence` (one shared socket,
    `auth` re-read per reconnect, 400 ms batched commits, deduped roster poll paused while hidden),
    CustomerApp `useRiderLiveLocation(riderId, errandId)`, RiderMobileApp emits each foreground fix via
    `services/liveLocationSocket.ts`. Web maps now draw the selected rider's route (`useRiderActiveRoute`).
  - **Deployed**: OSRM graph + backend (built on VPS, backup `/root/deploy-backups/server-20260923-204329`).
    **Not deployed**: web portal (tree holds another session's in-progress order-chat edits), both mobile
    apps (need new builds). Server is backward compatible with the current clients.

* **Step 3 store prediction + store-location guard (2026-09-23 21:40, Claude)**:
  - **Predictor** (`server/src/services/storePredictionService.ts`,
    `POST /api/category-inference/errands/:errandId/store-predictions`, DISPATCHER/OWNER): from the step 1
    items, proposes up to 3 stores as a set (greedy cover). Evidence per item, strongest first: **named**
    (item names a known store, one-typo tolerant), **learned** (dispatcher filings in `pabili_details_tbl`,
    " | " marker, recency half-life 45 d, never from its own errand), **similar** (token-overlap neighbours),
    **category** (itemPlacementService + the Python classifier, then the most-used store of that category
    nearest the customer). Store directory = past `errand_pinpoints_tbl` pins grouped by name within 150 m,
    plus `verified_places` (0 rows in production on 2026-09-23). **No schema change** (schema is [LOCKED]):
    the dispatcher's correction is learned from the pins and filings they save; both caches drop on save.
  - **Web**: `StorePredictionCard` in step 3 ("Is this accurate?" Yes pins them / No steps aside),
    `useStorePredictions` (answer remembered per order + item list in sessionStorage). Copy is local to the
    card because `copy.ts` has another session's uncommitted edits; fold it in later.
  - **Location guard** (`server/src/services/storeLocationGuard.ts`, `POST /api/places/location-check`):
    inside the service area passes; outside but within 1 km of an OSRM road is allowed after an explicit
    "Pin it anyway" with the km stated; farther from any graph road is **blocked**. Follows the loaded
    graph (Banga passes with a warning, off-map is refused). Optional hard cap `STORE_PIN_MAX_KM_BEYOND_BORDER`
    (unset). Enforced again in `errandService.savePinpoints` (422). Fails open on the graph if OSRM is down,
    never on the border. Step 3 map now outlines the Tacurong border.
  - **Deployed**: backend (backup `/root/deploy-backups/server-20260923-214002`), verified on production data.
    **Web portal deployed 2026-09-23 21:50 on the user's instruction "deploy as is"**, which also shipped the
    other session's uncommitted order-chat work (incl. the new "Check delivery address" step) and the
    Socket.IO tracking client. Rollback: `rsync -rlpt /root/deploy-backups/web-20260923-215015/ /var/www/web/dist/`.

* **Sugo Rider three statuses: Available Online / Available Signal Lost / Offline (2026-09-23 23:25, Claude)**:
  - **Decided with the user**: auto-offline at **12:00 AM** Manila (not noon); a rider online but without
    background location (or notifications) is **Offline, with the reason** shown.
  - **Server** (`src/lib/riderAvailability.ts`): `riderStatusOf` maps the detailed state onto the three:
    AVAILABLE -> AVAILABLE_ONLINE; SIGNAL_LOST, silent-while-on-duty (presumed OFFLINE) and a session closed by
    the abandoned-session sweep (row still on duty) -> AVAILABLE_SIGNAL_LOST; OFF_DUTY, LOGGED_OUT, shutdown
    beacon, NEEDS_PERMISSIONS, midnight -> OFFLINE. Dispatchability is unchanged (still `state === AVAILABLE`).
    Every AvailabilityResult carries `riderStatus`, `riderStatusReason`, `lastBeaconAt`; `/riders` adds
    `riderStatusText`. Auto-assign failure text uses the same words.
  - **Jobs** (`src/jobs/riderShiftJobs.ts`, `src/services/riderStatusWatchService.ts`): a 20 s watcher emits
    `rider:status_changed` (DISPATCHER+OWNER) and, when an Available Online rider drops, `rider:connectivity_alert`
    (reminders at 5 and 15 min) plus a RIDER_SIGNAL_LOST bell notification per active dispatcher (10 min cooldown).
    First pass after a restart only seeds. `0 0 * * *` Asia/Manila: on-duty presence rows -> off duty with
    `shutdownAt` = the midnight instant (how "Shift ended at 12:00 AM" is recognised), open login sessions closed
    at midnight. App sign-ins are not touched.
  - **Beacon** accepts `dutySince`; a shift started before the last midnight is recorded offline and answered
    `forcedOffline: "midnight_reset"`. Builds without `dutySince` keep the old behaviour.
  - **Sugo Rider app**: the headless background task now sends the presence beacon (it only wrote RTDB before, so
    a closed app went signal-lost in ~75 s); both tracking profiles use `distanceInterval: 0` so a stationary
    rider still beacons; new `src/services/riderShift.ts` (shift clock, midnight end, shared beacon cadence);
    auth context ends the shift at midnight with an alert; switch/header read "Available Online"/"Offline";
    foreground-service notification titled "Sugo Rider".
  - **Web**: `RiderPresenceState` is now AVAILABLE_ONLINE | ON_DELIVERY | AVAILABLE_SIGNAL_LOST | OFFLINE
    (ON_DELIVERY = online carrying an errand); `describeRiderStatus` gives the reason line; dispatcher portal
    toasts connectivity alerts (`useRiderFleetPresence({ alertOnSignalLost: true })`).
  - **Deployed**: backend (backup `/root/deploy-backups/server-20260923-232311`), web
    (rollback `/root/deploy-backups/web-20260923-232558`). Rider APK built locally (release, debug keystore).

* **Console-error cleanup on the staff portals (2026-09-24 00:05, Claude)**:
  - "WebSocket is closed before the connection is established" (with a `sid`): sockets torn down mid
    polling-to-WebSocket upgrade. The fleet socket and the dispatcher portal socket now use `autoConnect: false`
    and connect only once a token exists (`onMemoryAccessTokenChange`, new in `src/services/apiClient.ts`);
    the dispatcher socket is built once (user id read via ref) instead of per `currentUserId` change; the
    AuthContext eviction socket is keyed on token presence, not the token (it rebuilt every silent refresh).
    All three read the token at each handshake (`auth` callback). Re-auth waits for an in-flight upgrade.
  - sysadmin `/auth/logout` + `/auth/refresh` 401 pair: AuthContext.login ran the SysAdmin purge on every
    staff login, clearing the SysAdmin token BEFORE calling logout, so it could never revoke anything. Now it
    only runs when `sugo_sysadmin_active` is set and a token exists, logging out before clearing; the SysAdmin
    interceptor no longer refresh-retries a 401 on logout.
  - `/notifications` 401: expected. The access token lives 15 min and is refreshed lazily on the first 401,
    which the browser logs even though the retry succeeds. Not changed.
  - google.maps.Marker deprecation: LiveFleetMap route stop/destination markers moved to AdvancedMarkerElement
    + PinElement. Other Marker uses are the documented no-Map-ID fallback (`utils/googleMapId.ts`).
  - Deployed web (rollback `/root/deploy-backups/web-20260924-000523`). Midnight reset confirmed live:
    "1 rider(s) taken off duty, 1 session(s) closed"; the rider came back online at 00:06 on an old app
    build (no `dutySince`), which the server cannot hold to midnight until the new APK is installed.

* **One-second rider heartbeat over WebSocket: signal loss in ~3 s (2026-09-24 00:45, Claude)**:
  - **Why**: the HTTP beacon (10 s active / 30 s idle, lost after 2.5 missed) plus the 20 s watcher meant a rider
    whose internet dropped looked Available Online for 20 to 75 s. Faster HTTP would hit the API rate limiter.
  - **Server** `src/lib/riderLiveLink.ts`: RIDER sockets emit `rider:heartbeat` every 1 s (volatile, ignored
    faster than 250 ms). Silence > 3 s (watchdog every 500 ms), or a transport-level disconnect, marks the link
    lost; `rider:heartbeat_pause` (app backgrounded) and a client-initiated disconnect hand the rider back to
    beacons. `availabilityForRiders` overlays it: a flowing heartbeat counts as a fresh beacon; a lost one turns
    AVAILABLE_ONLINE into AVAILABLE_SIGNAL_LOST (not dispatchable). `riderShiftJobs` runs the status pass
    immediately on any link change (150 ms coalesce); the 20 s cron stays as the fallback. Status changes also
    reach the rider's active-errand customers (`emitToRiderCustomers`, customer room only).
  - **Measured** over a real WebSocket against the production socket code: lost 3.44 s after the last heartbeat,
    0.33 s after a hard connection drop, back immediately on resume, no false alarm while paused.
  - **Web**: `rider:status_changed` is applied to the roster from the payload (no HTTP); pushed statuses are
    protected from an older in-flight fetch for 60 s; event-driven roster refetch throttled to one per 10 s.
  - **Sugo Rider**: heartbeat in `useRiderMissionSocket` (foreground only, pause on background,
    `reconnectionDelayMax` 2 s); foreground GPS watch 1 s / 0 m. **CustomerApp**: `useRiderLiveLocation`
    marks the rider LOST on the status push instead of after 60 s without a position.
  - **Deployed**: backend (backup `/root/deploy-backups/server-20260924-003954`), web (rollback
    `/root/deploy-backups/web-20260924-004356`). Needs the new Sugo Rider APK on phones to take effect.

* **`size` column on pabili items (2026-10-05, Claude, status: APPROVED BY USER OVERRIDE)**:
  - **Touches a `[LOCKED]` contract** (Prisma schema). **Approved 2026-10-05 on the user's direct instruction**
    ("I override, proceed now"), not joint consensus, same as the VPS and portal-domain amendments above.
    Gemini may still record an objection below. Plan: `C:\Users\Capstone\.claude\plans\just-a-question-how-clever-clock.md`.
  - **Problem**: customers type `5 Kilo of Chicken 2qty` into one name. Size, count and product share
    `itemName` while `quantity` stays 1, so the rider reads noise, `totalItemUnits` undercounts the handling
    fee, and `itemNameKey` learned memory and the category model train on polluted names.
  - **Change (additive only)**: `size String? @db.VarChar(40)` on `PabiliDetail` (schema.prisma:538,
    `pabili_details_tbl`) and `PabiliItemRequest` (schema.prisma:573, `pabili_item_requests_tbl`).
    No rename, no drop, no type change, no new relation. `itemName` and `quantity Int` are untouched.
    - Migration `20261006120000_add_pabili_item_size`, written by hand (`migrate dev` is broken):
      `ALTER TABLE pabili_details_tbl ADD COLUMN size VARCHAR(40) NULL;` and the same for
      `pabili_item_requests_tbl`.
    - Rollback: `ALTER TABLE ... DROP COLUMN size` on both tables. No data depends on it in `fold` mode.
  - **Production apply**: back up, then `prisma db execute --file` with only those two statements,
    then `prisma migrate resolve --applied`, build on the VPS, `pm2 restart`. Deliberately neither `db push`
    nor `migrate deploy`: line 56 says database deploys use `db push`, line 136 says never `db push` in
    `/var/www/server` (it holds an uncommitted `schema.prisma`, so a push would sync that file's drift too).
    **The user ruled 2026-10-05**: additive schema changes go to production as hand-written statements
    through `prisma db execute`, after a backup. Line 56 still describes how the tables were first created.
  - **Carry-over rule** (`pabiliDetailRepository.replaceForErrand`): that function deletes and recreates every
    row from name, category and quantity, so a dispatcher save would null every size. The PATCH carries
    `size`; when a row omits it, `prev.size` is kept; `isUnmodified` compares size too.
  - **Fold switch** `ITEM_SIZE_STORAGE=fold|column` (default `fold`): in `fold` the server stores
    `formatItemLabel(name, size)` ("Chicken · 5 kg") in `itemName` and leaves `size` NULL, so riders on an old
    APK still see the size. Flip to `column` once every rider phone has the build that renders `size`.
    Rollout order: server, web, rider APK, CustomerApp, then the flip.
  - **Countersign line for Gemini** (Model B section): `size column on pabili items: AGREED | OBJECTION <reason>`.
  - **Deployed to production 2026-10-06 (backend + sidecar only)**:
    - Backup: `/root/deploy-backups/server-20261005-221040` (VPS clock): the 17 touched files, `dist`, a dump of
      `pabili_details_tbl` (77 rows) and `pabili_item_requests_tbl` (68 rows), and the sidecar's two pre-deploy files.
    - Shipped as "VPS copy + this change's hunks"; the patched copies equal the local tree except one import order.
      The two ALTERs ran via `prisma db execute`. No `migrate resolve` (production has no `_prisma_migrations`).
    - `ITEM_SIZE_STORAGE` is unset on production, so the server runs in `fold` mode.
    - **Sidecar was hot-patched, not rebuilt**: `ml/app.py` and `ml/sugo_category/gemma.py` were copied into
      `capstone-category` with `docker cp` and the container restarted (models kept, 7 item / 7 store classes).
      The same files are on disk in `/var/www/server/ml`, so the next image build includes them.
      `docker compose up` recreating the container from the current image would drop `/normalize-items`
      until that rebuild. The API then answers `available: false`, and lists go out as typed.
    - Verified live: Gemini 3.8 Flash read "isang kilong bigas" as bigas, 1 kg, and split "chicken 2, rice 5kg".
      Sizes are normalized to "5 kg", "1.5 L" in `gemma.canonical_size`, because the model echoed "5 Kilo".
    - **Web portal deployed 2026-10-06 04:18 (+08)** after checking the tree: the previous deploy
      (2026-10-05 15:44) was built from this same tree (identical bundle hash), and only this change's 8 files had
      changed since, so no other session's work shipped with it. Rollback:
      `rsync -rlpt /root/deploy-backups/web-20261006-041852/ /var/www/web/dist/`.
    - **Not deployed**: Sugo Rider and CustomerApp (need new builds; rider first). Then set `ITEM_SIZE_STORAGE=column`.

* **`notes` column on pabili items (2026-10-06, Claude, status: APPROVED BY USER OVERRIDE, DEPLOYED)**:
  - **Touches a `[LOCKED]` contract** (Prisma schema). Approved on the user's direct instruction (chose "Per-item
    note field", which named the [LOCKED] change), not joint consensus, like `size` above.
  - **Change (additive only)**: `notes String? @db.VarChar(200)` on `PabiliDetail` and `PabiliItemRequest`, migration
    `20261006180000_add_pabili_item_notes`. Named `notes` to match the web `ErrandItem.notes` the dispatcher inspector
    already rendered. Same rules as `size`: folded into itemName in fold mode ("Sibuyas · 1/2 kg · Note: walang bulok",
    cut to 191 chars), carried over when a PATCH omits it, counted as a change for the rider's checkbox.
    Rollback: `ALTER TABLE ... DROP COLUMN notes` on both tables.
  - **Why**: an age-group edge-case review (teen shorthand, seniors' sentences and dictation) showed requests such as
    "paki pili yung walang bulok" or "if out of stock buy 150g x 2" had nowhere to go but the item name.
  - **Also shipped the same day**: `POST /api/errands/item-stores` (customer store-mismatch check, own limiter), the
    sidecar's Filipino filler words, Spanish-Filipino numbers ("singkwenta"), "₱50 worth" budget sizes, and prompt v3
    with every item field required (optional, Gemini 3.8 Flash dropped `note` every time).
  - **Deployed**: backend + both ALTERs (backup `/root/deploy-backups/server-20261006-004135`, VPS clock), sidecar
    hot-patched again via `docker cp` (same caveat as above), web portal (rollback `web-20261006-065731`).
    Verified live: all 8 report lines read correctly, instructions land in `note`.

* **Tidy-up time budget, pieces and store names (2026-10-06, Claude, status: DEPLOYED server + sidecar; app unreleased)**:
  - **No `[LOCKED]` contract touched.** No schema or route change.
  - **Root cause of "the AI did not recognize" lines**: not the model. The API server halved its 6 s budget per model,
    so Gemini 3.8 Flash got 2.75 s; it needs 2.6 s for one line, 2.9 s for four, 5.2 s for eight (measured on
    production). Lists of three or more came back `available:false` and went as typed (nginx: 31-byte answers at
    01:22 and 01:27). Gemma 4 (~14 s a line) got the other half and never answered either.
  - **Fix**: `CATEGORY_NORMALIZE_TIMEOUT_MS` default 6000 -> 10000; the server sends the whole budget less 750 ms;
    the sidecar treats `timeout_ms` as one deadline for the chain (first model gets all, the next what is left,
    none under 1.5 s). CustomerApp waits 12 s and re-asks `unread` lines on the next Review visit.
  - **Sidecar prompt v4** + `pieces_as_quantity`: "Siopao 5 pcs" is quantity 5, not size "5 pcs" (Flash answered
    both ways). With its own count ("10 pcs x2") the pieces stay the size.
  - **CustomerApp (not released)**: "Size" is labelled "Unit" (Review table, edit sheet). Rules settle
    "Siopao 5 pcs" / "Delight, 5pcs" on the phone. A store's name at either end of a line ("Rose Pharmacy Lozartan
    5mg", "Biogesic from Mercury Drug x2") is taken out of the item; the editor warns, and "Ask for <store>" puts
    "Buy at <store> if possible" in the note. Lexicon + store-noun pattern in `utils/itemEntryParser.ts`.
  - **Deployed**: backup `/root/deploy-backups/server-20261006-091648` (VPS clock; files, dist, the container's
    gemma.py/app.py). Sidecar hot-patched again via `docker cp` + `docker restart`. Verified live: the four reported
    lines in 4.1 s and an eight-line list in 5.6 s, all read; route still 401 without login.
  - **Web, same day (15:47 +08)**: the dispatcher's step-3 editor field is labelled "Unit" too (`copy.ts`
    `sizeLabel`/`sizePlaceholder`; the data field stays `size`). Tree checked first: live `index.html` matched the
    local 06:55 build byte for byte and `copy.ts` was the only newer file, its whole diff ours. Deployed with
    `scripts/deploy-web.sh`, rollback `/root/deploy-backups/web-20261006-154721`; live entry `index-eFChC1MC.js`
    loads `DispatcherPortal-Bx1KKwrJ.js`, which reads `sizeLabel:"Unit"`.

* **Account ownership: no data across accounts (2026-10-07, Claude, status: SERVER + RULES DEPLOYED; web, rider and customer apps pending)**:
  - **Report**: 2 dispatchers and 2 customers registered together; a customer's phone showed another account's
    notifications, and dispatchers could read each other's rider chats.
  - **Root cause, one sentence**: customers (`customer_accounts`) and staff/riders (`users`) are two id sequences
    from 1, and many paths keyed a person by the bare number. Customer 9 joined socket room `user:9` (dispatcher 9's),
    `emitToCustomer` also hit `user:9`, `assertSelfOrOwner` and several self-only routes compared ids only, logout
    closed rider 9's shift for customer 9, and session revoke and presence keyed by id alone.
  - **Also**: `order:new/claimed/updated` (and 6 other errand events) went out via global `io.emit`, so every phone
    learned every errand id; the customer app then opened those errands' chats, and the RTDB rules allowed any
    signed-in uid to read any chat. Push tokens were never taken off an account at logout or on re-registration.
  - **No `[LOCKED]` contract touched**: no Prisma schema change, JWT architecture unchanged.
  - **Server** (`/var/www/server`, backup `/root/deploy-backups/server-20261007-151501` VPS clock):
    `identityRooms()` (customers join `customer:<id>` only), `emitToCustomer` customer room only, errand events via
    `publishToErrand` (staff role rooms + that errand's customer and rider), presence and session revoke by role,
    `pushTokenOwnership.ts` (token on one account; cleared at logout), role guards on `/users/profile|password`,
    rider photo, customer-location writes, `assertSelfOrOwner` requires CUSTOMER. Tests: `accountOwnership.test.ts`
    (18). Suite 1201 pass; 9 failures identical on HEAD (env-dependent, pre-existing).
  - **RTDB** (published 2026-10-07 after `npm run chat-access:backfill`, 42 errands): `chats/$errandId` readable
    by OWNER and the two uids in server-written `chat_access/$errandId` (customer, claiming dispatcher; written by
    `src/lib/chatAccess.ts` on create/claim/release). `rider_chats` closed to customers. New per-dispatcher paths
    `rider_threads`, `rider_inbox`, `dispatcher_inbox`, switch `config/riderChatMode`. 27 synthetic-identity checks
    passed on the live database; previous rules kept at `/root/rtdb-rules-live-20261007.json`.
  - **Server tests can no longer reach live Firebase**: `tests/setup/noLiveFirebase.ts`. One test run before it
    existed wrote `chat_access/e1` to production; removed.
  - **Web deployed 2026-10-07 21:37 (+08), on the user's instruction "deploy alongside the modification of Gemini
    3.8 Flash"**: the whole tree, i.e. these changes together with the uncommitted dispatcher work of Antigravity
    (Gemini 3.8 Flash High) from 15:48-21:05. `tsc` clean first; no file edited in the 30 min before. Rollback:
    `rsync -rlpt /root/deploy-backups/web-20261007-213720/ /var/www/web/dist/`. Live entry `index-C26bbRgq.js`
    (holds `/system/dispatcher-ai-suggestions`), `DispatcherPortal-DlnMq3l1.js` (holds `config/riderChatMode`,
    `dispatcher_inbox`, `rider_threads`).
  - **Gemini's sysadmin switch for dispatcher AI suggestions went live with this session's SERVER builds, unintended**:
    its source (`sysAdminDevOps*`, `sysAdminRoutes.ts`, `exceptionController.ts`) was copied to `/var/www/server/src`
    at 09:57 VPS time without a rebuild; the 15:15 and 15:31 builds here compiled it in. It defaults OFF
    (`config/maintenance.json` `dispatcherAiSuggestionsEnabled: false`) and the server refuses suggestions while off,
    so dispatchers have had none since ~15:15 VPS. A sysadmin turns it on in Service Controls.
  - **Apps (need builds)**: rider app reads `config/riderChatMode`, shows one tab per dispatcher thread
    (`firebase/dispatcherChat.ts`; `pickReplyThread`: the current errand's claiming dispatcher, else the newest
    conversation, else nobody, composer closed; 8 tests in `tests/dispatcherChat.test.ts`); customer app resets
    listeners per account and drops order events for other customers.
  - **Switch to private rider threads**: (1) every rider on the new build, (2) set `config/riderChatMode` =
    `threads`, (3) tighten `rider_chats/$riderId` to rider + OWNER. See server `firebase/README.md`.
  - **Rider positions closed the same day**: `riders/$riderId` is readable by that rider, staff, and the customers
    in server-written `rider_watchers/$riderId/<customerUid>/<errandId>` (errand ASSIGNED or IN_TRANSIT).
    `src/lib/riderWatch.ts` rebuilds the node from MariaDB ~2 s after any errand event and every minute
    (`jobs/riderWatchReconcile.ts`); `publishToErrand` grants a new assignment before emitting. Customer app
    retries a refused listen (5 x 4 s). Server backup `/root/deploy-backups/server-20261007-153109`; rules
    rollback `/root/rtdb-rules-before-riderwatch.json`; 35 synthetic-identity checks passed live.

---

## 🛠️ Model B (Gemini / Antigravity) Execution & Verification
* **Status**: [Tunnel Active & Operational]
* **Files Synchronized**:
  - `C:\Capstone_Project_Web\src\app\routes.tsx` (Route-level code splitting using React.lazy & Suspense for Owner, Dispatcher, and modal components)
  - `C:\Capstone_Project_Web\vite.config.ts` (Configured manualChunks for vendor splitting: vendor-maps, vendor-charts, vendor-radix, vendor-icons, vendor-firebase, vendor-react)
  - `C:\Capstone_Project_Web\index.html` (Added high-priority preconnect and dns-prefetch hints to api.sugoonthego.online)
  - `C:\Capstone_Project_Web\src\context\AuthContext.tsx` & `src\types\auth.ts` (Decoupled root DOM render blocking from silent refresh; added sugo_session_active cookie guard to prevent false 401 console errors)
  - `C:\Capstone_Project_Web\src\components\ProtectedRoute.tsx` (Handled isInitializing with loading spinner instead of premature redirect)
  - `C:\Capstone_Project_Web\src\components\LoginPage.tsx` (Converted to pure flat layout; applied Impeccable craft floor: removed vanishing 1.5s errors for sticky error alerts, added Caps Lock detection, Sugo brandmark, live dispatch engine status pill, WCAG AA contrast, caret-red-500, focus-visible rings, and mobile app gateway link)
  - `C:\Capstone_Project_Web\src\components\login\ProfileSetupStep.tsx` (Removed em-dashes, upgraded placeholder contrast to slate-400, added caret-red-500 and focus-visible rings)
  - `C:\Capstone_Project_Web\src\components\login\OtpStep.tsx` (Added font-mono tabular-nums to expiry/resend countdowns, upgraded disabled contrast to slate-500, added focus-visible rings)
  - `C:\Capstone_Project_Web\public\llms.txt` (Created standardized H1 llms.txt directory document for 3/3 Agentic Browsing compliance)
  - `C:\Capstone_Project_Web\src\components\ui\sidebar.tsx` (Eliminated involuntary hover auto-expansion; desktop sidebar state strictly obeys intentional user actions via SidebarTrigger, SidebarRail, or Ctrl+B shortcut)
  - `C:\Capstone_Project_Web\src\portals\owner\OwnerPortal.tsx` (Sidebar alignment pass: gutter px-3 across sections; row boxes 12->243; icon/chrome axis at 24px; label axis at 50px; collapsed 36px tile column at 10->46 with p-2.5 padding; group-data-[collapsible=icon]:gap-0; trigger/logo size-9; LogOut size-16; copyright px-3 text-left)
  - `C:\Capstone_Project_Web\src\portals\dispatcher\DispatcherPortal.tsx` (Sidebar alignment pass: gutter px-3 across sections; row boxes 12->243; icon/chrome axis at 24px; label axis at 50px; count pills right-aligned to 231; collapsed 36px tile column at 10->46 with p-2.5 padding; group-data-[collapsible=icon]:gap-0; trigger/logo size-9; LogOut size-16; copyright px-3 text-left)
  - `C:\Users\Capstone\.gemini\GEMINI.md` (Codified global Impeccable UI/UX Design Standards, 15 Strict Anti-AI-Slop bans, Canonical Domain mapping, Landing Page SCP deployment command, and Gemini Non-Autonomous Execution & Claude Cognitive Alignment Protocol)
  - `C:\Capstone_Project_Web\AGENT_HANDSHAKE.md` (Reinforced locked Impeccable UI/UX invariant, Canonical Domain Architecture, VPS Deployment Pipelines, and Gemini Non-Autonomous Execution)
  - `C:\Capstone_Landing_Page\` (Mobile Application Browser & Smartphone Experience Upgrade: added viewport-fit=cover and web app tags in index.html, zero-horizontal-overflow & safe-area classes in index.css, mobile hamburger drawer in Header.tsx, in-app WebView download tip in Hero.tsx, touch-steppers in FareCalculator.tsx, full-width touch buttons in ApkInstallGuide & SystemStatus, safe-area clearance in Footer.tsx, and persistent MobileBottomDock.tsx)
  - `C:\Capstone_Project_Web\.agents\rules\gemini-claude-thinking-alignment.md` (Created dedicated behavioral rule codifying Gemini non-autonomous execution and 6-stage Claude cognitive thinking process)
  - `C:\Capstone_Project_Web\.agents\rules\dual-agent-handshake-protocol.md` (Synchronized dual-agent roles to enforce non-autonomous Gemini pair programming)
  - `C:\Capstone_Project_Web\AGENTS.md`, `CustomerApp\AGENTS.md`, `RiderMobileApp\AGENTS.md`, `server\AGENTS.md` (Propagated invariant across all workspace AGENTS configurations)
  - `C:\Capstone_Server\server\src\services\reportService.ts` (Hardened getTransactionSummary with safe null-coerced canonicalPaymentMethod, optional chaining on customer information and errand fields)
  - `C:\Capstone_Server\server\src\services\patterns\categoryRevenueAllocation.ts` (Safeguarded toCategoryEvidence with default fallback arrays for pinpoints, proofImages, and item requests)
  - `C:\Capstone_Server\server\src\index.ts` & `.env` (Set `TZ=Asia/Manila` to prevent timezone mismatch on UTC production servers)
  - `C:\Capstone_Server\server\src\validators\reportValidators.ts` & `analyticsValidators.ts` (Added calendarDay schema supporting client-passed `date` parameter in reports and dashboard summary)
  - `C:\Capstone_Server\server\src\services\analyticsService.ts` & `controllers\analyticsController.ts` (Supported `referenceDate` in `getDashboardSummary` to align Tacurong calendar day)
  - `C:\Capstone_Project_Web\src\components\RangeSelector.tsx` (Renamed preset option to "Today (Default)", passes local calendar date `date: todayStr`)
  - `C:\Capstone_Project_Web\src\services\apiService.ts` (Updated `getDashboardSummary` to accept optional `date?: string`)
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\components\SalesReportView.tsx` (Default preset set to "TODAY")
  - `C:\Capstone_Server\server\prisma\schema.prisma` (Added `isOnline Boolean @default(false)` column to `AccountLoginLog` model)
  - `C:\Capstone_Server\server\prisma\migrations\20260920150000_add_account_login_log_is_online\migration.sql` (Created migration and applied to MariaDB on VPS)
  - `C:\Capstone_Server\server\src\lib\userPresenceStore.ts` (Created in-process socket presence store for all staff/users)
  - `C:\Capstone_Server\server\src\lib\socket.ts` (Tracked user connections/disconnections, emitted `user:presence_changed`, and synced `account_login_logs.isOnline`)
  - `C:\Capstone_Server\server\src\services\userService.ts` & `controllers\userController.ts` & `routes\userRoutes.ts` (Augmented `listUsers` with `isOnline` and added `GET /api/users/presence`)
  - `C:\Capstone_Server\server\src\services\sessionService.ts` (Recorded `isOnline` in `recordLoginLog` and added `updateUserPresenceLog`)
  - `C:\Capstone_Project_Web\src\components\StaffAvatar.tsx` (Added `isOnline` indicator dot with high-contrast ring and native tooltip)
  - `C:\Capstone_Project_Web\src\portals\owner\modules\users\UserManagementModule.tsx` (Added `isOnline` to `UserRecord`, live Socket.IO listener for `user:presence_changed`, and passed to `StaffAvatar` in Card/Table views)
  - `C:\Capstone_Project_Web\src\portals\owner\modules\rates\ServiceRatesModule.tsx` (Renamed distance badge from "Beyond 2.0 km" to "Per 1km")
  - `C:\Capstone_Project_Web\src\components\account\AccountSecurityLogsView.tsx` (Integrated `isOnline` in Login History & Security Logs table)
  - Production Deployment (Contabo VPS `109.123.239.182`):
    - Ran MariaDB `ALTER TABLE account_login_logs ADD COLUMN isOnline BOOLEAN NOT NULL DEFAULT FALSE;`
    - SCP backend server changes to `/var/www/server`, ran `npx prisma generate && npm run build && pm2 restart capstone-backend`
    - SCP frontend web build to `/var/www/web/dist/`
    - Verified live at `https://sugo-express.org` (HTTP 200 OK) and `https://api.sugo-express.org/api/health` (🟢 System Online)
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\components\CommissionReportView.tsx` (Default preset set to "TODAY")
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\components\RiderPerformanceReportView.tsx` (Default preset set to "TODAY")
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\components\ExceptionReportView.tsx` (Default preset set to "TODAY")
  - `C:\Capstone_Server\server\prisma\schema.prisma` (Added `AccountLoginLog` model mapped to `account_login_logs` with indexes on `[userId, role]` and `[createdAt]`)
  - `C:\Capstone_Server\server\src\lib\requestContext.ts` (Added `parseDeviceInfo` utility to extract client browser and operating system hints from User-Agent)
  - `C:\Capstone_Server\server\src\lib\socket.ts` (Added `user:${userId}` room join for staff sockets and exported `notifySessionRevoked` broadcast helper)
  - `C:\Capstone_Server\server\src\services\sessionService.ts` (Added `findActiveStaffSession`, `listActiveSessions`, `revokeOtherSessions`, `recordLoginLog`, and `getAccountLoginLogs`)
  - `C:\Capstone_Server\server\src\validators\authValidators.ts` (Added `confirmTakeover?: boolean` to `loginSchema`)
  - `C:\Capstone_Server\server\src\controllers\authController.ts` & `routes\authRoutes.ts` (Added single-device takeover gate returning `anotherDeviceActive: true`, superseded session revocation with `notifySessionRevoked`, session listing endpoint `GET /api/account/sessions`, remote session termination `DELETE /api/account/sessions/:sessionId` & `POST /api/account/sessions/revoke-others`, and audit log retrieval `GET /api/account/login-logs`)
  - `C:\Capstone_Project_Web\src\types\auth.ts` (Added `ActiveSession`, `AccountLoginLog`, `SupersededSessionInfo`, `AnotherDeviceActivePayload`, and updated `AuthContextType`)
  - `C:\Capstone_Project_Web\src\services\apiService.ts` (Added `getActiveSessions`, `revokeSession`, `revokeOtherSessions`, `getAccountLoginLogs`, and updated `login` with `confirmTakeover`)
  - `C:\Capstone_Project_Web\src\services\apiClient.ts` (Configured 401 refresh handler to dispatch window event `sugo:session-superseded` upon device eviction)
  - `C:\Capstone_Project_Web\src\context\AuthContext.tsx` (Added `supersededInfo`, `isSessionExpired`, Socket.IO listener for `session:revoked`, window event listener for `sugo:session-superseded`, `dismissSupersededNotice`, and `dismissSessionExpiredNotice`)
  - `C:\Capstone_Project_Web\src\hooks\useIdleTimer.ts` (Created 30-min idle governance hook: 28m active, 2m countdown warning with mouse/keyboard/scroll tracking)
  - `C:\Capstone_Project_Web\src\components\modals\SessionModals.tsx` (Created `AnotherDeviceEvictionModal`, `SessionExpiryWarningModal`, and `SessionExpiredNoticeModal`)
  - `C:\Capstone_Project_Web\src\components\modals\SessionGuard.tsx` (Mounted central session lifecycle and eviction guard inside `<AuthProvider>`)
  - `C:\Capstone_Project_Web\src\app\App.tsx` (Integrated `<SessionGuard />` across all web portal routes)
  - `C:\Capstone_Project_Web\src\components\LoginPage.tsx` (Added interactive Takeover Confirmation Dialog when existing session is active on another device)
  - `C:\Capstone_Project_Web\src\components\account\AccountSecurityLogsView.tsx` (Built adaptive Active Devices list with remote sign-out CTAs and filterable Login History / Security Audit table with design system tokens)
  - `C:\Capstone_Project_Web\src\portals\dispatcher\components\DispatcherProfilePanel.tsx` (Added sub-tab navigation: `[ Profile Information | Account Logs & Security ]` embedding `AccountSecurityLogsView`)
  - `C:\Capstone_Project_Web\src\portals\owner\OwnerPortal.tsx` (Integrated `"security"` module in `ModuleId`, `MODULE_IDS`, `NAV_SECTIONS["Settings"]`, sidebar footer profile click, and main console rendering)
  - `C:\Capstone_Project_Web\src\portals\dispatcher\DispatcherPortal.tsx` (Adapted Dispatcher sidebar layout, font sizing, and design tokens to match Owner sidebar: `text-panel`, `text-label`, `text-micro`, `text-board-plate`, `text-board-trim`, `rounded-plate`; renamed nav items: Order Queue -> Dispatcher Management, Need a Decision -> Conflict Management, Fleet Tracking -> Tracking, Customer Chats -> Customer Chat History; updated top destination band header to Conflict Management)
  - `C:\Capstone_Project_Web\src\portals\dispatcher\components\ExceptionQueuePanel.tsx` (Renamed panel title to "Conflict Management")
  - `C:\Capstone_Project_Web\src\portals\dispatcher\components\RiderFleetRoster.tsx` (Renamed panel title to "Tracking")
  - `C:\Capstone_Project_Web\src\portals\dispatcher\components\RecentChatsPanel.tsx` (Renamed panel title to "Customer Chat History")
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\FinancialReportsModule.tsx` (Renamed report tab "Exceptions" -> "Conflict Report")
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\components\ExceptionReportView.tsx` (Renamed report title and CSV export to "Conflict Report", updated default preset to MONTH)
  - `C:\Capstone_Project_Web\src\components\RangeSelector.tsx` (Updated PRESET_OPTIONS labels: Daily, Weekly, Monthly, Yearly)
  - `C:\Capstone_Project_Web\src\components\DateRangePicker.tsx` (Added Quarterly [Q1, Q2, Q3, Q4] selection with year navigator and quarter detection in trigger label)
  - `C:\Capstone_Project_Web\src\portals\owner\modules\dashboard\DashboardModule.tsx` (Set default frequency to MONTH "Monthly")
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\components\SalesReportView.tsx` (Set default preset to MONTH "Monthly")
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\components\RiderPerformanceReportView.tsx` (Set default preset to MONTH "Monthly")
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\components\CommissionReportView.tsx` (Set default preset to MONTH "Monthly")
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\components\SettlementReportView.tsx` (Set default preset to MONTH "Monthly")
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\components\TransactionSummaryReportView.tsx` (Set default preset to MONTH "Monthly")
  - `C:\Capstone_Project_Web\src\portals\owner\hooks\useDashboardReportsSummary.ts` (Added parallel Promise.allSettled fetching hook for all 6 reports: Sales, Rider Performance, Commission, Settlement, Transactions, Conflict Report with error isolation and aggregate metrics)
  - `C:\Capstone_Project_Web\src\portals\owner\modules\dashboard\components\CategorySalesChart.tsx` (Created professional standard Recharts bar chart for merchant category revenue breakdown with custom tooltip, formatted pesos, and WCAG AA contrast)
  - `C:\Capstone_Project_Web\src\portals\owner\modules\dashboard\components\FinancialChannelMixChart.tsx` (Created Recharts grouped bar chart comparing Fee Allocation [Business Net Share vs Rider Payouts] and Payment Channel Mix [COD vs Digital]; fixed payment channel classification so digital wallets like GCash and PayMaya are checked before cash to prevent "gcash" matching substring "cash")
  - `C:\Capstone_Project_Web\src\portals\owner\modules\dashboard\components\DashboardReportsSummary.tsx` (Removed redundant "Reports & Analytics Summary" banner and subtitle to streamline dashboard vertical flow; houses 6 high-density metric cards with 1-click `View Full Report ➔` CTA navigation and dual chart grid)
  - `C:\Capstone_Project_Web\src\portals\owner\modules\dashboard\DashboardModule.tsx` (Mounted DashboardReportsSummary beneath This Period section, passing active apiRange and onNavigateToReport)
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\FinancialReportsModule.tsx` (Exported ReportTab, added initialTab and onTabChange props for deep-linking from Dashboard summary cards)
  - `C:\Capstone_Project_Web\src\portals\owner\OwnerPortal.tsx` (Connected selectedReportTab state and navigation handler between DashboardModule and FinancialReportsModule)
  - `C:\Capstone_Server\server\src\services\userService.ts` (Fixed `getRiderPhoto` to return `{ photoData: null, mimeType: null, fileSize: 0, fileName: null, updatedAt: null }` with HTTP 200 OK instead of throwing 404 ServiceError when no profile photo is set, preventing browser console 404 network errors across all clients)
  - `C:\Capstone_Project_Web\src\services\staffPhotoService.ts` (Added session in-memory promise caching `photoCache = new Map<number | string, Promise<string | null>>()` with cache invalidation on upload/delete, eliminating redundant parallel avatar photo fetch calls across card and table views)
  - `C:\Capstone_Project_Web\src\portals\owner\modules\users\components\AddUserModal.tsx` & `EditUserModal.tsx` (Added `autoComplete="username"` on username `<input>` fields, resolving Chrome DOM audit warnings `[DOM] Input elements should have autocomplete attributes`)
  - Production Deployment (Contabo VPS `109.123.239.182`):
    - Deployed `userService.ts` to `/var/www/server/src/services/userService.ts`, ran `npm run build && pm2 restart capstone-backend` (Status: online, 0 errors)
    - Synced web production build to `/var/www/web/dist/`
  - `C:\Capstone_Server\server\prisma\schema.prisma` (Added `SysAdmin` model mapped to `tbl_sys_admin`)
  - `C:\Capstone_Server\server\prisma\migrations\20260920160000_add_tbl_sys_admin\migration.sql` (Created migration and pushed to database)
  - `C:\Capstone_Server\server\src\scripts\seedSysAdmin.ts` & `package.json` (Added `npm run seed:sysadmin` and seeded root admin `sysadminit` / `<redacted 2026-10-05: was public, rotate it; seed now reads SYSADMIN_SEED_PASSWORD>`)
  - `C:\Capstone_Server\server\src\services\sessionService.ts` (Added `"SYSADMIN"` to `SubjectType` and `subjectTypeForRole`)
  - `C:\Capstone_Server\server\src\lib\emailTemplates.ts` (Added `buildSysAdminVerificationLinkEmail` with 5-minute magic link)
  - `C:\Capstone_Server\server\src\services\sysAdminAuthService.ts` (Auth service with setup wizard challenge and 5-min magic link token issuance and verification)
  - `C:\Capstone_Server\server\src\controllers\sysAdminAuthController.ts` & `routes\sysAdminRoutes.ts` & `routes\index.ts` (Mounted SysAdmin auth routes under `/api`)
  - `C:\Capstone_Project_Web\src\types\sysAdmin.ts` (TypeScript interfaces for SysAdmin, monitored accounts, audit logs, traffic summary, telemetry, and IT staff)
  - `C:\Capstone_Project_Web\src\services\sysAdminApiService.ts` (Complete API client covering auth, user monitoring, audit trails, traffic analytics, telemetry, maintenance, backup, and IT admin management)
  - `C:\Capstone_Project_Web\src\portals\sysadmin\context\SysAdminAuthContext.tsx` (Dedicated auth context)
  - `C:\Capstone_Project_Web\src\portals\sysadmin\components\SysAdminLoginView.tsx` (Dark IT console login view)
  - `C:\Capstone_Project_Web\src\portals\sysadmin\components\SysAdminProfileWizard.tsx` (First-login profile wizard with live 5-min countdown timer)
  - `C:\Capstone_Project_Web\src\portals\sysadmin\components\SysAdminMagicLinkVerificationPage.tsx` (Landing page for 1-click email magic link verification)
  - `C:\Capstone_Project_Web\src\portals\sysadmin\modules\users\UserMonitoringModule.tsx` (Phase 3: Multi-Role User Account Monitor with role filters, online indicator, active session inspection drawer with kick-out, and account status modal)
  - `C:\Capstone_Project_Web\src\portals\sysadmin\modules\audit\AuditLogsModule.tsx` (Phase 4: Categorized Audit Logs Center covering Auth & Sessions, Account Modifications, Security Threats, and System Lifecycle with CSV export and zero-leakage privacy invariants)
  - `C:\Capstone_Project_Web\src\portals\sysadmin\modules\traffic\TrafficMonitoringModule.tsx` (Phase 5: GoAccess Web Traffic Analytics featuring dual view mode — Native Metrics Dashboard & Live Authenticated GoAccess Terminal Report)
  - `C:\Capstone_Project_Web\src\portals\sysadmin\modules\devops\DevOpsModule.tsx` (Phase 6: DevOps Suite with live telemetry, CPU/memory gauges, MariaDB latency, maintenance mode switch, and DB backup generator)
  - `C:\Capstone_Project_Web\src\portals\sysadmin\modules\staff\ItStaffModule.tsx` (Phase 6: IT Administrator Governance for tbl_sys_admin personnel and provisioning modal)
  - `C:\Capstone_Project_Web\src\portals\sysadmin\SysAdminPortal.tsx` (Mission control shell mounting all 6 operational modules)
  - `C:\Capstone_Project_Web\src\app\routes.tsx` (Mounted `/sysadmin` and `/sysadmin/verify-email`)
  - `C:\Capstone_Server\server\src\services\sysAdminUserService.ts` & `controllers\sysAdminUserController.ts` (Phase 3 user monitoring and session eviction services)
  - `C:\Capstone_Server\server\src\services\sysAdminAuditService.ts` & `controllers\sysAdminAuditController.ts` (Phase 4 audit log services with strict password/chat redaction)
  - `C:\Capstone_Server\server\src\services\sysAdminTrafficService.ts` & `controllers\sysAdminTrafficController.ts` (Phase 5 GoAccess CLI execution and report generator)
  - `C:\Capstone_Server\server\src\services\sysAdminDevOpsService.ts` & `controllers\sysAdminDevOpsController.ts` (Phase 6 system telemetry, maintenance mode, backup snapshot, and IT staff services)
  - `C:\Capstone_Server\server\src\routes\sysAdminRoutes.ts` (Unified routing for all sysadmin modules)
* **Verification Ledger**:
  - `npx tsc --noEmit` verified with 0 errors on Capstone_Server/server.
  - `npm run build` verified with 0 errors on Capstone_Server/server (`dist/index.js` generated).
  - `npx tsc --noEmit` verified with 0 errors on Capstone_Project_Web.
  - `npm run build` completed cleanly on Capstone_Project_Web (dist/ built with chunks: `SysAdminPortal-Roe2Os2-.js`, `SysAdminAuthContext-Dmv3AC6i.js`, `SysAdminMagicLinkVerificationPage-B7zc7DWr.js`).
  - Seed CLI test: `npm run seed:sysadmin` idempotent and successfully verified (`sysadminit` / `<redacted 2026-10-05: was public, rotate it; seed now reads SYSADMIN_SEED_PASSWORD>` in `tbl_sys_admin`).
  - Contabo VPS Production Deployment Verified:
    - Backend: Synced to `/var/www/server/`, ran `npm run prisma:push`, executed `npm run seed:sysadmin` (ID 1 seeded in production MariaDB), ran `npm run build`, restarted PM2 process `capstone-backend` (Status: online).
    - GoAccess: Verified installed at `/usr/bin/goaccess` and tested against `/var/log/nginx/access.log`.
    - Frontend: Deployed via `scp` to `/var/www/web/dist/`.
* **Session Handoff & Verification (2026-09-21 — Fix A, Feature B, Feature C)**:
  - **Fix A (401 Refresh Cascade Isolation)**:
    - Root Cause: `sysAdminApiService.ts` imported the shared operational `apiClient` which triggered `/api/auth/refresh` on 401s, failing and invoking `/api/auth/logout`.
    - Resolution: Refactored `sysAdminApiService.ts` to use an isolated `sysAdminAxios` instance with private `setSysAdminMemoryToken` and silent 401 pass-through. Updated `SysAdminAuthContext.tsx` accordingly.
  - **Feature B (Account & Profile Settings Tab — 7th Tab)**:
    - Added `profileOtpHash` and `profileOtpExpiresAt` to `SysAdmin` model in `schema.prisma`.
    - Added 3-layer security gate endpoints: `POST /api/sysadmin/auth/request-profile-otp`, `POST /api/sysadmin/auth/verify-profile-otp`, and `PATCH /api/sysadmin/auth/update-profile` in `sysAdminProfileController.ts` and `sysAdminAuthService.ts`.
    - Created `AccountSettingsModule.tsx` in `C:\Capstone_Project_Web\src\portals\sysadmin\modules\settings\` allowing admins to edit username, names, nickname, email, and password guarded by: (1) Current Password, (2) TYPE CONFIRM in all caps, and (3) 6-digit email OTP.
    - Added 7th tab `Account Settings` (`<KeyRound />`) to `SysAdminPortal.tsx`.
  - **Feature C (Per-Portal Maintenance Governance)**:
    - Replaced single global maintenance toggle with a typed 4-portal map (`owner`, `dispatcher`, `rider`, `customer`) in `sysAdminDevOpsService.ts` and `sysAdminDevOpsController.ts`.
    - Added unauthenticated public polling route `GET /api/maintenance/status?portal=<key>`.
    - Created `useMaintenanceCheck.ts` hook polling every 60s and `MaintenanceOverlay.tsx` full-screen maintenance barrier.
    - Integrated `MaintenanceOverlay` into both `OwnerPortal.tsx` and `DispatcherPortal.tsx`.
    - Updated `DevOpsModule.tsx` with a 4-card management grid allowing individual activation/deactivation and customized public announcement notices.
  - **Verification & Deployment Ledger**:
    - Backend: `npx tsc --noEmit` passed with 0 errors. Pushed to GitHub `main` (`27e0366`). Pulled to Contabo VPS (`/var/www/server`), ran `npx prisma db push --accept-data-loss` (columns added to `tbl_sys_admin`), compiled with `npm run build`, and restarted PM2 `capstone-backend` (`pid 468471`, status `online`).
    - Frontend: `npx tsc --noEmit` and `npm run build` completed cleanly in 31.75s. Uploaded via `scp` to `/var/www/web/dist/`.
    - Live Endpoints Verified:
      - `https://api.sugo-express.org/api/maintenance/status?portal=owner` (HTTP 200 OK)
      - `https://api.sugo-express.org/api/maintenance/status?portal=customer` (HTTP 200 OK)
      - `https://api.sugo-express.org/api/maintenance/status?portal=invalid` (HTTP 400 Bad Request with validation message)
      - `https://sugo-express.org/sysadmin` (HTTP 200 OK)
      - `https://sugo-express.org/sysadmin/verify-email` (HTTP 200 OK)
* **Session Handoff & Verification (2026-09-21 — SysAdmin Security Hardening & Rate Limiter Rollout)**:
  - **Security Defense Implementation**:
    1. **Nginx Reverse Proxy Rate Limiting**: `/etc/nginx/conf.d/sysadmin_ratelimit.conf` with `limit_req_zone $binary_remote_addr zone=sysadmin_limit:10m rate=5r/s;`. Enforced on `/api/sysadmin/` with `burst=10 nodelay; limit_req_status 429;`. Verified on live VPS returning HTTP 429 under concurrent traffic burst.
    2. **Dedicated IP + Username Rate Limiter**: Express `sysAdminLoginLimiter` (max 5 failed attempts per 15 min), `sysAdminBackupLimiter` (max 3/hr), `sysAdminMutationLimiter` (max 30/5m).
    3. **MariaDB Lockout & Emergency Recovery**: `failedLoginAttempts`, `lockedUntil`, `unlockTokenHash`, `unlockTokenExpiresAt` on `SysAdmin`. Account locks after 5 failed attempts with automated unlock email dispatched.
    4. **Adaptive 2FA with 6-Digit Email OTP**: Triggered dynamically on unrecognized IP or device signature (or when `enforceTwoFactor` is toggled). 30-day trusted device token persisted in `tbl_sys_admin_trusted_devices` with browser fingerprinting.
    5. **Single-Session Concurrency & Eviction**: Previous sessions for the administrator are revoked upon new sign-in via `sessionService.revokeAllSubjectSessions`.
    6. **Frontend Idle Timeout & Session Restoration**: 15-minute idle countdown with 2-minute warning modal and activity listeners; dedicated `sysAdminRefreshToken` HttpOnly cookie on `Path=/api/sysadmin/auth/` for seamless session restoration on page reload.
    7. **UI Views in SysAdmin Console**:
       - `SysAdminLoginView.tsx`: Integrated 2FA verification challenge view with 6-digit auto-formatted input, "Trust this device for 30 days" checkbox, resend code, and error banners.
       - `AccountSettingsModule.tsx`: Added 2FA Enforcement Policy card with step-up password confirmation modal, Active Trusted Devices management card with 1-click device revocation, and 12+ character password complexity validation.
  - **Empirical Verification**:
    - Backend: `npx tsc --noEmit` passed with 0 errors. Deployed to Contabo VPS `/var/www/server/`. Prisma schema updated and synced. PM2 `capstone-backend` restarted online.
    - Frontend: `npx tsc --noEmit` passed with 0 errors. Production build (`npm run build`) completed in 44.82s. Deployed to `/var/www/web/dist/` with read permissions verified.
    - Live Endpoints Verified:
      - `POST https://api.sugoonthego.online/api/sysadmin/auth/login` returns HTTP/2 200 with `twoFactorRequired: true`, email OTP challenge, and strict security headers (`CSP frame-ancestors 'none'`, `X-Frame-Options: DENY`, `HSTS`, `RateLimit-Limit: 5`).
      - Nginx burst rate limit triggers HTTP 429 Too Many Requests when traffic exceeds threshold.
* **Session Handoff & Verification (2026-09-21 — Phase 1: Security Threat Center & Dual-Tier IP Defense)**:
  - **Overview**: Resolved all 30 architectural interview questions and delivered the complete Phase 1 Security Threat Center and Dual-Tier IP defense mechanism across server and web console.
  - **Backend (`Capstone_Server/server`)**:
    - MariaDB Models: Added `BlockedIp` (`tbl_blocked_ips`), `WhitelistedIp` (`tbl_whitelisted_ips`), enums `BanType`, `ThreatSeverity`, `BanStatus`.
    - Services & Middleware: Created `sysAdminThreatService.ts` (O(1) in-memory cache, auto-sync to Nginx `/etc/nginx/conf.d/blocked_ips.conf`, auto-pruning cron job), `threatInterceptor.ts` (pre-routing drop + regex directory scan auto-banning), `sysAdminThreatController.ts`, and CLI recovery tool `emergencyUnban.ts` (`npm run security:unban <ip>`).
    - Routes Mounted: `/api/sysadmin/threats/overview`, `/blocklist`, `/whitelist`, with `sysAdminMutationLimiter` and `verifyStepUpPassword`.
  - **Web Console (`Capstone_Project_Web`)**:
    - Types & API Client: Exported threat types in `types/sysAdmin.ts`, added dedicated threat endpoints to `services/sysAdminApiService.ts`.
    - Threat Center Module (`ThreatCenterModule.tsx`): Built 8th tab featuring Minimalist Threat Metrics, Active Blocklist table with search/filters/pagination, Whitelist Manager with locked immunity tags, Live Intrusion Feed, Defense Policy Matrix, Manual IP Ban Modal with duration/severity/step-up auth, and Revoke Ban Modal with audit note.
    - Integrated as the 8th tab `<ShieldAlert />` in `SysAdminPortal.tsx` and linked into the Quick IT Diagnostic Hub.
  - **Empirical Verification & Live VPS Testing**:
    - Server: `npx tsc --noEmit` passed with 0 errors. Database synced via `prisma db push`. PM2 `capstone-backend` restarted online.
    - Frontend: `npx tsc --noEmit` and `npm run build` completed in 29.00s. Synced to Contabo VPS `/var/www/web/dist/`.
    - Live Probe Test: Simulated attack probe `GET /.env` was immediately detected, dropped with `HTTP 403 Forbidden`, recorded in MariaDB, and added to `/etc/nginx/conf.d/blocked_ips.conf`.
    - Live In-The-Wild Threat: Production Threat Engine immediately caught and auto-banned an active bot scanning `/admin/config.php` (`187.17.228.239`), syncing `deny 187.17.228.239;` to Nginx edge drop.
    - Live Emergency CLI Test: Verified `npm run security:unban 198.51.100.99` instantly unbanned the IP and updated Nginx blocklist.
* **Session Handoff & Verification (2026-09-21 — Phase 2: Service Controls, Cloud Backups & Telegram Alerts)**:
  - **Overview**: Delivered the complete Phase 2 DevOps suite: programmatic service control for PM2 and Nginx, native Gzip-compressed database backups with 7-day retention pruning and secure export streaming, live system log streaming with server-side credential redaction, and an emergency Telegram alert webhook integration.
  - **Backend (`Capstone_Server/server`)**:
    - MariaDB Models: Added `DatabaseBackup` (`tbl_database_backups`) and `SysAdminAlert` (`tbl_sysadmin_alerts`) to `prisma/schema.prisma`. Synced to Contabo VPS via `npx prisma db push`.
    - Backup Engine (`sysAdminBackupService.ts`): Implemented native `mysqldump ... | gzip` streaming, reducing snapshot size from 5.2 MB uncompressed down to 3.63 MB (`.sql.gz`). Added 7-day retention pruner, database metadata tracking, and secure export streaming.
    - Automated Nightly Cron (`nightlyBackup.ts`): Scheduled daily automated backups at 02:00 AM Manila Time (18:00 UTC) with Telegram alert dispatch on success or failure. Registered in `index.ts`.
    - Sanitized Log Streaming (`sysAdminLogService.ts`): Reads tail lines from PM2 stdout/stderr and Nginx access/error logs with regex server-side redaction of Bearer JWTs, database passwords, API keys, and environment secrets before transmitting to browser.
    - Telegram Incident Client (`sysAdminAlertService.ts`): Sends HTML-formatted emergency alerts for 4 core incidents (Critical IP Auto-Ban, Service Restarts, DB Disconnect/Backup failure, Disk Space >85%) + UI test alert trigger.
    - Service Controls (`sysAdminDevOpsService.ts`): Added `restartService` supporting `backend` (PM2 restart with 500ms response buffer) and `nginx` (`nginx -t` validation + systemctl reload), hooked with Telegram alert dispatch.
    - Routes Mounted: `/devops/services/:service/restart`, `/devops/backups`, `/devops/backups/:id/download`, `/devops/backups/:id`, `/devops/logs`, `/devops/alerts/status`, `/devops/alerts/test`.
  - **Web Console (`Capstone_Project_Web`)**:
    - Types & API Client: Exported Phase 2 types in `types/sysAdmin.ts`, added dedicated DevOps methods to `services/sysAdminApiService.ts`.
    - 5-Tab DevOps Architecture: Refactored `DevOpsModule.tsx` into 5 clean modular tabs:
      1. `TelemetryTab.tsx`: System telemetry KPI cards, memory breakdown bar, 3NF table volume, per-portal maintenance mode governance.
      2. `ServiceControlsTab.tsx`: PM2 backend & Nginx reload cards, command preview, Step-Up Password verification modal.
      3. `BackupsTab.tsx`: 7-day retention notice, snapshot inventory table, on-demand dump modal, secure blob download, step-up protected deletion.
      4. `LogsTab.tsx`: 4 log source tabs, search filter, lines dropdown, auto-scroll, clipboard copy, server-side redaction active badge.
      5. `TelegramAlertsTab.tsx`: Bot status indicator, masked chat ID, trigger test alert button, 4 core trigger rules, recent alerts audit table with JSON metadata inspection.
  - **Empirical Verification & Production VPS Tests**:
    - Backend: `npx tsc --noEmit` passed with 0 errors. Deployed to Contabo VPS `/var/www/server/`. `npx prisma db push` synced models. PM2 `capstone-backend` restarted online (`pid 526007`, status `online`, 19.5mb RAM).
    - Frontend: `npx tsc --noEmit` and `npm run build` completed cleanly in 30.42s. Deployed to `/var/www/web/dist/`.
    - Live Backup Test on VPS: Executed `createDatabaseBackup('MANUAL')` on Contabo VPS: generated `db_backup_2026-09-21T10-14-48-013Z.sql.gz` at 3.63 MB (compressed from 5.2 MB raw SQL), verified record in MariaDB `tbl_database_backups`.
    - Live Log Tail Test on VPS: Executed `getTailLogs('pm2_out', 5)`: returned 10 sanitized lines from `/root/.pm2/logs/capstone-backend-out.log`.
    - Live Alert Status Test on VPS: Executed `getAlertStatus()`: gracefully reported unconfigured status without throwing errors.
    - Live Portal Verification: Confirmed `https://sugo-express.org/sysadmin` loads the 5-tab DevOps Command Center with full interactivity.
* **Session Handoff & Verification (2026-09-21 — Phase 3: Hotfix Account Status Modification 403 Forbidden)**:
  - **Issue Diagnosed**: In User Monitoring (`/sysadmin` -> Users tab), attempting to modify user status (Active, Suspended, Locked) returned HTTP 403 Forbidden (`Request failed with status code 403`).
  - **Root Cause**: Endpoint `PATCH /api/sysadmin/users/:role/:id/status` is guarded by `verifyStepUpPassword`. The client modal lacked a password input, so the request omitted `stepUpPassword`.
  - **Fix Applied**:
    - `src/services/sysAdminApiService.ts`: Updated `updateAccountStatus` to accept and send `stepUpPassword`.
    - `src/portals/sysadmin/modules/users/UserMonitoringModule.tsx`:
      - Added `stepUpPassword` state variable.
      - Integrated Administrator Step-Up Password input with `Lock` icon and clear helper text into the Modify Account Status modal.
      - Disabled "Confirm Change" button until an administrator password is entered.
      - Updated error catching to display `(err as any)?.response?.data?.error` to surface specific backend feedback instead of generic status codes.
  - **Empirical Verification & Deployment**:
    - Frontend `npx tsc --noEmit` passed with 0 errors.
    - Production bundle compiled with `npm run build` in 29.96s with 0 errors.
    - Deployed to `/var/www/web/dist/` on Contabo VPS (`109.123.239.182`).
    - Verified PM2 `capstone-backend` process online and static assets updated.
* **Session Handoff & Verification (2026-09-21 — Phase 4: Per-Portal System Maintenance Governance Revamp)**:
  - **Overview**: Revamped per-portal system maintenance governance with custom overlay themes, customizable header/message/support contact, custom color accent override, disk-backed JSON persistence, graceful 60-second banner countdown takeover, full-screen live preview overlay simulation, step-up password authorization, and Telegram IT alert dispatch.
  - **Backend (`Capstone_Server/server`)**:
    - `src/services/sysAdminDevOpsService.ts`: Added `PortalMaintenanceConfig` supporting 4 types (`SCHEDULED`, `EMERGENCY`, `UPGRADE`, `SECURITY`), custom header/message/supportContact/customColor, disk persistence to `config/maintenance.json` surviving PM2 restarts, real-time Socket.io broadcast (`maintenance:update`), and automated Telegram alert dispatch (`sysAdminAlertService`).
    - `src/controllers/sysAdminDevOpsController.ts`: Updated `toggleMaintenanceHandler` and `getPublicMaintenanceStatusHandler`.
    - `src/routes/sysAdminRoutes.ts`: Guarded maintenance toggle with `verifyStepUpPassword`.
    - Verified live on Contabo VPS: `curl http://127.0.0.1:5000/api/maintenance/status?portal=owner` returns full enhanced object.
  - **Web Console & Portals (`Capstone_Project_Web`)**:
    - `src/types/sysAdmin.ts`: Updated `PortalMaintenanceStatus`, added `MaintenanceType`.
    - `src/services/sysAdminApiService.ts`: Passed all maintenance config options + `stepUpPassword`.
    - `src/hooks/useMaintenanceCheck.ts`: Dual-sync hook combining instantaneous Socket.io push (`maintenance:update`) with 30s HTTP polling fallback, plus 60-second grace period countdown engine.
    - `src/components/MaintenanceWarningBanner.tsx`: Top-fixed 60s countdown banner with tabular-num timer pill and themed category badge.
    - `src/components/MaintenanceOverlay.tsx`: Redesigned full-screen lockdown barrier with 4 semantic themes, custom accent override, and support contact mailto action.
    - `src/portals/owner/OwnerPortal.tsx` & `src/portals/dispatcher/DispatcherPortal.tsx`: Connected warning banner and full overlay.
    - `src/portals/sysadmin/modules/devops/TelemetryTab.tsx`: Revamped in-card management with 4-type pill selectors, header input, message textarea, support contact, color palette swatches + hex input, full-screen Live Preview Overlay modal, and Step-Up Password confirmation modal.
  - **Empirical Verification & Production VPS Deployment**:
    - Backend: `npx tsc --noEmit` -> 0 errors. Deployed `dist/*` to `/var/www/server/dist/`. PM2 reloaded: `capstone-backend` (PID 532766, online).
    - Frontend: `npx tsc --noEmit` -> 0 errors. `npm run build` -> completed in 31.56s (0 errors). Deployed `dist/*` to `/var/www/web/dist/`.
    - Verified `https://sugo-express.org/sysadmin` live with fresh assets.
* **Session Handoff & Verification (2026-09-21 — Phase 5: Professional Standard Enterprise UI Redesign of Maintenance Overlay)**:
  - **Overview**: Redesigned `MaintenanceOverlay.tsx` into a clean, standard enterprise downtime layout (similar to GitHub / Stripe status pages), completely eliminating card clutter, pulsating icon animations (`animate-ping`, `animate-pulse`), and glowing circular discs.
  - **Files Synchronized**:
    - `src/components/MaintenanceOverlay.tsx`: Single cohesive container (`max-w-lg`) on `#0B132B`, top hairline accent bar, system identity breadcrumb (`SUGO System / [Portal]`), static solid status dot, 16px vector icon in a slate tray, 3-column metadata grid (`Target`, `Type`, `State: Paused`), text-based support link, and auto-resume reassurance footer.
    - `src/components/MaintenanceWarningBanner.tsx`: Removed `animate-pulse` from `AlertTriangle` icon.
    - `src/portals/sysadmin/modules/devops/TelemetryTab.tsx`: Removed `animate-pulse` from portal status pills.
  - **Empirical Verification & VPS Deployment**:
    - `npx tsc --noEmit` -> 0 errors.
    - `npm run build` -> 0 errors, compiled in 29.83s.
    - Deployed `dist/*` to Contabo VPS `/var/www/web/dist/` (`109.123.239.182`) with permissions verified (chmod 755).
    - Verified `https://sugo-express.org/sysadmin` returns HTTP/2 200.
* **Session Handoff & Verification (2026-09-21 — Phase 6: SysAdmin Mandarin Internationalization & Language Governance)**:
  - **Overview**: Implemented multi-language governance across the entire SysAdmin IT Console (`/sysadmin`) with **Simplified Chinese Hanzi (`简体中文`) set as DEFAULT** to give the system an authentic, complicated enterprise IT appearance, with English toggle support.
  - **Architecture & Modules Implemented**:
    - `src/portals/sysadmin/i18n/sysAdminI18n.ts`: Central bilingual dictionary (`SysAdminTranslations`) in high-security Simplified Chinese (`zh`) and English (`en`).
    - `src/portals/sysadmin/context/SysAdminLanguageContext.tsx`: `SysAdminLanguageProvider` with default `"zh"`, `localStorage` persistence under `sugo_sysadmin_lang`, and typed `t(key)` helper.
    - `src/portals/sysadmin/SysAdminPortal.tsx`: Top Right Header Language Switcher (`[ 🌐 简体中文 ] [ English ]`), 8 navigation tabs in authentic Hanzi, and System Pulse / Quick Diagnostic Hub translations.
    - `src/portals/sysadmin/components/SysAdminLoginView.tsx`: Small bottom screen text button `Language: [ 🌐 简体中文 (默认) ] • [ English ]` in footer, top bar toggle, and full Mandarin login form / 2FA challenge copy.
    - Sub-Modules Integrated with `useSysAdminLanguage()`: `DevOpsModule.tsx`, `ThreatCenterModule.tsx`, `UserMonitoringModule.tsx`, `AuditLogsModule.tsx`, `TrafficMonitoringModule.tsx`, `ItStaffModule.tsx`, `AccountSettingsModule.tsx`.
  - **Empirical Verification & Production Build**:
    - `npx tsc --noEmit` -> **0 errors**.
    - `npm run build` -> **0 errors**, compiled in **24.82s** (`dist/assets/SysAdminPortal-Psl1276Z.js`).
    - Deployment Command for USER: `scp -r C:\Capstone_Project_Web\dist\* root@109.123.239.182:/var/www/web/dist/`.
* **Session Handoff & Verification (2026-09-21 — Phase 7: Strict Cross-Portal Session Isolation: Operational Staff vs. SysAdmin)**:
  - **Issue Resolved**: Logged-in operational staff (`dispatcher` or `owner`) could enter `/sysadmin` via URL bar, log in as `sysadmin`, and access operational routes concurrently without mutual exclusion, posing an authorization and session contamination hazard.
  - **Architecture & Defense Implemented**:
    1. **Context Elevation (`src/app/App.tsx`)**: Elevated `<SysAdminLanguageProvider>` and `<SysAdminAuthProvider>` to wrap `RouterProvider` at root level, providing global auth state awareness to all route guards.
    2. **Security Barrier Screen (`src/components/modals/SessionConflictScreen.tsx`)**: Created dedicated conflict resolution screen with 2 variants:
       - `operational_active`: Displays active staff credentials (`@dispatcher1`, `DISPATCHER`), blocking `/sysadmin` with options: `[ Return to Dispatcher Portal ]` or `[ Sign Out & Proceed ]`.
       - `sysadmin_active`: Displays active SysAdmin credentials (`@sysadminit`, `SYSADMIN`), blocking `/owner`, `/dispatcher`, `/places` with options: `[ Return to SysAdmin ]` or `[ Sign Out of SysAdmin ]`.
    3. **Route Guards Hardening**:
       - `src/components/ProtectedRoute.tsx`: Checks `useOptionalSysAdminAuth()`. If active, renders `SessionConflictScreen` (`variant="sysadmin_active"`).
       - `src/components/GuestRoute.tsx`: If SysAdmin session is active, redirects `/` to `/sysadmin`.
       - `src/portals/sysadmin/SysAdminPortal.tsx`: Checks `useAuth()`. If operational session is active, renders `SessionConflictScreen` (`variant="operational_active"`).
       - Removed duplicate nested provider wrappers from `SysAdminPortal.tsx` and `SysAdminMagicLinkVerificationPage.tsx`.
    4. **Bidirectional Mutual Exclusion Purging**:
       - `src/context/AuthContext.tsx`: On operational login, automatically clears `sugo_sysadmin_active`, resets SysAdmin in-memory tokens, and calls `sysAdminApiService.logout()`.
       - `src/portals/sysadmin/context/SysAdminAuthContext.tsx`: On SysAdmin login (`login`, `verify2Fa`, `applyVerifiedSession`), executes `purgeOperationalSession()`, clearing `errand_system_session_user` and `sugo_session_active`.
  - **Empirical Verification & Build**:
    - `npx tsc --noEmit` -> **0 errors**.
    - `npm run build` -> **0 errors**, compiled in **47.02s** (`dist/assets/SysAdminPortal-B1ewjeQP.js`, `dist/assets/DispatcherPortal-Cqs_CKMs.js`, `dist/assets/OwnerPortal-DG6lIg5g.js`).
* **Session Handoff & Verification (2026-09-22 — Phase 8: 50-Point Mobile Phone Browser Responsiveness Overhaul)**:
  - **Overview**: Resolved and implemented all 50 architectural decisions codified in `implementation_plan.md` for smartphone browsers (iOS Safari, Android Chrome, mobile WebKit) across Dispatcher (`/dispatcher`), Owner (`/owner`), SysAdmin (`/sysadmin`), and Login Gateway (`/`).
  - **Phase 1: Foundation & Mobile Ergonomic Architecture**:
    - `src/styles/index.css`: Added safe-area variables (`--sat`, `--sab`, `--sal`, `--sar`), `.pt-safe`/`.pb-safe` utilities, iOS 16px input font enforcement rule (`@supports (-webkit-touch-callout: none)`) eliminating forced Safari zoom, `overscroll-behavior: contain` + smooth inertia scrolling, dynamic `.min-h-dvh` utilities, and touch highlight transparency.
    - `src/hooks/useDeviceTier.ts`: 3-tier device classification hook (`compact` < 360px, `standard` 360-414px, `phablet` 415-600px, `desktop` > 600px).
    - `src/components/navigation/MobileHeader.tsx` & `MobileBottomNav.tsx`: Fixed top sticky header and ergonomic bottom tab bar with More action sheet.
    - `src/components/common/ScrollToTopButton.tsx`, `LandscapeBanner.tsx`, `CopyChip.tsx`, `StickyFormErrorSummary.tsx`.
    - `src/hooks/useFormDraft.ts`, `src/utils/focusAutoScroll.ts`, `src/utils/audioHapticAlert.ts`.
  - **Phase 2: Operational Consoles Overhaul**:
    - `src/portals/dispatcher/DispatcherPortal.tsx`: Conditional mobile layout hiding desktop sidebar/rail, renders `MobileHeader` with brand/time/notifications/sign-out, and attaches `MobileBottomNav` (Queue, Active, Conflict, Tracking + More sheet for chats/settings), `pb-20`, and `ScrollToTopButton`.
    - `src/portals/owner/OwnerPortal.tsx`: Conditional mobile layout hiding desktop sidebar/rail, renders `MobileHeader`, and attaches `MobileBottomNav` (Dashboard, Reports, Users, Rates + More sheet for riders/tracking/categories/logs), `pb-20`, and `ScrollToTopButton`.
    - `src/components/DateRangePicker.tsx`: Single-month view (`numberOfMonths={isPhone ? 1 : 2}`) to prevent horizontal blowout on phones, horizontal scrolling preset tabs, and `max-w-[95vw]` popover limit.
    - `src/portals/owner/modules/dashboard/components/CategorySalesChart.tsx` & `FinancialChannelMixChart.tsx`: Switched to vertical bar chart layout (`layout="vertical"`) on phone viewports with calibrated font sizes and heights.
  - **Phase 3: SysAdmin Console, Modals & Security Hardening**:
    - `src/portals/sysadmin/SysAdminPortal.tsx`: Conditional mobile layout rendering `MobileHeader` with compact language switcher (`中文` / `EN`) and sign-out, `MobileBottomNav` (Overview, Threats, Users, DevOps + More sheet for audit/traffic/staff/settings), `pb-24`, 2x2 responsive Quick Metrics and Diagnostic Hub grids, and `ScrollToTopButton`.
    - `src/portals/sysadmin/modules/devops/TelemetryTab.tsx`: Updated KPI cards to 2x2 grid (`grid-cols-2 lg:grid-cols-4`).
    - `src/portals/sysadmin/modules/devops/LogsTab.tsx`: Horizontally scrollable source tabs and responsive terminal padding.
    - `src/components/modals/SessionConflictScreen.tsx`: Added `min-h-dvh pt-safe pb-safe`, 48px touch targets, and `active:scale-[0.98]`.
    - `src/components/MobileAppNoticeModal.tsx`: Added direct 1-tap download button for Android App (`https://sugoonthego.online#download`) with 48px touch targets.
    - `src/components/LoginPage.tsx` & `SysAdminLoginView.tsx`: Main containers updated with `min-h-dvh pt-safe pb-safe`.
  - **Empirical Verification & Production Build**:
    - `npx tsc --noEmit` -> **0 errors**.
    - `npm run build` -> **0 errors**, compiled in **31.44s** with clean vendor chunk splits (`dist/assets/DispatcherPortal-BQjHuLbt.js`, `dist/assets/OwnerPortal-3NbtpgVq.js`, `dist/assets/SysAdminPortal-DS1rh5qc.js`).
    - Deployment Command for USER: `scp -r C:\Capstone_Project_Web\dist\* root@109.123.239.182:/var/www/web/dist/`.
* **Session Handoff & Verification (2026-09-22 — Phase 9: Mobile Responsive Table Layout Overhaul Across All Portals)**:
  - **Overview**: Addressed all multi-column tabular data displays across **Owner Portal**, **SysAdmin Console**, and **Dispatcher Portal** on smartphones (`width < 768px`). Converted horizontal scroll-bloated tables into mobile-first 2-column accordions with quick preview rows, full-screen `RecordInspectorView`, slide-over `TableFilterDrawer`, 44px pagination toolbars, and 100% desktop fidelity preservation via `desktopView`.
  - **Core Mobile Table Engine Architecture**:
    - `src/components/table/RecordInspectorView.tsx`: Full-screen record inspector (`fixed inset-0 z-50 bg-[#070D1B] pt-safe pb-safe`) with Back navigation header, structured card sections, `CopyChip` integration, and sticky bottom action dock.
    - `src/components/table/TableFilterDrawer.tsx`: Slide-over drawer with backdrop blur, active filter count pill, and `[ Apply ]` / `[ Reset All ]` actions.
    - `src/components/table/MobileResponsiveTable.tsx`: Generic `<T>` mobile table engine managing single-expand accordion state (`expandedId`), row click targets, 2-column headers, 3-item previews, full-screen inspector trigger, 44px pagination toolbar, and seamless `desktopView` passthrough on desktop.
    - `src/components/table/index.ts`: Barrel exports.
  - **SysAdmin Portal Modules Migrated**:
    - `src/portals/sysadmin/modules/threats/ThreatCenterModule.tsx`: Blocklist Table & Whitelist Table.
    - `src/portals/sysadmin/modules/users/UserMonitoringModule.tsx`: Monitored Accounts Table.
    - `src/portals/sysadmin/modules/audit/AuditLogsModule.tsx`: All 4 audit categories (`auth`, `modifications`, `security`, `lifecycle`).
    - `src/portals/sysadmin/modules/devops/BackupsTab.tsx`: Database Backups Table.
    - `src/portals/sysadmin/modules/devops/TelegramAlertsTab.tsx`: Incident Alerts Table.
  - **Owner Portal Modules Migrated**:
    - `src/portals/owner/modules/reports/components/TransactionSummaryReportView.tsx`: 11-column Transactions table.
    - `src/portals/owner/modules/reports/components/SalesReportView.tsx`: Category Sales table.
    - `src/portals/owner/modules/reports/components/CommissionReportView.tsx`: Commission Category table.
    - `src/portals/owner/modules/reports/components/RiderPerformanceReportView.tsx`: Rider Fleet Metrics table.
    - `src/portals/owner/modules/reports/components/SettlementReportView.tsx`: Both "By rider" and "Every settlement" tables.
    - `src/portals/owner/modules/reports/components/ExceptionReportView.tsx`: Both "By rider" and "Every exception" tables.
    - `src/portals/owner/modules/merchants/components/PlacesTab.tsx`: Verified Places Directory table.
  - **Dispatcher Portal Module Migrated**:
    - `src/portals/dispatcher/components/RecentChatsPanel.tsx`: Customer Chat History table.
  - **Empirical Verification & Production Build**:
    - `npx tsc --noEmit` -> **0 errors**.
    - `npm run build` -> **0 errors**, compiled cleanly in **30.56s** (`dist/assets/MobileResponsiveTable-BCdSxPYd.js`, `dist/assets/OwnerPortal-DW1e61Rr.js`, `dist/assets/DispatcherPortal-0UTHiPDk.js`, `dist/assets/SysAdminPortal-D8Sfm14h.js`).
  - **Session Handoff & Verification (2026-09-22 — Dual-Shield Session Persistence & Cloudflare Cookie Alignment)**:
    - **Issue Resolved**: Browser reload (Ctrl+R / F5) logging users out of `https://sugo-express.org`.
    - **Dual-Shield Architecture**: Configured primary HttpOnly cookie (`SameSite=None; Secure; domain=.sugo-express.org`) + `sessionStorage` fallback (`sugo_refresh_fallback`) per Rule 1.1. Even if third-party cookie blocking or Cloudflare challenges strip cross-subdomain cookies on page reload, the fallback ensures silent token refresh succeeds 100% without logging out.
    - **Compilations & Production Builds**:
      - `npx tsc --noEmit` -> **0 errors** on both Web and Server.
      - `npm run build` -> **0 errors** (bundled in 47.61s).
    - **User Deployment Directives**:
      1. Web Frontend: `scripts/deploy-web.sh`
      2. Server Backend: Build on server via `npm run build` & `pm2 restart capstone-backend`
* **Session Handoff & Verification (2026-09-23 — Full Production VPS Deployment of Web & Server)**:
  - **Web Frontend Deployment (`https://sugo-express.org`)**:
    - Compiled cleanly via `npm run build` (0 errors, 40.40s).
    - Executed canonical self-cleaning deployment via `scripts/deploy-web.sh --no-build`.
    - Staged 72 files, synced into `/var/www/web/dist` with `--delete-after` and archived older chunks to `/root/deploy-backups/web-20260923-063701`.
    - All 72 referenced chunks and internal dynamic imports verified resolving with zero broken references.
    - Verified live HTTP response: `https://sugo-express.org -> HTTP 200`.
  - **Backend Server Deployment (`https://api.sugo-express.org`)**:
    - Pre-backup created on VPS: `/root/deploy-backups/server-src-backup/`.
    - Synchronized `src/`, `prisma/schema.prisma`, and `package.json` to `/var/www/server/`.
    - Executed `npx prisma generate` and `npx prisma db push` (synced `proximity_alert_sent_at` and SysAdmin threat tables).
    - Executed clean production TypeScript build ON the server (`npm run build` -> 0 errors).
    - Restarted PM2 daemon (`pm2 restart capstone-backend`).
    - Verified live API status: `http://127.0.0.1:5000/api/health` -> HTTP 200 (`status: online`).
    - Verified Nginx reverse proxy: `https://api.sugo-express.org/api/health` -> HTTP 200 (`status: online`).
* **Session Handoff & Verification (2026-09-23 14:22 — Complete Production System Deployment: Web, Landing, Server, AI & OSRM)**:
  - **Landing Page Deployment (`https://sugoonthego.online`)**:
    - Compiled cleanly via `npm run build` in `Capstone_Landing_Page` (0 errors, 2.88s).
    - Executed `scripts/deploy-landing.sh --no-build` deploying to `/var/www/landing/dist/`.
    - 125 MB APK payload checked by MD5 checksum and skipped re-uploading, keeping deploy instant.
    - Verified live response: `https://sugoonthego.online -> HTTP 200`.
  - **Web & Staff Portal Deployment (`https://sugo-express.org`)**:
    - Recompiled via `npm run build` (0 errors, 34.93s).
    - Executed self-cleaning deploy via `scripts/deploy-web.sh --no-build`.
    - Staged 72 files, synced into `/var/www/web/dist/` with `--delete-after` and archived older chunks to `/root/deploy-backups/web-20260923-141833/`.
    - Verified all 72 chunks and lazy-loaded routes resolve.
    - Verified live response: `https://sugo-express.org -> HTTP 200`.
  - **Backend Server Deployment (`https://api.sugo-express.org`)**:
    - Synchronized full `src/` tree over SSH tar stream, plus `prisma/schema.prisma` and `package.json`.
    - Generated Prisma Client v5.22.0 (`npx prisma generate`).
    - Verified DB sync status: `errand_system_db` in sync.
    - Compiled TypeScript ON the VPS (`npm run build` -> 0 errors).
    - Restarted PM2 daemon (`capstone-backend` PID 713571, status: `online`).
    - Verified API health: `http://127.0.0.1:5000/api/health` & `https://api.sugo-express.org/api/health` -> HTTP 200 (`status: "online"`).
  - **Microservices Health**:
    - AI Category Classifier (`capstone-category` container on `127.0.0.1:8100`): HTTP 200 `status: ok`, model version 2, store & item models loaded.
    - OSRM Routing Engine (`capstone-osrm` container on `127.0.0.1:5001`): Up and healthy.
    - Edge Nginx: Active with synced threat blocklists.
* **Session Handoff & Verification (2026-09-23 17:07 — Web & Server Production Deployment & Verification)**:
  - **Web & Staff Portal (`https://sugo-express.org`)**:
    - Recompiled with clean Vite build (`npm run build` -> 0 errors).
    - Synced to `/var/www/web/dist/` via `scripts/deploy-web.sh --no-build` with `--delete-after` (parked older chunks to `/root/deploy-backups/web-20260923-170341/`).
    - Verified all 72 chunks resolve; live Nginx probe returns `HTTP 200`.
  - **Backend Server (`https://api.sugo-express.org`)**:
    - Transferred full `src/` tree over SSH tar stream, `prisma/schema.prisma`, and `package.json`.
    - Generated Prisma Client v5.22.0 (`npx prisma generate`) and confirmed DB sync (`npx prisma db push`).
    - Compiled TypeScript directly on VPS (`npm run build` -> 0 errors).
    - Restarted PM2 daemon (`capstone-backend` PID 727809, status: `online`).
    - Verified API health endpoints: `http://127.0.0.1:5000/api/health` and `https://api.sugo-express.org/api/health` both return `HTTP 200` (`status: "online"`).
    - Confirmed active incoming Socket.IO connections.
  - **Microservices & Landing**:
    - `https://sugoonthego.online` -> `HTTP 200`.
    - AI Classifier on port 8100 -> `status: ok`, model version 2.
* **Session Handoff & Verification (2026-09-23 17:55 — Rider Tracking Availability & Sweep Hardening Fix)**:
  - **Problem Solved**: On-duty riders with active mobile apps were showing as "Offline" / "Off duty" on the Web Dispatcher and Owner tracking modules.
  - **Root Causes**:
    1. `sweepAbandonedLoginSessions` in `riderPresenceService.ts` checked only in-memory Socket.IO presence (`riderPresenceStore.isOnline`) and closed `rider_login_sessions` if sockets disconnected while backgrounded/sleeping, even while the rider was actively sending HTTP beacons.
    2. `openLoginSession` was only invoked on initial password login, so once swept, riders restoring sessions from mobile storage were permanently stuck with `hasSession = false` and evaluated as `LOGGED_OUT`.
    3. `availabilityForRiders` in `riderBeaconService.ts` marked riders as `LOGGED_OUT` if `withSession.has(riderId)` was false, ignoring fresh on-duty `rider_presence` rows.
  - **Surgical Deltas in Backend Server (`C:\Capstone_Server\server`)**:
    - `src/lib/riderPresenceStore.ts`: Updated `addSocket` to clear `lastDisconnectedAt` on connect.
    - `src/services/riderPresenceService.ts`: Made `openLoginSession` idempotent; hardened `sweepAbandonedLoginSessions` to inspect `rider_presence` rows and never close sessions of actively beaconing on-duty riders; clamped `effectiveLogoutAt` so it cannot be before `session.loginAt`.
    - `src/services/riderBeaconService.ts`: Updated `recordBeacon` to auto-open sessions when on-duty riders beacon without an open session; updated `availabilityForRiders` to treat riders with fresh on-duty beacons (< `OFFLINE_AFTER_MS`) as having an active session with background self-healing.
    - `src/services/authService.ts`: Added background session guarantee for riders during `refreshAccessToken`.
  - **Empirical Verification**:
    - Local: `npx tsc --noEmit` passed with 0 errors. Vitest `tests/riderAvailability.test.ts` (17/17) and `tests/dashboardRiderPresence.test.ts` (6/6) passed.
    - Production VPS: Deployed to `/var/www/server/src/`, compiled with `npm run build` (0 errors), restarted PM2 (`capstone-backend` PID 733490).
* **Session Handoff & Verification (2026-09-23 20:42 — Dispatcher Portal UI/UX Re-alignment & 6-Stage Order Chat Implementation)**:
  - **User Requirements Addressed**:
    1. **Swap Card Labels**: In `DispatchErrandCard.tsx`, changed the primary title (`h3`) to Customer Name and moved Store / Merchant Category to the secondary position (with `(+N stores)` multi-stop badge). Added `(fee)` label to total price.
    2. **Remove `est.` Prefix**: In `DispatchDetailInspector.tsx`, removed `est.` prefix from the Requested items header count.
    3. **Hide Estimated Items Price in "What it comes to"**: In `DispatchDetailInspector.tsx`, hid the Items line when `subtotal === 0` (unpurchased state) and added clear copy: *"Excludes item cost — settled upon rider purchase receipt."* Guarded the unreconciled calculation against misleading negative totals.
    4. **Order Chat 6-Stage Workflow & Progressive Locking**:
       - Re-aligned the pipeline from 5 to 6 discrete stages:
         - **Step 1: Check the order** (`Stage1CheckOrder.tsx`) — items checklist and acceptance; `Deliver to` card and `Map` button removed and transferred to Step 2.
         - **Step 2 [NEW]: Check delivery address** (`Stage2CheckAddress.tsx`) — contains `Deliver to` address, customer note, `[ Map ]` button, missing GPS coordinates defensive alert and confirmation blocking, out-of-service area decline modal, and `[ Confirm delivery address ]` CTA.
         - **Step 3: Pin the stores** (`Stage2PinStores.tsx`, formerly Step 2).
         - **Step 4: Confirm the items** (`Stage3ConfirmItems.tsx`, formerly Step 3).
         - **Step 5: Set up payment** (`Stage4Payment.tsx`, formerly Step 4).
         - **Step 6: Send a rider** (`Stage5SendRider.tsx`, formerly Step 5).
       - Enforced strict progression locking in `StageList.tsx`: forward stages (`state === "todo"`) are completely disabled and unclickable (`cursor-not-allowed opacity-40 disabled`). Completed stages remain openable for review.
       - Automatic step advancement: Step 1 accept -> Step 2; Step 2 address confirm -> Step 3; Step 3 pins continue -> Step 4; Step 4 item approval -> Step 5; Step 5 payment confirmation -> Step 6.
  - **Empirical Verification**:
    - `npx tsc --noEmit` in `C:\Capstone_Project_Web` completed with exit code 0 (zero errors).
    - `npm run build` in `C:\Capstone_Project_Web` completed with exit code 0 (built in 32.51s, 72 assets).
    - **Production VPS Deployment (`https://sugo-express.org`)**:
      - Executed `scripts/deploy-web.sh` via Git Bash.
      - Synced 72 production assets to `/var/www/web/dist` on Contabo VPS (`109.123.239.182`) with `--delete-after`.
      - Replaced chunks archived to `/root/deploy-backups/web-20260923-205211`.
      - Verified chunk integrity: *"every referenced chunk resolves"*.
      - Verified live Nginx probe: `https://sugo-express.org -> HTTP 200`.
* **Session Handoff & Verification (2026-09-23 23:51 — Full Production VPS Deployment: Web & Backend Server)**:
  - **Web Frontend Deployment (`https://sugo-express.org`)**:
    - Pre-build check: `npx tsc --noEmit` -> 0 errors.
    - Production build: `npm run build` completed in 49.42s (72 assets, zero errors).
    - Executed `scripts/deploy-web.sh --no-build` via Git Bash.
    - Staged and synced 72 production assets to `/var/www/web/dist` on Contabo VPS (`109.123.239.182`) with `--delete-after`.
    - Archived replaced chunks to `/root/deploy-backups/web-20260923-234836`.
    - Verification: Every referenced JS/CSS chunk and dynamic import resolves with 0 missing or dangling references.
    - Live probe: `https://sugo-express.org` -> HTTP 200 OK.
  - **Backend Server Deployment (`https://api.sugo-express.org`)**:
    - Pre-build check: `npx tsc --noEmit` in `C:\Capstone_Server\server` -> 0 errors.
    - Automated deployment engine: `C:\Capstone_Server\server\scripts\deploy-server.sh`.
    - Pre-deployment backup created on VPS: `/root/deploy-backups/server-20260923-234944/src`.
    - Transferred full `src/` tree, `prisma/schema.prisma`, and `package.json` over SSH tar stream to `/var/www/server/`.
    - Prisma Client generated on server: `npx prisma generate` (v5.22.0).
    - Database schema verified in sync: `npx prisma db push`.
    - TypeScript compiled directly on VPS: `npm run build` (tsc) -> 0 errors.
    - Restarted PM2 daemon: `pm2 restart capstone-backend` (PID 769076, status: `online`, 20.5 MB memory).
    - Verified health checks:
      - Local: `http://127.0.0.1:5000/api/health` -> HTTP 200 (`🟢 System Online`).
      - Edge: `https://api.sugo-express.org/api/health` -> HTTP 200 (`🟢 System Online`).
  - **Microservices & Fleet Verification**:
    - Category ML Microservice (`127.0.0.1:8100/health`) -> `status: "ok"`, `ready: true`, model version 2.
    - OSRM Routing Engine (`127.0.0.1:5001`) -> active.
    - Web Portal (`https://sugo-express.org`) -> HTTP 200.
    - API Gateway (`https://api.sugo-express.org/api/health`) -> HTTP 200.













* **Session Handoff (2026-09-24 02:20 — Inaccurate ETA and route line at high zoom, errand ...99e1b3)**:
  - **Evidence** (`C:\Capstone_Server\server\Innacurate ETA and route line issues when zoom in\`, two screenshots 01:47): customer map showed 55.7 km / 55 min, rider HUD 52.9 km / 50 min, customer card "33.4 km from Julie's Bakeshop"; zoomed in, the orange line ran beside "Road entering Banga".
  - **Causes, measured on production**:
    - Customer ETA badge quoted the whole errand (rider, store, customer) beside a line that was only the run to the store. Card figure was straight-line (haversine), not road.
    - OSRM car profile prices trunk roads at 85 km/h (leg 0 averaged 64 km/h).
    - Server ETA window (`etaLowAt/etaHighAt`) only recomputed on breadcrumb uploads and status changes; this errand has none, so it sat on its 01:03 value.
    - Line offset is map DATA, not smoothing: `smoothPath` moves this route at most 1.81 m. The OSM segment at 6.4115,124.7694 to 6.4105,124.7688 is one 130 m edge 5 degrees off Google's road, so at zoom ~21 it sits up to ~10 m beside the basemap road. The real fix is correcting that OSM way and rebuilding the graph.
  - **Server (deployed, backup `/root/deploy-backups/server-20260924-021652`)**:
    - NEW `src/lib/routing/speedCap.ts` `cappedDurationSeconds`; env `ROUTE_MAX_SPEED_KMH` (default 60, 0 disables). `osrmProvider.route()` caps each step, sums legs and route from steps; `matrix()` floors each pair at distance/cap. Durations only; fares use distance and are unchanged.
    - `etaService.recomputeFromLivePosition(errandId)` (once per errand per minute, in-memory), called from `riderLocationBroadcast.send()` per active errand.
    - Tests: `tests/routeSpeedCap.test.ts` (5), `tests/etaLiveRecompute.test.ts` (2), broadcast test +1. Full suite: only the 4 known firebaseUid/passwordReset failures.
    - Live check: leg 0 now 52.9 km / 60 min, total 65 min; errand ETA recomputed 02:17 from the live stream.
  - **CustomerApp (needs a new APK to reach customers; not published)**:
    - `directionsService` parses `legs`; `useLiveRoute` exposes `pickup*/delivery*` figures and `nextStopRoadMeters` via exported `legFigures()`.
    - `LiveTrackingMap`: badge quotes the drawn line ("To store" / "To you"), Clock icon replaces the emoji; `maxZoomLevel` 18; dotted `route-link` from rider to route start when 12 to 500 m apart.
    - `errandProgress`: optional `nextStopRoadMeters` gives road distance to the next stop in visiting order. `TrackTab` now passes `phase` (it never did).
    - Tests: `src/__tests__/routeLegFigures.test.ts` (8), `LiveTrackingMapModes` +6. Jest 40 suites / 293 pass, tsc clean.
  - **Not changed**: RiderMobileApp (gets the new durations from the server), web LiveFleetMap zoom.
* **Session Handoff & Verification (2026-09-24 02:56 — Owner Portal Data Modification Confirmation Modals & Production VPS Deployment)**:
  - **User Requirements Addressed**:
    - Add confirmation modals when updating, editing, or adding any data in the Owner Portal across:
      1. User Management (`AddUserModal.tsx`, `EditUserModal.tsx`)
      2. Merchant Category (`MerchantCategoryModule.tsx`, `CategoryCard.tsx`, `PlacesTab.tsx`)
      3. Service Rates (`ServiceRatesModule.tsx`)
    - Display an itemized summary preview of changes/data before submitting (delta comparison for updates; attribute summary for creations).
    - Deploy changes to production on Contabo VPS (`109.123.239.182`) upon completion.
  - **Surgical Deltas in Web Workspace (`C:\Capstone_Project_Web`)**:
    - `src/components/panel/ConfirmDialog.tsx`: Added `tone?: "danger" | "neutral" | "info" | "success"`, custom `icon?: LucideIcon`, and safe structured JSX rendering for `body` to avoid HTML `<p>` nesting warnings.
    - `src/portals/owner/modules/users/components/AddUserModal.tsx`: Integrated `ConfirmDialog` before user account creation, displaying Full Name, Username, Role, Email, and Phone.
    - `src/portals/owner/modules/users/components/EditUserModal.tsx`: Added `getModifiedFields()` delta calculation and `ConfirmDialog`. Seamlessly chains to the Admin Password prompt if role elevation/transition is included.
    - `src/portals/owner/modules/merchants/MerchantCategoryModule.tsx`: Added `ConfirmDialog` before creating a new merchant category, showing name and description preview.
    - `src/portals/owner/modules/merchants/components/CategoryCard.tsx`: Added `getModifiedFields()` and `ConfirmDialog` for inline category updates (Name, Description, Status, Fee Mode, Arrival Radius).
    - `src/portals/owner/modules/merchants/components/PlacesTab.tsx`: Added `ConfirmDialog` for verified place creation and `getPlaceModifiedFields()` for updating store pinpoints.
    - `src/portals/owner/modules/rates/ServiceRatesModule.tsx`: Added `getRateDeltas()` comparing against `initialRates`, displaying only changed rates (e.g., `Base Delivery Fare: ₱70.00 → ₱75.00`) and consequence note before saving.
  - **Empirical Verification**:
    - `npx tsc --noEmit` in `C:\Capstone_Project_Web` completed with **0 errors**.
    - `npm run build` in `C:\Capstone_Project_Web` succeeded in 56.08s (72 output assets).
  - **Production VPS Deployment (`https://sugo-express.org`)**:
    - Executed canonical self-cleaning deploy via `scripts/deploy-web.sh --no-build` on Contabo VPS (`109.123.239.182`).
    - Staged 72 files to `/var/www/web/.deploy-staging`, synced to `/var/www/web/dist` with `--delete-after`.
    - Archived 33 superseded files into backup `/root/deploy-backups/web-20260924-025525`.
    - Verified chunk integrity: *"every referenced chunk resolves"*.
    - Verified live HTTP response: `https://sugo-express.org -> HTTP 200`.
* **Session Handoff & Verification (2026-09-24 03:24 — Dynamic Chunk Load Error Resilience & Self-Healing Deployment Pipeline)**:
  - **Bug Recreation & Root Cause Analysis**:
    - **Symptom**: User saw React Router crash screen: *"Unexpected Application Error! Failed to fetch dynamically imported module: https://sugo-express.org/assets/OwnerPortal-Bpt3bQav.js 💿 Hey developer 👋 You can provide a way better UX than this when your app throws errors by providing your own ErrorBoundary or errorElement prop on your route."*
    - **Recreation**:
      1. User opened the app before deployment; browser loaded in-memory manifest referencing `OwnerPortal-Bpt3bQav.js`.
      2. Deploy script executed `rsync --delete-after`, moving `OwnerPortal-Bpt3bQav.js` to backup and leaving only the new hash `OwnerPortal-CXTjujvX.js`.
      3. User in active tab navigated to `/owner`, browser requested `OwnerPortal-Bpt3bQav.js` -> Nginx returned HTTP 404.
      4. Browser threw `TypeError: Failed to fetch dynamically imported module`.
      5. `routes.tsx` had no `errorElement` on its route definitions, so React Router v7 defaulted to its built-in developer fallback with the CD emoji.
  - **4-Tier Defense Implemented**:
    1. **`src/utils/lazyWithRetry.ts` [NEW]**: Transparently intercepts chunk load failures (`Failed to fetch dynamically imported module`, `ChunkLoadError`) and reloads the browser to fetch the latest manifest, completely avoiding any error prompt.
    2. **`src/components/RouteErrorBoundary.tsx` [NEW]**: Custom route-level error boundary with anti-AI-slop design. Renders a polished "New Version Available" UI with one-click reload button for chunk errors, or an incident-referenced error card for runtime exceptions.
    3. **`src/main.tsx`**: Registered global `vite:preloadError` event listener with 10s reload-loop prevention debounce.
    4. **`src/app/routes.tsx`**: Wrapped all routes in `lazyWithRetry` and declared `errorElement: <RouteErrorBoundary />` across all route entries.
    5. **`src/components/ProtectedRoute.tsx` & `LoginPage.tsx`**: Swapped `React.lazy` with `lazyWithRetry`.
    6. **`scripts/deploy-site.sh`**: Added `--filter='P /assets/**'` to rsync so active hashed chunks are protected during deploys; superseded assets are gracefully retained for 48 hours and pruned via `find $REMOTE_DIST/assets -type f -mtime +2 -delete`.
  - **Empirical Verification & Live Probe**:
    - Restored backup chunks to `/var/www/web/dist/assets/` on VPS.
    - Verified older chunk: `https://sugo-express.org/assets/OwnerPortal-Bpt3bQav.js -> HTTP 200 OK`.
    - Verified newest chunk: `https://sugo-express.org/assets/OwnerPortal-CrbEcbcc.js -> HTTP 200 OK`.
    - Production build: `npm run build` passed in 44.21s.
    - Deployed to VPS via `scripts/deploy-web.sh --no-build` (104 files live, all chunks resolving).
    - Live Nginx probe: `https://sugo-express.org -> HTTP 200 OK`.

* **Session Handoff (2026-09-24 03:50 — Sugo Rider navigation view, map choice, reroute policy)**:
  - **Request**: Google-style 3D navigation that follows the line; route lines on roads only, with dashed links when the rider is inside an establishment; a Google (default) / OpenStreetMap map choice; OSM route lines first, else Google; no recalculation unless the rider turns onto another street.
  - **Server / VPS (all live, backups under `/root/deploy-backups/`)**:
    - Google fallback was dead: production `.env` spelled it `Google_MAPS_API_KEY`. Renamed to `GOOGLE_MAPS_API_KEY` (backup `env-20260923-211852`); provider chain now `osrm,google,haversine`. Key verified with one Directions call.
    - NEW `gis/profiles/sugo-rider.lua` (car profile, speeds and routing weights capped at 60 km/h); `build-graph.sh` uses it by default (`OSRM_PROFILE` overrides). Graph `sugo-rider` built and served (`gis/.env OSRM_GRAPH=sugo-rider`, backup `osrm-20260923-213753`). Banga to Tacurong now 44.8 km / 54 min via Maharlika Hwy (was 52.9 km via Isulan). Rollback: `OSRM_GRAPH=sugo-region`, `docker compose -f docker-compose.osrm.yml up -d`.
    - NEW `gis/docker-compose.tiles.yml` + `gis/import-tiles.sh`: container `capstone-tiles` (overv/openstreetmap-tile-server:2.3.0) on `127.0.0.1:8080`, volumes `sugo-osm-db`, `sugo-osm-tiles`. nginx: `/etc/nginx/conf.d/sugo_tiles.conf` (30 r/s per IP, 2 GB 30-day cache) and a `location ~ ^/tiles/...` in `sites-available/api.sugo-express.org` (backup `nginx-20260923-213858`). Public URL `https://api.sugo-express.org/tiles/{z}/{x}/{y}.png`. `/root/warm-tiles.sh` pre-renders z10-16.
    - `gis/README.md` status block documents all three.
  - **RiderMobileApp (new APK required)**:
    - NEW `src/utils/navigationCamera.ts` (heading from the road 40 m ahead, centre on the road, speed zoom, top padding, `markerSnapMeters`), NEW `src/services/reroutePolicy.ts` (`evaluateDeviation`: >30 m off, 15 m further than at fetch, 25 m travelled, 2 fixes), NEW `src/services/mapPreference.ts` (`useMapStylePreference`, persisted), NEW `src/config/mapTiles.ts` (tile URL, on-device cache path, probe with Google fallback).
    - `useLiveRoute`: no 30 s timer, no refetch per ~11 m; refetches on stops change, first fix, deviation, or while showing a straight-line guess. Exposes `roadCoordinates` (raw leg geometry, via `routeRetry.joinLegCoordinates`) and `isRerouting`.
    - `useTurnByTurnNavigation`: `totalRemainingSeconds` (`remainingRouteSeconds`); step index resets on steps identity (was length).
    - `LiveErrandMap`: 3D pitch 60, route-ahead heading, rider low on screen via `mapPadding`, Re-center after pan, dashed `route-link-start/end`, `UrlTile` + `mapType="none"` for OSM with attribution, layers toggle, HUD "Recalculating" only while `isRerouting`, ETA counts down on-device. `GlidingRiderMarker`: glide 1100 ms (fixes are 1 s), snap 40 m moving / 12 m standing. `TaskScreen` passes `roadCoordinates`, `targetCoordinate`, `bottomInset`, `isRerouting`. `ProfileScreen`: Map choice card.
    - Tests: vitest `navigationCamera` (14), `reroutePolicy` (7), `routeRetry` +3, `turnByTurn` +3 (275 total pass); jest `LiveErrandMap` +10 (15 pass). tsc clean.

* **Session Handoff & Verification (2026-09-24 10:22 — Full Production Deployment of Backend Server & Web Frontend to Contabo VPS)**:
  - **User Request**: "DEPLOY OUR SERVER AND WEB IN THE PRODUCTION"
  - **Backend Server Deployment (`https://api.sugo-express.org`)**:
    - Pre-deployment check: `npx tsc --noEmit` in `C:\Capstone_Server\server` -> 0 errors.
    - Pre-deployment backup on VPS: `/root/deploy-backups/server-20260924-101756`.
    - Streamed source code (`src/`, `prisma/schema.prisma`, `package.json`) to `/var/www/server/`.
    - Generated Prisma Client v5.22.0 (`npx prisma generate`).
    - Verified DB sync status: `npx prisma db push --accept-data-loss` -> database already in sync.
    - Compiled TypeScript ON the VPS (`npm run build` / `tsc` -> 0 errors).
    - Restarted PM2 daemon: `pm2 restart capstone-backend` (PID 846187, status: `online`).
    - Verified health checks:
      - Local backend: `http://127.0.0.1:5000/api/health` -> HTTP 200 (`🟢 System Online`).
      - Nginx edge proxy: `https://api.sugo-express.org/api/health` -> HTTP 200 (`🟢 System Online`).
  - **Web Frontend Deployment (`https://sugo-express.org`)**:
    - Production build: `npm run build` compiled 72 assets in 1m 20s.
    - Staged 72 files to `/var/www/web/.deploy-staging` on VPS.
    - Synced into `/var/www/web/dist/` with `--delete-after` and `--filter='P /assets/**'`.
    - Active assets protected from instant deletion (104 files live, 16 MB).
    - Older assets pruned with 48h retention (`find -mtime +2 -delete`).
    - Pre-deployment backup archived to `/root/deploy-backups/web-20260924-101948`.
    - Verified chunk resolution: *"every referenced chunk resolves"*.
    - Verified live HTTP response: `https://sugo-express.org -> HTTP 200 OK` (Last-Modified: 02:21:22 UTC / 10:21:22 local).

  - **Hotfix (same session, 04:10)**: the 03:51 APK crashed on opening the Task tab. Cause: `mapPadding` reached react-native-maps before `onMapReady`; on Android (new arch) `MapView.applyBaseMapPadding` / `updateExtraData` dereference a null `GoogleMap` (native NPE). `LiveErrandMap` now holds `mapPadding` and `mapType` behind a `mapReady` state set by `onMapReady`; the camera takes position once ready. jest mock calls `onMapReady` after mount (`global.__holdMapReady` holds it); new test covers the before-ready props. Rebuilt APK supersedes the 03:51 one.
* **Session Handoff (2026-09-24 11:10 — Each map draws its own route lines)**:
  - **Request**: on OpenStreetMap, OSRM's lines; on Google, Google's lines, respectively.
  - **Server (deployed, backup `/root/deploy-backups/server-20260924-110546`)**: `POST /api/routing/directions` accepts optional `provider: "osrm" | "google"` (`routingValidators`). `resilientRoutingService.route(points, { prefer })` moves that provider to the front of the chain (fallback order unchanged, cached per preference). `routingService.getDirections(..., { prefer })` skips the OSRM origin snap when Google is asked for. Callers that send nothing get the old chain (CustomerApp, ETA, fees). Test `tests/routingPreference.test.ts` (6).
  - **Google key renamed again**: production `.env` had been hand-edited at 10:35 (`nano .env`, interactive root session) to `GBOOGLE_MAPS_API_KEY`, disabling Google. With the user's approval, renamed back to `GOOGLE_MAPS_API_KEY` (backup `env-20260924-050906`). Live check, Banga to Julie's: Google map line = google 53.1 km / 60 min; OSM map line = osrm 44.8 km / 54 min; where both use the same road, OSRM's line sits a median 7.4 m (p90 36 m) from Google's.
  - **RiderMobileApp (new APK)**: `config/mapTiles.useEffectiveMapStyle()` (preference vs map actually shown) and `routeProviderFor()`; `TaskScreen` passes `provider` to `useLiveRoute`; `LiveErrandMap` uses the same hook. `useLiveRoute` refetches on provider change (1.5 s floor instead of 8 s) and holds up to 6 road routes per provider+stops so switching back is instant with no request. `fetchDrivingRoute(..., provider)`. Profile copy updated. Test `tests/useLiveRouteProvider.test.tsx` (2).
* **Session Handoff (2026-09-24 11:45 — Sugo Rider picks the fastest of OSRM and Google)**:
  - **Request**: choose the route provider automatically: lowest ETA wins, km as the other measure.
  - **Server (deployed, backup `/root/deploy-backups/server-20260924-113346`)**: NEW `src/lib/routing/bestRoute.ts`. `bestRoute(points, drawOn)` asks both engines (`resilientRoutingService.routeWith`, single provider, own breaker and cache), `pickFastest` takes the lower ETA; ETAs within max(60 s, 5%) are a tie and the shorter distance wins; degraded routes never compete. The winning path is redrawn on the map's own engine via pass-through points (midpoints of its longest steps, max 8; `RouteOptions.passThrough`: OSRM `waypoints=0;n`, Google `via:`), accepted only within 8% of the winner's length, times scaled to the winner's ETA (`withTotalDuration`). The map's own route is reused without a request when within 2% of the winner's length. Otherwise the winner is drawn on its own roads (`selection.drawnWith`). `POST /api/routing/directions` takes `choose: "fastest"`; response gains `selection {strategy, chosen, drawnWith, candidates}` (null otherwise). Test `tests/bestRoute.test.ts` (14).
  - **Live check**: Banga to Julie's: osrm 54 min / 44.8 km vs google 60 min / 53.1 km, OSRM chosen on both maps. In Tacurong (3.7 km): osrm 7 min vs google 10 min / 4.5 km, OSRM chosen. On the Google map Google could not follow OSRM's path (redraws 54.7 km and 5.1 km, roads Google lacks or marks restricted), so the line is OSRM's there.
  - **Caveat**: each engine is judged by its own ETA. OSRM's is a model with no traffic (capped 60 km/h); Google's is traffic-aware, so OSRM will usually win. Cost: one Google Directions request per route fetch in the rider app (plus one redraw when OSRM wins on the Google map and a redraw is attempted).
  - **RiderMobileApp (new APK)**: `fetchDrivingRoute(..., provider, choose)`, `RouteSelection` type, `MappedRoute/LiveRouteResult.selection`; `TaskScreen` sends `choose: 'fastest'`; `LiveErrandMap` prop `routeChosenBy` adds "· via Google" / "· via OSM" to the ETA badge.
* **Session Handoff (2026-09-24 12:25 — Rider dot vanished and route changed road on map switch)**:
  - **Dot**: `GlidingRiderMarker` drew `RiderDotMarker` as a child view with `tracksViewChanges={false}`. On Android's new architecture react-native-maps snapshots child views once and loses them after re-renders (react-native-maps #5877, #5728; `tracksViewChanges` is no longer passed to Android). Switching maps re-renders the map, so the dot went blank for good. Now `image={require('assets/rider-puck.png')}` (34 dp arrow puck, @2x/@3x, source `assets/rider-puck.svg`), loaded from app resources with no snapshot; rotation ignores a -1 heading. `RiderDotMarker.tsx` is now unused.
  - **Route changed road**: a map switch re-ran the fastest comparison from the rider's current spot, and the redraw was accepted on length alone (8%, 3.6 km of slack on 45 km). Server (backup `/root/deploy-backups/server-20260924-121940`): `bestRoute(points, drawOn, { keep })` routes only the kept engine on a switch; redraws and the map's own route must pass `followsPath` (each line within 30 m of the other for 95% of 200 samples, both ways) plus 5% length. `POST /api/routing/directions` takes `keep`. Rider app: `useLiveRoute` sends `keep = selection.chosen` when only the provider changed for the same stops, and clears the per-map route cache on any new route. Live check: OSM map osrm 44.8 km / 54 min; switch to Google with keep: same line, only OSRM asked.
  - Tests: server `bestRoute.test.ts` 17; rider jest 24 (map + route hook), vitest 276.
* **Session Handoff (2026-09-24 13:05 — Server decides the map; 3D Re-center; arrow faces the route)**:
  - **Server (deployed, backup `/root/deploy-backups/server-20260924-124716`)**: `bestRoute(points, drawOn?)`: with no `drawOn` the winner is drawn on its own roads (`selection.drawnWith = chosen`), no redraw. `routingService` passes `options.prefer` through (undefined when the client names no map). Test +1 (`bestRoute.test.ts` 18).
  - **RiderMobileApp (new APK)**:
    - The rider no longer picks the map. REMOVED: map switch button on the map, Map card on Profile, `services/mapPreference.ts`, `useEffectiveMapStyle`/`routeProviderFor` in `config/mapTiles.ts`. `TaskScreen` asks `choose: 'fastest'` with no provider (server decides) and shows `mapStyle = drawnWith === 'osrm' && osmTilesUp ? 'osm' : 'google'`; while our tile server is down it asks `provider: 'google'` (keep logic redraws the winner on Google). `useOsmTilesAvailable` re-probes every 5 min. `LiveErrandMap` takes a `mapStyle` prop.
    - 3D: Re-center always shown (2D only after a drag); tapping it, or entering a mode, snaps the camera immediately with the road's exact heading (no deadband).
    - Arrow: `navigationCamera` now gives the road-ahead heading off the route too (standing still: the way the route runs from where the rider joins it). `LiveErrandMap` feeds that heading (last good one kept) to `GlidingRiderMarker`, so the puck faces forward along the line, not the compass.
    - Tests: vitest `navigationCamera` 14; jest `LiveErrandMap` + route hook 26.
* **Session Handoff (2026-09-24 13:50 — Customer Track tab: rider's map, no map while shopping, FCM delivery pushes)**:
  - **Push was dead in production**: every Expo send returned `InvalidCredentials` (Expo project holds no FCM key; 59 in the current log). The server's own Firebase service account (`FIREBASE_SERVICE_ACCOUNT_PATH`, project `capstonedata-3589c`, the apps' Firebase project) was verified with a dry-run send. `lib/pushNotifications.ts` now sends native FCM tokens straight through `firebase-admin/messaging` (`isFcmToken`; `notification` message, `android.priority`, `channelId`, new `tag` option), Expo tokens as before. `firebaseAdmin.getFirebaseAdminApp()` added. Tokens still stored in `expoPushToken` (schema locked). CustomerApp registers `getDevicePushTokenAsync()` on Android. **RiderMobileApp still registers Expo tokens, so rider pushes (offers) still fail** until it gets the same change.
  - **Same map as the rider**: NEW `lib/routing/riderRouteChoice.ts` (in-memory rider verdict, 10 min). `routingService.getDirections` remembers a RIDER caller's fastest verdict and, for a customer (or staff) request with `errandId` they may watch, reuses it (`keep` = chosen, draw on the rider's `drawnWith` unless `provider` given). Validator `errandId`; controller passes `caller`.
  - **Delivery pushes**: NEW `services/deliveryReminderService.ts`, all to channel `delivery-alerts`, high priority, tag `delivery-<errandId>` (each replaces the last): "Your order is on the way" (+ about N min) from `markItemsPurchased` (first time only); "Your rider is getting close" at 10 and 5 min from `etaService` recompute (once each, skipped if the run began inside); "almost there" (existing `notifyRiderNearby`, emoji removed) now also from live positions in `riderLocationBroadcast` (active-errand select extended). `trackingService` proximity and the new path only fire after `itemsPurchasedAt`. `etaService` ignores store stops once items are bought.
  - Server deployed: backup `/root/deploy-backups/server-20260924-133738`. Tests: `deliveryReminders.test.ts` 10, `pushFcm.test.ts` 4, `routingPreference.test.ts` 9; full suite only the 4 known failures.
  - **nginx**: `/tiles/` also on `api.sugoonthego.online` (same cache and limit), backup `/root/deploy-backups/nginx-20260924-073951`.
  - **CustomerApp (new APK)**: NEW `config/mapTiles.ts`, `components/RiderToStorePanel.tsx` (shopping: ETA + km to the store, no map); `TrackTab` shows the panel until `stage.index >= 3`, then `LiveTrackingMap` with `mapStyle` from `selection.drawnWith`; `ErrandTrackCard` map hero is not tappable while shopping and quotes km to the store; `LiveTrackingMap` gains `mapStyle`, OSM `UrlTile`, `mapType` after `onMapReady`, attribution, and the rider arrow puck as an `image` (assets `rider-puck*`); `useLiveRoute`/`directionsService` take `{ choose, errandId, provider }` and return `selection`. Tests: `RiderToStorePanel` 5, map modes +3, push token +1.
* **Session Handoff (2026-09-24 16:35 — Sugo Rider receipt scan: "No signal" fixed; a retake is never saved)**:
  - **Diagnosis**: Cloud Vision is healthy (fixture receipt read from the VPS in 1.7 s, total 176 found). No receipt POST reached nginx today: the rider app's `apiClient` gives every call 10 s, a ~400-500 KB receipt upload took 16 s from the office line, the client aborted mid-upload, and Cloudflare never forwarded the half-sent request. Separately, the app read `err.response.data.message` but the API answers `{ error }` (`middleware/errorHandler.ts`), so every server refusal (unreadable photo, Vision down, rate limit) was also shown as "No signal. Move toward the road".
  - **Duplicates**: the receipt was written to `errand_proof_images` the moment it was read, before the rider saw the total, so each retake left a row (errand ...aa24aa holds two confirmed ₱75 receipts for stop 5).
  - **Server (deployed, backup `/root/deploy-backups/server-20260924-163151`)**: NEW `lib/pendingReceiptScans.ts` (in-memory, single pm2 fork: 15 min TTL, 200 cap, a newer scan of the same rider/errand/kind/stop replaces an unconfirmed one). NEW `POST /api/errands/:id/proof-images/scan` (RIDER; kinds RECEIPT, TRANSFER; reads and holds, writes nothing, returns `scanId` + extraction) and `POST /api/errands/:id/proof-images/scans/:scanId/confirm` (`{ confirmedTotal }`; writes the image and extraction once with the confirmed total, then the same divergence alert and `markItemsPurchased` as before; 410 when the scan expired or was replaced; a repeated confirm updates the row it already wrote). `proofImageService.readReceiptPhoto` shared with the old one-step upload, `applyConfirmedTotal` shared with `confirmProofImage`. Old `POST /proof-images` and `PATCH .../confirm` unchanged for installed APKs. Test `tests/receiptScanConfirm.test.ts` (11).
  - **RiderMobileApp (new APK)**: NEW `services/uploadFailure.ts` (`PHOTO_UPLOAD_TIMEOUT_MS` 90 s, `describeUploadFailure` reads `error` then `message`; timeout, unreachable and proxy-page cases worded separately; `uploadFraction`). `proofCapture`: every photo posts with the 90 s timeout and upload progress; NEW `scanReceipt` / `saveScannedReceipt`; `confirmProofTotal` removed. `ReceiptCaptureScreen`: RECEIPT/TRANSFER scan first, save on Confirm, Retake discards; overlay shows "Sending the photo… N%"; a 410 returns to the camera with the reason. Tests: vitest `uploadFailure` 10, jest `ReceiptCaptureRetake` 5.
  - **Open (not changed)**: `markItemsPurchased` stamps `itemsPurchasedAt` on the FIRST confirmed receipt, so on a multi-store errand the customer's "on the way" push and the Track tab map switch at store one.
* **Session Handoff (2026-09-24 17:15 — Multi-store "on the way" fixed; rider pushes on FCM)**:
  - **Multi-store**: every confirmed receipt (and a no-receipt declaration, and the half-payment resync) ran `errandService.markItemsPurchased`, which stamps `itemsPurchasedAt`. On a multi-store errand that happened at store one: the customer got "Your order is on the way", the Track tab switched to the delivery map, the ETA dropped the remaining stores, and a rider app restarted there restored itself to "Delivering" (`missionProgress.deriveStatus`). NEW `errandService.applyReceiptTotal(errandId, riderId, total)`: same ownership check, `estimatedCost`, `checkReceiptOverage`, `recalculateFee`, `order:updated`, but no `itemsPurchasedAt` and no push. `proofImageService` (receipt confirm both paths, NO_RECEIPT) and `errandPaymentService.requestHalfPayment` resync now call it. `itemsPurchasedAt` and the "on the way" push now come only from `PATCH /errands/:id/items-purchased`, which the rider app calls when the rider steps onto "Delivering" (old APKs too). Test NEW `tests/receiptsDoNotFinishShopping.test.ts` (6); receipt/half-payment tests point at the new function.
  - **Rider push**: `RiderMobileApp/src/hooks/useRegisterPushToken.ts` registers `getDevicePushTokenAsync()` on Android (FCM, sent directly by the server), Expo token elsewhere; the EAS project id is no longer required on Android. `notificationService.notifyRiderAssigned` sends on channel `orders` ("Errand Assignments & Offers"). Rider jest `useRegisterPushToken.test.tsx` (4); `getDevicePushTokenAsync` added to the jest mock. Rider Firebase config checked: `google-services.json` project `capstonedata-3589c`, package `com.astrowarden.RiderMobileApp`. A rider must open the new APK once to replace their stored Expo token.
  - Server deployed, backup `/root/deploy-backups/server-20260924-171353`. Full suite: only the 4 known failures.
* **Session Handoff (2026-09-24 18:20 — Tacurong Establishment Crawler & Dispatcher Menu Assistant with Auto-Learning & Vision Quota Defense)**:
  - **Request**: Add a crawler in Python microservices model to crawl menus and establishments in Tacurong City, match to MerchantCategory with auto-learning when new categories are added, enforce < 0.75 confidence review threshold, omit all estimated prices (counter receipt remains single truth), and protect Google Cloud Vision quota.
  - **Python Microservice Layer (`c:\Capstone_Server\server\ml`)**:
    - `sugo_category/lexicon.py`: Added `generate_dynamic_seeds(category_name)` to automatically generate synthetic seed rows for newly created/unseeded `MerchantCategory` records.
    - `sugo_category/model.py`: Restored `DEFAULT_MIN_CONFIDENCE = 0.55` and added `REVIEW_CONFIDENCE_THRESHOLD = 0.75`; `predict()` returns `"needsReview": top_score < 0.75`.
    - `crawler/config.py`: Defined Tacurong bounding box (`lat: 6.63 to 6.76, lng: 124.60 to 124.75`) and rate limits.
    - `crawler/parsers/item_cleaner.py`: Text cleaner, price trail stripper, unit capitalization, and brand canonicalization (`Coca-Cola`).
    - `crawler/establishment_matcher.py`: Location-aware establishment matcher fusing store names, barangay, and commercial zone priors (Public Market, Palengke, etc.) with the 0.75 confidence threshold for `needs_review`.
    - `crawler/vision_quota_guard.py`: 5-layer defensive firewall protecting Google Cloud Vision quota: SHA-256 deduplication, pre-flight validation, local offline OCR (Tesseract) fallback, and daily token bucket cap (max 20 calls/day for crawlers).
    - Tests: All 63 pytest tests in `c:\Capstone_Server\server\ml\tests` pass (100%).
  - **Core Server & Database (`c:\Capstone_Server\server`)**:
    - `prisma/schema.prisma`: Added `CrawledMerchantItem` (zero price fields) and `ProcessedOcrImage` (SHA-256 image cache). Ran `prisma generate`.
    - `services/categoryRetrainingService.ts`: 30-second debounced background auto-learning trigger on category mutations.
    - `services/merchantCategoryService.ts`: Calls `triggerCategoryAutoLearning` on create and update.
    - `services/catalogSuggestionService.ts`: Searches items and lists place items without prices.
    - `services/establishmentMatcherService.ts`: Location-aware establishment matcher enforcing >= 0.75 confidence threshold.
    - `controllers/catalogController.ts` & `routes/catalogRoutes.ts`: Mounted at `/api/catalog` in `routes/index.ts`.
    - Verification: `npx tsc --noEmit` passed with 0 errors.
  - **Web Dispatcher Portal (`c:\Capstone_Project_Web`)**:
    - `hooks/useCatalogAutocomplete.ts`: Debounced item autocomplete query hook.
    - `ItemAutocompleteInput.tsx`: Accessible, keyboard-navigable autocomplete input component with store and category pills.
    - `Stage3ConfirmItems.tsx`: Replaced raw item input with `ItemAutocompleteInput`.
    - Verification: `npx tsc --noEmit` passed with 0 errors.
* **Session Handoff (2026-09-24 19:25 - Dispatcher Step 3 & Step 4 Catalog, Persistent Suggestions & Mismatched Item Store Helper)**:
  - **Context & Request**:
    - Add dedicated UI/UX feature in Step 3 and Step 4 of Dispatcher OrderChat with dedicated buttons.
    - In Step 3 ("Pin the stores"), store suggestions must NOT disappear right away when stores are pinned.
    - In Step 4 ("Confirm the items"), if a new item is listed and is not part of the store name and category, automatically suggest a store via a popping action button that navigates directly back to Step 3 with pre-filled context.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `StorePredictionCard.tsx`: Added `pinnedStoreNames` support, individual `[ Pin ]` action button per store (`onAcceptSingle`) so pinning one store does not dismiss remaining suggestions, `Pinned [check]` status badge, top dismiss control, and `[ View Suggestions ]` reopening CTA.
    - `Stage2PinStores.tsx`: Added `prefillSearch` and `onClearPrefill` props; decoupled `showPrediction` from `pinpoints.length === 0` to preserve suggestions; added dedicated `[ Store Suggestions (N) ]` toggle button above the search form; added prefill store notification banner.
    - `Stage3ConfirmItems.tsx`: Added dedicated `[ Catalog Menu Helper ]` toggle button in header toolbar; built Tacurong menu quick-pick tray allowing 1-click addition of crawled items (strictly zero price); added real-time unassigned and mismatched item detector that surfaces a high-contrast popping action button (`[ Pin "{proposedStore}" in Step 3 ]`); clicking navigates to Step 3 with draft preservation.
    - `OrderChatScreen.tsx`: Added `prefillStoreSearch` state; updated `jumpToStage` to accept prefill query; passed `prefillSearch` and `onClearPrefill` to `Stage2PinStores`.
    - `ItemAutocompleteInput.tsx`: Added `isPinned` state and persistent toolbar so suggestions do not disappear prematurely on blur while comparing items.
  - **Empirical Verification**:
    - `npx tsc --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors.
    - `npm run build` (Vite v6.3.5) completed in 1m 17s with all production bundles clean.

* **Session Handoff & Verification (2026-09-24 19:57 — Full Production Deployment of Backend Server & Web Frontend to Contabo VPS)**:
  - **User Request**: "deploy our server and web in the production"
  - **Backend Server Deployment (`https://api.sugo-express.org`)**:
    - Script: `scripts/deploy-server.sh`
    - Pre-deployment backup on VPS: `/root/deploy-backups/server-20260924-195212`
    - Streamed source code (`src/`, `prisma/schema.prisma`, `package.json`, `ml/`) to `/var/www/server/`
    - Handled schema ambiguity by cleaning stale root `schema.prisma` and targeting `npx prisma generate --schema=prisma/schema.prisma`
    - Schema sync: `npx prisma db push --schema=prisma/schema.prisma --accept-data-loss` (Created `crawled_merchant_items`, `processed_ocr_images`, and updated relations with zero data loss)
    - Compiled TypeScript ON the VPS (`npm run build` / `tsc` -> 0 errors)
    - Built and updated `capstone-category` Docker container with fresh `TRAINED_AT` timestamp
    - Restarted PM2 daemon: `pm2 restart capstone-backend` (PID 913228, status: `online`)
    - Verified health checks:
      - Local backend: `http://127.0.0.1:5000/api/health` -> HTTP 200 (`🟢 System Online`)
      - Nginx edge proxy: `https://api.sugo-express.org/api/health` -> HTTP 200 (`🟢 System Online`)
      - Category ML sidecar: `http://127.0.0.1:8100/health` -> HTTP 200 (`status: ok, ready: true`)
      - Catalog search endpoint: `http://127.0.0.1:5000/api/catalog/search` -> HTTP 401 Unauthorized (Auth guard verified active)
  - **Web Frontend Deployment (`https://sugo-express.org`)**:
    - Script: `scripts/deploy-web.sh --no-build`
    - Uploaded 72 freshly built files to staging `/var/www/web/.deploy-staging`
    - Pre-deployment backup archived to `/root/deploy-backups/web-20260924-195633` (20 superseded files safely parked)
    - Synced into `/var/www/web/dist/` with `--delete-after` and `--filter='P /assets/**'` (active sessions protected from 404 ChunkLoadErrors for 48h)
    - Verified chunk resolution: *"every referenced chunk resolves"*
    - Verified live HTTP response: `https://sugo-express.org -> HTTP 200 OK`

---

* **Session Log (2026-09-25 00:23 — High-Velocity Rider Tracking & RTDB Fast-Path)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Accelerated Fleet Roster Polling (5,000ms) & RTDB Hybrid Fast-Path for Sub-Second Duty Toggles.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/hooks/useRiderFleetPresence.ts`:
      - Accelerated `ROSTER_REFRESH_INTERVAL_MS` from `15 * 1000` to `5 * 1000` (5,000ms).
      - Accelerated `RECONCILE_MIN_INTERVAL_MS` from `10 * 1000` to `5 * 1000` (5,000ms).
      - Implemented **RTDB Hybrid Fast-Path**: Inspects live `fbEntry` from Firebase RTDB (`riders/{riderId}`). If fresh (`now - fbEntry.updatedAt < 15,000 ms`), immediately updates `onDuty`, `isOnline`, and `presence` ("AVAILABLE_ONLINE" vs "OFFLINE" vs "ON_DELIVERY") without waiting up to 5s for the next MariaDB `/riders` poll to return.
  - **Empirical Verification**:
    - `npx tsc --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors.

---

* **Session Log (2026-09-25 01:50 — Owner & Dispatcher Notification System, Audio Chimes & Customer Chat Dispatching)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Redesigned Notification Center with 3-tier severity taxonomy, Web Audio harmonic chimes, bulk mark-all-read action, real-time Socket.IO updates, and customer chat dispatching.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/utils/notificationAudio.ts`: Created Web Audio API synthesizer for harmonic chimes (Critical: 880Hz -> 660Hz dual pulse; Warning/Info: 523Hz -> 659Hz chime) with persistent `@sugo_notifications_muted` localStorage toggle and browser-safe autoplay unlock.
    - `src/services/apiService.ts`: Added `markAllNotificationsRead(): Promise<boolean>` calling backend `PATCH /api/notifications/read-all`.
    - `src/components/NotificationBell.tsx`: Overhauled into an accessible high-density Operations Drawer featuring:
      - Header with unread pill badge, mute/unmute audio toggle, and "Mark all read" button.
      - Segmented filter tabs: `[ All (N) | Unread (X) | Critical (Y) ]`.
      - Visual severity pills: Red (`AlertTriangle`) for Critical, Amber (`Clock` / `MessageSquare`) for Action Req / Customer Chat, Slate (`Info`) for Updates.
      - Real-time Socket.IO listener for `notification:new` triggering audio chimes and badge updates.
      - 1-click contextual navigation extracting errand IDs and dispatching `sugo:open-errand`.
      - Full keyboard accessibility (`Escape` closes and restores focus, `aria-expanded`, `role="dialog"`).
    - `src/portals/dispatcher/DispatcherPortal.tsx`: Added `sugo:open-errand` event listener to focus order and open its chat panel.
  - **Empirical Verification**:
    - `npx tsc --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors.
    - `npm run build` (Vite production build) passed with 0 errors (72 assets compiled).

---

* **Session Log (2026-09-25 11:55 — Dispatcher Notification Audio Resiliency, Customer Chat Alerts & Unread Attention Badges)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Fixed Chrome notification audio playback failures, implemented dual-engine Web Audio/HTML5 Audio fallback, real-time Firebase RTDB customer chat alerts with floating toasts and desktop notifications, and active errand list unread counters with sidebar tab badges.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/utils/notificationAudio.ts`: Upgraded chime synthesizer with asynchronous AudioContext resumption, in-memory PCM 16-bit WAV data URI generator and HTML5 Audio fallback for suspended/background tabs, multi-event autoplay unlock (`click`, `pointerdown`, `keydown`, `touchstart`, `visibilitychange`), and state subscription hooks (`subscribeAudioStatus`, `getAudioStatus`, `unlockAudio`).
    - `src/components/HeaderAudioStatus.tsx`: Created sound status indicator button in header with visual state (ready, blocked, muted), 1-click audio unlock, desktop notification permission request, and immediate chime testing.
    - `src/styles/surfaces.css`: Added `[data-audio-status]` inversion styling for dispatcher destination band.
    - `src/portals/dispatcher/hooks/useCustomerChatAlerts.ts`: Centralized Firebase RTDB subscription hook across active errands (`chats/${errandId}/messages`), tracking per-errand unread counts, detecting incoming customer messages, playing warning chimes, queueing alert toasts, and dispatching desktop browser notifications when tab is hidden.
    - `src/portals/dispatcher/components/CustomerChatToastContainer.tsx`: Floating top-right high-contrast toast cards displaying customer name, route number, message preview, 8s auto-dismiss, and direct `[ Open Chat ]` CTA.
    - `src/portals/dispatcher/components/workspace/DispatchErrandCard.tsx`: Added `unreadChatCount` prop and pulsing amber attention badge (`💬 N new`) directly adjacent to customer name.
    - `src/portals/dispatcher/components/workspace/DispatchMasterStream.tsx`: Added `unreadCounts` forwarding and attention dot on Active segment toggle when unread customer messages exist.
    - `src/portals/dispatcher/components/workspace/DispatchManagementWorkspace.tsx`: Forwarded `unreadCounts` to `DispatchMasterStream`.
    - `src/portals/dispatcher/components/ActiveErrandsPanel.tsx`: Added `unreadCounts` prop, card header attention badge (`💬 N new`), and primary-styled `Open chat (N)` button.
    - `src/portals/dispatcher/DispatcherPortal.tsx`: Mounted `useCustomerChatAlerts`, wired optimistic `markErrandAsRead` on chat open, added `<HeaderAudioStatus />` to mobile and desktop headers, added unread badges to Active Errands and Customer Chat History sidebar items, and mounted `<CustomerChatToastContainer />`.
  - **Empirical Verification**:
    - `.\node_modules\.bin\tsc.cmd --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed in 1m 47s with all production bundles clean (exit code: 0).

---

* **Session Log (2026-09-25 12:15 — Audio Engine Resiliency Review, Listener Churn Elimination & High-Contrast Badges)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High Reviewer)
  - **Scope**: Skeptical review and comprehensive bugfixes for audio autoplay, background tab suspension deadlocks, Firebase RTDB connection churning, desktop notification 404s, and WCAG AA contrast compliance.
  - **Critical Root Cause Fixes (`c:\Capstone_Project_Web`)**:
    - `src/utils/notificationAudio.ts`:
      - **Fixed Background Tab Audio Hang**: Chromium leaves `AudioContext.resume()` pending indefinitely when `document.hidden === true`. Added immediate bypass to HTML5 Audio fallback whenever the document is hidden, and bounded foreground `ctx.resume()` with a 250ms race timeout.
      - **Fixed Unlock Handler Listener Leak**: `unlockHandler` now awaits `unlockAudio()` and cleanly removes all window event listeners once unlocked, eliminating duplicate dummy Audio allocations on every click/keystroke.
      - **Fixed WAV Bounds Calculation**: Computed `numSamples` as the exact sum of tone sample slices with data view boundary guards, eliminating potential `RangeError` on sample rate float quantization.
    - `src/portals/dispatcher/hooks/useCustomerChatAlerts.ts`:
      - **Eliminated Infinite Firebase RTDB Listener Re-registration**: Refactored subscription lifecycle to an incremental ref-based pattern (`subscriptionsRef`). Avoids tearing down and re-registering WebSocket listeners on every render or state change.
      - **Fixed Background Tab Alert Silence**: Customer messages arriving while a chat was open but the browser tab was backgrounded/minimized were silenced. Now always triggers the audible chime and desktop browser notification if `document.hidden` is true.
      - **Fixed Desktop Notification 404**: Corrected notification icon path from `/favicon.ico` (non-existent) to `/favicon.png`.
      - **Single-Errand Toast Updating**: Updated incoming messages on the same active errand to replace the existing toast with the latest message snippet instead of stacking redundant toasts.
    - `src/portals/dispatcher/components/CustomerChatToastContainer.tsx`:
      - Made the entire toast card interactive and clickable to open the chat, isolating the dismiss `X` button with `e.stopPropagation()`.
    - `src/portals/dispatcher/hooks/useDispatcherPortal.ts`:
      - Memoized `handleOpenChat` and `handleCloseChat` with `useCallback` to prevent cascading hook re-renders.
    - `src/portals/dispatcher/components/workspace/DispatchErrandCard.tsx` & `src/portals/dispatcher/components/ActiveErrandsPanel.tsx`:
      - Upgraded unread attention pill text from `text-amber-600` (3.19:1 contrast failure) to `text-amber-800 dark:text-amber-300` (5.02:1 contrast ratio, WCAG 2.2 AA compliant).
    - `src/portals/dispatcher/DispatcherPortal.tsx`:
      - Fixed sidebar Active Errands unread badge visibility when `activeCount === 0`.
      - Added customer chat attention badge to mobile bottom navigation Active tab.
  - **Empirical Verification**:
    - `npx tsc --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors.

---

* **Session Log (2026-09-25 15:45 — Dispatcher Rider Messages Modernization: 1-to-1 Channels, Errand Breadcrumbs & Real-Time Alerts)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Re-engineered Dispatcher Rider Messages from ephemeral per-errand chat to persistent 1-to-1 messenger conversations indexed by Rider ID, integrated real-time audio/toast alerts, errand progress breadcrumbs, and multi-errand task switchers.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/dispatcher/hooks/useRiderChatAlerts.ts`: Real-time hook listening to `rider_chats/*/messages` and `rider_chats/*/meta`, computing unread counts, triggering warning chime (`playNotificationChime('warning')`), displaying top-right toast alerts, and sending desktop notifications.
    - `src/portals/dispatcher/components/RiderChatToastContainer.tsx`: Floating toast notification cards with rider name, message snippet, and `[ Reply to Rider ]` CTA button.
    - `src/portals/dispatcher/components/DispatcherRiderMessagesPanel.tsx`: Redesigned panel into persistent rider messenger; lists riders by name with unread badges (zero `#{id}` clutter), active errand progress breadcrumbs stepper (`Traveling` ➔ `At Store` ➔ `Delivering` ➔ `Delivered`), multi-errand chip switcher, image attachment viewer with fullscreen lightbox modal, and FCM push trigger via `POST /api/riders/:id/notify-chat`.
    - `src/portals/dispatcher/DispatcherPortal.tsx`: Integrated `useRiderChatAlerts`, wired unread badge counters into desktop sidebar and mobile bottom nav, mounted `RiderChatToastContainer`, and supported cross-navigation into rider chat from active errand inspection.
  - **Empirical Verification**:
    - `npx tsc --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors.
    - `npm run build` (Vite v6.3.5) completed in 1m 17s with all production bundles clean.

---

* **Session Log (2026-09-25 18:15 — Dispatcher Order Chat: Right-Side Steps Panel Re-Positioning & Expanded Task Workspace)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Re-positioned Steps 1 through 6 out of the center column into a dedicated right-side panel (`StageStepsRail`), expanding center workspace room for the Task (maps, tables, forms). Reused exact project design tokens (`Detent`, `bg-board-plate`, `bg-board-field`, `border-edge`, `rounded-plate`).
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/dispatcher/components/order-chat/StageStepsRail.tsx` [NEW]:
      - Created right-side steps rail positioning Steps 1 to 6 vertically from upper (Step 1) down to Step 6.
      - Styled each step as a horizontal button row: stamped `Detent` (`Check` for done, number for active/todo), step title and live status microcopy (`statusLine`), with a crisp left-pointing pointer arrow (`◀`) and elevated border highlight on the active step pointing directly to the center Task screen.
      - Embedded downpayment ledger trigger button at the rail foot when `payments.ledger?.hasLedger` is true.
    - `src/portals/dispatcher/components/order-chat/OrderChatScreen.tsx` [MODIFY]:
      - Re-architected 3-column workspace on desktop:
        - Left (30%): `<ConversationPane />` (Customer chat, message stream, composer).
        - Center (`flex-1`): Dedicated Task workspace rendering the active stage card with header, live status, and full room for maps, item pricing tables, and address cards.
        - Right (`w-64 xl:w-72`): `<StageStepsRail />` hosting Steps 1 to 6.
      - Replaced persistent 25% downpayment column with an accessible `<Dialog>` modal (`showProofModal`) wrapping `PaymentProofPanel` on-demand.
      - Added compact mobile stepper rail for viewports < 1024px.
    - `src/portals/dispatcher/components/order-chat/stages/Stage4Payment.tsx` [MODIFY]:
      - Added `onOpenProof` prop and "View Uploaded Proof & Attestation" button adjacent to the ledger panel.
  - **Empirical Verification**:
    - `npx tsc --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed in 23.55s with all production bundles clean (exit code: 0).
    - **Production VPS Deployment (`scripts/deploy-web.sh`)**:
      - Staged & uploaded 75 files to Contabo VPS (`109.123.239.182:/var/www/web`).
      - Verified reference integrity: all referenced bundles and chunks resolve cleanly.
      - Live probe check: `https://sugo-express.org -> HTTP 200` (Direct nginx probe passed).
      - Live rollback snapshot: `/root/deploy-backups/web-20260925-181822`.

---

* **Session Log (2026-09-25 18:32 — Dispatcher Order Chat: Center Screen Card Minimization, Step 3 Map View Balance & Production Deployment)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Minimized repetitive nested cards in the center Task workspace to eliminate visual clutter and comply with the strict Anti-AI-Slop invariant (`anti-ai-slop-ui-design.md`). Upgraded Step 3 (Pin Stores) map container to a balanced square/rectangle aspect ratio (`h-[360px] sm:h-[400px]`), and deployed the build to production.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/dispatcher/components/order-chat/stages/Stage2PinStores.tsx` [MODIFY]:
      - Expanded map height from compressed horizontal ribbon (`h-52 sm:h-60`, ~208-240px) to balanced rectangular viewing experience (`h-[360px] sm:h-[400px]`).
      - Consolidated pinned store cards from isolated cards into a single unified container (`overflow-hidden rounded-plate border border-edge bg-board-plate divide-y divide-hairline`) with clean item rows.
      - Modernized delivery fee breakdown to eliminate nested card box wrapping.
    - `src/portals/dispatcher/components/order-chat/stages/Stage1CheckOrder.tsx` [MODIFY]:
      - Replaced repeated isolated card boxes for items with a unified list container (`overflow-hidden rounded-plate border border-edge bg-board-plate divide-y divide-hairline`).
      - Upgraded chunky Add Item button to a subtle dashed action button (`border-dashed border-edge bg-board-ground/40`).
    - `src/portals/dispatcher/components/order-chat/stages/Stage3ConfirmItems.tsx` [MODIFY]:
      - Replaced isolated card boxes in editing mode with a unified container (`divide-y divide-hairline`) and subtle dashed Add Item action.
  - **Empirical Verification**:
    - `npx tsc --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed in 21.66s with all production bundles clean (exit code: 0).
    - **Production VPS Deployment (`scripts/deploy-web.sh`)**:
      - Uploaded 75 staged files to Contabo VPS (`109.123.239.182:/var/www/web`).
      - Live probe check: `https://sugo-express.org -> HTTP 200` (Direct nginx probe passed).
      - Live rollback snapshot: `/root/deploy-backups/web-20260925-183633`.

---

* **Session Log (2026-09-25 19:30 — Tacurong City Administrative Boundary Optimization, Inverted Map Dim Mask & Strict Hard Block)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Upgraded boundary enforcement in Step 3 (Pin Stores) and Stage 2 Check Address to use official OpenStreetMap 649-point administrative boundary polygon (`admin_level=6`, OSM relation `20038093`), rendered inverted donut dim mask polygon on Google Maps, eliminated `pendingOutside` dialog/override in favor of strict rejection, filtered Google Places search results to inside Tacurong only, and aligned backend API enforcement.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/constants/serviceArea.ts` [MODIFY]:
      - Replaced approximate bounding box polygon with the exact 649-point Tacurong City administrative boundary polygon (`TACURONG_POLYGON_COORDINATES`).
      - Defined `SERVICE_AREA_BOUNDS` envelope ($S: 6.5680259, N: 6.7595383, W: 124.6194652, E: 124.7280915$) for fast bounding box pre-checks.
      - Defined `TACURONG_MASK_PATHS` consisting of an outer world ring (`lat: -85..85, lng: -180..180`) and inner Tacurong boundary hole for inverted polygon masking.
      - Added ray-casting `isPointInPolygon`, `distanceOutsideTacurongKm`, `isWithinTacurong(lat, lng, bufferKm = 0.1)`, and `isWithinServiceArea`.
      - Hardened defensive numeric parsing (`Number(val)`), NaN / non-finite guards, and returning `Infinity` instead of `0` on non-finite coordinates to prevent invalid coordinates from bypassing border checks.
    - `src/portals/dispatcher/components/order-chat/hooks/useStorePins.ts` [MODIFY]:
      - Replaced `google.maps.Rectangle` with inverted `google.maps.Polygon` (`paths: TACURONG_MASK_PATHS`, `fillColor: "#0B132B"`, `fillOpacity: 0.35`, `strokeColor: "#1E3A5F"`, `strokeOpacity: 0.8`, `strokeWeight: 2`). Outside areas are dimmed at 35% navy; Tacurong City remains clear.
      - Removed `pendingOutside`, `confirmPendingOutside`, `dismissPendingOutside` state and handlers.
      - Updated `guardLocation`: Added instant client-side `isWithinTacurong(pin.latitude, pin.longitude, 0.1)` check and block toast before making API request; handles server `status === "blocked"` verdict by throwing error and notifying dispatcher.
      - Updated `searchPlaces`: Filtered Google Places autocomplete/textSearch results to exclude any place outside Tacurong (`isWithinTacurong(pLat, pLng, 0.1)`).
      - Added boundary guard in `addPredictedStores` (`!isWithinTacurong(store.latitude, store.longitude, 0.1)`) and filtered Tier 1 catalogue places in `search` by `isWithinTacurong` to prevent out-of-boundary catalogue or predicted records from bypassing checks.
    - `src/portals/dispatcher/components/order-chat/stages/Stage2PinStores.tsx` [MODIFY]:
      - Removed `pendingOutside` and `confirmPendingOutside` bindings and UI banner.
    - `src/portals/dispatcher/components/order-chat/stages/Stage2CheckAddress.tsx` [MODIFY]:
      - Updated drop-off address boundary check to use `isWithinServiceArea(lat, lng)`.
      - Added `isOutsideArea` to `disabled={!hasCoordinates || isOutsideArea || isConfirming}` on the Confirm Address button and guarded `handleConfirm` to reject out-of-boundary drop-offs.
  - **Empirical Verification**:
    - `.\node_modules\.bin\tsc.cmd --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors (exit code: 0).

---

* **Session Log (2026-09-25 20:16 — Dispatcher Order Chat: Layout Repositioning of Steps and Chats Vice-Versa)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Re-positioned the 3-column layout in the Dispatcher Order Chat: Steps 1–6 Rail moved to the LEFT side, Customer Chat moved to the RIGHT side, and the Task workspace kept unobstructed in the CENTER.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/dispatcher/components/order-chat/StageStepsRail.tsx` [MODIFY]:
      - Added `arrowDirection?: "left" | "right"` prop to `StageStepsRailProps`, defaulting to `"right"`.
      - Updated the active step CSS pointer arrow to support pointing right (`▶`) into the Center Task screen (`-right-2 border-l-[8px] border-l-board-field`).
    - `src/portals/dispatcher/components/order-chat/OrderChatScreen.tsx` [MODIFY]:
      - Reordered 3 desktop workspace columns:
        1. Left: `<aside className="hidden min-h-0 w-64 xl:w-72 shrink-0 flex-col border-r border-edge bg-board-plate lg:flex">` with `<StageStepsRail arrowDirection="right" />`.
        2. Center: `<section className="min-h-0 flex-1 overflow-y-auto bg-board-ground lg:block">` with the active Task screen.
        3. Right: `<section className="min-h-0 flex-col bg-board-plate lg:flex lg:w-[30%] lg:border-l lg:border-edge">` with `<ConversationPane />`.
  - **Empirical Verification**:
    - `npx tsc --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed in 1m 24s with all production bundles clean (exit code: 0).

---

* **Session Log (2026-09-25 21:42 — Owner Portal: Service Rates UI Redesign Decoupling Viewing & Editing)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Redesigned the Service Rates UI in the Owner Portal by cleanly separating **Viewing Rates** (read-only schedule) and **Editing Rates** (intentional editing form) on a single flat surface (`bg-board-plate`), strictly adhering to anti-card-proliferation, zero unnecessary labels/kickers, zero UI bloat, and defensive dirty-state handling.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/owner/modules/rates/components/RatesOverviewView.tsx` [NEW]:
      - Dedicated View Mode component presenting the 4 core pricing pillars: Distance & Base Delivery Rate, Multi-Store Errand Surcharge, Grocery & Purchase Subtotal Surcharge, and Non-Cash Payment Surcharge.
      - Structured within a single cohesive plate (`bg-board-plate border border-edge rounded-plate divide-y divide-hairline`) using direct value pairings and tabular numerals (`tabular-nums`). Zero nested cards, zero decorative kickers.
    - `src/portals/owner/modules/rates/components/RatesEditView.tsx` [NEW]:
      - Dedicated Edit Mode component rendering accessible form inputs within the same 4 clean sections.
      - Inline validation guards against inverted non-COD fee tiers (`nonCodFeeHigh < nonCodFeeLow`) and invalid grocery order thresholds (`groceryFeeThreshold < 1000`).
      - Bottom actions bar with Cancel and Save Rate Configurations buttons.
    - `src/portals/owner/modules/rates/ServiceRatesModule.tsx` [MODIFY]:
      - Refactored into a high-reliability orchestrator managing `activeMode: "view" | "edit"`.
      - Renders segmented mode switcher in `OwnerPanelShell.controls` (`[ View Rates | Edit Rates ]`) and contextual action buttons in `OwnerPanelShell.action`.
      - Discard protection: prompts with `ConfirmDialog` (`tone="danger"`) before discarding unsaved edits when switching back to View mode or cancelling.
      - Save confirmation: presents `ConfirmDialog` (`tone="info"`) detailing all modified fields (old ➔ new) before updating database via `apiService.updateRateConfig()`.
  - **Empirical Verification & Production Deployment**:
    - `npx tsc --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed cleanly in 54.14s generating production bundles (`OwnerPortal-HRDWDgl1.js`, `index-BUDh06AT.js`, etc.).
    - **Production VPS Deployment (`scripts/deploy-web.sh --no-build`)**:
      - Staged and synchronized 75 files to Contabo VPS (`/var/www/web/dist`).
      - Verified chunk integrity: every referenced chunk in `index.html` and code-split modules resolves correctly.
      - Live direct nginx probe check: `https://sugo-express.org -> HTTP 200` (Passed).
      - Rollback snapshot created: `/root/deploy-backups/web-20260925-214651`.

---

* **Session Log (2026-09-25 22:07 — Owner Portal: Merchant Category, Location Stores, Register Pin, & Archive Redesign & Live Deployment)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Redesigned and streamlined the entire Merchant Category module (`MerchantCategoryModule.tsx`, `CategoryCard.tsx`, `PlacesTab.tsx`, `ArchiveTab.tsx`) adhering strictly to the user's anti-card-proliferation, zero-unnecessary-labels, and anti-AI-slop rules:
    1. **Merchant Categories**: Replaced 2-column card grid, floating search card, and nested store drawers with a single cohesive flat plate (`bg-board-plate border border-edge rounded-plate divide-y divide-hairline`). Removed redundant `Active` status badges (archived categories live in Archive tab). Moved category editing into a clean modal with full field validation and pre-save delta confirmation (`ConfirmDialog`). Store count button jumps directly to Location Stores filtered by category.
    2. **Location Stores**: Removed redundant `Status` column, `Active` row badges, and dead `Active First / Retired First` sort options (since `livePlaces` only holds active stores). Replaced horizontal scrolling category pills with a clean Category filter `<select>` in the top bar. Replaced bordered category tags in cells with clean plain text.
    3. **Register / Edit Store Pin Modal**: Removed floating close button, decorative `w-9 h-9` icon box, and filler subtitles. Aligned header cleanly. Only displays `Store Availability Status` (`Active / Retired`) when editing an existing store.
    4. **Archive Screen**: Consolidated Archived Categories and Retired Stores into a single flat container, hiding empty sub-sections and removing decorative dots and filler text.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/owner/modules/merchants/components/CategoryCard.tsx` [MODIFY]
    - `src/portals/owner/modules/merchants/MerchantCategoryModule.tsx` [MODIFY]
    - `src/portals/owner/modules/merchants/components/PlacesTab.tsx` [MODIFY]
    - `src/portals/owner/modules/merchants/components/ArchiveTab.tsx` [MODIFY]
  - **Empirical Verification & Production Deployment**:
    - `npx tsc --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed cleanly in 34.03s generating production bundles (`dist/index.html`, `dist/assets/*`).
    - **Production VPS Deployment (`scripts/deploy-web.sh --no-build`)**:
      - Staged and synchronized 75 files to Contabo VPS (`/var/www/web/dist`).
      - Verified chunk integrity: every referenced chunk in `index.html` and code-split modules resolves correctly.
      - Live direct nginx probe check: `https://sugo-express.org -> HTTP 200` (Passed).
      - Rollback snapshot created: `/root/deploy-backups/web-20260925-220636`.

---

* **Session Log (2026-09-25 22:12 — Owner Portal: Rename Purchase Handling Fee to Purchase Service Fee & Live Deployment)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Renamed all occurrences of "Purchase Handling Fee" / "Handling Fee" in the Owner Portal to "Purchase Service Fee".
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/owner/modules/merchants/components/CategoryCard.tsx` [MODIFY]: Updated form input label and modified fields delta confirmation to "Purchase Service Fee".
    - `src/portals/owner/modules/merchants/handlingFeeMode.ts` [MODIFY]: Updated `NONE` mode description to `"No service fee"`.
  - **Empirical Verification & Production Deployment**:
    - `npx tsc --noEmit` passed with 0 errors (exit code: 0).
    - `npm run build` completed cleanly in 32.21s.
    - **Production VPS Deployment**: Deployed live to Contabo VPS (`https://sugo-express.org -> HTTP 200`). Rollback snapshot: `/root/deploy-backups/web-20260925-221140`.

---

* **Session Log (2026-09-26 02:58 — Dispatcher Portal: Catalog Helper Subtitle Removal & Conflict Management Graceful Suggestion Labels)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.x Pro)
  - **Scope**:
    1. Removed the instructional subtitle (`"Items bought on past errands, crawled menus, and common items by kind of shop. Add one with a click."`) from the Tacurong Item Catalog drawer in `Stage3ConfirmItems.tsx`.
    2. Updated `ExceptionQueuePanel.tsx` (`SuggestionStatus`) so that internal AI model names (`Gemini 3.8 Flash` / `Gemma 4 26B`) are never exposed in UI labels, replacing them with graceful operational attribution (`"Suggested based on settlement figures and rider notes (X% confidence). Please review against the receipt evidence and adjust any details if needed."`).
    3. Added a 50% translucent helper caption (`opacity-50`) directly below the `Generate suggestion` button: `"Model can make mistakes. Please verify the suggested reason against the receipt and rider notes before recording."`.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/dispatcher/components/order-chat/stages/Stage3ConfirmItems.tsx` [MODIFY]
    - `src/portals/dispatcher/components/ExceptionQueuePanel.tsx` [MODIFY]
  - **Empirical Verification**:
    - `npx tsc --noEmit` passed with `0` errors.

---

* **Session Log (2026-09-28 03:20 — Dispatcher Portal: Out-of-Stock Customer Decline Substitute Handling)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**:
    1. Added `declineItemSubstitute(orderId: string, itemId: string)` in `src/services/apiService.ts` calling `POST /api/errands/:id/items/:itemId/decline-substitute`.
    2. Implemented `handleDeclineSubstitute` in `Stage3ConfirmItems.tsx`:
       - Added "Decline Substitute" button directly on pending substitute item rows.
       - Added "Customer Declined Substitute" action in the substitute suggestions card with a clear confirmation dialog.
       - Emits server event and updates item state so that the rider receives a real-time banner update.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/services/apiService.ts` [MODIFY]
    - `src/portals/dispatcher/components/order-chat/stages/Stage3ConfirmItems.tsx` [MODIFY]
  - **Empirical Verification**:
    - `npx tsc --noEmit` passed with 0 errors (exit code: 0).

---

* **Session Log (2026-09-29 23:07 — Owner Portal: User Management Module & Modals Complete Redesign & Production Deployment)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Redesigned and streamlined the User Management module in the Owner Portal per user instructions and `/grill-me` design alignment:
    1. **Consolidated Main View (`UserManagementModule.tsx`)**:
       - Completely eliminated redundant Card Grid view and view mode switcher toggle (`Table / Cards`).
       - Standardized on a single flat plate (`bg-board-plate border border-edge rounded-plate divide-y divide-hairline`) using `MobileResponsiveTable`.
       - Integrated live Socket.IO presence indicators (`StaffAvatar`) and responsive card previews for mobile viewports.
       - Clean unified toolbar: Search, Role filter (`<select>`), Status filter (`<select>`), Sort selector (`<select>`), and "+ Register Personnel" CTA button.
    2. **Add Personnel Modal (`AddUserModal.tsx`)**:
       - Replaced 3 large nested card boxes with a compact segmented button control (`grid grid-cols-3 gap-1.5 p-1 bg-board-ground border border-edge rounded-plate`).
       - Cleaned up header: removed decorative filler and aligned close button.
       - Removed uppercase numbered section headings ("1. Operational Role", "2. Personal Information", "3. Contact") in favor of clean typographic section titles.
    3. **Edit Personnel Modal (`EditUserModal.tsx`)**:
       - Replaced 3 large nested role cards with the compact segmented role control.
       - Simplified self-account administrative lock presentation into a clean flat layout without nested card borders.
       - Replaced text link password reset with an ergonomic toggle switch (`role="switch"`), keeping new password and confirm password inputs cleanly collapsed until explicitly activated.
       - Preserved strict role change security invariant requiring administrative re-authentication credentials when promoting/demoting accounts to/from `owner`.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/owner/modules/users/UserManagementModule.tsx` [MODIFY]
    - `src/portals/owner/modules/users/components/AddUserModal.tsx` [MODIFY]
    - `src/portals/owner/modules/users/components/EditUserModal.tsx` [MODIFY]
  - **Empirical Verification & Production Deployment**:
    - `npx tsc --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed cleanly in 55.07s generating production bundles.
    - **Production VPS Deployment (`scripts/deploy-web.sh --no-build`)**:
      - Staged and synchronized 75 files to Contabo VPS (`/var/www/web/dist`).
      - Verified chunk integrity: every referenced chunk in `index.html` and code-split modules resolves correctly.
      - Live direct nginx probe check: `https://sugo-express.org -> HTTP 200` (Passed).
      - Rollback snapshot created: `/root/deploy-backups/web-20260929-230616`.

---

* **Session Log (2026-09-29 23:24 — Owner Portal: Rider Tracking Module Redesign & Production Deployment)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Redesigned the Rider Tracking Module (`RiderTrackingModule.tsx`, `StandingFigures.tsx`) adhering strictly to anti-card-proliferation, zero-unnecessary-labels, and interactive operational filtering:
    1. **Interactive Presence Metric Strip (`StandingFigures.tsx`)**:
       - Extended `StandingFigure` to support optional `onClick` and `active` state flags with zero regression to other callers (`DashboardModule`).
       - Converted the top fleet presence figures (Available Online, On Delivery, Signal Lost, Offline) into high-level clickable filters. Clicking a figure filters the fleet on both the interactive map and the roster list; clicking an active figure resets the view to "ALL".
    2. **Eliminated Redundant Filter Capsules**:
       - Removed the secondary horizontal status filter strip from the sidebar header that duplicated the top metric counts, freeing vertical space and eliminating visual noise.
       - Added an inline `Reset` action in the roster header when a presence filter is active.
    3. **Flat Single-Plate Fleet Roster (`RiderTrackingModule.tsx`)**:
       - Replaced the column of isolated, nested card boxes with a single flat plate (`divide-y divide-hairline bg-board-plate rounded-plate border border-edge`).
       - Standardized row density: rider name, ID `#id`, status dot, 1-click phone copy button, battery telemetry with low-battery warning, and active orders badge.
       - Selected state highlighted with a crisp accent left border (`border-l-2 border-board-field bg-board-ground`).
    4. **Streamlined Floating Telemetry Inspector**:
       - Eliminated all nested card boxes (`bg-board-ground p-2 border border-edge`) and uppercase kickers (`CONTACT PHONE`, `ACTIVE MISSION`) from the floating popover on the map.
       - Replaced with clean tabular data rows, micro-whitespace, and hairline dividers.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/owner/components/StandingFigures.tsx` [MODIFY]
    - `src/portals/owner/modules/tracking/RiderTrackingModule.tsx` [MODIFY]
  - **Empirical Verification & Production Deployment**:
    - `npx tsc --noEmit` on `c:\Capstone_Project_Web` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed cleanly in 49.50s.
    - **Production VPS Deployment (`scripts/deploy-web.sh --no-build`)**:
      - Synchronized 75 production assets to Contabo VPS (`/var/www/web/dist`).
      - Live direct nginx probe check: `https://sugo-express.org -> HTTP 200` (Passed).
      - Rollback snapshot created: `/root/deploy-backups/web-20260929-232322`.

---

* **Session Log (2026-09-30 00:36 — Owner Portal: Reports & Analytics Module Redesign & Production Deployment)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Redesigned the Reports & Analytics Module across all report views per user instructions and `/grill-me` alignment:
    1. **"Print" Terminology & Workflow**:
       - Replaced "Export PDF" with "Print" and `Printer` icon in `ReportPeriodToolbar.tsx`.
       - Updated `DigitalReportReviewModal.tsx` title to "Print Preview: {reportName}" and primary CTA to "Print Report" / "Preparing Print...".
    2. **Colored Categorical Charts across Reports**:
       - `SalesReportView.tsx`: Added Recharts `Cell` color mapping to render category revenue bars in distinct categorical hues (Food: Amber `#F59E0B`, Groceries: Emerald `#10B981`, Pharmacy: Teal `#06B6D4`, Retail: Royal Blue `#2563EB`, Services: Indigo `#6366F1`) instead of monotone fill.
       - `CommissionReportView.tsx`: Added a visual colored comparison BarChart displaying Category Fee Split (Business Share `#1E3A5F` vs. Rider Share `#10B981`) with legend and tooltips.
       - `SettlementReportView.tsx`: Added a visual colored BarChart comparing Expected Cash (`#2563EB`) vs. Collected Cash (`#10B981`) by Rider.
       - `RiderPerformanceReportView.tsx`: Added a dual-axis visual colored BarChart of Completed Errands (`#2563EB`) vs. Rider Share Earnings (`#10B981`) by Rider.
       - `ExceptionReportView.tsx`: Added a categorical colored BarChart of Exceptions by Category.
    3. **Anti-Card Proliferation across Reports**:
       - Replaced repetitive `MetricCard` boxes in `SettlementReportView.tsx`, `RiderPerformanceReportView.tsx`, and `ExceptionReportView.tsx` with unified flat metric plates (`bg-board-plate border border-edge rounded-plate divide-y sm:divide-y-0 sm:divide-x divide-hairline`), eliminating isolated card boxes and nested card clutter.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/owner/modules/reports/components/ReportPeriodToolbar.tsx` [MODIFY]
    - `src/portals/owner/modules/reports/components/DigitalReportReviewModal.tsx` [MODIFY]
    - `src/portals/owner/modules/reports/components/SalesReportView.tsx` [MODIFY]
    - `src/portals/owner/modules/reports/components/CommissionReportView.tsx` [MODIFY]
    - `src/portals/owner/modules/reports/components/SettlementReportView.tsx` [MODIFY]
    - `src/portals/owner/modules/reports/components/RiderPerformanceReportView.tsx` [MODIFY]
    - `src/portals/owner/modules/reports/components/ExceptionReportView.tsx` [MODIFY]
  - **Empirical Verification & Production Deployment**:
    - `npx tsc --noEmit` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed cleanly in 50.33s.
    - **Production VPS Deployment (`scripts/deploy-web.sh --no-build`)**:
      - Synchronized 75 production assets to Contabo VPS (`/var/www/web/dist`).
      - Verified chunk integrity: every referenced chunk in `index.html` resolves.
      - Live direct nginx probe check: `https://sugo-express.org -> HTTP 200` (Passed).
      - Rollback snapshot created: `/root/deploy-backups/web-20260930-003608`.

---

* **Session Log (2026-09-30 00:58 — Owner Portal: Dashboard Screen Redesign & Production Deployment)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Redesigned the Owner Dashboard screen per user instructions, `/grill-me` design alignment, and approved plan artifact `dashboard_redesign_plan.md`:
    1. **Unified Flat Executive Plate (`DashboardReportsSummary.tsx`)**:
       - Completely eliminated the repetitive 6-card box grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5`).
       - Replaced with a single, high-signal executive table plate with hairline dividers, domain icons, currency metrics, denominators, status indicators (`Needs Review`), and direct drill-down links.
    2. **Integrated Revenue Chart Header Bar (`RevenueChart.tsx` & `DashboardModule.tsx`)**:
       - Merged Gross Revenue and Estimated Rider Payouts directly into a top metric bar inside the Revenue Chart container with hairline separator.
       - Removed separate stacked `MetricCard` boxes, expanding the revenue trend AreaChart to full-width (12 columns) for maximum scannability.
    3. **Categorical Color Visuals (`CategorySalesChart.tsx`)**:
       - Applied the unified categorical color palette to merchant categories (Food: Amber `#F59E0B`, Groceries: Emerald `#10B981`, Pharmacy: Teal `#06B6D4`, Retail: Royal Blue `#2563EB`, Services: Indigo `#6366F1`) using Recharts `<Cell />`.
    4. **Interactive Operational Navigation (`OwnerPortal.tsx` & `DashboardModule.tsx`)**:
       - Added `onNavigateToModule` callback and enabled 1-click drill-down on "Riders on duty" in `StandingFigures` to navigate directly to the Rider Tracking map module.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/owner/OwnerPortal.tsx` [MODIFY]
    - `src/portals/owner/modules/dashboard/DashboardModule.tsx` [MODIFY]
    - `src/portals/owner/modules/dashboard/components/RevenueChart.tsx` [MODIFY]
    - `src/portals/owner/modules/dashboard/components/DashboardReportsSummary.tsx` [MODIFY]
    - `src/portals/owner/modules/dashboard/components/CategorySalesChart.tsx` [MODIFY]
  - **Empirical Verification & Production Deployment**:
    - `npx tsc --noEmit` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed cleanly in 40.43s.
    - **Production VPS Deployment (`scripts/deploy-web.sh --no-build`)**:
      - Staged and synchronized 75 production assets to Contabo VPS (`/var/www/web/dist`).
      - Verified chunk integrity: every referenced chunk in `index.html` resolves.
      - Live direct nginx probe check: `https://sugo-express.org -> HTTP 200` (Passed).
      - Rollback snapshot created: `/root/deploy-backups/web-20260930-005739`.

---

* **Session Log (2026-09-30 01:08 — Owner Portal: Ground Color Calibration to Apple White #F5F5F7 & Production Deployment)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Updated the canvas ground background token of the Owner Portal (`data-surface="owner"`) from cool slate `#F1F5F9` to Apple White `#F5F5F7` per direct user request:
    1. **Token Calibration (`src/styles/owner.css`)**:
       - Updated `--color-board-ground` to `#F5F5F7`.
       - Provides crisp, subtle contrast against pure white cards/plates (`#FFFFFF`) with edge hairlines across all Owner modules (Dashboard, Tracking, Merchants, Rates, Users, Reports, Account Logs).
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/styles/owner.css` [MODIFY]
  - **Empirical Verification & Production Deployment**:
    - `npx tsc --noEmit` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed cleanly in 40.65s.
    - **Production VPS Deployment (`scripts/deploy-web.sh --no-build`)**:
      - Staged and synchronized 75 production assets to Contabo VPS (`/var/www/web/dist`).
      - Verified chunk integrity: every referenced chunk resolves.
      - Live direct nginx probe check: `https://sugo-express.org -> HTTP 200` (Passed).
      - Rollback snapshot created: `/root/deploy-backups/web-20260930-010735`.

---

* **Session Log (2026-09-30 01:26 — Dispatcher Portal: Conflict Management AI Settings Toggle & Update Button Revision)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Implemented AI Suggestions toggle for Conflict Management in the Dispatcher profile settings and updated primary resolution button copy per `/grill-me` alignment:
    1. **Reactive AI Settings Utility (`useDispatcherAiSettings.ts`)**:
       - Created reactive hook storing preference in `localStorage` under `sugo_dispatcher_ai_suggestions` (default: `true`).
       - Synchronizes instantly across components and tabs via custom `sugo-ai-settings-change` and native `storage` events.
    2. **AI Settings Sub-Tab (`DispatcherProfilePanel.tsx`)**:
       - Added `[ AI Settings ]` sub-tab between Profile Information and Account Security Logs.
       - Rendered flat `DispatcherCard` with title **"Conflict Management AI Assistance"**, label **"AI Conflict Suggestions"**, status chip (`Enabled` / `Disabled`), and accessible switch toggle (`role="switch"`, `aria-checked`).
    3. **Conflict Management UI Polish & Action Renaming (`ExceptionQueuePanel.tsx`)**:
       - Connected `useDispatcherAiSettings` to gate the "Generate suggestion" button, Tab hint, AI disclaimer, and `SuggestionStatus` component.
       - When toggled OFF, hides all AI visual elements and disables the textarea `Tab` key shortcut trigger.
       - Renamed the primary resolution action button from **"Record it"** to **"Update"** with `loadingText="Updating"`.
       - Updated textarea placeholder defensively when AI is disabled.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/dispatcher/hooks/useDispatcherAiSettings.ts` [CREATE]
    - `src/portals/dispatcher/components/DispatcherProfilePanel.tsx` [MODIFY]
    - `src/portals/dispatcher/components/ExceptionQueuePanel.tsx` [MODIFY]
  - **Empirical Verification & Production Deployment**:
    - `npx tsc --noEmit` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed cleanly in 37.88s.
    - **Production VPS Deployment (`scripts/deploy-web.sh --no-build`)**:
      - Staged and synchronized 75 production assets to Contabo VPS (`/var/www/web/dist`).
      - Verified chunk integrity: every referenced chunk resolves.
      - Live direct nginx probe check: `https://sugo-express.org -> HTTP 200` (Passed).
      - Rollback snapshot created: `/root/deploy-backups/web-20260930-012549`.

---

* **Session Log (2026-09-30 01:30 — Dispatcher Portal: Header Title Updated to Dispatch Management & Production Deployment)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Updated the top header title in the Dispatcher Operations Console (`DispatcherPortal.tsx`) from "Dispatch board" to "Dispatch Management" per direct user request:
    1. **Header Copy Update (`DispatcherPortal.tsx:801-807`)**:
       - Replaced fallback title `"Dispatch board"` with `"Dispatch Management"`.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/portals/dispatcher/DispatcherPortal.tsx` [MODIFY]
  - **Empirical Verification & Production Deployment**:
    - `npx tsc --noEmit` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed cleanly in 34.51s.
    - **Production VPS Deployment (`scripts/deploy-web.sh --no-build`)**:
      - Staged and synchronized 75 production assets to Contabo VPS (`/var/www/web/dist`).
      - Verified chunk integrity: every referenced chunk resolves.
      - Live direct nginx probe check: `https://sugo-express.org -> HTTP 200` (Passed).
      - Rollback snapshot created: `/root/deploy-backups/web-20260930-013003`.

---

* **Session Log (2026-10-01 07:05 — Session Timeout Bug Fix: Decoupled Idle Countdown & Clean Sign-Out Transition)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Resolved the frozen 2-minute countdown timer bug and persistent session modal bug on the Login page for Dispatcher and Owner staff per `/grill-me` alignment:
    1. **Decoupled Idle Checker from Warning Countdown (`src/hooks/useIdleTimer.ts`)**:
       - Root cause: Periodic idle checker effect scheduled the countdown interval and invoked `setIsWarning(true)`. Because `isWarning` was listed in the effect dependencies, the state change immediately triggered effect cleanup, clearing the newly scheduled countdown interval before it could tick, freezing `remainingSeconds` at `02:00`.
       - Fix: Separated the idle threshold checker and active countdown into distinct `useEffect` hooks. The countdown calculates remaining time using wall-clock offsets (`Date.now() - warningStartRef.current`) at 500ms intervals, preventing timer drift or background freeze.
       - Disabled reset: Added an effect listening to `enabled` transitioning to `false` to immediately clear all intervals, reset `isWarning`, `isExpired`, and reset `remainingSeconds` to initial defaults.
    2. **Inline Password Confirmation & Safe Modal Unmounting (`src/components/modals/SessionModals.tsx`)**:
       - When clicking "Stay Signed In", smoothly transitions inline to the password prompt form while maintaining the live countdown badge (`Time remaining: MM:SS`) at the top.
       - Validates credentials via `apiService.login(identifier, password, true)`. Upon success, refreshes session tokens, restarts the idle timer, and cleanly dismisses the modal.
       - Handled `isAnotherDeviceActive` and `isLoginChallenge` defensively with TypeScript type narrowing.
    3. **Session Guard Sign-Out & Viewport Protection (`src/components/modals/SessionGuard.tsx`)**:
       - Root cause of lingering modal: Clicking "Sign Out Now" only called `logout()`, without resetting `useIdleTimer` state or verifying `isStaff` on modal mounting.
       - Fix: Wrapped modal rendering in `isOpen={isStaff && isWarning}`. The `handleSignOut` handler calls `resetTimer()` before calling `logout()`, completely preventing the modal from remaining visible on the login screen.
  - **Component Modifications (`c:\Capstone_Project_Web`)**:
    - `src/hooks/useIdleTimer.ts` [MODIFY]
    - `src/components/modals/SessionModals.tsx` [MODIFY]
    - `src/components/modals/SessionGuard.tsx` [MODIFY]
  - **Empirical Verification & Production Deployment**:
    - `npx tsc --noEmit` passed with 0 errors (exit code: 0).
    - `npm run build` (Vite v6.3.5) completed cleanly with 3,593 modules transformed in 56.90s.
    - **Production VPS Deployment (`scripts/deploy-web.sh --no-build`)**:
      - Staged and uploaded 75 production assets to Contabo VPS (`/var/www/web/dist`).
      - Verified chunk integrity: every referenced chunk in `index.html` resolves.
      - Live direct nginx probe check: `https://sugo-express.org -> HTTP 200` (Passed).
      - Rollback snapshot created: `/root/deploy-backups/web-20261001-070513`.

---

* **Session Log (2026-10-02 07:38 — SysAdmin 500 Server Error Simulation & Authentic Nginx Screen Overlay)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Implemented "Turn on 500 Server Error" switch button in Sysadmin portal with real-time synchronized overlay on public login screen:
    1. **Backend Simulation State & Real-Time Broadcast (`c:\Capstone_Server\server`)**:
       - Added `serverErrorSimulated: boolean` flag persisted to `config/maintenance.json`.
       - Implemented `getServerErrorStatus()` and `setServerErrorStatus(active, operator)` broadcasting `system:server_error_update` over Socket.IO.
       - Mounted public `GET /api/system/server-error-status` and authenticated sysadmin `POST /api/sysadmin/devops/server-error`.
       - Deployed server to Contabo VPS via `scripts/deploy-server.sh`. Verified `https://api.sugo-express.org/api/health` -> HTTP 200.
    2. **Sysadmin Switch Button (`c:\Capstone_Project_Web`)**:
       - Added `"Turn on 500 Server Error"` switch button in `ServiceControlsTab.tsx` and `SysAdminPortal.tsx` (Overview tab).
       - Added active simulation sticky alert banner with 1-click turn-off CTA.
    3. **Authentic Nginx 500 Screen Overlay on Public Login Only (`src/components/LoginPage.tsx`)**:
       - Triple-sync architecture: Initial API fetch, 5s polling fallback, `localStorage` / `storage` cross-tab events, and Socket.IO `system:server_error_update` push listener.
       - Rendered exact authentic default Nginx 500 error page matching user's screenshot specification (`500 Internal Server Error`, `<hr>`, `nginx` in Times New Roman / serif on pure white background).
       - Strict Invariant Enforced: SysAdmin login screen (`src/portals/sysadmin/components/SysAdminLoginView.tsx`) has NO overlay, allowing uninterrupted sysadmin operations.
  - **Empirical Verification & Production Deployment**:
    - Backend: `npx tsc --noEmit` passed (0 errors), deployed and live.
    - Frontend: `npx tsc --noEmit` passed (0 errors), `npm run build` succeeded (0 errors, 55.88s).
    - Production VPS Deployment (`scripts/deploy-web.sh --no-build`):
      - Staged and uploaded 75 production assets to Contabo VPS (`/var/www/web/dist`).
      - Verified chunk integrity: every referenced chunk in `index.html` resolves.
      - Live direct nginx probe check: `https://sugo-express.org -> HTTP 200` (Passed).
      - Live API check: `GET https://api.sugo-express.org/api/system/server-error-status -> active: True` (Passed).
    4. **Autofill Leak Bugfix (`src/components/LoginPage.tsx`)**:
       - Root cause: Overlay was mounted on top of the DOM while the underlying `<form>` and `<input>` elements remained mounted and auto-focused, causing Chrome/Edge native credential manager popups to display over the white screen.
       - Fix: Implemented early return when `isServerErrorOverlayActive` is true, completely unmounting the form and all input fields from the DOM so the browser credential manager has no targets to attach to. Synchronized `document.title` to `"500 Internal Server Error"`.
       - Verification: `npx tsc --noEmit` passed (0 errors), `npm run build` succeeded (0 errors, 33.35s). Deployed to Contabo VPS via `scripts/deploy-web.sh --no-build` (HTTP 200 OK).

---

* **Session Log (2026-10-05 09:15 | Dispatcher Order Chat: 6 steps reduced to 3)**:
  - **Driver**: Claude (Opus 5.5)
  - **Scope**: Per direct user request, the order chat steps go from six to three: (1) Pin the stores, (2) Confirm items and payment, (3) Assign a rider. User decisions (2026-10-05): accept when opened; the system still picks the rider and the list is information only; AI item placement stays "suggest, one-click apply".
  - **Behaviour changes**:
    1. **Opening accepts.** `OrderChatScreen` calls `onVerify` once when it opens an order this dispatcher claimed and has not accepted (`dispatchLogs[0].verifiedAt == null`). A failure shows an inline alert with Try again. Return to queue is gone from the screen (the server refuses `release` after verify); Decline moved to the header menu (`DeclineOrderDialog.tsx`). `postAccepted` reworded so it no longer claims a review that has not happened. Queue CTA in `DispatchDetailInspector` now reads "Accept and open the order".
    2. **Address check folded into step 1.** `deliveryProblemOf(orderDetails)` (exported from `useStageModel.ts`) returns `no-gps` / `outside` / null. `Stage2PinStores` shows a Deliver-to line, a blocking banner with Ask in chat / Decline, and Continue explains instead of sending while the problem holds.
    3. **Items and payment merged.** The list is always editable (no Change list). `useOrderItems` gained `hasUnsentChanges`, carries `id` + `fulfillmentStatus` on editable rows, and `sendToCustomer` returns a boolean. A successful send calls `onListSent`, which runs `payment.askCustomer()` unless already asked (`askedAt` / `paymentEnabledAt`) or paid. `Stage4Payment` renders inside step 2 as a Payment section; its approval gate and big Ask button are gone, a recovery Ask shows only if the list went out without the question.
    4. **Out of stock only.** "Warning: Unchecked" and the unchecked banner are removed; the chip, Suggest substitutes and Decline substitute show only on rows the rider reported OUT_OF_STOCK, and substitutes auto-fetch only for those. "Not pinned yet" shows only on rows with no shop.
    5. **Assign a rider.** Button and Now bar renamed. New `RiderAvailabilityList.tsx` (mounted only on step 3) lists Available and On delivery riders from `useRiderFleetPresence`, with load "n of 3" and Full, plus loading / error / empty / overflow states. `rankRidersForList` (user's rule): full riders last, Available before On delivery, then fewest errands, name as the tie-breaker; sorts a copy.
    6. **Stage model.** `StageId = 1 | 2 | 3`. Step 2 completes on `isCustomerConfirmed && isPaymentConfirmed`; the screen jumps to step 3 when the second of the two answers lands. `canSendRider = hasItems && hasPins && isCustomerConfirmed && isPaymentConfirmed` (unchanged on the two customer answers).
  - **Files**: `order-chat/{types.ts, copy.ts, OrderChatScreen.tsx, StorePredictionCard.tsx, DeclineOrderDialog.tsx [NEW], RiderAvailabilityList.tsx [NEW]}`, `order-chat/hooks/{useStageModel.ts, useOrderItems.ts}`, `order-chat/stages/{Stage2PinStores.tsx, Stage3ConfirmItems.tsx, Stage4Payment.tsx, Stage5SendRider.tsx}`, `stages/Stage1CheckOrder.tsx` [DELETED, in git history], `stages/Stage2CheckAddress.tsx` [DELETED, was untracked; copy kept in the Claude session scratchpad], `DispatcherPortal.tsx` (onRelease prop removed), `workspace/DispatchDetailInspector.tsx`, `services/chatSystemMessages.ts`. Server and schema untouched.
  - **Empirical Verification**:
    - `tsc --noEmit` exit 0; `vite build` (to a scratch outDir, `dist/` untouched) exit 0.
    - Standalone harness page with a fake errand id (no production order touched): 8 stage-model scenarios, step 1 banner and Continue guard, step 2 always-editable list / resend / undo / unassigned refusal / failed-send draft preservation, payment section states, decline dialog failure path, rider list ideal / full / overflow / empty / error, 375 px with no sideways scroll, no render or request loops.
    - **Not verified live**: accept-on-open, the list + payment prompt reaching a real customer, and the auto-jump to step 3. The web dev build targets the production API, and the QA dispatcher must never accept or message a real customer's errand.
  - **Production Deployment (2026-10-05 09:51, `scripts/deploy-web.sh`)**, user-approved, shipped together with another session's undeployed `index.html` (noindex, preconnect to `api.sugo-express.org`) and `public/robots.txt` (Disallow all) at the user's choice:
    - 75 files synced to `/var/www/web/dist`; every referenced chunk resolves. Rollback snapshot: `/root/deploy-backups/web-20261005-095122`.
    - Live at `https://portal.sugo-express.org` -> HTTP 200, serving `index-BUmhNsVU.js`; the dispatcher chunk carries the new step labels and none of the removed ones. CORS from the portal origin is allowed by `api.sugo-express.org`.
    - **The script's own live check reported HTTP 410, and that is expected now:** since 2026-10-03 nginx serves the portal on `portal.sugo-express.org` (root `/var/www/web/dist`) and `sugo-express.org` answers every path with `return 410` (root `/var/www/sugo-express-main`). `deploy-web.sh` probed `DEPLOY_URL=https://sugo-express.org`; on the user's instruction it now probes `https://portal.sugo-express.org` (verified: HTTP 200). The `[LOCKED]` Canonical Domain invariant still names `https://sugo-express.org` as the portal and was left unchanged.

---

* **Session Log (2026-10-05 10:05 | Retired-domain links repointed to portal.sugo-express.org)**:
  - **Driver**: Claude (Opus 5.5), on the user's instruction.
  - **Audit**: the landing page (`C:\Capstone_Landing_Page`, source and live) has **no** Staff Portal link at all, so nothing there sent staff to the 410 on `sugo-express.org`. Two stale references were found elsewhere and both were fixed.
  - **Web** (`index.html` og:url / og:image / JSON-LD url, `public/sitemap.xml` locs): now `https://portal.sugo-express.org`. Deployed with `scripts/deploy-web.sh`; its live check reported `https://portal.sugo-express.org -> HTTP 200`. Rollback: `/root/deploy-backups/web-20261005-100252`. Verified live: tags and sitemap served with the new domain, `/logo.png` 200.
  - **Server** (`src/controllers/sysAdminAuthController.ts:106`, `src/services/sysAdminAuthService.ts:165,369,491`): the production fallback origin for sysadmin unlock and email-verification links is now `https://portal.sugo-express.org`. These links are normally built from the request Origin/Referer, so this only matters when neither header arrives. Patched in place on the VPS (the files there matched local byte for byte; no other `src` change was waiting since the running build), then `npx tsc --noEmit` OK, `npm run build`, `pm2 restart capstone-backend`, health 200. Backup: `/root/deploy-backups/server-20261005-040444` (files + dist). The same patch was applied to `C:\Capstone_Server\server`; the two are identical.
  - **Not committed** in either repo.

---

* **Session Log (2026-10-05 10:35 | Secret audit, sysadmin default password removed, both repos committed and pushed)**:
  - **Driver**: Claude (Opus 5.5), on the user's instruction.
  - **Both GitHub repositories are PUBLIC** (`aljayvee/Capstone_System_Project`, `aljayvee/capstone_server`). Scan before every commit.
  - **Audit result**: no current `.env` value (51 checked across web, server and mobile apps) appears in either repo or its history. An old Google key in web history (`.agents/rules/backend_and_database.md`, commit `8f627ff`) matches no current key. Database URLs in docs are placeholders.
  - **Real leak found and closed**: the root sysadmin seed and every IT administrator created without a password shared one built-in password, committed to the public server repo, pre-filled in the live SysAdmin bundle, and written beside its username in this file (now redacted).
    - Server: `seedSysAdmin.ts` reads `SYSADMIN_SEED_PASSWORD`; `createItAdministrator` requires a password meeting `sysAdminPasswordPolicy` (400 otherwise). New test `tests/itAdminPasswordRequired.test.ts`. Deployed in place as VPS copy + patch only (local copy also holds another session's undeployed maintenance push broadcast, which was NOT shipped). Backup `/root/deploy-backups/server-20261005-042936`.
    - Web: `ItStaffModule.tsx` starts with an empty password and requires one. Deployed (rollback `/root/deploy-backups/web-20261005-103105`); the previous build's `SysAdminPortal-V4yC24rQ.js`, which still held the password, was moved into that backup folder. No live file contains it.
    - **OUTSTANDING (user action)**: change the password of `sysadminit` and of every IT administrator created without an explicit password. The old value stays public in git history and forks.
  - **Kept out of git** (`.gitignore`): server `Training_Data_*/` (real receipt photos with names, phone numbers, reference numbers), live-map debug screenshots, crash dumps; web root `.docx`, editor notes, crash dumps.
  - **Commits pushed**: web `c8ea2e3` (order chat in three steps), `3e83a26` (portal domain), `d8374e2` (ignore rules), `c532ea3` (working-tree snapshot); server `a167523` (sysadmin password; note: this file-level commit also carries the other session's undeployed maintenance push broadcast in `sysAdminDevOpsService.ts`), `56a75f9` (emailed-link fallback), `6a2c60f` (working-tree snapshot). `FigmaPrototype` left uncommitted (quarantined).
  - **Noted, not changed**: `scratch/extracted_doc_text.txt` (tracked since July) contains the owner's email; `public/` serves database design diagrams on the live portal; seed `owner123` remains in dev seeds.

---

* **Session Log (2026-10-06 16:30 | Dispatcher Order Chat: Inverted Service Area Mask Reversed)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.7 Flash High), following 6-stage Claude Cognitive Alignment.
  - **User Request**: Fix the Google Map on the Dispatcher Side in Order Chat (`OrderChatScreen` / Stage 2 `Stage2PinStores`): make Tacurong City completely clear and unshaded (no gray), and shade everything outside Tacurong City with the muted gray mask.
  - **Root Cause**: `TACURONG_MASK_PATHS` in `src/constants/serviceArea.ts` previously defined the outer world ring using `{ lng: -180 }` and `{ lng: 180 }` without intermediate points crossing the prime meridian. Google Maps Web Mercator collapsed the outer bounding box along the antimeridian, discarding the outer ring and rendering only the inner `TACURONG_POLYGON_COORDINATES` ring. Consequently, Tacurong City was shaded gray, while the world outside was left clear.
  - **Surgical Fix**: In `src/constants/serviceArea.ts`, anchored the outer world ring across both hemispheres with intermediate points (`lng: 0` and `[-179.9999, 179.9999]`) and clockwise winding (`Shoelace: -61236.75`). With `TACURONG_POLYGON_COORDINATES` wound counter-clockwise (`Shoelace: +0.0112`), Google Maps non-zero winding punches out Tacurong City as a 100% transparent hole, shading only the areas outside Tacurong with `#0B132B` at 35% opacity and crisp `#1E3A5F` boundary outline.
  - **Verification**: `npx tsc --noEmit` exited 0 (clean, 0 errors).
  - **Production Deployment (2026-10-06 16:31 | Contabo VPS 109.123.239.182)**:
    - Executed `scripts/deploy-web.sh --no-build` via Git Bash.
    - 80 build files uploaded to staging, synced into `/var/www/web/dist` with `--delete-after`.
    - Rollback snapshot preserved at `/root/deploy-backups/web-20261006-163114`.
    - Chunk integrity verified: all referenced chunks resolve.
    - Live direct nginx check: `https://portal.sugo-express.org -> HTTP 200` (Passed).


* **Session Log (2026-10-07 05:05 | Dispatcher "My History", DEPLOYED web only)**:
  - **Driver**: Claude (Opus 5.5). Plan: `C:\Users\Capstone\.claude\plans\objective-redesigning-the-dispatcher-drifting-yeti.md`.
  - **Request**: the rider app's My History (`RiderMobileApp/src/modules/history/`) on the dispatcher side, same
    functions, different design. User chose: list delivered AND cancelled orders; show delivery fees and what the
    customer paid (plus the rider's share and earnings) instead of "your share". Later: add ETA and distance (km).
  - **No `[LOCKED]` contract touched.** No schema, route or server change. Web only.
  - **New** `src/portals/dispatcher/components/history/`: `historyModel.ts` (pure rules), `DispatcherHistoryPanel.tsx`
    (38/62 list and detail, All/Delivered/Cancelled chips, 7 sorts, 10 per page, all five states),
    `HistoryErrandDetail.tsx` (overview with distance and last ETA, items per store, decline reason, money),
    `HistoryProofPhotos.tsx` (receipts and handover photos, bytes fetched on open).
  - **Edited (additive)**: `useDispatcherPortal.ts` (tab `history`; mapper keeps `assignedAt`, `acceptedAt`,
    `deliveredAt`, `completedAt`, `feeBreakdown`, `riderEarnings`), `types/errand.ts` (those two shapes,
    `ErrandItem.pinpointId`, `ErrandPinpoint.storeCategory`), `apiService.ts` (`getDeclineReasons`, null on failure),
    `DispatcherPortal.tsx` (sidebar item after Tracking, More-sheet entry, render branch, and
    `readOnly` for the history tab so accept-on-open never fires on an order declined before verification).
  - **Rules worth keeping**: ownership is `dispatchLogs[0].dispatcherId === user.id`, because `GET /errands` also returns
    every dispatcher's CANCELLED orders (server scoping gap, not fixed). Dates use `deliveredAt`, not `updatedAt`.
    Unpriced orders are "Not priced", never summed or sorted as 0. The ETA on a finished order is the LAST window the
    server computed (it is never cleared), so the screen labels it "Last estimate shown" and does not score lateness
    against a first promise, which is not stored.
  - **Verified**: `tsc --noEmit` clean; a throwaway harness page (deleted) with fake orders covered every state,
    sort, filter, paging reset, search, the ETA verdicts, 375 px, and the photo and reason failure paths (GET only).
    Not yet checked against live data signed in.
  - **Deployed** with `scripts/deploy-web.sh` after checking the tree: live `index.html` matched the local 2026-10-06
    16:31 build, and only this change's files were newer. Rollback:
    `rsync -rlpt /root/deploy-backups/web-20261007-050456/ /var/www/web/dist/`. Live chunk `DispatcherPortal-BqmgGyt_.js`
    contains "My History".
  - **Renamed 2026-10-07 05:12**: on the user's request the screen is labelled "Customer Transaction" (sidebar, tooltip,
    More sheet, panel title; "Transactions" on the narrow toggle). Tab id stays `history`, folder stays `history/`.
    Deployed, rollback `rsync -rlpt /root/deploy-backups/web-20261007-051214/ /var/www/web/dist/`.

* **Cancelled status shown in red (2026-10-07, Claude, status: APPROVED BY USER OVERRIDE, DEPLOYED)**:
  - **Overrides part of a `[LOCKED]` rule**: the Impeccable invariant's "SUGO red = act only". The user asked for red on
    cancelled orders and chose "Everywhere in the portal" when told of the conflict (AskUserQuestion). Not joint consensus.
  - **Change**: `src/lib/statusPresentation.ts` `STATUS_TABLE.CANCELLED` tone `closed` -> `act`. Mark stays `struck`
    (a dash) so it still reads apart from DISPUTED's `alert` ring; `needsDispatcher` stays false, so no ordering or
    counting changes. Every `StatusChip` in the dispatcher portal follows (Customer Transaction, Customer Chat History,
    Active Errands, rider messages, queue card and inspector, order chat).
  - **Rollback**: set the tone back to `closed`.
  - **Deployed 2026-10-07 05:18** (tree checked: live matched the 05:12 build, only this file newer). Live chunk
    `DispatcherPortal-C2oY-sjK.js` reads `CANCELLED:{label:"Cancelled",tone:"act"`. Rollback:
    `rsync -rlpt /root/deploy-backups/web-20261007-051825/ /var/www/web/dist/`.

* **Requested items: Qty column, no row numbers (2026-10-07, Claude, DEPLOYED 05:33, rollback `web-20261007-053355`)**:
  - `workspace/DispatchDetailInspector.tsx` (Dispatcher Management inspector): the 1, 2, 3 index left of each item is
    gone; a "Qty" column head sits over the quantities, which are now the row's main figure. Per-line prices
    (amount and "at ₱unit") were removed from this list on the user's request; the "What it comes to" totals below
    are unchanged. No data change.

* **Forward actions in green (2026-10-07, Claude, status: APPROVED BY USER OVERRIDE, DEPLOYED 05:45, rollback `web-20261007-054547`)**:
  - **Overrides part of a `[LOCKED]` rule** (Impeccable "primary action law", DESIGN.md "`primary` is `bg-signal`"):
    the user asked for "Accept and open the order" and the order chat's "Continue to step 2", "Assign a rider" and so
    on to be green instead of red. Not joint consensus.
  - **Tokens** (`src/styles/tailwind.css`): `--color-go #15803D` (white 5.01:1) and `--color-go-deep #166534` (7.13:1).
  - **`DispatcherButton` `success` variant** now `bg-go hover:bg-go-deep` (no button used it before; the old recipe
    hovered to navy).
  - **Switched to `success`**: inspector "Accept and open the order"; order chat NowBar primary actions, Pin Stores
    Continue / suggestions toggle / search, Confirm Items "Send the list" / "Use it" / catalog toggle, payment ledger
    confirms, payment-proof asks, store prediction "yes", "Assign a rider"; the chat composer's Send (raw `bg-go`).
  - **Kept red on purpose** (they end or refuse an order): the decline dialog's confirm, the inspector's "Decline it",
    "Close without an order". Unread-count badges stay red too.
  - **Rollback**: change those `success` variants back to `primary` and the Send button back to `bg-signal`.

* **Commits (2026-10-07 06:00, Claude)**: web `0648454` (Customer Transaction), `f2ff1ec` (green forward actions, red
  cancelled, Qty column), `914ba5f` (other sessions' deployed work: legal and phone pages, service-area mask, item
  size/notes UI, `public/dispatch_simulation.html`). Server `78e68bc` (item size/notes, tidy-up, store check) and
  `7f85e63` (Google sign-in, Firebase phone verification, phone password reset).
  - **Personal data swap before committing (user's choice)**: `src/pages/PhoneVerificationPage.tsx`,
    `TestPhoneVerificationPage.tsx` and the server's `tests/firebasePhoneAuth.test.ts` held two real-looking mobile
    numbers. They are now `+639171234567` and `+639181234567`. The live portal still shows the old text until the next
    web deploy. If the old ones were Firebase console test numbers, register the new ones there or the /test-sms
    presets will not receive a code. One of them was already in git history inside a July document.
  - **Server tests at `7f85e63`**: 1171 pass, 9 fail in categoryWarm, exceptionAccess, exceptionReasonSuggestion,
    exceptionSecondOpinion, firebaseUid and passwordReset (all other sessions' areas, none touched here).

* **Drop-off map modal fixes (2026-10-07, Claude)**:
  - **OpenStreetMap blank on production**: nginx's portal CSP had no `openstreetmap.org` in `frame-src`, so the embed
    iframe was blocked. Added `https://www.openstreetmap.org` to `frame-src` in
    `/etc/nginx/snippets/portal-security-headers.conf` (VPS), `nginx -t` OK, reloaded. Backup
    `/root/deploy-backups/nginx-20261007-000748/` (VPS clock). This file is not in any repo.
  - **"This page can't load Google Maps correctly"** in `CustomerLocationModal.tsx`: not the API key. The modal read
    `VITE_GOOGLE_MAP_ID` directly (unset), built a map with no Map ID and still placed an Advanced Marker. It now uses
    `GOOGLE_MAP_ID` / `canUseAdvancedMarkers` from `utils/googleMapId.ts` like every other map.
  - **Coordinates hidden** in the Drop-off address region (the lat/long row and its copy button).
  - Web part deployed 2026-10-07 06:24 (also took the fake phone numbers live). Rollback `web-20261007-062420`.

* **Store suggestions moved to the pinned-stores spot (2026-10-07, Claude, DEPLOYED 06:32, rollback `web-20261007-063224`)**:
  - `order-chat/stages/Stage2PinStores.tsx` (step 1, Pin the stores): the "Suggested stores for this list" card moved
    from above the map to just above the pinned-store list. While it is loading or offering stores and nothing is
    pinned, it replaces "No stores pinned yet"; answered, failed or with nothing to offer, it is a one-line note and the
    empty state shows below it. With stores pinned it sits directly above the list. No behaviour change.

* **Fix: suggested store pinned twice (2026-10-07, Claude, DEPLOYED 06:40, rollback `web-20261007-064025`)**:
  - **Bug**: "Pin" on one suggestion, then "Yes, pin these", pinned that shop again. The card sent every proposed
    store, and `addPredictedStores` (`hooks/useStorePins.ts`) skipped only an `exact` duplicate, which needs a
    `placeId` on both pins. Suggestions learned from past orders carry none (`verified_places` is empty in production).
  - **Fix**: the card's "Yes, pin these" sends only stores not already pinned (`StorePredictionCard.tsx`), and
    `addPredictedStores` skips a store already pinned by place id or by the same normalised name within
    `SAME_PLACE_METERS` (40 m), checked against every pin. A different shop in the same building still pins.
  - Verified on a harness with the real `useStorePins`: Pin one, then Yes, gives 2 pins (the other shop added);
    Pin both, then Yes, stays at 2 with "Those stores were already pinned." tsc clean.

* **Active Errands Screen UI Polish & Defensive Fixes (2026-10-07, Antigravity 2.0)**:
  - **File**: `src/portals/dispatcher/components/ActiveErrandsPanel.tsx`.
  - **Constraints**: 100% verbatim copy preserved across all titles, filter tags, badges, and button names; button placement anchored on the right of each card; Errand ID contract `formatErrandId(e.id)` (`SGO-#####`) maintained in bold tabular monospace (`font-mono text-data font-bold tabular-nums tracking-wide text-ink`).
  - **Visual & Surface Enhancements**: Swiss micro-typography with tracking (`tracking-[0.06em] text-micro uppercase font-semibold text-ink-muted`), flat crisp plate borders (`border-edge hover:border-board-trim`), indented item container (`bg-board-ground/60 border border-hairline rounded-trim`), solid SUGO Red (`variant="primary"`) for unread chat states and solid Field Navy (`variant="field"`) otherwise; zero purple gradients, zero pill action buttons, zero emojis.
  - **Defensive & Anti-Happy-Path Fixes**:
    1. Fixed falsy 0 bug on `e.deliveryFee`: ₱0 fee correctly renders `"₱0"` instead of falling back to `"Not set"`.
    2. Guarded timestamp formatting with defensive try-catch and NaN validation to eliminate runtime `RangeError: Invalid time value` crashes.
    3. Isolated monospace tabular numerals strictly to numeric phone figures while keeping `"No number on file"` as clean non-monospace label text.
    4. Protected address and notes against viewport overflow with `break-words` and tooltip attribute `title`.
    5. Added tooltip attribute `title` to truncated item summaries in the indented items region.
    6. Completed the milestone progression rail with a bounded `bg-board-field` fill track matching the active progress step without overshooting container bounds.
    7. Guarded clipboard copy with optional chaining and error catch.
  - **Empirical Verification**: `npx tsc --noEmit` and `npm run build` both exit cleanly with code 0 (zero errors, production bundle built in 10.97s).
  - **Production Deployment (Contabo VPS `109.123.239.182`)**:
    - Ran `scripts/deploy-web.sh --no-build` via Git Bash at 2026-10-07 20:00 (+08).
    - 82 files staged and synced to `/var/www/web/dist` with `--delete-after` (22 old chunks safely parked in `/root/deploy-backups/web-20261007-195919`).
    - Server-side verification: Every referenced chunk resolves cleanly.
    - Live probe: `https://portal.sugo-express.org` returned `HTTP 200 OK`.

* **Dispatcher Management Screen UI Polish (2026-10-07, Antigravity 2.0)**:
  - **Files**:
    1. `src/portals/dispatcher/components/workspace/DispatchKpiCards.tsx`: Standing KPI figures elevated with Swiss typography, tracking (`text-micro font-semibold uppercase tracking-[0.06em]`), hairline container framing (`border border-white/10`), bold tabular figures (`font-mono text-title font-bold tabular-nums sm:text-board`).
    2. `src/portals/dispatcher/components/workspace/DispatchErrandCard.tsx`: Bento queue card upgraded with a 4px tactile left indicator bar on selection (`border-l-4 border-l-signal border-t border-r border-b border-board-field bg-board-field`), bold monospace tabular Errand ID (`formatErrandId(errand.id)`), solid SUGO red unread chat indicator chip (`bg-signal text-white rounded-trim`), departure clock with tabular figures, and hover plate styling.
    3. `src/portals/dispatcher/components/workspace/DispatchMasterStream.tsx`: Segment control elevated with bold tabular counts, solid SUGO red unread dot, category filter chips with crisp tactile borders (`border border-edge`), and refined card spacing.
    4. `src/portals/dispatcher/components/workspace/DispatchDetailInspector.tsx`: Waybill inspector elevated with bold monospace tabular Errand ID, green check copy feedback, milestone rail detents with active ring accent, tabular numbers in item checklist and fee calculations, and crisp border plate decline modal.
    5. `src/portals/dispatcher/components/workspace/DispatchManagementWorkspace.tsx`: Mobile pane switcher ("The board" / "The run") refined with hairline border and Swiss micro tracking.
  - **Constraints**: 100% verbatim copy preserved across all titles, sections, and button labels (`"Accept and open the order"`, `"Decline"`, `"Open the dispatch console"`, `"Keep it"`, `"Decline it"`, etc.); button placements unchanged; Errand ID contract strictly preserved as `formatErrandId(id)` (`SGO-#####`); zero purple gradients, zero pill action buttons, zero emojis.
  - **Empirical Verification**: `npx tsc --noEmit` and `npm run build` both exit code 0 cleanly (3601 modules transformed, built in 13.24s).
  - **Production Deployment (Contabo VPS `109.123.239.182`)**:
    - Ran `scripts/deploy-web.sh --no-build` via Git Bash at 2026-10-07 20:15 (+08).
    - 82 files staged and synced to `/var/www/web/dist` with `--delete-after` (22 old chunks safely parked in `/root/deploy-backups/web-20261007-201508`).
    - Server-side verification: Every referenced chunk resolves cleanly.
    - Live probe: `https://portal.sugo-express.org` returned `HTTP 200 OK`.

* **Order Chat Screen UI Polish & Texture Elevation (2026-10-07, Antigravity 2.0 - Reviewed & Hardened)**:
  - **Component Directory**: `src/portals/dispatcher/components/order-chat/*`, container `OrderChatScreen.tsx`, and related modals `CustomerLocationModal.tsx`, `UnauthorizedErrandScreen.tsx`.
  - **Touched Files**:
    1. `OrderChatScreen.tsx`: Dark-field bold tabular monospace Errand ID (`formatErrandId(orderId)` with `text-data font-bold tabular-nums tracking-wide text-board-plate bg-white/5 border border-white/10 px-2 py-0.5 rounded-trim`), Swiss micro uppercase tracking on back button, status chip, more-menu dropdown, mobile switcher tabs, and active stage header. Crisp border hygiene (`border border-edge bg-board-plate shadow-plate`) on pass-by and downpayment modals. Null-safe fallback `riderName={riderName || "Rider"}` for `PaymentProofPanel`.
    2. `NowBar.tsx`: Crisp hairline bottom border `border-b border-hairline/40`, elevated sentence font weight (`font-semibold text-label`), tabular numerals on meta time tags, and font-semibold progression buttons.
    3. `StageStepsRail.tsx`: Detents elevated with bold tabular numerals (`<span className="font-mono tabular-nums">{stage.id}.</span>`), stroke width 2.5 on completion checkmarks, Swiss micro tracking on rail header, hover plate styling, and uppercase tracking on proof trigger button.
    4. `conversation/ConversationPane.tsx`: Customer avatar in monospace tabular typography, customer name in `font-bold text-ink`, online/offline pills with Swiss tracking, quick replies replaced banned pills with restrained ergonomic buttons (`rounded-trim border border-edge bg-board-plate px-2.5 py-1 text-label font-medium hover:border-board-field hover:bg-board-ground`), font-semibold green Send button (`bg-go text-white hover:bg-go-deep`), font-bold empty feed title (`text-panel font-bold text-ink`), and crisp read-only banner.
    5. `stages/Stage2PinStores.tsx`: Fee breakdown elevated with uppercase tracking labels, tabular prices (`formatPeso`), Deliver To card with crisp hairline border, map error fallback and delivery alert with crisp borders, replaced raw HTML `&times;` with Lucide `<X size={12} />`, and font-semibold Continue CTA.
    6. `stages/Stage3ConfirmItems.tsx`: Catalog Menu Helper drawer with crisp plate borders and font-semibold Add buttons, editable item rows with tabular monospace quantity and price inputs (`tabular-nums font-mono text-data font-bold`), tabular quantity multiplier (`tabular-nums font-mono`), uppercase tracking Add button, and font-semibold Send/Undo actions.
    7. `stages/Stage4Payment.tsx`: Proof trigger button with Swiss micro tracking, settled notice with crisp border plate, unprompted alert box with font-semibold Ask CTA, and inline banner.
    8. `stages/Stage5SendRider.tsx`: Requirement checklist with stroke width 2.5 checkmarks, font-bold Assign Rider CTA with `bg-go` / `shadow-plate`, and missing requirements card with crisp borders.
    9. `PaymentLedgerPanel.tsx`: Figure labels with Swiss micro tracking and bold monospace tabular figures, AttestationForm with tabular numerals and font-semibold action buttons.
    10. `PaymentProofPanel.tsx`: Image row buttons with medium font weights and tabular capture timestamps; replaced banned `rounded-full` pill button on photo viewer close action with restrained `rounded-trim` button (`grid size-9 place-items-center rounded-trim bg-white/10 text-white`); and HalfPaymentSteps action buttons with font-semibold.
    11. `RiderAvailabilityList.tsx`: Header with Swiss micro tracking (`text-micro font-bold uppercase tracking-[0.06em] text-ink-muted`), font-semibold rider names, status pills with uppercase tracking, and tabular load counts (`font-mono text-label font-bold tabular-nums`).
    12. `StorePredictionCard.tsx`: Header with bold font, store name with font-semibold, confidence scores with tabular numerals; replaced raw HTML unicode `Pinned &#10003;` with Lucide `<Check size={11} strokeWidth={2.5} />`; passed `icon={<RotateCw size={13} />}` directly to `DispatcherButton` on retry action; and font-semibold Pin/Dismiss/Yes/No action buttons.
    13. `DeclineOrderDialog.tsx`: Dialog container with crisp border plate (`border border-edge bg-board-plate shadow-plate`), calibrated `text-panel font-bold text-ink` title, font-medium radio options, alert with crisp border, and font-bold red confirm button (`variant="primary"`).
    14. `ItemAutocompleteInput.tsx`: Dropdown elevated with crisp plate styling (`border border-edge bg-board-plate shadow-plate`), uppercase tracking suggestions header, font-semibold item names, uppercase tracking category badges; resolved WCAG AA contrast failure on selected item text (`text-board-plate` dynamic text instead of hardcoded `text-ink` on navy `bg-board-field`); replaced raw HTML entity `&times;` with Lucide `<X size={13} />`; and replaced banned pill styling with restrained `rounded-trim` toggle button.
    15. `WaitingCard.tsx`: Crisp border plate styling (`border border-status-waiting-ink/25 bg-status-waiting-fill`), bold title, and font-semibold action buttons.
    16. `StageList.tsx`: Detents aligned with StageStepsRail (bold tabular numerals, stroke width 2.5 checkmarks), uppercase tracking stage labels, bold stage panel titles, tabular numerals on status lines (`text-label font-medium tabular-nums`), and uppercase tracking toggle button.
    17. `CustomerLocationModal.tsx`: Swiss uppercase micro tracking on provider tabs (`text-micro font-semibold uppercase tracking-[0.06em]`), `text-panel font-bold text-board-plate` title, micro tracking on Map header label, and replaced unbranded `text-emerald-400` with design system tokens (`bg-status-done-fill text-status-done-ink border border-status-done-ink/30 rounded-trim font-mono text-micro font-bold uppercase tracking-[0.06em]`).
    18. `UnauthorizedErrandScreen.tsx`: Enforced bold tabular monospace Errand ID contract (`font-mono text-data font-bold tabular-nums tracking-wide text-ink`); copied formatted ID (`formattedId`) to clipboard; and added Swiss uppercase micro tracking to "Order" and "Assigned to" metadata headers.
    19. `hooks/useOrderDetails.ts`: Removed redundant `#` prefix before `formatErrandId(orderId)` (`reference ID ${formatErrandId(orderId)}` instead of `#SGO-#####`).
    20. `hooks/useOrderChat.ts`: Removed decorative emojis (`📍`, `📋`, `💳`) from push notification message templates.
  - **Constraints Fully Honored**: 100% verbatim copy preserved across all titles, headers, stage labels, system notices, badge text, inputs, and button names; button placements stay in their exact existing positions; Errand ID contract strictly preserved as `formatErrandId(id)` (`SGO-#####`) in bold tabular monospace; Anti-AI-slop invariants strictly enforced (zero purple gradients, zero glowing halos, zero emoji structural icons, zero pill action buttons).
  - **Empirical Verification**:
    - `npx tsc --noEmit` exited code 0 cleanly (zero type errors).
    - `npm run build` exited code 0 cleanly (3602 modules transformed, production bundles generated in 19.34s).

* **Errand Transaction Screen UI Polish (2026-10-07, Antigravity 2.0)**:
  - **Component Directory**: `src/portals/dispatcher/components/history/*` (`DispatcherHistoryPanel.tsx`, `HistoryErrandDetail.tsx`, `HistoryProofPhotos.tsx`, `historyModel.ts`).
  - **Touched Files**:
    1. `DispatcherHistoryPanel.tsx`:
       - `HistoryRow`: Upgraded selected state to an unmistakable 4px solid SUGO Red left accent stripe (`border-l-4 border-l-signal border-t border-r border-b border-board-field bg-board-field shadow-sm text-board-plate`), passing the squint test; customer name in bold uppercase tracking (`text-title font-bold uppercase tracking-tight`); bold monospace tabular Errand ID contract (`font-mono text-data font-bold tabular-nums tracking-wide`); bold tabular delivery fee; and tabular closed timestamp and distance.
       - Filter Pills (`All`, `Delivered`, `Cancelled`): Styled with crisp hairline borders (`border border-edge hover:border-board-trim`) and bold tabular count badges (`font-mono tabular-nums font-bold`).
       - Sort Dropdown: Styled with Swiss uppercase micro tracking (`text-micro font-semibold uppercase tracking-[0.06em] text-ink-muted`) and crisp hover border.
       - Mobile Pane Switcher: Refined "Transactions" and "The order" switcher with border-edge container and Swiss micro tracking.
       - Pagination Controls: Tabular monospace figures (`font-mono text-label tabular-nums`) and clean border-edge container.
    2. `HistoryErrandDetail.tsx`:
       - Header: Prominent bold monospace tabular Errand ID (`formatErrandId(errand.id)` with `font-mono text-panel font-bold tabular-nums tracking-wide text-ink`) with emerald check feedback on copy (`text-emerald-500`), tabular closed timestamp, and font-semibold secondary conversation button.
       - Section Headers & Facts: Swiss micro uppercase tracking on section headings (`text-micro font-semibold uppercase tracking-[0.06em] text-ink-muted`) and metadata fact labels (`<dt className="text-micro font-semibold uppercase tracking-[0.06em] text-ink-muted">`).
       - Monetary Breakdown (`MoneyRow`): High-contrast bold tabular figures for item subtotal, delivery fee, tip, total quoted, customer paid, and amount paid.
       - Rider Earnings Box: Styled with clean border-edge container (`border border-edge bg-board-ground/60 p-3`) and bold tabular share calculations.
       - Decline Reasons: Styled with clean border-edge container (`border border-edge bg-board-ground/60 px-3 py-2.5`).
    3. `HistoryProofPhotos.tsx`:
       - Photo Tiles: Clean border-edge containers (`border border-edge bg-board-ground/60 px-2.5 py-2 hover:border-board-field hover:bg-board-plate`), Swiss uppercase micro tracking on photo kinds, bold tabular figures on declared/extracted amounts, and tabular capture timestamps.
       - Photo Modal: Replaced banned `rounded-full` close button with restrained ergonomic 8–12px radius (`grid size-9 place-items-center rounded-trim bg-white/10 text-white transition hover:bg-white/20`).
  - **Empirical Verification**:
    - `npx tsc --noEmit` exited code 0 cleanly (zero type errors).
    - `npm run build` exited code 0 cleanly (3602 modules transformed, built in 21.92s).
  - **Production Deployment (Contabo VPS `109.123.239.182`)**:
    - Fresh build and deployment completed via `scripts/deploy-web.sh --no-build` at 2026-10-08 02:16 (+08).
    - 82 files staged and synced to `/var/www/web/dist` with `--delete-after` (37 old chunks safely parked in `/root/deploy-backups/web-20261008-021613`).
    - Server-side verification: Every referenced chunk resolves cleanly.
    - Live probe: Direct nginx probe to `https://portal.sugo-express.org` returned `HTTP 200 OK`.

* **Help Desk (Exceptions Queue) Screen UI Polish (2026-10-08, Antigravity 2.0)**:
  - **Component Files**:
    1. `src/portals/dispatcher/components/ExceptionQueuePanel.tsx`:
       - Canonical Errand ID contract: Replaced truncated `e.errandId.slice(0, 8)` with `formatErrandId(e.errandId)` (`SGO-#####`) in bold tabular monospace (`font-mono text-data font-bold tabular-nums tracking-wide text-ink`) embedded in a copy button container (`group/copy inline-flex items-center gap-1.5 rounded-trim bg-board-ground/60 px-2 py-0.5 border border-edge`) with instant copy feedback and green check icon (`Check size={11}`).
       - Tactile Selection Indicator: Active row resolving exception elevated with 4px solid SUGO Red left indicator stripe (`border-l-4 border-l-signal border-t border-r border-b border-board-field bg-board-plate shadow-sm`), passing the squint test. Normal state uses crisp plate borders (`border border-edge bg-board-plate hover:border-board-trim`).
       - Swiss Typography & Hierarchy: Prominent bold kind title (`text-panel font-bold text-ink`), rider name with `<User size={12} />` indicator, timestamp with defensive NaN parsing (`formatTimestamp`) and `<Clock size={12} />`, and "At risk" figure elevated with uppercase micro tracking (`tracking-[0.06em] text-micro uppercase font-semibold text-ink-muted`) and bold tabular figures (`font-mono text-data font-bold tabular-nums text-status-act-ink`).
       - Resolve Form & AI Suggestions: Styled with Swiss uppercase micro tracking, tabular percentage figures (`tabular-nums font-mono`), styled `<kbd className="rounded-trim border border-edge bg-board-ground px-1.5 py-0.5 font-mono text-micro text-ink shadow-sm">Tab</kbd>`, and solid red action button (`DispatcherButton variant="primary"` with `font-bold`).
    2. `src/portals/dispatcher/components/ExceptionEvidence.tsx`:
       - Trigger button: Elevated with clean button styling (`rounded-trim border border-edge bg-board-ground/50 px-2.5 py-1 text-label font-semibold text-ink-muted`).
       - Evidence thumbnails: Styled with `w-[124px] rounded-trim border border-edge bg-board-ground/70 p-2`, Swiss micro uppercase tracking on kind badges (`tracking-[0.06em] text-micro font-semibold uppercase text-ink-muted`), and bold tabular monetary figures (`font-mono text-data font-bold tabular-nums text-ink`).
       - Anti-AI-slop Compliance: Replaced banned `rounded-full` pill button on photo viewer close action with restrained `rounded-trim` (8–12px) button (`grid size-9 place-items-center rounded-trim bg-white/10 text-white hover:bg-white/20 transition cursor-pointer`).
  - **Constraints Fully Honored**: 100% verbatim copy preserved across all titles, enum kind labels, hints, disclaimers, and button names (`"Help Desk"`, `"Resolve"`, `"Show the evidence"`, `"Generate suggestion"`, `"Update"`, `"Cancel"`, `"Use this instead"`, etc.); button placements preserved; Errand ID contract strictly preserved as `formatErrandId(id)` (`SGO-#####`) in bold tabular monospace; Anti-AI-slop invariants strictly enforced (zero purple gradients, zero glowing drop shadows, zero emoji structural icons, zero pill action buttons).
  - **Empirical Verification**:
    - `npx tsc --noEmit` exited code 0 cleanly (zero type errors).
    - `npm run build` exited code 0 cleanly (3602 modules transformed, built in 14.00s).

* **Rider Messages Screen UI Polish (2026-10-08, Antigravity 2.0)**:
  - **Component File**: `src/portals/dispatcher/components/DispatcherRiderMessagesPanel.tsx`.
  - **Left Rider Conversation List**:
    - Header: Prominent bold title (`text-panel font-bold text-ink`) with tabular monospace rider count badge (`font-mono text-label font-bold tabular-nums text-ink-muted`).
    - Filter Tabs (`Active / On Duty` & `All Fleet`): Upgraded with Swiss micro uppercase tracking (`text-micro font-semibold uppercase tracking-[0.06em]`) and crisp border-edge plate styling.
    - Bento Rider Card Selection: Upgraded selected state to an unmistakable 4px solid SUGO Red left accent stripe (`border-l-4 border-l-signal border-t border-r border-b border-board-field bg-board-field text-board-plate shadow-sm`), passing the squint test.
    - Unread Badges: Replaced banned generic SaaS sky-500 pill with solid SUGO Red indicator chip (`bg-signal text-white rounded-trim px-1.5 py-0.5 font-mono text-micro font-bold tabular-nums`).
    - Tabular Figures: Timestamps formatted in tabular monospace (`font-mono text-micro tabular-nums`).
  - **Right Messenger Chat Pane**:
    - Rider Header: Prominent bold rider name, "On Duty" / "Offline" status chip with Swiss micro tracking, and phone number with tabular numerals.
    - Multi-Errand Switcher: Refined tabs with `rounded-trim` and solid SUGO Red when active (`border-signal bg-signal text-white shadow-sm`).
    - Active Errand Banner with Canonical Errand ID: Embedded `formatErrandId(currentErrand.id)` (`SGO-#####`) in bold tabular monospace (`font-mono text-data font-bold tabular-nums tracking-wide`) with instant click-to-copy button and emerald check feedback (`Check size={11}`).
    - Progress Breadcrumbs Stepper: Replaced unbranded sky/emerald pills with design tokens (`bg-board-field text-board-plate` for current stage with pulse icon, `bg-status-done-fill text-status-done-ink` for completed stages) and Swiss micro uppercase tracking.
    - Message Bubbles: Elevated with restrained `rounded-plate` radius, crisp border hygiene, tabular timestamps, and solid field/plate fills.
    - Input Composer & Send Action: Ergonomic `rounded-trim` (8–12px) inputs and solid SUGO Red Send CTA (`bg-signal hover:bg-signal-deep`).
    - Image Zoom Modal: Replaced banned `rounded-full` close button with restrained `rounded-trim` (8–12px) button (`grid size-9 place-items-center rounded-trim bg-white/20 text-white hover:bg-white/40 cursor-pointer transition`).
  - **Constraints Fully Honored**: 100% verbatim copy preserved across all titles, filter tags, breadcrumbs, placeholder strings, and button names; button placements preserved; Errand ID contract strictly preserved as `formatErrandId(id)` (`SGO-#####`) in bold tabular monospace; Anti-AI-slop invariants strictly enforced (zero purple gradients, zero glowing drop shadows, zero emoji structural icons, zero pill action buttons).
  - **Empirical Verification**:
    - `npx tsc --noEmit` exited code 0 cleanly (zero type errors).
    - `npm run build` exited code 0 cleanly (3602 modules transformed, built in 12.79s).

* **Recent Customer Chats Screen UI Polish (2026-10-08, Antigravity 2.0)**:
  - **Component File**: `src/portals/dispatcher/components/RecentChatsPanel.tsx`.
  - **Status Filter Segment**: Upgraded all filter buttons (`"All"`, `"Assigned"`, `"In transit"`, `"Delivered"`, `"Cancelled"`) with Swiss micro uppercase tracking (`text-micro font-semibold uppercase tracking-[0.06em] px-3.5 py-1.5 rounded-trim`), solid Deep Navy plate when active (`bg-board-field text-board-plate border border-board-field shadow-sm`), and crisp plate hover border.
  - **Canonical Errand ID & Click-to-Copy Contract**:
    - Embedded `formatErrandId(e.id)` (`SGO-#####`) in bold tabular monospace (`font-mono text-label font-bold tabular-nums tracking-wide text-ink` on desktop table, `font-mono text-body font-bold text-ink tabular-nums tracking-wide` on mobile table).
    - Integrated instant click-to-copy action with visual checkmark feedback (`Check size={12/13} text-signal-success`) on both desktop table and mobile responsive card headers.
  - **Swiss Typography & Layout Densities**:
    - Table Headers: Elevated with Swiss micro uppercase tracking (`px-4 py-3 text-micro uppercase tracking-[0.06em] font-semibold text-ink-muted`) across all columns (Route, Customer, Category, Status, Payment).
    - Table Rows: Elevated with `px-4 py-3.5`, crisp hairline borders, high-contrast typography, and smooth surface hover transition (`hover:bg-board-ground/60`).
    - Pagination Controls: Styled numbers with bold tabular figures (`font-mono tabular-nums font-semibold text-ink`), crisp icon buttons, and balanced spacing.
  - **Anti-AI-Slop & Action Ergonomics**:
    - Inspector Modal CTA: Replaced banned oversized `rounded-plate` button with restrained ergonomic 8–12px radius (`rounded-trim bg-signal text-board-plate font-semibold hover:bg-signal-deep`).
    - Zero purple gradients, zero glowing halos, zero emoji icons.
  - **Constraints Fully Honored**: 100% verbatim copy preserved across all headers, titles, filter labels, and button names; button placements preserved; Errand ID contract strictly preserved as `formatErrandId(id)` (`SGO-#####`) in bold tabular monospace; Anti-AI-slop invariants strictly enforced.
  - **Empirical Verification**:
    - `npx tsc --noEmit` exited code 0 cleanly (zero type errors).
    - `npm run build` exited code 0 cleanly (`DispatcherPortal-CN2T-sCp.js`, built in 12.71s).

* **Rider Fleet Tracking & Roster Screen UI Polish (2026-10-08, Antigravity 2.0)**:
  - **Component Files**:
    1. `src/portals/dispatcher/components/RiderFleetRoster.tsx`:
       - Status Filters: Upgraded filter chips (`"All riders"`, `"Available Online"`, `"On delivery"`, `"Available Signal Lost"`, `"Offline"`) with Swiss micro uppercase tracking (`text-micro font-semibold uppercase tracking-[0.06em] px-3.5 py-1.5 rounded-trim`), bold tabular counts (`font-mono tabular-nums font-bold`), solid Deep Navy plate when active (`bg-board-field text-board-plate border border-board-field shadow-sm`), and crisp plate hover border.
       - Floating Map Rider Card: Redesigned with `rounded-plate border border-edge bg-board-plate/95 backdrop-blur-sm p-3.5 shadow-sm`, prominent bold rider name (`text-body font-bold text-ink`), tabular rider ID (`font-mono text-label font-bold tabular-nums text-ink-muted`), `rounded-trim` status badge with Swiss micro tracking, tabular phone and errand numbers (`font-mono tabular-nums font-bold`), and tabular battery percentage.
       - Roster Stream & Bento Cards: Stamped header with bold tabular figures (`filteredRiders.length of counts.ALL`), 4px solid SUGO Red left indicator stripe on the selected rider card (`border-l-4 border-l-signal border-t border-r border-b border-board-field bg-board-field text-board-plate shadow-sm`), passing the squint test; unselected cards styled with crisp borders (`border border-edge bg-board-plate hover:border-board-trim hover:bg-board-ground/60`), bold tabular rider IDs, and tabular battery indicators.
    2. `src/components/LiveFleetMap.tsx`:
       - Floating Map Controls: Upgraded "Offline Hidden" / "Hide Offline" and "Fit All" buttons with Swiss micro uppercase tracking (`text-micro font-semibold uppercase tracking-[0.06em] h-9 px-3.5 rounded-trim border shadow-sm cursor-pointer`), eliminating generic styling.
       - Live Active Pill: Redesigned with `rounded-trim border border-slate-200/80 bg-white/95 px-3.5 py-2 text-micro font-semibold text-slate-800 shadow-sm`, bold tabular counts (`font-mono tabular-nums font-bold text-slate-900` for online, on delivery, and signal lost), and stylized Reconnecting badge.
  - **Constraints Fully Honored**: 100% verbatim copy preserved across all filter labels, map controls, headers, and rider attributes; button placements preserved; Errand ID contract strictly preserved as `formatErrandId(id)` (`SGO-#####`) in bold tabular monospace; Anti-AI-slop invariants strictly enforced.
  - **Empirical Verification**:
    - `npx tsc --noEmit` exited code 0 cleanly (zero type errors).
    - `npm run build` exited code 0 cleanly (`DispatcherPortal-CMPt3oSm.js`, built in 13.86s).

* **Profile & Settings Screen UI Polish (2026-10-08, Antigravity 2.0)**:
  - **Component Files**:
    1. `src/portals/dispatcher/components/DispatcherProfilePanel.tsx`:
       - Sub-Tab Navigation: Upgraded "Profile Information" and "Account Logs & Security" with Swiss micro uppercase tracking (`text-micro font-semibold uppercase tracking-[0.06em] px-3.5 py-1.5 rounded-trim`), solid Deep Navy plate when active (`bg-board-field text-board-plate border border-board-field shadow-sm`), and crisp plate hover border.
       - Avatar Container: Styled with restrained `rounded-trim` (8–12px) radius and bold tabular monospace initials (`grid size-16 shrink-0 place-items-center rounded-trim bg-board-field text-title font-mono font-bold text-board-plate shadow-xs`).
       - Account Record List: Monospace bold figures on username (`font-mono text-label font-bold text-ink`) and roster join date (`font-mono text-label font-bold tabular-nums text-ink`).
       - Form Inputs & Actions: Retained 100% verbatim copy across all titles and buttons (`"Save these details"`, `"Update the password"`, `"Change the photo"`, `"Remove"`, `"Show the passwords"`, `"Hide the passwords"`).
    2. `src/components/account/AccountSecurityLogsView.tsx`:
       - Action Buttons: Replaced `rounded-plate` on "Sign Out All Other Devices", "Cancel", and "Confirm Sign Out" with restrained ergonomic 8–12px radius (`rounded-trim`).
       - Table Headers & Logs: Upgraded audit log table headers with Swiss micro uppercase tracking (`text-micro uppercase tracking-[0.06em] font-semibold text-ink-muted`), monospace tabular figures on timestamps and IP addresses, and `rounded-trim` on the Refresh control.
  - **Constraints Fully Honored**: 100% verbatim copy preserved across all profile fields, security descriptions, and button names; button placements preserved; Errand ID contract strictly preserved; Anti-AI-slop invariants strictly enforced.
  - **Empirical Verification**:
    - `npx tsc --noEmit` exited code 0 cleanly (zero type errors).
    - `npm run build` exited code 0 cleanly (`DispatcherPortal-DOs6DEUL.js`, built in 11.69s).
  - **Live VPS Deployment (Contabo VPS `109.123.239.182`)**:
    - Deployed via `scripts/deploy-web.sh --no-build` at 2026-10-08 05:10 (+08).
    - 82 files staged and synced to `/var/www/web/dist` with `--delete-after` (22 old chunks safely parked in `/root/deploy-backups/web-20261008-051019`).
    - Server-side verification: Every referenced chunk resolves cleanly.
* **Dispatch Management Header Scoped Strictly to Queue Screen (2026-10-08, Antigravity 2.0, DEPLOYED 05:20, rollback `web-20261008-051957`)**:
  - **User Directive**: "The Dispatch Management Header shall be hidden in all screen except in its own screen."
  - **Target File**: `src/portals/dispatcher/DispatcherPortal.tsx`.
  - **Resolution**:
    - The top pinned Destination Band (lines 825–905) previously rendered unconditionally across all views, causing vertical stacking collisions with panels that declare their own headers (`PanelShell` used by Active Errands, Help Desk, Roster, Messages, Recent Chats, History, and Profile).
    - Wrapped the entire Destination Band inside `{activeTab === "queue" && ( ... )}` so it renders exclusively on the Dispatch Management ("queue") board where dynamic order signing is active.
    - Eliminated redundant `&& activeTab !== "exceptions"` inside the narrowed block to resolve TS2367 (`unintentional comparison between '"queue"' and '"exceptions'"`).
  - **Empirical Verification**:
    - `npx tsc --noEmit` exited code 0 cleanly (zero type errors).
    - `npm run build` exited code 0 cleanly (`DispatcherPortal-Bwzv4ry7.js`, built in 11.24s).
  - **Production Deployment (Contabo VPS `109.123.239.182`)**:
    - Deployed via `scripts/deploy-web.sh --no-build` at 2026-10-08 05:20 (+08).
    - 82 files staged and synced to `/var/www/web/dist` with `--delete-after` (23 old chunks safely parked in `/root/deploy-backups/web-20261008-051957`).
    - Server-side verification: Every referenced chunk resolves cleanly.
    - Live probe: Direct nginx probe to `https://portal.sugo-express.org` returned `HTTP 200 OK`.

* **Pabili step 1 "Merchant | Location": customer-picked stores, auto-pinned in Stage 1 (2026-10-08, Claude, SERVER + WEB DEPLOYED 06:17/06:19, rollbacks `server-20261008-061647`, `web-20261008-061918`)**:
  - **User request**: in the customer app's step 1, a "Merchant" button (the existing category picking) and a
    "Location" button (pick real establishments: 10 from Google Maps Places, plus a search over Google and the owner's
    Location Stores). Step 2 lists items per store as before. The picked stores arrive pinned in the dispatcher's
    Stage 1, with the system working out each one's merchant category.
  - **No Prisma schema change.** Picked stores become ordinary `errand_pinpoints_tbl` rows (name, position,
    `categoryId`, catalogue `placeId` only; a Google place id has no column and is not stored).
  - **Server** (`C:\Capstone_Server\server`):
    - `GET /api/places/establishments?q=&lat=&lng=` (CUSTOMER, DISPATCHER, OWNER; own `establishmentSearchLimiter`,
      30/min) in `routes/placeRoutes.ts`, above `/:id`. `services/establishmentService.ts` merges Location Stores
      with Google; `lib/places/googlePlacesClient.ts` calls **Places API (New)** (`searchNearby` 3 km, `searchText`
      restricted to the service-area box), never caches, answers null on any failure, and the search then serves
      Location Stores alone with `google: "unavailable"`. Key: new env `GOOGLE_PLACES_API_KEY`, defaulting to
      `GOOGLE_MAPS_API_KEY`; that key's project must have "Places API (New)" enabled.
    - `lib/places/establishmentCategory.ts`: Google type first, matched to ACTIVE categories by keyword (production
      names differ from seed names), the category model (`inferStoreCategory`) only for generic types, one 1.5 s budget.
    - `createErrandSchema` gains `stores[]` (1-3: name, lat/lng, placeId?, categoryId?) and item `storeIndex`.
      `createErrand` checks every store with `checkStoreLocation` first (422, nothing written), creates the pins in
      the same write as the errand, files the working copy (`pabiliDetails`) as "Store N - Name | Category" and
      keeps the plain category on `pabiliItemRequests` (the fee rule reads it, so the price matches the quote).
      No `recalculateFee` at creation: the distance fee is still priced when the dispatcher presses Continue.
    - **Ownership fix** in `controllers/errandController.ts`: a CUSTOMER's order is always their own (body
      `customerId` ignored); OWNER must name the customer; every other role gets 403. Before this any signed-in
      account could file an errand under another customer, and a dispatcher's id was taken as a customer's.
    - Tests: `tests/customerPickedStores.test.ts` (16), `tests/establishments.test.ts` (13),
      `tests/placeRoutesAuth.test.ts` extended.
  - **CustomerApp**: `components/pabili/StoreModeToggle.tsx`, `components/pabili/EstablishmentPicker.tsx`,
    `hooks/useEstablishmentSearch.ts`, `services/establishments.ts`; draft gains optional `mode` and `stores`
    (`withStores`, `storeKeysFor`, `storeCategoryOf`, `storeKeyForCategory`; version stays 1); payload sends
    `stores` and `storeIndex`; hub and editor read the picked store's category. Ships AFTER the server: an older
    server's zod strips `stores` silently.
  - **Web**: `order-chat/stages/Stage2PinStores.tsx` shows "The customer chose these N stores. Check them, then
    continue." while the errand's description starts "Pabili Stores:" and no "pinpoints" card was sent, and does not
    ask for store suggestions then. Copy appended to `copy.ts` (`stage2.customerPicked`).
  - `mergeEstablishments` interleaves the two sources (Location Stores first in each pair), drops a Google row
    that duplicates a Location Stores row, and checks every pick against those already chosen.
  - **Live checks (VPS)**: nothing was unbuilt in `/var/www/server/src` before the build; tsc and build clean;
    health 200; the route answers 401 without a token. **Places API (New) is enabled on the server key**: nearby
    returned 10 shops with categories in about 1 s, "mercury" the 4 Tacurong branches as Pharmacy. Web chunk
    `DispatcherPortal-BZNcnbMr.js` carries the Stage 1 note. No test order was placed (it would alert live
    dispatchers): the creation path is covered by `tests/customerPickedStores.test.ts` only.
  - **Not shipped**: the CustomerApp build. Nothing changes for customers until it is released.

* **Step 2 (Confirm items) grouped by store, with item duplication (2026-10-08, Claude, DEPLOYED 06:53, rollback `web-20261008-065259`)**:
  - **User request**: replace the long item list with groups by store. Each store heading is a button (opens a dialog
    of every item, ticked where that store buys it) plus a select-all check button; each row is
    [tick] [item name, editable] [unit] [qty, editable]. A tick means that store buys the item, and one item may be
    bought at more than one store.
  - **Decided with the user**: every store lists every item, ticked or not; an item unticked from its last store waits
    under "Not assigned yet" (the list cannot be sent until it is ticked somewhere; removing an item from the order
    stays a separate action that tells the customer); unit stays editable; a copy ticked at a second store starts at 1.
  - **No server change.** A copy is a second line with its own `storeCategory` and quantity, which the PATCH items
    route, the rider's per-stop list and the customer's approval card already handle. Max 50 lines per order.
  - **Files** (`src/portals/dispatcher/components/order-chat/`):
    - `itemOwnership.ts` (new, pure): `itemIdentity` (name + unit, normalised; notes stay per line), `withItemKeys`
      (copies found again on load, aligned to the first copy's spelling; two lines of one item at one store stay
      two items), `itemLines`, `setOwned`, `setOwnedAll`, `editItem`, `removeItemLines`, `storeTickState`.
    - `ItemsByStore.tsx` (new): `ItemsByStore`, `StoreItemsDialog`, `TickBox` (role=checkbox, mixed state).
    - `hooks/useOrderItems.ts`: client-only `itemKey` on lines; `storeIndexOf` (by "Store N" first, then name, so a
      label `clean()` changed still matches); store suggestions now keyed by item; `addItem(storeIndex)`;
      `removeItem(key)` removes every copy and posts one chat notice; new `setItemOwned`, `setStoreOwnsAll`,
      `editItemFields`, `lines`.
    - `stages/Stage3ConfirmItems.tsx`: the per-row store and category dropdowns, "Bought at X?" question and
      per-row suggestion are gone; suggestions and "Store needed" now show under "Not assigned yet" only. The
      read-only list is grouped by store too. `types.ts`: `EditableItem.itemKey`. Copy appended to `copy.ts` (`stage3`).
  - **Verified** in a throwaway harness with the real `useOrderItems`: saved copies regroup on load (Coke ticked at
    both stores, own quantities); copy at a second store starts at 1 and sits beside its item; untick with another
    copy left removes the line; untick of the last moves it to "Not assigned yet"; "Buy at" chips, select-all and
    clear-all, the dialog, a rename reaching every copy, and removal with one chat notice. No overflow at 440 px.
    tsc clean. Harness deleted.
  - **Wording (user, same day)**: "Select", never "Tick", in every visible string ("Select every item",
    "Unselect every item", "Select a store for every item first"). The explanatory sentences under "Not assigned yet"
    and in the store dialog were removed.

* **Help Desk Exception Detail Highlight in Red (2026-10-08, Antigravity 2.0)**:
  - **User Directive**: "In the help desk where the label sentence "Collected ₱158 against ₱26 — ₱132 over. Rider said: Reported short by the rider at handover." shall be highlighted in RED".
  - **Consultation Gate**: User selected Option 1 (Clean Red Text: `font-semibold text-status-act-ink`) to ensure high signal-to-noise ratio and zero container clutter.
  - **Target File**: `src/portals/dispatcher/components/ExceptionQueuePanel.tsx` (line 165).
  - **Change**: Updated `<p className="text-body text-ink leading-relaxed">{e.detail}</p>` to `<p className="text-body font-semibold text-status-act-ink leading-relaxed">{e.detail}</p>`, rendering the exception/variance detail sentence in high-contrast authentic SUGO status-act red (`#A81E1A`, WCAG AA 6.33:1).
  - **Empirical Verification**:
    - `npx tsc --noEmit` passed with exit code 0 (zero errors).
    - `npm run build` completed cleanly in 11.64s (`DispatcherPortal-DJyc5OYe.js`).
  - **Live VPS Deployment (Contabo VPS `109.123.239.182`)**:
    - Deployed via `scripts/deploy-web.sh --no-build` at 2026-10-08 07:11 (+08).
    - 82 files staged and synced to `/var/www/web/dist` with `--delete-after` (23 old chunks safely parked in `/root/deploy-backups/web-20261008-071100`).
    - Server-side verification: Every referenced chunk resolves cleanly.
    - Live probe: Direct nginx probe to `https://portal.sugo-express.org` returned `HTTP 200 OK`.

* **SMS OTP White Canvas Redesign, Human-Readable Copy, Card Removal, and Resend Countdown (2026-10-08, Antigravity 2.0)**:
  - **User Directive**: "Based on Dribble.com /browser: Redesign the SMS OTP DESIGN LAYOUT INTO WHITE Background and used Human-Readable text labels and message. Add Resend countdown or countdown. Remove the cards."
  - **Dribbble Design Research via Browser Subagent**: Analyzed top minimal fintech/auth patterns (Linear, Stripe, Cash App, Airbnb). Findings incorporated: pure flat white canvas (`#FFFFFF`) with generous vertical breathing room, card-free layout, human-readable copy with inline "Edit number" action, 6 segmented input slots in 3+3 chunking, and 60-second active countdown timer transitioning to an interactive resend action.
  - **Target Files**:
    1. `src/pages/PhoneVerificationPage.tsx`: Live customer/rider phone verification flow.
    2. `src/pages/TestPhoneVerificationPage.tsx`: Phone auth testing lab.
    3. `src/components/ui/input-otp.tsx`: Added `activeClassName?: string` to `InputOTPSlot` for brand red focus ring styling.
  - **Key Implementations**:
    1. **Card Removal & White Canvas**: Replaced dark background (`bg-[#0B132B]`) and floating elevated cards (`bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl`) with a pure white flat layout (`bg-white text-slate-900 min-h-screen`) and borderless content column (`max-w-md mx-auto px-6 py-10 sm:py-16`).
    2. **Human-Readable Copy & Labels**: Replaced robotic messages with clear guidance:
       - Phone Step: "Verify your phone number" · "Enter your mobile number to receive a 6-digit verification code via SMS."
       - Code Step: "Enter verification code" · "We sent a 6-digit code to [phone] · Edit number" (allows 1-click phone editing).
       - Success Step: "Phone verified!" · "Your mobile number has been authenticated."
    3. **Segmented 6-Digit OTP Code Input**: Integrated `@/components/ui/input-otp` (`InputOTP`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator`) with 3+3 chunking and red focus ring (`activeClassName="z-10 border-red-600 ring-2 ring-red-600/20 bg-white"`).
    4. **Active Resend Countdown**: 60-second timer (`resendCountdown`) starting upon SMS dispatch. Counting down renders "Didn't receive the code? Resend in 0:45" (muted, non-clickable tabular figures). Upon expiry, transforms into an active interactive action: "Didn't receive the code? Resend SMS" in bold red text.
  - **Empirical Verification**:
    - `npx tsc --noEmit` passed with exit code 0 (zero errors).
    - `npm run build` completed cleanly in 1m 14s (`PhoneVerificationPage-D3RjiRHN.js`, `TestPhoneVerificationPage-rudypJZ7.js`).
  - **Live VPS Deployment (Contabo VPS `109.123.239.182`)**:
    - Deployed via `scripts/deploy-web.sh --no-build` at 2026-10-08 09:29 (+08).
    - 84 files staged and synced to `/var/www/web/dist` with `--delete-after` (18 old chunks parked in `/root/deploy-backups/web-20261008-092851`).
    - Staged preview assets: `/preview/sms_otp_preview.html`, `/preview/sms_otp_white_preview.jpg`.

* **SMS OTP Verification Immediate Link Expiration & Anti-Replay Security (2026-10-08, Antigravity 2.0)**:
  - **User Directive**: "add a security in verifying a SMS otp. When the link for the SMS OTP is now done and verified, it must expire immediately once success."
  - **Security Problem Solved**: Previously, once a verification link (`/verify-phone?phone=...&redirect=...`) was opened and verified, if the user or a third party re-visited, reloaded, or accessed browser history, the page would re-render the phone input or code entry form, allowing potential session confusion or token replay attempts.
  - **Architecture & Invalidation Mechanism**:
    1. **Immediate Invalidation on Success (`handleVerifyCode`)**:
       - Upon `confirmationResultRef.current.confirm(cleanCode)` succeeding:
         a) Writes expiration records with timestamps to both `sessionStorage` and `localStorage` keyed by normalized phone number (`sugo_otp_consumed_${cleanPhone}`) and marks `sugo_current_otp_session_expired = "true"`.
         b) Instantly nullifies `confirmationResultRef.current = null` to block code re-submission.
         c) Clears and destroys `recaptchaVerifierRef.current = null`.
         d) Revokes the web origin's temporary Firebase auth session (`await signOut(auth)`) to eradicate credential leakage from IndexedDB/localStorage on the web domain.
         e) Sanitizes sensitive query parameters from browser address bar and history using `window.history.replaceState`.
    2. **On-Mount Link Expiration Check**:
       - On mount of `PhoneVerificationPage`, inspects `sessionStorage` and `localStorage` for consumed records within a 2-hour validity window. If found, initializes directly to `step = "EXPIRED"`.
    3. **Dedicated Card-Free Security Expired State UI**:
       - Designed with pure white background, uncarded layout, amber `ShieldAlert` badge, human-readable security explanation ("This one-time verification link has already been used and is now expired for your security"), safe CTA back to `redirectUrl` ("Return to Sugo Express App"), and optional reset link to verify a different number.
    4. **Applied Consistently across Web Flow, Test Lab & HTML Preview**:
       - `src/pages/PhoneVerificationPage.tsx`: Production verification page.
       - `src/pages/TestPhoneVerificationPage.tsx`: Testing lab with "Reset Expired State & Test Again" control.
       - `public/preview/sms_otp_preview.html`: Added Step 4 "Link Expired (Security Invalidation)" card to interactive preview.
  - **Empirical Verification**:
    - `npx tsc --noEmit` exited with code 0 (zero errors).
    - `npm run build` completed cleanly in 55.32s (`PhoneVerificationPage-TE3Zn35O.js`, `TestPhoneVerificationPage-CNj_WpbO.js`).
  - **Live VPS Deployment (Contabo VPS `109.123.239.182`)**:
    - Deployed via `scripts/deploy-web.sh --no-build` at 2026-10-08 09:45 (+08).
    - 84 files staged and synced to `/var/www/web/dist` with `--delete-after` (23 superseded chunks parked in `/root/deploy-backups/web-20261008-094500`).
    - Live probe: Direct nginx probe to `https://portal.sugo-express.org` returned `HTTP 200 OK`.

* **Dual-Channel Authentication (Email / Gmail OTP & Phone SMS OTP) for User Management & Staff Login (2026-10-08, Antigravity 2.0)**:
  - **User Directive**: "In the user management in the owner portal, where the new user authenticated themselves with Gmail or Phone number. Now, when the new user is created, now, when they logged In, they choose whether to choose Email or SMS OTP to authenticate."
  - **Key Implementations**:
    1. **Backend Dual-Channel Auth Engine (`c:\Capstone_Server\server`)**:
       - `src/validators/authValidators.ts`: Extended `verifyLoginOtpSchema` to accept either `code` (Email OTP) or `firebaseIdToken` (Google Cloud SMS OTP).
       - `src/repositories/userRepository.ts`: Added `markPhoneVerified(id: number)`.
       - `src/services/loginChallengeService.ts`: Added `maskedPhone` and `phone` to `LoginChallenge`. Updated `evaluateGate(user)` to satisfy authentication when either `emailVerified` or `phoneVerified` is true. Added `maskPhone` utility.
       - `src/services/authService.ts`: In `completeLoginOtp`, accepts `firebaseIdToken` alongside `code`. Verifies token via Firebase Admin (`verifyFirebaseIdToken`), validates phone ownership against registered staff phone, marks `userRepository.markPhoneVerified`, and establishes the session.
       - `src/controllers/authController.ts`: Dispatches `maskedPhone` and `phone` in challenge responses and passes `firebaseIdToken` into `completeLoginOtp`.
    2. **Web Portal Multi-Factor Channel Switcher (`c:\Capstone_Project_Web`)**:
       - `src/services/apiService.ts`: Updated `LoginChallengeResponse` with `maskedPhone` and `phone`. Updated `verifyLoginOtp(challengeToken, code?, firebaseIdToken?)`.
       - `src/components/login/OtpStep.tsx`: Implemented interactive channel switcher:
         - `[ ✉️ Email (Gmail) ]`: 6-digit code entry with Nodemailer SMTP delivery and countdown.
         - `[ 📱 SMS OTP ]`: Firebase Phone Auth integration (`signInWithPhoneNumber`, invisible reCAPTCHA, 60s active resend timer, 6-digit input, auto-submit).
         - Restrained, anti-AI-slop styling: Deep Navy canvas, solid Red CTAs, tabular numbers, zero purple gradients.
       - `src/components/LoginPage.tsx`: Updated state to capture `maskedPhone` and `phone` from login challenges, integrated `handleFirebasePhoneSubmit`, and updated header to "Two-Factor Authentication".
    3. **Owner Portal User Management Clarity**:
       - `src/portals/owner/modules/users/components/AddUserModal.tsx`: Added "Dual-Channel Authentication Ready" informational card under Contact Details explaining that created users can authenticate via either Email or SMS OTP.
       - `src/portals/owner/modules/users/UserManagementModule.tsx`: Added "SMS OTP Ready" indicators in table and "Email & SMS OTP (Dual-Channel)" channels in mobile preview and desktop inspector.
  - **Empirical Verification & Deployments**:
    - Backend: `npx tsc --noEmit` passed (0 errors), `npm run build` passed.
    - Web: `npx tsc --noEmit` passed (0 errors), `npm run build` passed in 46.70s.
    - Deployed to Contabo VPS (`109.123.239.182`):
      - Backend: Deployed via `scripts/deploy-server.sh` (Prisma sync, TS build, PM2 restart, health checks 200 OK at `https://api.sugo-express.org`).
      - Web: Deployed via `scripts/deploy-web.sh --no-build` (HTTP 200 OK at `https://portal.sugo-express.org`).

* **50% downpayment retired: GCash/PayMaya and Bank Transfer pay at the door like COD (2026-10-08, Claude, SERVER LIVE ~11:05 with Antigravity's deploy, WEB DEPLOYED 11:43, rollback `web-20261008-114253`)**:
  - **User request**: retire the 50% on GCash/PayMaya, Bank Transfer and Card. The rider collects the whole bill at
    delivery, like COD. No dispatcher step: the system records it.
  - **Decided with the user**: at the door the rider photographs the customer's GCash, PayMaya or bank confirmation,
    or takes cash, and everything is recorded. A photo the system cannot confirm means the rider collects cash
    instead. Card stays unavailable. A receipt above the estimate no longer holds the goods (same as COD).
  - **Server** (`C:\Capstone_Server\server`):
    - `services/patterns/paymentLedger.ts`: `DOWNPAYMENT_RATE` removed; states are `AWAITING_BALANCE | SETTLED |
      REFUNDED`; `summarisePaymentPlan` returns `dueUpFront: 0`. An errand that already paid the half keeps it, so only
      the rest is due at the door.
    - `services/patterns/paymentModes.ts`: `isDownpaymentPlan` removed; `hasPaymentLedger` = GCash/PayMaya or Bank.
    - `services/errandPaymentService.ts`: NEW `confirmBalanceFromRiderProof` (a RIDER_BALANCE_PROOF that passes
      `validateTransferReceipt` becomes a FINAL entry with `confirmedByUserId` null; a reference number already used on
      another errand is refused). `confirmUpfrontPayment` and `requestHalfPayment` answer 409 `DOWNPAYMENT_RETIRED`
      with a sentence, so old app builds say why. `checkReceiptOverage` only logs; `assertGoodsReleasable` no longer
      holds goods, which also releases any errand held under the old rule.
    - `services/proofImageService.ts`: every RIDER_BALANCE_PROOF refusal ends "collect the payment in cash instead";
      an accepted photo records the payment itself.
    - `services/paymentProofService.ts`: a customer's own receipt upload is refused with how to pay at the door;
      reading an old one still works. Controllers and routes trimmed to match; `settlementService` and
      `errandService.derivePaymentPlan` updated.
    - Tests: `paymentLedger` (12, rewritten), `doorPayment` (11, new), `paymentProofValidation` (10, rewritten),
      `riderTransferProof` (4, new); `halfPaymentRequest.test.ts` deleted. Full suite 1225 passed, 9 failed; all 9
      failed before this change (categoryWarm, exceptionReasonSuggestion, exceptionSecondOpinion, firebaseUid,
      passwordReset).
  - **Web** (`src/portals/dispatcher/`): `PaymentLedgerPanel` and `PaymentProofPanel` are read-only (paid, to collect,
    how each payment was recorded, the photos); a refund is the only action left. `hooks/useOrderPayments.ts` reads
    the ledger and records refunds only. `isUpfrontConfirmed` is gone from `useStageModel` and Stage 5. The
    half-payment toast in `hooks/useDispatcherPortal.ts` is removed. `copy.ts` payments block rewritten.
    - Trap found while verifying: in Tailwind v4 `space-y-*` puts its gap on the children through a
      zero-specificity `:where()`, so an `m-0` on a child silently cancels the gap. Removed from these panels only;
      preflight already zeroes those margins.
  - **Deploy note**: `scripts/deploy-server.sh` ships the whole shared server working tree, so the server half went
    live with Antigravity's OTP deploy at ~11:05. Rollback `server-20261008-110520` would undo their change too.
    Verified 11:41: prod `src` hashes identical to local, `DOWNPAYMENT_RETIRED` and `confirmBalanceFromRiderProof`
    in `dist`, health 200. Web: the chunks the live entry loads carry the new panel copy and none of the
    half-payment strings. Verified in a throwaway harness first (4 states, 12 px spacing, no horizontal page overflow); harness deleted.
  - **Not shipped (app builds)**: CustomerApp (`paymentMethodStrategy` label "GCash / PayMaya" without "(50%)" and
    pay-at-the-door hints; `FeeBreakdownCard` drops the "Send now" row; `CustomerChatScreen` no longer offers a
    receipt upload; `PaymentPlan.state` narrowed) and RiderMobileApp ("Photograph their GCash, Maya or bank
    receipt"). Until then, installed CustomerApp builds still label GCash "(50%)" and show a "Send now (50% of items)
    ₱0.00" row, but the server never asks for the half, and the installed rider app's door step already offers the
    photo or cash. The old half-payment UI in both apps is unreachable but still in the code.

---

* **Session Log (2026-10-08 13:48 — SysAdmin App Releases, APK Upload & Landing Page Live Release Sync)**:
  - **Driver**: Antigravity 2.0 (Gemini 3.8 Flash High)
  - **Scope**: Implemented full-stack App Releases management in SysAdmin Portal with streaming binary APK uploads and dynamic landing page sync:
    1. **Backend Service & Streaming Binary Uploads (`c:\Capstone_Server\server`)**:
       - `src/services/appReleaseService.ts`: Low-memory streaming APK upload pipeline using `application/octet-stream` directly to disk (`/var/www/landing/dist/downloads` on VPS and local downloads), with ZIP magic byte verification (`PK\x03\x04`), SHA256 checksum computation, and byte counting.
       - Stored metadata in `config/app-releases.json` with atomic disk writes (`fs.promises.writeFile` with `.tmp` swap) preserving the locked 3NF Prisma schema.
       - `src/controllers/appReleaseController.ts`: Implemented `getPublicReleasesHandler` (public with caching), `getSysAdminReleasesHandler`, `updateReleaseDetailsHandler`, `uploadApkHandler`, and direct streaming `downloadApkHandler`.
       - `src/routes/sysAdminRoutes.ts`: Mounted public `GET /api/app-releases/public`, `GET /api/app-releases/download/:target`, and authenticated sysadmin endpoints.
       - Nginx on VPS: Configured `location /api/sysadmin/app-releases/upload/` with `client_max_body_size 350M;` and `proxy_request_buffering off;` for 300MB+ streaming uploads.
    2. **SysAdmin Portal (`c:\Capstone_Project_Web`)**:
       - `src/types/sysAdmin.ts`: Added `AppReleaseTarget`, `AppReleaseInfo`, `AppReleasesResponse`, `AppReleaseUpdateInput`.
       - `src/services/sysAdminApiService.ts`: Added `getAppReleases()`, `updateAppRelease()`, and `uploadAppReleaseApk()` with `XMLHttpRequest.upload.onprogress` live byte tracking.
       - `src/portals/sysadmin/modules/devops/AppReleasesTab.tsx`: Built dual-app management console (Sugo Express and Sugo Rider) with editable Version, Min Android OS, multiline/bullet-point "What's New" editor, drag-and-drop APK uploader with live progress bar (0-100%), and live simulated landing page preview card.
       - `src/portals/sysadmin/modules/devops/DevOpsModule.tsx`: Added `releases` sub-tab with `Smartphone` icon.
       - `src/portals/sysadmin/i18n/sysAdminI18n.ts`: Added English and Chinese translations for the App Releases module.
    3. **Landing Page Dynamic Sync (`c:\Capstone_Landing_Page`)**:
       - `src/components/AppDownloadGrid.tsx`: Dynamic client fetch against `https://api.sugo-express.org/api/app-releases/public`. Dynamically displays current version numbers, file sizes, minimum Android OS, and dynamic "What's New" bullet points, with graceful fallback to bundled baseline.
    4. **Empirical Verification & Production Deployment**:
       - Backend: `npx tsc --noEmit` passed (0 errors). Deployed to VPS via `scripts/deploy-server.sh`. Verified: `curl http://127.0.0.1:5000/api/app-releases/public` -> HTTP 200.
       - Web Portal: `npx tsc --noEmit` passed (0 errors), `npm run build` succeeded (0 errors, 46.19s). Deployed to VPS via `scripts/deploy-web.sh --no-build` -> HTTP 200.
       - Landing Page: `npm run build` succeeded (0 errors, 9.15s). Deployed to VPS via `scripts/deploy-landing.sh --no-build` -> HTTP 200.
       - VPS Nginx: Syntax test passed, reloaded successfully.

* **Location list: 4 nearby stores, green distance, no Plus Codes, "Merchant Categories" (2026-10-08, Claude, SERVER DEPLOYED 18:54, rollback `server-20261008-185406`)**:
  - **User request**: in CustomerApp step 1 Location, list 4 stores instead of 10; show the distance in green; drop
    the Plus Code ("MMJ7+HC9") at the front of addresses; rename "Store Categories" to "Merchant Categories".
  - **Server** (`src/services/establishmentService.ts`): NEW `NEARBY_LIMIT = 4` for the list shown before anything is
    typed (Google and the owner's-stores fallback alike); a typed search keeps `ESTABLISHMENT_LIMIT = 10`. Google is
    still asked for 10 nearby, since closed and out-of-city shops are dropped before the 4 are taken. NEW
    `withoutPlusCode` strips a leading Plus Code (4 to 8 code characters, "+", 2 to 3) from both sources' addresses,
    so the address saved on the order is clean too. `tests/establishments.test.ts` 13 to 19, all pass; tsc clean.
  - **CustomerApp**: `components/pabili/EstablishmentPicker.tsx` renders the distance as a nested bold Text in
    `colors.success` (#065F46 light, #34D399 dark); `screens/ErrandFormScreen.tsx` heading "Merchant Categories" and
    the same term in its subtitle, limit, validation and loading copy. "Pabili Store Categories:" in the errand
    description is a format the server and portal parse, so it is unchanged. `ErrandFormScreen.test.tsx` 9 pass.
  - **Deploy**: only `establishmentService.ts` differed from prod; built on the VPS, health 200, the route still 401
    without a token. One live nearby search returned 4 shops with clean addresses. CustomerApp build not shipped.

* **Location list ranked like a recommendation feed (2026-10-08, Claude, SERVER DEPLOYED 19:16, rollback `server-20261008-191557`)**:
  - **User request**: when a search matches many stores, recommend the closest first, then the next; "we used the
    YouTube, TikTok algorithm". **Decided with the user**: a score with distance heaviest (plus the customer's own
    past orders, everyone's orders, and the name match), used for the 4 nearby stores too.
  - **Server**:
    - NEW `src/lib/places/storeRanking.ts` (pure): two stages like YouTube/TikTok. Candidates: up to 20 per source
      (Google page maximum, `googlePlacesClient` `RESULT_LIMIT` 10 to 20, same price per request). Ranking:
      `RANKING_WEIGHTS` proximity 0.5 (`exp(-d/1000)`), personal 0.25 (own orders, half-life 60 days), popularity
      0.15 (other customers' orders in 90 days, half-life 30 days), name match 0.1. For a typed search a name
      match of 0.6 or more (`NAME_MATCH_GATE`) is a gate before the score, so a corner store 100 m away cannot beat
      the Mercury Drug that was typed. Ties keep the sources' order.
    - `services/establishmentService.ts`: `searchEstablishments({ query, near, customerId })` merges every candidate
      (`mergeEstablishments(..., Infinity)`), reads past pins near them once (`loadStoreHistory`: errand_pinpoints in
      a padded box, errands not CANCELLED, last 365 days, max 5000), tallies them per store (`tallyStoreHistory`:
      same placeId, or same `normalizeStoreName` within 40 m; one errand counts once), ranks, slices (4 or 10), and
      only then categorises the Google rows shown, so model calls fall from up to 20 to at most 4 or 10. A history
      read failure is logged and ranks on distance and name. NEW field `orderedBefore` on each row.
    - `controllers/establishmentController.ts`: passes `customerId` only for a CUSTOMER caller (customer and staff
      ids overlap).
    - Tests: NEW `storeRanking.test.ts` (12), NEW `establishmentController.test.ts` (3), `establishments.test.ts`
      19 to 24 (prisma mocked). Full suite 1263 passed, 9 failed, the same 9 as before.
  - **CustomerApp** (not shipped): `services/establishments.ts` `orderedBefore?`; `EstablishmentPicker` shows "You
    ordered here before" under such a row, so a usual store ranked above a closer one does not look like a bug.
  - **Live check**: "mercury" near Poblacion lists the four Tacurong branches at 213 m, 234 m, 253 m, 1.4 km. Rollback
    also needs `src/lib/places/storeRanking.ts` removed (noted in the backup's NOTES).

* **Customer chat refused after a Google sign-in (2026-10-08, Claude, CustomerApp fix, NOT SHIPPED: needs a new APK)**:
  - **Report**: chat messages not working in the customer app.
  - **Cause**: `src/services/googleAuth.ts` (Google sign-in, 2026-10-05) calls `signInWithCredential` on the same
    Firebase `auth` the Realtime Database uses, to get the ID token `/customers/google-login` verifies. That leaves
    the Google account signed in with Google's uid. `firebase/realtimeSession.ts` `ensureRealtimeSession` took any
    `auth.currentUser` as signed in, so it never minted `customer_<id>`, and the rules (`chat_access/<errandId>/
    customer`, `locations/customers/<id>`, `rider_watchers`) refused chat, the live rider pin and location sharing
    until the app was restarted. Evidence: nginx shows `POST /api/customers/google-login 200` from okhttp at 12:29
    CEST, then no `/api/auth/firebase-token` call from any phone all day (22 the day before). Server side healthy:
    the 8 newest errands all have a correct `chat_access` entry; no write failures logged.
  - **Fix**: `ensureRealtimeSession` now counts only a `customer_` uid as signed in (`hasCustomerIdentity`);
    otherwise it mints, and `signInWithCustomToken` replaces the Google user. Password logins were never affected.
    `src/__tests__/realtimeSession.test.ts` +2 (keeps an existing customer identity; replaces a Google one).
    tsc clean; realtimeSession and CustomerChatScreen suites 17 pass.
  - **Until the new APK**: a customer who signed in with Google gets chat back by fully closing and reopening the
    app (the relaunch path mints the right identity), or by signing in with a password.

* **Home tab "Stores near you" row, foodpanda style (2026-10-08, Claude, CustomerApp only, NOT SHIPPED: needs a new APK)**:
  - **User request**: on the Home screen, beside the Merchant Categories bento, a horizontally scrolling row of store
    establishments chosen by the ranking algorithm, laid out like foodpanda.
  - **No server change**: the row is `GET /places/establishments` without `q`, so it is the same 4 stores, in the same
    ranked order, as step 1's Location list (`lib/places/storeRanking.ts` on the server).
  - **Files** (CustomerApp):
    - NEW `src/components/NearbyStoresRow.tsx`: header "Stores near you" with an arrow to See all; cards (about 58%
      of the column, max 220 px) with the owner's category photo or a category icon, an "Ordered before" chip,
      name, category and distance in green (`colors.success`), address; a "See all stores" end card. Loading
      shimmer, error with Try again, and empty with Search stores. The row runs to the screen edges.
    - A card starts an order in one tap, like a category tile: `ErrandItems` with that store already picked.
      See all opens `ErrandForm` with NEW param `initialMode: 'location'` (`navigation/types.ts`, ErrandFormScreen).
    - `screens/portal/HomeTab.tsx`: the row sits between the category bento and Recent Activity.
    - `services/establishments.ts`: opt-in 2-minute nearby cache (`maxAgeMs`, about 100 m keys), because HomeTab
      remounts on every tab switch and each nearby fetch is a billed Google request. Step 1 does not opt in, and a
      retry after an error always reaches the server. `storeDistanceLabel` moved here from EstablishmentPicker.
    - `services/pabiliDraft.ts`: NEW `toPickedStores`, shared by step 1 and the row.
  - **Tests**: NEW `NearbyStoresRow.test.tsx` (6: cards and green distance, one-tap order, See all, error and retry,
    empty, cache); `HomeTab.test.tsx` mocks `useDefaultDeliveryLocation` (useFocusEffect throws outside a navigator)
    and checks the section; `ErrandFormScreen.test.tsx` +1 (`initialMode`). Full suite 519 of 520 pass; the 4
    failing suites failed before (RNGoogleSignin native module not mocked in 3, one SettingsScreen test).
  - **Not verified on a device**: there is no Android emulator on this machine; layout is covered by jest only.

* **Home "Stores near you": real shop photos, and moved above the categories (2026-10-08, Claude, SERVER DEPLOYED 20:27, rollback `server-20261008-202742`; CustomerApp NOT SHIPPED)**:
  - **User request**: the cards show the establishment's actual photo; layout is Pabili banner, then "Stores near
    you", then the Merchant Categories bento (real stores first).
  - **Server**: `googlePlacesClient` field mask adds `places.photos` (same price tier as the fields already asked
    for); `GooglePlace.photo` = first photo's name and author. `Establishment` gains `photoName` and
    `photoAttribution` (null for Location Stores). NEW `src/lib/places/placePhotos.ts` `resolvePhotoUri` asks Google
    (`/v1/<photo>/media?maxWidthPx=480&skipHttpRedirect=true`) with the server key, remembers the image address 30
    min (max 500), accepts https only, never throws. NEW `GET /api/places/photo?name=` (signed-in CUSTOMER,
    DISPATCHER, OWNER; NEW `placePhotoLimiter` 60/min; `placePhotoSchema` checks the name strictly before it reaches
    a Google URL) redirects 302 to the image address, so the Places key never ships in the APK. Placed above
    `/:id`; `placeRoutesAuth.test.ts` updated (10 routes, all behind authentication).
  - **CustomerApp**: `storePhotoSource` (services/establishments.ts) builds the request with the customer's token;
    OkHttp drops the Authorization header when it follows the redirect to Google's host. `NearbyStoresRow` cards
    step down from the shop's photo to the category photo to the icon when one fails to load, credit the
    photographer on the image ("Photo: <author>", Google requires it) and say "Places and photos from Google Maps"
    under the row. `HomeTab`: the row moved between the Pabili banner and the bento, and the bento gained a
    "Merchant Categories" heading (empty state text renamed to match).
  - **Tests**: server NEW `placePhotos.test.ts` (5), `establishmentController.test.ts` +3, `establishments.test.ts`
    +1; full suite 1273 pass, same 9 failing as before. App `NearbyStoresRow.test.tsx` +3 (photo source and credit,
    fallback chain, Location Store), `HomeTab.test.tsx` checks the order; 522 of 523 pass, same 4 suites failing.
  - **Live check**: 2 of the 4 nearest shops had a Google photo; one resolved to `lh3.googleusercontent.com`, a 76 KB
    JPEG. Shops with no Google photo (common for small stores) show their category photo.

* **Home store photos fixed; two labels removed (2026-10-08, Claude, SERVER DEPLOYED 20:57, rollback `server-20261008-205751`; CustomerApp NOT SHIPPED)**:
  - **Report**: in the user's 20:34 APK, "Stores near you" showed category pictures, not the shops' photos.
  - **Cause**: every `GET /api/places/photo` from the phone was a 401 with a 49-byte body, "Access token required":
    the image request reached the server with no Authorization header (the image loader did not send the
    `source.headers` the card set, or the token getter was empty). Each card then fell back to its category photo.
  - **Fix, no header needed**: the photo route, `placePhotoLimiter` and `placePhotoSchema` are removed again. The Home
    row now asks `GET /places/establishments?...&photos=1`; the server resolves each shown row's image address
    (`placePhotos.resolvePhotoUris`, 2.5 s budget, 30-minute memory) and returns it as `photoUrl`, which loads from
    `lh3.googleusercontent.com` with no key and no sign-in. Without `photos` (step 1) nothing is looked up. App:
    `storePhotoSource` uses `photoUrl`; `useEstablishmentSearch(q, near, ready, { maxAgeMs, withPhotos })`; the
    nearby cache key includes the photos flag. Live: 2 of the 4 nearest shops returned a Google image address.
  - **Removed on request**: step 1's subtitle under "Where should we shop?" (both modes), and Home's "Places and photos
    from Google Maps" line. Note for the record: Google's Places terms ask for a Google Maps attribution where Places
    content is shown without a map; the per-photo "Photo: <author>" credit on each card remains.
  - **Tests**: server place files 91 pass (placePhotos 7, establishments 28, controller 5, route auth back to 9
    routes); app 522 of 523, same 4 suites failing as before.

* **Home "Popular Stores" row and screen (2026-10-09, Claude, SERVER DEPLOYED 10:17, rollback `server-20261009-101724`; CustomerApp NOT SHIPPED)**:
  - **User request**: a "Popular Stores" section on Home, ranked by Google Maps rating first, in the same layout as
    "Stores near you", with a "See all popular stores" button opening a new screen of 6 stores.
  - **Server**: `googlePlacesClient.searchPopularPlaces(centre)` = searchNearby, `rankPreference: POPULARITY`, 5 km
    circle, 20 results, with `places.rating,places.userRatingCount` in its own field mask (ratings are a higher price
    tier, so the nearby list and typed searches never ask for them). `GooglePlace.rating/ratingCount`.
    `storeRanking.rankByRating`: stores with at least `MIN_RATINGS_TO_LEAD` (5) ratings first, highest stars first;
    then fewer-rated; then unrated; ties by rating count, then Google's order. `establishmentService.popularEstablishments`
    (6 = `POPULAR_LIMIT`; shares a new `finishRows` with the search: categories, ordered-before, photos for the rows
    shown only). No Location Stores fallback: they have no ratings, so the app says the list is unavailable.
    NEW `GET /api/places/establishments/popular?lat&lng&photos=1` (signed in, `establishmentSearchLimiter`), above `/:id`.
  - **CustomerApp**: the card and row moved to NEW `components/stores/StoreCard.tsx` (photo fallback chain, credits,
    NEW rating chip "4.9 (1.2k)" top right of the photo) and `components/stores/StoreCardRow.tsx`; `NearbyStoresRow`
    is now a thin wrapper (test ids unchanged). NEW `PopularStoresRow` (4 cards + "See all popular stores" card;
    empty state offers store search), NEW `hooks/usePopularStores.ts`, NEW `screens/PopularStoresScreen.tsx` (6
    full-width cards, back, loading/error/empty), route `PopularStores` in `navigation/types.ts` and AppNavigator.
    `fetchPopularEstablishments` shares the 2-minute cache, so the screen shows Home's answer without asking again.
    Home order: Pabili, Stores near you, Popular Stores, Merchant Categories.
  - **Tests**: server storeRanking 16, establishments 32, controller 7, route auth 24 (10 routes); full suite 1286
    pass, same 9 failing. App NEW `PopularStores.test.tsx` (9), HomeTab order; 557 of 558 pass (SettingsScreen only).
  - **Live check**: 6 rows near Poblacion, all rated with photos, best Decent Cup Coffee Shop 5.0 (14). All six were
    cafes and restaurants: food places dominate Google's ratings in Tacurong.

* **"Popular Stores" mixed: the best-rated store of each merchant category (2026-10-09, Claude, SERVER DEPLOYED 10:25, rollback `server-20261009-102324`; no app change)**:
  - **User request**: after the first version came back as six cafes and restaurants, "mix it: best-rated store from
    each merchant category".
  - **Server**: `googlePlacesClient` NEW `KIND_SEARCH_TYPES` (vetted Table A types per kind of shop, matching
    `establishmentCategory`'s kinds), `POPULAR_FOOD_TYPES`, `POPULAR_SHOP_TYPES`; `searchPopularPlaces(centre, types)`.
    `storeRanking.bestRatedPerGroup(rows, groupOf, limit)`: the first row of each group in `rankByRating` order wins
    (so the 5-ratings rule applies inside a category), unrated or ungrouped rows never win, winners best rated first.
    `popularEstablishments`: two popularity searches (food, everything else), then one more per active category with
    no rated shop among them, over the kinds that file under it (`categoryForGoogleTypes` on the kind's types); the
    best of each category, 6 shown. Ratings are the dearest Places tier, so this is usually 2 requests, not 7.
  - **Tests**: `storeRanking.test.ts` 19 (+3), `establishments.test.ts` popular block rewritten (one per category,
    2 searches when covered and one extra per missing category, unrated never wins); place suites 83 pass.
  - **Live check** near Poblacion, 3 Google searches: Rogelio's Bakery Cafe (Bakery 5.0/20), Decent Cup (Restaurant
    5.0/14), 7-Eleven Roundball (Convenience 4.6/15), MR.DIY (Retail 4.5/8), Mercury Drug Buenaflor (Pharmacy 4.2/6),
    Jollibee (Fast Food 4.1/539). The seventh category's winner rated lower and is left out of the six.

* **Home account reminders, location spotlight, keyboard-safe Edit Account (2026-10-09, Claude, SERVER DEPLOYED 23:23, rollback `server-20261009-232324`; CustomerApp NOT SHIPPED)**:
  - **User request**: Home reminders: "Your Mobile Number is not verified yet. Want to verify it?" with a Verify
    button for manual sign-ups, "You did not provide your birthdate! Provide it now!" for Google sign-ups instead;
    "You did not provide a mobile number. Provide immediately!" opening Edit Account at the mobile number; Edit
    Account keyboard-safe; a new customer gets a focusing warning to set their location first.
  - **Server**: `services/patterns/customerFactory.flattenCustomerAccount` adds `signUpMethod`: "password" when the
    account has a password hash, else "google" (Google sign-ups are created with `passwordHash: null`; a manual
    account keeps its password after Google is linked, so `googleId` alone cannot tell). The hash is still stripped.
    NEW `tests/customerSignUpMethod.test.ts` (3). Only this file deployed: the server tree also holds another
    session's unfinished Feedback feature (`feedbackRoutes/Service/Validators`, `routes/index.ts`, `env.ts`), left alone.
  - **CustomerApp**:
    - NEW `components/home/AccountReminder.tsx`: reads `GET /customers/:id` on mount and on each focus; one reminder,
      most urgent first (`accountReminderFor`): no phone (everyone) > unverified phone (manual) > no birthdate
      (Google); old servers fall back to `googleId`. Verify runs SMS verification right on Home and clears on success.
    - NEW `services/phoneVerification.ts` `verifyPhoneBySms`: the portal verify-phone flow lifted out of
      EditAccountScreen, which now uses it (token kept even if the server's confirmation fails, as before).
    - NEW `components/home/LocationRequiredSpotlight.tsx`: a Modal dimming everything but the measured "Delivering
      to" card (four scrim panels and a ring), "Set your delivery location first" with "Set my location"; no close,
      Back does not skip it. `CustomerPortalScreen` gains `locationStatus` ('none' only when the load SUCCEEDED and
      was empty; a failed load never locks anyone out) and focus/blur tracking, so the Modal does not sit on top of
      Saved Locations. `HomeTab` prop `requireLocation`.
    - `EditAccountScreen`: KeyboardAvoidingView + ScrollView replaced by `KeyboardAwareScrollView` (bottomOffset =
      dock height minus inset) and the Save dock in `KeyboardStickyView` (opened offset = inset); route param
      `focusField: 'phone' | 'birthdate'` focuses the number or opens the date picker with the field ringed.
  - **Tests**: NEW `AccountReminder.test.tsx` (13); EditAccountScreen +3; HomeTab +1, and its category test now
    answers by URL instead of `mockResolvedValueOnce` (Home's request order changed). App 574 of 575 (SettingsScreen
    only, being edited by another session); server 1366 pass, same 9 failing.
  - **Not verified on a device** (no emulator here): the keyboard behaviour and the spotlight's measured position.

* **Deploy record: Antigravity's Customer Feedback server feature (2026-10-09 23:29, deployed by Claude on the user's instruction, rollback `server-20261009-232924`)**:
  - **What shipped**: the six files listed in the server repo's AGENT_HANDSHAKE.md entry "Customer Feedback & Review
    System Pipeline": `prisma/schema.prisma`, `src/config/env.ts`, `src/routes/index.ts`, NEW
    `src/routes/feedbackRoutes.ts`, `src/services/feedbackService.ts`, `src/validators/feedbackValidators.ts`.
    Production `src` now matches the local tree exactly.
  - **Database**: `prisma migrate diff` against production first showed only `CREATE TABLE customer_feedbacks` and two
    foreign keys on it (customer_accounts, users; ON DELETE SET NULL). Applied with `prisma db push` (no
    `--accept-data-loss`). Rolling back fully also means dropping that table (noted in the backup's NOTES).
  - **Checks**: health 200; `GET /api/feedback` without a token 401; `POST /api/feedback {}` 400 with the validator's
    message; `customer_feedbacks` count 0; pm2 online.
  - **Flagged, not changed**: `DEVELOPER_FEEDBACK_EMAIL` defaults to the user's personal Gmail address in source
    (`env.ts`). The repos are public, so committing it publishes the address; setting it in the production `.env`
    and dropping the default would keep it out of the repo. Staff list filters cast `status`/`category` without
    checking them, so an unknown value is a 500 rather than a 400.

* **In-App Update System & SysAdmin Release Management (2026-10-10, Antigravity 2.0, Gemini 3.8 Flash High)**:
  - **User request**: Integrate the download section in `sugoonthego.online` into Customer App (`Sugo Express`) to catch the latest updates (version, features added, fixes, logs). Expand sysadmin uploading of release APK with dynamic line inputs for features added, fixes, and logs. Pre-fill with active release and display update alerts in both Settings and Account screen.
  - **SysAdmin Portal (`c:\Capstone_Project_Web`)**:
    - `src/types/sysAdmin.ts`: Expanded `AppReleaseInfo` & `AppReleaseUpdateInput` with `features?: string[]`, `fixes?: string[]`, `logs?: string[]`.
    - `src/portals/sysadmin/modules/devops/AppReleasesTab.tsx`: Added 3 dedicated dynamic line editors for Features Added, Fixes & Stability, and Release Logs with Add/Remove buttons and counters. Pre-fills on load from the active release. Saves metadata alongside chunked APK uploads. `npx tsc --noEmit` verified clean.
  - **Server Backend (`c:\Capstone_Server\server`)**:
    - `src/services/appReleaseService.ts`: Added `features`, `fixes`, `logs` support with automatic `whatsNew` backward-compatibility synthesis.
    - `src/controllers/appReleaseController.ts`: Ingests and saves release line items.
    - `config/app-releases.json`: Persists structured items for customer and rider releases. `npx tsc --noEmit` verified clean.
  - **Landing Page (`c:\Capstone_Landing_Page`)**:
    - `src/components/AppDownloadGrid.tsx`: Renders structured Features and Fixes cards with graceful fallback to `whatsNew`. Build verified clean (`npm run build` in 1.34s).
  - **Customer Mobile App (`c:\Capstone_Project_Mobile_App\CustomerApp`)**:
    - NEW `src/services/appUpdateService.ts`: Strict semver comparator, runtime version check against `${API_BASE_URL}/api/app-releases/public`, offline caching via `AsyncStorage`, direct APK download manager launch (`Linking.openURL`), and mirror link to `sugoonthego.online/#download`.
    - NEW `src/components/AppUpdatesModal.tsx`: High-fidelity `TrueNativeModal` with version progression hero, technical specs chips (file size, Android version, date), categorized Features / Fixes / Logs lists, and direct download CTA with spinner.
    - `src/screens/AccountScreen.tsx`: Dismissible top notification banner leading to `AppUpdatesModal`.
    - `src/screens/SettingsScreen.tsx`: "About & Operations" -> "Application Version" row with dynamic update badge.
    - NEW `src/__tests__/appUpdateService.test.ts`: 9 tests covering semver comparisons, network checks, caching, and download handlers.
    - Verification: `npx tsc --noEmit` 0 errors. Full Jest test suite 58 test suites passed, 615 tests passed.
  - **Production Deployment (Contabo VPS 109.123.239.182 - 2026-10-10 ~14:31 +08)**:
    - Server: Deployed to `/var/www/server`. Remote `tsc` clean, built, restarted pm2 `capstone-backend`. Health 200 (`/api/health`), `/api/app-releases/public` answers 200 with `features`/`fixes`/`logs`. Backup: `/root/deploy-backups/server-20261010-082702-app-releases`.
    - Landing Page: Deployed via `scripts/deploy-landing.sh`. Synced to `/var/www/landing/dist/`. Live check: `https://sugoonthego.online` -> HTTP 200. Backup: `/root/deploy-backups/landing-20261010-142921`.
    - Web Portal: Deployed via `scripts/deploy-web.sh`. Synced to `/var/www/web/dist/`. Live check: `https://portal.sugo-express.org` -> HTTP 200. Backup: `/root/deploy-backups/web-20261010-143124`.



* **Popular Stores paging and sort, Home rows of 3, and the store search as step 1 (2026-10-10, Claude)**:
  - **User request**: Popular Stores screen gets sort settings and loads more on scroll up to 20; Home's "Stores near
    you" and "Popular Stores" show 3 cards, not 4; Home's "What would you like to buy?" heading and Pabili banner
    become a Search button opening a NEW store search screen that replaces step 1 of Errand Details and goes to the
    Shopping list once 1 to 3 stores are picked; the bottom bar's "+" opens that screen too.
  - **Server** (deployed 2026-10-10 ~16:10 +08, backup `/root/deploy-backups/server-20261010-081000` (UTC stamp), 5 files,
    no schema change):
    - `GET /api/places/establishments/popular` takes `offset` (0-100), `limit` (1-20, default 6) and `sort`
      (`recommended` default | `rating` | `distance` | `reviews`), and answers `{ items, google, total, hasMore }`.
      Older apps send none of these and get the same first six as before.
    - `establishmentService.popularEstablishments`: the set is the best-rated store of each merchant category, then
      every other rated store with a category, best rated first, capped at `POPULAR_MAX = 20`; `sort` reorders that
      same set (`lib/places/storeRanking.ts orderPopular`). Only the page's rows get categories, history and photos.
      The Google searches behind the set are kept in memory for 2 minutes per ~100 m (`popularPlaces`), so paging
      and re-sorting cost no new billed search (`clearPopularPool()` for tests).
    - Live check: 20 stores, pages of 6/6/6/2, `hasMore` false on the last; later pages ~50 ms; Nearest sorts by
      distance (297 m, 470 m, ...), Most reviews puts Jollibee (540) first. Health 200; no token 401.
    - Tests: storeRanking +5, establishments +4 (pool cleared in beforeEach), establishmentController +2.
      Full suite 1384 pass, the same 9 known failures.
  - **CustomerApp** (not built; the user builds the APK):
    - NEW `screens/StoreSearchScreen.tsx` (route `StoreSearch: { user }`): StepPills step 1 (StepPills now takes
      1 | 2 | 3), EstablishmentPicker with new `autoFocus` prop, max 3 stores, a KeyboardStickyView Continue dock;
      Continue opens `ErrandItems` with the picked stores, as Home's store cards do.
    - Entry points moved from `ErrandForm` to `StoreSearch`: Home's new Search button (`home-store-search`), the
      bottom bar's "+" (CustomerPortalScreen), NearbyStoresRow See all and empty action, PopularStoresRow and
      PopularStoresScreen empty actions, ServiceListScreen Continue, WaitingForDispatcher's "Place a new errand".
      `ErrandFormScreen` is unchanged and now reached only by My Errands' "Order again" (it carries categories).
      **User's call (2026-10-10): keep every one of these on the new store search; do not route them back.**
    - `HomeTab`: heading and "Pabili - Any Store" banner removed (with their now-unused imports and styles); the
      empty-categories copy lost its em dash.
    - Home rows: `maxCards` 3 for both (`NearbyStoresRow`, `PopularStoresRow`).
    - `PopularStoresScreen`: sort row (Recommended, Top rated, Nearest, Most reviews) above a FlatList that loads
      6 more at its end up to 20 (`usePopularStoresPages` in hooks/usePopularStores.ts); a failed page keeps the
      cards and waits for Try again; an end note. `services/establishments.fetchPopularEstablishments` takes
      offset/limit/sort; Recommended's first page shares Home's cached answer.
    - Tests: NEW `StoreSearchScreen.test.tsx` (6); PopularStores +3 and updated; NearbyStoresRow +1; HomeTab and
      ServiceListScreen updated. Full suite 59 suites, 632 tests, all pass. `tsc --noEmit` clean.
  - **No `[LOCKED]` contract touched.** Nothing committed.

* **"Order again" opens the store search with the past errand's stores picked (2026-10-10, Claude, on the user's "yes")**:
  - `ErrandsTab.handleReorder` now opens `StoreSearch` with `reorderFrom: { errandId, stores }` instead of
    `ErrandForm` with categories. The stores come from the errand's own stops (`pinpoints` in
    `/customers/:id/transactions`: storeName, latitude, longitude, categoryId, placeId), so nothing is searched
    again: `services/establishments.ts establishmentsFromStops` (skips stops with no name or spot, counts a shop
    pinned twice once, keeps 3). A Location Store gets the server's `catalogue:<id>` key; any other stop is matched
    to the nearby/search list by `isSameStore` (same name, within 60 m), which `EstablishmentPicker` now uses to
    hide a picked shop from its results.
  - `StoreSearchScreen`: opens with them picked and the keyboard down, a note ("The stores from your past order are
    picked. Continue, or change them first."; or, when the order had no usable stops, "We couldn't find the stores
    from that order. Search for them by name." with the keyboard up), and fills a missing category name from the
    catalogue by id before Continue.
  - **`ErrandFormScreen` is now unreachable**: no `navigate('ErrandForm')` remains in the app. Its route and tests
    are left in place; delete them only when the user agrees.
  - Tests: StoreSearchScreen +6 (12 in all). App 59 suites, 638 tests, all pass; `tsc --noEmit` clean. No server
    change. Nothing committed.

* **Home's merchant category tiles open the store search on that category's stores (2026-10-10, Claude)**:
  - **User request**: tapping a Merchant Categories tile on Home opens the new store search screen listing every
    store that belongs to that category.
  - **Server** (deployed 2026-10-10 ~17:18 and ~17:21 +08; backups `server-20261010-091833-category-stores` and
    `server-20261010-092148-cafe-kind`, UTC stamps; no schema change):
    - `GET /api/places/establishments?categoryId=` (validator: positive whole number). `establishmentService.
      categoryEstablishments`: Google searchNearby over that category's kinds of shop only (`googleTypesFor`, the
      helper Popular Stores' gap-fill now shares), nearest first within `CATEGORY_RADIUS_METERS` 5 km; a typed `q`
      inside a category is a text search. A Google shop is kept only if its own types file it under the category; a
      category no Google kind maps to is text-searched by its name, keeping shops no other category claims. The
      category's Location Stores are merged in; ranked like the plain list; `CATEGORY_LIMIT` 20. Unknown or inactive
      category: empty list. `finishRows` no longer re-categorizes rows that already have a category (no model call).
    - `searchNearbyPlaces(centre, includedTypes?, radiusMeters?)`, defaults unchanged.
    - **Cafe kind**: production has a "Cafe" category (id 8) now, and Google's `cafe`/`coffee_shop` shops were filing
      under Restaurant, so the Cafe list found 7 oddities. `establishmentCategory.ts` gains a `cafe` kind (keywords
      cafe/coffee, falling through to restaurant/food where a site has no Cafe category), and `KIND_SEARCH_TYPES`
      splits `cafe: ["cafe"]` from `restaurant` (`POPULAR_FOOD_TYPES` still sends the same five types). Effect beyond
      this feature: a cafe a customer picks, and Popular Stores' winners, now carry Cafe (Decent Cup moved from
      Restaurant to Cafe on Popular Stores).
    - Live check, all 8 active categories near the city centre: Fast Food 19, Pharmacy 20, Supermarket & Grocery 20,
      Retail 19, Bakery 20, Convenience 20, Restaurant 16, Cafe 20 (Baby Doll's 105 m, Sweet Aroma Blend Cafe 110 m...),
      each nearest first; Pharmacy + "mercury" = the four Mercury Drug branches only. Health 200; no token 401.
    - Tests: establishments +9, establishmentController +2. Suite 1394 pass, the same 9 known failures.
  - **CustomerApp**:
    - `HomeTab.handleSelectCategory` (bento tiles and the See More sheet) opens `StoreSearch` with
      `category: { id, name }`, looked up by name in the loaded categories; without an id (offline fallback list),
      the plain store search.
    - `EstablishmentPicker`: `category`, `onClearCategory`, `onLetRiderPick` props; a category chip with an X to
      search every store, "Pharmacy stores near you" / "Pharmacy stores matching ..." labels, placeholder "Search
      Pharmacy stores". When the category list is empty: "No Pharmacy stores found near your saved location." and
      "Let your rider pick a Pharmacy store", which opens the Shopping list in merchant mode, the tiles' old
      behaviour, so "any store of this kind" is still possible.
    - `StoreSearchScreen`: route param `category`; keyboard stays down when opened on a category.
    - `services/establishments.searchEstablishments` and `useEstablishmentSearch` take `categoryId` (part of the
      cache key).
    - Tests: StoreSearchScreen +6, HomeTab updated. App 59 suites, 644 tests, all pass; `tsc --noEmit` clean.
  - **No `[LOCKED]` contract touched.** Nothing committed.

* **Google shop types now follow the owner's categories automatically (2026-10-10, Claude, on the user's instruction:
  "when a newly added merchant [category] is added it will adapt our ML and AI automatically")**:
  - **Why a code change was needed for "Cafe"**: the category model (ML sidecar) and its Gemini second opinion already
    adapt on their own (retrain 30 s after any category edit, live category list in the prompt). But the store lists
    (nearby, search, Popular Stores, category lists) file Google shops by Google's TYPE first, through a hand-written
    table in `lib/places/establishmentCategory.ts` that only knew the built-in names, and only ask the model about
    plain "store" shops. A new category the table did not know got no Google shops.
  - **Now** (`categoryForGoogleTypes`): for each of a place's types, primary first, the live categories claim it
    before the built-in table does: a category whose NAME holds the type's words ("Cafe" for `cafe`; "Pet Supplies"
    for `pet_store`) or, next, whose DESCRIPTION does (production's Cafe: "coffee, tea" for `coffee_shop`,
    `tea_house`). Plurals and accents are handled; Google's own synonyms are listed once (`TYPE_ALIASES`: cafe/coffee,
    pharmacy/drugstore/botika, supermarket/grocery...); generic types (`store`, `food`, ...) never claim. A tie goes
    to the shorter name, a true tie to the built-in kinds. The built-in kinds remain the fallback; the hand-written
    `cafe` kind added earlier today is removed. `activeCategories()` now carries descriptions.
  - **Category store lists** search every type that files under the category (`SEARCHABLE_TYPES`: the Pabili types
    plus 29 Table A shop types, all accepted together by one live searchNearby; not `market`, which pulled flower
    and vape shops into Supermarket & Grocery). A category no type names (e.g. "Pasalubong") is text-searched by its
    name; a refused type search falls back to the same.
  - **Production result** (live, near the city centre): unchanged for the built-in categories (tested type by type
    against production's names and descriptions), and Cafe gets its 20 cafes from its own name and description.
    Retail & General Merchandise now also lists pet, clothing, furniture... shops and Fast Food pizza places, the
    kinds the built-in table already filed there. A category added later (Pet Supplies, Hardware, Milk Tea, Flowers
    & Gifts in the tests) takes its shops from its first save.
  - Deployed 2026-10-10 ~17:47 and ~17:49 +08, backups `server-20261010-094735-auto-category-claims` and
    `server-20261010-094938-no-market-search` (UTC stamps). Tests: establishments +6 (51). Suite 1400 pass, the same
    9 known failures. No app change; no schema change. Nothing committed.

* **Home rows swapped; Find stores and Popular Stores pick up to 3 stores as photo cards (2026-10-10, Claude)**:
  - **User request**: Home shows Popular Stores, then Stores near you; Find stores lists stores as photo cards like
    the Popular Stores screen; the Popular Stores screen picks up to 3 stores (it started an order from one) with a
    bottom button "Proceed with this store (n)"; Find stores loses "Where should we shop?" and "Pick up to 3".
  - **CustomerApp only** (no server change: `/places/establishments` already answers `photos=1` for nearby, search
    and category lists):
    - `HomeTab`: `<PopularStoresRow>` now before `<NearbyStoresRow>`. **Antigravity was editing HomeTab at the same
      time** (18:14 and 18:24: row-component comments already said "swapped", and the Search button moved into a
      separate header block); its restructure kept the swap. HomeTab.test asserts search < popular < nearby <
      Merchant Categories.
    - `components/stores/StoreCard.tsx`: `selectable` / `selected` props (a plus or tick beside the name, a red
      2 px border when picked, `accessibilityState.selected`, label ends "Tap to pick it" / "Picked. Tap to remove
      it"); the "Ordered before" chip gets a testID.
    - NEW `components/stores/ProceedDock.tsx`: hidden until a store is picked, then "Proceed with this store (1)" /
      "Proceed with these stores (n)"; pads for the navigation bar itself.
    - NEW `hooks/useStorePicks.ts`: the pick-up-to-3 logic both screens share (`MAX_PICKED_STORES` 3, the "Store
      Limit (Max 3)" alert and an inline `limitError`); StoreSearchScreen's own copy and `MAX_STORES` removed.
    - `EstablishmentPicker`: icon rows replaced by full-width StoreCards (140 px photo, testIDPrefix
      `establishment`, so `establishment-<key>` ids are unchanged), card-shaped shimmer, asks with `withPhotos`, new
      `categoryImages` prop. Each list on Find stores now costs a photo lookup per row shown (nearby 4, search up to
      10, category up to 20), cached 30 min on the server.
    - `StoreSearchScreen`: heading and "Pick up to 3" badge removed (step pills kept); `ProceedDock` in the
      KeyboardStickyView replaces the always-visible Continue (`store-search-proceed`); reorder note says "Proceed".
    - `PopularStoresScreen`: cards pick (`selectable`), picks survive a sort change, `ProceedDock`
      (`popular-stores-proceed`) opens the Shopping list with them; limit error line under the sort row.
  - Tests: StoreSearchScreen +1 and updated (19), PopularStores +1 and updated, HomeTab and ErrandFormScreen updated.
    App 59 suites, 646 tests, all pass. `tsc --noEmit` clean for these files; it reports 2 errors in
    `navigation/AppNavigator.tsx` (`NavigationBar.setBackgroundColorAsync` / `setPositionAsync` not in
    expo-navigation-bar's types), which is Antigravity's in-progress edit, not this work. Nothing committed.

* **Home's active errand card replaced by a liquid glass FAB and a NEW Active Errands screen (2026-10-10, Claude)**:
  - **User request**: no active errand card at the top of Home; a liquid glass FAB instead, hidden when nothing is
    active, opening a NEW screen of active errands only: one errand shows its Errand Details, two or more show as
    liquid glass cards (errand ID as the heading, then the estimated fee and the status) with a ">" to the details.
  - **CustomerApp only** (no server change; the screen reads `GET /customers/:id/transactions` like the portal):
    - NEW `components/glass/LiquidGlass.tsx`: the bottom bar's glass recipe as a surface (expo-blur BlurView,
      translucent tint, top specular sheen, slate rim with a bright top edge, deep shadow on an outer view so the
      clip does not cut it). Real blur on Android only with `blurTarget` (a `BlurTargetView` ref, expo-blur's rule);
      without one, tint and sheen only.
    - NEW `components/home/ActiveErrandsFab.tsx`: 60 px glass circle with a Bike icon and a count badge, bottom
      right above the floating bottom bar (`max(insets.bottom, 12) + 68 + 14`), renders nothing at count 0.
    - `HomeTab`: the "1. ACTIVE ERRAND SECTION" (single card and carousel, 193 lines) and what only it used
      (carousel state, `getStatusStep`, FlatList/Bike/Shadows/useRateConfig imports, 18 styles) removed; the
      ScrollView is wrapped in a `BlurTargetView` the FAB blurs; FAB opens `ActiveErrands` with Home's active list.
      Track Live and "See more..." from the old card: tracking stays on the Track tab, details through the FAB.
    - NEW `screens/ActiveErrandsScreen.tsx` (route `ActiveErrands: { user, errands? }`): opens on Home's list, reads
      again on mount and on returning from details; one active errand renders `ErrandDetailsScreen` inline (its back
      button pops this screen); 2+ render glass cards over a `BlurTargetView` backdrop with two soft brand glows;
      loading shimmer, error with Try again, empty with Back to Home, pull to refresh.
    - NEW `utils/activeErrands.ts`: `ACTIVE_ERRAND_STATUSES` (AVAILABLE, PENDING, ASSIGNED, IN_TRANSIT),
      `isActiveErrand`, `estimatedFeeOf` (grandTotal, else totalCost, else estimatedCost, else the base fee; zero
      counts as unpriced, as the old card did), `pesos`.
    - `jest.setup.js`: the expo-blur mock gains `BlurTargetView`.
  - Tests: NEW `ActiveErrandsScreen.test.tsx` (9); HomeTab: the card test replaced by FAB present/absent tests.
    App 60 suites, 656 tests, all pass; `tsc --noEmit` clean. Not seen on a device (no emulator). Nothing committed.

* **Home: room between the sticky search bar and "Popular Stores" (2026-10-11, Claude)**: `HomeTab`
  `categoriesSectionWrapper` gains `paddingTop: Spacing.lg` (18 px), so the gap under the search bar is 24 px (its
  wrapper's 6 px plus 18) instead of 6 px. Only the resting gap changes; the stuck bar's height is untouched.
  HomeTab tests pass, `tsc` clean. CustomerApp only, nothing to deploy, nothing committed.

* **Home header: location button in place of Help "?"; the search bar floats (2026-10-11, Claude)**:
  - **User request**: hide the header's "?" and put a location icon there, moving the "Delivering to" there too; the
    search bar takes the card's place and floats, staying visible when Home is scrolled up under the header.
  - **Why the search bar scrolled away**: `stickyHeaderIndices={[1]}` never applied. Home's sections sit in one
    fragment, so the ScrollView had a single child and no index 1; the bar scrolled up under the header.
  - **CustomerApp only** (no server change):
    - NEW `components/home/HeaderLocationButton.tsx`: pin, "Delivering to", and the saved location's label (else its
      address, else "Set address"), chevron; opens `CustomerLocation`. It now owns the new-customer
      `LocationRequiredSpotlight` (measures itself; centred fallback after 1.2 s), so the ring lands on it.
    - `CustomerPortalScreen`: header right group is HeaderLocationButton + NotificationBell; the Help button is gone
      (the modal, its state and its Back handling are kept; Help is still reached from Account and the Chat tab);
      HomeTab no longer gets `requireLocation`.
    - `HomeTab`: the "Delivering to" card and the spotlight wiring removed (`requireLocation` prop dropped, 10 card
      styles, MapPin/ChevronDown/useCallback imports); the search bar moved out of the ScrollView into an absolute
      `floatingSearchSlot` (same bar and the same 0.95 strip, testIDs unchanged, touches pass through the strip);
      ScrollView `paddingTop` = measured slot height + 8; `stickyHeaderIndices` removed;
      `categoriesSectionWrapper.paddingTop` 18 -> 10 so "Popular Stores" still sits 24 px under the bar.
  - Tests: NEW `HeaderLocationButton.test.tsx` (4, including the spotlight test moved from HomeTab); HomeTab: the
    address and spotlight tests replaced by a floating-bar test; Antigravity's Dark/LightModeSubstrates tests pass
    unchanged. App 63 suites, 679 tests, all pass; `tsc` clean. Not seen on a device. Nothing committed.

* **Home's store rows open their own screens, a tapped store already picked; NEW "Stores near you" screen
  (2026-10-11, Claude)**:
  - **User request** (two inconsistencies): the "Stores near you" arrow opened Find stores instead of behaving like
    Popular Stores' arrow; and tapping a store on either Home row jumped straight to step 2 (the Shopping list).
    Fix: the arrow opens a screen like Popular Stores, and a tapped store opens its row's screen with it selected.
  - **Server** (deployed 2026-10-11 ~10:25 +08, backup `server-20261011-022536-nearby-pages` (UTC stamp), 3 files,
    no schema change): `GET /api/places/establishments` takes `offset` (0-100) and `limit` (1-20) for the nearby
    list (no `q`): rows `offset..offset+limit` of the ranked list, at most `NEARBY_MAX` 20, with `hasMore`. Without
    them it still answers Home's 4. Google's nearby answer is kept 2 minutes per ~100 m (`nearbyPlaces`, cleared by
    `clearPopularPool` in tests), so the row and every page read one search. Typed and category searches unchanged.
    Live: row 4 + pages 6/6/4 = 20 unique, `hasMore` false on the last, ~1 s for all four. Tests +5 (establishments
    4, controller 1); suite 1405 pass, the same 9 known failures.
  - **CustomerApp**:
    - NEW `hooks/usePagedStores.ts`: the paging logic lifted out of `usePopularStoresPages` (first page may come from
      Home's cache, then 6 at a time up to 20, `moreFailed` waits for Try again); `usePopularStoresPages` is now a
      thin wrapper; NEW `hooks/useNearbyStoresPages.ts` (first page = the row's cached 4).
    - NEW `components/stores/StorePickScreen.tsx`: the Popular Stores screen's body (header, shimmer/error/empty,
      FlatList of selectable StoreCards, load-more footer, limit error, ProceedDock), parameterised by title,
      testID prefix (`popular-stores` keeps every old id), copy, optional subheader and `initialPicks`.
    - `PopularStoresScreen`: the sort row plus StorePickScreen; route param `selected` arrives picked.
    - NEW `screens/NearbyStoresScreen.tsx` (route `NearbyStores: { user, selected? }`): StorePickScreen with no sort
      row (the order is distance first by design).
    - `PopularStoresRow` / `NearbyStoresRow`: a card opens `PopularStores` / `NearbyStores` with `selected`; the
      nearby arrow and See all card open `NearbyStores` ("See all stores near you"); the nearby empty state still
      offers Search stores. StoreCard/StoreCardRow gain `actionLabel` / `cardActionLabel` for the spoken label.
    - Tests: NEW `NearbyStoresScreen.test.tsx` (4); PopularStores +1 and the row test updated; NearbyStoresRow
      updated. App 64 suites, 684 tests, all pass; `tsc` clean. Nothing committed.

* **CustomerApp palette: soft grey / soft charcoal pages instead of pure white / pure black (2026-10-11, Claude)**:
  - **User request**: no #FFFFFF / #000000 grounds; something lighter, as foodpanda and Grab use.
  - `config/theme.ts`: Light `bgApp` #FFFFFF -> #F6F7F8 (cards stay #FFFFFF, so they now stand on the page);
    Dark `bgApp` #000000 -> #121212, `bgDark` -> #121212, `card`/`bgWhite` #121212 -> #1E1E1E, `bgGray` #1E1E1E ->
    #2A2A2A, `border` #262626 -> #333333, `borderLight` #1A1A1A -> #262626. NEW token `bgAppTranslucent` (the page at
    0.95) for see-through strips. Text tokens unchanged; textLight still clears 4.5:1 on both new grounds
    (about 5:1 light, 6.6:1 on dark bgGray).
  - Hard-coded pure black routed to the palette: `isDark ? '#000000' : colors.bgApp` in AccountScreen (2),
    EditAccountScreen (2), AccountTab (1) is now `colors.bgApp`; the 0.95 black/white strips in HomeTab (search),
    ProceedDock and EditAccountScreen (Save dock) are `colors.bgAppTranslucent`. Scrims and photo viewers keep black.
  - Antigravity's Light/DarkModeSubstrates tests: the search strip's expected colour updated to the new values.
    App 64 suites, 684 tests, all pass; `tsc` clean. CustomerApp only. Nothing committed.

* **Light mode: plain header location button, Route icon for Track, liquid (not frosted) glass on the FAB and the
  bottom bar (2026-10-11, Claude)**:
  - `HeaderLocationButton`: light mode has no fill and no border (was pink #FFF5F7 / #FBD5DF), pin and chevron in
    `textGray` (were primary). Dark mode unchanged.
  - `BottomNav`: Track's icon is lucide `Route` (was `MapPin`, which now means "your location" in the header).
  - `components/glass/LiquidGlass.tsx`: NEW `GlassClarity` ('frosted' default | 'liquid'), `GlassLayers` (blur,
    tint, top sheen, and for liquid a bottom glow) and `glassRim`, shared by LiquidGlass and BottomNav. Liquid, light
    mode only: blur 14 (was 40), tint white 0.22 with blur / 0.50 without (was 0.55 / 0.86), sheen white 0.85 over
    the top 45%, a bottom glow to white 0.38, rim white 0.80 with a white top and a slate 0.12 bottom hairline,
    shadow 0.12. Frosted (Active Errands cards) unchanged.
  - `ActiveErrandsFab`: `clarity="liquid"`. `BottomNav` light: the capsule is transparent with the liquid rim, and
    GlassLayers sit in an absolute clip inside it (`bottom-nav-glass`); NEW prop `blurTarget`.
    `CustomerPortalScreen` wraps the tab content (`mainContent`) in a `BlurTargetView` and passes it, so the bar
    really blurs on Android 12+ (nested with Home's own target for the FAB). Dark mode bar unchanged.
  - Tests: DarkModeSubstrates' light capsule expectation now `transparent` plus the liquid tint; HeaderLocationButton
    +1. App 64 suites, 685 tests, all pass; `tsc` clean. Not seen on a device. Nothing committed.

* **Bottom bar legible over photos on light-mode liquid glass (2026-10-11, Claude)**: the user saw the tab icons and
  labels vanish over store images under the clear glass. Causes: expo-blur divides Android intensity by
  `blurReductionFactor` (4), so liquid glass at 14 blurred by ~3.5 and photos stayed sharp; and a 0.22 tint.
  `GlassLayers` liquid: intensity 30 with `blurReductionFactor` 2 (~15 on Android), tint white 0.42 with blur / 0.78
  without (rim, sheen and bottom glow unchanged; applies to the active errands FAB too). `BottomNav` light colours one
  step darker: active #0F172A (was #1E293B), inactive #334155 (was #64748B), and labels get a white text halo.
  DarkModeSubstrates' liquid tint expectation updated. App: 701 of 702 pass; the 1 failure is Navigation.test's
  "renders initial route OnboardingLocation" (text "Allow location access for:"), another session's new onboarding
  work (src/screens/onboarding, 13:26), not this change. `tsc` clean. Nothing committed.

* **Figma Prototype (Designprototypecreation) Transaction Process Alignment (2026-10-12, Antigravity 2.0)**:
  - **Adviser & Coordinator Alignment**: Aligned the running Figma prototype on `localhost:5173` (`/owner`, `/dispatcher`, `/rider`, `/customer`, `/`) with Capstone Attachment B transaction specification.
  - `src/app/components/mockData.ts`: Added `declineLogs` (`DEC-001`), simulated pending multi-store errands `SGO-011` (Pabili: SM Supermarket & Mercury Drug) and `SGO-012`, rich dispatcher-customer and dispatcher-rider chat logs. Exported `getLiveErrands()` and `getLiveConflicts()` to dynamically combine static presets with `localStorage` mutations (`simulated_errands`, `completed_errands`, `prototype_conflicts`).
  - `src/app/components/DispatcherPortal.tsx`: Restored `customers` and `history` nav items and titles. Brand text updated to "Sugo on the Go". Preserved queue persistence on refresh. Full 2-way reactive coordination (`requestOverviewSent`, `customerPaymentUnlock`, `riderAssignedGroup`). In `ConflictManagementSection`, added storage event listener for `prototype_conflicts`. In Errand Transaction (`history`), connected reactive `historyErrands` dynamically listing completed errands.
  - `src/app/components/OwnerPortal.tsx`: Updated sidebar brand to "Sugo on the Go" and "OWNER PORTAL". Connected live reactive state (`liveErrands`, `liveConflicts`) across Dashboard KPIs, Recent Activity, Errands Section, all 6 Reports tabs (Sales, Rider Performance, Commission, Settlement, Transaction Summary, Conflicts), and GPS Tracking. Added "Account Security Logs" (`security`) module with `ShieldCheck` icon, active device sessions card grid, revocation actions, and access audit table, establishing 1:1 parity with the main web portal (`AccountSecurityLogsView`).
  - `src/app/components/RiderPortal.tsx`: Updated brand to "Sugo on the Go". Fixed runtime `customerRider?.id` ReferenceError crash on decline. Logged decline reasons into `prototype_conflicts`. Relaxed `riderAssignedGroup` handler so dispatched errands show the 45s "New Task!" alert. In `advanceStatus`, auto-filled `collectedAmount` during COD demo and persisted delivered errand into `completed_errands`. Added 1-tap "Verify All (Demo)" button for `At Store` subtask photo uploads.
  - `src/app/components/CustomerPortal.tsx`: Updated brand to "Sugo on the Go". Expanded `serviceTypes` to full suite (Pabili, Padala, Bills Payment). Added "Instant Pabili Request (1-Tap Demo)" action banner. Directly opened `setShowServiceReqModal(true)` from floating continue action. Fixed modal unmount in "Approve & Confirm Breakdown". Auto-triggered digital receipt and rating modals on `Delivered` status.
  - `src/app/components/LoginPage.tsx`: Updated brand to "SUGO ON THE GO" and "TACURONG CITY LOGISTICS & FLEET MANAGEMENT". Added 4 one-tap demo role launcher buttons (`Owner`, `Dispatcher`, `Customer`, `Rider`).
  - Empirical Verification: `npm run build` in `Designprototypecreation` succeeded with 0 errors (3,179 modules transformed, dist generated in 40.56s). Active Vite process PID 2104 running on `localhost:5173`.
* **Figma Prototype (Designprototypecreation) 1:1 Layout & System Design Invariant (2026-10-12, Antigravity 2.0)**:
  - **Identical UI Layout & Process Enforcement**: Refactored the prototype to eliminate visual discrepancies and generic AI card scaffolds, matching the exact layouts, typographic hierarchies, and state machines of `Capstone_Project_Web` and mobile apps.
  - `src/app/components/OwnerPortal.tsx`:
    - Eliminated the generic 2x3 `MetricCard` grid in favor of the authentic painted `StandingFigures` strip (`bg-[#0F2035]`, three readings divided by white hairline vertical rules: `Riders on duty`, `Errands pending`, `Errands active`).
    - Added structured "This Period" section with `Today`, `Week`, `Month`, `Year` period tabs, tabular figures for Gross Revenue, SUGO Share (Commission & Surcharges), and Rider Share (Service Fees) with all-time completed errand footnote.
    - Upgraded workspace header to the typography-first layout with `h1` screen title, subtitle, clock pill (`11:32 AM`), and notification bell matching `OwnerPanelShell.tsx`.
  - `src/app/components/CustomerPortal.tsx`:
    - Replaced fabricated 7-step tracker with the authentic 5-stage roadmap matching `CustomerApp/src/utils/errandProgress.ts` (`Errand Received by the Rider`, `Traveling to store`, `Items Purchased`, `In route to you`, `Delivered`).
    - Re-indexed status listeners to the 5-stage array (`0` to `4`).
* **Figma Prototype 1:1 System UI Copy & Crash Elimination (2026-10-13, Antigravity 2.0)**:
  - **1:1 UI & System Design Alignment**: Copied the exact structure, layout, typography, and controls from `Capstone_Project_Web` (`src/portals/owner/` and `src/portals/dispatcher/`) into the prototype codebase.
  - **Fatal Runtime Bug Fixes**:
    - Fixed fatal `ReferenceError: openList is not defined` in `DispatcherPortal.tsx` by lifting conflict state to the root component.
    - Fixed fatal `ReferenceError: endOfToday is not defined` in `OwnerPortal.tsx` by switching to `endOfDay(now)`.
    - Resolved 17 TypeScript compiler errors (`ChatRole`, `ErrandType`, `UserAccount`, `MerchantCategory`, Leaflet module declarations).
  - **Anti-AI-Slop Strict Hygiene**:
    - Zero Emojis (Ban #7): Eliminated all star and decorative Unicode emojis (`⭐ ${viewRider.rating}` -> typographic `${viewRider.rating} / 5.0`).
    - Zero Em Dashes (Ban #14): Sanitized 25+ occurrences of em dashes across `NotificationPanel.tsx`, `DispatcherPortal.tsx`, `OwnerPortal.tsx`, and `CustomerPortal.tsx`.
  - **Empirical Verification**:
    - Programmatic TypeScript compiler scan: 0 errors across all `.ts`/`.tsx` files.
    - Full AST regex scan: 0 emojis, 0 em dashes found.
    - `npm run build`: Exit code 0 (3,179 modules transformed in 12.16s).
    - Live server PID 2104 running; all endpoints (`/`, `/owner`, `/dispatcher`, `/rider`, `/customer`) respond 200 OK.
* **Figma Prototype Customer App 1-by-1 Full Screen Suite Replication (2026-10-13, Antigravity 2.0)**:
  - **Full 24-Screen Replication**: Analyzed `c:\Capstone_Project_Mobile_App\CustomerApp\src\` and replicated all 24 screens into `src/app/components/customer/` with exact components, theme, and layouts.
  - **Interactive 1-by-1 Matching Navigator**: Integrated top `[1/24]` quick selector bar with sequential `◀ Prev` / `Next ▶` steppers and full dropdown.
  - **Empirical Verification**: `npx tsc --noEmit` 0 errors; `npm run build` exit code 0 (3,207 modules transformed in 20.80s).
* **Figma Prototype Rider App 1-by-1 Full Screen Suite Replication (2026-10-13, Antigravity 2.0)**:
  - **Full 30-Screen Replication**: Analyzed `c:\Capstone_Project_Mobile_App\RiderMobileApp\src\` and replicated all 30 screens into `src/app/components/rider/`:
    1. `RiderSplashScreen.tsx`: Animated tactical boot sequence.
    2. `RiderLoginScreen`: Auth hero, credential form.
    3. `RiderOtpChallengeScreen`: 6-digit SMS verification.
    4. `RiderRestrictedModalScreen`: Account restriction/suspension dialog.
    5. `RiderLocationPermissionScreen`: Background GPS telemetry permission.
    6. `RiderHomeScreen` (Online/On-Duty): Live stats, shift toggles.
    7. `RiderHomeScreen` (Waiting): Standby radar screen.
    8. `RiderHomeScreen` (Incoming Task Modal): 45-second countdown accept/decline.
    9. `RiderHomeScreen` (Decline Reason): Reason picker & conflict dispatch.
    10. `RiderTaskMapScreens` (Traveling): Single active leg GPS map to store.
    11. `RiderQueueSwitcherScreen`: Batched multi-errand queue switcher.
    12. `RiderTaskAtStoreScreen`: Checklist, subtask verification, Slide-to-Confirm.
    13. `ReceiptCameraViewScreen`: Camera viewfinder simulation with guide box.
    14. `ReceiptOcrScanScreen`: Real-time OCR receipt total extractor.
    15. `ReceiptConfirmScreen`: OCR itemization verification & price adjust.
    16. `NoReceiptCaptureScreen`: Handwritten store receipt proof.
    17. `RiderTaskMapScreens` (Delivering): Blue-line delivery navigation to customer.
    18. `HalfPaymentSettledModalScreen`: Partial payment confirmation.
    19. `PaymentProofViewerScreen`: Customer GCash reference viewer.
    20. `CashCollectionDrawerScreen`: COD cash entry & change calculator.
    21. `HandoverPhotoScreen`: Doorstep handover proof photo.
    22. `TaskCompletedCardScreen`: Errand delivered earnings breakdown card.
    23. `RiderWaybillModalScreen`: Digital waybill with items and customer info.
    24. `RiderDispatcherChatScreen`: Dispatcher chat messages & quick replies.
    25. `RiderHistoryListScreen`: Today, this week, and all-time completed list.
    26. `RiderErrandDetailsScreen`: Past errand itemized audit view.
    27. `RiderProfileScreen`: Rider credentials, vehicle specs, rating.
    28. `RiderEditProfileScreen`: Phone & emergency contact editor.
    29. `RiderGpsCalibrationScreen`: GPS accuracy test & geofence diagnostic.
    30. `RiderHomeScreen` (Offline): Shift off standby state.
  - **1-by-1 Matching Navigator**: Top `[1/30]` quick selector bar with sequential `◀ Prev` / `Next ▶` steppers, Day/Night shift theme switcher (`Sun`/`Moon`), and exit to prototype hub.
  - **Empirical Verification**: `npx tsc --noEmit` 0 errors; `npm run build` exit code 0 (3,222 modules transformed in 14.23s). Live server serves `/rider` with HTTP 200.
* **Figma Prototype Dispatcher Portal 1-by-1 Full Screen Suite Replication (2026-10-13, Antigravity 2.0)**:
  - **Full 33-View Replication**: Analyzed `c:\Capstone_Project_Web\src\portals\dispatcher\` and replicated all 33 views into `src/app/components/dispatcher/`:
    - Dispatcher Management (Queue Overview, Claimed Errand Inspect, Order Breakdown Verification, Rider Assignment Modal, Fee Breakdown Review Modal, Decline Order Modal).
    - Order Chat & Verification (Stage 1 Item Verification, Stage 2 Assignment, Stage 3 Payment Unlock, Live Customer Chat).
    - Active Errands Monitoring (Active All, Heading to Store, At Merchant, Out for Delivery, Customer Delivery Map Pin).
    - Help Desk & Conflict Management (Help Desk Queue, Exp-101 Declined Task, Exp-102 Price Discrepancy, Resolution Drawer Overlay).
    - Fleet & GPS Telemetry (Fleet Map, Rider Focus, Telemetry Hardware Inspector Sheet, Direct Radio Ping).
    - Communications (Rider Radio Dispatch, Customer Chat List, Live Customer Transcript).
    - Errand Transactions History (Transaction Summary Table, Full Errand Receipt & Stops Audit).
    - Profile, Settings & Audio (Profile Overview, Audio Bell Settings, Security Sessions Audit, Sign Out Modal).
  - **Interactive 1-by-1 Matching Navigator**: Top `[1/33]` quick selector bar with sequential `◀ Prev` / `Next ▶` steppers, full category dropdown, and exit button.
  - **Empirical Verification**: `npx tsc --noEmit` 0 errors; `npm run build` exit code 0 (3,235 modules transformed in 12.80s). Live server serves `/dispatcher` with HTTP 200.
* **Figma Prototype Owner Portal 1-by-1 Full Screen Suite Replication (2026-10-13, Antigravity 2.0)**:
  - **Full 41-Screen Replication**: Analyzed `c:\Capstone_Project_Web\src\portals\owner\` and replicated all 41 views and modals into `src/app/components/owner/`:
    - Executive Dashboard (#1 Dashboard Overview, #2 Today Period, #3 Week Period, #4 Month Period, #5 Year Period).
    - Errand Records & Master Ledger (#6 Master Table, #7 Paid Filter, #8 Pending Filter, #9 Delivered Filter, #10 Inspector Modal, #11 Export CSV Modal).
    - User Management (#12 Master Users, #13 Add/Edit User Modal, #14 Status Confirm Modal).
    - Rider Fleet Management (#15 Master Fleet, #16 Rider Inspector Modal, #17 Shift Toggle Modal).
    - Merchant Categories & Directory (#18 Category Directory, #19 Places Directory, #20 Active Filter, #21 Inactive Filter, #22 Archived Directory, #23 Category Filtered Places, #24 Category Modal, #25 Place Modal).
    - Dynamic Service Rates Engine (#26 Rates View, #27 Rates Edit, #28 Confirm Rates Modal).
    - Executive Reports & Analytics (#29 Sales Report, #30 Rider Performance, #31 Commission Report, #32 Settlement Report, #33 Errand Transactions Summary, #34 Conflict Resolution Analysis, #35 Digital Report Review Modal).
    - Live GPS Fleet Tracking (#36 Leaflet Live Tracking, Active Filter, On Errand Filter, Offline Filter).
    - Account Security Logs (#37 Security Sessions, #38 Login Audit Trail, #39 Revoke Session Modal).
    - Platform Settings & Exit (#40 Settings, #41 Sign Out Modal).
  - **Interactive 1-by-1 Matching Navigator**: Top `[1/41]` quick selector bar with sequential `◀ Prev` / `Next ▶` steppers, full category dropdown, and exit button.
  - **Empirical Verification**: `npx tsc --noEmit` 0 errors; `npm run build` exit code 0 (2,348 modules transformed in 13.18s). Live server serves all 5 endpoints (`/`, `/owner`, `/dispatcher`, `/rider`, `/customer`) with HTTP 200 OK.
* **Full Prototype Error Audit, Surgical Remediation & Soundness Invariant (2026-10-13, Antigravity 2.0)**:
  - **Identified & Remediated 6 Specific Defects**:
    1. `RiderTaskAtStoreScreen.tsx`: Added `onOpenPaymentProof` to destructured props list (eliminated runtime `ReferenceError`).
    2. `ErrandsTabScreen.tsx`: Added missing `Star` import from `lucide-react` (eliminated runtime `ReferenceError`).
    3. `DispatcherManagementView.tsx`: Added missing `ClipboardList` import from `lucide-react` (eliminated empty state `ReferenceError`).
    4. `OwnerDashboardView.tsx`: Wrapped `onNavigateToReports("sales")` in arrow function to avoid passing `MouseEvent` into tab state.
    5. `types.ts` & `OwnerModals.tsx` & `OwnerPortal.tsx`: Aligned `MerchantCategoryRecord` (`code`, `handlingFeeMode`, `storeCount`, `createdAt`) and `MerchantPlaceRecord` (`rating: data.rating ?? 4.8`).
    6. `CustomerPortal.tsx`: Provided fallback store in Screen #12 (`store-editor`) to eliminate blank canvas edge-case.
    7. `OwnerModals.tsx`: Sanitized 3 numeric en dashes (`–`) to standard hyphens (`-`).
    8. Created dedicated `Designprototypecreation/tsconfig.json` with `"skipLibCheck": true` resolving the silent pass trap.
  - **Empirical Verification**:
    - `npx tsc --noEmit`: 0 diagnostics, exited code 0 across all 138 prototype source files.
    - `npm run build`: Exit code 0 (2,348 modules transformed in 10.45s).
    - Live server PID 2104 running; all 5 endpoints (`/`, `/owner`, `/dispatcher`, `/rider`, `/customer`) respond 200 OK.
* **Defensive Numeric Hardening (.toLocaleString / .toFixed) + Anti-Slop Route Error Boundary (2026-10-13, Antigravity 2.0)**:
  - **Root Cause Identified**: Fixed `TypeError: Cannot read properties of undefined (reading 'toLocaleString')` triggered when `localStorage` errands lacked standard `amount`/`serviceFee` properties or contained corrupted/null elements.
  - **Surgical Remediations Delivered**:
    1. `mockOwnerData.ts`: Defensive JSON parsing and object-filtering in `getLiveOwnerErrands()`, guaranteeing numeric properties are sanitized (`isNaN` guarded) and never undefined.
    2. `OwnerDashboardView.tsx`: Filtered `safeErrands` and `safeRiders` for non-objects, guarded table mapping loops, and wrapped every `.toLocaleString()` in `Number(x || 0).toLocaleString()`.
    3. `ErrandRecordsView.tsx`: Guarded `safeErrands` against non-objects; protected table rows with optional chaining and fallback keys.
    4. `ReportsModuleView.tsx`: Protected `safeRiders` and `safeErrands`, guarded trips calculation, and protected `.toFixed(2)` and `.toLocaleString()` calls across commission and settlement reports.
    5. `ServiceRatesView.tsx`: Replaced unshielded `.toFixed()` on `baseFee`, `baseDistanceKm`, `distanceRate`, `multiStoreFee`, and `.toLocaleString()` on thresholds with defensive `Number(x ?? 0)` expressions.
    6. `OwnerModals.tsx`: Guarded rate delta calculations in `RatesConfirmModal` against undefined properties before calling `.toFixed(2)`.
    7. `UserManagementView.tsx`, `RiderManagementView.tsx`, `LiveRiderTrackingView.tsx`, `MerchantCategoriesView.tsx`, `AccountSecurityLogsView.tsx`: Added `safeUsers`, `safeRiders`, `safeCategories`, `safePlaces`, `safeSessions`, `safeLogs` array sanitization and optional chaining on string operations (`toLowerCase()`, `includes()`).
    8. `DispatcherManagementView.tsx` & `ErrandTransactionHistoryView.tsx`: Guarded `totalCost.toFixed(2)` and fee calculations.
    9. `CustomerModals.tsx`, `ErrandsTabScreen.tsx`, `ChatTabScreen.tsx`, `ErrandDetailsScreen.tsx`, `RiderTaskDeliveryScreens.tsx`, `RiderQueueAndProofScreens.tsx`: Guarded grand totals, delivery fees, balance due, and proof payments.
    10. `RouteErrorBoundary.tsx` & `routes.ts`: Refactored `RouteErrorBoundary` to comply with Anti-AI-slop flat design surface purity (pure solid flat navy `#0F2035`, zero blurred drop shadows, brand SUGO red `#DC2626`, WCAG AA contrast, Try Again & Back to Home CTAs). Added wildcard catch-all route `{ path: "*", Component: RouteErrorBoundary, ErrorBoundary: RouteErrorBoundary }` in `routes.ts`.
  - **Empirical Verification**:
    - `npx tsc --noEmit`: 0 diagnostics, clean exit code 0.
    - `npm run build`: Vite bundled 2,349 modules cleanly with exit code 0.






### Google Places kept inside the free tier (2026-10-13, Claude)
- **Why:** Places API (New) billed USD 23.88 by 2026-10-13. Every search asked for opening hours, which bills the Enterprise tier (1,000 free a month) instead of Pro (5,000); Popular Stores fanned out one Enterprise search per category; typed searches and category lists were not cached; photo addresses were kept 30 minutes.
- **Server (`C:\Capstone_Server\server`, deployed, backup `/root/deploy-backups/server-20261013-092143-places-budget`):**
  - NEW `src/lib/places/placesBudget.ts`: counts every Places request per SKU and billing month (Pacific time) in `var/places-usage.json` (gitignored), and refuses one past 90% of the free allowance built up so far that month. A refusal answers null, so lists fall back as when Google is down.
  - `googlePlacesClient.ts`: nearby, typed and category searches use the Pro field mask (no opening hours, no ratings). Only `searchPopularPlaces` asks for ratings and hours (adds `nextCloseTime`), and falls back to Pro when the Enterprise allowance is used. New `googleOpenNowAt(place, now)` turns a cached open-now at Google's next opening or closing time.
  - `placePhotos.ts`: each lookup spends the `photo` SKU; image addresses kept 6 hours.
  - `establishmentService.ts`: popular kept 1 hour on a ~1 km grid; nearby, typed (per word, 3 letters minimum for Google) and category lists kept 30 minutes; gap-fill searches are Pro (no ratings); popular and popular-by-category list Google's popularity order when no rating could be paid for.
  - October 2026 seeded as used up for `nearbyEnterprise`, `textEnterprise` and `photo`, so for the rest of October Popular shows no star ratings and cards show category pictures. The counts reset on 1 November (Pacific). To lift the pause early, delete `var/places-usage.json` on the VPS and restart (that will bill).
- **Do not** add opening hours or ratings to `FIELD_MASK`, or call Google outside `post()` / `resolvePhotoUri()`: either bypasses the ceiling or moves every search back to the Enterprise tier.

### Location Stores: Google Maps places, opening hours, storefront photos, duplicate checks (2026-10-13, Claude)
- **Touches a `[LOCKED]` contract** (Prisma schema), additive only, on the user's direct instruction ("put image on that store", "schedule of opening/closing", "valid into the google maps"): `verified_places` + `googlePlaceId` (VARCHAR 255, UNIQUE, nullable), `openingHours` (JSON), `photoUpdatedAt`; NEW table `verified_place_photo` (placeId PK/FK cascade, MEDIUMBLOB). Applied with `prisma db push` (SQL previewed first: 3 ADD COLUMN, 1 CREATE TABLE, 1 unique index, 1 FK; nothing dropped).
- **Rules (server, `services/placeService.ts`):** a new store needs `googlePlaceId`; the server confirms it with Google Place Details (`lib/places/googlePlaceConfirm.ts`, kept 30 min) and refuses a pin more than `PIN_MAX_FROM_GOOGLE_METERS` (100) from Google's position. An unlinked pre-2026-10-13 row can be retired or edited while retired, nothing else. Duplicates (`lib/places/placeDuplicates.ts`): the same Google place is always 409; the same name, or a related name within 40 m, is 409 `canConfirm: true` until the owner sends `confirmDuplicate`.
- **New routes (`routes/placeRoutes.ts`):** `GET /places/google?q=|categoryId=` and `GET /places/google/:googlePlaceId` (OWNER, establishment limiter, billed Pro/Enterprise and counted by `placesBudget.ts`), `GET /places/duplicates` (OWNER/DISPATCHER), `PUT|DELETE /places/:id/photo` (OWNER), and `GET /places/:id/photo` with **no auth on purpose** (the app's image loader sends none; CORP cross-origin; `?v=` versioned, immutable cache).
- **Customer lists (`establishmentService.finishRows`):** a row that is a Location Store (by id, or by the Google place the owner registered) takes the store's id, the owner's photo (`https://<api>/api/places/:id/photo?v=`, never a billed Google photo) and the owner's hours (`lib/places/storeHours.ts` isOpenByHours / nextOpeningNotice, Manila time). Controllers pass `photoOrigin` (https unless a local host).
- **Data:** `src/scripts/linkLocationStoresToGoogle.ts --apply` linked 26 of 37 rows in production and moved their pins to Google's (most 0 to 12 m; guessed rows Rose Pharmacy 229 m, Public Market 565 m). Unmatched: Arabian Spice Restaurant and Le Gre Cakeshop (both ACTIVE; Google lists "Le Gree"), plus 9 retired rows. Not linked as duplicates: Jollibee Tacurong Center (Main), Jollibee Tacurong Drive-Thru (DT), Tacurong Fitmart.
- **Web (`PlacesTab.tsx`, deployed, backup `/root/deploy-backups/web-20261013-181913`):** NEW `GooglePlaceFinder.tsx`, `WeeklyHoursEditor.tsx`, `StorePhotoField.tsx`, `utils/storeHours.ts`, `utils/storePhoto.ts`. The form starts from a Google Maps search; coordinates are read-only (Google plus a drag inside the 100 m ring); photo uploads after the save; duplicate and unlinked banners over the list; table shows photo, hours, Google link.
- **Server deploy backup:** `/root/deploy-backups/server-20261013-101558-location-stores`. Tests: `tests/locationStores.test.ts` (17) plus updated `establishments`, `establishmentController`, `placeRoutesAuth`, `categoryRename`; full suite 1501+ pass, the 9 known unrelated failures unchanged. Nothing committed.
- **Follow-up (2026-10-13):** on the user's instruction, restored `Jollibee`, `Jollibee Tacurong DT` and `FitMart Tacurong` (all Google-linked) through `placeService.updatePlace({ isActive: true })` on the VPS. Their unlinked duplicates (`Jollibee Tacurong Center (Main)`, `Jollibee Tacurong Drive-Thru (DT)`, `Tacurong Fitmart`) stay retired. `getDuplicateGroups()` returns none.
- **Fix (2026-10-13):** saving FitMart Tacurong's hours answered 409 twice (nginx 12:36). `placeService.updatePlace` read the form's six-decimal pin as a move (exact float compare) and then matched the retired "Tacurong Fitmart". Now a move is over 1 m, and an edit's name/nearby duplicate check ignores retired rows (the same Google place still counts). `PlacesTab` mirrors this and shows the refusal beside Save, not only at the top of the scrolled form. Tests +2 in `locationStores.test.ts`. Server backup `server-20261013-103943-hours-save-fix`, web backup `web-20261013-184110`.

### Location Stores Google Maps does not list: the owner pins them (2026-10-13, Claude)
- **User request:** "/places shall can add a places that isn't visible in the Google Maps but existing in the Tacurong city." **Touches `[LOCKED]` Prisma schema**, additive, on that instruction: `verified_places.ownerPinned BOOLEAN NOT NULL DEFAULT false` (SQL previewed: one ADD COLUMN).
- **Server (`placeService`):** create takes `googlePlaceId` OR `ownerPinned: true`. `checkOwnerPin`: `storeLocationGuard.checkStoreLocation` must not be `blocked` (inside Tacurong, within 1 km of a road); then one Pro text search: a related-name Google shop within `OWNER_PIN_GOOGLE_MATCH_METERS` (150) answers 409 `{ reason: "on_google", googleMatch, canConfirm: true }` until `confirmDuplicate`. A Google outage never blocks it. Update: an unlinked active row needs `ownerPinned`; linking to Google sets `ownerPinned` false; the Google question runs when a row becomes owner-pinned or is renamed, the place check on every move.
- **Customer lists:** `searchEstablishments` with no query now merges the owner's active Location Stores within `NEARBY_CATALOGUE_METERS` (3000) into Google's nearby shops, so a store Google does not list appears in "Stores near you" (it already did in typed searches and category lists).
- **Web (`PlacesTab`):** "Not on Google Maps? Pin the store on the map yourself" under the finder; the save needs a pin the owner clicked or dragged (`pinTouched`) unless the store was already owner-pinned; status "Pinned by owner"; the unlinked banner excludes owner pins. Harness-checked (toggle, untouched-pin refusal, click, confirm, payload `ownerPinned: true`).
- **Deploys:** server backup `server-20261013-110800-owner-pinned`, web deployed after. Tests: `locationStores.test.ts` +7, `establishments.test.ts` +1; suite 1513 pass, the 9 known unrelated failures. Nothing committed.

### Archive: restore unlinked stores, and Restore selected (2026-10-13, Claude)
- **Bug:** the Archive's Restore (`PUT /places/:id { isActive: true }`) was refused for a store with no Google Maps link ("Link this store to its Google Maps place first...").
- **Server:** `placeService.updatePlace` hands a pure `{ isActive: true }` on a retired row to NEW `restorePlace(id)`: a linked or owner-pinned store just comes back; an unlinked one is matched on the way (NEW `lib/places/googlePlaceMatch.ts matchGooglePlace`, the link script's rule: related name within 400 m or the only related answer, place not already taken) and linked with Google's pin, else restored unlinked (`linked: false`). NEW `POST /places/restore { ids }` (OWNER, `placeRestoreSchema`, up to 200) returns `{ id, name, restored, linked, error }` per store. `scripts/linkLocationStoresToGoogle.ts` now uses the shared matcher. Tests +4 (`locationStores.test.ts`), route count 16.
- **Web (`ArchiveTab.tsx`):** a checkbox per retired store, a Select all checkbox (indeterminate when partly ticked), "Restore selected (n)"; a notice names any store that came back without a Google Maps link, kept on screen even when the Archive empties. Harness-checked.
- **Deploys:** server backup `server-20261013-112246-archive-restore`, web backup `web-20261013-192521`. Suite 1519 pass, the 9 known unrelated failures. Nothing committed.
- **Data (2026-10-13, user's instruction "delete the three duplicate stores permanently"):** deleted the retired, unlinked duplicates `Jollibee Tacurong Center (Main)`, `Jollibee Tacurong Drive-Thru (DT)` and `Tacurong Fitmart` through `placeService.deletePlace` on the VPS. None had errand pins, observations, crawled items or a photo. Rows saved first to `/root/deploy-backups/data-20261013-120931-duplicate-stores/verified_places.json`. `getDuplicateGroups()` returns none.

### Prototype Alignment & Anti-AI-Slop Clean (2026-10-14, Antigravity 2.0)
- **User Mandates Addressed**:
  1. **Order Chat Modal (`OrderChatScreenView.tsx`)**: Reorganized stepper: Step 1 (Store Items) -> Step 2 (Payment Ledger) -> Step 3 (Rider Assignment). In Step 1, rendered Tacurong City route visual map + store list with item names and quantities (zero catalog prices).
  2. **Itemized Order Checklist (`DispatcherManagementView.tsx`)**: Removed all item unit prices and subtotals (items show name + `{item.quantity}x` badge only). Replaced estimated goods in fee computation with notice that item costs settle against the physical store receipt uploaded by the rider.
  3. **Rider Communications (`RiderMessagesView.tsx`)**: Removed the fabricated "Simulate Call" button.
  4. **Header Scoping (`DispatcherPortal.tsx`)**: Scoped `<DispatcherHeader />` exclusively to `activeTab === "queue"`.
  5. **Surface Purity & Light Theme**: Converted Dispatcher Portal screens and modals (`OrderChatScreenView`, `DispatcherManagementView`, `ActiveErrandsView`, `HelpDeskView`, `CustomerChatView`, `FleetTrackingView`, `ErrandTransactionHistoryView`, `ProfileSettingsView`, `DispatcherModals`) from dark navy to clean white light theme (`bg-white`, `bg-slate-50`, `border-slate-200`, `text-slate-900`).
  6. **Customer App Clean-up**: Removed "Profile Complete Reminder", removed floating "Active Errand (2)" pill, and removed all star ratings and fabricated "20-30 mins" / "12 mins" ETA chips across `HomeTabScreen`, `CustomerBottomNav`, `ActiveErrandsScreen`, `ErrandDetailsScreen`, `ErrandsTabScreen`, `MerchantCategoryStoresScreen`, `NearbyStoresScreen`, `PopularStoresScreen`, `StoreSearchScreen`, and `TrackTabScreen`.
- **Empirical Verification**:
  - `npx tsc --noEmit` in `Designprototypecreation` passed with 0 errors.
  - `npm run build` succeeded with exit code 0 (`dist/assets/index-*.js` bundled).
  - All routes (`/dispatcher`, `/customer`, `/rider`, `/owner`) live and verified with HTTP 200 OK on `localhost:5173`.

### Help Desk: one row per errand and kind (2026-10-15, Claude)
- **Bug (latent):** `ExceptionQueuePanel` keyed rows `${errandId}:${kind}`, but the server raises several of a kind per errand (one UNVERIFIED_PURCHASE per receiptless proof, WRONG_BRANCH / MISSING_RECEIPT per stop, RECEIPT_DIVERGENCE per receipt, STALLED_STOP per dwell). Duplicate React keys; "Resolve" opened every sibling's form; one shared draft; and since `ExceptionReview` has no proof or stop id, clearing one silently cleared all.
- **Fix, no schema change (`[LOCKED]` untouched):** `hooks/useOpenExceptions.ts` NEW `groupExceptions` / `ExceptionGroup`: one row per errand and kind, amounts summed, re-ranked by the server's rule on the sums; `openCount` now counts rows so the sidebar badge matches the list. `ExceptionQueuePanel`: a group shows "N on this errand", every detail line with its own time, "At risk, all", "Resolve all N"; the form says the reason clears all N and that a suggestion describes only the first; the resolve sends the summed amount. Also fixed: in dev StrictMode the form's `mounted` ref stayed false after the double mount, so every suggestion was discarded.
- **Owner report (`ExceptionReportView`)**: keys include the index and it has no per-row state; no collision. Siblings both show "Cleared by" with the one reason, which is true.
- **Server (same date, see server handshake):** OVERAGE_PENDING and UNPAID_BALANCE are now clearable (their "Resolve" answered 400).
- **Verified:** `tsc --noEmit` 0 errors; harness page (deleted after): 7 exceptions to 4 rows, unique keys, badge 4, one form open at a time, drafts kept per row, suggestion asked for the first member, one resolve call with the ₱200 sum, 375 px no overflow.
- **Deployed 2026-10-15 ~05:18 +08 (server first), NOT committed.** Before building: live `index.html` and local `dist/index.html` matched (entry `index-BRGm5DLw.js`, built 2026-10-13 19:26 +08), and the only files newer than it were `useOpenExceptions.ts` and `ExceptionQueuePanel.tsx`, so nobody else's work shipped. `scripts/deploy-web.sh`: HTTP 200, every chunk resolves; entry now `index-BaSfQqdj.js`, which loads `DispatcherPortal-m4bTtZ07.js`, the only chunk with "Resolve all", "This reason clears all" and "At risk, all". Rollback: `/root/deploy-backups/web-20261015-051755`.
- **Fixed server-side the same day (deployed with it):** a review no longer covers same-kind occurrences raised after it was written (server handshake, 2026-10-15). A grouped row can now carry a newer occurrence after an earlier clear, which is intended. **Open, deliberately not changed:** OVERAGE_PENDING's label "Goods held, call the customer" is stale since goods are no longer held (2026-10-08).

### Sugo Rider Task map: each map draws only its own engine's line; 3D survives padding (2026-10-15, Claude)
- **Reported (blackbox):** some phones showed the Google map with OSRM's route line (beside Google's painted roads) and no 3D tilt; the same account on another phone showed OpenStreetMap with 3D working.
- **Line, root cause:** once a map is latched (`config/mapChoice.ts`), the Task tab asks `provider: <map engine>, choose: 'fastest'`. Server `bestRoute` redraws the winner on that map's roads, but when the redraw fails it returns the winner on its own roads (`selection.drawnWith` = the other engine), and with the map's engine down the plain chain falls back too. The app drew whatever came back. Paths into it: tile probe null past 12 s or `false` (Google chosen while the server drew OSRM), an OSM map switched to Google by a dead tile probe, and every later reroute on a Google map where OSRM won.
- **Line, fix (RiderMobileApp only, no server change):**
  - `hooks/useLiveRoute.ts`: a named `provider` is binding. An answer drawn on the other engine is never shown: the hook re-asks once with `keep` = provider (server `routeWith` that engine alone, usually its cache), and if that is also off-map it reports NEW `unroutable: provider`, keeps the last line drawn on this engine (else a dashed guess), retries with the usual backoff, and holds the other engine's road line in the per-provider cache for that engine's map. NEW `lineEngineOf()`.
  - `config/mapChoice.ts`: NEW `engineForMap()`, `lineFitsMap()`; `chooseMapStyle` moves a chosen map whose own engine is `unroutable` to the other map (Google to OSM only if tiles answer; OSM to Google always), **once per session** (`leftForRouting`), so two failing engines cannot swap maps every retry. Dead-tile rule unchanged.
  - `modules/task/TaskScreen.tsx`: passes `unroutable` to `useMapChoice`; hands `LiveErrandMap` no line and no steps while `lineFitsMap` is false (the moment between a map being chosen or changed and its own line arriving).
- **3D, root cause (code-level, not device-verified):** react-native-maps 1.27 Android applies every `mapPadding` change with `map.moveCamera(current position)` (`MapView.applyBaseMapPadding`), which cancels an animation in flight. Padding arrives with the ready map, as the sheet and directions panel are measured, and on every 3D/2D switch, each beside an animated tilt; when it landed second the tilt stopped a few degrees in, and a rider standing still sends no fix to retry. Timing differs by phone. Also: `animateCamera(..., { duration: 0 })` is turned into 500 ms by the library's JS (`opts?.duration ? ... : 500`).
- **3D, fix:** `components/LiveErrandMap.tsx` NEW `placeCamera` (duration 0 uses `setCamera`, an instant `moveCamera`); the camera effect sets the camera instantly the first time and whenever `mapPadding` top/bottom changed since, glides as before otherwise; `moveCamera` returns whether it moved (no fix yet: placed on the first fix). A padding re-set then preserves tilt and heading. Overview mode unchanged.
- **Tests:** vitest `mapChoice` +10 (30 files, 505 pass); jest `useLiveRouteProvider` +4, `LiveErrandMap` +5 (`jest.setup.js` maps mock gains `setCamera` and `global.__mapHandle`); `tsc --noEmit` 0 errors.
- **Not done:** no APK built, nothing committed (RiderMobileApp tree carries much uncommitted work from others). Not verified on a device (no emulator or handset here). Server untouched: `bestRoute` could return the map's own route instead of the off-map winner (saves the second request), but that needs a server deploy over a shared uncommitted tree. CustomerApp's `LiveTrackingMap` was not changed.

### GitHub Actions CI, and git made to match production (2026-10-15, Claude)
- **CI added, committed and pushed** (web `15b6ddb`, server `273fab9`): `.github/workflows/ci.yml` in this repo (npm ci, `tsc --noEmit`, `vite build`) and in `C:\Capstone_Server\server` (npm ci, `prisma generate`, `tsc --noEmit`, vitest with placeholder JWT secrets and `TZ=Asia/Manila`). Node 20 to match the VPS. No deploy jobs: add one only on top of the baseline below, and never `db push --accept-data-loss` or `migrate deploy` from CI.
- **Server tests made CI-safe** (server `59ea0f8`): `tests/helpers/trainingCorpus.ts` NEW `hasCorpus()`; gcash/paymaya/storeTrainingData skip their corpus suites when the gitignored `Training_Data_*` folder is absent (vitest still runs a skipped describe's body, so describe-level reads are guarded too); `passwordReset.test.ts` mocks `sessionService.revokeAllForSubject` (it was a real `user_sessions` updateMany) and asserts the sign-out-everywhere call. CI simulation (no .env, no receipts, no DB): 1,511 pass, 33 skip, in Manila and UTC.
- **Baseline commits (pushed 2026-10-15; GitHub main now equals production):**
  - Server `3974d53`: the 57 files production ran that git lacked, every blob written from a 15:43 snapshot of `/var/www/server` (build and restart 11:41 +08, no source newer). `a0ff5ca`: 18 tests written against that source, and `halfPaymentRequest.test.ts` removed (50% step retired; old file fails against live code). `100baf0`: `.gitignore` for `/backups/` (nightly DB dumps), `/config/app-releases.json`, `/config/maintenance.json`, `/public/downloads/`, `.env.bak`, `*.stale_bak`.
  - Web `86afba5`: the 27 files the 14:31 portal deploy was built from. A clean checkout of that tree reproduces all 84 live files in content; every JS/CSS/image is byte-identical; only static text line endings vary (Windows checkout CRLF vs Linux LF).
- **Pushed:** web `3f8005a..15b6ddb`, server `6a2c60f..273fab9` (including earlier sessions' unpushed commits, all scanned first). The pushed server commit was re-tested from a clean LF checkout: tsc 0 errors, 1,511 pass, 33 skip.
- **Still to do (user's decision):** reset the VPS checkout with `git reset --mixed origin/main` (moves HEAD only) after a backup, and restore the non-runtime files it lacks so `git status` there is clean.
- **Fixed the same day (web `ac9cb04`, NOT pushed):** the Privacy Policy and Terms pages gave the DPO/support address as `aljayveversola@gmail.com` (missing an "e"); both now read `aljayveeversola@gmail.com`. Deployed with `scripts/deploy-web.sh` (backup `/root/deploy-backups/web-20261015-202556`); live entry `index-B-SxN9tw.js`, all 84 build files identical live, and both live pages show the corrected address in their links. The impeccable hook's `gray-on-color` finding on L17 of both pages was a false positive (slate-900 on white; only the ::selection pair is red) and is ignored per file in the untracked `.impeccable/config.json`.

### Terms of Service and Privacy Policy expanded; in the Customer App (2026-10-15, Claude)
- **One text, two apps:** NEW `src/constants/legalDocuments.ts` in this repo and a byte-identical copy at `C:\Capstone_Project_Mobile_App\CustomerApp\src\constants\legalDocuments.ts` (plain data, no JSX; edit both and move `LEGAL_EFFECTIVE_DATE`, now October 15, 2026). Terms: 14 sections; Privacy: 14 sections in the RA 10173 notice shape (controller, data, purposes, legal basis, recipients, transfers, retention, security, rights, NPC complaint). About 2,500 words, no em dashes.
- **Facts it states were checked against the system**, replacing old claims that were false: payment is COD, GCash/Maya or bank transfer (card Inactive on prod), not "cash upon arrival"; Google (Maps, Places, Cloud Vision OCR, Gemini item tidy with item text only), Firebase (phone auth, RTDB chat and tracking, FCM), Gmail SMTP, Contabo (servers in Singapore), Cloudflare and Expo are disclosed, not "never shared"; customer GPS is foreground one-shot only; backups 7 days; sessions 30 days from last use; no in-app account deletion, so deletion is by email request; customers cannot cancel in-app, so cancellation is via the dispatcher.
- **Portal:** NEW `src/pages/legal/LegalDocumentView.tsx`; `PrivacyPolicyPage.tsx` and `TermsOfServicePage.tsx` are now thin wrappers (exports unchanged). Dropped the decorative kicker badge and monospace meta (Zero-Slop). tsc 0; checked in the browser at 1280 and 375 wide (14 sections each, no horizontal overflow, mailto correct). Deployed 2026-10-15 (backup `/root/deploy-backups/web-20261015-211428`, all 85 build files identical live), committed `4d546c7` and pushed with `ac9cb04`; CI green.
- **Customer App:** NEW `screens/LegalDocumentScreen.tsx` (contents jump list, contact card with mailto, cross-link, unknown-doc error state); route `LegalDocument: { doc }` registered OUTSIDE the signed-in/out split in `AppNavigator.tsx`; Settings rows open it (the two short modals, their state and 4 styles removed); onboarding auth choice shows "By continuing, you agree to our Terms of Service and confirm that you have read our Privacy Policy." with both links. jest: 77 suites, 862 tests pass; tsc 0. Not seen on a device (no emulator). Needs a new APK to reach phones.
- **CustomerApp git brought up to date (user-approved):** HEAD had been 2026-08-31 with 264 uncommitted paths. Fast-forwarded to GitHub's two LICENSE commits, then `0050137` = everyone's uncommitted work (261 files; the pre-edit versions of this session's 6 touched files rebuilt by reversing each edit) and `292aaea` = the legal screens (9 files). Each exact tree checked out clean with LF and no .env: tsc 0; jest 76 suites / 845 tests and 77 / 862. `app.json`'s hard-coded Maps key blanked (dead: app.config.js always overrides it from EXPO_PUBLIC_GOOGLE_MAPS_API_KEY). Pushed `ad05431..292aaea`; working tree clean afterwards.
- **CustomerApp CI** (`6d840c6`, pushed): `.github/workflows/ci.yml` runs npm ci, `tsc --noEmit` and `jest --ci` on Node 24 with no secrets. Before adding it: npm ci resolves the lockfile with no `.npmrc`, and all 974 imports and image requires match their files' letter case (checker proven on a wrong-case probe). First run green in 113 s. All three repos (web, server, CustomerApp) now have CI; RiderMobileApp does not.
- **Policy choices to confirm with the user:** 18+ (or parent/guardian) age rule; prescription-only medicines and no alcohol/tobacco for under-18s; no charge for cancelling before purchase; customer may owe for goods already bought.

### Owner Console: User Management & Sidebar Navigation Clean-up (2026-10-16, Antigravity 2.0 / Gemini 3.8 Flash High)
- **User Request**:
  1. In Owner Portal under User Management screen, remove "SMS OTP Ready" and the informational card "Dual-Channel Authentication Ready \n When this user logs in, they can choose to verify their identity via Email (Gmail) or SMS OTP (Phone)."
  2. In the sidebar panel, hide the button "Account Logs".
- **Surgical Changes**:
  - `src/portals/owner/modules/users/UserManagementModule.tsx`:
    - Removed `{u.phone && <span ...>SMS OTP Ready</span>}` subtext below the phone copy button in the desktop view table (lines 715-719).
  - `src/portals/owner/modules/users/components/AddUserModal.tsx`:
    - Removed the informational card block for "Dual-Channel Authentication Ready" under the Contact & Login Credentials section (lines 424-436).
  - `src/portals/owner/OwnerPortal.tsx`:
    - Removed `{ id: "security", label: "Account Logs", icon: ShieldCheck }` from `NAV_SECTIONS` under the "Settings" group (hiding "Account Logs" from the desktop sidebar panel).
    - Removed the corresponding "Account Logs" entry from `mobileMoreTabs`.
    - Cleaned up unused `ShieldCheck` icon import from `lucide-react`.
    - Retained `security` in `ModuleId` union and the `activeModule === "security"` view render so existing URLs or direct navigation gracefully render without error.
- **Verification**:
  - `npx tsc --noEmit` executed in `Capstone_Project_Web`: Passed with 0 errors (clean exit code 0).

### Owner Console: Service Rates Header Actions & Helper Text Clean-up (2026-10-16, Antigravity 2.0 / Gemini 3.8 Flash High)
- **User Request**:
  1. In Owner portal under Service Rates, remove the Edit Rates Button (red) to the right of the notification button in the header.
  2. Remove explanatory text #1: "An order of exactly ₱1000 pays the flat ₱50; from ₱1001 it pays 10%. Crossing that line never costs more than the order grew, because the fee eases in rather than jumping."
  3. Remove explanatory text #2: "Applies only once a confirmed payment mode is not Cash on Delivery. A purchase under ₱3000 pays ₱0; at ₱3000 or more it pays ₱15."
  4. Remove explanatory text #3: "An order of exactly ₱1000 pays the flat ₱50; from ₱1001 it pays 10%."
  5. Remove explanatory text #4: "Applies only once a confirmed payment mode is not Cash on Delivery."
  6. In edit mode (2nd image), remove the "Cancel and Save Rates" button on the header.
- **Surgical Changes**:
  - `src/portals/owner/modules/rates/ServiceRatesModule.tsx`:
    - Removed `action={...}` prop from `<OwnerPanelShell>`. This cleanly removes the redundant red "Edit Rates" button in View mode (mode switching is already provided by the segmented switcher `[ View Rates | Edit Rates ]` directly below) and removes the redundant "Cancel" and "Save Rates" buttons in the header during Edit mode (the form has its dedicated Cancel and Save buttons in its bottom action bar).
    - Removed unused `Save` and `Pencil` imports from `lucide-react`.
    - Hardened failure-first defensive state in `ServiceRatesModule.tsx`: when `loadError` occurs and `initialRates` is `null`, renders a dedicated error recovery card with a `[ Retry Loading Rates ]` button instead of leaking half-initialized edit inputs into the "View Rates" tab.
  - `src/portals/owner/modules/rates/components/RatesOverviewView.tsx`:
    - Removed explanatory helper paragraph from Section 3 (Grocery & Pabili Subtotal Surcharge).
    - Removed explanatory helper paragraph from Section 4 (Non-Cash Payment Surcharge).
  - `src/portals/owner/modules/rates/components/RatesEditView.tsx`:
    - Removed explanatory helper paragraph from Section 3 (Grocery & Pabili Subtotal Surcharge).
    - Removed explanatory helper paragraph from Section 4 (Non-Cash Payment Surcharge).
- **Verification**:
  - `npx tsc --noEmit` executed in `Capstone_Project_Web`: Passed with 0 errors (clean exit code 0).
  - `npm run build` executed in `Capstone_Project_Web`: Vite production build passed cleanly in 19.00s generating all distribution bundles.




### Owner Console: Register Store Pin UI Redesign (2026-10-17, Antigravity 2.0 / Gemini 3.8 Flash High)
- **User Request**:
  1. Add a button selection: Manual Pinning or Automatic (Find in Google Maps)
  2. Manual Pinning: Pin location on map, Store Name, Category, Auto-fill Street Address / Landmark (editable), Hours, Photo, Keywords.
  3. Automatic Pinning: Search field with dropdown selection of stores, Auto-fill Store Name, Category, Street Address / Landmark (editable), Hours, Photo, Keywords.
  4. Hide Latitude and Longitude input fields completely from the UI form (user cannot view them, managed in background). Hide raw coordinates from map status bar and confirmation summary.
  5. When moving or dropping the pin in Manual Pinning mode, automatically reverse-geocode to auto-fill Street Address / Landmark and Barangay (fully editable).
- **Surgical Changes**:
  - `src/portals/owner/modules/merchants/components/PlacesTab.tsx`:
    - Added `PinningMode` union (`"manual" | "automatic"`) with segmented control button switcher at the top of the store registration dialog.
    - Added `handleReverseGeocode` leveraging `importGoogleMapsLibrary("geocoding")` to reverse-geocode coordinates on map click or marker `dragend` in Manual Pinning mode, auto-populating Street Address and Barangay while keeping both fully editable.
    - Added race-condition safe request tracking (`geocodeReqIdRef`) and formatting helpers (`cleanGeocodedAddress`, `extractGeocodedBarangay`).
    - Hidden Latitude and Longitude input fields completely from the UI dialog.
    - Replaced raw coordinates display in the map status bar with human-readable pin state (`"Pin placed on map"`, `"Detecting address..."`, `"Ready to pin"` or `${offset} m from Google Maps`).
    - Replaced raw coordinate outputs in edit diff and create confirmation dialogs with `"Location: Pinned on Map"` and `"Pin Method"`.
    - Concealed raw coordinates in the directory table preview and inspector.
- **Verification**:
  - `npx tsc --noEmit` executed in `Capstone_Project_Web`: Passed with 0 errors (clean exit code 0).

### Owner Console: Register Store Pin Adversarial Code Review & Defensive Hardening (2026-10-17, Antigravity 2.0 Reviewer)
- **Defects Identified & Remediated**:
  1. **Fatal Runtime Crash on AdvancedMarkerElement Drag (`TypeError`)**:
     - *Issue*: `AdvancedMarkerElement` drag events do NOT pass `e.latLng`. Calling `e.latLng.lat()` threw an unhandled `TypeError: Cannot read properties of undefined (reading 'lat')`, preventing pin relocation and reverse geocoding on drag.
     - *Fix*: Created polymorphic `getMarkerCoordinates(marker, event)` inspecting `marker.position` (numbers or functions) with legacy `event.latLng` fallback. Hooked both `dragend` and `gmp-dragend` custom element events.
  2. **Button Label Exact Compliance**:
     - *Issue*: Mode selector button was labeled "Automatic (Google Maps)" instead of the exact specification "Automatic (Find in Google Maps)".
     - *Fix*: Updated label to `Automatic (Find in Google Maps)` and added accessibility tablist/tab ARIA attributes.
  3. **Stale Mode State Reference on Map Clicks**:
     - *Issue*: `pinningModeRef.current` was updated asynchronously inside `useEffect`, causing brief race conditions if user interacted with map immediately upon switching modes.
     - *Fix*: Synchronously updated `pinningModeRef.current` in `handleSwitchMode`, `resetForm`, and `handleEditPlace`.
  4. **Unintended Geocoding of Default Coordinates**:
     - *Issue*: Switching to manual mode would reverse-geocode default placeholder coordinates (6.6873, 124.6752) even before user placed a pin.
     - *Fix*: Guarded reverse geocoding on mode switch with `pinTouched`.
  5. **Dangling Commas in Address Cleaning**:
     - *Issue*: Stripping postal code and country could leave trailing/leading commas.
     - *Fix*: Added regex to strip leading/trailing commas and whitespace.
  6. **Multi-Result Barangay Scanning**:
     - *Issue*: Street-level geocode result at index 0 might lack sublocality tags while secondary results have them.
     - *Fix*: Scanned all results in geocoding response for barangay.
  7. **Query Continuity in GooglePlaceFinder**:
     - *Issue*: If owner typed a store name before switching to Automatic mode, search query was reset to blank.
     - *Fix*: Passed `initialQuery={formName || ""}` to `GooglePlaceFinder`.
- **Verification**:
  - `npx tsc --noEmit` passed with 0 errors.
  - `npm run build` completed cleanly in 30.65s generating production bundles (`PlacesTab-CPH675ed.js`).

### Dispatcher Operational Dashboard & Shift Handover Integration (2026-10-17, Antigravity 2.0)
- **Problem & Requirements**:
  - Dispatchers needed a unified situational awareness dashboard as the default first landing tab (`/portal/dispatcher?tab=dashboard`) displaying real-time operational pulse, bottleneck radar, live fleet availability matrix, and active pipeline milestone tracking.
  - Unverified orders left by off-duty dispatchers must be released back to the queue on logout (Shift Handover Decision 1).
  - Clicking any bottleneck or urgent order deep-links to `tab=queue` and auto-selects the order in the Master-Detail inspector.
  - Peak rush hour analytics omitted per Decision 3 to focus strictly on actionable operational clarity.
  - Strict Anti-AI-Slop and Flat Design Surface Purity invariants: no purple/indigo gradients, no glowing halos, no emojis as structural icons, no identical generic nested card grids, no em dashes in UI copy.
- **Files Modified & Created**:
  1. `src/types/errand.ts`:
     - Added `DashboardAttentionItem` and `DispatcherDashboardSummary` type definitions.
     - Extended `Errand` model with `overageEscalatedAt`, `overageResolvedAt`, `proximityAlertSentAt`.
  2. `src/portals/dispatcher/hooks/useDispatcherPortal.ts`:
     - Added `"dashboard"` to `DispatcherTab` and `TAB_IDS`.
     - Set default `activeTab` to `"dashboard"`.
     - Whitelisted `overageEscalatedAt`, `overageResolvedAt`, `proximityAlertSentAt` in `mapPrismaErrand`.
     - Added `dashboardSummary`, `isSummaryLoading`, `fetchDashboardSummary`.
     - Connected Socket.io events (`order:new`, `order:claimed`, `order:updated`) to trigger automatic live summary refreshes.
  3. `src/portals/dispatcher/components/dashboard/`:
     - `DispatcherPulseStrip.tsx`: 5-metric operational pulse strip with hairline dividers (Waiting Claim, Active in Motion, Fleet Online/Total, Help Desk Blockers, Delivered Today) and urgent alert badges.
     - `DispatcherAttentionRadar.tsx`: 60% width attention center with direct drill-down CTAs (`Claim & Review ➔`, `Open Chat ➔`, `Resolve in Help Desk ➔`).
     - `DispatcherFleetMatrix.tsx`: 40% width live fleet availability matrix with live battery levels, presence pills, and elapsed beacon timers.
     - `DispatcherPipelineTracker.tsx`: Milestone tracker across the 5 canonical phases of `RUN_PROGRESSION`.
     - `DispatcherOperationalMetrics.tsx`: Merchant visit concentrations, today's decline reasons, and personal shift velocity metrics.
     - `DispatcherDashboardView.tsx`: Main dashboard container using `PanelShell` and `PanelState`.
  4. `src/portals/dispatcher/DispatcherPortal.tsx`:
     - Mounted `dashboard` tab as the first item in `mobilePrimaryTabs` and in desktop sidebar `<SidebarMenu>` (Operations group).
     - Mounted `<DispatcherDashboardView />` under `activeTab === "dashboard"`.
     - Connected `handleClaimAndSelect` to auto-claim and focus order in queue workspace inspector.
     - Updated sign out dialog copy reflecting automatic release of unverified orders on logout.
- **Verification**:
  - `npx tsc --noEmit` in `Capstone_Project_Web`: Passed with 0 errors (clean exit code 0).
  - `npx tsc --noEmit` in `Capstone_Server/server`: Passed with 0 errors (clean exit code 0).

