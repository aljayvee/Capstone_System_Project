/**
 * One home for what an errand status looks like and what it is called.
 *
 * Three defects made this necessary.
 *
 * The raw enum was leaking to the reader. Five places rendered
 * `String(errand.status)` straight into a chip, so dispatchers read
 * `IN_TRANSIT`, `DOING ERRAND` and `PASSING BY` while RecentChatsPanel
 * already held proper labels that only its filter dropdown ever used.
 *
 * The colour was lying. The old inspector painted emerald "success" for every
 * status that was not AVAILABLE or IN_TRANSIT, which meant a CANCELLED errand
 * rendered in exactly the green of a delivered one. That cannot be fixed by
 * remembering to check; it is fixed by there being one table.
 *
 * The status vocabulary is wider than the declared type. `ErrandStatus` in
 * src/types/errand.ts does not list IN_TRANSIT, DOING ERRAND or PASSING BY,
 * yet all three ship from the API today. So this takes a raw string rather
 * than the union, and an unrecognised value degrades to a neutral tone that
 * claims nothing about progress instead of guessing at one.
 */

/**
 * Status law: one meaning per colour, and the colour never carries the state
 * on its own. Every tone pairs with a written label and a drawn mark.
 *
 *   waiting  someone else owes the next move
 *   moving   in motion, nothing owed
 *   done     finished well
 *   closed   no claim about progress: ended without completing, or unknown
 *   act      you must act. Shares SUGO red with the primary action, because
 *            on this surface red means exactly that and nothing else.
 */
export type StatusTone = "waiting" | "moving" | "done" | "closed" | "act";

/**
 * The mark is drawn, never a glyph or an emoji standing in for one, so a
 * status survives greyscale, colour blindness and a bleached tablet screen.
 */
export type StatusMark = "open" | "moving" | "filled" | "struck" | "alert";

export interface StatusPresentation {
  /** What a dispatcher reads. Domain language, never the enum. */
  label: string;
  tone: StatusTone;
  mark: StatusMark;
  /** True when this status is waiting on the dispatcher rather than on someone else. */
  needsDispatcher: boolean;
}

const WAITING = (label: string): StatusPresentation => ({
  label,
  tone: "waiting",
  mark: "open",
  needsDispatcher: true,
});

const MOVING = (label: string): StatusPresentation => ({
  label,
  tone: "moving",
  mark: "moving",
  needsDispatcher: false,
});

const DONE = (label: string): StatusPresentation => ({
  label,
  tone: "done",
  mark: "filled",
  needsDispatcher: false,
});

/**
 * Normalised so one spelling covers the variants the API and the type union
 * disagree about: underscores, mixed case and extra spacing all collapse.
 * "in_transit", "In Transit" and "IN_TRANSIT" are the same status.
 */
function normalize(raw: string): string {
  return raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

const STATUS_TABLE: Record<string, StatusPresentation> = {
  // Waiting on someone who is not the dispatcher, or on no one yet.
  AVAILABLE: WAITING("Ready to claim"),
  PENDING: WAITING("Waiting on customer"),

  // In motion. The dispatcher is not blocking any of these.
  ACCEPTED: MOVING("Claimed"),
  ASSIGNED: MOVING("Rider assigned"),
  TRAVELING: MOVING("Rider travelling"),
  "AT STORE": MOVING("At the store"),
  PURCHASED: MOVING("Items purchased"),
  "IN ROUTE": MOVING("On the way"),
  "IN TRANSIT": MOVING("On the way"),
  "DOING ERRAND": MOVING("Errand in progress"),
  "PASSING BY": MOVING("Passing by"),

  // Finished well.
  DELIVERED: DONE("Delivered"),
  COMPLETED: DONE("Completed"),

  // Ended without completing. Never rendered in the same tone as DELIVERED,
  // which is the bug this table exists to make impossible.
  CANCELLED: { label: "Cancelled", tone: "closed", mark: "struck", needsDispatcher: false },

  // The dispatcher is the blocker.
  DISPUTED: { label: "Needs a decision", tone: "act", mark: "alert", needsDispatcher: true },
};

/**
 * Title case for an unrecognised status, so a new server-side value reads as
 * "Awaiting Pickup" rather than AWAITING_PICKUP while still being obviously
 * unmapped to whoever maintains this table.
 */
function titleCase(normalized: string): string {
  return normalized
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * The only way this console should render a status.
 *
 * An unknown value is given the neutral tone rather than a guess: slate here
 * means "no claim about progress", which is the honest reading of a status
 * this build has never seen, and it is the same claim CANCELLED makes. The
 * label and mark keep the two distinguishable.
 */
export function presentErrandStatus(raw: string | null | undefined): StatusPresentation {
  if (!raw) {
    return { label: "Status unknown", tone: "closed", mark: "struck", needsDispatcher: false };
  }

  const normalized = normalize(String(raw));
  const known = STATUS_TABLE[normalized];
  if (known) return known;

  return {
    label: titleCase(normalized),
    tone: "closed",
    mark: "struck",
    needsDispatcher: false,
  };
}

/**
 * Painted status fills, keyed to the tokens in src/styles/tailwind.css. Each
 * tone has one fill and one ink, and every pairing clears 4.5:1.
 */
export const TONE_CLASSES: Record<StatusTone, string> = {
  waiting: "bg-status-waiting-fill text-status-waiting-ink",
  moving: "bg-status-moving-fill text-status-moving-ink",
  done: "bg-status-done-fill text-status-done-ink",
  closed: "bg-status-closed-fill text-status-closed-ink",
  act: "bg-status-act-fill text-status-act-ink",
};

/**
 * Is this run waiting on the dispatcher right now? Used to order the board so
 * the runs that need a person rise to the top, and to count what is owed.
 */
export function needsDispatcher(raw: string | null | undefined): boolean {
  return presentErrandStatus(raw).needsDispatcher;
}

/**
 * How far a claimed run has got, as the five marks a board would stamp.
 *
 * This lives here rather than in a panel because two surfaces draw it: the
 * inspector's detent rail and the Active Errands milestone tracker. Those had
 * separate copies of the same ordering, which is how a codebase ends up with
 * two screens disagreeing about where a run is.
 *
 * These are the statuses a run genuinely passes through. Nothing here is
 * inferred: an unclaimed run has no progression and gets no rail.
 */
export const RUN_PROGRESSION = [
  { label: "Claimed" },
  { label: "To the store" },
  { label: "Bought" },
  { label: "On the way" },
  { label: "Delivered" },
] as const;

const PROGRESSION_INDEX: Record<string, number> = {
  ACCEPTED: 0,
  ASSIGNED: 0,
  TRAVELING: 1,
  "AT STORE": 1,
  PURCHASED: 2,
  "IN ROUTE": 3,
  "IN TRANSIT": 3,
  "DOING ERRAND": 3,
  DELIVERED: 4,
  COMPLETED: 4,
};

/**
 * The index this run has reached, or -1 when it has not started one: an
 * unclaimed, cancelled, disputed or unrecognised status has no place on the
 * rail, and drawing it at step zero would assert progress that has not begun.
 */
export function progressIndexOf(raw: string | null | undefined): number {
  if (!raw) return -1;
  const index = PROGRESSION_INDEX[normalize(String(raw))];
  return index === undefined ? -1 : index;
}
