# 🌐 DUAL-MODEL COLLABORATION TUNNEL (CLAUDE ◄► GEMINI)

> **ALWAYS ACTIVE IN ALL SESSIONS**: This file is the shared living memory between Claude App (Anthropic) and Antigravity 2.0 (Google AI / Gemini). Both models MUST read this file at the start of every session before modifying code.

---

## 📡 Tunnel State
* **Active Mission**: Dual-Agent Collaboration System Initialization
* **Current Driver**: Antigravity 2.0 (Gemini 3.7 Flash High)
* **Target Workspace**: `Capstone_Project_Web` (Web Dashboard & Consolidated Architecture)
* **Last Updated**: 2026-09-11

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
  - Deployment targets:
    1. **Web & Staff Portal** (`https://sugo-express.org`): `scripts/deploy-web.sh`
       (add `--no-build` to ship the existing `dist/`). Replaced the raw
       `scp -r dist/*` on 2026-09-23 — see the self-cleaning note below.
    2. Landing Page (`https://sugoonthego.online`): still raw scp, and still
       accumulates. `scripts/deploy-web.sh` takes `DEPLOY_ROOT=/var/www/landing`
       and can be pointed at it when someone wants the same treatment:
       `scp -r C:\Capstone_Landing_Page\dist\* root@109.123.239.182:/var/www/landing/dist/`
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
  - **`index.html` is served `no-cache, must-revalidate`** (nginx `location = /index.html`).
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
  - `C:\Capstone_Project_Web\src\portals\owner\hooks\useDashboardMetrics.ts` (Passes client local `todayStr` to `apiService.getDashboardSummary`)
  - `C:\Capstone_Project_Web\src\portals\owner\modules\reports\components\SalesReportView.tsx` (Default preset set to "TODAY")
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
* **Verification Ledger**:
  - `npx tsc --noEmit` verified with 0 errors on Capstone_Server/server.
  - `npm test` verified 53 passed test suites (745 tests passing) on Capstone_Server/server.
  - `npx tsc --noEmit` verified with 0 errors on Capstone_Project_Web.
  - `npm run build` completed cleanly on Capstone_Project_Web (dist/ built in 38.27s).
* **Notes for Claude & Next Session**:
  - Web portal enterprise session governance and account logs are fully deployed in source code.
  - Exclusivity rules and inactivity timers strictly apply to administrative roles (`OWNER`, `DISPATCHER`), leaving mobile customer/rider experiences untouched.
  - When deploying to Contabo VPS via SCP, production assets are built in `C:\Capstone_Project_Web\dist`.
