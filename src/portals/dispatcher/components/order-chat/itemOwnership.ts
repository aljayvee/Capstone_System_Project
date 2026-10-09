import type { EditableItem } from "./types";

/**
 * Which stores buy which items, for step 2's list grouped by store
 * (2026-10-08).
 *
 * Every store lists every item of the order, ticked where that store buys it.
 * An item ticked at two stores is two lines, one per store, each with its own
 * quantity: that is how the server stores it already (one `storeCategory` per
 * line), so nothing about saving changes. An item no store has ticked keeps one
 * line with no store, shown under "Not assigned yet", and the list cannot be
 * sent until it is ticked somewhere.
 *
 * Pure functions of the lines, so the rules hold the same wherever they are
 * applied and can be read without the screen around them.
 */

/** How the screen reads and writes a line's store. Supplied by useOrderItems. */
export interface OwnershipContext {
  /** The pinned store this line is filed under, by position, or null when none. */
  storeIndexOf: (row: EditableItem) => number | null;
  /** `storeCategory` for this line filed under store `storeIndex`. */
  fileUnder: (row: EditableItem, storeIndex: number) => string;
  /** `storeCategory` for this line with its store taken away and its category kept. */
  unfile: (row: EditableItem) => string;
}

/** One item of the order, with the line each store buys it on. */
export interface ItemLine {
  key: string;
  itemName: string;
  size: string | null;
  notes: string | null;
  /** Line index per store position, for the stores that buy it. */
  rowByStore: Record<number, number>;
  /** The line with no store, when no store buys it. */
  unassignedRow: number | null;
}

/**
 * When two saved lines are the same item bought at two stores.
 *
 * The server keeps no link between the copies, so on opening the list they are
 * found again from what they say.
 */
export function itemIdentity(row: Pick<EditableItem, "itemName" | "size" | "notes">): string {
  // Name and unit: "Coke 1.5 L" and "Coke 330 mL" are two things to buy, while
  // "coke " typed at one store and "Coke" at another are one. Notes are left
  // out on purpose: each line keeps its own (a name edit never touches them),
  // so "Coke, paki cold" at Jollibee and plain "Coke" at 7-Eleven read as one
  // item bought at both, each store's instruction intact.
  const norm = (value: string | null | undefined) => (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  return `${norm(row.itemName)}|${norm(row.size)}`;
}

let keySeed = 0;
/** A key for an item added on this screen. */
export function newItemKey(): string {
  keySeed += 1;
  return `new-${Date.now().toString(36)}-${keySeed}`;
}

/**
 * Gives every line its item's key, found from what it says.
 *
 * One store never holds two lines of one item: a second line of the same item
 * at the same store (an old order, or a customer who listed it twice) is kept
 * as an item of its own, so neither line disappears from the screen.
 */
export function withItemKeys(rows: EditableItem[], ctx: Pick<OwnershipContext, "storeIndexOf">): EditableItem[] {
  const taken = new Set<string>();
  // The name and unit as the item's first line writes them. "coke " at one
  // store and "Coke" at another are one item, shown and saved one way.
  const firstSeen = new Map<string, Pick<EditableItem, "itemName" | "size">>();
  return rows.map((row) => {
    if (row.itemKey) return row;
    const store = ctx.storeIndexOf(row);
    const base = itemIdentity(row);
    let key = base;
    for (let n = 2; taken.has(`${key}@${store ?? "none"}`); n++) key = `${base}#${n}`;
    taken.add(`${key}@${store ?? "none"}`);
    const first = firstSeen.get(key);
    if (!first) {
      firstSeen.set(key, { itemName: row.itemName, size: row.size ?? null });
      return { ...row, itemKey: key };
    }
    return { ...row, ...first, itemKey: key };
  });
}

/** The order's items, each once, in the order they first appear. */
export function itemLines(rows: EditableItem[], ctx: Pick<OwnershipContext, "storeIndexOf">): ItemLine[] {
  const byKey = new Map<string, ItemLine>();
  rows.forEach((row, index) => {
    const key = row.itemKey ?? `row-${index}`;
    let line = byKey.get(key);
    if (!line) {
      line = {
        key,
        itemName: row.itemName,
        size: row.size ?? null,
        notes: row.notes ?? null,
        rowByStore: {},
        unassignedRow: null,
      };
      byKey.set(key, line);
    }
    const store = ctx.storeIndexOf(row);
    if (store === null) line.unassignedRow ??= index;
    else line.rowByStore[store] ??= index;
  });
  return [...byKey.values()];
}

/**
 * Ticks or unticks one item at one store.
 *
 * Ticked: an item no store buys moves there with its quantity; an item another
 * store already buys gets a copy here, starting at 1 (the user's call,
 * 2026-10-08). Unticked: the line goes, unless it is the item's last, which
 * then waits under "Not assigned yet" rather than leaving the order.
 */
export function setOwned(
  rows: EditableItem[],
  key: string,
  storeIndex: number,
  owned: boolean,
  ctx: OwnershipContext
): EditableItem[] {
  const line = itemLines(rows, ctx).find((l) => l.key === key);
  if (!line) return rows;
  const here = line.rowByStore[storeIndex];

  if (owned) {
    if (here !== undefined) return rows;
    if (line.unassignedRow !== null) {
      return rows.map((row, i) => (i === line.unassignedRow ? { ...row, storeCategory: ctx.fileUnder(row, storeIndex) } : row));
    }
    const copies = Object.values(line.rowByStore);
    const source = rows[copies[0]];
    const copy: EditableItem = {
      itemName: source.itemName,
      size: source.size ?? null,
      notes: source.notes ?? null,
      quantity: 1,
      itemKey: key,
    };
    // Beside the item's other lines, not at the end: an item keeps its place in
    // every store's list even after its first line is unticked.
    const at = Math.max(...copies) + 1;
    return [...rows.slice(0, at), { ...copy, storeCategory: ctx.fileUnder(copy, storeIndex) }, ...rows.slice(at)];
  }

  if (here === undefined) return rows;
  const elsewhere = Object.keys(line.rowByStore).length > 1;
  if (elsewhere) return rows.filter((_, i) => i !== here);
  return rows.map((row, i) => (i === here ? { ...row, storeCategory: ctx.unfile(row) } : row));
}

/** The heading's check button: every item at this store, or none. */
export function setOwnedAll(
  rows: EditableItem[],
  storeIndex: number,
  owned: boolean,
  ctx: OwnershipContext
): EditableItem[] {
  return itemLines(rows, ctx).reduce((next, line) => setOwned(next, line.key, storeIndex, owned, ctx), rows);
}

/** A new name, unit or note, on every store's copy of the item at once. */
export function editItem(
  rows: EditableItem[],
  key: string,
  patch: Partial<Pick<EditableItem, "itemName" | "size" | "notes">>
): EditableItem[] {
  return rows.map((row) => (row.itemKey === key ? { ...row, ...patch } : row));
}

/** Every copy of the item gone from the order. */
export function removeItemLines(rows: EditableItem[], key: string): EditableItem[] {
  return rows.filter((row) => row.itemKey !== key);
}

/** What a store heading's check button shows: no item ticked there, some, or every one. */
export function storeTickState(lines: ItemLine[], storeIndex: number): "none" | "some" | "all" {
  const ticked = lines.filter((l) => l.rowByStore[storeIndex] !== undefined).length;
  if (ticked === 0) return "none";
  return ticked === lines.length ? "all" : "some";
}
