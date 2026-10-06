/**
 * My History, as data: which orders belong in it, how they sort, how they
 * search, and what they add up to. No React, so every rule here can be read
 * (and checked) without rendering anything.
 *
 * The rider app's history (RiderMobileApp/src/modules/history) is the parity
 * reference. Two things differ on purpose: a dispatcher closes orders by
 * declining them as well as by seeing them delivered, so cancelled orders are
 * kept; and a dispatcher earns nothing per errand, so the money is the
 * delivery fee and what the customer paid rather than a share.
 */
import type { Errand, ErrandItem } from "../../../../types/errand";
import { formatErrandId } from "../../../../utils/formatErrandId";
import { formatItemLabel } from "../../../../utils/format";

export type Outcome = "delivered" | "cancelled";
export type OutcomeFilter = "all" | Outcome;

/** Underscores and spacing vary between the API and the board's own writes. */
const normalizeStatus = (s: unknown) =>
  String(s ?? "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();

/**
 * How an order ended, or null while it is still open.
 *
 * PASSING BY is the board's own "close without an order" write. The server
 * stores it as CANCELLED, but the list keeps the local value until the next
 * refresh, so it is read as cancelled here too.
 */
export function outcomeOf(errand: Errand): Outcome | null {
  const status = normalizeStatus(errand.status);
  if (status === "DELIVERED" || status === "COMPLETED") return "delivered";
  if (status === "CANCELLED" || status === "PASSING BY") return "cancelled";
  return null;
}

/**
 * The finished orders this dispatcher handled.
 *
 * The owner test is the dispatch log, not the list itself: GET /errands also
 * returns every other dispatcher's cancelled orders, and an order cancelled
 * before anyone claimed it has no log and belongs to nobody's history.
 */
export function myFinishedErrands(errands: Errand[], userId?: number | string | null): Errand[] {
  if (userId == null || userId === "") return [];
  return errands.filter(
    (e) =>
      outcomeOf(e) !== null && e.dispatcherId != null && String(e.dispatcherId) === String(userId)
  );
}

/**
 * When the order ended. deliveredAt first: updatedAt moves whenever a rating or
 * a settlement touches the row, so a week-old delivery would otherwise jump to
 * the top of "newest first".
 */
export function closedAtOf(errand: Errand): string {
  return errand.deliveredAt || errand.completedAt || errand.updatedAt || errand.createdAt;
}

export function formatClosedAt(errand: Errand): string {
  const when = new Date(closedAtOf(errand));
  if (Number.isNaN(when.getTime())) return "Time not recorded";
  return when.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * The delivery fee a delivered order was billed. Null when it was not
 * delivered, or when the server sent no pricing: an unknown figure is never
 * shown, summed or sorted as ₱0.
 */
export function feeOf(errand: Errand): number | null {
  if (outcomeOf(errand) !== "delivered" || !errand.feeBreakdown) return null;
  return errand.feeBreakdown.fees.subtotal;
}

/** What the customer paid for a delivered order: items, fees and tip. */
export function paidOf(errand: Errand): number | null {
  if (outcomeOf(errand) !== "delivered" || !errand.feeBreakdown) return null;
  return errand.feeBreakdown.grandTotal;
}

/**
 * The distance the fee was billed on, in km. Falls back to the routed length
 * when only that was kept, and is null when the trip was never measured.
 */
export function distanceKmOf(errand: Errand): number | null {
  const billed = Number(errand.distanceKm);
  if (errand.distanceKm != null && Number.isFinite(billed) && billed > 0) return billed;
  const routed = Number(errand.routeDistanceMeters);
  if (errand.routeDistanceMeters != null && Number.isFinite(routed) && routed > 0) return routed / 1000;
  return null;
}

export function formatKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

/**
 * True when no road route was ever computed for the trip, so the distance is
 * the pricing fallback rather than a measured road length.
 */
export function isDistanceEstimated(errand: Errand): boolean {
  return !errand.routeProvider;
}

export interface EtaSummary {
  /** "4:10 PM to 4:35 PM", with the date when it falls on another day. */
  window: string;
  /** Computed without a live route or position, so wider than usual. */
  degraded: boolean;
  /** How the delivery landed against it. Null when it was never delivered. */
  verdict: string | null;
}

const parseTime = (value?: string | null) => {
  if (!value) return null;
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? null : time;
};

function minutesText(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

/**
 * The arrival window this order last carried, and where the delivery landed
 * against it.
 *
 * The server keeps recomputing the window while the rider moves and never
 * clears it, so on a finished order it is the LAST estimate the customer saw,
 * not the first promise. The copy says so rather than scoring the run on it.
 */
export function etaOf(errand: Errand): EtaSummary | null {
  const low = parseTime(errand.etaLowAt);
  const high = parseTime(errand.etaHighAt);
  if (!low || !high) return null;

  const closed = parseTime(closedAtOf(errand));
  const clock = (time: Date) => time.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  const sameDay = (time: Date) => !closed || time.toDateString() === closed.toDateString();
  const label = (time: Date) =>
    sameDay(time)
      ? clock(time)
      : time.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  let verdict: string | null = null;
  const delivered = outcomeOf(errand) === "delivered" ? parseTime(errand.deliveredAt || errand.completedAt) : null;
  if (delivered) {
    const lateMinutes = Math.round((delivered.getTime() - high.getTime()) / 60000);
    if (lateMinutes > 0) verdict = `Delivered ${minutesText(lateMinutes)} after it`;
    else if (delivered.getTime() < low.getTime()) verdict = "Delivered before it";
    else verdict = "Delivered inside it";
  }

  return {
    window: `${label(low)} to ${label(high)}`,
    degraded: Boolean(errand.etaIsDegraded),
    verdict,
  };
}

/**
 * Everything a past order can be found by.
 *
 * A week later, an order is remembered by who it was for or where it went far
 * more often than by its route number.
 */
export function searchHaystack(errand: Errand): string {
  return [
    formatErrandId(errand.id),
    errand.id,
    errand.customerName,
    errand.deliveryAddress,
    ...(errand.pinpoints ?? []).map((stop) => stop.storeName),
    // Beyond the rider app's fields: a dispatcher is asked "which order did
    // Juan run?" and is called back from the customer's number.
    errand.riderName,
    errand.customerPhone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Every word must match somewhere, so "gaisano maria" narrows rather than
 * widening the way one joined substring would.
 */
export function matchesQuery(errand: Errand, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = searchHaystack(errand);
  return words.every((word) => haystack.includes(word));
}

export type SortKey =
  | "date-desc"
  | "date-asc"
  | "id"
  | "fee-desc"
  | "fee-asc"
  | "paid-desc"
  | "paid-asc";

export const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "date-desc", label: "Newest first" },
  { key: "date-asc", label: "Oldest first" },
  { key: "id", label: "Errand ID" },
  { key: "fee-desc", label: "Highest fee" },
  { key: "fee-asc", label: "Lowest fee" },
  { key: "paid-desc", label: "Highest paid" },
  { key: "paid-asc", label: "Lowest paid" },
];

const timeOf = (errand: Errand) => new Date(closedAtOf(errand)).getTime() || 0;

/** Orders with no figure go last whichever way the money is sorted. */
function byMoney(get: (e: Errand) => number | null, direction: 1 | -1) {
  return (a: Errand, b: Errand) => {
    const x = get(a);
    const y = get(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return direction * (x - y);
  };
}

export function sortErrands(list: Errand[], key: SortKey): Errand[] {
  // Newest first underneath every other order, so equal fees still read in
  // time order (Array.prototype.sort is stable).
  const byNewest = [...list].sort((a, b) => timeOf(b) - timeOf(a));
  switch (key) {
    case "date-asc":
      return byNewest.reverse();
    case "id":
      return byNewest.sort((a, b) => formatErrandId(a.id).localeCompare(formatErrandId(b.id)));
    case "fee-desc":
      return byNewest.sort(byMoney(feeOf, -1));
    case "fee-asc":
      return byNewest.sort(byMoney(feeOf, 1));
    case "paid-desc":
      return byNewest.sort(byMoney(paidOf, -1));
    case "paid-asc":
      return byNewest.sort(byMoney(paidOf, 1));
    case "date-desc":
    default:
      return byNewest;
  }
}

export interface HistoryItemLine {
  key: string;
  label: string;
  notes: string | null;
  outOfStock: boolean;
}

export interface ItemSection {
  key: string;
  /** The store, or "Other items" / "Items" when the list was never pinned. */
  title: string;
  storeCategory: string | null;
  pinpointId: number | null;
  lines: HistoryItemLine[];
}

/**
 * The shopping list grouped per store, in the order the rider visited them.
 * A port of the rider app's groupItemsByStore, so both screens describe the
 * same order the same way.
 */
export function itemSections(errand: Errand): ItemSection[] {
  const items: ErrandItem[] = errand.pabiliDetails?.length
    ? errand.pabiliDetails
    : errand.pabiliItemRequests ?? [];
  if (items.length === 0) return [];

  const stops = [...(errand.pinpoints ?? [])].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  const toLine = (item: ErrandItem, index: number): HistoryItemLine => {
    const name = formatItemLabel(item.itemName, item.size);
    const quantity = Number(item.quantity ?? 1);
    return {
      key: String(item.id ?? `${item.itemName}-${index}`),
      label: quantity > 1 ? `${name} x${quantity}` : name,
      notes: item.notes?.trim() || null,
      outOfStock: item.fulfillmentStatus === "OUT_OF_STOCK",
    };
  };

  const sections: ItemSection[] = [];
  for (const stop of stops) {
    const forStop = items.filter((item) => item.pinpointId === stop.id);
    if (forStop.length === 0) continue;
    sections.push({
      key: `stop-${stop.id}`,
      title: stop.storeName,
      storeCategory: stop.storeCategory ?? null,
      pinpointId: stop.id,
      lines: forStop.map(toLine),
    });
  }

  const unattached = items.filter(
    (item) => item.pinpointId == null || !stops.some((stop) => stop.id === item.pinpointId)
  );
  if (unattached.length > 0) {
    // No stop, so no category to name: one the dispatcher never chose is not
    // invented here.
    sections.push({
      key: "unattached",
      title: sections.length > 0 ? "Other items" : "Items",
      storeCategory: null,
      pinpointId: null,
      lines: unattached.map(toLine),
    });
  }

  return sections;
}

export interface HistorySummary {
  deliveredCount: number;
  cancelledCount: number;
  /** Delivery fees across delivered orders that carry a figure. */
  feesTotal: number;
  /** Delivered orders with no figure, which feesTotal leaves out. */
  unpricedCount: number;
}

export function summarize(list: Errand[]): HistorySummary {
  let deliveredCount = 0;
  let cancelledCount = 0;
  let feesTotal = 0;
  let unpricedCount = 0;
  for (const errand of list) {
    const outcome = outcomeOf(errand);
    if (outcome === "cancelled") cancelledCount += 1;
    if (outcome !== "delivered") continue;
    deliveredCount += 1;
    const fee = feeOf(errand);
    if (fee == null) unpricedCount += 1;
    else feesTotal += fee;
  }
  return { deliveredCount, cancelledCount, feesTotal, unpricedCount };
}
