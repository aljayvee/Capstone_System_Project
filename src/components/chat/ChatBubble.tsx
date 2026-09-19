import React from "react";
import { formatPeso } from "../../utils/format";
import {
  CheckCheck,
  MapPin,
  Bike,
  User,
  ShieldCheck,
  ClipboardCheck,
  ClipboardList,
  Store,
  Receipt,
  Clock,
  CreditCard,
  Banknote,
  Info,
  Check,
  Trash2,
} from "lucide-react";

export interface ChatMessageData {
  id: string;
  senderId: string;
  senderName: string;
  role: "customer" | "dispatcher" | "system" | "rider";
  type?: "text" | "pinpoints" | "payment_prompt" | "order_confirmation" | "item_deleted" | "rider_assigned" | "system" | "order_submitted";
  systemKind?: string;
  text: string;
  pinpoints?: Array<{ storeName: string; latitude: number; longitude: number }>;
  items?: Array<{ itemName: string; storeCategory?: string; quantity: number }>;
  groupedItems?: Record<string, Array<{ itemName: string; quantity: number; priceNote?: string }>>;
  order?: {
    items?: Array<{ itemName: string; storeCategory?: string; quantity?: number }>;
    deliveryAddress?: string;
    categories?: string[];
    deliveryFee?: number;
    totalUnits?: number;
  };
  deliveryFee?: number;
  totalCost?: number;
  confirmed?: boolean;
  paymentMode?: string;
  timestamp: number;
  [key: string]: any;
}

interface ChatBubbleProps {
  message: ChatMessageData;
  isCurrentUser: boolean;
  currentUserFirstName?: string;
}

interface ParsedErrandItem {
  quantity: number;
  itemName: string;
  storeCategory: string;
}

interface ParsedErrandRequest {
  stores: string[];
  deliverTo: string;
  fee: number | null;
  items: ParsedErrandItem[];
}

function parseOrderSubmitted(message: ChatMessageData): ParsedErrandRequest {
  // 1. If structured order payload exists on message:
  if (message.order && Array.isArray(message.order.items) && message.order.items.length > 0) {
    return {
      stores: message.order.categories || [],
      deliverTo: message.order.deliveryAddress || "",
      fee: message.order.deliveryFee ?? null,
      items: message.order.items.map((i) => ({
        quantity: Number(i.quantity) || 1,
        itemName: String(i.itemName || "").trim(),
        storeCategory: String(i.storeCategory || "General Items").trim(),
      })),
    };
  }

  // 2. If items array directly exists on message:
  if (Array.isArray(message.items) && message.items.length > 0) {
    return {
      stores: message.pinpoints?.map((p) => p.storeName) || [],
      deliverTo: "",
      fee: message.deliveryFee ?? null,
      items: message.items.map((i) => ({
        quantity: Number(i.quantity) || 1,
        itemName: String(i.itemName || "").trim(),
        storeCategory: String(i.storeCategory || "General Items").trim(),
      })),
    };
  }

  // 3. Robust regex fallback parsing from message.text
  const text = message.text || "";
  let stores: string[] = [];
  const storesMatch = text.match(/Stores:\s*(.+?)(?=\s*(?:Deliver to:|Items|Delivery fee|$|\n))/i);
  if (storesMatch) {
    stores = storesMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
  }

  let deliverTo = "";
  const deliverMatch = text.match(/Deliver to:\s*(.+?)(?=\s*(?:Items\s*(?:\(\d+\))?:|Delivery fee|$|\n))/i);
  if (deliverMatch) {
    deliverTo = deliverMatch[1].trim();
  }

  let fee: number | null = null;
  const feeMatch = text.match(/Delivery fee (?:so far)?:\s*₱?([\d,.]+)/i);
  if (feeMatch) {
    fee = parseFloat(feeMatch[1].replace(/,/g, ""));
  }

  const items: ParsedErrandItem[] = [];
  const itemsSectionMatch = text.match(/Items\s*(?:\(\d+\))?:\s*([\s\S]+?)(?=(?:Delivery fee|$))/i);
  if (itemsSectionMatch) {
    const section = itemsSectionMatch[1].trim();
    const rawLines = section.split(/\s*[•\-\*]\s+/).filter(Boolean);
    for (const raw of rawLines) {
      const qtyMatch = raw.match(/^(\d+)\s*[×x]\s*(.+)$/);
      if (qtyMatch) {
        const quantity = parseInt(qtyMatch[1], 10) || 1;
        const rest = qtyMatch[2].trim();
        const catMatch = rest.match(/^(.*?)\s*\(([^)]+)\)$/);
        if (catMatch) {
          items.push({
            quantity,
            itemName: catMatch[1].trim(),
            storeCategory: catMatch[2].trim(),
          });
        } else {
          items.push({
            quantity,
            itemName: rest,
            storeCategory: stores[0] || "General Items",
          });
        }
      }
    }
  }

  return { stores, deliverTo, fee, items };
}

