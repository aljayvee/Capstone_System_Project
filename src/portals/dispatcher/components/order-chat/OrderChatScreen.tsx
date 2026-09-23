import * as React from "react";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, MoreHorizontal, MessageSquare, ListChecks, Wallet, Slash, X } from "lucide-react";
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
import { StageList, readStoredShowAll, storeShowAll } from "./StageList";
import { ConversationPane } from "./conversation/ConversationPane";
import { Stage1CheckOrder } from "./stages/Stage1CheckOrder";
import { Stage2PinStores } from "./stages/Stage2PinStores";
import { Stage3ConfirmItems } from "./stages/Stage3ConfirmItems";
import { Stage4Payment } from "./stages/Stage4Payment";
import { Stage5SendRider } from "./stages/Stage5SendRider";
import { PaymentProofPanel } from "./PaymentProofPanel";

import { useOrderDetails } from "./hooks/useOrderDetails";
import { useOrderChat } from "./hooks/useOrderChat";
import { useStorePins } from "./hooks/useStorePins";
import { useOrderItems } from "./hooks/useOrderItems";
import { useOrderPayment } from "./hooks/useOrderPayment";
import { useOrderPayments } from "./hooks/useOrderPayments";
import { useRiderDispatch } from "./hooks/useRiderDispatch";
import { useStageModel } from "./hooks/useStageModel";
import { copy } from "./copy";
import type { NowAction, StageId } from "./types";

export interface OrderChatScreenProps {
  orderId: string;
  dispatcher: any;
  onClose: () => void;
  onRefreshOrders?: () => void;
  readOnly?: boolean;
  /** Dispatcher accepts the order, opening the remaining stages. */
  onVerify?: (orderId: string) => Promise<void>;
  /** Hands an opened-but-unaccepted request back to the queue. */
  onRelease?: (orderId: string) => Promise<void>;
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
  onRelease,
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
    // completes stage 2 and must survive a reload.
    messages: chat.messages,
    onOrderUpdated: setOrderDetails,
    pushMessage: chat.pushMessage,
    mapVisible: showAll || openStageId === 2,
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
    messages: chat.messages,
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
  //
  // Stage 2 is the one exception: it hands over through its own "Continue to
  // step 3" button, which only appears once the stores have been sent. Without
  // the guard below, sending would complete the stage and this effect would
  // immediately pull the panel to stage 3 — making that button unreachable and
  // reproducing the very jump it exists to stop, one step later.
  useEffect(() => {
    if (userTouchedStage.current) return;
    // Only when the send happened on this screen. An order whose stores went
    // out in an earlier session must open on the stage that is actually
    // active, not be parked on a finished one - see sentThisSession.
    if (openStageId === 2 && model.activeStageId > 2 && pins.sentThisSession) return;
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
    setOpenStageId((prev) => (prev === id ? null : id));
  }, []);

