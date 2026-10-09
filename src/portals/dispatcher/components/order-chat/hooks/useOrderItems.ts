import { useState, useEffect, useCallback, useMemo } from "react";
import { ref, update } from "firebase/database";
import { toast } from "sonner";
import { database } from "../../../../../firebase/config";
import { apiClient } from "../../../../../services/apiClient";
import { apiService, type ApiItemPlacement } from "../../../../../services/apiService";
import { formatItemLabel } from "../../../../../utils/format";

/** "Sibuyas · 1/2 kg · Note: walang bulok": how the server and the customer app fold a note for display. */
const withNote = (label: string, notes?: string | null) => (notes?.trim() ? `${label} · Note: ${notes.trim()}` : label);
import { useInlineMessage } from "@/components/panel/DispatcherInlineBanner";
import { copy } from "../copy";
import type { EditableItem, StorePinpoint, MerchantCategory, OrderChatMessage } from "../types";
import {
  editItem,
  itemLines,
  newItemKey,
  removeItemLines,
  setOwned,
  setOwnedAll,
  withItemKeys,
  type OwnershipContext,
} from "../itemOwnership";
// clean: illegal Firebase RTDB key characters . # $ / [ ] become spaces.
import { clean, resolveStoreIndex } from "../storeLabel";
import type { PostCardOptions } from "./useOrderChat";

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

/** How long the list must sit still before its suggestions are re-read and shown. */
const RECOMMEND_AFTER_MS = 1200;

interface UseOrderItemsArgs {
  orderId: string;
  orderDetails: any;
  customerDisplayName: string;
  pinpoints: StorePinpoint[];
  merchantCategories: MerchantCategory[];
  messages: OrderChatMessage[];
  onOrderUpdated: (errand: any) => void;
  pushMessage: (payload: Record<string, any>) => void;
  /** One order summary in the chat, updated or moved (useOrderChat.postCard). */
  postCard: UseOrderChatPostCard;
}

type UseOrderChatPostCard = (
  card: Record<string, any> & { type: string },
  opts: PostCardOptions
) => Promise<{ moved: boolean }>;

