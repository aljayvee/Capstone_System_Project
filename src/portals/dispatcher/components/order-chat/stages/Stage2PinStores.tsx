import * as React from "react";
import { Search, Loader2, MapPin, X, Map as MapIcon, Store, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DispatcherButton } from "../../ui/DispatcherButton";
import { DispatcherInlineBanner } from "../../ui/DispatcherInlineBanner";
import { formatPeso } from "../../../../../utils/format";
import { copy } from "../copy";
import { MAX_PINPOINTS } from "../hooks/useStorePins";
import type { MerchantCategory, StorePinpoint } from "../types";

/**
 * Stage 2 — pin the stores.
 *
 * Completes on pins alone. Previously this step's tick was wired to
 * `hasPins && hasItems`, so it could not finish until the NEXT step's work was
 * done — a dispatcher pinned three shops and watched it stay grey.
 *
 * When Google refuses the API key the map is replaced by an explanation and the
 * search is promoted to the primary control, because the catalogue search path
 * needs no Google at all. A refused key costs a convenience, not the shift.
 */

interface Stage2Props {
  pins: ReturnType<typeof import("../hooks/useStorePins").useStorePins>;
  merchantCategories: MerchantCategory[];
  customerFirstName: string;
  orderDetails: any;
  /** Server rate config, so the duplicate warning can name the real cost. */
  rateConfig?: any;
  readOnly?: boolean;
}

function FeeBreakdown({ orderDetails }: { orderDetails: any }) {
  const fee = Number(orderDetails?.deliveryFee ?? 0);
  if (!fee) return null;

  // The server is the pricing authority: every component below is a field it
  // returned. There is no `baseFee` column — the base is whatever the total is
  // not otherwise accounted for — so it is derived by subtraction rather than
  // by re-applying a rate here. That keeps the rows adding up to the total the
  // customer is actually charged, which a breakdown has to do to be worth
  // showing at all.
  const components: Array<{ label: string; value: number }> = [
    { label: "Distance", value: Number(orderDetails?.distanceFee ?? 0) },
    { label: "Extra stores", value: Number(orderDetails?.multiStoreFee ?? 0) },
    { label: "Handling", value: Number(orderDetails?.groceryFee ?? 0) },
    { label: "Non-cash", value: Number(orderDetails?.nonCodFee ?? 0) },
  ];
  const accountedFor = components.reduce((sum, r) => sum + r.value, 0);
  const base = fee - accountedFor;

  const rows = [
    ...(base > 0 ? [{ label: "Base fee", value: base }] : []),
    ...components.filter((r) => r.value > 0),
  ];

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px]">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between py-0.5 text-slate-600">
          <span>{row.label}</span>
          <span className="font-mono tabular-nums">{formatPeso(row.value)}</span>
        </div>
      ))}
      <div className="flex justify-between pt-1.5 mt-1 border-t border-slate-200 font-extrabold text-slate-900">
        <span>Delivery</span>
        <span className="font-mono tabular-nums">{formatPeso(fee)}</span>
      </div>
    </div>
  );
}

