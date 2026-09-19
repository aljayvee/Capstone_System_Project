# Finish review handoff: Dispatcher Management Console

## Original request

"Revamping and Fixing the UI and typeset and other problems in the Dispatcher
Management Console." Later in the same run, twice: "Our UI is in flat design
but it lacks details, a minimalist UI. Add minimalist design" and "Proceed with
the minimalist design."

## Confirmed answers (from the decision round)

| Question | Answer | Consequence |
|---|---|---|
| Approach | **Full redesign of the look** | The old appearance is evidence and anti-reference. Product truth, content, function, props and data hooks preserved exactly. |
| Scope | **Everything in the console** | All tab panels, the order-chat overlay and its five stage cards, the payment ledger, the conversation pane, the profile panel. |
| Defects | **Fix them with the UI** | Frontend only. No backend, Prisma, route or query changes. |
| Geometry | **Comply with the written rule** | Cards and controls 8-12px, chips `rounded-full`, modals 16-20px, one elevation step, no `backdrop-blur`. |
| Audience | **Real dispatchers, daily shifts** | Operate mode. Density and scanability outrank expression. |
| Scene | **Mixed, including tablet** | Light-primary surface. Structural responsiveness is a shipping target. |
| Red line | **"Looking like generic SaaS again"** | The unacceptable outcome. Distinctiveness is checked first. |

## Direction contract

`.impeccable/surfaces/src-portals-dispatcher-dispatcherportal-tsx.md`

Read it in full. The thesis is "the queue is a route board, not a dashboard";
the world is enamel-painted steel drawn from Philippine jeepney and tricycle
route signage (seed key f2716b25, kind assigned, code-led, candidate 6 of 7).
It also names three unresolved decisions and the verbatim FINISH line.

## Reference cards

- Craft floor: `.claude/skills/impeccable/reference/craft-floor.md`
- Operate mode (the visitor mode this build declares):
  `.claude/skills/impeccable/reference/operate.md`
- Typeset: `.claude/skills/impeccable/reference/typeset.md`
- Layout: `.claude/skills/impeccable/reference/layout.md`
- Prior critique snapshots: `.impeccable/critique/`
- Product truth: `PRODUCT.md` at the repo root

## Artifacts

Design system layer:

- `src/styles/tailwind.css` — the `@theme` block: seven type roles, the board
  palette, status pairs, radii, one elevation, the detail-layer line weights,
  `--shadow-field`, `--ease-board`, the `typing-dot` keyframe.
- `src/styles/dispatch.css` — browser surfaces scoped to
  `[data-surface="dispatch"]`: focus ring, selection, caret, scrollbars,
  tabular figures, the 1.5px lucide stroke, one transition curve, and the
  on-field inversion of the two shared chrome components. Note the deliberate
  layering decision documented at the top of the ground/ink rule.
- `src/lib/utils.ts` — `extendTailwindMerge` declarations for the custom
  `text-*`, `shadow-*` and `rounded-*` roles.

Primitives, `src/portals/dispatcher/components/ui/`:
`DispatcherCard` (+ `.Region`, `.Label`, `.Header`), `DispatcherButton`,
`DispatcherBadge` (+ `StatusChip`), `DispatcherInlineBanner`,
`DispatcherSearchField`, `PanelShell`, `PanelState`, `Field`.

Shared logic: `src/portals/dispatcher/lib/statusPresentation.ts`,
`src/portals/dispatcher/lib/useDraft.ts`.

Surfaces: `src/portals/dispatcher/DispatcherPortal.tsx` (the sidebar at lines
118-464 is OUT OF SCOPE and deliberately unconverted),
`components/workspace/*`, `components/order-chat/**`, `components/*Panel.tsx`,
`components/CustomerLocationModal.tsx`,
`components/UnauthorizedErrandScreen.tsx`, `src/components/chat/*`,
`src/components/NotificationBell.tsx`, `src/components/HeaderClock.tsx`.

## Screenshots, and what is wrong with them

All in `.impeccable/review/`.

