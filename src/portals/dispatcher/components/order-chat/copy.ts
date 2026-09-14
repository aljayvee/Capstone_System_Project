/**
 * Every user-facing string on the order chat screen, in one place.
 *
 * This file exists because the screen it replaced had six different voices in
 * it — "Mission Control", "GOAL-GRADIENT 4-STEP DISPATCH PIPELINE TRACKER",
 * "Cockpit Status", "GIS Routing", "CELEBRATORY UNLOCK" — none of which a
 * person would say out loud to a dispatcher standing next to them. Strings
 * written on different days in different moods drift; strings that live in one
 * file, read top to bottom, do not.
 *
 * Two rules when adding to this file:
 *
 * 1. Say it the way a helpful colleague would. If you can't imagine someone
 *    saying the sentence aloud, it isn't finished.
 * 2. Use the customer's first name, never "the customer". The dispatcher is
 *    talking to a person, and the screen should know that. Every function
 *    taking a `who` argument exists for this reason.
 */

/**
 * How long ago something happened, in words a person would use.
 *
 * Minutes stop being useful surprisingly fast: an order left overnight was
 * reporting "sent 731 min ago", which is arithmetic, not information. Rolls up
 * to hours and then days so the number stays small enough to read at a glance.
 */
export function formatAgo(mins: number): string {
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours === 1) return "an hour ago";
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** The five stages, in order. The numbering here is the numbering everywhere. */
export const STAGE_LABELS = [
  "Check the order",
  "Pin the stores",
  "Confirm the items",
  "Set up payment",
  "Send a rider",
] as const;

