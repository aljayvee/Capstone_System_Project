---
version: 1
slug: "src-portals-dispatcher-dispatcherportal-tsx"
primary_target: "src/portals/dispatcher/DispatcherPortal.tsx"
related_targets: ["src/portals/dispatcher/components/workspace/DispatchManagementWorkspace.tsx","src/portals/dispatcher/components/order-chat/OrderChatScreen.tsx"]
---

## Scope

The Dispatcher Management Console: the hero header, the queue workspace (KPI telemetry, master stream, errand plates, detail inspector), the Active Errands, Needs a Decision, Fleet Tracking, Customer Chats and Rider Messages tabs, the full-screen order-chat overlay with its five stage cards, payment ledger and conversation pane, the profile panel, and the modals these reach. The sidebar navigation is excluded: its alignment contract is recorded in AGENT_HANDSHAKE.md and stays untouched.

**Visitor mode: Operate.** Real dispatchers on daily shifts. Expression may never obscure the task, the state, or a familiar affordance.

## Audience, job, constraints

A dispatcher on shift in Tacurong City, desktop or tablet, mixed light, holding several errands at once while watching for the one that needs a decision. The task is claim, check the order, pin the stores, confirm items and prices, take payment, send a rider.

Binding constraints: frontend only, with data hooks, Socket.io and Firebase behaviour preserved exactly and props unchanged; the master-detail split, pinned-header scrolling and two-segment control survive; tablet width is a shipping target, not an afterthought; the palette, no-emoji, no-em-dash and no-gradient standards are locked.

## Direction contract

**THESIS:** The queue is a route board, not a dashboard. Every errand is a run with a destination, a number and a departure clock, painted to be read across a room. This refuses the arrangement the console ships today and every competitor ships: metric tiles stacked above a table, with a tinted icon chip beside each heading.

**OWN-WORLD:** Enamel-painted steel. Sugo navy as the field, bone as the working ground, SUGO red legally reserved for the next action and nothing else, chrome slate for trim. Destinations are set in **uppercase Geist at 700 with negative tracking**; route numbers, clocks and money in **Geist Mono, tabular throughout**. Structure comes from ground changes, macro-gaps and one-pixel trim, never from a card inside a card. One elevation step. Radii 8 to 12px, pills on status only.

> **Amended after the finish review.** This block originally read "condensed vinyl-cut caps set destinations; stencil numerals set route numbers". Neither shipped and neither could: Geist Variable has no width axis, so there is no condensed cut to reach for, and the unresolved decision below assumed one existed. The choice made is the one this contract already named as the default, to stay on Geist and add nothing — a second self-hosted face buys a narrower cap at the cost of a font load on a console read all shift. The wording is corrected rather than the claim left standing, because an OWN-WORLD line that describes a treatment the build does not have is the same defect as UI copy that describes a state the product does not have.

**STORY:** The dispatcher reads the whole board at a glance, knows which run needs them now, and believes what it says, because a failed fetch announces itself in the board's own voice instead of reporting all clear. They claim, check, and send.

**FIRST VIEWPORT:** A navy destination band spans the top carrying the shift itself: dispatcher on duty, live clock, and open exceptions as one monumental stencil count. Beneath it, at 38 percent on the left, the queue as stacked route plates, each leading with its destination in condensed caps, then route number, departure clock and fare. At 62 percent on the right, the selected run as its waybill, with the five dispatch stages as a rail of stamped detents. The primary action sits bottom right on a red enamel plate at the scale a barker calls a route. **Signature interaction:** selecting a run re-signs the board, the destination band repainting to that run while the stage rail advances detent by stamped detent, never a progress bar. **Motion grammar:** one damped axis, 150 to 250ms, carrying state only, with no entrance choreography.

**FORM:** Philippine jeepney and tricycle route signage. Candidate 6 of 7 on the resonance-ordered grounded list, assigned by the roll. Seed key f2716b25, kind assigned, code-led.

**RAISES:** commit weight before irreversible actions (from Darkroom Safelight Bay); palette law, one legal meaning per colour (from CRT Arcade Pixel Glow); regions separated by ground and gap rather than nested boxes (from Cloud Quarry); no state carried by colour alone, label plus mark plus tabular figure (from Cyclorama Dawn).

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions

- ~~Tablet behaviour for the 38/62 split at 768 to 1023px.~~ **Resolved: a segmented master/detail toggle.** Below `lg` the board and the run share the screen one at a time through a THE BOARD / THE RUN control that the workspace owns; the fixed minimum heights that forced a page taller than the viewport are gone. Verified at 1024 and 500.
- ~~Whether a second typeface is needed for condensed destination lettering.~~ **Resolved after the finish review: no.** Geist has no width axis; destinations carry on case, weight and tracking alone, and OWN-WORLD above was corrected to say so.
- The Owner portal keeps its current 16px card radius and will visibly diverge from this console's geometry. Accepted for this run, recorded as a follow-up rather than half-migrated.
