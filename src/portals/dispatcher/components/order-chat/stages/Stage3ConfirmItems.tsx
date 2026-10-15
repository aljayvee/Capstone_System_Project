import {
  Plus,
  Send,
  Package,
  Sparkles,
  BrainCircuit,
  Search,
  AlertTriangle,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { apiService, type ApiPredictedStore } from "../../../../../services/apiService";
import { cn } from "@/lib/utils";
import { formatItemLabel } from "../../../../../utils/format";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherInlineBanner } from "@/components/panel/DispatcherInlineBanner";
import { WaitingCard } from "../WaitingCard";
import { copy, formatAgo } from "../copy";
import type { MerchantCategory, StorePinpoint } from "../types";
import { describeSuggestionSource, useCatalogAutocomplete } from "../hooks/useCatalogAutocomplete";
import { ItemsByStore, StoreItemsDialog, type StoreColumn } from "../ItemsByStore";
import { newItemKey, type ItemLine } from "../itemOwnership";

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
    storesChangedSinceSent,
    sentAt,
    startEditing,
    cancelEditing,
    addItem,
    addCatalogItem,
    updateItem,
    removeItem,
    sendToCustomer,
    parseStoreAndCat,
    unassignedCount,
    categoryGuesses,
    stopIndexFor,
    guessCategoryFor,
    applyCategoryGuess,
    recommendationsReady,
    categoryNameForPin,
    storeIndexOf,
    lines,
    setItemOwned,
    setStoreOwnsAll,
    editItemFields,
    pushMessage,
    onOrderUpdated,
  } = items;

  /** The pinned stores as the list's groups: each pin's own name and category. */
  const stores: StoreColumn[] = useMemo(
    () =>
      pinpoints.map((pin, i) => ({
        name: (pin.storeName || "").trim() || `Store ${i + 1}`,
        category: categoryNameForPin(pin),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinpoints, merchantCategories]
  );
  const [openStoreIndex, setOpenStoreIndex] = useState<number | null>(null);

  /**
   * A tick or untick says what it did (2026-10-10): the list shows only what
   * each store buys, so a change made in a store's dialog is otherwise unseen
   * until it closes. One message per store: the store's previous toast is
   * dismissed and a fresh one shown. Re-using one toast id instead lost the
   * message whenever the earlier toast was already on its way out.
   */
  const lastNoticeByStore = useRef<Record<number, string | number>>({});
  const noticeAt = useCallback((storeIndex: number, message: string, added: boolean) => {
    const previous = lastNoticeByStore.current[storeIndex];
    if (previous !== undefined) toast.dismiss(previous);
    lastNoticeByStore.current[storeIndex] = added ? toast.success(message) : toast(message);
  }, []);
  const storeNameAt = (storeIndex: number) => stores[storeIndex]?.name ?? `Store ${storeIndex + 1}`;

  const tickWithNotice = useCallback(
    (key: string, storeIndex: number, owned: boolean) => {
      const line = lines.find((l) => l.key === key);
      setItemOwned(key, storeIndex, owned);
      const item = formatItemLabel(line?.itemName.trim() || copy.stage3.unnamedItem, line?.size);
      const store = storeNameAt(storeIndex);
      noticeAt(storeIndex, owned ? copy.stage3.addedTo(item, store) : copy.stage3.removedFrom(item, store), owned);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, stores, setItemOwned, noticeAt]
  );

  const tickAllWithNotice = useCallback(
    (storeIndex: number, owned: boolean) => {
      setStoreOwnsAll(storeIndex, owned);
      const store = storeNameAt(storeIndex);
      noticeAt(storeIndex, owned ? copy.stage3.allAddedTo(store) : copy.stage3.allRemovedFrom(store), owned);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stores, setStoreOwnsAll, noticeAt]
  );

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
    // index, so the swap lands on the row the button sits in. Only this
    // store's copy changes, so it becomes an item of its own.
    updateItem(itemIndex, { itemName: newItemName, itemKey: newItemKey() });
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
   * The kind of shop each item no store buys needs, when no pinned store is
   * that kind. The item's own category, or the suggestion's when there is one.
   * An item ticked at a store is that store's kind by definition.
   */
  const unservedRows = isEditing && recommendationsReady
    ? lines
        .filter((line) => line.unassignedRow !== null)
        .map((line) => {
          const name = line.itemName.trim();
          const category =
            categoryGuesses[line.key]?.categoryName ||
            parseStoreAndCat(editableItems[line.unassignedRow!]?.storeCategory).category;
          const served = pinpoints.some((pin) => categoryNameForPin(pin) === category);
          return { key: line.key, name, category, served };
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
  /** One saved line, for reading. */
  const savedLine = (it: any, i: number) => {
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
        <span data-figure className="shrink-0 font-mono text-label tabular-nums text-ink-muted">
          {it.quantity}&times;
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-body",
              oos ? "line-through text-status-waiting-ink" : "text-ink"
            )}
          >
            {formatItemLabel(it.itemName, it.size)}
          </span>
          {it.notes ? (
            <span className="block truncate text-label text-ink-muted" title={it.notes}>
              Note: {it.notes}
            </span>
          ) : null}
        </span>
        {oos && outOfStockChip}
      </li>
    );
  };

  /**
   * The list as saved, for reading: a closed order, or one whose items are
   * already bought. Grouped by store like the list being edited. A tick for
   * what the rider bought, the out-of-stock chip for what they could not;
   * nothing for a line not reached, which is not a fault.
   */
  const savedGroups = [
    ...stores.map((store, at) => ({
      title: `${at + 1}. ${store.name}`,
      rows: savedItems.filter((it: any) => storeIndexOf(it) === at),
    })),
    { title: copy.stage3.notAssignedTitle, rows: savedItems.filter((it: any) => storeIndexOf(it) === null) },
  ].filter((group) => group.rows.length > 0);

  const savedList =
    savedItems.length === 0 ? (
      <p className="m-0 text-body text-ink-muted">No items on this order.</p>
    ) : (
      <div className="space-y-2">
        {savedGroups.map((group) => (
          <div key={group.title}>
            <h4 className="m-0 truncate text-micro font-bold uppercase tracking-[0.06em] text-ink-muted">
              {group.title}
            </h4>
            <ul className="m-0 list-none divide-y divide-hairline p-0">{group.rows.map(savedLine)}</ul>
          </div>
        ))}
      </div>
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

  /** What the rider reported on one store's line, under it, and only when it is out of stock. */
  const renderOutOfStock = (rowIndex: number) => {
    const item = editableItems[rowIndex];
    const itemId = Number(item?.id || 0);
    if (!item || !isOutOfStock(item.fulfillmentStatus) || itemId <= 0) return null;
    const subInfo = substituteState[itemId];
    return (
      <div className="mt-1.5 space-y-2 pl-11">
        <div className="flex flex-wrap items-center gap-1.5">
          {outOfStockChip}
          <button
            type="button"
            onClick={() => void handleFetchSubstitutes(itemId)}
            disabled={subInfo?.loading}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-trim border border-edge bg-board-ground px-2 py-0.5 text-micro font-medium text-ink transition-colors hover:bg-board-plate"
          >
            <Sparkles size={11} />
            <span>{subInfo?.loading ? copy.stage3.checkingSubstitutes : copy.stage3.suggestSubstitutes}</span>
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
        {subInfo?.data && renderSubstitutes(rowIndex, itemId, subInfo)}
      </div>
    );
  };

  /**
   * Under an item no store buys: where dispatchers have bought it before, and,
   * when no pinned store is its kind, the store to pin for it.
   */
  const renderUnassignedExtras = (line: ItemLine) => {
    const p = recommendationsReady ? categoryGuesses[line.key] : undefined;
    const stopIndex = p ? stopIndexFor(p) : -1;
    const suggestion = p?.categoryName ? (
      <div className="mt-2 flex flex-wrap items-center gap-2" title={p.reason}>
        <span
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-label",
            p.source === "learned" ? "text-status-done-ink" : "text-status-waiting-ink"
          )}
        >
          {p.source === "learned" ? (
            <BrainCircuit size={13} className="shrink-0" />
          ) : (
            <Sparkles size={13} className="shrink-0" />
          )}
          <span className="truncate">
            {copy.stage3.placementSuggestion(p.categoryName, stopIndex >= 0 ? stores[stopIndex]?.name ?? null : null)}
          </span>
        </span>
        <DispatcherButton type="button" size="sm" variant="secondary" onClick={() => applyCategoryGuess(line.key)}>
          {copy.stage3.placementApply}
        </DispatcherButton>
      </div>
    ) : null;

    // Store needed: no pinned store is the kind of shop this item is bought at.
    // The store it offers comes from the server's predictor, and pressing it
    // pins that store.
    const need = unservedRows.find((r) => r.key === line.key);
    const predicted = need ? neededStores[need.name.toLowerCase()] ?? null : null;
    const needCard = need ? (
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-plate border border-status-waiting-ink/40 bg-status-waiting-fill p-2.5">
        <div className="min-w-0 flex-1">
          <p className="m-0 flex items-center gap-1.5 text-label font-medium text-status-waiting-ink">
            <AlertTriangle size={14} className="shrink-0 text-status-waiting-ink" />
            <span>Store needed for &ldquo;{line.itemName}&rdquo;</span>
          </p>
          <p className="mb-0 mt-0.5 text-micro text-status-waiting-ink/85">
            {copy.stage3.noPinnedKind(need.category)} {predicted ? predicted.reason : copy.stage3.noStoreToSuggest}
          </p>
        </div>
        <DispatcherButton
          type="button"
          size="sm"
          variant="success"
          icon={<ArrowRight size={13} />}
          onClick={() => {
            if (predicted) {
              onNeedStores(copy.stage3.pinnedFor(predicted.storeName, need.name), undefined, predicted);
            } else {
              onNeedStores(copy.stage3.needsNewStore(need.name), need.category);
            }
          }}
        >
          {predicted ? copy.stage3.pinStoreNamed(predicted.storeName) : copy.stage3.pinAStore}
        </DispatcherButton>
      </div>
    ) : null;

    return (
      <>
        {suggestion}
        {needCard}
      </>
    );
  };

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

      {/* The intro line ("Check the list, then send it...") was removed on
          request, so the row exists only for the catalog button. */}
      {canModifyItems && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <DispatcherButton
            type="button"
            size="sm"
            variant={isCatalogOpen ? "success" : "secondary"}
            icon={<Package size={14} />}
            onClick={() => setIsCatalogOpen((prev) => !prev)}
          >
            {isCatalogOpen ? "Hide Catalog Helper" : "Catalog Menu Helper"}
          </DispatcherButton>
        </div>
      )}

      {/* Crawled Catalog & Menu Helper Drawer / Tray */}
      {isCatalogOpen && (
        <div className="space-y-2.5 rounded-plate border border-edge bg-board-plate p-3.5 shadow-plate">
          <div className="flex items-center justify-between">
            <h4 className="m-0 flex items-center gap-1.5 text-micro font-bold uppercase tracking-[0.06em] text-ink">
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
                    <p className="m-0 truncate text-body font-semibold text-ink">{catItem.itemName}</p>
                    <p className="m-0 truncate text-micro text-ink-muted">
                      {describeSuggestionSource(catItem)} &bull; {catItem.categoryName}
                    </p>
                  </div>
                  <DispatcherButton
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="font-semibold"
                    icon={<Plus size={13} />}
                    onClick={() => {
                      if (!isEditing) startEditing();
                      // An item with no store is read again with the rest of the
                      // list a moment later, and its suggestion shows then.
                      const placedAt = addCatalogItem({
                        itemName: catItem.itemName,
                        storeName: catItem.rawStoreName,
                        categoryName: catItem.categoryName,
                      });
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

      {/* the list, grouped by store */}
      {isEditing ? (
        <>
          <ItemsByStore
            stores={stores}
            lines={lines}
            rows={editableItems}
            onTick={tickWithNotice}
            onEditItem={editItemFields}
            onQuantity={(rowIndex, quantity) => updateItem(rowIndex, { quantity })}
            onRemove={removeItem}
            onAdd={addItem}
            onOpenStore={setOpenStoreIndex}
            onNameSettled={guessCategoryFor}
            renderLineExtras={renderOutOfStock}
            renderUnassignedExtras={renderUnassignedExtras}
          />
          <StoreItemsDialog
            open={openStoreIndex !== null}
            onOpenChange={(open) => !open && setOpenStoreIndex(null)}
            store={openStoreIndex !== null ? stores[openStoreIndex] ?? null : null}
            storeIndex={openStoreIndex ?? 0}
            stores={stores}
            lines={lines}
            rows={editableItems}
            onTick={tickWithNotice}
            onTickAll={tickAllWithNotice}
          />
        </>
      ) : (
        // Not open for editing: the items are already bought, so the list is
        // read here as the rider reported it.
        savedList
      )}

      {/* Items no store buys are listed first, under "Not assigned yet"
          (ItemsByStore), so no second warning repeats them here. Send still
          stops on them and says why (handleSend). Shown only when the list is
          not open, where that group does not exist. */}
      {canModifyItems && !isEditing && unassignedCount > 0 && (
        <div className="rounded-plate border border-status-waiting-ink/30 bg-status-waiting-fill px-3 py-2.5">
          <p className="m-0 text-label font-bold text-status-waiting-ink">
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
        <p className="m-0 flex items-center gap-2 rounded-plate border border-status-done-ink/20 bg-status-done-fill px-3.5 py-2.5 text-label font-semibold text-status-done-ink">
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
          {storesChangedSinceSent && (
            <p className="m-0 text-body text-ink-muted">{copy.stage3.storesChangedNote(customerFirstName)}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <DispatcherButton
              variant="success"
              size="md"
              loading={isSaving}
              loadingText={copy.stage3.sending}
              icon={<Send size={15} />}
              onClick={() => void handleSend()}
              className="flex-1 justify-center font-semibold"
            >
              {hasSentConfirmationCard || storesChangedSinceSent
                ? copy.stage3.resend(customerFirstName)
                : copy.stage3.send(customerFirstName)}
            </DispatcherButton>
            {hasUnsentChanges && (
              <DispatcherButton variant="secondary" size="md" className="font-semibold" onClick={cancelEditing}>
                {copy.stage3.undoChanges}
              </DispatcherButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
