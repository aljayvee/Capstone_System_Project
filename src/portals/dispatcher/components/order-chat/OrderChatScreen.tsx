import * as React from "react";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, MoreHorizontal, MessageSquare, ListChecks, Slash, X } from "lucide-react";
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
import { DispatcherBadge } from "../ui/DispatcherBadge";

import { NowBar } from "./NowBar";
import { StageList, readStoredShowAll, storeShowAll } from "./StageList";
import { ConversationPane } from "./conversation/ConversationPane";
import { Stage1CheckOrder } from "./stages/Stage1CheckOrder";
import { Stage2PinStores } from "./stages/Stage2PinStores";
import { Stage3ConfirmItems } from "./stages/Stage3ConfirmItems";
import { Stage4Payment } from "./stages/Stage4Payment";
import { Stage5SendRider } from "./stages/Stage5SendRider";

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

  const [mobilePane, setMobilePane] = useState<"chat" | "steps">("steps");
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
    if (!userTouchedStage.current) setOpenStageId(model.activeStageId);
  }, [model.activeStageId]);

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

  const handleCloseWithoutOrder = useCallback(async () => {
    try {
      await apiClient.patch(`/errands/${orderId}/status`, { status: "PASSING BY" });
      onRefreshOrders?.();
    } catch (e) {
      console.error("Failed to close errand as passing by:", e);
    }
    onClose();
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
        onViewMyErrands={onClose}
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
            onAccept={async () => {
              await onVerify?.(orderId);
              refresh();
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
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* ── header ───────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-dispatcher-navy-dark text-white px-3 sm:px-4 py-2.5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">{copy.backToQueue}</span>
        </button>

        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-[13px] tracking-tight truncate">{customerName}</span>
          <span className="hidden sm:inline font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-blue-200">
            #{formatErrandId(orderId)}
          </span>
          <span
            className={cn(
              "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
              isReadOnly
                ? "bg-slate-500/20 border-slate-400/30 text-slate-200"
                : "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
            )}
          >
            {orderDetails?.status || "Loading"}
          </span>
        </div>

        {!isReadOnly && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              aria-label={copy.moreActions}
              aria-expanded={showMenu}
              className="w-8 h-8 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition cursor-pointer"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 z-20 w-56 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                  {/* Destructive and rare — deliberately not beside "Back to
                      queue", which it was previously confusable with. */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowPassByConfirm(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Slash size={13} />
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
      <div className="shrink-0 lg:hidden flex gap-1.5 px-3 py-2 bg-white border-b border-slate-200">
        <button
          type="button"
          onClick={() => setMobilePane("chat")}
          aria-pressed={mobilePane === "chat"}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition cursor-pointer",
            mobilePane === "chat"
              ? "bg-dispatcher-navy text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <MessageSquare size={13} />
          {copy.chatTab}
          {unreadCount > 0 && (
            <span
              className={cn(
                "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full",
                mobilePane === "chat" ? "bg-white/25" : "bg-rose-600 text-white"
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
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition cursor-pointer",
            mobilePane === "steps"
              ? "bg-dispatcher-navy text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <ListChecks size={13} />
          {copy.stepsTab}
          <span className="text-[10px] font-bold opacity-70 tabular-nums">
            {model.doneCount}/5
          </span>
        </button>
      </div>

      {/* ── workspace ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex">
        <section
          className={cn(
            "min-h-0 flex-col bg-white lg:w-[38%] lg:border-r lg:border-slate-200 lg:flex",
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
            "min-h-0 overflow-y-auto bg-slate-50 lg:w-[62%] lg:block",
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
      </div>

      {/* ── close without an order ────────────────────────────────────────── */}
      <Dialog open={showPassByConfirm} onOpenChange={setShowPassByConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Slash className="text-amber-600" size={20} /> {copy.passBy.title}
            </DialogTitle>
            <DialogClose className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <X size={18} />
            </DialogClose>
          </DialogHeader>
          <DialogDescription>{copy.passBy.body}</DialogDescription>
          <DialogFooter className="flex-row gap-3">
            <button
              type="button"
              onClick={() => setShowPassByConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              {copy.passBy.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPassByConfirm(false);
                handleCloseWithoutOrder();
              }}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
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
