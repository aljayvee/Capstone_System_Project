import type { ReactNode } from "react";
import { AlertTriangle, Check, ChevronRight, Minus, Plus, Store, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { formatItemLabel } from "../../../../utils/format";
import { ItemAutocompleteInput } from "./ItemAutocompleteInput";
import { copy } from "./copy";
import { storeTickState, type ItemLine } from "./itemOwnership";
import type { EditableItem } from "./types";

/**
 * Step 2's list, grouped by store (2026-10-08).
 *
 * Each store lists only the items it buys (2026-10-10). Every store used to
 * list every item of the order, ticked or not, so a three-store order showed
 * each item three times, mostly as unticked rows. Which store buys what is
 * chosen in the store's dialog (StoreItemsDialog), opened from its heading;
 * Stage3ConfirmItems says what each tick did. Items no store buys wait at the
 * top, under "Not assigned yet".
 */

export interface StoreColumn {
  /** The pin's own name, without the "Store N - " label. */
  name: string;
  category: string | null;
}

interface ItemsByStoreProps {
  stores: StoreColumn[];
  lines: ItemLine[];
  rows: EditableItem[];
  /** "Buy at" on an item no store buys yet. */
  onTick: (key: string, storeIndex: number, owned: boolean) => void;
  onEditItem: (key: string, patch: Partial<Pick<EditableItem, "itemName" | "size">>) => void;
  /** A store's quantity: its own line's. */
  onQuantity: (rowIndex: number, quantity: number) => void;
  onRemove: (key: string) => void;
  onAdd: (storeIndex: number) => void;
  onOpenStore: (storeIndex: number) => void;
  /** The name has stopped changing: ask again where it is bought. */
  onNameSettled: (key: string, name: string) => void;
  /** What the rider reported on one store's line (out of stock), under it. */
  renderLineExtras?: (rowIndex: number) => ReactNode;
  /** The suggestion and "store needed" card for an item no store buys. */
  renderUnassignedExtras?: (line: ItemLine) => ReactNode;
}

/** A tick box with a third, partial state for a store heading. */
export function TickBox({
  state,
  label,
  onToggle,
  disabled = false,
}: {
  state: "none" | "some" | "all";
  label: string;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const on = state !== "none";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "some" ? "mixed" : state === "all"}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onToggle}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-trim transition-colors hover:bg-board-ground disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={cn(
          "grid size-5 place-items-center rounded-sm border transition-colors",
          on ? "border-board-field bg-board-field text-board-plate" : "border-edge bg-board-plate"
        )}
      >
        {state === "all" ? <Check size={12} strokeWidth={3} /> : state === "some" ? <Minus size={12} strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

function QtyStepper({ value, onChange, label }: { value: number; onChange: (next: number) => void; label: string }) {
  return (
    <div className="flex shrink-0 items-center rounded-trim border border-edge bg-board-plate" aria-label={label}>
      <button
        type="button"
        aria-label={`One fewer ${label}`}
        onClick={() => onChange(Math.max(1, value - 1))}
        className="grid size-9 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:text-ink"
      >
        <Minus size={14} />
      </button>
      <span data-figure className="w-6 text-center font-mono text-data font-bold tabular-nums text-ink">
        {value}
      </span>
      <button
        type="button"
        aria-label={`One more ${label}`}
        onClick={() => onChange(value + 1)}
        className="grid size-9 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:text-ink"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

const UNIT_INPUT =
  "min-h-9 w-20 shrink-0 rounded-trim border border-edge bg-board-plate px-2 text-label font-mono tabular-nums text-ink placeholder:text-ink-muted";

export function ItemsByStore({
  stores,
  lines,
  rows,
  onTick,
  onEditItem,
  onQuantity,
  onRemove,
  onAdd,
  onOpenStore,
  onNameSettled,
  renderLineExtras,
  renderUnassignedExtras,
}: ItemsByStoreProps) {
  const unassigned = lines.filter((line) => line.unassignedRow !== null);
  const nameOf = (line: ItemLine) => line.itemName.trim() || copy.stage3.unnamedItem;

  /** The name and unit, editable: the same item at every store. */
  const editors = (line: ItemLine) => (
    <>
      <ItemAutocompleteInput
        value={line.itemName}
        onChange={(itemName) => onEditItem(line.key, { itemName })}
        onSelectSuggestion={(s) => {
          onEditItem(line.key, { itemName: s.itemName });
          onNameSettled(line.key, s.itemName);
        }}
        onBlur={(e) => onNameSettled(line.key, e.target.value)}
        placeholder={copy.stage3.itemPlaceholder}
      />
      <input
        type="text"
        value={line.size ?? ""}
        onChange={(e) => onEditItem(line.key, { size: e.target.value })}
        maxLength={40}
        aria-label={`${copy.stage3.sizeLabel} of ${nameOf(line)}`}
        placeholder={copy.stage3.sizePlaceholder}
        className={UNIT_INPUT}
      />
    </>
  );

  const removeButton = (line: ItemLine) => (
    <button
      type="button"
      aria-label={copy.stage3.removeFromOrder(nameOf(line))}
      title={copy.stage3.removeFromOrder(nameOf(line))}
      onClick={() => onRemove(line.key)}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:bg-status-act-fill hover:text-status-act-ink"
    >
      <Trash2 size={14} />
    </button>
  );

  return (
    <div className="space-y-3">
      {unassigned.length > 0 && (
        <section
          aria-label={copy.stage3.notAssignedTitle}
          className="overflow-hidden rounded-plate border border-status-waiting-ink/40 bg-status-waiting-fill"
        >
          <header className="flex items-start gap-2 px-3 py-2.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-status-waiting-ink" />
            <h4 className="m-0 min-w-0 text-label font-bold text-status-waiting-ink">
              {copy.stage3.notAssignedTitle} ({unassigned.length})
            </h4>
          </header>
          <div className="divide-y divide-hairline bg-board-plate">
            {unassigned.map((line) => {
              const row = rows[line.unassignedRow!];
              return (
                <div key={line.key} className="p-2.5">
                  <div className="flex items-center gap-2">
                    {editors(line)}
                    <QtyStepper
                      value={row.quantity}
                      onChange={(quantity) => onQuantity(line.unassignedRow!, quantity)}
                      label={nameOf(line)}
                    />
                    {removeButton(line)}
                  </div>
                  {stores.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-micro font-medium text-ink-muted">{copy.stage3.buyAt}</span>
                      {stores.map((store, storeIndex) => (
                        <button
                          key={storeIndex}
                          type="button"
                          onClick={() => onTick(line.key, storeIndex, true)}
                          className="max-w-[180px] cursor-pointer truncate rounded-trim border border-edge bg-board-ground px-2 py-1 text-label text-ink transition-colors hover:border-board-field"
                        >
                          {store.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {renderUnassignedExtras?.(line)}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {stores.map((store, storeIndex) => {
        const ownedLines = lines.filter((line) => line.rowByStore[storeIndex] !== undefined);
        const owned = ownedLines.length;
        return (
          <section
            key={storeIndex}
            aria-label={store.name}
            className="overflow-hidden rounded-plate border border-edge bg-board-plate"
            data-testid={`store-group-${storeIndex}`}
          >
            <header className="flex items-center gap-1 border-b border-hairline bg-board-ground/50 py-1 pl-1 pr-1">
              <button
                type="button"
                onClick={() => onOpenStore(storeIndex)}
                aria-label={copy.stage3.openStore(store.name)}
                className="group flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-trim px-2 text-left transition-colors hover:bg-board-plate"
              >
                <Store size={15} className="shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label font-bold text-ink">
                    <span className="font-mono tabular-nums text-ink-muted">{storeIndex + 1}.</span> {store.name}
                  </span>
                  <span className="block truncate text-micro text-ink-muted">
                    {[store.category, copy.stage3.storeCount(owned, lines.length)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {/* Named, not just a chevron: the dialog is now the only place
                    an item is ticked at a store. */}
                <span className="shrink-0 text-micro font-semibold uppercase tracking-[0.06em] text-ink-muted group-hover:text-ink">
                  {copy.stage3.chooseItems}
                </span>
                <ChevronRight size={15} className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
              </button>
            </header>

            {lines.length === 0 ? (
              <p className="m-0 px-3 py-3 text-body text-ink-muted">{copy.stage3.noItemsYet}</p>
            ) : ownedLines.length === 0 ? (
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <p className="m-0 min-w-0 flex-1 text-body text-ink-muted">{copy.stage3.nothingAtStore(store.name)}</p>
                <DispatcherButton type="button" variant="secondary" size="sm" className="font-semibold" onClick={() => onOpenStore(storeIndex)}>
                  {copy.stage3.chooseItems}
                </DispatcherButton>
              </div>
            ) : (
              <div className="divide-y divide-hairline">
                {ownedLines.map((line) => {
                  const rowIndex = line.rowByStore[storeIndex];
                  return (
                    <div key={line.key} className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        {editors(line)}
                        <QtyStepper
                          value={rows[rowIndex].quantity}
                          onChange={(quantity) => onQuantity(rowIndex, quantity)}
                          label={nameOf(line)}
                        />
                        {removeButton(line)}
                      </div>
                      {renderLineExtras?.(rowIndex)}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => onAdd(storeIndex)}
              className="flex min-h-9 w-full cursor-pointer items-center justify-center gap-1.5 border-t border-dashed border-edge bg-board-ground/40 text-micro font-bold uppercase tracking-[0.06em] text-ink-muted transition-colors hover:bg-board-ground hover:text-ink"
            >
              <Plus size={14} /> {copy.stage3.addItemTo(store.name)}
            </button>
          </section>
        );
      })}
    </div>
  );
}

/**
 * The items one store buys, from its heading: every item of the order,
 * ticked where this store buys it. The same choice as the list, in one place.
 */
export function StoreItemsDialog({
  open,
  onOpenChange,
  store,
  storeIndex,
  stores,
  lines,
  rows,
  onTick,
  onTickAll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: StoreColumn | null;
  storeIndex: number;
  stores: StoreColumn[];
  lines: ItemLine[];
  rows: EditableItem[];
  onTick: (key: string, storeIndex: number, owned: boolean) => void;
  onTickAll: (storeIndex: number, owned: boolean) => void;
}) {
  if (!store) return null;
  const tick = storeTickState(lines, storeIndex);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-surface="dispatch"
        aria-describedby={undefined}
        className="rounded-modal border border-edge bg-board-plate shadow-plate"
      >
        <DialogHeader>
          <DialogTitle className="flex min-w-0 items-center gap-2 text-panel font-bold text-ink">
            <Store size={18} className="shrink-0 text-ink-muted" />
            <span className="truncate">{copy.stage3.dialogTitle(store.name)}</span>
          </DialogTitle>
          <DialogClose
            aria-label="Close this dialog"
            className="grid size-9 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:bg-board-ground hover:text-ink"
          >
            <X size={18} />
          </DialogClose>
        </DialogHeader>
        {lines.length === 0 ? (
          <p className="m-0 py-2 text-body text-ink-muted">{copy.stage3.noItemsYet}</p>
        ) : (
          <div className="max-h-[50vh] divide-y divide-hairline overflow-y-auto rounded-plate border border-edge">
            {lines.map((line) => {
              const rowIndex = line.rowByStore[storeIndex];
              const isOwned = rowIndex !== undefined;
              const name = line.itemName.trim() || copy.stage3.unnamedItem;
              const elsewhere = Object.keys(line.rowByStore)
                .map(Number)
                .filter((at) => at !== storeIndex)
                .map((at) => stores[at]?.name)
                .filter(Boolean);
              return (
                <div key={line.key} className="flex items-center gap-2 px-1 py-1">
                  <TickBox
                    state={isOwned ? "all" : "none"}
                    label={isOwned ? copy.stage3.untickAt(name, store.name) : copy.stage3.tickAt(name, store.name)}
                    onToggle={() => onTick(line.key, storeIndex, !isOwned)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-body", isOwned ? "text-ink" : "text-ink-muted")}>
                      {formatItemLabel(name, line.size)}
                    </span>
                    <span className="block truncate text-micro text-ink-muted">
                      {line.unassignedRow !== null
                        ? copy.stage3.notAssignedTitle
                        : elsewhere.length > 0
                          ? (isOwned ? copy.stage3.alsoAt : copy.stage3.boughtAt)(elsewhere.join(", "))
                          : null}
                    </span>
                  </span>
                  {isOwned && (
                    <span data-figure className="shrink-0 pr-2 font-mono text-label tabular-nums text-ink-muted">
                      {rows[rowIndex].quantity}&times;
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="flex-row gap-3">
          <DispatcherButton
            type="button"
            variant="secondary"
            size="md"
            className="flex-1 font-semibold"
            disabled={lines.length === 0}
            onClick={() => onTickAll(storeIndex, tick !== "all")}
          >
            {tick === "all" ? copy.stage3.clearAll : copy.stage3.tickAll}
          </DispatcherButton>
          <DispatcherButton
            type="button"
            variant="field"
            size="md"
            className="flex-1 justify-center font-semibold"
            onClick={() => onOpenChange(false)}
          >
            {copy.stage3.dialogDone}
          </DispatcherButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