  /**
   * Sends the dispatcher to the stage that is actually blocking them, and says
   * why when there is a reason. A blocked action that only moves the view is
   * still a puzzle; the sentence is the half that makes it navigation.
   */
  const jumpToStage = useCallback((id: StageId, reason?: string) => {
    userTouchedStage.current = true;
    setShowAll(false);
    storeShowAll(false);
    setOpenStageId(id);
    setMobilePane("steps");
    setFlashId(id);
    setJumpReason(reason ? { stage: id, text: reason } : null);
    window.setTimeout(() => {
      document.getElementById(`stage-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 40);
    window.setTimeout(() => setFlashId(null), 1600);
    // The sentence outlives the highlight - it is the part worth reading.
    window.setTimeout(() => setJumpReason(null), 9000);
  }, []);

  const focusComposer = useCallback(() => {
    setMobilePane("chat");
    window.setTimeout(() => composerRef.current?.focus(), 60);
  }, []);

  const handleNowAction = useCallback(
    (action: NowAction) => {
      switch (action.action) {
        case "accept":
        case "decline":
          jumpToStage(1);
          break;
        case "changeList":
          jumpToStage(3);
          items.startEditing();
          break;
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
    [jumpToStage, focusComposer, items, model, dispatchRider]
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

  const renderStage = (id: StageId): React.ReactNode => {
    switch (id) {
      case 1:
        return (
          <Stage1CheckOrder
            orderId={orderId}
            orderDetails={orderDetails}
            dispatcherName={dispatcher?.name || dispatcherFirstName}
            customerFirstName={customerFirstName}
            merchantCategories={merchantCategories}
            messages={chat.messages}
            readOnly={isReadOnly}
            // Already accepted. Stage 1 stays re-openable like every other
            // finished stage, so Accept has to visibly stop being an action —
            // it was still live and clickable on a verified order.
            isAccepted={model.stages[0]?.state === "done"}
            onAccept={async () => {
              await onVerify?.(orderId);
              refresh();
              // Accepting IS the handover to stage 2. The auto-open effect
              // would do this only while the dispatcher has never touched a
              // stage, and someone who opened stage 1 by hand to read the
              // basket before accepting has already forfeited that.
              jumpToStage(2);
            }}
            onRelease={async () => {
              await onRelease?.(orderId);
            }}
            onDecline={async (reason) => {
              await onDecline?.(orderId, reason);
            }}
            onItemsSaved={() => {
              refresh();
              onRefreshOrders?.();
            }}
            onViewLocation={() => setShowLocationModal(true)}
          />
        );
      case 2:
        return (
          <Stage2PinStores
            pins={pins}
            merchantCategories={merchantCategories}
            customerFirstName={customerFirstName}
            orderDetails={orderDetails}
            rateConfig={rateConfig}
            onContinue={() => jumpToStage(3)}
            readOnly={isReadOnly}
          />
        );
      case 3:
        return (
          <Stage3ConfirmItems
            items={items}
            pinpoints={pins.pinpoints}
            merchantCategories={merchantCategories}
            customerFirstName={customerFirstName}
            onNudge={focusComposer}
            onNeedStores={(reason: string) => jumpToStage(2, reason)}
            readOnly={isReadOnly}
          />
        );
      case 4:
        return (
          <Stage4Payment
            payment={payment}
            payments={payments}
            actualBasket={orderDetails?.estimatedCost ?? null}
            agreedBasket={orderDetails?.quotedHandlingBasket ?? null}
            customerFirstName={customerFirstName}
            isCustomerConfirmed={items.isCustomerConfirmed}
            onNudge={focusComposer}
            onNeedConfirmation={(reason: string) => jumpToStage(3, reason)}
            readOnly={isReadOnly}
          />
        );
      case 5:
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
        isPinStage={model.activeStageId === 2}
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
            {model.doneCount}/5
          </span>
        </button>
        {payments.ledger?.hasLedger && (
          <button
            type="button"
            onClick={() => setMobilePane("payment")}
            aria-pressed={mobilePane === "payment"}
            className={cn(
              "flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-trim text-micro uppercase transition-colors",
              mobilePane === "payment"
                ? "bg-board-field text-board-plate"
                : "bg-board-ground text-ink-muted hover:text-ink"
            )}
          >
            <Wallet size={14} />
            {copy.paymentTab}
          </button>
        )}
      </div>

      {/* ── workspace ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex">
        <section
          className={cn(
            "min-h-0 flex-col bg-board-plate lg:flex lg:w-[30%] lg:border-r lg:border-edge",
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

        <section
          className={cn(
            "min-h-0 overflow-y-auto bg-board-ground lg:block",
            payments.ledger?.hasLedger ? "lg:w-[45%]" : "lg:w-[70%]",
            mobilePane === "steps" ? "block w-full" : "hidden"
          )}
        >
          <div className="p-3 sm:p-4 max-w-3xl mx-auto">
            <StageList
              stages={model.stages}
              openId={openStageId}
              onToggle={toggleStage}
              showAll={showAll}
              onShowAllChange={(next) => {
                setShowAll(next);
                storeShowAll(next);
              }}
              renderStage={renderStage}
              flashId={flashId}
              jumpReason={jumpReason}
              readOnly={isReadOnly}
            />
          </div>
        </section>

        {/* ── half-payment, standalone and persistent — not one of the five
            sequential stages, so a dispatcher can check the receipt or
            confirm the balance no matter which stage is open. Only takes up
            room on a ledger errand; COD gets its 70/30 split back. ────────── */}
        {payments.ledger?.hasLedger && (
          <section
            className={cn(
              "min-h-0 overflow-y-auto bg-board-plate lg:flex lg:w-[25%] lg:border-l lg:border-edge",
              mobilePane === "payment" ? "flex w-full" : "hidden"
            )}
          >
            <div className="w-full p-3 sm:p-4">
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
          </section>
        )}
      </div>

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
                jumpToStage(2);
              }
        }
      />
    </div>
  );
};