export function useOrderItems({
  orderId,
  orderDetails,
  customerDisplayName,
  pinpoints,
  merchantCategories,
  messages,
  onOrderUpdated,
  pushMessage,
  postCard,
}: UseOrderItemsArgs) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSentConfirmationCard, setHasSentConfirmationCard] = useState(false);
  const [isCustomerConfirmed, setIsCustomerConfirmed] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  /**
   * Where each item should be bought, keyed by its item key (itemOwnership.ts).
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
  const [categoryGuesses, setCategoryGuesses] = useState<Record<string, ApiItemPlacement>>({});
  const feedback = useInlineMessage();

  const savedItems: any[] =
    (orderDetails?.pabiliDetails?.length ? orderDetails.pabiliDetails : orderDetails?.pabiliItemRequests) || [];

  /**
   * The list card the customer has now: the latest one. An earlier card was
   * replaced by it, so neither its time nor its approval says anything about
   * the list in front of them. This read the first card for both, so a
   * customer who approved an old list read as having approved the new one.
   */
  const latestCard = useMemo(
    () => [...messages].reverse().find((m: any) => m.type === "order_confirmation") ?? null,
    [messages]
  );

  // The customer's approval arrives two ways: a socket event, and the card
  // itself flipping `confirmed` in RTDB. Watch the messages for the latter.
  useEffect(() => {
    if (!latestCard) return;
    setHasSentConfirmationCard(true);
    // Updated in place keeps its first timestamp; the update is when it was last sent.
    const at = latestCard.updatedAt ?? latestCard.timestamp;
    if (typeof at === "number") setSentAt(at);
    if (latestCard.confirmed === true) setIsCustomerConfirmed(true);
  }, [latestCard]);

  /**
   * The stores were changed and sent again after the customer saw the list.
   *
   * Step 2 used to stay "sent", or "approved", across a change to step 1: the
   * customer approved a list for stores that were no longer the plan, and the
   * dispatcher was let through to send a rider on it (2026-10-10). The card
   * records the stores it was built for, so compare them with the stores saved
   * now. Saved, not the pins on screen: re-pinning in step 1 only changes what
   * the customer was told once the new stores are sent.
   */
  const savedPins: any[] = Array.isArray(orderDetails?.pinpoints) ? orderDetails.pinpoints : [];
  const pinsKey = (pins: any[]) =>
    pins
      .filter((p) => Number.isFinite(Number(p?.latitude)) && Number.isFinite(Number(p?.longitude)))
      .map(
        (p) =>
          `${clean(p?.storeName || "Store").toLowerCase()}@${Number(p.latitude).toFixed(5)},${Number(p.longitude).toFixed(5)}`
      )
      .join("|");
  const storesChangedSinceSent = Boolean(
    latestCard &&
      Array.isArray(latestCard.pinpoints) &&
      savedPins.length > 0 &&
      pinsKey(latestCard.pinpoints) !== pinsKey(savedPins)
  );

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

  /**
   * Which pinned store a line is filed under, by position, or null when none.
   *
   * By the store's name, not its "Store N" number (resolveStoreIndex): the
   * number goes stale the moment step 1's stores change. A label naming no
   * pinned store is no store at all, so its item waits under "Not assigned yet".
   */
  const storeIndexOf = useCallback(
    (row: Pick<EditableItem, "storeCategory">): number | null => {
      const { store, assigned } = parseStoreAndCat(row.storeCategory);
      if (!assigned || pinpoints.length === 0) return null;
      return resolveStoreIndex(store, pinpoints.map((pin) => pin.storeName || ""));
    },
    [parseStoreAndCat, pinpoints]
  );

  const ownership = useMemo<OwnershipContext>(
    () => ({
      storeIndexOf,
      // A pin keeps its own category (categoryNameForPin): a line filed there follows it.
      fileUnder: (row, storeIndex) =>
        formatStoreAndCat(
          storeLabelFor(storeIndex),
          categoryNameForPin(pinpoints[storeIndex]) || parseStoreAndCat(row.storeCategory).category
        ),
      unfile: (row) => ` | ${clean(parseStoreAndCat(row.storeCategory).category) || "General"}`,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeIndexOf, pinpoints, merchantCategories, parseStoreAndCat]
  );

  /** Items the dispatcher still has to place, when placing them is a real choice. */
  const unassignedCount =
    pinpoints.length === 0
      ? 0
      : (isEditing ? editableItems : savedItems).filter((it: any) => storeIndexOf(it) === null).length;

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
    async (targets: Array<{ key: string; name: string }>) => {
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
            next[target.key] = placement;
          } else {
            // Cleared rather than left stale: a row whose name has been
            // rewritten since the last guess must not keep showing the old one.
            delete next[target.key];
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
    (key: string, name: string) => {
      void guessCategories([{ key, name }]);
    },
    [guessCategories]
  );

  /** One target per item, not per store's copy of it: the answer is the same. */
  const guessTargets = (rows: EditableItem[]) =>
    itemLines(rows, ownership).map((line) => ({ key: line.key, name: line.itemName || "" }));
  const startEditing = useCallback(() => {
    const rows: EditableItem[] = savedItems.map((d: any) => ({
      itemName: d.itemName,
      storeCategory: d.storeCategory || undefined,
      quantity: d.quantity || 1,
      size: d.size ?? null,
      notes: d.notes ?? null,
      // What the rider reported, so the always-open list can show an out of
      // stock line where it is edited. Never sent back: see sendToCustomer.
      id: d.id != null ? Number(d.id) : undefined,
      fulfillmentStatus: d.fulfillmentStatus || undefined,
    }));
    const keyed = withItemKeys(rows, ownership);
    setEditableItems(keyed);
    setCategoryGuesses({});
    setIsEditing(true);
    // One batched call for the whole basket, so every row's suggestion is ready
    // by the time the dispatcher has finished reading the first one.
    void guessCategories(guessTargets(keyed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedItems, guessCategories, ownership]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditableItems([]);
    setCategoryGuesses({});
  }, []);

  /**
   * A new, empty item, bought at the store whose group it was added in. With no
   * store named it waits under "Not assigned yet", unless one store is pinned.
   */
  const addItem = useCallback(
    (storeIndex?: number) => {
      setEditableItems((prev) => {
        const row: EditableItem = {
          itemName: "",
          quantity: 1,
          size: null,
          itemKey: newItemKey(),
          storeCategory: ` | ${clean(defaultCategory())}`,
        };
        const at = storeIndex ?? (pinpoints.length === 1 ? 0 : null);
        return [...prev, at === null ? row : { ...row, storeCategory: ownership.fileUnder(row, at) }];
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pinpoints, merchantCategories, ownership]
  );

  /**
   * Adds an item picked in the Catalog Helper, filed under the right pinned stop.
   *
   * The stop is the pin with the same shop name when the suggestion names a
   * shop (a crawled menu, a past errand), else the only pin of the item's
   * category. Otherwise the row gets the category and no shop, the unassigned
   * state stage 3 already asks about, rather than a guessed shop. Returns the
   * stop's label, or null when the dispatcher still has to pick one.
   *
   * Replaces an addItem-then-setTimeout-updateItem sequence that read the row
   * count from before editing opened: from a closed list it overwrote the
   * FIRST saved item's name with the pick instead of adding a row.
   */
  const addCatalogItem = useCallback(
    (pick: { itemName: string; storeName: string; categoryName: string }): string | null => {
      const wanted = clean(pick.storeName).toLowerCase();
      let stop = wanted
        ? pinpoints.findIndex((pin) => {
            const name = clean(pin.storeName || "").toLowerCase();
            return Boolean(name) && (name === wanted || name.includes(wanted) || wanted.includes(name));
          })
        : -1;
      if (stop < 0) {
        const sameKind = pinpoints
          .map((pin, i) => ({ i, category: categoryNameForPin(pin) }))
          .filter((p) => p.category === pick.categoryName);
        if (sameKind.length === 1) stop = sameKind[0].i;
      }
      const store = stop >= 0 ? storeLabelFor(stop) : "";
      // A pin keeps its own category (see categoryNameForPin): the row follows it.
      const category = (stop >= 0 && categoryNameForPin(pinpoints[stop])) || pick.categoryName;
      setEditableItems((prev) => [
        ...prev,
        { itemName: pick.itemName, quantity: 1, size: null, storeCategory: `${store} | ${category}`, itemKey: newItemKey() },
      ]);
      return stop >= 0 ? store : null;
    },
    [pinpoints, merchantCategories]
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
    (key: string) => {
      const placement = categoryGuesses[key];
      if (!placement?.categoryName) return;
      const stopIndex = stopIndexFor(placement);

      setEditableItems((prev) => {
        // The suggested store ticked, which moves an item no store buys there.
        if (stopIndex >= 0) return setOwned(prev, key, stopIndex, true, ownership);
        // No pinned store fits: the category alone, on the line waiting for one.
        return prev.map((row) =>
          row.itemKey === key && ownership.storeIndexOf(row) === null
            ? { ...row, storeCategory: ` | ${clean(placement.categoryName)}` }
            : row
        );
      });
    },
    [categoryGuesses, stopIndexFor, ownership]
  );
  // ── recommendations that keep up with the list ──────────────────────────
  /**
   * Whether the store suggestions on screen belong to the list as it is now.
   *
   * The list is re-read a moment after it stops changing (a name typed, a row
   * added or removed, a store pinned in step 3), and stage 4 keeps every
   * suggestion hidden until that answer is in. Before this, suggestions were
   * asked for on blur only, so they described the list as it was a few edits
   * ago, and a "store needed" warning flashed on rows whose answer had not
   * arrived yet. The countdown is invisible on purpose: it is the time a
   * dispatcher takes to finish typing, not something to wait for.
   */
  const [recommendationsReady, setRecommendationsReady] = useState(false);
  const rowsSignature = editableItems.map((row) => (row.itemName || "").trim().toLowerCase()).join("\u0001");
  const pinsSignature = pinpoints.map((p) => `${p.storeName}#${p.categoryId ?? ""}`).join("\u0001");

  useEffect(() => {
    setRecommendationsReady(false);
    if (!isEditing) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      await guessCategories(guessTargets(editableItems));
      if (!cancelled) setRecommendationsReady(true);
    }, RECOMMEND_AFTER_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // editableItems is represented by rowsSignature: a quantity change does not re-ask.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, rowsSignature, pinsSignature, guessCategories]);

  const updateItem = useCallback((index: number, patch: Partial<EditableItem>) => {
    setEditableItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }, []);

  /** The item gone from the order: every store's copy of it. */
  const removeItem = useCallback(
    (key: string) => {
      const copies = editableItems.filter((row) => row.itemKey === key);
      const item = copies[0];
      const itemName = formatItemLabel(item?.itemName, item?.size);
      const qty = copies.reduce((sum, row) => sum + (row.quantity || 1), 0) || 1;
      const stores = copies
        .map((row) => ownership.storeIndexOf(row))
        .filter((at): at is number => at !== null)
        .map((at) => clean(pinpoints[at]?.storeName || `Store ${at + 1}`));
      const where = stores.length > 0 ? ` from ${stores.join(" and ")}` : "";

      setEditableItems((prev) => removeItemLines(prev, key));
      setCategoryGuesses((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      // Removing something the customer asked for is a change to their order,
      // not a private edit — they get told in the chat.
      if (item && itemName && orderId) {
        try {
          pushMessage({
            type: "item_deleted",
            text: `The item "${itemName}" (Qty: ${qty})${where} was removed from your order.`,
          });
          feedback.showSuccess(copy.stage3.removedNotice(itemName));
        } catch (err) {
          console.error("Failed to send item deletion notification:", err);
          feedback.showError(`"${itemName}" was removed, but they couldn't be notified.`);
        }
      }
    },
    [editableItems, orderId, ownership, pinpoints, pushMessage, feedback]
  );

  /** Ticks or unticks one item at one store (itemOwnership.setOwned). */
  const setItemOwned = useCallback(
    (key: string, storeIndex: number, owned: boolean) => {
      setEditableItems((prev) => setOwned(prev, key, storeIndex, owned, ownership));
    },
    [ownership]
  );

  /** A store heading's check button: every item bought there, or none. */
  const setStoreOwnsAll = useCallback(
    (storeIndex: number, owned: boolean) => {
      setEditableItems((prev) => setOwnedAll(prev, storeIndex, owned, ownership));
    },
    [ownership]
  );

  /** A new name or unit, on every store's copy of the item. */
  const editItemFields = useCallback(
    (key: string, patch: Partial<Pick<EditableItem, "itemName" | "size" | "notes">>) => {
      setEditableItems((prev) => editItem(prev, key, patch));
    },
    []
  );

  /** The order's items, each once, with the line each store buys it on. */
  const lines = useMemo(() => itemLines(editableItems, ownership), [editableItems, ownership]);

  /**
   * The working list differs from the one saved on the order.
   *
   * The list is always open for editing now, so "editing" no longer means
   * "changed". This is what decides whether there is anything to send: a list
   * the customer already has, untouched, needs no button.
   */
  const rowKey = (it: any) =>
    [
      (it?.itemName || "").trim().toLowerCase(),
      Math.max(1, Number(it?.quantity) || 1),
      clean(it?.storeCategory || ""),
      (it?.size || "").trim().toLowerCase(),
      (it?.notes || "").trim().toLowerCase(),
    ].join(" || ");
  const hasUnsentChanges =
    isEditing &&
    (editableItems.length !== savedItems.length ||
      editableItems.some((row, i) => rowKey(row) !== rowKey(savedItems[i])));

  // ── send ────────────────────────────────────────────────────────────────
  /** Resolves true once the list is saved and the card is in the chat. */
  const sendToCustomer = useCallback(async (): Promise<boolean> => {
    const rawItems = isEditing && editableItems.length > 0 ? editableItems : savedItems;

    const sanitized = rawItems
      .map((it: any) => ({
        itemName: (it.itemName || "").trim(),
        // Rewritten from the stores pinned now, not copied from the saved label.
        // A label keeps the number and name of the store it was filed under;
        // once step 1's stores change, an untouched item's label named a store
        // that was gone or had moved, and the card the customer approved showed
        // it as a fourth store (2026-10-10). Resolving by name and writing the
        // label afresh keeps every saved label in step with the pins.
        storeCategory: (() => {
          const at = storeIndexOf(it);
          return at === null
            ? clean(it.storeCategory || defaultStore()) || "Store 1"
            : ownership.fileUnder(it, at);
        })(),
        quantity: Math.max(1, Number(it.quantity) || 1),
        // Always sent, null when cleared: a row that omits size keeps the
        // stored one on the server (pabiliDetailRepository.replaceForErrand).
        size: (it.size || "").trim() || null,
        notes: (it.notes || "").trim() || null,
      }))
      .filter((it: any) => it.itemName.length > 0);

    if (sanitized.length === 0) {
      toast.error(copy.stage3.needsOne);
      return false;
    }

    setIsSaving(true);
    feedback.dismiss();
    try {
      const res = await apiClient.patch(`/errands/${orderId}/items`, { items: sanitized });
      const updatedErrand = res.data?.errand || res.data;
      onOrderUpdated(updatedErrand);
      setIsEditing(false);

      // Store > Category > Items, for the card the customer approves. In the
      // pins' visit order, so the card numbers its stores as step 1 does.
      const nestedGrouped: Record<string, Record<string, any[]>> = {};
      const storeOrder = (it: any) => storeIndexOf(it) ?? Number.MAX_SAFE_INTEGER;
      [...sanitized].sort((a: any, b: any) => storeOrder(a) - storeOrder(b)).forEach((it: any) => {
        const { store, category } = parseStoreAndCat(it.storeCategory);
        const s = clean(store) || "Store 1";
        const c = clean(category) || "General";
        if (!nestedGrouped[s]) nestedGrouped[s] = {};
        if (!nestedGrouped[s][c]) nestedGrouped[s][c] = [];
        nestedGrouped[s][c].push({
          itemName: withNote(formatItemLabel(it.itemName, it.size), it.notes),
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

      // One order summary in the chat: updated where it stands, or moved to the
      // bottom when buried, with the payment card following it down. The
      // approval is reset either way (confirmed: false): a changed list is a
      // new question, and the customer's Approve button comes back for it.
      await postCard(
        {
          type: "order_confirmation",
          text: "Here is your order breakdown and delivery fee. Please review and approve.",
          pinpoints: sanitizedPinpoints,
          // The chat card is a display snapshot no client parses back, so the
          // label goes in itemName and every app version shows the size.
          items: sanitized.map((it: any) => ({ ...it, itemName: withNote(formatItemLabel(it.itemName, it.size), it.notes) })),
          groupedItems: nestedGrouped,
          storeGroups: flatStoreGroups,
          deliveryFee,
          totalCost,
          feeBreakdown,
          confirmed: false,
          status: "pending",
        },
        { updatedNotice: copy.chatCards.listUpdated, followers: ["payment_prompt"] }
      );

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
      return true;
    } catch (err: any) {
      console.error("Failed to save updated items:", err);
      feedback.showError(
        err.response?.data?.message || err.response?.data?.error || copy.stage3.failed
      );
      return false;
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
    storeIndexOf,
    ownership,
    onOrderUpdated,
    postCard,
    feedback,
    customerDisplayName,
  ]);

  return {
    savedItems,
    isEditing,
    editableItems,
    hasUnsentChanges,
    isSaving,
    feedback,
    // A card built for other stores is no longer the list: step 2 asks for it
    // again, and an approval of it does not count (storesChangedSinceSent).
    hasSentConfirmationCard: hasSentConfirmationCard && !storesChangedSinceSent,
    isCustomerConfirmed: isCustomerConfirmed && !storesChangedSinceSent,
    storesChangedSinceSent,
    setIsCustomerConfirmed,
    sentAt,
    startEditing,
    cancelEditing,
    addItem,
    addCatalogItem,
    updateItem,
    removeItem,
    categoryGuesses,
    stopIndexFor,
    guessCategoryFor,
    applyCategoryGuess,
    recommendationsReady,
    sendToCustomer,
    parseStoreAndCat,
    storeLabelFor,
    storeOptions,
    unassignedCount,
    categoryNameForPin,
    storeIndexOf,
    lines,
    setItemOwned,
    setStoreOwnsAll,
    editItemFields,
    pushMessage,
    onOrderUpdated,
  };
}
