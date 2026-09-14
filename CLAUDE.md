# Capstone Project Web & Consolidated Architecture (Claude Protocol)

This file contains the unified rules and instructions for Claude App / Claude Desktop.

---

## 🌐 Dual-Agent Tunnel Invariant (Always Active in All Sessions)
1. **Boot-Time Handshake Check (Step 0)**: In every session, ALWAYS inspect `AGENT_HANDSHAKE.md` in this repository root before proposing or writing code.
2. **Locked Contract Invariant**: NEVER refactor, rename, or remove any function, database model, or interface marked `[LOCKED]` in `AGENT_HANDSHAKE.md`.
3. **Surgical Diffs**: Always generate precise, minimal deltas without removing existing comments, defensive checks, or adjacent logic.
4. **Handoff Directives**: When designing new features or plans, format your output so the user can easily paste it into `AGENT_HANDSHAKE.md` for Antigravity execution.

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
