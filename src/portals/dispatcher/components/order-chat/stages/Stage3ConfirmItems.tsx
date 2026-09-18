import { Plus, Minus, Trash2, Send, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherInlineBanner } from "@/components/panel/DispatcherInlineBanner";
import { WaitingCard } from "../WaitingCard";
import { copy, formatAgo } from "../copy";
import type { MerchantCategory, StorePinpoint } from "../types";

/**
 * Stage 3 - confirm the items.
 *
 * Completes only when the customer approves the card in their own app, which
 * is why this stage owns a real waiting state rather than a grey pill.
 *
 * Route board build, and the one stage that needed restructuring rather than
 * retoning. The edit row put five controls on a single line: two selects at
 * 10px text with 4px of vertical padding (about 22px tall), a quantity
 * stepper whose buttons were 19px, and a delete at 20px. You named tablet as
 * a scene the console is actually used in, and a 19px target under a thumb is
 * not a target. Every control here now clears 36px, and the row breaks into
 * two lines - what the item is, then where it is bought - instead of
 * compressing five things into one.
 *
 * The item name input was `border-0 bg-transparent focus:outline-none`: a
 * field with no edge that also suppressed the focus ring, so a keyboard user
 * editing an order had no idea which line they were on.
 *
 * The saved list was one bordered, rounded box per item, which is the nested
 * card the craft floor refuses, repeated per row. Items are separated by
 * hairlines now, which is also how the inspector lists them.
 */

interface Stage3Props {
  items: ReturnType<typeof import("../hooks/useOrderItems").useOrderItems>;
  pinpoints: StorePinpoint[];
  merchantCategories: MerchantCategory[];
  customerFirstName: string;
  onNudge: () => void;
  /** Takes the dispatcher to stage 2 when there is nowhere to buy the items. */
  onNeedStores: (reason: string) => void;
  readOnly?: boolean;
}

const SELECT_CLASSES =
  "min-h-9 shrink-0 cursor-pointer rounded-trim border px-2 text-label transition-colors";

