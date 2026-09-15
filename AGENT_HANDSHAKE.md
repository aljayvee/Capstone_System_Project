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
* `[LOCKED]` `Web Production Deployment Pipeline`:
  - Production Web Dashboard is served from `/var/www/web/dist/` on the Contabo VPS (`109.123.239.182`).
  - The build is generated locally via `npm run build` in `C:\Capstone_Project_Web`.
  - **User-Exclusive Execution Boundary**: The agent is STRICTLY FORBIDDEN from running `scp`. Deployment is executed exclusively and manually by the USER via:
    `scp -r C:\Capstone_Project_Web\dist\* root@109.123.239.182:/var/www/web/dist/`
* `[LOCKED]` `Outdated FigmaPrototype Folder Quarantine`:
  - `C:\Capstone_Project_Web\FigmaPrototype\` contains obsolete prototype code and must NEVER be referenced, inspected, or modified.
* `[LOCKED]` `Flat Design Surface Purity & Zero-Shadow Invariant`:
  - Flat design surfaces (e.g. login portal, flat operator consoles) strictly prohibit `backdrop-blur-*`, radial/ambient gradient blooms, heavy drop shadows (`shadow-2xl`, `shadow-lg`, `shadow-md`, `shadow-sm`), and decorative card hairline borders. Pure solid flat fills only.
* `[LOCKED]` `Impeccable UI/UX Design System & CLI Installation`:
  - Installed via `npx impeccable install -y --project` provisioning `.agents/skills/impeccable/`, `.claude/skills/impeccable/`, `.claude/agents/`, and native engine binaries.
  - All frontend interfaces across Web, CustomerApp, and RiderMobileApp strictly enforce the Impeccable craft floor (contrast >= 4.5:1, tinted neutrals, asymmetric vertical rhythm, browser surface theming, zero nested cards, no identical card grids, and visitor mode classification: Persuade/Experience vs Operate/Read vs Native).

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
* **Verification Ledger**:
  - `npx tsc --noEmit` verified with 0 errors on Capstone_Project_Web.
  - `npm run build` verified with 0 errors / 0 warnings (built in 27.91s).
  - `impeccable detect` verified with 0 anti-patterns across all target files.
  - Impeccable critique snapshots persisted at `.impeccable/critique/2026-09-15T20-46-18Z__src-components-loginpage-tsx.md` and `.impeccable/critique/2026-09-15T21-06-03Z__sidebar.md`.
* **Notes for Claude**:
  - Sidebar Alignment Pass fully ingested, verified, and locked in bidirectional memory.
  - Collapsed 36px tile column (10->46) and expanded axes (12 / 24 / 50 / 70) verified across Owner and Dispatcher portals.
  - Zero-gap rule (`group-data-[collapsible=icon]:gap-0`) confirmed preventing off-axis icon shift when labels collapse to width 0.
  - Production build in `dist/` is verified and ready for manual user SCP deployment.
