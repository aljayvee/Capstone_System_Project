import { useMemo } from "react";
import { copy, STAGE_LABELS } from "../copy";
import type {
  Stage,
  StageId,
  StageModel,
  NowAction,
  NowBarModel,
  OrderChatMessage,
} from "../types";

interface UseStageModelArgs {
  orderDetails: any;
  isReadOnly: boolean;
  messages: OrderChatMessage[];
  customerFirstName: string;
  hasPins: boolean;
  pinCount: number;
  /**
   * When the pinned stores were actually sent to the customer, or null.
   *
   * Stage 2 completes on this, NOT on `hasPins`. Pinning a shop used to finish
   * the stage, which meant clicking a search result to place a pin instantly
   * made stage 3 the active stage and yanked the open panel across to it — a
   * dispatcher pinning the first of three shops was thrown out of the map
   * mid-task. A pin is work in progress; sending is the handover.
   */
  storesSentAt: number | null;
  hasItems: boolean;
  itemCount: number;
  hasSentConfirmationCard: boolean;
  isCustomerConfirmed: boolean;
  itemsSentAt: number | null;
  isPaymentConfirmed: boolean;
  /** True for every COD errand; false only while a downpayment is outstanding. */
  isUpfrontConfirmed: boolean;
  confirmedPaymentMode: string | null;
  paymentAskedAt: number | null;
  mapUnavailable: boolean;
  /** Recomputes the "sent N min ago" meta without a timer of its own. */
  nowMs: number;
}

const minsSince = (then: number | null, now: number): number =>
  then ? Math.max(0, Math.floor((now - then) / 60000)) : 0;

/**
 * The single source of truth for "where is this order and whose turn is it".
 *
 * This replaces four separate derivations in the screen it succeeds — the
 * step1Done..step4Done booleans, the tracker capsule ternaries, the "current
 * active milestone" ternary, and the assign-rider checklist — which each
 * computed overlapping answers and could disagree with one another.
 *
 * It also fixes the numbering. Previously `step1Done = hasPins && hasItems`,
 * so the step labelled "Stores Pinned" could not complete until the NEXT
 * step's work was done: a dispatcher pinned three shops, watched the badge stay
 * grey, and had no way to find out why. Here each stage completes on its own
 * work. The server-facing guard (`canSendRider`) is unchanged — only the
 * display model was wrong.
 */
