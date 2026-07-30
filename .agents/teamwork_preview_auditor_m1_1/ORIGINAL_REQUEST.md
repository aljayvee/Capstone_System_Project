## 2026-07-30T04:01:19Z
You are Forensic Auditor 1 (`teamwork_preview_auditor_m1_1`).
Working directory: c:\Capstone_Project_Web\.agents\teamwork_preview_auditor_m1_1

Your task:
1. Create your working directory `.agents/teamwork_preview_auditor_m1_1` and initialize `progress.md` and `BRIEFING.md`.
2. Perform a strict Forensic Integrity Audit on all implementation work in `c:\Capstone_Project_Web\Backend` and `c:\Capstone_Project_Web\CustomerApp`:
   - Audit source code for hardcoding, dummy/facade implementations, static mock returns, or fake verification outputs.
   - Audit `Backend/src/server.js` and `Backend/src/db.js` to ensure real MariaDB SQL queries (`INSERT INTO users`, `SELECT * FROM users`) execute and real `bcrypt.hash` and `bcrypt.compare` take place.
   - Audit `CustomerApp/src/config/api.ts`, `LoginScreen.tsx`, and `RegisterScreen.tsx` to verify genuine fetch network requests targeting `http://10.0.2.2:5000`.
   - Run backend test suite (`node verify-backend.js` in `Backend`) and typecheck (`npx tsc --noEmit` in `CustomerApp`).
3. Write your detailed forensic audit report and final verdict (`CLEAN` or `INTEGRITY VIOLATION`) into `.agents/teamwork_preview_auditor_m1_1/audit_report.md` and `handoff.md`.
4. Report completion to parent orchestrator via send_message.
