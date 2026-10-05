import { useMemo } from "react";
import { isWithinServiceArea } from "../../../../../constants/serviceArea";
import { copy, STAGE_LABELS } from "../copy";
import type {
  Stage,
  StageId,
  StageModel,
  NowAction,
  NowBarModel,
} from "../types";

/**
 * What is wrong with the drop-off, if anything: no pin at all, or a pin
 * outside Tacurong.
 *
 * This used to be a stage of its own ("Check delivery address") that had to be
 * confirmed by hand on every order, including the large majority with nothing
 * wrong. It is now a condition: the store map shows it and refuses to send the
 * stores while it holds, and nothing is asked of a dispatcher when it does not.
 * Exported so the Now bar and the store map read one answer.
 */
export type DeliveryProblem = "no-gps" | "outside" | null;

export function deliveryProblemOf(orderDetails: any): DeliveryProblem {
  if (!orderDetails) return null;
  const lat = Number(orderDetails.deliveryLatitude || 0);
  const lng = Number(orderDetails.deliveryLongitude || 0);
  if (!lat || !lng) return "no-gps";
  return isWithinServiceArea(lat, lng) ? null : "outside";
}

interface UseStageModelArgs {
  orderDetails: any;
  isReadOnly: boolean;
  customerFirstName: string;
  hasPins: boolean;
  pinCount: number;
  storesSentAt: number | null;
  hasItems: boolean;
  itemCount: number;
  hasSentConfirmationCard: boolean;
  isCustomerConfirmed: boolean;
  itemsSentAt: number | null;
  isPaymentConfirmed: boolean;
  isUpfrontConfirmed: boolean;
  confirmedPaymentMode: string | null;
  paymentAskedAt: number | null;
  mapUnavailable: boolean;
  nowMs: number;
}

const minsSince = (then: number | null, now: number): number =>
  then ? Math.max(0, Math.floor((now - then) / 60000)) : 0;

const STAGE_IDS: StageId[] = [1, 2, 3];

export function useStageModel({
  orderDetails,
  isReadOnly,
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
    const riderId = orderDetails?.riderId ?? null;
    const riderName =
      orderDetails?.rider?.name ||
      orderDetails?.riderName ||
      (orderDetails?.rider?.firstName
        ? `${orderDetails.rider.firstName} ${orderDetails.rider.lastName || ""}`.trim()
        : null);

    const deliveryProblem = deliveryProblemOf(orderDetails);
    const paymentPrompted = Boolean(paymentAskedAt || orderDetails?.paymentEnabledAt);

    // ── per-stage completion, each on its own work ────────────────────────
    const done: Record<StageId, boolean> = {
      // Sent, not merely pinned: a first pin must not throw the dispatcher on.
      1: Boolean(storesSentAt),
      // Both answers, in either order. The list and the payment question go
      // out together, but the customer answers them one at a time.
      2: isCustomerConfirmed && isPaymentConfirmed,
      3: Boolean(riderId),
    };

    const firstUnfinishedId = STAGE_IDS.find((id) => !done[id]) ?? null;
    const activeStageId: StageId = firstUnfinishedId ?? 3;

    const statusLine = (id: StageId): string => {
      switch (id) {
        case 1:
          if (done[1]) return copy.status.storesSent(pinCount);
          return hasPins ? copy.status.storesPinned(pinCount) : copy.status.noStoresYet;
        case 2:
          if (done[2]) return copy.status.approvedAndPaid(confirmedPaymentMode || "Settled");
          if (isCustomerConfirmed) return copy.status.approvedChoosingPayment(who);
          if (hasSentConfirmationCard) return copy.status.awaitingReply(who);
          return hasItems ? copy.status.itemCount(itemCount) : copy.status.notStarted;
        case 3:
          if (done[3]) return copy.status.riderAssigned(riderName || "A rider");
          if (activeStageId === 3) return copy.status.readyWhenYouAre;
          return copy.status.notStarted;
      }
    };

    const turnFor = (id: StageId): Stage["turn"] => {
      if (done[id]) return "done";
      // The customer holds it once the list is out, unless they approved and
      // the payment question never reached them, which is the dispatcher's.
      if (id === 2 && hasSentConfirmationCard && (!isCustomerConfirmed || paymentPrompted)) {
        return "customer";
      }
      if (id === 3) return "rider";
      return "you";
    };

    const stages: Stage[] = STAGE_IDS.map((id) => ({
      id,
      label: STAGE_LABELS[id - 1],
      statusLine: statusLine(id),
      state: done[id] ? "done" : id === activeStageId ? "active" : "todo",
      turn: turnFor(id),
    }));

    // Acceptance happens when the order is opened, and a drop-off problem
    // stops the stores being sent, so neither needs a term here. The two
    // customer answers do: a rider is never sent on a list nobody approved.
    const canSendRider = hasItems && hasPins && isCustomerConfirmed && isPaymentConfirmed;

    // ── the now bar ───────────────────────────────────────────────────────
    const now: NowBarModel = (() => {
      if (isReadOnly) {
        return { tone: "closed", sentence: copy.now.closed, actions: [] };
      }
      if (done[3]) {
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
          if (deliveryProblem) {
            return {
              tone: "problem",
              sentence:
                deliveryProblem === "no-gps" ? copy.now.noDropOffPin(who) : copy.now.outsideArea(who),
              actions: [nudge],
            };
          }
          return {
            tone: "you",
            sentence: mapUnavailable ? copy.now.pinStoresNoMap(who) : copy.now.pinStores(who),
            actions: [],
          };

        case 2:
          if (!hasSentConfirmationCard) {
            return { tone: "you", sentence: copy.now.sendItems(who), actions: [] };
          }
          if (!isCustomerConfirmed) {
            return {
              tone: "waiting",
              sentence: copy.now.waitingOnItems(who),
              meta: copy.now.sentAgo(minsSince(itemsSentAt, nowMs)),
              actions: [nudge],
            };
          }
          if (!paymentPrompted) {
            return { tone: "you", sentence: copy.stage4.notAsked(who), actions: [] };
          }
          return {
            tone: "waiting",
            sentence: copy.now.waitingOnPayment(who),
            meta: paymentAskedAt ? copy.now.sentAgo(minsSince(paymentAskedAt, nowMs)) : undefined,
            actions: [nudge],
          };

        case 3:
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
  ]);
}
