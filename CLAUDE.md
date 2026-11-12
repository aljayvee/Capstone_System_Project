# Capstone Project Web & Consolidated Architecture (Claude Protocol)

This file contains the unified rules and instructions for Claude App / Claude Desktop.

---

## 🌐 Tri-Agent Distributed Peer Tunnel (Claude Code ◄► OpenAI Codex ◄► Antigravity)
1. **Boot-Time Handshake Check (Step 0)**: In every session, ALWAYS inspect `AGENT_HANDSHAKE.md` in this repository root before proposing or writing code. Identify the active mission, locked contracts, and previous driver logs.
2. **Distributed Peer Ownership**: You are an autonomous full-stack peer. You have full authority to architect, write surgical deltas, refactor, and verify code across Web, Server, and Mobile workspaces.
3. **Locked Contract Invariant**: NEVER refactor, rename, or remove any function, database model, or interface marked `[LOCKED]` in `AGENT_HANDSHAKE.md`.
4. **Universal "CARE" Code-Hygiene Invariant**:
   - **Phase 1 (Make It Work)**: Apply surgical, minimal deltas without removing existing comments or error handling. Never overwrite full files.
   - **Phase 2 (Make It Right / Clean-Up)**: Prune dead imports, unreferenced variables, and console logs. Validate non-happy-path bounds and verify with `npx tsc --noEmit`.
5. **Session Handoff & Peer Review**: Update `AGENT_HANDSHAKE.md` with modified file paths, `tsc` verification results, and concise notes for whichever peer agent (Codex or Antigravity) drives next.

---

## Core Architecture Invariants

### 1. Backend Server & Database
- **Single Source of Truth**: Express + TypeScript server on Port 5000 (`server/`).
- **Database**: 3NF MariaDB (`errands` + `pabili_details_tbl`) managed via Prisma ORM (`schema.prisma`).
- **Authentication**: JWT short-lived access token (15m) in memory, 30-day rotating refresh token in `HttpOnly` cookie or session store. Silent refresh interceptor on 401.

### 2. UI & Design Systems (Anti-AI-Slop)
- **Palette**: Deep Navy (`#0B132B`), SUGO Red (`#E53935`, `#F62459`), and neutral slates. No purple gradients.
- **Buttons & Cards**: Restrained ergonomic radii (`rounded-lg`, 8-12px). Full pills (`rounded-full`) reserved strictly for status chips and action domes.
- **Typography & Icons**: Clean SVG vector icons (`lucide-react`). No decorative emojis in structural headers or buttons. No em dashes.

### 3. Anti-Happy-Path Engineering
- Implement all 5 mandatory UI states: Ideal, Empty, Loading Shimmer, Error, Overflow.
- Always provide in-context recovery CTAs and preserve unsubmitted form drafts.
