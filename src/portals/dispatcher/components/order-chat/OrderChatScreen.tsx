import * as React from "react";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, MoreHorizontal, MessageSquare, ListChecks, Wallet, Slash, X, Hourglass, Receipt, Ban, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "../../../../services/apiClient";
import { formatErrandId } from "../../../../utils/formatErrandId";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { UnauthorizedErrandScreen } from "../UnauthorizedErrandScreen";
import { CustomerLocationModal } from "../CustomerLocationModal";
import { StatusChip } from "@/components/panel/DispatcherBadge";
import { DispatcherButton } from "@/components/panel/DispatcherButton";

import { NowBar } from "./NowBar";
import { StageStepsRail, Detent } from "./StageStepsRail";
import { StageList, readStoredShowAll, storeShowAll } from "./StageList";
import { ConversationPane } from "./conversation/ConversationPane";
import { Stage2PinStores } from "./stages/Stage2PinStores";
import { Stage3ConfirmItems } from "./stages/Stage3ConfirmItems";
import { Stage4Payment } from "./stages/Stage4Payment";
import { Stage5SendRider } from "./stages/Stage5SendRider";
import { PaymentProofPanel } from "./PaymentProofPanel";
import { DeclineOrderDialog } from "./DeclineOrderDialog";

import { useOrderDetails } from "./hooks/useOrderDetails";
import { useOrderChat } from "./hooks/useOrderChat";
import { useStorePins } from "./hooks/useStorePins";
import { useOrderItems } from "./hooks/useOrderItems";
import { useOrderPayment } from "./hooks/useOrderPayment";
import { useOrderPayments } from "./hooks/useOrderPayments";
import { useRiderDispatch } from "./hooks/useRiderDispatch";
import { useStageModel, deliveryProblemOf } from "./hooks/useStageModel";
import { copy } from "./copy";
import type { NowAction, StageId } from "./types";

export interface OrderChatScreenProps {
  orderId: string;
  dispatcher: any;
  onClose: () => void;
  onRefreshOrders?: () => void;
  readOnly?: boolean;
  /**
   * Accepts the order. Called by this screen as soon as it opens an order the
   * dispatcher has claimed and not yet accepted: there is no "Check the order"
   * step any more, so opening it is taking it on. That also means it can no
   * longer be handed back to the queue (the server refuses a release once an
   * order is accepted); declining, from the header menu, is the exit.
   */
  onVerify?: (orderId: string) => Promise<void>;
  onDecline?: (orderId: string, reason: string) => Promise<void>;
}

/** Statuses that make this a read-only record rather than live work. */
const CLOSED_STATUSES = ["PASSING BY", "CANCELLED", "COMPLETED", "DELIVERED"];

