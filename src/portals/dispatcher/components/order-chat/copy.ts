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

/**
 * The three stages, in order. The numbering here is the numbering everywhere.
 *
 * There were six. Accepting now happens when the order is opened, the address
 * check lives in the store map, and the item list and the payment question go
 * to the customer in one send, so they are one stage.
 */
export const STAGE_LABELS = [
  "Pin the stores",
  "Confirm items and payment",
  "Assign a rider",
] as const;

export const copy = {
  // ── chrome ──────────────────────────────────────────────────────────────
  backToQueue: "Back to queue",
  moreActions: "More actions",
  closeWithoutOrder: "Close without an order",
  declineOrder: "Decline this order",
  dropOff: "Drop-off",

  /** Opening an order accepts it. Shown only when that write fails. */
  acceptFailed: "This order could not be accepted, so the customer has not been told who you are yet.",
  acceptRetry: "Try again",

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
  paymentTab: "Payment",

  quickReplies: (who: string) => [
    "On it. Checking your order now.",
    "I've pinned the stores, take a look.",
    "Sent your list. Approve it when you are ready.",
    "Your cash on delivery is confirmed.",
    "Finding you a rider now.",
    `Thanks for waiting, ${who}.`,
  ],

  // ── now bar ─────────────────────────────────────────────────────────────
  now: {
    pinStores: (who: string) => `Pin the shops ${who} needs, then send them over.`,
    pinStoresNoMap: (who: string) => `Search for the shops ${who} needs. The map is down.`,
    noDropOffPin: (who: string) => `${who}'s order has no drop-off pin. Ask them for it before pinning stores.`,
    outsideArea: (who: string) => `${who}'s drop-off is outside Tacurong. Ask them, or decline the order.`,
    sendItems: (who: string) =>
      `Check ${who}'s list and send it. They approve it and pick how to pay in one go.`,
    waitingOnItems: (who: string) => `Waiting for ${who} to approve the item list`,
    waitingOnPayment: (who: string) => `Waiting for ${who} to choose how to pay`,
    ready: "Everything's confirmed. Assign a rider.",
    dispatched: (rider: string) => `${rider} is on the way.`,
    closed: "This order is closed. You're reading the history.",
    sentAgo: (mins: number) => ` · sent ${formatAgo(mins)}`,
  },

  nowActions: {
    nudge: (who: string) => `Nudge ${who}`,
    sendRider: "Assign a rider",
  },

  // ── stage status lines ──────────────────────────────────────────────────
  status: {
    notStarted: "Not started yet",
    awaitingReply: (who: string) => `${who} hasn't replied yet`,
    storesPinned: (n: number) => (n === 1 ? "1 store pinned" : `${n} stores pinned`),
    storesSent: (n: number) => (n === 1 ? "1 store sent" : `${n} stores sent`),
    noStoresYet: "No stores pinned yet",
    itemCount: (n: number) => (n === 1 ? "1 item" : `${n} items`),
    /** Approved the list, still on the payment question. */
    approvedChoosingPayment: (who: string) => `${who} approved, choosing payment`,
    approvedAndPaid: (mode: string) => `Approved · ${mode}`,
    riderAssigned: (rider: string) => `${rider} is on it`,
    readyWhenYouAre: "Ready when you are",
  },

  showAllSteps: "Show all steps",
  showOneStep: "Show one step at a time",

  /**
   * Reasons for declining, offered in the header menu's dialog. Kept verbatim
   * from the screen this replaces, since dispatchers already know them, plus the
   * one the address step used to offer.
   */
  declineReasons: [
    "All stores for this order are closed",
    "The items aren't available anywhere nearby",
    "The drop-off is outside our service area",
    "The customer's location is wrong or unreachable",
    "No riders available for this run",
    "The customer isn't reachable",
    "Other operational reason",
  ],
  decline: {
    title: "Decline this order?",
    body: (who: string) => `${who} is told the order was cancelled and why. Nothing is charged.`,
    otherPlaceholder: "What happened?",
    confirm: "Decline this order",
    cancel: "Cancel",
    failed: "This order could not be declined. The customer has not been told anything, so it is safe to try again.",
  },

  // ── the drop-off, shown at the top of the store map ─────────────────────
  // This was a stage of its own ("Check delivery address"). What it checked
  // still blocks sending the stores; it just no longer needs its own step.
  stageAddress: {
    deliverTo: "Deliver to",
    map: "Map",
    missingGpsTitle: "Missing GPS coordinates",
    missingGpsDetail:
      "This order has no pinned delivery coordinates. Ask the customer in chat to provide their delivery address and pinpoint before sending the stores.",
    outOfAreaTitle: "Outside service area",
    outOfAreaDetail:
      "This delivery location is outside Tacurong City limits. Decline the order or contact the customer.",
    askInChat: (who: string) => `Ask ${who} in chat`,
  },

  // ── stage 1: pin the stores ─────────────────────────────────────────────
  stage2: {
    hint: "Click the map to drop a pin, or search for a store.",
    searchPlaceholder: "Search for a store in Tacurong…",
    search: "Find",
    searching: "Searching",
    pickBranch: "Which branch?",
    remove: "Remove",
    setCategory: "What kind of store is this?",
    uncategorised: "Not set",
    send: (who: string) => `Send these stores to ${who}`,
    sending: "Sending",
    sent: (who: string) => `Stores sent to ${who}.`,
    failed: "Couldn't save the stores. Try again.",
    atLimit: (max: number) => `That is the limit: ${max} stores for one errand.`,
    emptyTitle: "No stores pinned yet",
    emptyBody: "Search for the first shop, or click the map.",

    /**
     * The handover. Pinning no longer finishes this stage on its own, so the
     * dispatcher needs somewhere to say "I'm done here" - pinning the first of
     * three shops used to complete the stage and throw them into stage 4.
     */
    continueTitle: (who: string) => `${who} has the stores.`,
    continueBody: "Add more shops if you need to, or move on to the item list.",
    continueAction: "Continue to step 2",

    /**
     * The live fee. Priced by the server as pins change (quotePinpoints), so the
     * dispatcher sees what the stores cost before anything reaches the customer.
     */
    liveFeeTitle: "What the delivery costs",
    pricing: "Working out the delivery fee",
    priceFailed: "Couldn't work out the delivery fee just now.",
    priceRetry: "Try again",
    priceEstimated: "Distance measured in a straight line: no road route was available.",
    fareAgreed: (who: string) => `${who} already agreed this fare, so the stores do not change it.`,
    /** Under "Continue to step 2": what pressing it does. `fee` arrives formatted. */
    continueSends: (who: string, fee: string) => `Sends these stores and the ${fee} delivery fee to ${who}.`,
    continueSendsNoFee: (who: string) =>
      `Sends these stores to ${who}. The fee is worked out as they are saved.`,
    continueUpToDate: (who: string) => `${who} has these stores.`,
    /** Pressing Continue while the drop-off is not usable: it explains instead of sending. */
    blockedDropOff: (who: string) => `Sort out ${who}'s drop-off first. The stores can't be priced to a place we can't deliver to.`,

    /** How sure we are about a pin's category. */
    categoryGuessed: "guessed, check it",
    categoryNeeded: "Set the store type",
    categoryGuessedHint: (source: string) =>
      source === "google"
        ? "Guessed from Google. Change it if that's wrong."
        : source === "model"
          ? "Guessed by reading the shop name. Change it if that's wrong."
          : "Guessed from a similar shop in your store list. Change it if that's wrong.",
    /** What the model thought, for a dispatcher deciding whether to trust it. */
    categoryModelHint: (name: string, pct: number, runnerUp?: string) =>
      runnerUp
        ? `Read the name as ${name} (${pct}% sure). Next likeliest: ${runnerUp}.`
        : `Read the name as ${name} (${pct}% sure).`,

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
    catalogueUnreachable: "Could not reach your store list, so the map was searched instead.",

    /** Shown instead of the map when Google refuses the key. */
    mapDownTitle: "The store map isn't available right now",
    mapDownBody:
      "You can still pin stores by searching for them below. Everything else about this order works normally.",
    mapDownAdmin: "Tell your admin: map key rejected",
    mapNoKeyAdmin: "Tell your admin: map key missing",
    mapLoading: "Loading the map",
  },

  // ── stage 2: confirm items and payment ──────────────────────────────────
  stage3: {
    /** "Store needed": no pinned store is this kind, and the store to pin for it. */
    noPinnedKind: (category: string) => `No pinned store is ${category}.`,
    noStoreToSuggest: "No store to suggest yet. Search for one in step 1.",
    pinStoreNamed: (store: string) => `Pin ${store} in step 1`,
    pinAStore: "Pin a store in step 1",
    pinnedFor: (store: string, item: string) =>
      `Pinned ${store} for ${item}. Check it on the map, then continue.`,
    intro: (who: string) =>
      `Check the list, then send it. ${who} approves it and picks how to pay in the same message.`,
    addItem: "Add an item",
    itemPlaceholder: "What is it?",
    qty: "Qty",
    removeItem: "Remove",
    send: (who: string) => `Send the list to ${who}`,
    resend: (who: string) => `Send the updated list to ${who}`,
    resendNote: (who: string) => `You changed the list since sending it. ${who} approves it again.`,
    undoChanges: "Undo changes",
    approved: (who: string) => `${who} approved this list.`,
    /** Rider-reported only. An unchecked line before shopping is not a warning. */
    outOfStock: "Out of stock",
    outOfStockBanner: (n: number) =>
      n === 1 ? "1 item reported out of stock by the rider" : `${n} items reported out of stock by the rider`,
    suggestSubstitutes: "Suggest substitutes",
    checkingSubstitutes: "Checking",
    declineSubstitute: "Decline substitute",
    sending: "Sending",
    sent: (who: string) => `Sent. ${who} will see it in the chat.`,
    failed: "Couldn't save the list. Try again.",
    needsOne: "Add at least one item before sending the list.",
    needsStores: "Pin at least one store first. Items are filed under the shop they come from.",
    cancel: "Cancel",
    removedNotice: (item: string) => `"${item}" removed. They were told in the chat.`,

    /** Which shop the rider buys this line at. */
    storeLabel: "Shop",
    pickStore: "Which shop?",
    unassignedTitle: (n: number) =>
      n === 1 ? "One item has no shop yet" : `${n} items have no shop yet`,
    unassignedBody:
      "They came in with a category but no shop, because the customer picks what they want, not where it comes from. Choose a shop for each so the rider knows where to buy it.",
    blockedNoStores: "Pin the shops first. Every item is bought at one of them.",
    blockedUnassigned: "Give every item a shop first. The rider needs to know where to go.",

    /**
     * The shop question, asked per line.
     *
     * A new line inherits the shop of the one above it, which is right most of
     * the time and silently wrong the rest. Asking makes the inherited answer
     * visible instead of leaving it to be discovered by a rider at the counter.
     */
    sameStoreAsk: (store: string) => `Bought at ${store}?`,
    sameStoreYes: "Yes, same shop",
    otherStore: "A different shop",
    /** The escape hatch back to stage 2 when the shop isn't pinned yet. */
    storeNotPinned: "Not pinned yet",
    needsNewStore: (item: string) =>
      item
        ? `Pin the shop that sells "${item}", then come back and file it there.`
        : "Pin the shop this item comes from, then come back and file it there.",

    /**
     * Where a line should be bought.
     *
     * Names the shop when one of the pinned stops fits, because that is the
     * half the rider acts on. Falls back to the category alone when two stops
     * share it or none matches, rather than picking on a coin flip.
     */
    placementSuggestion: (category: string, store: string | null) =>
      store ? `Buy at ${store} (${category})` : `Looks like ${category}`,
    placementApply: "Use it",
    /** Provenance. A remembered decision and a read name are not the same claim. */
    placementLearned: (n: number) =>
      n === 1 ? "filed once before" : `filed this way ${n}x`,
    placementModelled: "read from the name",
  },

  // ── stage 2, the payment half ───────────────────────────────────────────
  stage4: {
    intro: (who: string) =>
      `${who} chooses how they pay. Anything other than cash is arranged with you directly.`,
    heading: "Payment",
    /** Before the list goes out: the send asks for payment too. */
    asksWithList: (who: string) => `${who} picks how to pay when you send the list.`,
    /** The list went out but the payment question did not (it failed, or an older order). */
    notAsked: (who: string) => `The payment question has not reached ${who} yet.`,
    answersEitherOrder: "They can choose before or after approving the list.",
    ask: (who: string) => `Ask ${who} how they will pay`,
    asking: "Asking",
    asked: (who: string) => `Asked. ${who} will see it in the chat.`,
    settled: (mode: string) => `Settled by ${mode}.`,
    failed: "Couldn't set up payment. Try again.",
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

    paidUpFront: "Half-payment",
    paidUpFrontOf: (due: string) => `of ${due}, half of what the rider paid`,
    downpaymentHint: (who: string, amount: string) =>
      `${who} sends ${amount}, half the item cost, once the rider has bought everything. A receipt that checks out confirms itself; confirm here only if you received it another way.`,
    proofTitle: "Customer's receipt",
    proofNone: "No receipt uploaded yet. They can send one from their app.",
    proofRef: "Reference",
    proofTxn: "Transaction ID",
    proofAmount: "Amount",
    proofDate: "Dated",
    proofRead: (engine: string) => `Read automatically by ${engine}. Check it against the Facebook Page before confirming.`,
    confirmUpfront: "Payment received",
    confirmingUpfront: "Recording",
    upfrontConfirmed: (amount: string) => `${amount} confirmed.`,

    balance: "Balance",
    balanceHint: "The rider collects this in cash when the items arrive, unless the customer already sent it through the Facebook Page.",
    balanceProofTitle: "Customer's balance receipt",
    confirmBalance: "Balance received",
    confirmingBalance: "Recording",
    balanceConfirmed: (amount: string) => `${amount} balance confirmed. The rider no longer needs to collect it.`,

    overageTitle: "Goods held, receipt came in higher",
    overageHint: (agreed: string, actual: string, gap: string) =>
      `The receipt is ${actual} against the ${agreed} agreed, so ${gap} of it nobody has approved. ` +
      `Call the customer. The rider cannot hand the items over until this clears.`,
    confirmTopUp: "Top-up received",
    confirmingTopUp: "Recording",
    topUpConfirmed: (amount: string) => `${amount} top-up confirmed. Goods released.`,

    refund: "Record a refund",
    refunding: "Recording",
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

    // ── the standalone half-payment panel, beside the chat rather than
    // inside the stage accordion ────────────────────────────────────────
    halfPaymentPanelTitle: "Half-payment",
    halfPaymentWaitingUpfront: "Waiting on the upfront payment first. See the payment section of step 2.",

    // ── the 50%, collected mid-way ────────────────────────────────────────
    halfNotYet: (rider: string) =>
      `${rider} asks for this after buying everything, so it is half of what they actually paid. Nothing to do yet.`,
    halfRequestedTitle: (rider: string) => `${rider} has every item and is waiting`,
    halfRequestedBody: (who: string, amount: string, goods: string, since: string) =>
      `${who} owes ${amount}, half of the ${goods} spent. Waiting ${since}.`,
    halfAsk: (who: string, amount: string) => `Ask ${who} for ${amount}`,
    halfAsked: (who: string) => `Asked ${who} for the half-payment`,
    halfShowUpload: (who: string) => `Show ${who} where to send the receipt`,
    halfShowedUpload: (who: string) => `${who} was shown where to send the receipt`,
    halfRequestMessage: (amount: string, goods: string) =>
      `Your rider has bought all your items (${goods}). Please send the half-payment of ${amount} through GCash or PayMaya so they can bring them to you.`,
    halfUploadMessage: (amount: string) =>
      `Once you've sent the ${amount}, upload a screenshot of your GCash or PayMaya receipt here. Tap "Send my receipt".`,
    halfReceiptWaiting: "No receipt yet.",
    halfReceiptReview: "Receipt received, but its reference number already paid for another order. Check it before confirming.",
    halfAutoConfirmed: (rider: string) =>
      `Confirmed automatically from the customer's receipt. ${rider} was told to head to the customer.`,
    halfConfirmedBy: (who: string, rider: string) => `Confirmed by ${who}. ${rider} was told to head to the customer.`,
    halfManualTitle: "Received it another way?",
    halfPaymentOveragePending:
      "Goods are held on a receipt overage. Resolve that in the payment section of step 2 before the balance applies.",
    halfPaymentRefunded: "This errand was refunded — there's no balance to collect.",
    proofPhotoTitle: "Photo evidence",
    proofPhotoNone: "No photo uploaded yet.",
    proofPhotoCustomer: "Uploaded by the customer",
    proofPhotoRider: "Photographed by the rider at the door",
    proofPhotoSuperseded: "Replaced by a later upload",
    proofPhotoCapturedAt: (when: string) => `Captured ${when}`,
  },

  // ── stage 3: assign a rider ─────────────────────────────────────────────
  stage5: {
    intro: "The system gives this to the nearest free rider. This is who is around right now.",
    send: "Assign a rider",
    sending: "Finding the nearest rider",
    assigned: (rider: string, ref: string) => `${rider} is assigned to order #${ref}.`,
    failed: "Could not send a rider right now. Try again in a moment.",
    missingTitle: "Before a rider can go:",
    missingStores: "Stores pinned",
    missingApproval: (who: string) => `${who} approved the list`,
    missingUpfront: "Payment confirmed",
    missingPayment: "Payment settled",
    /** Shown when the CTA is pressed while blocked — it navigates instead of doing nothing. */
    redirect: (stage: string) => `${stage} first, then you can assign a rider.`,
    /** The live roster under the button. Information only: the server picks. */
    rosterTitle: (n: number) => (n === 1 ? "1 rider around" : `${n} riders around`),
    rosterAvailable: "Available",
    rosterOnDelivery: "On delivery",
    rosterLoad: (n: number, cap: number) => `${n} of ${cap} errands`,
    rosterFull: "Full",
    rosterEmpty: "No riders are available or on an errand right now. Assigning will say why.",
    rosterFailed: "Could not load the riders just now.",
    rosterRetry: "Try again",
  },

  // ── moving on by itself when the customer answers ──────────────────────
  /** The sentence shown on the stage the screen moved to, and why it moved. */
  advance: {
    /** Both answers are in, whichever came last. Assigning needs the pair. */
    readyToAssign: (who: string, mode: string | null) =>
      mode
        ? `${who} approved the list and chose ${mode}. Next, assign a rider.`
        : `${who} approved the list and chose how to pay. Next, assign a rider.`,
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
