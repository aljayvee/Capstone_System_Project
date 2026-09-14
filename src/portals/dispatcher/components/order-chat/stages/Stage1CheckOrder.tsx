import * as React from "react";
import { useMemo, useState } from "react";
import { Minus, Plus, Trash2, Send, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { apiClient } from "../../../../../services/apiClient";
import { postItemRevision, type RevisedItem } from "../../../../../services/chatSystemMessages";
import { DispatcherButton } from "../../ui/DispatcherButton";
import { WaitingCard } from "../WaitingCard";
import { copy } from "../copy";
import type { OrderChatMessage, MerchantCategory } from "../types";

/**
 * Stage 1 — check the order.
 *
 * This was previously a separate "review card" that appeared INSTEAD of the
 * steps, with the whole step tracker hidden while it showed. A dispatcher had
 * no progress indicator during the one phase where they most needed one, and
 * pressing Accept flipped the screen into something they had never seen. It is
 * now stage one of five, with a number and a tick like every other stage.
 */

interface Stage1Props {
  orderId: string;
  orderDetails: any;
  dispatcherName: string;
  customerFirstName: string;
  merchantCategories: MerchantCategory[];
  messages: OrderChatMessage[];
  onAccept: () => Promise<void>;
  onRelease: () => Promise<void>;
  onDecline: (reason: string) => Promise<void>;
  onItemsSaved: () => void;
  onViewLocation: () => void;
  readOnly?: boolean;
}

export function Stage1CheckOrder({
  orderId,
  orderDetails,
  dispatcherName,
  customerFirstName,
  merchantCategories,
  messages,
  onAccept,
  onRelease,
  onDecline,
  onItemsSaved,
  onViewLocation,
  readOnly = false,
}: Stage1Props) {
  const [draft, setDraft] = useState<RevisedItem[] | null>(null);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decliningReason, setDecliningReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState("");
  const [showDecline, setShowDecline] = useState(false);

  const originalItems = useMemo(() => {
    const raw =
      (orderDetails?.pabiliDetails?.length
        ? orderDetails.pabiliDetails
        : orderDetails?.pabiliItemRequests) || [];
    return raw.map((i: any) => ({
      itemName: i.itemName || "",
      storeCategory: i.storeCategory || undefined,
      quantity: i.quantity || 1,
    }));
  }, [orderDetails]);

  const categoryOptions = useMemo(() => {
    const active = merchantCategories.filter((c) => !c.status || c.status === "Active");
    return active.length
      ? active.map((c) => c.name)
      : [
          "Fast Food & Restaurant",
          "Pharmacy & Health",
          "Supermarket & Grocery",
          "Retail & General Merchandise",
        ];
  }, [merchantCategories]);

  const items: RevisedItem[] =
    draft ??
    originalItems.map((i: any) => ({
      ...i,
      available: true,
      previousQuantity: i.quantity,
      storeCategory: i.storeCategory || categoryOptions[0],
    }));

  const latestRevision = useMemo(() => {
    const revisions = messages.filter((m: any) => m?.systemKind === "item_revision");
    return revisions.length ? (revisions[revisions.length - 1] as any) : null;
  }, [messages]);

  const awaitingCustomer = latestRevision?.status === "pending";
  const wasRejected = latestRevision?.status === "rejected";

  const hasUnsentEdits = useMemo(() => {
    if (draft === null) return false;
    if (draft.length !== originalItems.length) return true;
    return draft.some((item, idx) => {
      const orig = originalItems[idx];
      if (!orig) return true;
      return (
        item.itemName.trim() !== (orig.itemName || "").trim() ||
        (item.storeCategory || "").trim() !== (orig.storeCategory || "").trim() ||
        item.quantity !== orig.quantity ||
        !item.available ||
        Boolean(item.note)
      );
    });
  }, [draft, originalItems]);

  const acceptBlockedReason = awaitingCustomer
    ? copy.stage1.blockedAwaiting(customerFirstName)
    : hasUnsentEdits
    ? copy.stage1.blockedUnsent(customerFirstName)
    : null;

  const updateItem = (index: number, patch: Partial<RevisedItem>) =>
    setDraft(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const removeItem = (index: number) => setDraft(items.filter((_, i) => i !== index));

  const sendRevision = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const surviving = items
        .filter((i) => i.available && i.quantity > 0 && i.itemName.trim().length > 0)
        .map((i) => ({
          itemName: i.itemName.trim(),
          storeCategory: i.storeCategory,
          quantity: i.quantity,
        }));

      await apiClient.patch(`/errands/${orderId}/items`, { items: surviving });
      await postItemRevision(orderId, {
        revisionId: `${orderId}-${Date.now()}`,
        items,
        dispatcherName,
        note: note.trim() || undefined,
      });

      setDraft(null);
      setNote("");
      onItemsSaved();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Could not send the changes. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const run = async (action: () => Promise<void>) => {
    setIsActing(true);
    setError(null);
    try {
      await action();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "That did not work. Try again.");
    } finally {
      setIsActing(false);
    }
  };

  if (readOnly) {
    return (
      <div className="space-y-2">
        {originalItems.length === 0 ? (
          <p className="text-[11px] text-slate-400 m-0">No items were listed on this order.</p>
        ) : (
          originalItems.map((it: any, i: number) => (
            <div key={i} className="flex items-center gap-2.5 text-[11px] text-slate-700">
              <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                {it.quantity}&times;
              </span>
              <span className="flex-1 min-w-0 truncate font-semibold">{it.itemName}</span>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Give before you ask: say what accepting commits them to, above the
          button, not after it. Never labelled as reassurance. */}
      <p className="text-[11px] leading-relaxed text-blue-900 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 m-0">
        {copy.stage1.reassurance}
      </p>

      {/* Settled context, not an open question. */}
      <div className="flex items-start gap-2 text-[11px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
        <MapPin size={13} className="text-emerald-600 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-slate-500 font-bold uppercase tracking-wide text-[10px] m-0">
            {copy.stage1.deliverTo}
          </p>
          <p className="text-slate-800 font-semibold m-0 mt-0.5 break-words">
            {orderDetails?.deliveryAddress || "Tacurong City"}
          </p>
          {orderDetails?.description ? (
            <p className="text-slate-500 mt-1 mb-0 italic break-words">
              &ldquo;{orderDetails.description}&rdquo;
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onViewLocation}
          className="shrink-0 text-[11px] font-bold text-slate-500 hover:text-emerald-700 underline underline-offset-2 cursor-pointer"
        >
          Map
        </button>
      </div>

      {/* the basket */}
      {items.length === 0 ? (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 m-0">
          {copy.stage1.noItems}
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${
                item.available ? "bg-white border-slate-200" : "bg-rose-50 border-rose-200"
              }`}
            >
              <select
                value={item.storeCategory || categoryOptions[0]}
                onChange={(e) => updateItem(index, { storeCategory: e.target.value })}
                aria-label="Store type"
                className="shrink-0 text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 max-w-[92px] text-slate-600 cursor-pointer"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                value={item.itemName}
                onChange={(e) => updateItem(index, { itemName: e.target.value })}
                aria-label="Item name"
                className="flex-1 min-w-0 text-[11px] font-semibold bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-800"
              />

              <div className="shrink-0 flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg">
                <button
                  type="button"
                  aria-label="One fewer"
                  onClick={() => updateItem(index, { quantity: Math.max(0, item.quantity - 1) })}
                  className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <Minus size={11} />
                </button>
                <span className="text-[11px] font-mono font-bold w-5 text-center tabular-nums">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  aria-label="One more"
                  onClick={() => updateItem(index, { quantity: item.quantity + 1 })}
                  className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <Plus size={11} />
                </button>
              </div>

              <button
                type="button"
                aria-label={`Remove ${item.itemName || "item"}`}
                onClick={() => removeItem(index)}
                className="shrink-0 p-1 text-slate-300 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* unsent edits must go to the customer before accept unlocks */}
      {hasUnsentEdits && (
        <div className="space-y-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={copy.stage1.changeNotePlaceholder}
            aria-label={copy.stage1.changeNotePlaceholder}
            className="w-full text-[11px] bg-white border border-amber-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30"
          />
          <DispatcherButton
            size="sm"
            variant="primary"
            loading={isSaving}
            loadingText="Sending…"
            icon={<Send size={13} />}
            onClick={sendRevision}
            className="w-full justify-center"
          >
            {copy.stage1.sendChanges(customerFirstName)}
          </DispatcherButton>
        </div>
      )}

      {awaitingCustomer && (
        <WaitingCard
          title={`Waiting for ${customerFirstName}`}
          detail="You sent changes to their order. Accept unlocks once they answer."
        />
      )}

      {wasRejected && (
        <p className="flex items-start gap-2 text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 m-0">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          {copy.stage1.wasRejected(customerFirstName)}
        </p>
      )}

      {error && (
        <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 m-0">
          {error}
        </p>
      )}

      {/* the decision */}
      {!showDecline ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <DispatcherButton
            variant="success"
            size="md"
            loading={isActing}
            disabled={Boolean(acceptBlockedReason)}
            onClick={() => run(onAccept)}
            title={acceptBlockedReason || undefined}
          >
            {copy.stage1.accept}
          </DispatcherButton>
          <DispatcherButton variant="secondary" size="md" onClick={() => run(onRelease)}>
            {copy.stage1.release}
          </DispatcherButton>
          <DispatcherButton
            variant="danger-ghost"
            size="md"
            onClick={() => setShowDecline(true)}
          >
            {copy.stage1.decline}
          </DispatcherButton>
        </div>
      ) : (
        <div className="space-y-2 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <p className="text-[11px] font-extrabold text-rose-900 m-0">{copy.stage1.declineTitle}</p>
          <div className="space-y-1">
            {copy.declineReasons.map((reason) => (
              <label
                key={reason}
                className="flex items-center gap-2 text-[11px] text-rose-900 cursor-pointer"
              >
                <input
                  type="radio"
                  name="decline-reason"
                  checked={decliningReason === reason}
                  onChange={() => setDecliningReason(reason)}
                />
                {reason}
              </label>
            ))}
          </div>
          {decliningReason === copy.declineReasons[copy.declineReasons.length - 1] && (
            <input
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder="What happened?"
              aria-label="Other reason"
              className="w-full text-[11px] bg-white border border-rose-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
            />
          )}
          <div className="flex gap-2">
            <DispatcherButton
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowDecline(false);
                setDecliningReason(null);
              }}
            >
              {copy.stage1.cancel}
            </DispatcherButton>
            <button
              type="button"
              disabled={!decliningReason || isActing}
              onClick={() =>
                run(() =>
                  onDecline(
                    decliningReason === copy.declineReasons[copy.declineReasons.length - 1] &&
                      otherReason.trim()
                      ? otherReason.trim()
                      : decliningReason!
                  )
                )
              }
              className="flex-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:text-slate-600 text-white transition active:scale-95 cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
            >
              {isActing && <Loader2 size={13} className="animate-spin" />}
              {copy.stage1.declineConfirm}
            </button>
          </div>
        </div>
      )}

      {acceptBlockedReason && !showDecline && (
        <p className="text-[11px] text-slate-500 font-medium m-0">{acceptBlockedReason}</p>
      )}
    </div>
  );
}
