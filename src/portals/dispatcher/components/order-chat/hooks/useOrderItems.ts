import { useState, useEffect, useCallback } from "react";
import { ref, update } from "firebase/database";
import { toast } from "sonner";
import { database } from "../../../../../firebase/config";
import { apiClient } from "../../../../../services/apiClient";
import { apiService, type ApiItemPlacement } from "../../../../../services/apiService";
import { useInlineMessage } from "@/components/panel/DispatcherInlineBanner";
import { copy } from "../copy";
import type { EditableItem, StorePinpoint, MerchantCategory, OrderChatMessage } from "../types";

/** Illegal Firebase RTDB key characters: . # $ / [ ] */
const clean = (s: string) => (s || "").replace(/[.#$/[\]]/g, " ").replace(/\s+/g, " ").trim();

export interface SplitStoreCategory {
  store: string;
  category: string;
  /** False when the shop was inferred rather than chosen, and the choice was real. */
  assigned: boolean;
}

/**
 * Splits `"Store 2 - Jollibee | Fast Food & Restaurant"` into its two halves.
 *
 * Pure and exported so the rule can be exercised directly — it is the piece
 * that decides whether a rider is told the right shop, and it is not
 * observable from the UI unless an order happens to be in the wrong state.
 *
 * `assigned` is the important part. Items submitted from the customer's app
 * carry ONLY a merchant category — no store prefix — because the customer
 * picks *what* they want, never *where* it comes from; that is the
 * dispatcher's job. Previously such an item was silently filed under the first
 * pin, so on a two-store errand a "Fried Chicken (2pc)" categorised as Fast
 * Food was quietly assigned to whichever shop was pinned first, and nothing on
 * screen said so. The rider then got a list sending them to the wrong shop.
 *
 * With one shop pinned there is no ambiguity, so it stays assigned. With two
 * or more it is reported unassigned and the dispatcher has to choose.
 */
export function splitStoreCategory(
  rawCategory: string | undefined,
  opts: {
    defaultStore: string;
    defaultCategory: string;
    categoryNames: string[];
    pinCount: number;
  }
): SplitStoreCategory {
  const { defaultStore, defaultCategory, categoryNames, pinCount } = opts;
  // A single pinned shop makes the choice unambiguous; more than one does not.
  const unambiguous = pinCount <= 1;

  if (!rawCategory) {
    return { store: defaultStore, category: defaultCategory, assigned: unambiguous };
  }

  if (rawCategory.includes(" | ")) {
    const parts = rawCategory.split(" | ");
    return {
      store: parts[0]?.trim() || defaultStore,
      category: parts[1]?.trim() || defaultCategory,
      assigned: Boolean(parts[0]?.trim()),
    };
  }

  const isMerchant = categoryNames.some(
    (name) => name.toLowerCase() === rawCategory.toLowerCase()
  );
  return isMerchant
    ? { store: defaultStore, category: rawCategory, assigned: unambiguous }
    : { store: rawCategory, category: defaultCategory, assigned: true };
}

interface UseOrderItemsArgs {
  orderId: string;
  orderDetails: any;
  customerDisplayName: string;
  pinpoints: StorePinpoint[];
  merchantCategories: MerchantCategory[];
  messages: OrderChatMessage[];
  onOrderUpdated: (errand: any) => void;
  pushMessage: (payload: Record<string, any>) => void;
}

export function useOrderItems({
  orderId,
  orderDetails,
  customerDisplayName,
  pinpoints,
  merchantCategories,
  messages,
  onOrderUpdated,
  pushMessage,
}: UseOrderItemsArgs) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSentConfirmationCard, setHasSentConfirmationCard] = useState(false);
  const [isCustomerConfirmed, setIsCustomerConfirmed] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  /**
   * Where each editable row should be bought, keyed by its index.
   *
   * A full placement now, not just a category: the shop as well, chosen from
   * the stops stage 2 pinned. It also carries where the answer came from -
   * `learned` when a dispatcher filed this same item before, `model` when
   * nobody has and the name was read.
   *
   * Held beside the rows rather than written into them, because a suggestion is
   * not an answer. The dispatcher sees what the machine thought and applies it
   * or ignores it; only their choice reaches `storeCategory`, which the rider's
   * shopping list and the errand's dwell allowance are both built from.
   */
  const [categoryGuesses, setCategoryGuesses] = useState<Record<number, ApiItemPlacement>>({});
  const feedback = useInlineMessage();

  const savedItems: any[] =
    (orderDetails?.pabiliDetails?.length ? orderDetails.pabiliDetails : orderDetails?.pabiliItemRequests) || [];

  // The customer's approval arrives two ways: a socket event, and the card
  // itself flipping `confirmed` in RTDB. Watch the messages for the latter.
  useEffect(() => {
    const card = messages.find((m: any) => m.type === "order_confirmation");
    if (card) {
      setHasSentConfirmationCard(true);
      if (typeof card.timestamp === "number") setSentAt(card.timestamp);
    }
    if (messages.some((m: any) => m.type === "order_confirmation" && m.confirmed === true)) {
      setIsCustomerConfirmed(true);
    }
  }, [messages]);

  // ── 4-tier helpers: Store > Merchant Category > Item > Qty ──────────────
  // A pin categorised in stage 2 IS that category: a Jollibee pinned as Fast
  // Food does not stop being Fast Food when an item gets filed under it here.
  const categoryNameForPin = (pin?: StorePinpoint | null): string | null => {
    if (!pin?.categoryId) return null;
    return merchantCategories.find((c) => c.id === pin.categoryId)?.name ?? null;
  };

  const storeLabelFor = (index: number): string => {
    const pin = pinpoints[index];
    return pin ? `Store ${index + 1} - ${clean(pin.storeName || `Store ${index + 1}`)}` : `Store ${index + 1}`;
  };

  const defaultStore = () => (pinpoints[0] ? storeLabelFor(0) : "Store 1");
  const defaultCategory = () =>
    categoryNameForPin(pinpoints[0]) || merchantCategories[0]?.name || "Fast Food & Restaurant";

  const parseStoreAndCat = useCallback(
    (rawCategory?: string): SplitStoreCategory =>
      splitStoreCategory(rawCategory, {
        defaultStore: defaultStore(),
        defaultCategory: defaultCategory(),
        categoryNames: merchantCategories.map((c) => c.name),
        pinCount: pinpoints.length,
      }),
    [pinpoints, merchantCategories]
  );

  /** The stores an item can be filed under — the labels the pins produce. */
  const storeOptions = pinpoints.map((_, i) => storeLabelFor(i));

  /** Items the dispatcher still has to place, when placing them is a real choice. */
  const unassignedCount = (isEditing ? editableItems : savedItems).filter(
    (it: any) => !parseStoreAndCat(it.storeCategory).assigned
  ).length;

  const formatStoreAndCat = (storeName: string, catName: string) =>
    `${clean(storeName) || "Store 1"} | ${clean(catName) || "General"}`;

  // ── editing ─────────────────────────────────────────────────────────────
  /**
   * Asks the category service what kind of shop these items are bought at.
   *
   * One batched call, because a dispatcher opening the editor on an eleven-item
   * basket should not pay for eleven round trips inside a panel they are
   * looking at. Failures are silent by design: the guess is an improvement on a
   * dropdown that already works, and a red banner for "the optional hint was
   * unavailable" teaches dispatchers to ignore banners.
   */
  const guessCategories = useCallback(
    async (targets: Array<{ index: number; name: string }>) => {
      // Two characters is the floor: "a" matches half the lexicon and the
      // answer would be noise dressed as a suggestion.
      const named = targets.filter((t) => t.name.trim().length >= 2);
      if (named.length === 0) return;

      const placements = await apiService.suggestItemPlacements(
        orderId,
        named.map((t) => t.name.trim())
      );

      setCategoryGuesses((prev) => {
        const next = { ...prev };
        named.forEach((target, i) => {
          const placement = placements[i];
          if (placement && placement.categoryId != null) {
            next[target.index] = placement;
          } else {
            // Cleared rather than left stale: a row whose name has been
            // rewritten since the last guess must not keep showing the old one.
            delete next[target.index];
          }
        });
        return next;
      });
    },
    [orderId]
  );

  /**
   * One row, once its name has stopped changing.
   *
   * Called on blur rather than on every keystroke: a dispatcher typing
   * "paracetamol" would otherwise fire eleven lookups to answer a question
   * they were still half-way through asking.
   */
  const guessCategoryFor = useCallback(
    (index: number, name: string) => {
      void guessCategories([{ index, name }]);
    },
    [guessCategories]
  );
  const startEditing = useCallback(() => {
    const rows = savedItems.map((d: any) => ({
      itemName: d.itemName,
      storeCategory: d.storeCategory || undefined,
      quantity: d.quantity || 1,
    }));
    setEditableItems(rows);
    setCategoryGuesses({});
    setIsEditing(true);
    // One batched call for the whole basket, so every row's suggestion is ready
    // by the time the dispatcher has finished reading the first one.
    void guessCategories(rows.map((row, index) => ({ index, name: row.itemName || "" })));
  }, [savedItems, guessCategories]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditableItems([]);
    setCategoryGuesses({});
  }, []);

  const addItem = useCallback(
    (storeName?: string, catName?: string) => {
      setEditableItems((prev) => {
        // Inherits the shop the previous line was filed under, because the
        // common case by a wide margin is another thing from the same shop.
        // The row asks about it either way — see Stage 3's store question — so
        // the default being wrong costs one click, not a wrong delivery.
        const previous = prev.length > 0 ? prev[prev.length - 1] : null;
        const inherited = previous ? parseStoreAndCat(previous.storeCategory) : null;
        return [
          ...prev,
          {
            itemName: "",
            quantity: 1,
            storeCategory: formatStoreAndCat(
              storeName || inherited?.store || defaultStore(),
              catName || inherited?.category || defaultCategory()
            ),
          },
        ];
      });
    },
    [pinpoints, merchantCategories, parseStoreAndCat]
  );

  /**
   * Which of THIS screen's pins a placement refers to.
   *
   * By id first, then by name. Id alone never matched in practice: pins added
   * in the current session carry no id until the page reloads, so a placement
   * naming pin 16 found nothing, and every suggestion quietly rendered as
   * "no change". The server echoes the pin's own storeName back, which is
   * the same string this screen holds, so the name is a safe second key.
   */
  const stopIndexFor = useCallback(
    (placement: Pick<ApiItemPlacement, "pinpointId" | "storeName">): number => {
      if (placement.pinpointId != null) {
        const byId = pinpoints.findIndex((pin) => pin.id != null && pin.id === placement.pinpointId);
        if (byId >= 0) return byId;
      }
      const wanted = (placement.storeName || "").trim();
      if (!wanted) return -1;
      return pinpoints.findIndex((pin) => (pin.storeName || "").trim() === wanted);
    },
    [pinpoints]
  );

  /**
   * Files a row under the shop AND category the suggester proposed.
   *
   * Both halves, because either alone leaves the row incomplete: a category
   * with no shop is exactly the unassigned state stage 3 already blocks
   * sending on. When the suggester could not pick a shop - two pinned stops
   * share the category, or none matches it - the category is applied and the
   * shop is left for the dispatcher rather than filled with a guess.
   */
  const applyCategoryGuess = useCallback(
    (index: number) => {
      const placement = categoryGuesses[index];
      if (!placement?.categoryName) return;

      setEditableItems((prev) =>
        prev.map((row, i) => {
          if (i !== index) return row;
          const { store, assigned } = parseStoreAndCat(row.storeCategory);
          const stopIndex = stopIndexFor(placement);
          const nextStore = stopIndex >= 0 ? storeLabelFor(stopIndex) : assigned ? store : "";
          return { ...row, storeCategory: `${nextStore} | ${placement.categoryName}` };
        })
      );
    },
    [categoryGuesses, parseStoreAndCat, stopIndexFor]
  );
  const updateItem = useCallback((index: number, patch: Partial<EditableItem>) => {
    setEditableItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }, []);

  const removeItem = useCallback(
    (index: number) => {
      const item = editableItems[index];
      const itemName = (item?.itemName || "").trim();
      const qty = item?.quantity || 1;
      const { store, category } = parseStoreAndCat(item?.storeCategory);

      setEditableItems((prev) => prev.filter((_, i) => i !== index));

      // The guesses are keyed by row position, so removing a row has to shift
      // every key above it down one. Without this, deleting the first of five
      // items leaves each remaining row wearing the suggestion belonging to the
      // row that used to be above it.
      setCategoryGuesses((prev) => {
        const next: typeof prev = {};
        for (const [key, value] of Object.entries(prev)) {
          const at = Number(key);
          if (at < index) next[at] = value;
          else if (at > index) next[at - 1] = value;
        }
        return next;
      });

      // Removing something the customer asked for is a change to their order,
      // not a private edit — they get told in the chat.
      if (itemName && orderId) {
        try {
          pushMessage({
            type: "item_deleted",
            text: `The item "${itemName}" (Qty: ${qty}) from ${store} (${category}) was removed from your order.`,
          });
          feedback.showSuccess(copy.stage3.removedNotice(itemName));
        } catch (err) {
          console.error("Failed to send item deletion notification:", err);
          feedback.showError(`"${itemName}" was removed, but they couldn't be notified.`);
        }
      }
    },
    [editableItems, orderId, parseStoreAndCat, pushMessage, feedback]
  );

  // ── send ────────────────────────────────────────────────────────────────
  const sendToCustomer = useCallback(async () => {
    const rawItems = isEditing && editableItems.length > 0 ? editableItems : savedItems;

    const sanitized = rawItems
      .map((it: any) => ({
        itemName: (it.itemName || "").trim(),
        storeCategory: clean(it.storeCategory || defaultStore()) || "Store 1",
        quantity: Math.max(1, Number(it.quantity) || 1),
      }))
      .filter((it: any) => it.itemName.length > 0);

    if (sanitized.length === 0) {
      toast.error(copy.stage3.needsOne);
      return;
    }

    setIsSaving(true);
    feedback.dismiss();
    try {
      const res = await apiClient.patch(`/errands/${orderId}/items`, { items: sanitized });
      const updatedErrand = res.data?.errand || res.data;
      onOrderUpdated(updatedErrand);
      setIsEditing(false);

      // Store > Category > Items, for the card the customer approves.
      const nestedGrouped: Record<string, Record<string, any[]>> = {};
      sanitized.forEach((it: any) => {
        const { store, category } = parseStoreAndCat(it.storeCategory);
        const s = clean(store) || "Store 1";
        const c = clean(category) || "General";
        if (!nestedGrouped[s]) nestedGrouped[s] = {};
        if (!nestedGrouped[s][c]) nestedGrouped[s][c] = [];
        nestedGrouped[s][c].push({
          itemName: it.itemName,
          quantity: it.quantity,
          priceNote: "Actual store receipt upon purchase",
        });
      });

      const flatStoreGroups = Object.keys(nestedGrouped).map((st) => ({
        storeName: st,
        items: Object.keys(nestedGrouped[st]).flatMap((cat) => nestedGrouped[st][cat]),
      }));

      const sanitizedPinpoints = pinpoints
        .map((p) => ({
          storeName: clean(p.storeName || "Store"),
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
        }))
        .filter((p) => !isNaN(p.latitude) && !isNaN(p.longitude));

      const deliveryFee = Number(updatedErrand?.deliveryFee ?? orderDetails?.deliveryFee ?? 0);
      const totalCost = Number(updatedErrand?.totalCost ?? orderDetails?.totalCost ?? 0);

      // The server is the pricing authority and returns its own breakdown when
      // it has one. Only fall back to a locally-assembled shape when it doesn't
      // — the previous version reconstructed every figure client-side from
      // hard-coded rates and showed the result to the customer as if it were
      // the real price.
      const feeBreakdown =
        updatedErrand?.feeBreakdown ?? {
          fees: {
            baseFee: Number(updatedErrand?.baseFee ?? 0),
            distanceFee: Number(updatedErrand?.distanceFee ?? 0),
            multiStoreFee: Number(updatedErrand?.multiStoreFee ?? 0),
            groceryFee: Number(updatedErrand?.groceryFee ?? 0),
            nonCodFee: Number(updatedErrand?.nonCodFee ?? 0),
            subtotal: deliveryFee,
          },
          itemsSubtotal: 0,
          grandTotal: totalCost || deliveryFee,
        };

      pushMessage({
        type: "order_confirmation",
        text: "Here is your order breakdown and delivery fee. Please review and approve.",
        pinpoints: sanitizedPinpoints,
        items: sanitized,
        groupedItems: nestedGrouped,
        storeGroups: flatStoreGroups,
        deliveryFee,
        totalCost,
        feeBreakdown,
        confirmed: false,
        status: "pending",
      });

      try {
        update(ref(database, `chats/${orderId}/meta`), {
          hasSentConfirmationCard: true,
          isCustomerConfirmed: false,
          updatedAt: Date.now(),
        });
      } catch (metaErr) {
        console.warn("Could not update chat meta:", metaErr);
      }

      setHasSentConfirmationCard(true);
      setIsCustomerConfirmed(false);
      setSentAt(Date.now());
      feedback.showSuccess(copy.stage3.sent(customerDisplayName));
    } catch (err: any) {
      console.error("Failed to save updated items:", err);
      feedback.showError(
        err.response?.data?.message || err.response?.data?.error || copy.stage3.failed
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    isEditing,
    editableItems,
    savedItems,
    orderId,
    orderDetails,
    pinpoints,
    parseStoreAndCat,
    onOrderUpdated,
    pushMessage,
    feedback,
    customerDisplayName,
  ]);

  return {
    savedItems,
    isEditing,
    editableItems,
    isSaving,
    feedback,
    hasSentConfirmationCard,
    isCustomerConfirmed,
    setIsCustomerConfirmed,
    sentAt,
    startEditing,
    cancelEditing,
    addItem,
    updateItem,
    removeItem,
    categoryGuesses,
    stopIndexFor,
    guessCategoryFor,
    applyCategoryGuess,
    sendToCustomer,
    parseStoreAndCat,
    storeLabelFor,
    storeOptions,
    unassignedCount,
    categoryNameForPin,
  };
}
