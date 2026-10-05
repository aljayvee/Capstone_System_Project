import {
  Plus,
  Minus,
  Trash2,
  Send,
  Package,
  Sparkles,
  MapPinOff,
  BrainCircuit,
  Search,
  AlertTriangle,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { apiService, type ApiPredictedStore } from "../../../../../services/apiService";
import { cn } from "@/lib/utils";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherInlineBanner } from "@/components/panel/DispatcherInlineBanner";
import { WaitingCard } from "../WaitingCard";
import { copy, formatAgo } from "../copy";
import type { MerchantCategory, StorePinpoint } from "../types";
import { ItemAutocompleteInput } from "../ItemAutocompleteInput";
import { describeSuggestionSource, useCatalogAutocomplete } from "../hooks/useCatalogAutocomplete";

/*
 * A hard-coded getTacurongStoreSuggestion lived here, naming "Pan de Manila",
 * "KCC Mall" and "Tacurong Hardware" for whole categories whether or not those
 * shops were real, open, or anywhere near the customer. Store suggestions now
 * come from the server's store predictor (storePredictionService): stores
 * dispatchers used, the catalogue, and Tacurong's mapped shops, nearest first.
 */

interface Stage3Props {
  orderId: string;
  orderDetails?: any;
  items: ReturnType<typeof import("../hooks/useOrderItems").useOrderItems>;
  pinpoints: StorePinpoint[];
  merchantCategories: MerchantCategory[];
  customerFirstName: string;
  onNudge: () => void;
  /**
   * Takes the dispatcher to step 3 when there is nowhere to buy the items. With
   * a predicted store, it is pinned on arrival: one press from "store needed"
   * to a pin on the map.
   */
  onNeedStores: (reason: string, prefillStore?: string, pinStore?: ApiPredictedStore) => void;
  /**
   * Runs once the list is in the customer's chat. The screen uses it to put the
   * payment question beside the list, which is what merged the two stages.
   */
  onListSent?: () => void | Promise<void>;
  readOnly?: boolean;
}

const SELECT_CLASSES =
  "min-h-9 shrink-0 cursor-pointer rounded-trim border px-2 text-label transition-colors";