export function Stage2PinStores({
  pins,
  merchantCategories,
  customerFirstName,
  orderDetails,
  rateConfig,
  readOnly = false,
}: Stage2Props) {
  const {
    pinpoints,
    mapRef,
    mapUnavailable,
    mapsStatus,
    scriptLoaded,
    isSaving,
    feedback,
    searchInput,
    setSearchInput,
    isSearching,
    searchResults,
    search,
    selectResult,
    hoverResult,
    removePin,
    setPinCategory,
    focusPin,
    sendToCustomer,
    pendingDuplicate,
    confirmPendingDuplicate,
    dismissPendingDuplicate,
  } = pins;

  const atLimit = pinpoints.length >= MAX_PINPOINTS;

  // What one more shop actually costs. Taken from the server's rate config
  // rather than hard-coded, and left unnamed in the copy if it isn't loaded -
  // quoting a number we aren't sure of would be worse than not quoting one.
  const perExtraStoreFee = Number(rateConfig?.multiStoreFeePerStore ?? 0);

  /** Inferred rather than chosen - shown amber until someone confirms it. */
  const isGuess = (pin: StorePinpoint) =>
    pin.categoryId != null &&
    (pin.categorySource === "google" || pin.categorySource === "name");

  /** No category at all, and the dispatcher is the only one who can fix that. */
  const needsCategory = (pin: StorePinpoint) => pin.categoryId == null;

  if (readOnly) {
    return (
      <div className="space-y-1.5">
        {pinpoints.length === 0 ? (
          <p className="text-[11px] text-slate-400 m-0">No stores were pinned.</p>
        ) : (
          pinpoints.map((pin: StorePinpoint, i: number) => (
            <div
              key={i}
              className="flex items-center gap-2 text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
            >
              <span className="font-mono font-bold text-slate-400">{i + 1}</span>
              <span className="flex-1 min-w-0 truncate font-semibold text-slate-700">
                {pin.storeName}
              </span>
            </div>
          ))
        )}
        <FeeBreakdown orderDetails={orderDetails} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* the map, or an honest explanation of why there isn't one */}
      {mapUnavailable ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3 items-start">
          <MapIcon size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-amber-900 m-0">{copy.stage2.mapDownTitle}</p>
            <p className="text-[11px] text-amber-900/85 mt-1 mb-0 leading-relaxed">
              {copy.stage2.mapDownBody}
            </p>
            <p className="text-[10px] font-mono text-amber-900/60 mt-2 mb-0">
              {mapsStatus === "no-key" ? copy.stage2.mapNoKeyAdmin : copy.stage2.mapDownAdmin}
            </p>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-52 sm:h-60 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
          <div ref={mapRef} className="w-full h-full" />
          {!scriptLoaded && (
            <div className="absolute inset-0 grid place-items-center text-slate-400 text-[11px] font-medium gap-2">
              <Loader2 size={16} className="animate-spin" />
              {copy.stage2.mapLoading}
            </div>
          )}
          <p className="absolute bottom-2 left-2 right-2 m-0 bg-white/95 px-2 py-1 text-[10px] text-slate-600 text-center rounded-lg border border-slate-200/80 font-medium">
            {copy.stage2.hint}
          </p>
        </div>
      )}

      {/* search — the primary control when the map is gone */}
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={copy.stage2.searchPlaceholder}
            aria-label={copy.stage2.searchPlaceholder}
            disabled={atLimit}
            className={cn(
              "w-full text-[11px] font-medium rounded-xl pl-8 pr-3 py-2.5 border transition focus:outline-none focus:ring-2 focus:ring-dispatcher-navy/20 focus:border-dispatcher-navy disabled:opacity-60",
              mapUnavailable
                ? "bg-white border-dispatcher-navy ring-2 ring-dispatcher-navy/10"
                : "bg-slate-50 border-slate-200"
            )}
          />
        </div>
        <DispatcherButton
          type="submit"
          size="md"
          variant={mapUnavailable ? "primary" : "secondary"}
          loading={isSearching}
          loadingText={copy.stage2.searching}
          disabled={atLimit}
        >
          {copy.stage2.search}
        </DispatcherButton>
      </form>

      {searchResults.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 bg-slate-50 px-3 py-1.5 m-0 border-b border-slate-200">
            {copy.stage2.pickBranch}
          </p>
          {searchResults.map((result: any, i: number) => (
            <button
              key={i}
              type="button"
              onClick={() => selectResult(result)}
              onMouseEnter={() => hoverResult(result)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition cursor-pointer"
            >
              <span className="block text-[11px] font-bold text-slate-800 truncate">
                {result.name}
              </span>
              <span className="block text-[10px] text-slate-500 truncate">
                {result.formatted_address}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* A pin we've held back because it looks like one already placed. Two real
          shops can share a building, so this asks rather than refuses - but it
          states the cost first, because the extra store is charged to the
          customer against a quote they have already agreed to. */}
      {pendingDuplicate && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex gap-3 items-start">
          <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-amber-900 m-0">
              {copy.stage2.dupLikelyTitle(
                pendingDuplicate.verdict.existing.storeName,
                pendingDuplicate.verdict.index + 1
              )}
            </p>
            <p className="text-[11px] text-amber-900/85 mt-1 mb-0 leading-relaxed">
              {pendingDuplicate.verdict.reason === "name"
                ? copy.stage2.dupLikelyName
                : copy.stage2.dupLikelyDistance(pendingDuplicate.verdict.metres)}{" "}
              {perExtraStoreFee > 0
                ? copy.stage2.dupCost(formatPeso(perExtraStoreFee))
                : copy.stage2.dupCostUnknown}
            </p>
            <div className="flex gap-2 flex-wrap mt-2.5">
              <button
                type="button"
                onClick={confirmPendingDuplicate}
                className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition active:scale-95 cursor-pointer"
              >
                {copy.stage2.dupPinAnyway}
              </button>
              <button
                type="button"
                onClick={dismissPendingDuplicate}
                className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-dispatcher-navy text-white hover:bg-dispatcher-navy-dark transition active:scale-95 cursor-pointer"
              >
                {copy.stage2.dupCancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* pinned stores */}
      {pinpoints.length === 0 ? (
        <div className="text-center py-4 px-3 border border-dashed border-slate-200 rounded-xl">
          <Store size={20} className="text-slate-300 mx-auto" />
          <p className="text-[11px] font-bold text-slate-600 mt-1.5 mb-0">
            {copy.stage2.emptyTitle}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 mb-0">{copy.stage2.emptyBody}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {pinpoints.map((pin: StorePinpoint, i: number) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-2"
            >
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white grid place-items-center text-[10px] font-mono font-black">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => focusPin(pin)}
                disabled={mapUnavailable}
                className="flex-1 min-w-0 text-left text-[11px] font-bold text-emerald-900 truncate disabled:cursor-default cursor-pointer"
              >
                {pin.storeName}
              </button>
              {/* A category we guessed must look guessed. Ten server
                  behaviours read this field - dwell time, geofence radius,
                  revenue allocation - so a wrong guess that looks settled is
                  worse than no guess at all. Choosing by hand clears the mark. */}
              <select
                value={pin.categoryId ?? ""}
                onChange={(e) =>
                  setPinCategory(i, e.target.value ? Number(e.target.value) : null)
                }
                aria-label={
                  isGuess(pin)
                    ? `${copy.stage2.setCategory} (${copy.stage2.categoryGuessed})`
                    : copy.stage2.setCategory
                }
                title={
                  isGuess(pin)
                    ? copy.stage2.categoryGuessedHint(pin.categorySource || "")
                    : undefined
                }
                className={cn(
                  "shrink-0 text-[10px] font-bold rounded-lg px-1.5 py-1 max-w-[104px] cursor-pointer border",
                  needsCategory(pin)
                    ? "bg-white border-amber-400 text-amber-900"
                    : isGuess(pin)
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-white border-emerald-200 text-emerald-900"
                )}
              >
                <option value="">
                  {needsCategory(pin) ? copy.stage2.categoryNeeded : copy.stage2.uncategorised}
                </option>
                {merchantCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removePin(i)}
                aria-label={`${copy.stage2.remove} ${pin.storeName}`}
                className="shrink-0 p-0.5 text-emerald-700/50 hover:text-rose-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <FeeBreakdown orderDetails={orderDetails} />

      <DispatcherInlineBanner message={feedback.message} onDismiss={feedback.dismiss} />

      <DispatcherButton
        variant="primary"
        size="lg"
        loading={isSaving}
        loadingText={copy.stage2.sending}
        disabled={pinpoints.length === 0}
        icon={<MapPin size={16} />}
        onClick={sendToCustomer}
        className="w-full justify-center"
      >
        {copy.stage2.send(customerFirstName)}
      </DispatcherButton>
    </div>
  );
}
