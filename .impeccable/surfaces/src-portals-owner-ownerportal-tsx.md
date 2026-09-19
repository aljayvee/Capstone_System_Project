---
version: 1
slug: "src-portals-owner-ownerportal-tsx"
primary_target: "src/portals/owner/OwnerPortal.tsx"
related_targets: ["src/portals/owner/modules/dashboard/DashboardModule.tsx","src/portals/owner/modules/reports/FinancialReportsModule.tsx"]
---

## Scope

The Owner Portal: the shell and its navigation rail, the dashboard, user management with its add and edit personnel modals, riders, merchant categories across the categories, places and archive tabs plus their cards, image picker and places panel, service rates, the six financial report views with their period toolbar and review modal, live rider tracking, and the verified-places directory at `/places`. The sidebar and header **wording** is frozen by instruction; their appearance is in scope.

**Visitor mode: Operate.** An owner reading the business and adjusting the settings that price it. Expression may never obscure a figure, a state, or a familiar affordance.

## Audience, job, constraints

An owner or administrator of Sugo on the Go in Tacurong City, at a desk or on a tablet, reading what the operation did and changing what it charges. The task is to read the period, find the outlier, fix a rate, add or retire a person or a store, and export a report somebody else will act on.

Binding constraints: frontend only, with every data hook, `apiService` call and prop signature preserved exactly. `apiService.ts` and `apiClient.ts` are read-only for this run, so a service that returns `null` on failure is handled at the caller rather than at the source. The Sidebar Alignment Contract at `AGENT_HANDSHAKE.md:43-47` is preserved measurement for measurement. Three `[LOCKED]` contracts bind: Flat Design Surface Purity and Zero-Shadow (no shadows, no `backdrop-blur`, no gradient blooms, pure solid flat fills), Zero-Slop UI (no purple, no fabricated figures), and Anti-Happy-Path (loading, error, empty and success on every operation).

## Direction contract

**THESIS:** The owner's portal is a ledger, not a dashboard. Every screen answers what the operation did and what it is charging, in ruled columns a person can audit, and colour appears only where something needs deciding. This refuses the arrangement the portal ships today and every admin template ships: a row of identical metric tiles, each given a different decorative hue and a tinted icon chip, sitting above a table.

**OWN-WORLD:** The Route Board's system rendered in cool slate. Sugo navy `#1E3A5F` as the field, slate-100 as the working ground, white plates, SUGO red reserved for the one action that commits. Inherited whole: seven type roles with a 12px floor, three radii, the five status tones, one motion curve. Changed in eight colour values and one rule, **no elevation at all**. Structure comes from a ground change, a macro-gap and a single boundary rule, never a shadow and never a box inside a box. Two line weights in a fixed relationship, where a plate's own edge is always heavier than any rule drawn inside it.

**STORY:** The owner opens a period, reads what it earned and what it owes, and believes the figures, because a number nobody received shows as a dash rather than a zero. They find the one row that is wrong, act on it, and are told plainly whether the change actually saved.

**FIRST VIEWPORT:** One page title, set once by the shell rather than eight times by eight modules, with the period control and the shift clock on its line. Beneath it the dashboard splits by time base rather than into tiles: a navy standing-figures band carrying what is true right now, riders on duty and errands pending and errands active, as three readings divided by column rules; then the period ledger, revenue and payouts set as money against the trend that produced them; and the all-time count demoted to a footnote line rather than standing as a peer of live figures. **Signature interaction:** changing the period re-reads the whole page in one beat, band and ledger and trend together, and any figure the request did not return goes to a dash in that same beat rather than holding a stale number under a lit indicator. **Motion grammar:** one damped curve, 150 to 250ms, carrying state only, with no entrance choreography and no pulse over data nobody fetched.

**FORM:** Inherited world, no roll. The Route Board, seed `f2716b25`, already governs this codebase, is documented in `DESIGN.md` and `.impeccable/design.json`, and has been through a finish review. The Impeccable flow routes a whole surface inside an established world to keep the visual system fixed and explicitly forbids a concept tournament there, so this surface adds a second skin to that world rather than a second world to the product. Code-led.

**RAISES:** zero elevation with structure carried by rule and gap alone, from the project's own `[LOCKED]` flat-design invariant read strictly rather than loosely; one legal meaning per colour, carried over from the console's status law and extended here to retire seven decorative accent families and a free-form hex prop; a page-level heading outline the portal never had, so that the document reads in order rather than starting at `h2` and skipping to `h5`.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions

- Whether `src/components/ui/dialog.tsx` loses `backdrop-blur-xs` on its scrim. It is shared with the dispatcher and the flat invariant prohibits it, so the change needs checking against a dispatcher modal before it ships.
- Whether the six hand-rolled modals move onto the `Dialog` primitive wholesale or one at a time. `EditUserModal`'s re-authentication step is an early `return` that *replaces* its parent modal rather than stacking on it, so that one migrates last and on its own.
- Whether `PlacesTab` and `PlacesDirectoryScreen` consolidate in this run. 894 of roughly 920 lines are already identical and the route copy is unreachable from inside the portal, so the duplicate is dead weight, but it is the largest single behavioural change on the list.