export function Stage3ConfirmItems({
  orderId,
  orderDetails,
  items,
  pinpoints,
  merchantCategories,
  customerFirstName,
  onNudge,
  onNeedStores,
  onListSent,
  readOnly = false,
}: Stage3Props) {
  const {
    savedItems,
    isEditing,
    editableItems,
    hasUnsentChanges,
    isSaving,
    feedback,
    hasSentConfirmationCard,
    isCustomerConfirmed,
    sentAt,
    startEditing,
    cancelEditing,
    addItem,
    addCatalogItem,
    updateItem,
    removeItem,
    sendToCustomer,
    parseStoreAndCat,
    storeOptions,
    unassignedCount,
    categoryGuesses,
    stopIndexFor,
    guessCategoryFor,
    applyCategoryGuess,
    recommendationsReady,
    categoryNameForPin,
    pushMessage,
    onOrderUpdated,
  } = items;

  // When the status in the Rider App is "On the Way to the Customer" (itemsPurchasedAt is set),
  // no modification of items order is allowed.
  const isOnTheWayToCustomer = Boolean(orderDetails?.itemsPurchasedAt);
  const canModifyItems = !readOnly && !isOnTheWayToCustomer;

  useEffect(() => {
    if (isOnTheWayToCustomer && isEditing) {
      cancelEditing();
    }
  }, [isOnTheWayToCustomer, isEditing, cancelEditing]);

  // Always open for editing while the list can still change. There used to be
  // a "Change the list" button between the dispatcher and every edit, on the
  // one screen whose whole job is editing the list. This re-opens it from the
  // saved list after a send or an undo; an open draft is never replaced.
  useEffect(() => {
    if (canModifyItems && !isEditing) startEditing();
  }, [canModifyItems, isEditing, startEditing]);

  const [substituteState, setSubstituteState] = useState<
    Record<
      number,
      {
        loading: boolean;
        data?: { substitutes: string[]; chatMessage: string; source: "ai" | "catalog" } | null;
        sentChat?: boolean;
      }
    >
  >({});

  const handleFetchSubstitutes = useCallback(
    async (itemId: number) => {
      if (!itemId || itemId <= 0) return;
      setSubstituteState((prev) => ({ ...prev, [itemId]: { ...prev[itemId], loading: true } }));
      const data = await apiService.suggestItemSubstitutes(orderId, itemId);
      setSubstituteState((prev) => ({
        ...prev,
        [itemId]: { loading: false, data, sentChat: prev[itemId]?.sentChat ?? false },
      }));
    },
    [orderId]
  );

  // Substitutes are fetched only when the rider reports an item OUT_OF_STOCK.
  // An unchecked line is the normal state of every item before the rider has
  // shopped, so it no longer raises a warning or a suggestion on its own.
  useEffect(() => {
    if (!canModifyItems || !savedItems.length) return;
    savedItems.forEach((it: any) => {
      const itemId = Number(it.id || 0);
      if (itemId <= 0) return;
      const status = String(it.fulfillmentStatus || "PENDING").toUpperCase();
      if (status === "OUT_OF_STOCK" && !substituteState[itemId]) {
        void handleFetchSubstitutes(itemId);
      }
    });
  }, [savedItems, canModifyItems, substituteState, handleFetchSubstitutes]);

  const handleSendSubstituteChat = (itemId: number, chatMessage: string) => {
    pushMessage({
      senderId: "dispatcher",
      senderName: "Dispatcher",
      senderRole: "dispatcher",
      text: chatMessage,
      timestamp: Date.now(),
      type: "text",
    });
    setSubstituteState((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], loading: false, sentChat: true },
    }));
    feedback.showSuccess("Substitute options sent to customer chat.");
  };

  const handleApplySubstitute = async (itemIndex: number, itemId: number, newItemName: string) => {
    if (!canModifyItems) return;
    // The list is always open, and `itemIndex` is the editable row's own
    // index, so the swap lands on the row the button sits in.
    updateItem(itemIndex, { itemName: newItemName });
    if (itemId) {
      const res = await apiService.updateItemFulfillmentStatus(orderId, itemId, "PENDING");
      if (res?.errand) onOrderUpdated(res.errand);
    }
    setSubstituteState((prev) => {
      const copyState = { ...prev };
      delete copyState[itemId];
      return copyState;
    });
  };

  const handleDeclineSubstitute = async (itemId: number) => {
    try {
      const res = await apiService.declineItemSubstitute(orderId, itemId);
      if (res?.errand) onOrderUpdated(res.errand);
      setSubstituteState((prev) => {
        const copyState = { ...prev };
        delete copyState[itemId];
        return copyState;
      });
      feedback.showSuccess("Substitute declined; rider notified to proceed.");
    } catch (err) {
      console.warn("Failed to decline substitute:", err);
      feedback.showError("Failed to notify rider of declined substitute.");
    }
  };

  /**
   * The kind of shop each named row needs, when no pinned store is that kind.
   * The row's own category, or the suggestion's when there is one.
   */
  const unservedRows = isEditing && recommendationsReady
    ? editableItems
        .map((item, index) => {
          const name = (item.itemName || "").trim();
          const category = categoryGuesses[index]?.categoryName || parseStoreAndCat(item.storeCategory).category;
          const served = pinpoints.some((pin) => categoryNameForPin(pin) === category);
          return { index, name, category, served };
        })
        .filter((r) => r.name.length >= 2 && r.category && !r.served)
    : [];
  // The names as typed: the predictor quotes them back in its reasons.
  const unservedKey = unservedRows.map((r) => r.name).sort().join("\u0001");

  // Which store to pin for them, from the server's predictor, asked once the
  // list has settled. Nothing is suggested from a hard-coded list any more.
  const [neededStores, setNeededStores] = useState<Record<string, ApiPredictedStore>>({});
  useEffect(() => {
    if (!unservedKey) return;
    let cancelled = false;
    const names = unservedKey.split("\u0001");
    void apiService.predictStores(orderId, names).then((prediction) => {
      if (cancelled || !prediction) return;
      const byItem: Record<string, ApiPredictedStore> = {};
      for (const store of prediction.stores) {
        if (store.location.status === "blocked" || store.alreadyPinned) continue;
        for (const item of store.items) byItem[item.trim().toLowerCase()] ??= store;
      }
      setNeededStores(byItem);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId, unservedKey]);

  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const {
    suggestions: catalogSuggestions,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
  } = useCatalogAutocomplete(catalogQuery);

  const minsAgo = sentAt ? Math.max(0, Math.floor((Date.now() - sentAt) / 60000)) : 0;

  /**
   * Never a dead disabled button. Pressing it while blocked takes the
   * dispatcher to whatever is missing and says what is needed, so the tap is
   * navigation rather than nothing happening.
   */
  const handleSend = async () => {
    if (pinpoints.length === 0) {
      // The reason travels with the jump - a banner left behind in this stage
      // would be invisible the moment we navigate away from it.
      onNeedStores(copy.stage3.blockedNoStores);
      return;
    }
    if (unassignedCount > 0) {
      if (!isEditing) startEditing();
      feedback.showError(copy.stage3.blockedUnassigned);
      return;
    }
    // The payment question follows the list only once the list is really in
    // the chat: asking how to pay for a list that failed to send would be a
    // question about nothing.
    if (await sendToCustomer()) await onListSent?.();
  };

  const isOutOfStock = (status?: string) =>
    String(status || "PENDING").toUpperCase() === "OUT_OF_STOCK";
  const oosCount = savedItems.filter((it: any) => isOutOfStock(it.fulfillmentStatus)).length;

  /** The rider's report on a line, shown only when it is one: out of stock. */
  const outOfStockChip = (
    <span className="flex shrink-0 items-center gap-1 rounded-trim bg-status-waiting-fill px-1.5 py-0.5 text-micro font-medium text-status-waiting-ink">
      <AlertTriangle size={11} />
      {copy.stage3.outOfStock}
    </span>
  );
  const oosBanner =
    oosCount > 0 ? (
      <div
        role="status"
        className="flex items-start gap-2 rounded-plate bg-status-waiting-fill px-3 py-2 text-label text-status-waiting-ink"
      >
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span>{copy.stage3.outOfStockBanner(oosCount)}</span>
      </div>
    ) : null;

  /**
   * The list as saved, for reading: a closed order, or one whose items are
   * already bought. A tick for what the rider bought, the out-of-stock chip for
   * what they could not; nothing for a line not reached, which is not a fault.
   */
  const savedList =
    savedItems.length === 0 ? (
      <p className="m-0 text-body text-ink-muted">No items on this order.</p>
    ) : (
      <ul className="m-0 list-none divide-y divide-hairline p-0">
        {savedItems.map((it: any, i: number) => {
          const isPurchased = String(it.fulfillmentStatus || "").toUpperCase() === "PURCHASED";
          const oos = isOutOfStock(it.fulfillmentStatus);
          return (
            <li key={i} className="flex items-center gap-2.5 py-2">
              {isPurchased && (
                <span
                  title="Bought by the rider"
                  className="grid size-5 shrink-0 place-items-center rounded-sm border border-status-done-ink bg-status-done-fill text-status-done-ink"
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              <span data-figure className="shrink-0 font-mono text-label text-ink-muted">
                {it.quantity}&times;
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-body",
                  oos ? "line-through text-status-waiting-ink" : "text-ink"
                )}
              >
                {it.itemName}
              </span>
              {oos && outOfStockChip}
              <span className="max-w-[128px] shrink-0 truncate text-label text-ink-muted">
                {parseStoreAndCat(it.storeCategory).store}
              </span>
            </li>
          );
        })}
      </ul>
    );

  /** Substitute options for an out-of-stock line, swapped into that row. */
  const renderSubstitutes = (
    rowIndex: number,
    itemId: number,
    subInfo: { data?: { substitutes: string[]; chatMessage: string } | null; sentChat?: boolean }
  ) =>
    subInfo.data ? (
      <div className="space-y-2 rounded-plate border border-edge bg-board-ground p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-micro font-medium uppercase text-ink-muted">
            <Sparkles size={12} />
            Suggested Local Substitutes (Click to Swap)
          </span>
          <button
            type="button"
            onClick={() =>
              setSubstituteState((prev) => {
                const next = { ...prev };
                delete next[itemId];
                return next;
              })
            }
            className="text-ink-muted hover:text-ink"
            aria-label="Close substitute suggestions"
          >
            <X size={13} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {subInfo.data.substitutes.map((subName, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => void handleApplySubstitute(rowIndex, itemId, subName)}
              className="cursor-pointer rounded-trim border border-edge bg-board-plate px-2.5 py-1 text-label text-ink transition-colors hover:border-board-field"
            >
              Swap with: {subName}
            </button>
          ))}
        </div>

        <div className="rounded-trim border border-edge bg-board-plate p-2">
          <p className="m-0 text-body text-ink">{subInfo.data.chatMessage}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <DispatcherButton
              type="button"
              size="sm"
              variant="secondary"
              icon={<Send size={12} />}
              disabled={subInfo.sentChat}
              onClick={() => handleSendSubstituteChat(itemId, subInfo.data!.chatMessage)}
            >
              {subInfo.sentChat ? "Sent to Customer Chat" : "Send Options to Customer Chat"}
            </DispatcherButton>
            <DispatcherButton
              type="button"
              size="sm"
              variant="subtle"
              icon={<X size={12} />}
              onClick={() => void handleDeclineSubstitute(itemId)}
            >
              Customer Declined Substitute
            </DispatcherButton>
          </div>
          <p className="mt-1.5 mb-0 text-micro text-ink opacity-50">
            Model can make mistakes. Please verify substitute options before sending to the customer.
          </p>
        </div>
      </div>
    ) : null;

  if (readOnly) {
    return (
      <div className="space-y-2">
        {oosBanner}
        {savedList}
      </div>
    );
  }

  const noStores = pinpoints.length === 0;

  return (
    <div className="space-y-3">
      {isOnTheWayToCustomer && (
        <div className="flex items-center gap-2 rounded-plate border border-edge bg-board-ground px-3 py-2 text-label text-ink-muted">
          <AlertTriangle size={14} className="shrink-0 text-status-waiting-ink" />
          <span>
            Rider status is On the Way to the Customer. No modification of items order is allowed.
          </span>
        </div>
      )}

      {oosBanner}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-body text-ink-muted">{copy.stage3.intro(customerFirstName)}</p>
        {canModifyItems && (
          <DispatcherButton
            type="button"
            size="sm"
            variant={isCatalogOpen ? "primary" : "secondary"}
            icon={<Package size={14} />}
            onClick={() => setIsCatalogOpen((prev) => !prev)}
          >
            {isCatalogOpen ? "Hide Catalog Helper" : "Catalog Menu Helper"}
          </DispatcherButton>
        )}
      </div>

      {/* Crawled Catalog & Menu Helper Drawer / Tray */}
      {isCatalogOpen && (
        <div className="space-y-2 rounded-plate border border-edge bg-board-plate p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="m-0 flex items-center gap-1.5 text-label font-medium text-ink">
              <Package size={14} className="text-ink-muted" />
              <span>Tacurong Item Catalog</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsCatalogOpen(false)}
              className="grid size-6 place-items-center rounded-trim text-ink-muted hover:bg-board-ground"
              aria-label="Close catalog helper"
            >
              <X size={13} />
            </button>
          </div>
          <div className="relative min-w-0">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="text"
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Search items (e.g. Burger, Chicken, Biogesic, Coffee)..."
              className="min-h-9 w-full rounded-trim border border-edge bg-board-ground pl-8 pr-3 text-body text-ink placeholder:text-ink-muted transition-colors focus:border-board-field focus:bg-board-plate focus:outline-none"
            />
          </div>

          {catalogSuggestions.length > 0 && (
            <div className="max-h-56 divide-y divide-hairline overflow-y-auto rounded-trim border border-edge bg-board-ground">
              {catalogSuggestions.map((catItem) => (
                <div
                  key={catItem.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-board-plate"
                >
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-body font-medium text-ink">{catItem.itemName}</p>
                    <p className="m-0 truncate text-micro text-ink-muted">
                      {describeSuggestionSource(catItem)} &bull; {catItem.categoryName}
                    </p>
                  </div>
                  <DispatcherButton
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={<Plus size={13} />}
                    onClick={() => {
                      // The new row's index: editing starts from the saved list.
                      const index = isEditing ? editableItems.length : savedItems.length;
                      if (!isEditing) startEditing();
                      const placedAt = addCatalogItem({
                        itemName: catItem.itemName,
                        storeName: catItem.rawStoreName,
                        categoryName: catItem.categoryName,
                      });
                      if (!placedAt) guessCategoryFor(index, catItem.itemName);
                      feedback.showSuccess(
                        placedAt
                          ? `Added "${catItem.itemName}" to ${placedAt}.`
                          : `Added "${catItem.itemName}". Pick the store it is bought at.`
                      );
                    }}
                  >
                    Add
                  </DispatcherButton>
                </div>
              ))}
            </div>
          )}

          {catalogQuery.trim().length >= 2 && catalogSuggestions.length === 0 && isCatalogLoading && (
            <p className="m-0 py-2 text-center text-label text-ink-muted">Searching the catalog...</p>
          )}

          {catalogQuery.trim().length >= 2 && catalogSuggestions.length === 0 && !isCatalogLoading && (
            <p className="m-0 py-2 text-center text-label text-ink-muted">
              {isCatalogError
                ? "Could not search the catalog. Check the connection and type the search again."
                : <>Nothing in the catalog matches &ldquo;{catalogQuery.trim()}&rdquo;. Add it as a new item below.</>}
            </p>
          )}
        </div>
      )}

      {noStores && (
        <p className="m-0 rounded-plate bg-status-waiting-fill px-3 py-2 text-label text-status-waiting-ink">
          {copy.stage3.needsStores}
        </p>
      )}

      {/* the list */}
      {isEditing ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-plate border border-edge bg-board-plate divide-y divide-hairline">
            {editableItems.map((item, index) => {
              const { store, category, assigned } = parseStoreAndCat(item.storeCategory);
              return (
                <div
                  key={index}
                  className={cn(
                    "p-2.5 transition-colors",
                    assigned
                      ? "hover:bg-board-ground/40"
                      : "bg-status-waiting-fill"
                  )}
                >
                {/* what it is, how many, and gone */}
                <div className="flex items-center gap-2">
                  <ItemAutocompleteInput
                    value={item.itemName}
                    onChange={(val) => updateItem(index, { itemName: val })}
                    onSelectSuggestion={(s) => {
                      updateItem(index, { itemName: s.itemName });
                      guessCategoryFor(index, s.itemName);
                    }}
                    onBlur={(e) => guessCategoryFor(index, e.target.value)}
                    placeholder={copy.stage3.itemPlaceholder}
                  />

                  <div className="flex shrink-0 items-center rounded-trim border border-edge bg-board-plate">
                    <button
                      type="button"
                      aria-label="One fewer"
                      onClick={() =>
                        updateItem(index, { quantity: Math.max(1, item.quantity - 1) })
                      }
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
                    aria-label={`${copy.stage3.removeItem} ${item.itemName || "item"}`}
                    onClick={() => removeItem(index)}
                    className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:bg-status-act-fill hover:text-status-act-ink"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* where it is bought. Without the store half of
                    `storeCategory` set, every item silently landed on the
                    first pin. */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    value={assigned ? store : ""}
                    onChange={(e) =>
                      updateItem(index, { storeCategory: `${e.target.value} | ${category}` })
                    }
                    aria-label={copy.stage3.storeLabel}
                    className={cn(
                      SELECT_CLASSES,
                      "max-w-[168px]",
                      assigned
                        ? "border-edge bg-board-ground text-ink"
                        : "border-status-act-ink/50 bg-board-plate text-status-act-ink"
                    )}
                  >
                    {!assigned && <option value="">{copy.stage3.pickStore}</option>}
                    {storeOptions.length === 0 ? (
                      <option value={store}>{store}</option>
                    ) : (
                      storeOptions.map((s: string) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))
                    )}
                  </select>

                  <select
                    value={category}
                    onChange={(e) =>
                      updateItem(index, {
                        storeCategory: `${assigned ? store : ""} | ${e.target.value}`,
                      })
                    }
                    aria-label="Store type"
                    className={cn(
                      SELECT_CLASSES,
                      "max-w-[136px] border-edge bg-board-ground text-ink"
                    )}
                  >
                    {merchantCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* The shop that is not pinned yet. This stage could file an
                      item under any PINNED shop and no further, so a dispatcher
                      who discovered a second shop was needed had to work out
                      for themselves that the answer lived back in step 1. This
                      says so, and takes them there with the reason attached.
                      Only on a line with no shop: on one already filed under a
                      pinned shop it offered to solve a problem it did not have. */}
                  {!assigned && (
                    <DispatcherButton
                      type="button"
                      size="sm"
                      variant="field"
                      icon={<MapPinOff size={13} />}
                      onClick={() => onNeedStores(copy.stage3.needsNewStore(item.itemName.trim()))}
                    >
                      {copy.stage3.storeNotPinned}
                    </DispatcherButton>
                  )}
                </div>

                {/* What the rider reported, on the line it is about, and only
                    when it is out of stock. */}
                {(() => {
                  const itemId = Number(item.id || 0);
                  if (!isOutOfStock(item.fulfillmentStatus) || itemId <= 0) return null;
                  const subInfo = substituteState[itemId];
                  return (
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {outOfStockChip}
                        <button
                          type="button"
                          onClick={() => void handleFetchSubstitutes(itemId)}
                          disabled={subInfo?.loading}
                          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-trim border border-edge bg-board-ground px-2 py-0.5 text-micro font-medium text-ink transition-colors hover:bg-board-plate"
                        >
                          <Sparkles size={11} />
                          <span>
                            {subInfo?.loading ? copy.stage3.checkingSubstitutes : copy.stage3.suggestSubstitutes}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeclineSubstitute(itemId)}
                          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-trim border border-edge bg-board-ground px-2 py-0.5 text-micro font-medium text-status-waiting-ink transition-colors hover:bg-board-plate"
                          title="Customer declined substitute - notify rider to proceed"
                        >
                          <X size={11} />
                          <span>{copy.stage3.declineSubstitute}</span>
                        </button>
                      </div>
                      {subInfo?.data && renderSubstitutes(index, itemId, subInfo)}
                    </div>
                  );
                })()}

                {/* Which shop this line belongs to, asked rather than assumed.
                    A new row inherits the shop of the one above it, which is
                    right most of the time and silently wrong the rest — and the
                    wrong version is only discovered by a rider standing at the
                    wrong counter. Shown only where there is a real choice to
                    make: with one shop pinned there is no ambiguity to raise. */}
                {assigned && storeOptions.length > 1 && (
                  <p className="mb-0 mt-2 text-label text-ink-muted">
                    {copy.stage3.sameStoreAsk(store)}
                  </p>
                )}

                {/* Where this line should be bought, from what dispatchers have
                    already decided. Appears as soon as the row has a name, and
                    applies the shop AND the category in one press - the two
                    halves are one decision, and a category with no shop is
                    exactly the unassigned state that blocks sending.

                    Shown whenever it would CHANGE the row, not only when the
                    category differs: a row already on the right category but
                    the wrong shop is precisely the mistake a rider discovers
                    at the counter. */}
                {recommendationsReady && (() => {
                  const p = categoryGuesses[index];
                  if (!p?.categoryName) return null;

                  const stopIndex = stopIndexFor(p);
                  const suggestedStore = stopIndex >= 0 ? storeOptions[stopIndex] : null;
                  const changesCategory = p.categoryName !== category;
                  // Against the shop actually CHOSEN, not the fallback. An
                  // unassigned row reports the first pin as its store, so a
                  // suggestion of that same pin read as "no change" and was
                  // hidden - on exactly the rows that most needed it.
                  const currentStore = assigned ? store : null;
                  const changesStore = Boolean(suggestedStore) && suggestedStore !== currentStore;
                  if (!changesCategory && !changesStore) return null;

                  const learned = p.source === 'learned';
                  return (
                    <div className="mt-2 flex flex-wrap items-center gap-2" title={p.reason}>
                      <span
                        className={cn(
                          'flex min-w-0 items-center gap-1.5 text-label',
                          learned ? 'text-status-done-ink' : 'text-status-waiting-ink'
                        )}
                      >
                        {learned ? (
                          <BrainCircuit size={13} className="shrink-0" />
                        ) : (
                          <Sparkles size={13} className="shrink-0" />
                        )}
                        <span className="truncate">
                          {copy.stage3.placementSuggestion(
                            p.categoryName,
                            suggestedStore ? parseStoreAndCat(`${suggestedStore} | x`).store : null
                          )}
                        </span>
                      </span>
                      {/* Provenance, stated plainly. "Filed here 9 of the last
                          10 times" and "the name was read" deserve different
                          amounts of trust, and the dispatcher is the one who
                          has to decide how much to give it. */}
                      <span className="text-micro uppercase text-ink-muted">
                        {learned
                          ? copy.stage3.placementLearned(p.learnedFrom)
                          : copy.stage3.placementModelled}
                      </span>
                      <DispatcherButton
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => applyCategoryGuess(index)}
                      >
                        {copy.stage3.placementApply}
                      </DispatcherButton>
                    </div>
                  );
                })()}

                {/* Store needed: no pinned store is the kind of shop this item
                    is bought at. Shown once the list has settled (above), and
                    only then: it used to appear on every row whose suggestion
                    had not arrived yet, including rows already filed under the
                    right pinned store. The store it offers comes from the
                    server's predictor, and pressing it pins that store. */}
                {(() => {
                  const need = unservedRows.find((r) => r.index === index);
                  if (!need) return null;
                  const predicted = neededStores[need.name.toLowerCase()] ?? null;
                  const proposedStore = predicted?.storeName ?? null;

                  return (
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-plate border border-status-waiting-ink/40 bg-status-waiting-fill p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="m-0 flex items-center gap-1.5 text-label font-medium text-status-waiting-ink">
                          <AlertTriangle size={14} className="shrink-0 text-status-waiting-ink" />
                          <span>Store needed for &ldquo;{item.itemName}&rdquo;</span>
                        </p>
                        <p className="mb-0 mt-0.5 text-micro text-status-waiting-ink/85">
                          {copy.stage3.noPinnedKind(need.category)}{" "}
                          {predicted ? predicted.reason : copy.stage3.noStoreToSuggest}
                        </p>
                      </div>
                      <DispatcherButton
                        type="button"
                        size="sm"
                        variant="primary"
                        icon={<ArrowRight size={13} />}
                        onClick={() => {
                          if (predicted) {
                            onNeedStores(
                              copy.stage3.pinnedFor(predicted.storeName, need.name),
                              undefined,
                              predicted
                            );
                          } else {
                            onNeedStores(copy.stage3.needsNewStore(need.name), need.category);
                          }
                        }}
                      >
                        {proposedStore ? copy.stage3.pinStoreNamed(proposedStore) : copy.stage3.pinAStore}
                      </DispatcherButton>
                    </div>
                  );
                })()}
              </div>
            );
          })}
          </div>

          <button
            type="button"
            onClick={() => addItem()}
            className="flex min-h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-plate border border-dashed border-edge bg-board-ground/40 text-micro uppercase text-ink-muted transition-colors hover:bg-board-ground hover:text-ink"
          >
            <Plus size={14} /> {copy.stage3.addItem}
          </button>
        </div>
      ) : (
        // Not open for editing: the items are already bought, so the list is
        // read here as the rider reported it.
        savedList
      )}

      {canModifyItems && unassignedCount > 0 && (
        <div className="rounded-plate bg-status-waiting-fill px-3 py-2.5">
          <p className="m-0 text-label text-status-waiting-ink">
            {copy.stage3.unassignedTitle(unassignedCount)}
          </p>
          <p className="mb-0 mt-1 text-body text-status-waiting-ink/85">
            {copy.stage3.unassignedBody}
          </p>
        </div>
      )}

      {/* Sent and untouched since: the customer's turn, or their answer. */}
      {canModifyItems && hasSentConfirmationCard && !hasUnsentChanges && !isCustomerConfirmed && (
        <WaitingCard
          title={`Waiting for ${customerFirstName}`}
          detail={`You sent the item list ${formatAgo(minsAgo)}.`}
          actions={[{ label: copy.nowActions.nudge(customerFirstName), onClick: onNudge }]}
        />
      )}
      {canModifyItems && hasSentConfirmationCard && !hasUnsentChanges && isCustomerConfirmed && (
        <p className="m-0 flex items-center gap-2 rounded-plate bg-status-done-fill px-3 py-2.5 text-label text-status-done-ink">
          <Check size={15} className="shrink-0" />
          {copy.stage3.approved(customerFirstName)}
        </p>
      )}

      <DispatcherInlineBanner message={feedback.message} onDismiss={feedback.dismiss} />

      {/* One send, and only when there is something to send: a list the
          customer has never seen, or one changed since they saw it. */}
      {canModifyItems && (!hasSentConfirmationCard || hasUnsentChanges) && (
        <div className="space-y-2">
          {hasSentConfirmationCard && hasUnsentChanges && (
            <p className="m-0 text-body text-ink-muted">{copy.stage3.resendNote(customerFirstName)}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <DispatcherButton
              variant="primary"
              size="md"
              loading={isSaving}
              loadingText={copy.stage3.sending}
              icon={<Send size={15} />}
              onClick={() => void handleSend()}
              className="flex-1 justify-center"
            >
              {hasSentConfirmationCard
                ? copy.stage3.resend(customerFirstName)
                : copy.stage3.send(customerFirstName)}
            </DispatcherButton>
            {hasUnsentChanges && (
              <DispatcherButton variant="secondary" size="md" onClick={cancelEditing}>
                {copy.stage3.undoChanges}
              </DispatcherButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