export const copy = {
  // ── chrome ──────────────────────────────────────────────────────────────
  backToQueue: "Back to queue",
  moreActions: "More actions",
  closeWithoutOrder: "Close without an order",
  dropOff: "Drop-off",

  // ── conversation ────────────────────────────────────────────────────────
  activeNow: "Active now",
  offline: "Offline",
  composerPlaceholder: (who: string) => `Message ${who}…`,
  send: "Send",
  emptyFeedTitle: (who: string) => `Say hello to ${who}`,
  emptyFeedBody: "A first message tells them a real person has picked this up.",
  closedConversation: "This conversation is closed. You can read it, but not reply.",
  chatTab: "Chat",
  stepsTab: "Steps",

  quickReplies: (who: string) => [
    "On it — checking your order now.",
    "I've pinned the stores, take a look.",
    "Sent your list — approve it when you're ready.",
    "Your cash on delivery is confirmed.",
    "Finding you a rider now.",
    `Thanks for waiting, ${who}.`,
  ],

  // ── now bar ─────────────────────────────────────────────────────────────
  now: {
    checkOrder: (who: string) => `Check what ${who} ordered, then accept it.`,
    waitingOnRevision: (who: string) => `Waiting for ${who} to answer your changes`,
    pinStores: (who: string) => `Pin the shops ${who} needs, then send them over.`,
    pinStoresNoMap: (who: string) => `Search for the shops ${who} needs — the map is down.`,
    sendItems: (who: string) => `Put ${who}'s list together and send it for approval.`,
    waitingOnItems: (who: string) => `Waiting for ${who} to approve the item list`,
    askPayment: (who: string) => `Ask ${who} how she'll pay.`,
    waitingOnPayment: (who: string) => `Waiting for ${who} to choose how to pay`,
    ready: "Everything's confirmed. Send a rider.",
    dispatched: (rider: string) => `${rider} is on the way.`,
    closed: "This order is closed. You're reading the history.",
    sentAgo: (mins: number) => ` · sent ${formatAgo(mins)}`,
  },

  nowActions: {
    accept: "Accept",
    decline: "Decline",
    nudge: (who: string) => `Nudge ${who}`,
    changeList: "Change list",
    sendRider: "Send a rider",
  },

  // ── stage status lines ──────────────────────────────────────────────────
  status: {
    notStarted: "Not started yet",
    accepted: "Accepted",
    awaitingReply: (who: string) => `${who} hasn't replied yet`,
    storesPinned: (n: number) => (n === 1 ? "1 store pinned" : `${n} stores pinned`),
    noStoresYet: "No stores pinned yet",
    itemCount: (n: number) => (n === 1 ? "1 item" : `${n} items`),
    approvedBy: (who: string) => `${who} approved it`,
    paidBy: (mode: string) => mode,
    riderAssigned: (rider: string) => `${rider} is on it`,
    readyWhenYouAre: "Ready when you are",
  },

  showAllSteps: "Show all steps",
  showOneStep: "Show one step at a time",

  // ── stage 1 — check the order ───────────────────────────────────────────
  stage1: {
    reassurance:
      "Accepting means you handle this order start to finish. You can still change the items afterwards.",
    deliverTo: "Deliver to",
    customerNote: "Their note",
    noItems: "This order arrived with no items listed. Ask them what they need before accepting.",
    accept: "Accept the order",
    release: "Put back in queue",
    decline: "Decline",
    sendChanges: (who: string) => `Send these changes to ${who}`,
    changeNotePlaceholder: "Tell them why, in a sentence (optional)",
    blockedUnsent: (who: string) => `Send your changes to ${who} first.`,
    blockedAwaiting: (who: string) => `Waiting for ${who} to answer your changes.`,
    wasRejected: (who: string) => `${who} turned down your changes. Try again or decline the order.`,
    declineTitle: "Why are you declining?",
    declineConfirm: "Decline this order",
    cancel: "Cancel",
  },

  /** Kept verbatim from the screen this replaces — dispatchers already know these. */
  declineReasons: [
    "All stores for this order are closed",
    "The items aren't available anywhere nearby",
    "The drop-off is outside our service area",
    "No riders available for this run",
    "The customer isn't reachable",
    "Other operational reason",
  ],

  // ── stage 2 — pin the stores ────────────────────────────────────────────
  stage2: {
    hint: "Click the map to drop a pin, or search for a store.",
    searchPlaceholder: "Search for a store in Tacurong…",
    search: "Find",
    searching: "Searching…",
    pickBranch: "Which branch?",
    remove: "Remove",
    setCategory: "What kind of store is this?",
    uncategorised: "Not set",
    send: (who: string) => `Send these stores to ${who}`,
    sending: "Sending…",
    sent: (who: string) => `Stores sent to ${who}.`,
    failed: "Couldn't save the stores. Try again.",
    atLimit: (max: number) => `That's the limit — ${max} stores for one errand.`,
    emptyTitle: "No stores pinned yet",
    emptyBody: "Search for the first shop, or click the map.",

    /** How sure we are about a pin's category. */
    categoryGuessed: "guessed — check it",
    categoryNeeded: "Set the store type",
    categoryGuessedHint: (source: string) =>
      source === "google"
        ? "Guessed from Google. Change it if that's wrong."
        : "Guessed from a similar shop in your store list. Change it if that's wrong.",

    /** Duplicate pins. A second pin on the same shop is charged as a second store. */
    dupExact: (name: string, n: number) => `${name} is already pinned as #${n}.`,
    dupLikelyTitle: (name: string, n: number) =>
      `${name} looks like the shop already pinned as #${n}`,
    dupLikelyDistance: (metres: number) =>
      metres < 1
        ? "They're on the same spot."
        : `They're ${Math.round(metres)} m apart.`,
    dupLikelyName: "They have the same name.",
    /** `fee` arrives already formatted, so this file never guesses a currency. */
    dupCost: (fee: string) => `Pinning it again adds ${fee} to the delivery fee.`,
    dupCostUnknown: "Pinning it again is charged as an extra shop.",
    dupPinAnyway: "Pin it anyway",
    dupCancel: "Cancel",

    /** The catalogue lookup failing is not the same as it finding nothing. */
    catalogueUnreachable: "Couldn't reach your store list — searched the map instead.",

    /** Shown instead of the map when Google refuses the key. */
    mapDownTitle: "The store map isn't available right now",
    mapDownBody:
      "You can still pin stores by searching for them below — everything else about this order works normally.",
    mapDownAdmin: "Tell your admin: map key rejected",
    mapNoKeyAdmin: "Tell your admin: map key missing",
    mapLoading: "Loading the map…",
  },

  // ── stage 3 — confirm the items ─────────────────────────────────────────
  stage3: {
    intro: (who: string) => `Build the list, then send it to ${who} to approve.`,
    addItem: "Add an item",
    itemPlaceholder: "What is it?",
    qty: "Qty",
    removeItem: "Remove",
    edit: "Change the list",
    send: (who: string) => `Send the list to ${who}`,
    sending: "Sending…",
    sent: (who: string) => `Sent — ${who} will see it in the chat.`,
    failed: "Couldn't save the list. Try again.",
    needsOne: "Add at least one item before sending the list.",
    needsStores: "Pin at least one store first — items are filed under the shop they come from.",
    cancel: "Cancel",
    removedNotice: (item: string) => `"${item}" removed — they were told in the chat.`,

    /** Which shop the rider buys this line at. */
    storeLabel: "Shop",
    pickStore: "Which shop?",
    unassignedTitle: (n: number) =>
      n === 1 ? "One item has no shop yet" : `${n} items have no shop yet`,
    unassignedBody:
      "They came in with a category but no shop, because the customer picks what they want — not where it comes from. Choose a shop for each so the rider knows where to buy it.",
    blockedNoStores: "Pin the shops first — every item is bought at one of them.",
    blockedUnassigned: "Give every item a shop first — the rider needs to know where to go.",
  },

  // ── stage 4 — payment ───────────────────────────────────────────────────
  stage4: {
    intro: (who: string) =>
      `${who} chooses how she pays. Anything other than cash is arranged with you directly.`,
    ask: (who: string) => `Ask ${who} how she'll pay`,
    asking: "Asking…",
    asked: (who: string) => `Asked — ${who} will see it in the chat.`,
    settled: (mode: string) => `Settled — ${mode}.`,
    failed: "Couldn't set up payment. Try again.",
    /**
     * Payment cannot be arranged over a basket the customer hasn't agreed to —
     * they'd be committing to pay for a list they never saw.
     */
    blockedUnconfirmed: (who: string) =>
      `${who} has to approve the item list before you ask about payment.`,
  },

  // ── errands the customer does not pay in cash at the door ───────────────
  //
  // Two plans, one ledger: the 50% downpayment, and GCash / Bank Transfer /
  // Card, where the whole bill arrives before dispatch. Money lands on the
  // company's Facebook Page in both cases, outside this system, so every string
  // here is addressed to the dispatcher looking at that page — the one person
  // who can say whether it actually landed.
  payments: {
    title: "Payment plan",
    eyebrow: "50% DOWNPAYMENT",

    paidUpFront: "Paid up front",
    paidUpFrontOf: (due: string) => `of ${due} due before dispatch`,
    downpaymentHint: (who: string, amount: string) =>
      `${who} sends ${amount} — half the item cost — through the Facebook Page. Confirm it here once you see it.`,
    proofTitle: "Customer's receipt",
    proofNone: "No receipt uploaded yet. They can send one from their app.",
    proofRef: "Reference",
    proofTxn: "Transaction ID",
    proofAmount: "Amount",
    proofDate: "Dated",
    proofRead: (engine: string) => `Read automatically by ${engine}. Check it against the Facebook Page before confirming.`,
    confirmUpfront: "Payment received",
    confirmingUpfront: "Recording…",
    upfrontConfirmed: (amount: string) => `${amount} confirmed.`,

    balance: "Balance",
    balanceHint: "The rider collects this in cash when the items arrive.",

    overageTitle: "Goods held — receipt came in higher",
    overageHint: (agreed: string, actual: string, gap: string) =>
      `The receipt is ${actual} against the ${agreed} agreed — ${gap} nobody has approved. ` +
      `Call the customer. The rider cannot hand the items over until this clears.`,
    confirmTopUp: "Top-up received",
    confirmingTopUp: "Recording…",
    topUpConfirmed: (amount: string) => `${amount} top-up confirmed — goods released.`,

    refund: "Record a refund",
    refunding: "Recording…",
    refundConfirmed: (amount: string) => `${amount} refund recorded.`,
    refundReasonRequired: "Say why this refund was issued.",

    amountLabel: "Amount that arrived",
    noteLabel: "Note (optional)",
    noteRequired: "Reason",
    cancel: "Cancel",

    settled: "Paid in full.",
    attestedBy: (who: string, when: string) => `Confirmed by ${who}, ${when}`,
    failed: "Couldn't record that. Check the amount and try again.",
    /** The server compares against what is due and refuses a mismatch. */
    mismatch: (due: string) => `That doesn't match the ${due} due.`,
  },

  // ── stage 5 — send a rider ──────────────────────────────────────────────
  stage5: {
    intro: "The nearest free rider gets this. You don't pick one.",
    send: "Send a rider",
    sending: "Finding the nearest rider…",
    assigned: (rider: string, ref: string) => `${rider} is assigned to order #${ref}.`,
    failed: "Couldn't send a rider right now — try again in a moment.",
    missingTitle: "Before a rider can go:",
    missingStores: "Stores pinned",
    missingApproval: (who: string) => `${who} approved the list`,
    missingUpfront: "Payment confirmed",
    missingPayment: "Payment settled",
    /** Shown when the CTA is pressed while blocked — it navigates instead of doing nothing. */
    redirect: (stage: string) => `${stage} first — then you can send a rider.`,
  },

  // ── close-without-order dialog ──────────────────────────────────────────
  passBy: {
    title: "Close without an order?",
    body:
      "No purchase will be made and no rider will be sent. They'll see this request closed. This can't be undone from here.",
    confirm: "Close without an order",
    cancel: "Cancel",
  },
} as const;
