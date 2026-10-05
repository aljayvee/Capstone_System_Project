import {
  Search,
  Loader2,
  MapPin,
  X,
  Map as MapIcon,
  Store,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherCard } from "@/components/panel/DispatcherCard";
import { DispatcherInlineBanner } from "@/components/panel/DispatcherInlineBanner";
import { formatPeso } from "../../../../../utils/format";
import { copy } from "../copy";
import { MAX_PINPOINTS } from "../hooks/useStorePins";
import { useStorePredictions } from "../hooks/useStorePredictions";
import { StorePredictionCard } from "../StorePredictionCard";
import { useMemo, useState, useEffect } from "react";
import type { MerchantCategory, StorePinpoint } from "../types";
import type { ApiPinQuote } from "../../../../../services/apiService";
import type { DeliveryProblem } from "../hooks/useStageModel";

/**
 * Step 1 - pin the stores. (The file keeps its old number to keep diffs small.)
 *
 * The first step now. The drop-off it prices to sits at the top, with what the
 * old "Check delivery address" step checked: no pin, or a pin outside Tacurong,
 * stops the stores being sent. Nothing is asked of the dispatcher when the
 * drop-off is fine, which is most orders.
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
  /**
   * Moves on to step 2. Deliberately an explicit act: pinning a shop does not
   * complete this stage, so the dispatcher says when they are finished here
   * rather than being thrown forward by their own first pin.
   */
  onContinue: () => void;
  /** What is wrong with the drop-off, if anything. Blocks sending the stores. */
  deliveryProblem?: DeliveryProblem;
  onAskInChat?: () => void;
  onDecline?: () => void;
  onViewLocation?: () => void;
  readOnly?: boolean;
  prefillSearch?: string | null;
  onClearPrefill?: () => void;
}

/** The fields a fee breakdown reads: the saved errand's, or a live quote's. */
type FeeFields = Pick<ApiPinQuote, "deliveryFee" | "distanceFee" | "multiStoreFee" | "groceryFee" | "nonCodFee">;