export function useStageModel({
  orderDetails,
  isReadOnly,
  messages,
  customerFirstName,
  hasPins,
  pinCount,
  storesSentAt,
  hasItems,
  itemCount,
  hasSentConfirmationCard,
  isCustomerConfirmed,
  itemsSentAt,
  isPaymentConfirmed,
  isUpfrontConfirmed,
  confirmedPaymentMode,
  paymentAskedAt,
  mapUnavailable,
  nowMs,
}: UseStageModelArgs): StageModel {
  return useMemo(() => {
    const who = customerFirstName;
    const verifiedAt = orderDetails?.dispatchLogs?.[0]?.verifiedAt ?? null;
    const isVerified = Boolean(verifiedAt);
    const riderId = orderDetails?.riderId ?? null;
    const riderName =
      orderDetails?.rider?.name ||
      orderDetails?.riderName ||
      (orderDetails?.rider?.firstName
        ? `${orderDetails.rider.firstName} ${orderDetails.rider.lastName || ""}`.trim()
        : null);

    // A revision put to the customer during stage 1 blocks acceptance until
    // they answer it — the same rule the review card already enforced.
    const revisions = messages.filter((m: any) => m?.systemKind === "item_revision");
    const latestRevision = revisions.length ? revisions[revisions.length - 1] : null;
    const revisionPending = latestRevision?.status === "pending";
    const revisionRejected = latestRevision?.status === "rejected";

    const paymentPrompted = Boolean(paymentAskedAt || orderDetails?.paymentEnabledAt);

    // ── per-stage completion, each on its own work ────────────────────────
    const done: Record<StageId, boolean> = {
      1: isVerified,
      // Sent, not merely pinned — see storesSentAt above.
      2: Boolean(storesSentAt),
      3: isCustomerConfirmed,
      4: isPaymentConfirmed,
      5: Boolean(riderId),
    };

    const firstUnfinishedId =
      ([1, 2, 3, 4, 5] as StageId[]).find((id) => !done[id]) ?? null;
    const activeStageId: StageId = firstUnfinishedId ?? 5;

    const statusLine = (id: StageId): string => {
      switch (id) {
        case 1:
          if (done[1]) return copy.status.accepted;
          if (revisionPending) return copy.status.awaitingReply(who);
          return hasItems ? copy.status.itemCount(itemCount) : copy.status.notStarted;
        case 2:
          if (done[2]) return copy.status.storesSent(pinCount);
          return hasPins ? copy.status.storesPinned(pinCount) : copy.status.noStoresYet;
        case 3:
          if (done[3]) return copy.status.approvedBy(who);
          if (hasSentConfirmationCard) return copy.status.awaitingReply(who);
          return hasItems ? copy.status.itemCount(itemCount) : copy.status.notStarted;
        case 4:
          if (done[4]) return copy.status.paidBy(confirmedPaymentMode || "Settled");
          if (paymentPrompted) return copy.status.awaitingReply(who);
          return copy.status.notStarted;
        case 5:
          if (done[5]) return copy.status.riderAssigned(riderName || "A rider");
          if (activeStageId === 5) return copy.status.readyWhenYouAre;
          return copy.status.notStarted;
      }
    };

    const turnFor = (id: StageId): Stage["turn"] => {
      if (done[id]) return "done";
      if (id === 1 && revisionPending) return "customer";
      if (id === 3 && hasSentConfirmationCard) return "customer";
      if (id === 4 && paymentPrompted) return "customer";
      if (id === 5) return "rider";
      return "you";
    };

    const stages: Stage[] = ([1, 2, 3, 4, 5] as StageId[]).map((id) => ({
      id,
      label: STAGE_LABELS[id - 1],
      statusLine: statusLine(id),
      state: done[id] ? "done" : id === activeStageId ? "active" : "todo",
      turn: turnFor(id),
    }));

    // The server-facing precondition for assignment.
    //
    // The 50% no longer gates this. It is collected mid-way: the rider buys the
    // items, then asks for half of what they actually paid before heading to
    // the customer (errandPaymentService.requestHalfPayment), and the server
    // still refuses the handover until it lands. Asking for it here, before a
    // single receipt exists, was asking for half of a guess.
    const canSendRider = hasItems && hasPins && isCustomerConfirmed && isPaymentConfirmed;

    // ── the now bar ───────────────────────────────────────────────────────
    const now: NowBarModel = (() => {
      if (isReadOnly) {
        return { tone: "closed", sentence: copy.now.closed, actions: [] };
      }
      if (done[5]) {
        return {
          tone: "ready",
          sentence: copy.now.dispatched(riderName || "Your rider"),
          actions: [],
        };
      }

      const nudge: NowAction = {
        label: copy.nowActions.nudge(who),
        kind: "secondary",
        action: "nudge",
      };

      switch (activeStageId) {
        case 1:
          if (revisionRejected) {
            return {
              tone: "problem",
              sentence: copy.stage1.wasRejected(who),
              actions: [{ label: copy.nowActions.decline, kind: "secondary", action: "decline" }],
            };
          }
          if (revisionPending) {
            return {
              tone: "waiting",
              sentence: copy.now.waitingOnRevision(who),
              meta: copy.now.sentAgo(minsSince(latestRevision?.timestamp ?? null, nowMs)),
              actions: [nudge],
            };
          }
          return {
            tone: "you",
            sentence: copy.now.checkOrder(who),
            actions: [
              { label: copy.nowActions.accept, kind: "primary", action: "accept" },
              { label: copy.nowActions.decline, kind: "secondary", action: "decline" },
            ],
          };

        case 2:
          return {
            tone: "you",
            sentence: mapUnavailable ? copy.now.pinStoresNoMap(who) : copy.now.pinStores(who),
            actions: [],
          };

        case 3:
          if (hasSentConfirmationCard) {
            return {
              tone: "waiting",
              sentence: copy.now.waitingOnItems(who),
              meta: copy.now.sentAgo(minsSince(itemsSentAt, nowMs)),
              actions: [
                nudge,
                { label: copy.nowActions.changeList, kind: "secondary", action: "changeList" },
              ],
            };
          }
          return { tone: "you", sentence: copy.now.sendItems(who), actions: [] };

        case 4:
          if (paymentPrompted) {
            return {
              tone: "waiting",
              sentence: copy.now.waitingOnPayment(who),
              meta: copy.now.sentAgo(minsSince(paymentAskedAt, nowMs)),
              actions: [nudge],
            };
          }
          return { tone: "you", sentence: copy.now.askPayment(who), actions: [] };

        case 5:
        default:
          return {
            tone: "ready",
            sentence: copy.now.ready,
            actions: [
              { label: copy.nowActions.sendRider, kind: "primary", action: "sendRider" },
            ],
          };
      }
    })();

    return {
      stages,
      activeStageId,
      now,
      doneCount: stages.filter((s) => s.state === "done").length,
      canSendRider,
      firstUnfinishedId,
    };
  }, [
    orderDetails,
    isReadOnly,
    messages,
    customerFirstName,
    hasPins,
    pinCount,
    storesSentAt,
    hasItems,
    itemCount,
    hasSentConfirmationCard,
    isCustomerConfirmed,
    itemsSentAt,
    isPaymentConfirmed,
    confirmedPaymentMode,
    paymentAskedAt,
    mapUnavailable,
    nowMs,
  ]);
}
