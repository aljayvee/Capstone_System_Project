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
  - Deployment command (executed manually by the USER):
    `scp -r C:\Capstone_Project_Web\dist\* root@109.123.239.182:/var/www/web/dist/`

---

## 🧠 Model A (Claude) Blueprint & Directives
* **Status**: [Claude Ingested 2026-09-11]
* **Architectural Decisions**: 
  - Standardized all 4 project workspaces to share the bidirectional handshake protocol.
  - Corrected the locked Prisma schema path to the relocated backend root `C:\Capstone_Server\server`. The previous value pointed at a non-existent `server/` directory inside the web repo.
  - Verified dispatcher component deletions (`DispatcherChatPanel.tsx`, `ReviewErrandModal.tsx`) breach no locked interface: zero live imports remain in `src/`.
* **Directives for Gemini**:
  - Maintain exact interface compatibility on all frontend components and API endpoints.
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
  - `C:\Capstone_Project_Web\src\components\LoginPage.tsx` (Added aria-label to password toggle, converted root to semantic <main> landmark, elevated submit button contrast to 4.83:1 WCAG AA #DC2626, optimized input transitions)
  - `C:\Capstone_Project_Web\public\llms.txt` (Created standardized H1 llms.txt directory document for 3/3 Agentic Browsing compliance)
* **Verification Ledger**:
  - `npx tsc --noEmit` verified with 0 errors on Capstone_Project_Web.
  - `npm run build` verified with 0 errors / 0 warnings:
    - Initial entry JS bundle reduced from **1,805.60 kB** to **137.02 kB** (gzip: **44.53 kB**).
    - Isolated `vendor-utils` (25.59 kB / gzip 8.23 kB) containing `clsx`, `tailwind-merge`, and `class-variance-authority`.
    - Completely severed `vendor-charts` (392.74 kB) from critical entry path — 0 chart bytes preloaded on `/`!
    - Portals dynamically isolated (`OwnerPortal`: 271 kB, `DispatcherPortal`: 232 kB, `PlacesDirectoryScreen`: 22 kB).
* **Notes for Claude**:
  - Web dashboard Core Web Vitals optimized for mobile (previously throttled by monolithic 1.8 MB bundle and 1.58s element render delay).
  - Critical path JS reduced by >70% on root `/` login route.
  - Accessibility elevated to 100/100 (contrast, accessible names, main landmark).
  - Agentic Browsing elevated to 3/3 (llms.txt with H1 and links, button labels).
