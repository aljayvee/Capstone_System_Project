---
name: ux-flow-personality
description: >-
  Design and audit multi-screen flows so they feel like one product with one
  personality, rather than a series of unrelated forms. Covers the psychology of
  moving BETWEEN screens — momentum, memory, voice consistency, and what a user
  believes about you by screen three. Use this whenever work spans more than one
  screen of a wizard, checkout, onboarding, or booking flow; whenever reviewing
  or rewriting UI copy, headings, button labels, empty states, or error text;
  whenever a screen is being redesigned and a neighbouring screen exists; and
  whenever someone asks why a flow "feels off", "feels clunky", "feels like
  different apps", or has high drop-off at a particular step — even if they never
  say the words UX, psychology, or personality.
---

# UX psychology across a flow

Most UX guidance optimises one screen at a time. That is not how a flow is
experienced. A user arrives at screen 2 carrying everything screen 1 did to
them — their momentum, their confidence, their sense of who they are dealing
with. This skill is about that carry-over.

Companion to `.agents/rules/ux-psychology.md`, which covers within-screen
decisions (hierarchy, cognitive load, CTA design). Read that for "is this screen
good". Read this for "do these screens belong to the same product".

---

## 1. Personality is the sum of small word choices

A product's personality is not its logo. It is the accumulated impression of
every noun it chose. Users cannot articulate it, but they act on it: a flow that
sounds bureaucratic gets treated as bureaucratic — skimmed, distrusted,
abandoned at the first friction.

The failure mode is almost never one bad sentence. It is **drift**: each screen
written on a different day, by a different mood, and nobody reads them in
sequence.

**Audit method — read every screen's title and subtitle aloud, in order,
ignoring the UI.** If it does not sound like one person talking, it is drift.

Three drift patterns worth naming, because they are the ones that actually
appear:

- **One thing, two names.** The rider is "our rider" on one screen and "your
  assigned shopper" on the next. The user now wonders whether these are two
  different people. Every domain noun needs exactly one word, chosen once.
- **System voice leaking into user voice.** "Errand Form", "Submit", "Invalid
  input", "Fulfillment & Payment Reassurance". These are names for the
  implementation, not for what the user is doing. Nobody has ever wanted to fill
  in a form; they wanted the thing at the end of it.
- **Register whiplash.** A warm invitation on one screen, a technical
  instruction on the next ("Specify items, brands, and quantities"). Warmth that
  appears and disappears reads as insincere — worse than consistent plainness.

**The test that settles arguments:** could this sentence be said, out loud, by a
helpful person standing next to the user? "Tell us what to buy" passes. "Specify
items, brands, and quantities for your assigned shopper" does not.

---

## 2. Momentum is the real currency

Between screens, the thing being spent is not time — it is willingness to
continue. Every screen either adds to it or draws it down.

**Carry the goal gradient forward.** A stepper is not decoration; it is the
user's evidence that this ends. It must be present on every screen of the flow,
must never renumber, and completed steps must show as *completed* — a green
check, not a grey label. Greying out a finished step reads as losing it.

**Never reset progress on Back.** Going back to change one thing and losing four
is the single most reliable way to lose someone at step 2. If state genuinely
cannot be preserved, say so before they navigate, not after.

**Open each screen by acknowledging what the last one accomplished.** "1 store
chosen" at the top of step 2 costs one line and converts a fresh demand into a
continuation. This is the endowment effect doing useful work: the user is now
protecting an investment rather than evaluating a proposal.

**Count up, not down.** "0 items across 1 category" is technically accurate and
psychologically backwards — it leads with a zero and names the void. "Add your
first item to Food & Restaurant" points at the next action. Reserve counters for
when there is something to count.

---

## 3. Give before you ask

Reciprocity is strongest at the start of a flow and nearly useless at the end.
Trust-building content — pricing transparency, "what happens next", who is
handling this — belongs **above** the work it is meant to justify, on the screen
where the user is deciding whether to commit at all.

Reassurance placed after the input has three problems: the anxious user already
left, the committed user does not need it, and its position implies the product
knows the ask was uncomfortable.

The corollary: **never name the reassurance.** A heading like "Fulfillment &
Payment Reassurance" announces that the user is being managed. Say the reassuring
thing plainly and let it reassure.

---

## 4. Blocked states must point somewhere

A disabled primary button is the most common dead end in a wizard. It is
low-contrast, it gives no feedback when tapped, and on touch it cannot show a
tooltip — so a user who does not already know what is missing has no way to find
out. They tap it, nothing happens, and the product looks broken rather than
strict.

Prefer, in order:

1. **Keep the button enabled** and, on press, move focus to the thing that is
   missing and say what is needed. The tap becomes navigation instead of nothing.
2. If it must be disabled, put the requirement where the gap is — next to the
   empty field — not only on the button.

Either way the label states the outcome the user wants ("Review my errand"), not
the obstacle ("List at least 1 item to proceed"). The obstacle is a state, not a
name for the destination.

---

## 5. One decision per screen, and make it feel like one

Users do not experience a flow as N screens; they experience it as N decisions.
Screens that ask for two unrelated things get remembered as harder than they were.

When a screen must carry a secondary element (a delivery address on an items
screen, a payment method on a review screen), style it as **settled context, not
an open question**: compact, quiet, with a small "Change" affordance. An open
question in full weight beside the real task splits attention and doubles the
perceived cost of the screen.

---

## 6. The flow audit

Run this before declaring a multi-screen change done. It takes minutes and
catches the things per-screen review structurally cannot.

1. **Read titles and subtitles in sequence, aloud.** One voice, or drift?
2. **List every domain noun per screen.** Any concept with two names?
3. **Walk it forward with empty data.** Does every empty state name the next
   action?
4. **Walk it backward.** Does anything get silently destroyed?
5. **Reach the blocked state on each screen.** Does it point at the fix?
6. **Cover the UI and read only the copy.** Would a stranger know what this
   product is for, and would they like whoever wrote it?

A change that improves one screen while failing 1, 2, or 4 has made the product
worse, because consistency is worth more than local polish.

---

## Applying this to a redesign

Lead with the copy pass. It is cheap, it is where personality actually lives, and
it frequently dissolves layout problems that looked structural — a screen feels
crowded largely because it is explaining itself badly.

Then layout, in this order of return: goal-gradient continuity → give-before-ask
placement → blocked-state repair → hierarchy within the screen.

State which pillar each change serves. A change that cannot name one is
decoration, and decoration is how flows drift in the first place.