export const OrderChatScreen: React.FC<OrderChatScreenProps> = ({
  orderId,
  dispatcher,
  onClose,
  onRefreshOrders,
  readOnly = false,
  onVerify,
  onDecline,
}) => {
  const {
    orderDetails,
    setOrderDetails,
    panelError,
    initialPinpoints,
    merchantCategories,
    rateConfig,
    refresh,
  } = useOrderDetails(orderId, dispatcher);

  const [mobilePane, setMobilePane] = useState<"chat" | "steps" | "payment">("steps");
  const [openStageId, setOpenStageId] = useState<StageId | null>(null);
  const [showAll, setShowAll] = useState(readStoredShowAll);
  const [flashId, setFlashId] = useState<StageId | null>(null);
  const [jumpReason, setJumpReason] = useState<{ stage: StageId; text: string } | null>(null);
  const [showPassByConfirm, setShowPassByConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Recomputed on a slow tick so "sent 4 min ago" stays honest without every
  // stage owning its own timer.
  const [nowMs, setNowMs] = useState(() => Date.now());

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const userTouchedStage = useRef(false);

  const dispatcherFirstName = dispatcher?.name ? dispatcher.name.split(" ")[0] : "Dispatcher";
  const customerName =
    orderDetails?.customer?.name || orderDetails?.customerName || "Customer";
  const customerFirstName = customerName.split(" ")[0] || "them";
  const customerPhone = orderDetails?.customer?.phone || orderDetails?.customerPhone || "";

  const isReadOnly =
    readOnly ||
    Boolean(
      orderDetails && CLOSED_STATUSES.includes(String(orderDetails.status).toUpperCase())
    );

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // ── accepting, on open ──────────────────────────────────────────────────
  // There is no "Check the order" step to press Accept in: the dispatcher who
  // claimed this order and opens it is taking it on. Only their own claim, and
  // only once: the server stamps verifiedAt idempotently, but the customer's
  // introduction message is sent by the caller and must not repeat.
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const acceptAttempted = useRef(false);
  const claim = orderDetails?.dispatchLogs?.[0] ?? null;
  const needsAccepting =
    Boolean(orderDetails) &&
    !panelError &&
    !isReadOnly &&
    Boolean(onVerify) &&
    claim !== null &&
    !claim.verifiedAt &&
    (claim.dispatcherId == null || dispatcher?.id == null || Number(claim.dispatcherId) === Number(dispatcher.id));

  const acceptOrder = useCallback(async () => {
    setIsAccepting(true);
    setAcceptError(null);
    try {
      await onVerify?.(orderId);
      refresh();
    } catch (err: any) {
      // The order is still claimed and nothing was sent, so trying again is
      // safe; the banner says so and offers it in place.
      setAcceptError(err?.response?.data?.error || copy.acceptFailed);
    } finally {
      setIsAccepting(false);
    }
  }, [onVerify, orderId, refresh]);

  useEffect(() => {
    if (!needsAccepting || acceptAttempted.current) return;
    acceptAttempted.current = true;
    void acceptOrder();
  }, [needsAccepting, acceptOrder]);

  // ── chat ────────────────────────────────────────────────────────────────
  const chat = useOrderChat({
    orderId,
    dispatcher,
    dispatcherFirstName,
    enabled: Boolean(orderDetails) && !panelError,
    readOnly: isReadOnly,
  });

  // ── stage data ──────────────────────────────────────────────────────────
  const pins = useStorePins({
    orderId,
    orderDetails,
    merchantCategories,
    customerDisplayName: customerFirstName,
    initialPinpoints,
    // Read only to recover "the stores were already sent", which is what
    // completes step 1 and must survive a reload.
    messages: chat.messages,
    onOrderUpdated: setOrderDetails,
    pushMessage: chat.pushMessage,
    mapVisible: showAll || openStageId === 1,
    // The fee is priced live as pins change, except on a closed order.
    liveQuote: !isReadOnly,
  });

  const items = useOrderItems({
    orderId,
    orderDetails,
    customerDisplayName: customerFirstName,
    pinpoints: pins.pinpoints,
    merchantCategories,
    messages: chat.messages,
    onOrderUpdated: setOrderDetails,
    pushMessage: chat.pushMessage,
  });

  const markCustomerConfirmed = useCallback(
    () => items.setIsCustomerConfirmed(true),
    [items.setIsCustomerConfirmed]
  );

  const payment = useOrderPayment({
    orderId,
    customerDisplayName: customerFirstName,
    onOrderUpdated: setOrderDetails,
    pushMessage: chat.pushMessage,
    onCustomerConfirmed: markCustomerConfirmed,
  });

  // The downpayment ledger. Separate hook from useOrderPayment above: that one
  // is the customer CHOOSING a method, this one is a dispatcher attesting that
  // money arrived on the Facebook Page.
  const payments = useOrderPayments({
    orderId,
    onOrderUpdated: setOrderDetails,
  });

  const dispatchRider = useRiderDispatch({
    orderId,
    pushMessage: chat.pushMessage,
    onRefreshOrders,
    onDispatched: onClose,
  });

  // ── the model ───────────────────────────────────────────────────────────
  const model = useStageModel({
    orderDetails,
    isReadOnly,
    customerFirstName,
    hasPins: pins.pinpoints.length > 0,
    pinCount: pins.pinpoints.length,
    storesSentAt: pins.storesSentAt,
    hasItems: items.savedItems.length > 0,
    itemCount: items.savedItems.length,
    hasSentConfirmationCard: items.hasSentConfirmationCard,
    isCustomerConfirmed: items.isCustomerConfirmed,
    itemsSentAt: items.sentAt,
    isPaymentConfirmed: payment.isPaymentConfirmed,
    isUpfrontConfirmed: payments.isUpfrontConfirmed,
    confirmedPaymentMode: payment.confirmedPaymentMode,
    paymentAskedAt: payment.askedAt,
    mapUnavailable: pins.mapUnavailable,
    nowMs,
  });

  // Open on whatever needs attention, until the dispatcher picks for themselves.
  useEffect(() => {
    if (userTouchedStage.current) return;
    if (openStageId === 1 && model.activeStageId > 1 && pins.sentThisSession) return;
    setOpenStageId(model.activeStageId);
  }, [model.activeStageId, openStageId, pins.sentThisSession]);

  // Unread badge for the chat tab, since the conversation can be off-screen.
  useEffect(() => {
    if (mobilePane === "chat") setUnreadCount(0);
  }, [mobilePane, chat.messages.length]);
  useEffect(() => {
    const last = chat.messages[chat.messages.length - 1];
    if (last && last.role === "customer" && mobilePane !== "chat") {
      setUnreadCount((n) => n + 1);
    }
    // Only when a new message arrives.
  }, [chat.messages.length]);

  const toggleStage = useCallback((id: StageId) => {
    userTouchedStage.current = true;
    setShowAll(false);
    storeShowAll(false);
    setOpenStageId(id);
  }, []);

  const [prefillStoreSearch, setPrefillStoreSearch] = useState<string | null>(null);

  /**
   * Sends the dispatcher to the stage that is actually blocking them, and says
   * why when there is a reason. A blocked action that only moves the view is
   * still a puzzle; the sentence is the half that makes it navigation.
   */
  const jumpToStage = useCallback((id: StageId, reason?: string, prefill?: string) => {
    userTouchedStage.current = true;
    setShowAll(false);
    storeShowAll(false);
    setOpenStageId(id);
    setMobilePane("steps");
    setFlashId(id);
    setJumpReason(reason ? { stage: id, text: reason } : null);
    if (prefill) {
      setPrefillStoreSearch(prefill);
    }
    window.setTimeout(() => {
      document.getElementById(`stage-body-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      document.getElementById(`stage-rail-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 40);
    window.setTimeout(() => setFlashId(null), 1600);
    // The sentence outlives the highlight - it is the part worth reading.
    window.setTimeout(() => setJumpReason(null), 9000);
  }, []);

  // ── moving on when the customer answers ─────────────────────────────────
  /**
   * The moment this screen had finished loading what already happened.
   *
   * The two moves below are for answers that arrive WHILE the dispatcher is
   * here. On open, the chat and the payment choice load a moment after the
   * panel, so an order approved yesterday also "becomes" approved on load;
   * without this, reopening a finished order would throw the dispatcher to
   * step 6. Anything that changes more than a couple of seconds after the
   * chat has loaded is an answer arriving now.
   */
  const settledAt = useRef<number | null>(null);
  useEffect(() => {
    if (settledAt.current === null && orderDetails && !chat.isLoading) settledAt.current = Date.now();
  }, [orderDetails, chat.isLoading]);
  const isLiveChange = () => settledAt.current !== null && Date.now() - settledAt.current > 2500;

  // Both answers are in (the list approved, a way to pay chosen): on to
  // assigning a rider. One watcher on the pair, because the list and the
  // payment question reach the customer together and they may answer either
  // first; the screen moves when the second one lands.
  const isReadyToAssign = items.isCustomerConfirmed && payment.isPaymentConfirmed;
  const wasReadyToAssign = useRef(isReadyToAssign);
  useEffect(() => {
    if (isReadyToAssign && !wasReadyToAssign.current && !isReadOnly && isLiveChange()) {
      jumpToStage(3, copy.advance.readyToAssign(customerFirstName, payment.confirmedPaymentMode));
    }
    wasReadyToAssign.current = isReadyToAssign;
    // Only the transition matters; jumpToStage and the name are stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReadyToAssign]);

  const focusComposer = useCallback(() => {
    setMobilePane("chat");
    window.setTimeout(() => composerRef.current?.focus(), 60);
  }, []);

  const handleNowAction = useCallback(
    (action: NowAction) => {
      switch (action.action) {
        case "nudge":
          focusComposer();
          break;
        case "sendRider":
          if (model.canSendRider) dispatchRider.sendRider();
          else if (model.firstUnfinishedId) jumpToStage(model.firstUnfinishedId);
          break;
        case "openStage":
          if (action.stage) jumpToStage(action.stage);
          break;
      }
    },
    [jumpToStage, focusComposer, model, dispatchRider]
  );

  const [closeError, setCloseError] = useState<string | null>(null);

  const handleCloseWithoutOrder = useCallback(async () => {
    setCloseError(null);
    try {
      await apiClient.patch(`/errands/${orderId}/status`, { status: "PASSING BY" });
      onRefreshOrders?.();
      onClose();
    } catch (e) {
      // onClose() used to run whether or not the PATCH succeeded, so a failed
      // write returned the dispatcher to the queue believing this errand had
      // been closed as a passing-by visit when the server still had it open.
      console.error("Failed to close errand as passing by:", e);
      setCloseError(
        "This run could not be closed as a passing-by visit. It is still open, so nothing has been lost, and it is safe to try again."
      );
    }
  }, [orderId, onRefreshOrders, onClose]);

  const riderName = useMemo(() => {
    const r = orderDetails?.rider;
    return (
      r?.name ||
      orderDetails?.riderName ||
      (r?.firstName ? `${r.firstName} ${r.lastName || ""}`.trim() : null)
    );
  }, [orderDetails]);

  if (panelError) {
    return (
      <UnauthorizedErrandScreen
        errandId={orderId}
        variant={panelError.variant}
        claimantName={panelError.claimantName}
        reason={panelError.reason}
        onReturnToQueue={onClose}
        // Deliberately not passing onViewMyErrands. It was wired to `onClose`,
        // the same handler as onReturnToQueue, so the screen showed two
        // differently-styled buttons labelled "Return to Queue" and "My Active
        // Errands" that did the identical thing. One button that tells the
        // truth beats two that do not; wire this to a real tab change if the
        // second destination is wanted.
      />
    );
  }

  const deliveryProblem = deliveryProblemOf(orderDetails);
  const paymentPrompted = Boolean(
    payment.isPaymentConfirmed || payment.askedAt || orderDetails?.paymentEnabledAt
  );

  /**
   * The list is in the customer's chat: ask how they will pay in the same
   * moment, unless they have already been asked. A re-sent list after an edit
   * does not repeat the question; the first one is still in the chat.
   */
  // A plain function, not a hook: this sits below the panelError early return.
  const askPaymentWithList = async () => {
    if (paymentPrompted) return;
    await payment.askCustomer();
  };

  const renderStage = (id: StageId): React.ReactNode => {
    switch (id) {
      case 1:
        return (
          <Stage2PinStores
            pins={pins}
            merchantCategories={merchantCategories}
            customerFirstName={customerFirstName}
            orderDetails={orderDetails}
            rateConfig={rateConfig}
            onContinue={() => jumpToStage(2)}
            deliveryProblem={deliveryProblem}
            onAskInChat={focusComposer}
            onDecline={onDecline ? () => setShowDecline(true) : undefined}
            onViewLocation={() => setShowLocationModal(true)}
            readOnly={isReadOnly}
            prefillSearch={prefillStoreSearch}
            onClearPrefill={() => setPrefillStoreSearch(null)}
          />
        );
      case 2:
        // Items and payment, one stage: the send that puts the list in front
        // of the customer also asks how they will pay.
        return (
          <div className="space-y-4">
            <Stage3ConfirmItems
              orderId={orderId}
              orderDetails={orderDetails}
              items={items}
              pinpoints={pins.pinpoints}
              merchantCategories={merchantCategories}
              customerFirstName={customerFirstName}
              onNudge={focusComposer}
              onNeedStores={(reason, prefill, pinStore) => {
                // A predicted store is pinned on the way there, so step 1 opens
                // with it on the map and its fee already being worked out.
                if (pinStore) pins.addPredictedStores([pinStore]);
                jumpToStage(1, reason, prefill);
              }}
              onListSent={askPaymentWithList}
              readOnly={isReadOnly}
            />
            <section aria-label={copy.stage4.heading} className="space-y-2 border-t border-hairline pt-3">
              <h4 className="m-0 text-micro font-medium uppercase text-ink-muted">{copy.stage4.heading}</h4>
              <Stage4Payment
                payment={payment}
                payments={payments}
                actualBasket={orderDetails?.estimatedCost ?? null}
                agreedBasket={orderDetails?.quotedHandlingBasket ?? null}
                customerFirstName={customerFirstName}
                hasSentList={items.hasSentConfirmationCard}
                isPrompted={paymentPrompted}
                isListApproved={items.isCustomerConfirmed}
                onNudge={focusComposer}
                onOpenProof={() => setShowProofModal(true)}
                readOnly={isReadOnly}
              />
            </section>
          </div>
        );
      case 3:
        return (
          <Stage5SendRider
            canSend={model.canSendRider}
            isAssigning={dispatchRider.isAssigning}
            riderName={riderName}
            customerFirstName={customerFirstName}
            hasPins={pins.pinpoints.length > 0}
            isCustomerConfirmed={items.isCustomerConfirmed}
            isPaymentConfirmed={payment.isPaymentConfirmed}
            isUpfrontConfirmed={payments.isUpfrontConfirmed}
            onSend={dispatchRider.sendRider}
            onBlocked={() => {
              if (model.firstUnfinishedId) jumpToStage(model.firstUnfinishedId);
            }}
            readOnly={isReadOnly}
          />
        );
    }
  };

  const activeStageId = openStageId ?? model.activeStageId ?? 1;
  const activeStage = model.stages.find((s) => s.id === activeStageId) || model.stages[0];
  const isWaitingOnActive = activeStage?.turn === "customer";

  return (
    <div
      data-surface="dispatch"
      className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-board-ground"
    >
      {/* ── header ───────────────────────────────────────────────────────── */}
      <header
        data-on-field
        className="flex shrink-0 items-center gap-2.5 bg-board-field-deep px-3 py-2.5 shadow-field sm:px-4"
      >
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-trim px-2.5 text-micro uppercase text-board-trim transition-colors hover:bg-board-plate/10 hover:text-board-plate"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">{copy.backToQueue}</span>
        </button>

        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
          <span className="truncate text-label text-board-plate">{customerName}</span>
          {/* The route number was blue-200, the only blue on the surface and a
              direct breach of the locked palette. It is a figure, so it now
              reads as one. */}
          <span data-figure className="hidden font-mono text-micro text-board-trim sm:inline">
            {formatErrandId(orderId)}
          </span>
          {orderDetails?.status ? (
            <StatusChip status={orderDetails.status} className="shrink-0" />
          ) : (
            <span className="text-micro uppercase text-board-trim">Loading</span>
          )}
        </div>

        {!isReadOnly && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              aria-label={copy.moreActions}
              aria-expanded={showMenu}
              className="grid size-9 cursor-pointer place-items-center rounded-trim text-board-trim transition-colors hover:bg-board-plate/10 hover:text-board-plate"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-plate border border-edge bg-board-plate shadow-plate">
                  {/* Declining used to live in the "Check the order" step.
                      Opening an order now accepts it, so this is where the
                      honest exit is: beside the other rare, final action. */}
                  {onDecline && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setShowDecline(true);
                      }}
                      className="flex min-h-10 w-full cursor-pointer items-center gap-2 px-3 text-left text-label text-status-act-ink transition-colors hover:bg-status-act-fill"
                    >
                      <Ban size={14} />
                      {copy.declineOrder}
                    </button>
                  )}
                  {/* Destructive and rare — deliberately not beside "Back to
                      queue", which it was previously confusable with. */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowPassByConfirm(true);
                    }}
                    className="flex min-h-10 w-full cursor-pointer items-center gap-2 px-3 text-left text-label text-status-act-ink transition-colors hover:bg-status-act-fill"
                  >
                    <Slash size={14} />
                    {copy.closeWithoutOrder}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* ── the one sentence that says whose turn it is ───────────────────── */}
      <NowBar
        model={model.now}
        onAction={handleNowAction}
        isPinStage={model.activeStageId === 1}
      />

      {/* ── surface switcher, below 1024px only ───────────────────────────── */}
      <div className="flex shrink-0 gap-1.5 border-b border-hairline bg-board-plate px-3 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobilePane("chat")}
          aria-pressed={mobilePane === "chat"}
          className={cn(
            "flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-trim text-micro uppercase transition-colors",
            mobilePane === "chat"
              ? "bg-board-field text-board-plate"
              : "bg-board-ground text-ink-muted hover:text-ink"
          )}
        >
          <MessageSquare size={14} />
          {copy.chatTab}
          {unreadCount > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 text-micro tabular-nums",
                mobilePane === "chat"
                  ? "bg-board-plate/20 text-board-plate"
                  : "bg-signal text-white"
              )}
            >
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setMobilePane("steps")}
          aria-pressed={mobilePane === "steps"}
          className={cn(
            "flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-trim text-micro uppercase transition-colors",
            mobilePane === "steps"
              ? "bg-board-field text-board-plate"
              : "bg-board-ground text-ink-muted hover:text-ink"
          )}
        >
          <ListChecks size={14} />
          {copy.stepsTab}
          <span data-figure className="tabular-nums opacity-75">
            {model.doneCount}/{model.stages.length}
          </span>
        </button>
        {payments.ledger?.hasLedger && (
          <button
            type="button"
            onClick={() => setShowProofModal(true)}
            aria-label={copy.paymentTab}
            className="flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-trim text-micro uppercase transition-colors bg-board-ground text-ink-muted hover:text-ink"
          >
            <Wallet size={14} />
            {copy.paymentTab}
          </button>
        )}
      </div>

      {/* ── workspace ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex">
        {/* ── Left: Steps 1-6 Rail (hidden on mobile, visible lg:flex, w-64 to w-72) ── */}
        <aside className="hidden min-h-0 w-64 xl:w-72 shrink-0 flex-col border-r border-edge bg-board-plate lg:flex">
          <StageStepsRail
            stages={model.stages}
            activeId={activeStageId}
            onSelect={toggleStage}
            flashId={flashId}
            readOnly={isReadOnly}
            hasLedger={Boolean(payments.ledger?.hasLedger)}
            onOpenProof={() => setShowProofModal(true)}
            arrowDirection="right"
          />
        </aside>

        {/* ── Center: The Task (Active Stage Screen, flex-1) ──────────────── */}
        <section
          className={cn(
            "min-h-0 flex-1 overflow-y-auto bg-board-ground lg:block",
            mobilePane === "steps" ? "block w-full" : "hidden"
          )}
        >
          <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
            {/* Opening accepts the order. If that write failed, the customer
                has not been introduced to anyone: say so, and retry in place. */}
            {acceptError && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-2 rounded-plate bg-status-act-fill px-3 py-2.5"
              >
                <p className="m-0 flex min-w-0 flex-1 items-start gap-2 text-label text-status-act-ink">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  {acceptError}
                </p>
                <DispatcherButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={isAccepting}
                  loadingText="Accepting"
                  onClick={() => void acceptOrder()}
                >
                  {copy.acceptRetry}
                </DispatcherButton>
              </div>
            )}

            {/* On mobile (< 1024px), show a compact horizontal stepper rail at the top */}
            <div className="lg:hidden">
              <ol className="flex items-stretch overflow-hidden rounded-plate border border-edge bg-board-plate shadow-plate">
                {model.stages.map((stage) => {
                  const isOpen = activeStageId === stage.id;
                  const isLocked = !isReadOnly && stage.state === "todo";
                  return (
                    <li key={stage.id} className="flex min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (isLocked) return;
                          toggleStage(stage.id);
                        }}
                        disabled={isLocked}
                        className={cn(
                          "flex min-w-0 flex-1 flex-col items-center gap-1 border-l border-hairline px-1 py-2 transition-colors first:border-l-0",
                          isLocked
                            ? "cursor-not-allowed opacity-40 bg-board-ground/50"
                            : "cursor-pointer hover:bg-board-ground",
                          isOpen ? "bg-board-field hover:bg-board-field" : ""
                        )}
                      >
                        <Detent stage={stage} onField={isOpen} />
                        <span
                          className={cn(
                            "hidden text-micro uppercase sm:block",
                            isOpen ? "text-board-plate" : "text-ink-muted"
                          )}
                        >
                          {stage.id}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* The Task: Active Stage Card */}
            {activeStage && (
              <div
                id={`stage-body-${activeStage.id}`}
                className={cn(
                  "overflow-hidden rounded-plate border bg-board-plate shadow-plate",
                  flashId === activeStage.id ? "border-signal ring-1 ring-signal" : "border-edge"
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-hairline px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-micro font-bold uppercase tracking-wider text-ink-muted">
                      Step {activeStage.id} of {model.stages.length}
                    </span>
                    <span className="text-hairline">·</span>
                    <h3 className="min-w-0 truncate text-panel text-ink">{activeStage.label}</h3>
                  </div>
                  <span
                    className={cn(
                      "flex min-w-0 items-center gap-1 truncate text-body",
                      activeStage.state === "done"
                        ? "text-status-done-ink"
                        : isWaitingOnActive
                          ? "text-status-waiting-ink"
                          : "text-ink-muted"
                    )}
                  >
                    {isWaitingOnActive && <Hourglass size={12} className="shrink-0" />}
                    {activeStage.statusLine}
                  </span>
                </div>

                <div className="p-3 sm:p-4">
                  {jumpReason?.stage === activeStage.id && (
                    <p
                      role="alert"
                      className="mb-3 mt-0 rounded-trim bg-status-act-fill px-3 py-2 text-label text-status-act-ink"
                    >
                      {jumpReason.text}
                    </p>
                  )}
                  {renderStage(activeStage.id)}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Right: Customer Chat (30% desktop) ──────────────────────────── */}
        <section
          className={cn(
            "min-h-0 flex-col bg-board-plate lg:flex lg:w-[30%] lg:border-l lg:border-edge",
            mobilePane === "chat" ? "flex w-full" : "hidden"
          )}
        >
          <ConversationPane
            messages={chat.messages}
            isLoading={chat.isLoading}
            customerName={customerName}
            customerFirstName={customerFirstName}
            customerOnline={chat.customerOnline}
            dispatcherFirstName={dispatcherFirstName}
            isCustomerTyping={chat.isCustomerTyping}
            customerTypingName={chat.customerTypingName}
            inputText={chat.inputText}
            onInputChange={chat.onInputChange}
            onSend={chat.sendMessage}
            onStopTyping={chat.stopTyping}
            onPrefill={chat.prefill}
            onViewLocation={() => setShowLocationModal(true)}
            messagesEndRef={chat.messagesEndRef}
            readOnly={isReadOnly}
            composerRef={composerRef}
          />
        </section>
      </div>

      {/* ── payment proof modal ────────────────────────────────────────── */}
      {payments.ledger?.hasLedger && (
        <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
          <DialogContent
            data-surface="dispatch"
            className="max-h-[90vh] max-w-xl overflow-y-auto rounded-modal border-edge p-0 shadow-plate"
          >
            <DialogHeader className="flex flex-row items-center justify-between border-b border-hairline px-4 py-3">
              <DialogTitle className="flex items-center gap-2 text-panel text-ink">
                <Receipt size={16} /> Downpayment Proof & Attestation
              </DialogTitle>
              <DialogClose className="grid size-8 place-items-center rounded-trim text-ink-muted hover:bg-board-ground hover:text-ink">
                <X size={16} />
              </DialogClose>
            </DialogHeader>
            <div className="p-4">
              <PaymentProofPanel
                errandId={orderId}
                payments={payments}
                readOnly={isReadOnly}
                customerFirstName={customerFirstName}
                riderName={riderName}
                messages={chat.messages}
                pushMessage={chat.pushMessage}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── decline ───────────────────────────────────────────────────────── */}
      {onDecline && (
        <DeclineOrderDialog
          open={showDecline}
          onOpenChange={setShowDecline}
          customerFirstName={customerFirstName}
          suggestedReason={
            deliveryProblem === "outside"
              ? copy.declineReasons[2]
              : deliveryProblem === "no-gps"
                ? copy.declineReasons[3]
                : null
          }
          onDecline={(reason) => onDecline(orderId, reason)}
        />
      )}

      {/* ── close without an order ────────────────────────────────────────── */}
      <Dialog open={showPassByConfirm} onOpenChange={setShowPassByConfirm}>
        <DialogContent data-surface="dispatch" className="rounded-modal border-edge shadow-plate">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Slash className="text-status-waiting-ink" size={18} /> {copy.passBy.title}
            </DialogTitle>
            <DialogClose
              aria-label="Close this dialog"
              className="grid size-9 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:bg-board-ground hover:text-ink"
            >
              <X size={18} />
            </DialogClose>
          </DialogHeader>
          <DialogDescription>{copy.passBy.body}</DialogDescription>
          {closeError ? (
            <p role="alert" className="rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink">
              {closeError}
            </p>
          ) : null}
          <DialogFooter className="flex-row gap-3">
            <DispatcherButton
              type="button"
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => {
                setCloseError(null);
                setShowPassByConfirm(false);
              }}
            >
              {copy.passBy.cancel}
            </DispatcherButton>
            <button
              type="button"
              // The dialog stays open until the write succeeds. It used to
              // dismiss itself first and fire the request afterwards, so there
              // was nowhere left to report a failure and the screen closed
              // regardless.
              onClick={() => {
                void handleCloseWithoutOrder();
              }}
              className="flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-plate bg-signal px-4 text-label text-white transition-colors hover:bg-signal-deep"
            >
              <Slash size={16} /> {copy.passBy.confirm}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerLocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        customerName={customerName}
        customerPhone={customerPhone}
        deliveryAddress={orderDetails?.deliveryAddress}
        deliveryLatitude={orderDetails?.deliveryLatitude}
        deliveryLongitude={orderDetails?.deliveryLongitude}
        onFocusInTools={
          pins.mapUnavailable
            ? undefined
            : () => {
                setShowLocationModal(false);
                jumpToStage(1);
              }
        }
      />
    </div>
  );
};
