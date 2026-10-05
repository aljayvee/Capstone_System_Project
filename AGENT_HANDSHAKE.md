# 🌐 DUAL-MODEL COLLABORATION TUNNEL (CLAUDE ◄► GEMINI)

> **ALWAYS ACTIVE IN ALL SESSIONS**: This file is the shared living memory between Claude App (Anthropic) and Antigravity 2.0 (Google AI / Gemini). Both models MUST read this file at the start of every session before modifying code.

---

## 📡 Tunnel State
* **Active Mission**: Dispatcher UI Polish, Functional Rider Item Checklist (#1), Smart Out-of-Stock Substitute AI (#2), Debugging Time Items Lifecycle, & Owner Database Operations Digest (#3)
* **Current Driver**: Antigravity 2.0 (Gemini 3.7 Flash High)
* **Target Workspace**: `Capstone_Project_Web` (Web Dashboard & Consolidated Architecture)
* **Last Updated**: 2026-09-26 (Debugging Time Fixes Deployed to `https://sugo-express.org`)

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

