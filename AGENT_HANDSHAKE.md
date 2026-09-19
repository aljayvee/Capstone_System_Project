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
  - **User-Exclusive Execution Boundary**: The agent is STRICTLY FORBIDDEN from running `scp`. Deployment is executed exclusively and manually by the USER via:
    1. Landing Page (`https://sugoonthego.online`):
       `scp -r C:\Capstone_Landing_Page\dist\* root@109.123.239.182:/var/www/landing/dist/`
    2. Web & Staff Portal (`https://sugo-express.org`):
       `scp -r C:\Capstone_Project_Web\dist\* root@109.123.239.182:/var/www/web/dist/`
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
  - `C:\Capstone_Landing_Page\` (Full Impeccable Persuade revamp: PhoneMockup with 3 interactive screens, HowItWorks operational timeline, FareCalculator with Tacurong landmark presets, CoverageNetwork 20-barangay explorer, ApkInstallGuide, and SystemStatus live telemetry)
  - `C:\Capstone_Project_Web\.agents\rules\gemini-claude-thinking-alignment.md` (Created dedicated behavioral rule codifying Gemini non-autonomous execution and 6-stage Claude cognitive thinking process)
  - `C:\Capstone_Project_Web\.agents\rules\dual-agent-handshake-protocol.md` (Synchronized dual-agent roles to enforce non-autonomous Gemini pair programming)
  - `C:\Capstone_Project_Web\AGENTS.md`, `CustomerApp\AGENTS.md`, `RiderMobileApp\AGENTS.md`, `server\AGENTS.md` (Propagated invariant across all workspace AGENTS configurations)
* **Verification Ledger**:
  - `npx tsc --noEmit` verified with 0 errors on Capstone_Project_Web.
  - `npm run build` verified with 0 errors / 0 warnings on Capstone_Project_Web (built in 27.91s).
  - `npm run build` verified with 0 errors / 0 warnings on Capstone_Landing_Page (built in 2.27s).
  - `npm run lint` (oxlint) verified with 0 warnings and 0 errors across 13 files on Capstone_Landing_Page.
  - `impeccable context` verified operational across web project surfaces.
  - `impeccable detect` verified with 0 anti-patterns across all target files.
  - Rule definitions and frontmatter verified across all target rule files.
* **Notes for Claude**:
  - Impeccable UI/UX Design System and Anti-AI-Slop Invariant permanently learned and locked across all workspaces.
  - Landing Page (`C:\Capstone_Landing_Page\dist\`) completely revamped and ready for user SCP deployment to `/var/www/landing/dist/`.
  - Canonical domain mapping confirmed: `https://sugoonthego.online` (Landing Page) and `https://sugo-express.org` (Web / Staff Portal).
  - Gemini models (Gemini 3.x Pro, Gemini 3.8 Flash High) are now strictly bound to non-autonomous execution and fully adapted to the 6-stage Claude cognitive thinking process.

