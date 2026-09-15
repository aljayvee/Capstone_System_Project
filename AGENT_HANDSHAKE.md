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
  - `C:\Capstone_Project_Web\src\portals\owner\modules\users\components\EditUserModal.tsx` (Protected currently logged-in Admin from self-deactivation and self-role re-assignment)
  - `C:\Capstone_Server\server\src\services\userService.ts` (Enforced server-side self-deactivation and self-role alteration rejection)
  - `C:\Capstone_Project_Web\.env` (Updated to production API domain: https://api.sugoonthego.online/api)
* **Verification Ledger**:
  - `npx tsc --noEmit` verified with 0 errors on Capstone_Project_Web.
  - `npx tsc --noEmit` verified with 0 errors on Capstone_Server/server.
  - `EditUserModal` renders locked Active badge ("Active (Current Admin)") and locked Role card ("Admin - Current Admin / Locked") when editing self; other role/status options avoided.
* **Notes for Claude**:
  - Production backend live at `https://api.sugoonthego.online` on Contabo VPS with Let's Encrypt SSL and MariaDB.
  - Production web dashboard live at `https://sugoonthego.online` on Contabo VPS with Let's Encrypt SSL serving built React bundle via Nginx.
  - Self-deactivation and self-role alteration prevention invariants enforced on both frontend (`EditUserModal`) and backend (`userService.ts`).
