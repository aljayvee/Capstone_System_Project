# Finish-review handoff: Owner Portal

## The request, verbatim

> We are planning to remodel/revamp the Owner's Portal in the Owner Portal Web:
> Criterias:
>
> 1. Flat Design Layout with Premium Minimalist Designs
> 2. Eliminate AI Slop Designs.
> 3. Improvement of the UI/UX design of the Owner.
>
> Page Screens:
>
> * All Screens including the Warning and Error States.
> * Use the existing color palatte of the owner portal.
>
> Note: Don't touch the text in the Sidebar and in the headers.

## The four confirmed answers

| Question | Answer | Consequence |
|---|---|---|
| Relationship to the Dispatcher console | **Share grammar, own skin** | The Route Board's system inherited whole: seven type roles, three radii, the status law, the primitive contracts, the honesty rules. Rendered in the Owner's own navy-and-slate palette. **No concept roll** — the Impeccable flow forbids a concept tournament for a surface inside an established world. |
| Palette | **Navy + slate, accents semantic only** | `#1E3A5F` navy and slate neutrals stay. Green, amber, red survive only as status meanings, one fill and one ink each. Purple, violet, indigo, cyan, sky retired. |
| Sidebar and headers | **Wording frozen, appearance in scope** | Every nav label and header string ships byte-identical. The Sidebar Alignment Contract at `AGENT_HANDSHAKE.md:43-47` is preserved measurement for measurement. |
| Defects | **Fix them, frontend only** | Hook changes additive only; props and handler names unchanged; no backend, Prisma, route or query touched. `apiService.ts` and `apiClient.ts` are read-only for this run. |

## Artifacts

- **Direction contract / surface brief:** `.impeccable/surfaces/src-portals-owner-ownerportal-tsx.md`
- **Craft floor:** `.claude/skills/impeccable/reference/craft-floor.md`
- **Existing world (inherited, already finish-reviewed):** `DESIGN.md`, `.impeccable/design.json` (seed `f2716b25`, "The Route Board")
- **Locked invariants:** `AGENT_HANDSHAKE.md` — Flat Design Surface Purity & Zero-Shadow, Zero-Slop UI, Anti-Happy-Path; plus the Sidebar Alignment Contract at lines 43-47
- **Primary target:** `src/portals/owner/OwnerPortal.tsx`
- **Skin:** `src/styles/owner.css` (8 tokens), `src/styles/surfaces.css` (shared browser surfaces)
- **Promoted primitives:** `src/components/panel/`

## Screenshots, all in `.impeccable/review/`

| File | What it shows |
|---|---|
| `owner-dashboard-desktop-1440.png` | The recomposed dashboard: navy standing-figures band, period ledger, all-time footnote |
| `owner-reports-desktop-1440.png` | Six report tabs (real ARIA tabs), period toolbar, report error state |
| `owner-users-desktop-1440.png` | User directory |
| `owner-rates-desktop-1440.png` | Service rates — the only screen with all labels wired (10 of 10) |
| `owner-merchants-desktop-1440.png` | Merchant categories |
| `owner-riders-desktop-1440.png` | Riders |
| `owner-tracking-desktop-1440.png` | Tracking — the honesty case: chip, 4 tiles, roster header, 4 tab counts all agree |
| `owner-places-desktop-1440.png` | The consolidated verified-places directory (was 894 duplicate lines) |
| `owner-dashboard-tablet-1024.png`, `owner-reports-tablet-1024.png`, `owner-users-tablet-1024.png` | Tablet |
| `owner-dashboard-narrow-500.png`, `owner-reports-narrow-500.png` | Narrow |
| `dispatch-board-desktop-1440.png` | The Dispatcher, to prove the skin did not leak |

**Read these before judging the captures:**

1. **Every screen is in a failure or empty state.** The API is unreachable from this machine (CORS against `api.sugo-express.org`; the local server answers 401 with stale seed credentials). No state in this rebuild has been seen against production records. That makes the error paths unusually well covered and the populated paths **not verified at all**. Say so if it changes your reading.
2. **Captures were taken with all non-localhost hosts blocked at the resolver**, because the socket.io / Firebase / Google Maps retry loops otherwise stall Chrome's virtual clock (shots took 200s+ and the renderer died). A side effect: both map surfaces render their own map-failure state. That is a real state, newly built this round.
3. **The sidebar is collapsed to its 56px rail in every capture.** That is the app's genuine default — `OwnerPortal.tsx` passes `defaultOpen={false}`, unchanged from `HEAD`. The expanded 256px rail was verified numerically instead, against the alignment contract, and matches on every measurement (rail 256, row box 12→243, icon axis 24, icon size 16, label axis 50; collapsed: rail 56, tiles 36×36 at 10→46, axis 28).
4. Chrome's headless window clamps to a 500px minimum on this machine, so the 390px case is measured numerically rather than photographed.

## Detector

`impeccable detect --json` returns **0 findings repo-wide**, down from a 9-finding baseline (5 `gray-on-color`, 2 `side-tab`, in `CategoryCard`, `CategoryImagePicker`, `UserManagementModule`, `PlacesTab`, `PlacesDirectoryScreen`). Nothing was passed on.

## What changed, in one page

