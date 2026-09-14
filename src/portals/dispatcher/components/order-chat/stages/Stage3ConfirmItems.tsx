import * as React from "react";
import { Plus, Minus, Trash2, Send, Package } from "lucide-react";
import { DispatcherButton } from "../../ui/DispatcherButton";
import { DispatcherInlineBanner } from "../../ui/DispatcherInlineBanner";
import { WaitingCard } from "../WaitingCard";
import { copy, formatAgo } from "../copy";
import type { MerchantCategory, StorePinpoint } from "../types";

/**
 * Stage 3 — confirm the items.
 *
 * Completes only when the customer approves the card in their own app, which
 * is why this stage owns a real waiting state rather than a grey pill.
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
      <div className="space-y-1.5">
        {savedItems.length === 0 ? (
          <p className="text-[11px] text-slate-400 m-0">No items on this order.</p>
        ) : (
          savedItems.map((it: any, i: number) => (
            <div key={i} className="flex items-center gap-2.5 text-[11px] text-slate-700">
              <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                {it.quantity}&times;
              </span>
              <span className="flex-1 min-w-0 truncate font-semibold">{it.itemName}</span>
              <span className="shrink-0 text-[10px] text-slate-400 truncate max-w-[120px]">
                {parseStoreAndCat(it.storeCategory).store}
              </span>
            </div>
          ))
        )}
      </div>
    );
  }

  const noStores = pinpoints.length === 0;

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500 m-0">{copy.stage3.intro(customerFirstName)}</p>

      {noStores && (
        <p className="text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 m-0">
          {copy.stage3.needsStores}
        </p>
      )}

      {/* the list */}
      {isEditing ? (
        <div className="space-y-1.5">
          {editableItems.map((item, index) => {
            const { store, category, assigned } = parseStoreAndCat(item.storeCategory);
            return (
              <div
                key={index}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${
                  assigned ? "bg-white border-slate-200" : "bg-amber-50 border-amber-300"
                }`}
              >
                {/* Which shop the rider buys this line at. Without this the
                    store half of `storeCategory` could never be set, so every
                    item silently landed on the first pin. */}
                <select
                  value={assigned ? store : ""}
                  onChange={(e) =>
                    updateItem(index, { storeCategory: `${e.target.value} | ${category}` })
                  }
                  aria-label={copy.stage3.storeLabel}
                  className={`shrink-0 text-[10px] font-bold rounded-lg px-1.5 py-1 max-w-[104px] cursor-pointer border ${
                    assigned
                      ? "bg-slate-50 border-slate-200 text-slate-600"
                      : "bg-white border-amber-400 text-amber-900"
                  }`}
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
                  className="shrink-0 text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 max-w-[92px] text-slate-600 cursor-pointer"
                >
                  {merchantCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <input
                  value={item.itemName}
                  onChange={(e) => updateItem(index, { itemName: e.target.value })}
                  placeholder={copy.stage3.itemPlaceholder}
                  aria-label={copy.stage3.itemPlaceholder}
                  className="flex-1 min-w-0 text-[11px] font-semibold bg-transparent border-0 focus:outline-none text-slate-800"
                />

                <div className="shrink-0 flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    aria-label="One fewer"
                    onClick={() => updateItem(index, { quantity: Math.max(1, item.quantity - 1) })}
                    className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="text-[11px] font-mono font-bold w-5 text-center tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="One more"
                    onClick={() => updateItem(index, { quantity: item.quantity + 1 })}
                    className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    <Plus size={11} />
                  </button>
                </div>

                <button
                  type="button"
                  aria-label={`${copy.stage3.removeItem} ${item.itemName || "item"}`}
                  onClick={() => removeItem(index)}
                  className="shrink-0 p-1 text-slate-300 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => addItem()}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-300 text-[11px] font-bold text-slate-500 hover:border-dispatcher-navy hover:text-dispatcher-navy transition cursor-pointer"
          >
            <Plus size={13} /> {copy.stage3.addItem}
          </button>
        </div>
      ) : savedItems.length === 0 ? (
        <div className="text-center py-4 px-3 border border-dashed border-slate-200 rounded-xl">
          <Package size={20} className="text-slate-300 mx-auto" />
          <p className="text-[11px] font-bold text-slate-600 mt-1.5 mb-0">Nothing on the list yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {savedItems.map((it: any, i: number) => {
            const { store, assigned } = parseStoreAndCat(it.storeCategory);
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 ${
                  assigned ? "bg-white border-slate-200" : "bg-amber-50 border-amber-300"
                }`}
              >
                <span className="shrink-0 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                  {it.quantity}&times;
                </span>
                <span className="flex-1 min-w-0 truncate text-[11px] font-semibold text-slate-800">
                  {it.itemName}
                </span>
                {/* Which shop this is bought at — the thing the rider needs and
                    the list could not previously show. */}
                <span
                  className={`shrink-0 text-[10px] font-bold truncate max-w-[112px] ${
                    assigned ? "text-slate-400" : "text-amber-800"
                  }`}
                >
                  {assigned ? store : copy.stage3.pickStore}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {unassignedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <p className="text-[11px] font-extrabold text-amber-900 m-0">
            {copy.stage3.unassignedTitle(unassignedCount)}
          </p>
          <p className="text-[11px] text-amber-900/85 mt-1 mb-0 leading-relaxed">
            {copy.stage3.unassignedBody}
          </p>
          {!isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="mt-2 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition active:scale-95 cursor-pointer"
            >
              {copy.stage3.edit}
            </button>
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

      <div className="flex gap-2 flex-wrap">
        {isEditing ? (
          <>
            <DispatcherButton
              variant="primary"
              size="md"
              loading={isSaving}
              loadingText={copy.stage3.sending}
              icon={<Send size={14} />}
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
              icon={<Send size={14} />}
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
