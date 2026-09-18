# The Route Board

The design system of this application's operator surfaces. It ships in **two
skins on one system**:

| Skin | Surface | Root attribute | Where its colour lives |
|---|---|---|---|
| **The Route Board** (the original) | Dispatcher Management Console, `src/portals/dispatcher/` | `data-surface="dispatch"` | the `@theme` block in `src/styles/tailwind.css` |
| **Cool slate** (added later) | Owner Portal, `src/portals/owner/` | `data-surface="owner"` | `src/styles/owner.css` |

**Everything in this document is shared by both skins unless it sits under
[The second skin](#the-second-skin-the-owner-portal).** Type roles, radii, the
status law, the signal red, the line-weight relationship, the primitives, the
honesty layer and the copy rules are one system with one set of values. The
Owner Portal redefines **eight colour tokens and one elevation rule**, and
nothing else.

Written for whoever extends either surface next. It records the rules and the
reason behind each one, because most of these were introduced to replace a
specific defect and will be reintroduced by anyone who only sees the rule.

Scope: everything under `src/portals/dispatcher/` and `src/portals/owner/`,
plus `src/components/panel/`, `src/components/chat/` (consumed only by the
console) and the two shared chrome components `NotificationBell` and
`HeaderClock`. **The navigation rail is deliberately outside this system** —
see [Out of scope](#out-of-scope).

---

## The thesis

**The queue is a route board, not a dashboard.** Every errand is a run with a
destination, a route number and a departure clock, painted to be read across a
room. The world is enamel-painted steel, drawn from Philippine jeepney and
tricycle route signage.

This exists to refuse one specific arrangement: metric tiles stacked above a
table, with a tinted icon chip beside every heading. That is what the console
shipped before, it is what every competitor ships, and "looking like generic
SaaS again" was named as the unacceptable outcome for this redesign.

The direction contract is at
`.impeccable/surfaces/src-portals-dispatcher-dispatcherportal-tsx.md`. It
carries an amendment note worth reading: its original OWN-WORLD line described
"condensed vinyl-cut caps", which was corrected because Geist Variable has no
width axis and no condensed face was added. Lettering is **case, weight and
tracking only**.

---

## Where the system lives

| File | What it owns |
|---|---|
| `src/styles/tailwind.css` | The `@theme` block: every token below. Additive to the Owner portal's tokens; nothing pre-existing was changed. |
| `src/styles/surfaces.css` | Browser surfaces for every skin, keyed on bare `[data-surface]`: focus ring, selection, caret, scrollbars, numerals, icon stroke, one motion curve. Formerly `dispatch.css`. |
| `src/styles/owner.css` | The Owner skin: eight colour tokens on `[data-surface="owner"]`, plus the zero-elevation guard. |
| `src/lib/utils.ts` | `cn()`, and the `extendTailwindMerge` declarations that keep custom roles alive. |
| `src/components/panel/` | The primitives, and the portal-neutral barrel (`index.ts`) new code imports from. |
| `src/lib/statusPresentation.ts` | The status law. |
| `src/portals/owner/components/` | The Owner Portal's three own devices: `OwnerPanelShell`, `OwnerTabs`, `StandingFigures`. |
| `src/portals/dispatcher/lib/useDraft.ts` | Unsubmitted-draft survival. |

Do not hardcode a value this layer names.

---

## Type: seven roles, and nothing else

Each role carries its own line-height, weight and tracking, so a role cannot
drift into four different weights the way the previous console did — it set
font size inline **438 times** across ten sizes, 55% of them arbitrary pixels
down to `text-[9px]`, and shipped the same status chip at four sizes in three
weights.

| Role | Size | Weight | Tracking | For |
|---|---|---|---|---|
| `text-micro` | 12px | 600 | +0.06em | Uppercase label tier: column heads, field labels, chip text |
| `text-label` | 13px | 600 | — | Secondary reading tier: list metadata, helper copy |
| `text-body` | 14px | 400 | — | Prose. **The only 400 role**; the old console had no normal weight at all |
| `text-data` | 15px | 600 | — | Money, quantities, timers, route numbers. Tabular by contract |
| `text-panel` | 17px | 700 | −0.01em | Card and stage titles |
| `text-title` | 22px | 700 | −0.02em | Surface and panel titles, and route-plate destinations |
| `text-board` | 34px | 700 | −0.02em | Counts read across a room |

**The floor is 12px.** A dense operational console earns sizes below the 16px
web body floor; it does not earn 9px. There is deliberately **no token below
`text-micro`** — a contrast or legibility failure needs a token to express it,
and none exists.

**Titles stop at 700** (AGENTS.md 8.3 rule 7). `font-black` does not appear on
a heading anywhere in this console.

`font-mono` (Geist Mono) has exactly one job: **data and measurement** — money,
quantities, timers, route numbers. Not form inputs, not chrome. Note that
`src/styles/fonts.css` sets `font-feature-settings: 'tnum' 1` inside
`.font-mono`, which *replaces* the body's `cv02/cv03/cv04/cv11` character
variants rather than adding to them; `surfaces.css` re-declares all five
together under `[data-figure]` so a figure keeps the same alphabet as the
sentence beside it.

**Mark every numeric span `data-figure`.** That is what gets it tabular
numerals and the correct letterforms.

---

## Colour

### The field, the ground, the plate

```
--color-board-field       #0F2035   the navy field
--color-board-field-deep  #0B132B   the deeper field: overlay headers, the board band
--color-board-trim        #8494A8   chrome trim, and text on the field
--color-board-ground      #F2EEE4   bone. The working ground
--color-board-plate       #FFFFFF   a plate on the ground
```

`#0F2035` was hardcoded eight times and was never a token, while `#1E3A5F` was
hand-written 143 times.

The board band uses `field-deep` and the standing-figures strip uses `field`,
on purpose: they sit across a 16px gutter from the navigation rail, which is
also `#0F2035`, and at the same value the band read as a detached piece of the
rail.

### Ink: two levels, both tinted

```
--color-ink        #16202E
--color-ink-muted  #53606F
```

Both clear 4.5:1 on bone and on white. Both are tinted with the field's hue —
**never dead grey**. There is deliberately no third level: the previous console
used `text-slate-400` on white (about 2.6:1) 95 times, and a third level is how
that comes back.

### SUGO red has exactly one legal meaning: **you must act**

It carries the primary action and the states that demand a decision. Nothing
else. It is never decoration, never emphasis, never "large number".

Three values exist only because one red cannot clear AA on every ground, and
the ratios are measured rather than assumed:

```
--color-signal          #DC2626   white on this = 4.83:1
--color-signal-deep     #C62828   hover only
--color-signal-on-field #FF8A85   red on navy = 7.22:1
```

`#E53935` from the brand palette measures **4.23:1** under white text, which
**fails** at the 17px/700 of a button label; and on navy it is only 3.89:1.
`#DC2626` is also the red `LoginPage` already uses for its primary CTA.

For red text on bone or white, use `--color-status-act-ink` (#A81E1A, 6.33:1).

### Status law: one fill, one ink, five meanings

```
waiting  #FBEBC8 / #7A4A05   someone else owes the next move
moving   #E2E9F2 / #1E3A5F   in motion, nothing owed
done     #D9F2E5 / #0B5B42   finished well
closed   #E6E8EB / #414B57   ended without completing
act      #FBE0DE / #A81E1A   you must act (shares the signal's meaning)
```

**A status may never be carried by colour alone.**
`lib/statusPresentation.ts` pairs every tone with a label *and* a CSS-drawn
mark (ring, diamond, dot, bar, ring-plus-dot — shapes, never glyphs), and maps
all 15 real API status strings. **An unrecognised status resolves to neutral
and is never guessed.**

`StatusChip` from `ui/DispatcherBadge` is the only correct way to render an
errand status. Four separate hand-rolled chips existed before, one of which
painted every non-closed status confident emerald *including `CANCELLED`*, and
one of which keyed on `"AT_STORE"` — a spelling the API never sends.

---

## Line weight: two tokens, one fixed relationship

```
--color-hairline    rgb(132 148 168 / 0.26)   rules INSIDE a plate
--color-edge        rgb(132 148 168 / 0.45)   a plate's own boundary
--color-field-line  rgb(255 255 255 / 0.14)   rules on the navy field
```

**A surface's boundary is always heavier than any rule inside it. Nothing may
invert that.** Before this, rules were written at five strengths chosen per
call site (`/25 /30 /40 /50 /60`), and the errand card actually did invert the
relationship — its selected row's rule was heavier than its unselected one.

Flat is not the same as undetailed. A flat surface has forfeited gradients,
blurs and stacked shadows, so every bit of its hierarchy has to be carried by
line weight, rhythm and stroke instead.

---

## Geometry, elevation, motion

```
--radius-plate  10px   cards and controls
--radius-trim    6px   inner marks, chips-that-are-not-pills, small controls
--radius-modal  16px   modals
```

Per AGENTS.md 8.2. `rounded-full` is for **status chips and numbered markers
only**. `rounded-2xl` had become the card radius in 49 places across 16 files.

**One elevation step**: `--shadow-plate: 0 1px 2px 0 rgb(15 32 53 / 0.06)` —
tinted from the field, not black. The console had ten levels.

Plus one inset light, used **only on navy plates**:
`--shadow-field: inset 0 1px 0 0 rgb(255 255 255 / 0.10)`. Painted steel has a
lit top edge; that one hairline is the difference between a plate bolted to a
wall and a navy rectangle. It has no counterpart on white, where it would be
invisible and a second shadow would break the one-elevation rule.

No `backdrop-blur` anywhere in this console.

**Motion**: `--ease-board: cubic-bezier(0.2, 0, 0, 1)` is the one curve for
every state change on the surface, applied in `surfaces.css` to anything that
declares a transition. All 60-odd `transition-*` utilities named properties and
left the timing at the default, so a hover, a selection and a disclosure each
moved differently.

`--animate-typing-dot` is opacity-only and has a `prefers-reduced-motion`
override beside `fade-in` and `scale-up`. It replaced `animate-bounce`, which
was both dated easing and the one animation sitting outside that guard.

---

## `surfaces.css` and the cascade-layer split

This file was `dispatch.css`, scoped to `[data-surface="dispatch"]`. It is now
keyed on **bare `[data-surface]`**, with no value, so one rule set serves both
skins: nothing in it was ever dispatcher-specific once its colours became
tokens, and each skin redefines those tokens on its own root. Two defects went
with the same change. The dispatcher's console root carried only `data-portal`
and never `data-surface`, so six of the seven rule groups reached the portalled
overlays and never the console body, which means the focus ring meant to
replace per-component focus styles was only ever firing inside modals.

It is **deliberately unlayered**, so it outranks Tailwind utilities. That is what lets one
`:focus-visible` rule replace per-component focus styles across 31 files — the
console previously had **zero** focus styles, so keyboard operation was
invisible.

**The exception is load-bearing.** The ground and ink declarations sit in
`@layer base`, because unlayered CSS beats *layered* CSS at equal specificity
regardless of source order, and every Tailwind utility lives in
`@layer utilities`. Without the layer, `background-color` here silently
outranked every `bg-*` class on any element carrying `data-surface` — which is
how the modals ended up rendering on bone with `bg-board-plate` present in
their `classList` and losing the cascade.

**Rule: anything added to this file that a component may legitimately need to
override goes in `@layer base`. Anything meant to outrank utilities stays
unlayered, with a comment saying so.**

It also sets the **icon stroke** once:

```css
[data-surface] svg.lucide:not([data-stroke]),
[data-portal] svg.lucide:not([data-stroke]) { stroke-width: 1.5; }
```

lucide-react writes `stroke-width` as a presentation *attribute*, which any CSS
declaration outranks, so all 107 icons are set from one rule with no call-site
edits. 2px at size 14 is a seventh of the glyph's height: it fills the
counters and is why small icons read as clip art beside Geist at 600.
`data-stroke` on an icon is the only sanctioned opt-out.

`data-portal="dispatch"` sits on the portal shell and carries **nothing but the
icon stroke**, so the navigation rail matches the console without any of the
rail's geometry changing.

---

## Two attributes you must not forget

**`data-surface`** takes one of two values, `dispatch` or `owner`. It belongs
on the surface root **and on any portalled content**: dialogs, modals, the
full-screen order-chat overlay. Portalled content renders at `document.body`,
outside the surface element, so without it there is no focus ring, no themed
caret, selection or scrollbar, no tabular figures, and every icon is back at
lucide's 2px default. The order-chat overlay ran without it for an entire batch
and nobody could see why its focus ring was missing, and the dispatcher console
body itself was missing it until `surfaces.css` was generalised.

The value is also what selects the skin: `owner` picks up the eight
redefinitions in `owner.css`, `dispatch` gets the `@theme` defaults.

**`data-on-field`** marks any subtree painted on the navy field. It inverts the
focus ring and the selection colours, and it is the hook `surfaces.css` uses to
invert the two shared chrome components (`data-clock`, `data-bell`) when they
sit on the board band — neither needed a new prop.

---

## `cn()` and tailwind-merge

`src/lib/utils.ts` wraps `twMerge` with `extendTailwindMerge`, declaring every
named `text-*`, `shadow-*` and `rounded-*` role.

**Every new named role must be added there.** Undeclared roles are
misclassified, and the failure is silent in both directions:

- `cn("text-board", "text-board-plate")` resolved as two competing *colours*,
  kept the last, and dropped `text-board` entirely — so every board figure
  rendered at the inherited 16px/400 while the token was perfectly correct.
- An undeclared `shadow-*` or `rounded-*` role does the opposite: it does not
  conflict with the known one, so **both** classes reach the DOM and
  stylesheet order decides the winner.

Nothing in `tsc`, `vite build` or the design detector reports either case. The
only reliable check is reading the live element's `classList`, and then its
computed value.

---

## Primitives

All in `src/components/panel/`, promoted there from
`src/portals/dispatcher/components/ui/` when the Owner Portal adopted them.
They render in either skin without a line of change, because every token
utility in them compiles to a `var()` reference.

Five still carry `Dispatcher*` in their declared names, which is historical
rather than meaningful; renaming the symbols would have touched every JSX call
site across 25 dispatcher files for no behavioural gain. **`index.ts` supplies
the portal-neutral aliases, and new code in either portal imports from
there**: `PanelCard`, `PanelButton`, `StatusChip`, `InlineBanner` and
`SearchField`, alongside `PanelShell`, `PanelState`, `Field` and
`ConfirmDialog`.

### `PanelShell` — the shape every tab takes

Three pinned zones and **exactly one scroller** (AGENTS.md 8.12): header,
controls, scroller, footer. **It owns all viewport math.** Panels must never do
their own `h-[calc(100vh-Npx)]` — five of them did, with four different
constants and minimums that guaranteed content taller than the viewport on a
1280×720 laptop.

Its header is the board's vocabulary, not a dashboard's: the title in **board
caps** at `text-title`, and a `figure` slot that puts the panel's headline count
on a navy plate. That slot matters more than it looks — six of the console's
seven tabs route through this one component, so when its header was
sentence-case on bone with a search field at the right, the route-board world
reached exactly one tab and the rest were the generic admin panel.

`figure.urgent` spends the signal red. Use it **only** where the count means
someone must act (the exception queue). A count of runs on the road is
information, not an instruction.

The header stacks until `md`, not `sm`: every consumer puts a 288–320px search
field in `aside`, and between 640 and 767px that field and a 22px title
competed for one row, so a panel could announce itself as "Cust…".

### `PanelState` — loading, failed, empty, from one contract

`{ isLoading, error, isEmpty, hasFilters, onRetry, onResetFilters }`.

**`error` is ordered before `isEmpty`, and that ordering is the feature.** There
is no code path through this component in which a failure renders as
reassurance. The defect it replaces: `useOpenExceptions` had no try/catch at
all, and because `apiService.getOpenExceptions` returns `null` on failure, a
dead API rendered *"Everything reconciles. Nothing is waiting on you."* over
unreconciled money.

`errorBody` is optional and overrides the default failure sentence. It exists
because a caller that wanted to say something more specific than the default
had to print its own line above the state, and then the screen said the same
thing twice.

Loading is **skeleton rows shaped like the content**, not a centred spinner.
Empty copy branches on whether filters are active and carries a reset CTA —
"nothing matches these filters" and "nothing exists" are different sentences.

States are **top-aligned** under the controls, not centred in the scroller:
centring put one sentence in the middle of ~700px of empty bone.

### `Field` — a label that cannot be forgotten

Generates the input `id` via `useId` and hands it to the control through a
render prop, along with `aria-describedby` and `aria-invalid`. **There is no way
to render this component without wiring the label.** The profile panel had seven
visible `<label>` elements and seven inputs and not one pairing existed in the
markup.

`fieldInputClasses` is the console's one text-input skin.

### `DispatcherCard`

- The plate: `bg-board-plate border border-edge rounded-plate shadow-plate`.
- **`.Region`** replaces nested cards. A change of ground plus a macro gap,
  with a hairline where a boundary genuinely needs drawing, and **no second
  box**. Reach for this every time the instinct says "another card": the
  inspector nested bordered surfaces three deep and the payment ledger four.
- **`.Label`** is the label-and-rule mark: a micro uppercase label, then a
  hairline running to the edge of the column. It is how a price board, a ledger
  column and a waybill field all mark a heading, and it does the job the tinted
  icon chip used to do badly. Pass `as="h3"` when it introduces a real section
  so the rule costs no heading level.
- **`.Header`** is title-left / status-right with a hairline beneath. It has
  **no eyebrow** — the craft floor bans a kicker above a heading outright, and
  this primitive once made one a *required* prop.

### `DispatcherButton`

`primary` is `bg-signal` (the act). `field` is navy. `secondary`, `subtle`,
`success`, `danger-ghost` as named. **Every size clears a 36px target** —
`sm: min-h-9`, `md: min-h-10`, `lg: min-h-12` — which the tablet usage makes
load-bearing rather than nominal.

One disabled pairing for every variant:
`bg-status-closed-fill` on `text-status-closed-ink`, computed at 6.4:1. The old
disabled state was below the AA floor, so a disabled "Pin Store" was a button a
dispatcher genuinely could not read.

`iconOnly` requires `aria-label` **at the type level**.

### Others

- **`DispatcherBadge` / `StatusChip`** — the only status chip. One size, one
  weight, one casing.
- **`DispatcherInlineBanner`** — the replacement for `alert()`. Both pairings
  are token pairs computed above 4.5:1; the old success pairing was ~3.3:1.
- **`DispatcherSearchField`** — `aria-label` required at the type level. Four
  hand-rolled search inputs died for this.

---

## Layout rules

- **The portal root is `h-screen overflow-hidden`, not `min-h-screen`.** A
  minimum is a floor, so content pushed the wrapper past the viewport and the
  **page** scrolled — taking the board band, the panel title and the filter row
  with it, which defeats the pinned-header contract on every tab. Nothing below
  had a definite height either, so the inner `h-screen overflow-hidden` was
  inert. **Do not change this back.**
- **Master-detail is `lg:grid-cols-[38fr_62fr]`** (AGENTS.md 8.30) with
  `min-w-0 min-h-0` on **both** tracks. Grid children default to
  `min-width: auto`, which floors them at their content's intrinsic width; the
  run pane held the grid open and clipped the strip at 820px. The previous
  `grid-cols-12` with `col-span-5`/`col-span-7` was 41.7/58.3, not the
  documented ratio.
- **Below `lg` the board and the run share the screen one at a time**, through a
  `THE BOARD` / `THE RUN` toggle the workspace owns. Not a vertical stack, and
  not with fixed minimum heights: that was the old behaviour and it produced a
  page taller than a tablet with the run below the fold.
- **`min-w-0` on every flex child that truncates**, and `[overflow-wrap:anywhere]`
  rather than `break-words` on chat bubbles. `overflow-wrap: break-word` wraps
  at paint time but leaves min-content sizing unchanged, so the flex parent
  still reserves the full width and the bubble overflows anyway.
- **Verify overflow per element, not per page.** With `overflow-hidden` on the
  root, `document.scrollWidth === clientWidth` can never fail — it hides the
  evidence. The honest check is whether any element's `scrollWidth` exceeds its
  own `clientWidth`.

---

## The honesty layer

This is the part of the system most likely to be undone by someone being
helpful. **Nothing may reintroduce a confident zero or a reassuring empty
state.**

- **A failed fetch is not an empty result.** `PanelState` enforces it
  structurally; `useOpenExceptions` exposes `isConfirmedClear` (loaded **and**
  no error **and** genuinely empty) and the all-clear copy is gated on that,
  not on a count of zero.
- **`null` from an `apiService` call means the request failed**, never that
  there is nothing to report. Several of these swallow their own errors and
  return `null`; `?? []` on one of them had the evidence panel asserting "No
  photo was ever captured on this errand."
- **A figure nobody received is not a figure.** Show `--`, not `0`. The board
  band and the standing-figures strip must agree on this — they disagreed once,
  `--` beside a confident `0` for the same failure.
- **Never invent a number, a name or a status.** Six fabrications were removed
  from this console: a hardcoded `₱85` fee fallback, a fake phone number (fixed
  at the mapper, not the view), a permanent "GPS Signal Live" that never
  checked presence, a hardcoded `"You"`, `formatPeso(Number(fee || 50))` in a
  card whose job is stating what a customer will be charged, and `₱0.00`
  rendered at data scale for any item without a price — which is every item
  before a rider files a receipt.
- **Rows must add up to the total above them.** Where a header figure is an
  estimate rather than a sum, label it (`est. ₱420`). Where prices do not exist
  yet, say so once rather than printing zeros.
- **`Errand` has no `baseFee` column.** Fee breakdowns derive the base by
  subtraction so the rows reconcile to the total the customer is actually
  charged. Where they cannot, surface the unreconciled remainder rather than
  hiding it.
- **Optimistic writes must be revertible**, awaited, and must not clear a
  composer or close a screen until the write succeeds.
- **Claim success only after `await`.** `navigator.clipboard.writeText` rejects
  on an insecure origin or a denied permission.

### Drafts

`lib/useDraft.ts` holds unsubmitted text outside React, keyed by row or errand
id, so it survives the tab unmount the portal performs on every tab switch.
CLAUDE.md requires preserved drafts and three places lost them.

The tuple is `[value, update, clear, seed]`:

- **`clear`** blanks the box. Only right for text that has been **sent** — a
  submitted decline reason must not reappear.
- **`forgetDrafts(prefix)`** drops drafts and leaves the fields alone. That is
  the one for a **saved form**.
- **`seed`** fills from a fetch only when nothing is half-typed, and never
  writes to the store. So the store holds nothing but real user edits: an
  unsaved edit outranks a later refetch, and a refetch cannot manufacture a
  draft that then goes stale forever.

**Passwords are deliberately not drafted.** A plaintext password in a
module-level map after the operator walks away from a shared console is worse
than retyping one.

---

## Copy

- **No em dashes.** Anywhere a user can read. A colon, a comma or a full stop
  does the job.
- **No emoji.** Not in headings, buttons, filter labels, or map pins.
- **No `italic`.** No italic face is imported, so it renders as a synthetic
  slant of upright letterforms.
- **They/them** for customers and riders. The system is never told anyone's
  gender, and a name is not a pronoun.
- Say what failed and what to do, in the product's own words. "The exception
  queue did not load" over "Error". Never let an error state imply an all-clear.

---

## The second skin: the Owner Portal

Everything above this line is shared. Everything in this section is the Owner
Portal only, in `src/portals/owner/` and `src/portals/owner/screens/`, under
`data-surface="owner"`.

Its thesis: **the owner's portal is a ledger, not a dashboard.** Every screen
answers what the operation did and what it is charging, in ruled columns a
person can audit, and colour appears only where something needs deciding. That
refuses the same arrangement the console refuses, a row of identical metric
tiles each given a decorative hue and a tinted icon chip above a table, which
is what this portal shipped. The direction contract is at
`.impeccable/surfaces/src-portals-owner-ownerportal-tsx.md`.

The visible difference between the two skins is one sentence: **where the
Dispatcher is warm bone, the Owner Portal is cool slate.**

### The mechanism, because it looks impossible

This cost eight token values instead of a rewrite, and **zero edits to the 51
already-reviewed Dispatcher files**. Why it works:

- Every token utility in this project compiles to a `var()` reference, not a
  literal: `.bg-board-plate { background-color: var(--color-board-plate) }`.
- Tailwind's `@theme` block emits its variables into a plain `:root,:host`
  rule.
- Custom properties resolve **per element**, so a descendant that redefines one
  overrides it for itself and its whole subtree.

`:root,:host` can never match a div inside `<body>`, so specificity never
arbitrates and no cascade layer is involved. There is no source-order
fragility and no layer trap to reason about. Every shared primitive and every
rule in `surfaces.css` re-skins for this portal without a line of change.

### The eight values

```
--color-board-field       #1E3A5F   the field. Was hardcoded 105 times here
--color-board-field-deep  #162D4A   its hover. Hardcoded 15 times
--color-board-trim        #98A7BB   chrome, icons and text ON the field
--color-board-ground      #F1F5F9   slate-100. The working ground
--color-board-plate       #FFFFFF   a plate on the ground
--color-ink               #0F172A   16.3:1 on the ground, 17.9:1 on a plate
--color-ink-muted         #475569    6.9:1 on the ground,  7.6:1 on a plate
--color-hairline          rgb(100 116 139 / 0.22)   rules INSIDE a plate
--color-edge              rgb(100 116 139 / 0.40)   a plate's own boundary
```

That is nine lines for eight values because the two line weights are one
decision. `--dispatcher-navy` at `theme.css:33` already held `#1E3A5F` and was
consumed zero times; the two hexes were the portal's identity, so they became
the field rather than being replaced. With the shared navigation rail at
`#0F2035` that gives **three navies in a fixed order, darkest first**: rail
`#0F2035`, field-deep `#162D4A`, field `#1E3A5F`. White on the field is 11.5:1.

**Two measured values that look like mistakes and are not.**

**`--color-board-trim` is `#98A7BB`, not slate-400.** Slate-400 (`#94A3B8`) is
what the portal used on navy, and on `#1E3A5F` it measures **4.49:1**, failing
AA for normal text by one hundredth, with `PanelShell` setting its figure label
in `text-board-trim` at 12px. The Dispatcher never hit this because its field
is darker, where the same slate-400 is a comfortable 6.41:1. `#98A7BB` measures
4.70:1 as text on the field and 2.23:1 as a scrollbar thumb on the ground; a
thumb is a UI component rather than text, so its floor is 3:1 for
identification and it is doing its job. **Do not simplify this back to a
palette step.**

**The ground is `#F1F5F9`, not `#F8FAFC`.** The portal shipped slate-50. With
shadows forfeited, a white plate on `#F8FAFC` is a **1.5% luminance step** and
effectively invisible. At slate-100 the plate separates on value and a single
boundary rule finishes the job.

**Ink is two levels and deliberately no third.** The portal shipped
`text-slate-400` on light grounds 142 times at 2.83:1 and `text-slate-300` 14
times at 1.94:1, including the dash whose entire job is to say a value is
absent. All of those resolve to `ink-muted`. A third, lighter level is exactly
how 2.83:1 comes back, so there isn't one.

**What is deliberately not overridden.** Type roles, the three radii,
`--ease-board`, the signal red and the five status tones. A `waiting` chip that
changed colour between the two portals would make the shared vocabulary a
fiction. The signal needs no override because it already matches: this
portal's red-600 **is** `#DC2626`.

### Zero elevation, enforced rather than asserted

`AGENT_HANDSHAKE.md` records a `[LOCKED]` Flat Design Surface Purity and
Zero-Shadow invariant: pure solid flat fills only. **This surface spends no
elevation at all.** Structure is carried by a ground change, a macro-gap and
one boundary rule, and never by a shadow or a box inside a box. The
line-weight relationship above carries the whole hierarchy: a plate's own edge
is structural and stays, a hairline ring added around something for looks does
not.

`shadow-plate` **cannot** be retired by redefining a token, and this is the one
token in the system that is not a `var()`. Tailwind emits
`--tw-shadow: 0 1px 2px 0 var(--tw-shadow-color, #0f20350f)`, resolving the
shadow's colour at build time. So `owner.css` sets the same variable Tailwind
composes from, which is what `shadow-none` itself does:

```css
[data-surface="owner"] .shadow-plate,
[data-surface="owner"] .shadow-field { --tw-shadow: 0 0 #0000; }
```

Rings and inset rings compose separately and are untouched, so a focus ring
still lands. Verified in the browser: the dispatcher keeps its inset highlight,
this surface reports none.

**This rule is a GUARD, not a repair.** Measured before it was written: no
Owner file imports `DispatcherCard`/`PanelCard` today and no Owner screen
passes a `figure`, so neither shadow currently renders here. It exists because
`PanelCard` is the shared card primitive and adopting it is the obvious next
refactor, at which point every white plate on this surface would quietly
acquire a drop shadow and contradict the invariant with nothing failing.

Elevation survives in exactly **three places, none of them structure**: the
notification popover, and the two map controls plus the name tag that float
over map imagery, where a white control on pale tiles needs one step to stay
findable. They opt in with `data-elevate`, so the intent is legible in the
markup rather than inferred from a class.

```css
[data-surface="owner"] [data-elevate].shadow-plate {
  --tw-shadow: 0 1px 2px 0 var(--tw-shadow-color, #0f20350f);
}
```

### Contrast, measured

**20 token pairs computed, 0 failures.** Tightest two: `board-trim` as text on
the field at **4.70:1**, and white on `signal` at **4.83:1**.

Status fills sit at roughly **1.2:1** against a plate, and that is correct
because **the fill is not the indicator**. The status law forbids colour-alone
encoding, so every tone pairs with a label and a CSS-drawn mark. Do not
"fix" a status fill's contrast by darkening it; you would be strengthening the
one channel the law says cannot carry the meaning.

### One unknown-judgement per screen

**Every rendered count on a screen routes through a single unknown-judgement**
(`fig()` in `RiderTrackingModule` and `PlacesTab`, `countsUnknown` in
`UserManagementModule`, or a guarded helper). A screen cannot hold two answers
to one question, which is the defect the Dispatcher's band and strip produced
once: a dash beside a confident `0` for the same failure. **A count nobody
received is a dash, never a zero.**

**Two glyphs for two absences**, and each carries a `title` saying which:

| Glyph | Means | Title |
|---|---|---|
| `…` | the request is still in flight | "Still reading this figure from the server." |
| `—` | nobody received a number | "No figure arrived. This is not a zero." |

A dash alone is ambiguous between the two, and they call for opposite
reactions from a reader. This is the placeholder convention on the dashboard
and in `StandingFigures` via `valueTitle`; the Dispatcher's older `--` spelling
is still in use on Users, Tracking and Places and has not been unified (see
[Not canonized](#not-canonized)).

**A period change clears its data in the same beat.** No figure can be held
over from another period under a new heading, and the page's warning is pinned
rather than scrolled, because a warning about every figure on the page should
not be something you can scroll away from the figures it is about.

### The Owner Portal's own three devices

**`StandingFigures`** is the portal's single device for stating a live figure.
One navy plate (`bg-board-field`) divided by column rules, `data-on-field` for
the inverted ring and selection, every figure marked `data-figure`. It
replaces a row of identical metric cards: separate plates imply separate
subjects, and these figures belong together because they describe a single
moment. Three columns is the dashboard's reading; Tracking passes four, Riders
three. The rule sits **between** figures and never around them, because a
divider on the first cell would read as a border on the plate itself.
`urgent` spends `signal-on-field`, and only where the count means somebody must
act.

**`OwnerPanelShell`** wraps the shared `PanelShell` and sets the page `<h1>`
once. There is **no header card**: the title sits on the working ground with a
hairline under the whole pinned zone, so the boundary is a rule rather than a
box. The **tinted icon chip is gone** — 21 of them sat beside headings, coming
in blue on four modules, amber on Riders, emerald on Service Rates and purple
on Reports, which is colour assigned per module rather than per meaning. Slots:
`aside` for read-only controls (period selector, clock, bell), `action` for the
one thing that commits, then `controls`, the single scroller, and `footer`.
Wording is frozen: every module passes the exact title string it rendered
before.

**`OwnerTabs`** is a real WAI-ARIA tab set for the places this portal had
eleven segmented controls and zero tab semantics: `role="tab"`,
`aria-selected`, `role="tablist"` and `aria-controls` each appeared zero times.
One tab stop for the whole set via roving tabindex, Left/Right between tabs,
Home/End to the ends. The plate is board vocabulary: one surface, segments
divided by trim, the selected segment filled with the field, no shadow and **no
`rounded-full` pill** — pills stay reserved for status chips and numbered
markers. For a two-state toggle that changes how one panel looks, use
`aria-pressed` on a pair of buttons inside a `role="group"` instead;
`CategoryPlacesPanel` is the model.

### Verification limits for this skin

The safety net is the same and just as thin: `tsc --noEmit`, `npm run build`,
`impeccable detect`, and browser inspection. **There is still no test
infrastructure in this repo.**

**No state in this build has been verified against production records.** The
API is unreachable from the development machine (CORS against
`api.sugo-express.org`; the local server answers 401 with stale seed
credentials). **All fourteen screenshots in `.impeccable/review/` are failure
or empty states.** Populated density, the table rules under real rows, and the
period-change beat are **unverified by any capture**. Treat every claim about
how a full screen reads as an inference from the code.

### Not canonized

These are defects and gaps this build carries. They are recorded so nobody
mistakes them for rules, and **none of them is a pattern to copy onto a new
screen**:

- **Label wiring is 10 of roughly 50 form controls**, all ten in
  `ServiceRatesModule`, all pairing exactly. **`aria-describedby` and
  `aria-invalid` are 0 portal-wide.** The shared `Field` primitive exists
  precisely so this cannot happen; new controls go through it.
- **Five hand-rolled overlays still lack `role="dialog"`, a focus trap and
  Escape**: `MerchantCategoryModule`, `PlacesTab`, `AddUserModal` and
  `EditUserModal` (twice, its re-authentication step being an early `return`
  that replaces its parent rather than stacking). `ConfirmDialog` is built and
  in use; it is the destination.
- **One header TREATMENT on eight screens, one header COMPONENT on five.**
  Users, Merchants and Tracking keep their own header row because each has a
  `flex-1` chain around a map or a dual-view pane and the shell cannot own
  their height until those are restructured. The cost is four copies of the row
  markup and **four mounts of `HeaderClock`/`NotificationBell` rather than
  one**.
- **Two placeholder spellings coexist**, `—`/`…` on the dashboard and
  `StandingFigures` and `--` on Users, Tracking and Places. The two-glyph
  convention above is the rule; the `--` sites are unconverted, not a second
  sanctioned form.
- `src/app/routes.tsx` carries three temporary unprotected routes for browser
  verification. **They are removed before commit and are not part of this
  system.** Do not add more.

---

## Out of scope

**The navigation rail** (`DispatcherPortal.tsx`, the `<Sidebar>` element) is
excluded by instruction. Its alignment contract is recorded at
`AGENT_HANDSHAKE.md:43-47` and every measurement in it is load-bearing. It
still uses raw slate, arbitrary pixel sizes and legacy radii, and that is
expected — a defect scan of this console will report those and only those.

**The Owner portal** is no longer out of scope. It runs on this system in its
own skin: see [The second skin](#the-second-skin-the-owner-portal).
`NotificationBell` and `HeaderClock` render in **both** portals, so change them
for what is wrong everywhere and scope anything skin-specific through
`surfaces.css` or `owner.css`.

**`src/components/ui/dialog.tsx`** no longer carries `backdrop-blur-xs` on its
scrim. It was removed and verified against a dispatcher modal, which is what
the earlier follow-up asked for. `backdrop-blur` stays banned on both surfaces.
It does survive outside them, in `SessionExpiredModal`,
`MobileAppNoticeModal`, `ui/drawer.tsx` and `ui/sheet.tsx`; those are not
governed by this document.

---

## Verification, and what it cannot tell you

There is **no test infrastructure in this repo** — no vitest, no
testing-library, no test script. The whole automated safety net is:

```bash
npx tsc --noEmit
npx tsc -p tsconfig.json --noEmit --noUnusedLocals --noUnusedParameters
npm run build
.claude/skills/impeccable/scripts/impeccable detect src/portals/dispatcher src/components/chat
```

All four are clean as of this document. Contrast was measured across 22 pairs
for this skin; the ratios live in the token comments in `tailwind.css`. The
Owner skin's 20 pairs and its own limits are recorded under
[Verification limits for this skin](#verification-limits-for-this-skin).

**The limit that matters most:** the API was unreachable from the development
machine (CORS against `api.sugoonthego.online`; the local server answers 401
with stale seed credentials). **No state in this system has been verified
against production records.** Populated states were checked through fixtures
rendering the real components with fixed data, and the order-chat overlay's
five stage cards, payment ledger and conversation pane have been verified by
typecheck and build only.

Screenshots of the reviewed state are in `.impeccable/review/`, with their own
caveats recorded in `HANDOFF.md` — including that Chrome's headless window
clamps to a 500px minimum on this machine, so the 390px case is measured
numerically rather than photographed.