**The skin.** Eight custom properties on `[data-surface="owner"]`. Every token utility compiles to a `var()` reference and `@theme` emits its variables into a plain `:root,:host` rule, so a descendant carrying `data-surface="owner"` that redefines the same property overrides it for its whole subtree. Zero edits to the 51 already-reviewed Dispatcher files. The trim is `#98A7BB`, not slate-400, because slate-400 measures 4.49:1 as text on the navy field and fails AA by one hundredth.

**The truth layer.** `apiService.updateRateConfig` returns `null` on failure and `ServiceRatesModule` ignored it, so `toast.success("Rate configurations successfully saved to MariaDB!")` fired on a **rejected write to the pricing every customer pays**. It now checks the return value. When the config fails to *load*, the form no longer shows hardcoded seeds as if they were saved. `useRiderFleetPresence` gained a `loadError` channel (additively — socket, Firebase subscription and 15s poll untouched), so Tracking no longer renders "0 Ready / 0 Delivering" beside a pulsing green dot over a dead endpoint.

**The composition.** The dashboard's six identical tiles (differentiated by twelve raw hexes passed as a `color: string` prop) became three regions by time base. `MetricCard`'s `color` prop is deleted rather than re-themed; `tone` names a meaning from the status law instead, and 26 of 28 call sites correctly pass none.

**The consolidation.** `PlacesDirectoryScreen` was 953 lines, 894 identical to `PlacesTab`, unreachable from inside the portal, and already diverged over whether retired stores appear. It is now a 75-line route shell.

## Where to look hardest

These are the things I am least sure about, stated plainly:

1. **The heading outline.** Users, Merchants and Tracking still carry their own header markup rather than `OwnerPanelShell` — their bodies are `flex-1` chains that need restructuring. I promoted their titles to `h1` with the shell's treatment so the document outline and typography are right, but the header *component* is still duplicated four ways and each of those three still mounts its own `HeaderClock` and `NotificationBell`. Down from eight copies, not to one.
2. **Form wiring is 10 of 50.** All ten are in `ServiceRatesModule` and all ten pair exactly. The other forty are in `AddUserModal` (538 lines), `EditUserModal` (804), `PlacesTab` and `CategoryCard`. `aria-describedby` and `aria-invalid` are **0 portal-wide**, so roughly 38 validation messages are not linked to the inputs they describe.
3. **Five hand-rolled overlays still lack `role="dialog"`, `aria-modal`, focus trap, focus restore and Escape** — `MerchantCategoryModule`, `PlacesTab`, `AddUserModal`, `EditUserModal` (×2). `ConfirmDialog` is built and in use by `PlacesTab`'s delete path.
4. **`SettlementReportView` still ships two near-identical tile rows on one screen** (`:75`, `:165`), which the audit flagged and I did not fix.
5. **Empty ground.** Every panel state is top-aligned in a tall viewport, leaving 400-600px of empty slate below. The Dispatcher finish review flagged the inverse (states centred in empty bone). I do not know whether this reads as calm or as unfinished.
6. **`shadow-plate` survives in three shared places** — the `NotificationBell` popover and two floating map controls — on the argument that content floating over map imagery or the page needs one elevation to be findable. The Owner skin is otherwise zero-shadow, and `shadow-plate` compiles its colour inlined so it cannot be re-skinned per surface. Call it if that is a contradiction.
7. **The `board-trim` group labels on the navy rail went from 7.75:1 to 4.70:1.** Deliberate: `board-trim` is the one declared role for text on the field, and a second on-navy level would reintroduce the third ink level the direction forbids. It clears AA for small text. It is still a contrast reduction I chose.

## Verification ledger

- `npx tsc --noEmit` — 0 errors
- `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` — 0 in `src/portals/owner/**`, `src/components/panel/**` and `LiveFleetMap`. **8 pre-existing findings remain in shared files I did not author** (`App.tsx`, `ErrorBoundary`, `PlacesMiniMap`, `StaffAvatar`, `popover`, `sidebar`, and two in `useRiderFleetPresence` that sit at the same line numbers in `HEAD`).
- `npm run build` — clean. OwnerPortal chunk 250.57 kB / 55.57 kB gzip, down from 272.04 / 59.08.
- `impeccable detect` — 0 findings.
- **There is no test infrastructure in this repo** (no vitest, no testing-library, no test script). The above is the whole automated safety net.
- WCAG: 20 token pairs computed, 0 failures. Tightest are `board-trim` on the field at 4.70:1 and white on `signal` at 4.83:1.
- Browser-verified: heading outline on all 8 screens; the WAI-ARIA tabs pattern including ArrowLeft/Right, Home, End and wrap-around; `aria-controls` emitted only on the selected tab (it dangled on unselected tabs, because only the active panel mounts); focus ring resolving to the field token on real keyboard focus; the sidebar alignment contract in both states; the Dispatcher resolving its own tokens (`#0F2035` field, `#F2EEE4` ground) with a modal open, proving no leak and no regression from the `dialog.tsx` change.

## Temporary scaffolding — must not ship

`src/app/routes.tsx` carries three unprotected verification routes, `/__owner`, `/__dispatch` and `/__places`, because the seeded staff credentials no longer log in. **They are removed with `git checkout -- src/app/routes.tsx` before any commit.** Do not treat them as part of the build.

## Your job

Judge the shipped build against the direction contract, the request, and the craft floor. Return an ordered list of material fixes, most serious first, and a one-word disposition. Prefer naming the one thing that most betrays the thesis over listing many small ones.
