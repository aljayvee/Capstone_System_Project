import { useState, useEffect, useCallback } from "react";
import { ref, update } from "firebase/database";
import { toast } from "sonner";
import { database } from "../../../../../firebase/config";
import { apiClient } from "../../../../../services/apiClient";
import { useInlineMessage } from "../../ui/DispatcherInlineBanner";
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
  // A pin categorised in stage 2 IS that category — a Jollibee pinned as Fast
  // Food doesn't stop being Fast Food when an item gets filed under it here.
  const pinIndexFromStoreLabel = (label: string): number => {
    const match = /^Store (\d+)/.exec(label || "");
    return match ? Number(match[1]) - 1 : -1;
  };

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
  const startEditing = useCallback(() => {
    setEditableItems(
      savedItems.map((d: any) => ({
        itemName: d.itemName,
        storeCategory: d.storeCategory || undefined,
        quantity: d.quantity || 1,
      }))
    );
    setIsEditing(true);
  }, [savedItems]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditableItems([]);
  }, []);

  const addItem = useCallback(
    (storeName?: string, catName?: string) => {
      setEditableItems((prev) => [
        ...prev,
        {
          itemName: "",
          quantity: 1,
          storeCategory: formatStoreAndCat(
            storeName || defaultStore(),
            catName || defaultCategory()
          ),
        },
      ]);
    },
    [pinpoints, merchantCategories]
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
        text: "Here's your order breakdown and delivery fee — please review and approve.",
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
    sendToCustomer,
    parseStoreAndCat,
    storeLabelFor,
    storeOptions,
    unassignedCount,
    categoryNameForPin,
  };
}