export function Stage3ConfirmItems({
  items,
  pinpoints,
  merchantCategories,
  customerFirstName,
  onNudge,
  onNeedStores,
  readOnly = false,
}: Stage3Props) {
  const {
    savedItems,
    isEditing,
    editableItems,
    isSaving,
    feedback,
    hasSentConfirmationCard,
    isCustomerConfirmed,
    sentAt,
    startEditing,
    cancelEditing,
    addItem,
    updateItem,
    removeItem,
    sendToCustomer,
    parseStoreAndCat,
    storeOptions,
    unassignedCount,
  } = items;

  const minsAgo = sentAt ? Math.max(0, Math.floor((Date.now() - sentAt) / 60000)) : 0;

  /**
   * Never a dead disabled button. Pressing it while blocked takes the
   * dispatcher to whatever is missing and says what is needed, so the tap is
   * navigation rather than nothing happening.
   */
  const handleSend = () => {
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
    sendToCustomer();
  };

  if (readOnly) {
    return (
      <div>
        {savedItems.length === 0 ? (
          <p className="m-0 text-body text-ink-muted">No items on this order.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-hairline p-0">
            {savedItems.map((it: any, i: number) => (
              <li key={i} className="flex items-center gap-2.5 py-2">
                <span data-figure className="shrink-0 font-mono text-label text-ink-muted">
                  {it.quantity}&times;
                </span>
                <span className="min-w-0 flex-1 truncate text-body text-ink">{it.itemName}</span>
                <span className="max-w-[128px] shrink-0 truncate text-label text-ink-muted">
                  {parseStoreAndCat(it.storeCategory).store}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const noStores = pinpoints.length === 0;

  return (
    <div className="space-y-3">
      <p className="m-0 text-body text-ink-muted">{copy.stage3.intro(customerFirstName)}</p>

      {noStores && (
        <p className="m-0 rounded-plate bg-status-waiting-fill px-3 py-2 text-label text-status-waiting-ink">
          {copy.stage3.needsStores}
        </p>
      )}

      {/* the list */}
      {isEditing ? (
        <div className="space-y-2">
          {editableItems.map((item, index) => {
            const { store, category, assigned } = parseStoreAndCat(item.storeCategory);
            return (
              <div
                key={index}
                className={cn(
                  "rounded-trim border p-2",
                  assigned
                    ? "border-edge bg-board-plate"
                    : "border-status-waiting-ink/40 bg-status-waiting-fill"
                )}
              >
                {/* what it is, how many, and gone */}
                <div className="flex items-center gap-2">
                  <input
                    value={item.itemName}
                    onChange={(e) => updateItem(index, { itemName: e.target.value })}
                    placeholder={copy.stage3.itemPlaceholder}
                    aria-label={copy.stage3.itemPlaceholder}
                    className="min-h-9 min-w-0 flex-1 rounded-trim border border-edge bg-board-ground px-2 text-body text-ink placeholder:text-ink-muted transition-colors focus:border-board-field focus:bg-board-plate"
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
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => addItem()}
            className="flex min-h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-trim border border-edge bg-board-plate text-micro uppercase text-ink-muted transition-colors hover:text-ink"
          >
            <Plus size={14} /> {copy.stage3.addItem}
          </button>
        </div>
      ) : savedItems.length === 0 ? (
        <div className="rounded-trim bg-board-ground px-3 py-4 text-center">
          <Package size={20} className="mx-auto text-board-trim" />
          <p className="mb-0 mt-1.5 text-label text-ink">Nothing on the list yet</p>
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-hairline p-0">
          {savedItems.map((it: any, i: number) => {
            const { store, assigned } = parseStoreAndCat(it.storeCategory);
            return (
              <li key={i} className="flex items-center gap-2.5 py-2">
                <span data-figure className="shrink-0 font-mono text-label text-ink-muted">
                  {it.quantity}&times;
                </span>
                <span className="min-w-0 flex-1 truncate text-body text-ink">{it.itemName}</span>
                {/* Which shop this is bought at. The thing the rider needs and
                    the list could not previously show. */}
                <span
                  className={cn(
                    "max-w-[128px] shrink-0 truncate text-label",
                    assigned ? "text-ink-muted" : "text-status-act-ink"
                  )}
                >
                  {assigned ? store : copy.stage3.pickStore}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {unassignedCount > 0 && (
        <div className="rounded-plate bg-status-waiting-fill px-3 py-2.5">
          <p className="m-0 text-label text-status-waiting-ink">
            {copy.stage3.unassignedTitle(unassignedCount)}
          </p>
          <p className="mb-0 mt-1 text-body text-status-waiting-ink/85">
            {copy.stage3.unassignedBody}
          </p>
          {!isEditing && (
            <DispatcherButton
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={startEditing}
            >
              {copy.stage3.edit}
            </DispatcherButton>
          )}
        </div>
      )}

      {hasSentConfirmationCard && !isCustomerConfirmed && (
        <WaitingCard
          title={`Waiting for ${customerFirstName}`}
          detail={`You sent the item list ${formatAgo(minsAgo)}.`}
          actions={[
            { label: copy.nowActions.nudge(customerFirstName), onClick: onNudge },
            { label: copy.stage3.edit, onClick: startEditing },
          ]}
        />
      )}

      <DispatcherInlineBanner message={feedback.message} onDismiss={feedback.dismiss} />

      <div className="flex flex-wrap gap-2">
        {isEditing ? (
          <>
            <DispatcherButton
              variant="primary"
              size="md"
              loading={isSaving}
              loadingText={copy.stage3.sending}
              icon={<Send size={15} />}
              onClick={handleSend}
              className="flex-1 justify-center"
            >
              {copy.stage3.send(customerFirstName)}
            </DispatcherButton>
            <DispatcherButton variant="secondary" size="md" onClick={cancelEditing}>
              {copy.stage3.cancel}
            </DispatcherButton>
          </>
        ) : (
          <>
            <DispatcherButton
              variant="primary"
              size="md"
              loading={isSaving}
              loadingText={copy.stage3.sending}
              icon={<Send size={15} />}
              onClick={handleSend}
              disabled={savedItems.length === 0}
              className="flex-1 justify-center"
            >
              {copy.stage3.send(customerFirstName)}
            </DispatcherButton>
            <DispatcherButton variant="secondary" size="md" onClick={startEditing}>
              {copy.stage3.edit}
            </DispatcherButton>
          </>
        )}
      </div>
    </div>
  );
}