| File | Shows |
|---|---|
| `board-desktop-1440.png` | Populated board at 1440. Real components, fixture data. |
| `board-tablet-1024.png` | Same at 1024: the 38/62 split still side by side. |
| `board-narrow-500.png` | Same at 500: band wraps, strip labels wrap, the board/run toggle appears. |
| `states-desktop-1440.png` | **Live portal with the API down.** The headline fix: failed fetch reported in the board's own voice, every figure a dash, no confident zero. |
| `states-exceptions.png` | The exception queue with the API down: "The exception queue did not load", not "Everything reconciles". |
| `states-profile.png` | Profile tab on PanelShell, all seven labels wired. |
| `states-riders-tablet.png` | Fleet tracking at 1024 with the live map. |

Three honest caveats:

1. **There is no 390px capture.** Chrome clamps its headless window to a 500px
   minimum on this machine in BOTH `--headless=old` and `--headless=new`:
   asking for 390 laid the page out at 500 and cropped the PNG to 390, which
   produced files that looked like broken layouts and were really crops. Proved
   with a probe badge printing `window.innerWidth` into the frame — it read
   "vw 500" at a requested 390. Those files were deleted rather than shipped.
   390 was instead verified numerically in a real 390 viewport: surface width
   390, page `scrollWidth` 390, and the only element whose `scrollWidth`
   exceeds its `clientWidth` is an `sr-only` span. Treat 390 as measured, not
   photographed.
2. **The API is unreachable from this machine** (CORS-blocked against
   `api.sugoonthego.online`; the local server answers 401 with stale seed
   credentials). Populated states therefore come from a fixture that renders
   the real components with fixed data. No state in this build has been seen
   against production records.
3. **No 500px capture of the live failed state.** The renderer terminated
   abnormally on that combination. `board-narrow-500.png` covers narrow layout
   and `states-desktop-1440.png` covers the failed state.

## Detector

`impeccable detect` over the dispatcher tree, the shared chat components, the
two shared chrome components and both stylesheets: **zero findings.** It found
one earlier (`animate-bounce` on the typing indicator) which is fixed.

## Own-verification already performed

Do not re-derive these; audit them if you doubt them.

- `npx tsc --noEmit`: 0 errors. With `--noUnusedLocals --noUnusedParameters`:
  0 findings in the console (34 remain elsewhere in the app, out of scope).
- `npm run build`: clean.
- 0 unused exports, 0 `*Props` members unreferenced (221 checked), 0 dead
  overridden classes (779 static `className` strings run through
  tailwind-merge and diffed).
- 0 emoji, 0 em dashes in strings, 0 gradients, 0 `backdrop-blur`, 0
  `active:scale`, 0 synthetic italics, 0 heavy shadows across all 51 files.
  Every remaining raw-slate / arbitrary-pixel / legacy-radius occurrence is
  inside the out-of-scope sidebar.
- WCAG: the palette's 22 measured pairs all clear 4.5:1; ratios are recorded
  in the token comments in `tailwind.css`.
- Keyboard: the notification popover opens with focus moved into the panel,
  flips `aria-expanded`, and Escape closes it and returns focus to the trigger.
- The Owner portal was checked for collateral: 2px icons, slate clock, nothing
  from `dispatch.css` reaching it.

## Known-open, deliberately

- The navigation rail is unconverted by instruction; its alignment contract is
  at `AGENT_HANDSHAKE.md:43-47`.
- The profile form's seven fields are not wired to `useDraft`, so they are
  still lost on a tab switch. The reasoning is in `useDraft.ts`: they are edits
  to server-loaded values and two of them are passwords. Needs a decision.
- `src/components/ui/dialog.tsx` still carries `backdrop-blur-xs` on its
  scrim. Shared with the Owner portal, so not changed without an Owner modal
  in front of me.
- Two `console.log` calls in the Socket.io listeners.
- The Owner portal will visibly diverge in card geometry. Accepted and recorded
  in the contract's unresolved decisions.

## What I want from you

Judge distinctiveness first, against the stated red line. Then the contract:
does the shipped surface deliver the THESIS, the OWN-WORLD, the FIRST VIEWPORT
and the named signature interaction, or only describe them? Then Operate mode:
is anything slower, denser or less familiar than it should be for someone on
hour ten of a shift. Then the craft floor.

Return an ordered list of material fixes and a disposition word.
