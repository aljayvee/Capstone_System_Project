import { useMemo, useState } from "react";
import { Minus, Plus, Trash2, Send, MapPin, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "../../../../../services/apiClient";
import { postItemRevision, type RevisedItem } from "../../../../../services/chatSystemMessages";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherCard } from "@/components/panel/DispatcherCard";
import { WaitingCard } from "../WaitingCard";
import { copy } from "../copy";
import type { OrderChatMessage, MerchantCategory } from "../types";

/**
 * Stage 1 - check the order.
 *
 * This was previously a separate "review card" that appeared INSTEAD of the
 * steps, with the whole step tracker hidden while it showed. A dispatcher had
 * no progress indicator during the one phase where they most needed one, and
 * pressing Accept flipped the screen into something they had never seen. It is
 * now stage one of five, with a number and a tick like every other stage.
 *
 * Route board build, four things beyond the token sweep.
 *
 * The note above the button was `text-blue-900 bg-blue-50 border-blue-200` -
 * blue is not in this palette at all, and it was the loudest element in the
 * stage while saying the least. It is context, so it sits on the ground as a
 * region rather than announcing itself as a status.
 *
 * The order description rendered `italic`. No italic face is imported
 * anywhere in this app, so that was a synthetic slant of Geist: the browser
 * shearing upright letterforms sideways. The quotation marks already did the
 * job the italic was reaching for.
 *
 * The item row had the same 19px steppers and 22px selects as stage 3, and
 * the same edgeless `border-0 focus:outline-none focus:ring-0` name field.
 * Fixed the same way, for the same reason.
 *
 * `variant="success"` on Accept made the entry into a job the same green this
 * console uses for "finished well". Accepting is the act, so it takes the
 * signal, and the refusal beside it stays a ghost.
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
      <div>
        {originalItems.length === 0 ? (
          <p className="m-0 text-body text-ink-muted">No items were listed on this order.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-hairline p-0">
            {originalItems.map((it: any, i: number) => (
              <li key={i} className="flex items-center gap-2.5 py-2">
                <span data-figure className="shrink-0 font-mono text-label text-ink-muted">
                  {it.quantity}&times;
                </span>
                <span className="min-w-0 flex-1 truncate text-body text-ink">{it.itemName}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Give before you ask: say what accepting commits them to, above the
          button, not after it. Never labelled as reassurance. */}
      <p className="m-0 rounded-plate bg-board-ground px-3 py-2.5 text-body text-ink">
        {copy.stage1.reassurance}
      </p>

      {/* Settled context, not an open question. */}
      <DispatcherCard.Region padding="sm">
        <DispatcherCard.Label as="h4">{copy.stage1.deliverTo}</DispatcherCard.Label>
        <div className="flex items-start gap-2">
          <MapPin size={15} className="mt-0.5 shrink-0 text-ink-muted" />
          <div className="min-w-0 flex-1">
            <p className="m-0 break-words text-body text-ink">
              {orderDetails?.deliveryAddress || "Tacurong City"}
            </p>
            {orderDetails?.description ? (
              <p className="mb-0 mt-1 break-words text-body text-ink-muted">
                &ldquo;{orderDetails.description}&rdquo;
              </p>
            ) : null}
          </div>
          <DispatcherButton
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0"
            onClick={onViewLocation}
          >
            Map
          </DispatcherButton>
        </div>
      </DispatcherCard.Region>

      {/* the basket */}
      {items.length === 0 ? (
        <p className="m-0 rounded-plate bg-status-waiting-fill px-3 py-2.5 text-label text-status-waiting-ink">
          {copy.stage1.noItems}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                "rounded-trim border p-2",
                item.available
                  ? "border-edge bg-board-plate"
                  : "border-status-act-ink/40 bg-status-act-fill"
              )}
            >
              <div className="flex items-center gap-2">
                <input
                  value={item.itemName}
                  onChange={(e) => updateItem(index, { itemName: e.target.value })}
                  aria-label="Item name"
                  className="min-h-9 min-w-0 flex-1 rounded-trim border border-edge bg-board-ground px-2 text-body text-ink transition-colors focus:border-board-field focus:bg-board-plate"
                />

                <div className="flex shrink-0 items-center rounded-trim border border-edge bg-board-plate">
                  <button
                    type="button"
                    aria-label="One fewer"
                    onClick={() => updateItem(index, { quantity: Math.max(0, item.quantity - 1) })}
                    className="grid size-9 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:text-ink"
                  >
                    <Minus size={14} />
                  </button>
                  <span
                    data-figure
                    className="w-6 text-center font-mono text-label tabular-nums text-ink"
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="One more"
                    onClick={() => updateItem(index, { quantity: item.quantity + 1 })}
                    className="grid size-9 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:text-ink"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  aria-label={`Remove ${item.itemName || "item"}`}
                  onClick={() => removeItem(index)}
                  className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:bg-status-act-fill hover:text-status-act-ink"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-2">
                <select
                  value={item.storeCategory || categoryOptions[0]}
                  onChange={(e) => updateItem(index, { storeCategory: e.target.value })}
                  aria-label="Store type"
                  className="min-h-9 max-w-full cursor-pointer rounded-trim border border-edge bg-board-ground px-2 text-label text-ink transition-colors"
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* unsent edits must go to the customer before accept unlocks */}
      {hasUnsentEdits && (
        <div className="space-y-2 rounded-plate bg-status-waiting-fill p-3">
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={copy.stage1.changeNotePlaceholder}
            aria-label={copy.stage1.changeNotePlaceholder}
            className="w-full resize-none rounded-trim border border-edge bg-board-plate px-2.5 py-2 text-body text-ink placeholder:text-ink-muted"
          />
          <DispatcherButton
            size="sm"
            variant="primary"
            loading={isSaving}
            loadingText="Sending"
            icon={<Send size={14} />}
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
        <p className="m-0 flex items-start gap-2 rounded-plate bg-status-act-fill px-3 py-2.5 text-label text-status-act-ink">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {copy.stage1.wasRejected(customerFirstName)}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="m-0 rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink"
        >
          {error}
        </p>
      )}

      {/* the decision */}
      {!showDecline ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <DispatcherButton
            variant="primary"
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
          <DispatcherButton variant="danger-ghost" size="md" onClick={() => setShowDecline(true)}>
            {copy.stage1.decline}
          </DispatcherButton>
        </div>
      ) : (
        <div className="space-y-2 rounded-plate bg-status-act-fill p-3">
          <p className="m-0 text-label text-status-act-ink">{copy.stage1.declineTitle}</p>
          <div className="space-y-1">
            {copy.declineReasons.map((reason) => (
              <label
                key={reason}
                className="flex min-h-9 cursor-pointer items-center gap-2 text-body text-status-act-ink"
              >
                <input
                  type="radio"
                  name="decline-reason"
                  checked={decliningReason === reason}
                  onChange={() => setDecliningReason(reason)}
                  className="size-4 shrink-0 accent-signal"
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
              className="min-h-9 w-full rounded-trim border border-edge bg-board-plate px-2.5 text-body text-ink placeholder:text-ink-muted"
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
            <DispatcherButton
              size="sm"
              variant="primary"
              className="flex-1 justify-center"
              loading={isActing}
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
            >
              {copy.stage1.declineConfirm}
            </DispatcherButton>
          </div>
        </div>
      )}

      {acceptBlockedReason && !showDecline && (
        <p className="m-0 text-body text-ink-muted">{acceptBlockedReason}</p>
      )}
    </div>
  );
}