function FeeBreakdown({ orderDetails }: { orderDetails: Partial<FeeFields> | null | undefined }) {
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
    <div className="rounded-plate border border-edge bg-board-ground/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="m-0 text-micro font-semibold uppercase tracking-wider text-ink-muted">
          What the delivery costs
        </h4>
      </div>
      <dl className="m-0 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between py-0.5 text-body text-ink-muted">
            <dt>{row.label}</dt>
            <dd data-figure className="m-0 font-mono tabular-nums">
              {formatPeso(row.value)}
            </dd>
          </div>
        ))}
        <div className="mt-1.5 flex justify-between border-t border-hairline pt-1.5 text-body font-semibold text-ink">
          <dt>Delivery Total</dt>
          <dd data-figure className="m-0 font-mono text-data tabular-nums text-status-done-ink">
            {formatPeso(fee)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function Stage2PinStores({
  pins,
  merchantCategories,
  customerFirstName,
  orderDetails,
  rateConfig,
  onContinue,
  deliveryProblem = null,
  onAskInChat,
  onDecline,
  onViewLocation,
  readOnly = false,
  prefillSearch,
  onClearPrefill,
}: Stage2Props) {
  const {
    pinpoints,
    storesUpToDate,
    quote,
    quoteStatus,
    quoteError,
    retryQuote,
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
    storesSentAt,
    pendingDuplicate,
    confirmPendingDuplicate,
    dismissPendingDuplicate,
    blockedPin,
    dismissBlockedPin,
    isCheckingLocation,
    addPredictedStores,
  } = pins;

  // ── the store predictor ──────────────────────────────────────────────────
  // The step 1 list as last saved: the dispatcher's working copy once they
  // have edited it, the customer's own list before that.
  const itemNames = useMemo<string[]>(() => {
    const rows: any[] =
      (orderDetails?.pabiliDetails?.length ? orderDetails.pabiliDetails : orderDetails?.pabiliItemRequests) || [];
    return rows.map((r) => String(r?.itemName || "").trim()).filter(Boolean);
  }, [orderDetails?.pabiliDetails, orderDetails?.pabiliItemRequests]);

  // Asked only while it can still help: before the stores go to the customer.
  const predictionWanted = !readOnly && !storesSentAt && itemNames.length > 0;
  const predictions = useStorePredictions(orderDetails?.id, itemNames, predictionWanted);
  const [predictionDismissed, setPredictionDismissed] = useState(false);
  const [acceptedCount, setAcceptedCount] = useState<number | null>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);

  // Sync prefill search query when jumping from Step 4
  useEffect(() => {
    if (prefillSearch) {
      setSearchInput(prefillSearch);
    }
  }, [prefillSearch, setSearchInput]);

  // The suggestions remain available and do not disappear when stores are pinned!
  const showPrediction =
    predictionWanted && !predictionDismissed && isSuggestionsOpen;

  const atLimit = pinpoints.length >= MAX_PINPOINTS;

  // What one more shop actually costs. Taken from the server's rate config
  // rather than hard-coded, and left unnamed in the copy if it isn't loaded -
  // quoting a number we aren't sure of would be worse than not quoting one.
  const perExtraStoreFee = Number(rateConfig?.multiStoreFeePerStore ?? 0);

  /** Inferred rather than chosen - marked as waiting until someone confirms. */
  const isGuess = (pin: StorePinpoint) =>
    pin.categoryId != null &&
    (pin.categorySource === "google" ||
      pin.categorySource === "name" ||
      pin.categorySource === "model");

  /**
   * What the machine thought, in words, for the tooltip on a guessed category.
   *
   * A model guess says how sure it was and what it nearly said instead. That
   * second half is the useful one: a dispatcher who disagrees can see the
   * runner-up was the category they were about to pick, and stop second
   * guessing themselves.
   */
  const guessHint = (pin: StorePinpoint): string | undefined => {
    if (!isGuess(pin)) return undefined;
    if (pin.categorySource !== "model") {
      return copy.stage2.categoryGuessedHint(pin.categorySource || "");
    }
    const name =
      merchantCategories.find((c) => c.id === pin.categoryId)?.name ?? "that category";
    return copy.stage2.categoryModelHint(
      name,
      Math.round((pin.categoryConfidence ?? 0) * 100),
      pin.categoryRunnerUp
    );
  };

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
      {/* Where everything is delivered to: the part of the old address step
          worth keeping on screen. */}
      <div className="flex items-start gap-2.5 rounded-plate bg-board-ground px-3 py-2">
        <MapPin size={15} className="mt-0.5 shrink-0 text-ink-muted" />
        <p className="m-0 min-w-0 flex-1 break-words text-body text-ink">
          <span className="text-ink-muted">{copy.stageAddress.deliverTo}: </span>
          {orderDetails?.deliveryAddress || "Tacurong City"}
          {orderDetails?.description ? (
            <span className="text-ink-muted"> &ldquo;{orderDetails.description}&rdquo;</span>
          ) : null}
        </p>
        {onViewLocation && (
          <DispatcherButton type="button" size="sm" variant="secondary" className="shrink-0" onClick={onViewLocation}>
            {copy.stageAddress.map}
          </DispatcherButton>
        )}
      </div>

      {deliveryProblem && (
        <div role="alert" className="space-y-2 rounded-plate bg-status-act-fill p-3 text-status-act-ink">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="m-0 text-label font-bold">
                {deliveryProblem === "no-gps" ? copy.stageAddress.missingGpsTitle : copy.stageAddress.outOfAreaTitle}
              </p>
              <p className="mb-0 mt-0.5 text-body">
                {deliveryProblem === "no-gps" ? copy.stageAddress.missingGpsDetail : copy.stageAddress.outOfAreaDetail}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {onAskInChat && (
              <DispatcherButton type="button" size="sm" variant="secondary" onClick={onAskInChat}>
                {copy.stageAddress.askInChat(customerFirstName)}
              </DispatcherButton>
            )}
            {onDecline && (
              <DispatcherButton type="button" size="sm" variant="danger-ghost" onClick={onDecline}>
                {copy.declineOrder}
              </DispatcherButton>
            )}
          </div>
        </div>
      )}

      {showPrediction && (
        <StorePredictionCard
          prediction={predictions.prediction}
          status={predictions.status}
          answer={predictions.answer}
          acceptedCount={acceptedCount}
          pinnedStoreNames={pinpoints.map((p: StorePinpoint) => p.storeName)}
          onAccept={(stores) => {
            setAcceptedCount(addPredictedStores(stores));
            predictions.setAnswer("accepted");
          }}
          onAcceptSingle={(store) => {
            addPredictedStores([store]);
          }}
          onReject={() => predictions.setAnswer("rejected")}
          onRetry={predictions.retry}
          onDismiss={() => {
            setPredictionDismissed(true);
            setIsSuggestionsOpen(false);
          }}
          onReopen={() => {
            predictions.setAnswer(null);
            setPredictionDismissed(false);
            setIsSuggestionsOpen(true);
          }}
        />
      )}

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
        <div className="relative h-[360px] sm:h-[400px] w-full overflow-hidden rounded-plate border border-edge bg-board-ground">
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

      {/* Dedicated store suggestion control & prefill notification */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {predictionWanted && (
          <DispatcherButton
            type="button"
            size="sm"
            variant={isSuggestionsOpen ? "primary" : "secondary"}
            icon={<Store size={14} />}
            onClick={() => {
              setIsSuggestionsOpen((prev) => !prev);
              if (predictionDismissed) setPredictionDismissed(false);
            }}
          >
            {isSuggestionsOpen
              ? "Hide Store Suggestions"
              : `Store Suggestions (${predictions.prediction?.stores?.length ?? 0})`}
          </DispatcherButton>
        )}
        {prefillSearch && (
          <div className="flex items-center gap-1.5 rounded-trim border border-status-waiting-ink/30 bg-status-waiting-fill px-2.5 py-1 text-micro text-status-waiting-ink">
            <span>Store for item: <strong>{prefillSearch}</strong></span>
            {onClearPrefill && (
              <button
                type="button"
                onClick={onClearPrefill}
                className="ml-1 cursor-pointer font-bold text-status-waiting-ink hover:opacity-80"
                aria-label="Clear prefill"
              >
                &times;
              </button>
            )}
          </div>
        )}
      </div>

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

      {/* The location gate. Inside Tacurong passes silently; outside Tacurong or off the road map is strictly blocked with an instant notification, and the server refuses it again on save. */}
      {isCheckingLocation && (
        <p className="m-0 flex items-center gap-2 text-label text-ink-muted" aria-live="polite">
          <Loader2 size={13} className="animate-spin" />
          Checking the location
        </p>
      )}

      {blockedPin && (
        <div role="alert" className="flex items-start gap-3 rounded-plate bg-status-act-fill p-3">
          <MapPin size={16} className="mt-0.5 shrink-0 text-status-act-ink" />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-label text-status-act-ink">
              {blockedPin.storeName} cannot be pinned
            </p>
            <p className="mb-0 mt-1 text-body text-status-act-ink/85">{blockedPin.message}</p>
          </div>
          <button
            type="button"
            onClick={dismissBlockedPin}
            aria-label="Dismiss"
            className="grid size-9 shrink-0 place-items-center rounded-trim text-status-act-ink hover:bg-board-plate/60"
          >
            <X size={14} />
          </button>
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
        <div className="overflow-hidden rounded-plate border border-edge bg-board-plate divide-y divide-hairline">
          {pinpoints.map((pin: StorePinpoint, i: number) => (
            <div
              key={i}
              className={cn(
                "p-2.5 transition-colors",
                needsCategory(pin)
                  ? "bg-status-act-fill"
                  : "hover:bg-board-ground/40"
              )}
            >
              <div className="flex items-center gap-2.5">
                {/* The same numbered marker the stage rail uses, so the pins
                    and the stages read as one counting system. */}
                <span
                  data-figure
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-board-field text-micro font-medium text-board-plate"
                >
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => focusPin(pin)}
                  disabled={mapUnavailable}
                  className="min-h-8 min-w-0 flex-1 cursor-pointer truncate text-left text-body font-medium text-ink disabled:cursor-default"
                >
                  {pin.storeName}
                </button>
                <button
                  type="button"
                  onClick={() => removePin(i)}
                  aria-label={`${copy.stage2.remove} ${pin.storeName}`}
                  className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:bg-status-act-fill hover:text-status-act-ink"
                >
                  <X size={14} />
                </button>
              </div>

              {/* A category we guessed must look guessed. Ten server
                  behaviours read this field - dwell time, geofence radius,
                  revenue allocation - so a wrong guess that looks settled is
                  worse than no guess at all. Choosing by hand clears the mark. */}
              <div className="mt-1.5 flex items-center gap-2 pl-8.5">
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
                  title={guessHint(pin)}
                  className={cn(
                    "min-h-8 max-w-full cursor-pointer rounded-trim border px-2 text-label transition-colors",
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

      {/* The fee for the pins on screen, priced by the server as they change.
          It used to appear only after "send these stores", which committed the
          stops to the customer before the dispatcher had seen their cost. */}
      {pinpoints.length > 0 && quoteStatus === "pricing" && (
        <p className="m-0 flex items-center gap-2 rounded-plate bg-board-ground px-3 py-2.5 text-label text-ink-muted" aria-live="polite">
          <Loader2 size={13} className="animate-spin" />
          {copy.stage2.pricing}
        </p>
      )}
      {pinpoints.length > 0 && quoteStatus === "ready" && quote && (
        <div className="space-y-1.5">
          <FeeBreakdown orderDetails={quote} />
          {quote.fareAgreed && (
            <p className="m-0 text-label text-ink-muted">{copy.stage2.fareAgreed(customerFirstName)}</p>
          )}
          {quote.estimated && <p className="m-0 text-label text-ink-muted">{copy.stage2.priceEstimated}</p>}
        </div>
      )}
      {pinpoints.length > 0 && quoteStatus === "error" && (
        <div className="flex items-start gap-2 rounded-plate bg-status-waiting-fill px-3 py-2.5" role="alert">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-status-waiting-ink" />
          <p className="m-0 min-w-0 flex-1 text-body text-status-waiting-ink">
            {quoteError || copy.stage2.priceFailed}
          </p>
          <DispatcherButton type="button" size="sm" variant="secondary" onClick={retryQuote}>
            {copy.stage2.priceRetry}
          </DispatcherButton>
        </div>
      )}
      {pinpoints.length === 0 && <FeeBreakdown orderDetails={orderDetails} />}

      <DispatcherInlineBanner message={feedback.message} onDismiss={feedback.dismiss} />

      {/* The way forward, once the fee is worked out. One press sends these
          stores to the customer (when they do not already have exactly these)
          and opens step 4. It replaces "send these stores" followed by a
          separate "continue", which made the dispatcher commit the stops to see
          their price and then press again to move on. Still hidden until the
          dispatcher says they are done: a first pin never throws them forward. */}
      {pinpoints.length > 0 && (quoteStatus === "ready" || quoteStatus === "error") && (
        <div className={cn("rounded-plate p-3", storesUpToDate ? "bg-status-done-fill" : "bg-board-ground")}>
          <p
            className={cn(
              "m-0 text-body",
              storesUpToDate ? "text-status-done-ink" : "text-ink-muted"
            )}
          >
            {storesUpToDate
              ? copy.stage2.continueUpToDate(customerFirstName)
              : quoteStatus === "ready" && quote
                ? copy.stage2.continueSends(customerFirstName, formatPeso(quote.deliveryFee))
                : copy.stage2.continueSendsNoFee(customerFirstName)}
          </p>
          <DispatcherButton
            type="button"
            variant={quoteStatus === "ready" ? "primary" : "secondary"}
            size="md"
            className="mt-2.5 w-full justify-center"
            loading={isSaving}
            loadingText={copy.stage2.sending}
            icon={storesUpToDate ? <ArrowRight size={15} /> : <MapPin size={15} />}
            onClick={async () => {
              // Pressed while the drop-off is unusable: say why rather than
              // send stores priced to somewhere nobody can deliver.
              if (deliveryProblem) {
                feedback.showError(copy.stage2.blockedDropOff(customerFirstName));
                return;
              }
              if (storesUpToDate || (await sendToCustomer())) onContinue();
            }}
          >
            {copy.stage2.continueAction}
          </DispatcherButton>
        </div>
      )}
    </div>
  );
}