/* ───────────────────────────────────────────────────────────────────────────
   Route board build.

   This file was the worst surface in the console and the reason is structural:
   five of its six message variants invented their own card from scratch. Five
   headers, five body grounds, five ways to mark a status, and between them
   seven gradients (`from-dispatcher-navy-dark to-dispatcher-navy`,
   `from-blue-50 to-indigo-50/60`, `from-slate-900 via-... to-...`), four
   shadow levels including `shadow-inner` and `shadow-2xs`, nesting four deep,
   28 arbitrary pixel type sizes down to 9px, an invalid `py-0.2`, five
   synthetic italics against a font with no italic face imported, and a
   `Sparkles` glyph on system announcements.

   There is one card here now: `ThreadCard`. Every variant passes it a mark, a
   title, a state and a body, and the chrome is decided once. That is most of
   the 610 lines gone and every one of those breaches with it.

   It also carried the console's fifth fabrication. The order-summary fee read
   `formatPeso(Number(message.deliveryFee || 50))`, so a message that arrived
   without a fee quoted the customer FIFTY PESOS out of nowhere, in the card
   whose whole job is stating what they will be charged. A missing fee now
   omits the row, the way the errand-request card already did.
   ─────────────────────────────────────────────────────────────────────────── */

const formatTime = (ts: number) => {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

type CardState = { label: string; tone: "waiting" | "done" | "act"; icon?: React.ReactNode };

const STATE_CLASSES = {
  waiting: "bg-status-waiting-fill text-status-waiting-ink",
  done: "bg-status-done-fill text-status-done-ink",
  act: "bg-status-act-fill text-status-act-ink",
} as const;

/**
 * One card for every structured message in the thread.
 *
 * The header is painted on the field, the body sits on the ground, and the
 * state is the console's own status pair. No gradient, one elevation, and the
 * mark is a bare icon rather than a tinted rounded square.
 */
function ThreadCard({
  mark,
  title,
  detail,
  state,
  timestamp,
  children,
}: {
  mark: React.ReactNode;
  title: string;
  detail?: string;
  state?: CardState;
  timestamp?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto my-3 w-full max-w-[96%] animate-in fade-in duration-200">
      <div className="overflow-hidden rounded-plate border border-edge bg-board-plate shadow-plate">
        <div
          data-on-field
          className="flex flex-wrap items-center justify-between gap-2 bg-board-field px-3 py-2.5 shadow-field"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 text-board-trim">{mark}</span>
            <div className="min-w-0">
              <h4 className="m-0 truncate text-label text-board-plate">{title}</h4>
              {detail ? (
                <p className="m-0 truncate text-label text-board-trim">{detail}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {state ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-micro uppercase ${STATE_CLASSES[state.tone]}`}
              >
                {state.icon}
                {state.label}
              </span>
            ) : null}
            {timestamp ? (
              <span data-figure className="font-mono text-micro text-board-trim">
                {formatTime(timestamp)}
              </span>
            ) : null}
          </div>
        </div>

        {children ? <div className="space-y-3 bg-board-ground p-3">{children}</div> : null}
      </div>
    </div>
  );
}

/** A store or category grouping inside a card. A rule and a gap, not a box. */
function Grouping({
  name,
  count,
  children,
}: {
  name: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2.5 border-b border-hairline pb-1.5">
        <Store size={14} className="shrink-0 text-ink-muted" />
        <span className="min-w-0 flex-1 truncate text-label text-ink">{name}</span>
        {count != null ? (
          <span data-figure className="shrink-0 font-mono text-label tabular-nums text-ink-muted">
            {count} {count === 1 ? "item" : "items"}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** One requested line: how many, what, and what its price depends on. */
function ItemLine({
  quantity,
  itemName,
  note,
}: {
  quantity: number;
  itemName: string;
  note?: string;
}) {
  return (
    <li className="flex items-baseline justify-between gap-2.5 py-1">
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span data-figure className="shrink-0 font-mono text-label tabular-nums text-ink-muted">
          {quantity}&times;
        </span>
        <span className="min-w-0 truncate text-body text-ink" title={itemName}>
          {itemName}
        </span>
      </span>
      {note ? (
        <span className="shrink-0 text-label text-ink-muted">{note}</span>
      ) : null}
    </li>
  );
}

/**
 * Said once, under the basket.
 *
 * Every line used to carry its own "Official receipt upon purchase" caption,
 * so a five-item order repeated the same seven words five times down the right
 * edge of a 38% pane. It is a property of how this product prices things, not
 * of any one item.
 */
function ReceiptNote() {
  return (
    <p className="m-0 text-label text-ink-muted">
      Item prices are settled against the actual receipt, not this list.
    </p>
  );
}

/** The fee line. Rendered only when there is a real figure to render. */
function FeeLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-hairline pt-2">
      <span className="flex items-center gap-2 text-label text-ink">
        <Receipt size={15} className="shrink-0 text-ink-muted" />
        {label}
      </span>
      <span data-figure className="font-mono text-data tabular-nums text-ink">
        {formatPeso(value)}
      </span>
    </div>
  );
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isCurrentUser,
  currentUserFirstName,
}) => {
  // 1. Store-grouped order confirmation
  if (message.type === "order_confirmation") {
    const grouped = message.groupedItems || {};
    const storeKeys = Object.keys(grouped);
    // No invented fallback. A card that states what someone will be charged
    // has to be quoting a real figure or none.
    const fee = message.deliveryFee != null ? Number(message.deliveryFee) : null;

    return (
      <ThreadCard
        mark={<ClipboardCheck size={16} />}
        title="Order summary"
        detail="Grouped by store, with the delivery fee"
        state={
          message.confirmed
            ? { label: "Approved by customer", tone: "done", icon: <Check size={12} /> }
            : { label: "Awaiting customer", tone: "waiting", icon: <Clock size={12} /> }
        }
      >
        {storeKeys.length === 0 ? (
          <ul className="m-0 list-none divide-y divide-hairline p-0">
            {(message.items || []).map((it, idx) => (
              <ItemLine
                key={idx}
                quantity={it.quantity}
                itemName={it.itemName}
              />
            ))}
          </ul>
        ) : (
          storeKeys.map((storeName, idx) => {
            const storeData: any = grouped[storeName];
            const isCategoryGrouped =
              storeData && typeof storeData === "object" && !Array.isArray(storeData);

            return (
              <Grouping key={idx} name={storeName}>
                {isCategoryGrouped ? (
                  <div className="space-y-2">
                    {Object.keys(storeData).map((catName) => {
                      const catItems: any[] = Array.isArray(storeData[catName])
                        ? storeData[catName]
                        : [];
                      return (
                        <div key={catName}>
                          <span className="text-micro uppercase text-ink-muted">{catName}</span>
                          <ul className="m-0 list-none divide-y divide-hairline p-0">
                            {catItems.map((it: any, itemIdx: number) => (
                              <ItemLine
                                key={itemIdx}
                                quantity={it.quantity}
                                itemName={it.itemName}
                                note={it.priceNote}
                              />
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <ul className="m-0 list-none divide-y divide-hairline p-0">
                    {(Array.isArray(storeData) ? storeData : []).map((it: any, itemIdx: number) => (
                      <ItemLine
                        key={itemIdx}
                        quantity={it.quantity}
                        itemName={it.itemName}
                        note={it.priceNote}
                      />
                    ))}
                  </ul>
                )}
              </Grouping>
            );
          })
        )}

        <ReceiptNote />

        {fee != null ? <FeeLine label="Delivery fee, exact and up front" value={fee} /> : null}
      </ThreadCard>
    );
  }

  // 2. Payment method confirmation
  if (message.type === "payment_prompt") {
    return (
      <ThreadCard
        mark={<CreditCard size={16} />}
        title="Payment method"
        detail="Cash on delivery"
        state={{ label: "Confirmed", tone: "done", icon: <Banknote size={12} /> }}
      >
        <p className="m-0 text-body text-ink [overflow-wrap:anywhere]">{message.text}</p>
        <div className="flex items-center justify-between gap-2 border-t border-hairline pt-2">
          <span className="text-label text-ink-muted">Selected method</span>
          <span className="flex items-center gap-1.5 text-label text-ink">
            <Banknote size={15} className="text-ink-muted" />
            Cash on delivery
          </span>
        </div>
      </ThreadCard>
    );
  }

  // 3. An item was removed from the order.
  // The text check reads the message DATA, which historically carried a glyph
  // marker; it does not put one on screen. `type` is the reliable signal and
  // is checked first.
  if (message.type === "item_deleted" || message.text.startsWith("\u{1F5D1}\u{FE0F}")) {
    return (
      <ThreadCard
        mark={<Trash2 size={16} />}
        title="Item removed from the order"
        state={{ label: "Changed", tone: "act" }}
        timestamp={message.timestamp}
      >
        <p className="m-0 text-body text-ink [overflow-wrap:anywhere]">{message.text}</p>
      </ThreadCard>
    );
  }

  // 4. The customer's initial request
  const isOrderSubmitted =
    message.systemKind === "order_submitted" ||
    message.type === "order_submitted" ||
    (typeof message.text === "string" && message.text.includes("ERRAND REQUEST"));

  if (isOrderSubmitted) {
    const parsed = parseOrderSubmitted(message);
    const { stores, deliverTo, fee, items } = parsed;

    // Group items by store category
    const groupedByCategory: Record<string, Array<{ quantity: number; itemName: string }>> = {};
    for (const it of items) {
      const cat = it.storeCategory || stores[0] || "General Items";
      if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
      groupedByCategory[cat].push(it);
    }
    const catKeys = Object.keys(groupedByCategory);
    const totalUnits = items.reduce((sum, it) => sum + it.quantity, 0);

    return (
      <ThreadCard
        mark={<ClipboardList size={16} />}
        title="New errand request"
        detail={
          totalUnits > 0
            ? `${totalUnits} ${totalUnits === 1 ? "item" : "items"}${
                stores.length > 0
                  ? ` across ${stores.length} ${stores.length === 1 ? "store" : "stores"}`
                  : ""
              }`
            : "Submitted by the customer, waiting on review"
        }
        state={{ label: "Pending review", tone: "waiting", icon: <Clock size={12} /> }}
        timestamp={message.timestamp}
      >
        {/* where it comes from and where it goes */}
        {(stores.length > 0 || deliverTo) && (
          <dl className="m-0 space-y-2">
            {stores.length > 0 && (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <dt className="flex shrink-0 items-center gap-1.5 text-micro uppercase text-ink-muted">
                  <Store size={13} />
                  Stores
                </dt>
                <dd className="m-0 flex min-w-0 flex-wrap gap-1.5">
                  {stores.map((cat, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-board-plate px-2 py-0.5 text-label text-ink"
                    >
                      {cat}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {deliverTo && (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <dt className="flex shrink-0 items-center gap-1.5 text-micro uppercase text-ink-muted">
                  <MapPin size={13} />
                  Deliver to
                </dt>
                <dd className="m-0 min-w-0 text-body text-ink [overflow-wrap:anywhere]">
                  {deliverTo}
                </dd>
              </div>
            )}
          </dl>
        )}

        {/* the basket */}
        {catKeys.length === 0 ? (
          <p className="m-0 whitespace-pre-wrap border-t border-hairline pt-2 text-body text-ink">
            {message.text}
          </p>
        ) : (
          catKeys.map((catName, idx) => {
            const catItems = groupedByCategory[catName] || [];
            return (
              <Grouping key={idx} name={catName} count={catItems.length}>
                <ul className="m-0 list-none divide-y divide-hairline p-0">
                  {catItems.map((it, itemIdx) => (
                    <ItemLine
                      key={itemIdx}
                      quantity={it.quantity}
                      itemName={it.itemName}
                    />
                  ))}
                </ul>
              </Grouping>
            );
          })
        )}

        <ReceiptNote />

        {fee !== null && <FeeLine label="Delivery fee, first estimate" value={fee} />}

        <p className="m-0 flex items-center gap-2 rounded-trim bg-status-waiting-fill px-3 py-2 text-label text-status-waiting-ink">
          <Clock size={14} className="shrink-0" />
          Waiting for a dispatcher to review and claim this request.
        </p>
      </ThreadCard>
    );
  }

  // Keyed off the message's own `type`, not its text. Sniffing for a leading
  // emoji broke the moment the message copy stopped using decorative emoji as
  // a marker, which is exactly what happened here. `type` is what a message
  // actually is; the words are free to change without breaking how it renders.
  const isSystemMsg =
    message.role === "system" ||
    message.type === "pinpoints" ||
    message.type === "rider_assigned" ||
    message.type === "system";

  // 5. A system announcement
  if (isSystemMsg) {
    const mark =
      message.type === "pinpoints" ? (
        <MapPin size={16} />
      ) : message.type === "rider_assigned" ? (
        <Bike size={16} />
      ) : (
        <Info size={16} />
      );

    const title =
      message.type === "pinpoints"
        ? "Store locations updated"
        : message.type === "rider_assigned"
          ? "Rider assigned"
          : message.systemKind === "under_review"
            ? "Under review"
            : message.systemKind === "accepted"
              ? "Order accepted"
              : message.systemKind === "declined"
                ? "Order declined"
                : "Update";

    return (
      <ThreadCard mark={mark} title={title} timestamp={message.timestamp}>
        <p className="m-0 whitespace-pre-wrap text-body text-ink [overflow-wrap:anywhere]">
          {message.text}
        </p>
      </ThreadCard>
    );
  }

  // 6. An ordinary message from a person
  return (
    <div
      className={`my-2 flex max-w-[88%] items-end gap-2.5 ${
        isCurrentUser ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
      }`}
    >
      <div
        className={`grid size-7 shrink-0 place-items-center rounded-full ${
          isCurrentUser ? "bg-board-field text-board-plate" : "bg-board-ground text-ink-muted"
        }`}
        title={message.senderName}
        role="img"
        aria-label={message.senderName}
      >
        {isCurrentUser ? <ShieldCheck size={14} /> : <User size={14} />}
      </div>

      {/* min-w-0 is load-bearing: a flex item defaults to `min-width: auto`,
          which floors it at the intrinsic width of its content. One unbroken
          60-character string therefore pushed this column straight past the
          88% cap on the row above and out of the panel. */}
      <div className={`flex min-w-0 flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
        <div className="mb-1 px-1 text-micro uppercase text-ink-muted">
          {isCurrentUser
            ? `${currentUserFirstName || "Dispatcher"} (you)`
            : message.senderName || "Customer"}
        </div>

        <div
          className={`relative min-w-0 max-w-full px-3 py-2 ${
            isCurrentUser
              ? "rounded-plate rounded-br-xs bg-board-field text-board-plate"
              : "rounded-plate rounded-bl-xs border border-edge bg-board-plate text-ink"
          }`}
          {...(isCurrentUser ? { "data-on-field": "" } : {})}
        >
          {/* `anywhere`, not the `break-words` that was here.
              overflow-wrap:break-word wraps a long word at paint time but leaves
              min-content sizing unchanged, so the flex parent still reserved the
              full width and the bubble overflowed anyway. overflow-wrap:anywhere
              shrinks min-content too, and unlike break-all it only breaks when
              a word genuinely does not fit, leaving ordinary prose alone. */}
          <p className="m-0 whitespace-pre-wrap text-body [overflow-wrap:anywhere]">
            {message.text}
          </p>

          <div
            className={`mt-1 flex items-center justify-end gap-1 text-micro ${
              isCurrentUser ? "text-board-trim" : "text-ink-muted"
            }`}
          >
            <span data-figure className="font-mono">
              {formatTime(message.timestamp)}
            </span>
            {isCurrentUser && <CheckCheck size={13} />}
          </div>
        </div>
      </div>
    </div>
  );
};
