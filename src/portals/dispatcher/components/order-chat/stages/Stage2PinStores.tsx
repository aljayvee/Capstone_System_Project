import { Search, Loader2, MapPin, X, Map as MapIcon, Store, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherCard } from "@/components/panel/DispatcherCard";
import { DispatcherInlineBanner } from "@/components/panel/DispatcherInlineBanner";
import { formatPeso } from "../../../../../utils/format";
import { copy } from "../copy";
import { MAX_PINPOINTS } from "../hooks/useStorePins";
import type { MerchantCategory, StorePinpoint } from "../types";

/**
 * Stage 2 - pin the stores.
 *
 * Completes on pins alone. Previously this step's tick was wired to
 * `hasPins && hasItems`, so it could not finish until the NEXT step's work was
 * done - a dispatcher pinned three shops and watched it stay grey.
 *
 * When Google refuses the API key the map is replaced by an explanation and the
 * search is promoted to the primary control, because the catalogue search path
 * needs no Google at all. A refused key costs a convenience, not the shift.
 *
 * Route board build. A pinned store was painted `bg-emerald-50` with an
 * emerald numbered dot, which on this surface claims the pin is FINISHED WELL.
 * A pin is a fact, not an outcome: it takes the plate and the same navy
 * numbered marker the stage rail uses, so the two read as one counting
 * system. Green stays for things that actually completed.
 *
 * The category select keeps three states because it genuinely has three, and
 * they are now the console's own: missing is the signal (only the dispatcher
 * can fix it), guessed is the waiting pair (someone still has to confirm it),
 * and chosen is unmarked. Ten server behaviours read that field, so a wrong
 * guess that looks settled is worse than no guess at all.
 *
 * The branch picker hovered `bg-blue-50`, the search field carried a
 * `ring-2 ring-dispatcher-navy/10` glow, and the remove control was a 17px
 * target. All three are gone.
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
  // returned. There is no `baseFee` column - the base is whatever the total is
  // not otherwise accounted for - so it is derived by subtraction rather than
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
    <DispatcherCard.Region padding="sm">
      <DispatcherCard.Label as="h4">What the delivery costs</DispatcherCard.Label>
      <dl className="m-0">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between py-0.5 text-body text-ink-muted">
            <dt>{row.label}</dt>
            <dd data-figure className="m-0 font-mono tabular-nums">
              {formatPeso(row.value)}
            </dd>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t border-hairline pt-1.5 text-body text-ink">
          <dt>Delivery</dt>
          <dd data-figure className="m-0 font-mono text-data tabular-nums">
            {formatPeso(fee)}
          </dd>
        </div>
      </dl>
    </DispatcherCard.Region>
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

  /** Inferred rather than chosen - marked as waiting until someone confirms. */
  const isGuess = (pin: StorePinpoint) =>
    pin.categoryId != null &&
    (pin.categorySource === "google" || pin.categorySource === "name");

  /** No category at all, and the dispatcher is the only one who can fix that. */
  const needsCategory = (pin: StorePinpoint) => pin.categoryId == null;

  if (readOnly) {
    return (
      <div className="space-y-3">
        {pinpoints.length === 0 ? (
          <p className="m-0 text-body text-ink-muted">No stores were pinned.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-hairline p-0">
            {pinpoints.map((pin: StorePinpoint, i: number) => (
              <li key={i} className="flex items-center gap-2.5 py-2">
                <span data-figure className="shrink-0 font-mono text-label text-ink-muted">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-body text-ink">{pin.storeName}</span>
              </li>
            ))}
          </ul>
        )}
        <FeeBreakdown orderDetails={orderDetails} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* the map, or an honest explanation of why there isn't one */}
      {mapUnavailable ? (
        <div className="flex items-start gap-3 rounded-plate bg-status-waiting-fill p-3">
          <MapIcon size={16} className="mt-0.5 shrink-0 text-status-waiting-ink" />
          <div className="min-w-0">
            <p className="m-0 text-label text-status-waiting-ink">{copy.stage2.mapDownTitle}</p>
            <p className="mb-0 mt-1 text-body text-status-waiting-ink/85">
              {copy.stage2.mapDownBody}
            </p>
            <p className="mb-0 mt-2 font-mono text-micro text-status-waiting-ink/70">
              {mapsStatus === "no-key" ? copy.stage2.mapNoKeyAdmin : copy.stage2.mapDownAdmin}
            </p>
          </div>
        </div>
      ) : (
        <div className="relative h-52 w-full overflow-hidden rounded-plate border border-edge bg-board-ground sm:h-60">
          <div ref={mapRef} className="h-full w-full" />
          {!scriptLoaded && (
            <div className="absolute inset-0 grid place-items-center gap-2 text-body text-ink-muted">
              <Loader2 size={16} className="animate-spin" />
              {copy.stage2.mapLoading}
            </div>
          )}
          <p className="absolute bottom-2 left-2 right-2 m-0 rounded-trim bg-board-plate/95 px-2 py-1 text-center text-label text-ink-muted">
            {copy.stage2.hint}
          </p>
        </div>
      )}

      {/* search - the primary control when the map is gone */}
      <form onSubmit={search} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={copy.stage2.searchPlaceholder}
            aria-label={copy.stage2.searchPlaceholder}
            disabled={atLimit}
            className={cn(
              // One themed focus outline from surfaces.css, not a per-field
              // glow, and no standing ring when the map is down: the promoted
              // state is carried by the button beside it going primary.
              "min-h-10 w-full rounded-plate border bg-board-ground pl-9 pr-3 text-body text-ink transition-colors placeholder:text-ink-muted focus:border-board-field focus:bg-board-plate disabled:opacity-60",
              mapUnavailable ? "border-board-field" : "border-edge"
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
        <div className="overflow-hidden rounded-plate border border-edge">
          <p className="m-0 border-b border-hairline bg-board-ground px-3 py-1.5 text-micro uppercase text-ink-muted">
            {copy.stage2.pickBranch}
          </p>
          {searchResults.map((result: any, i: number) => (
            <button
              key={i}
              type="button"
              onClick={() => selectResult(result)}
              onMouseEnter={() => hoverResult(result)}
              className="w-full cursor-pointer border-b border-hairline px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-board-ground"
            >
              <span className="block truncate text-body text-ink">{result.name}</span>
              <span className="block truncate text-label text-ink-muted">
                {result.formatted_address}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* A pin we have held back because it looks like one already placed. Two
          real shops can share a building, so this asks rather than refuses -
          but it states the cost first, because the extra store is charged to
          the customer against a quote they have already agreed to. */}
      {pendingDuplicate && (
        <div className="flex items-start gap-3 rounded-plate bg-status-waiting-fill p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-status-waiting-ink" />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-label text-status-waiting-ink">
              {copy.stage2.dupLikelyTitle(
                pendingDuplicate.verdict.existing.storeName,
                pendingDuplicate.verdict.index + 1
              )}
            </p>
            <p className="mb-0 mt-1 text-body text-status-waiting-ink/85">
              {pendingDuplicate.verdict.reason === "name"
                ? copy.stage2.dupLikelyName
                : copy.stage2.dupLikelyDistance(pendingDuplicate.verdict.metres)}{" "}
              {perExtraStoreFee > 0
                ? copy.stage2.dupCost(formatPeso(perExtraStoreFee))
                : copy.stage2.dupCostUnknown}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <DispatcherButton
                type="button"
                size="sm"
                variant="secondary"
                onClick={confirmPendingDuplicate}
              >
                {copy.stage2.dupPinAnyway}
              </DispatcherButton>
              <DispatcherButton
                type="button"
                size="sm"
                variant="field"
                onClick={dismissPendingDuplicate}
              >
                {copy.stage2.dupCancel}
              </DispatcherButton>
            </div>
          </div>
        </div>
      )}

      {/* pinned stores */}
      {pinpoints.length === 0 ? (
        <div className="rounded-trim bg-board-ground px-3 py-4 text-center">
          <Store size={20} className="mx-auto text-board-trim" />
          <p className="mb-0 mt-1.5 text-label text-ink">{copy.stage2.emptyTitle}</p>
          <p className="mb-0 mt-0.5 text-body text-ink-muted">{copy.stage2.emptyBody}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pinpoints.map((pin: StorePinpoint, i: number) => (
            <div
              key={i}
              className={cn(
                "rounded-trim border p-2",
                needsCategory(pin)
                  ? "border-status-act-ink/40 bg-status-act-fill"
                  : "border-edge bg-board-plate"
              )}
            >
              <div className="flex items-center gap-2">
                {/* The same numbered marker the stage rail uses, so the pins
                    and the stages read as one counting system. */}
                <span
                  data-figure
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-board-field text-micro text-board-plate"
                >
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => focusPin(pin)}
                  disabled={mapUnavailable}
                  className="min-h-9 min-w-0 flex-1 cursor-pointer truncate text-left text-body text-ink disabled:cursor-default"
                >
                  {pin.storeName}
                </button>
                <button
                  type="button"
                  onClick={() => removePin(i)}
                  aria-label={`${copy.stage2.remove} ${pin.storeName}`}
                  className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:bg-status-act-fill hover:text-status-act-ink"
                >
                  <X size={14} />
                </button>
              </div>

              {/* A category we guessed must look guessed. Ten server
                  behaviours read this field - dwell time, geofence radius,
                  revenue allocation - so a wrong guess that looks settled is
                  worse than no guess at all. Choosing by hand clears the mark. */}
              <div className="mt-2 flex items-center gap-2">
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
                    "min-h-9 max-w-full cursor-pointer rounded-trim border px-2 text-label transition-colors",
                    needsCategory(pin)
                      ? "border-status-act-ink/50 bg-board-plate text-status-act-ink"
                      : isGuess(pin)
                        ? "border-status-waiting-ink/40 bg-status-waiting-fill text-status-waiting-ink"
                        : "border-edge bg-board-ground text-ink"
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
                {isGuess(pin) ? (
                  <span className="text-label text-status-waiting-ink">
                    {copy.stage2.categoryGuessed}
                  </span>
                ) : null}
              </div>
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
