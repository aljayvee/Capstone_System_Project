import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { apiService, type ApiRateConfig } from "../../../../services/apiService";
import { OwnerPanelShell } from "../../components/OwnerPanelShell";
import { PanelButton, ConfirmDialog } from "@/components/panel";
import { RatesCardsView, type RateCardId, type RateField } from "./components/RatesCardsView";
import { RatesMatrixPolicySection } from "./components/RatesMatrixPolicySection";
import {
  DEFAULT_RATE_POLICY_BOUNDS,
  resolveRateBounds,
  validateRateFields,
  type RateBoundsMap,
} from "./lib/priceMatrix";
import { ServiceRatesSkeleton } from "../../components/OwnerSkeletons";

const cardDeltaLabels: Record<RateCardId, string[]> = {
  baseFare: ["Base Delivery Fare"],
  excessDistance: ["Excess Distance Rate (per 1km)"],
  multiStoreFee: ["Multi-Store Stop Fee"],
  storeLimit: ["Max Additional Stops"],
  grocery: ["Groceries Flat Handling", "Groceries Percentage Rate", "Groceries Threshold"],
  nonCash: ["Non-COD Surcharge Threshold", "Non-COD High Surcharge", "Non-COD Low Surcharge"],
};

const cardFieldKeys: Record<RateCardId, RateField[]> = {
  baseFare: ["baseFee"],
  excessDistance: ["perKmRate"],
  multiStoreFee: ["multiStoreFeePerStore"],
  storeLimit: ["maxAdditionalStores"],
  grocery: ["groceryFeeThreshold", "groceryFeeFlat", "groceryFeePercent"],
  nonCash: ["nonCodThreshold", "nonCodFeeLow", "nonCodFeeHigh"],
};

export const ServiceRatesModule: React.FC = () => {
  const [activeCard, setActiveCard] = useState<RateCardId | null>(null);
  const [pendingCard, setPendingCard] = useState<RateCardId | null>(null);
  const [initialRates, setInitialRates] = useState<ApiRateConfig | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDiscardConfirmModal, setShowDiscardConfirmModal] = useState(false);

  // Form state
  const [baseFee, setBaseFee] = useState<number | null>(null);
  const [perKmRate, setPerKmRate] = useState(10);
  const [multiStoreFeePerStore, setMultiStoreFeePerStore] = useState(30);
  const [maxAdditionalStores, setMaxAdditionalStores] = useState(2);
  const [groceryFeeThreshold, setGroceryFeeThreshold] = useState(1001);
  const [groceryFeePercent, setGroceryFeePercent] = useState(10);
  const [groceryFeeFlat, setGroceryFeeFlat] = useState(50);
  const [nonCodThreshold, setNonCodThreshold] = useState(3000);
  const [nonCodFeeHigh, setNonCodFeeHigh] = useState(15);
  const [nonCodFeeLow, setNonCodFeeLow] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [pricingRules, setPricingRules] = useState({
    baseFeeDistanceKm: 2.0,
    handlingItemUnitsThreshold: 20,
    handlingAmountThreshold: 1000,
  });
  const [bounds, setBounds] = useState<RateBoundsMap>(DEFAULT_RATE_POLICY_BOUNDS);

  const resetFormToInitial = (config: ApiRateConfig) => {
    setBaseFee(config.baseFee);
    setPerKmRate(config.perKmRate);
    setMultiStoreFeePerStore(config.multiStoreFeePerStore ?? 30);
    setMaxAdditionalStores(config.maxAdditionalStores ?? 2);
    setGroceryFeeThreshold(config.groceryFeeThreshold ?? 1001);
    setGroceryFeePercent(config.groceryFeePercent ?? 10);
    setGroceryFeeFlat(config.groceryFeeFlat ?? 50);
    setNonCodThreshold(config.nonCodThreshold ?? 3000);
    setNonCodFeeHigh(config.nonCodFeeHigh ?? 15);
    setNonCodFeeLow(config.nonCodFeeLow ?? 0);
  };

  const loadConfig = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const config = await apiService.getRateConfig();
      if (!config) {
        setLoadError("The saved rate configuration did not load.");
        return;
      }
      setInitialRates(config);
      resetFormToInitial(config);

      if (config.pricingRules) {
        setPricingRules({
          baseFeeDistanceKm: config.pricingRules.baseFeeDistanceKm,
          handlingItemUnitsThreshold: config.pricingRules.handlingItemUnitsThreshold,
          handlingAmountThreshold: config.pricingRules.handlingAmountThreshold,
        });
        setBounds(resolveRateBounds(config.pricingRules.bounds));
      }
    } catch (err) {
      console.warn("Failed to load rate configs:", err);
      setLoadError("The saved rate configuration did not load.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const getRateDeltas = (): Array<{ label: string; from: string; to: string }> => {
    if (!initialRates) return [];
    const deltas: Array<{ label: string; from: string; to: string }> = [];

    if (baseFee !== null && baseFee !== initialRates.baseFee) {
      deltas.push({
        label: "Base Delivery Fare",
        from: `₱${initialRates.baseFee.toFixed(2)}`,
        to: `₱${baseFee.toFixed(2)}`,
      });
    }
    if (perKmRate !== initialRates.perKmRate) {
      deltas.push({
        label: "Excess Distance Rate (per 1km)",
        from: `₱${initialRates.perKmRate.toFixed(2)}/km`,
        to: `₱${perKmRate.toFixed(2)}/km`,
      });
    }
    const initMultiStore = initialRates.multiStoreFeePerStore ?? 30;
    if (multiStoreFeePerStore !== initMultiStore) {
      deltas.push({
        label: "Multi-Store Stop Fee",
        from: `₱${initMultiStore.toFixed(2)}/store`,
        to: `₱${multiStoreFeePerStore.toFixed(2)}/store`,
      });
    }
    const initMaxStores = initialRates.maxAdditionalStores ?? 2;
    if (maxAdditionalStores !== initMaxStores) {
      deltas.push({
        label: "Max Additional Stops",
        from: `${initMaxStores} stops`,
        to: `${maxAdditionalStores} stops`,
      });
    }
    const initFlat = initialRates.groceryFeeFlat ?? 50;
    if (groceryFeeFlat !== initFlat) {
      deltas.push({
        label: "Groceries Flat Handling",
        from: `₱${initFlat.toFixed(2)}`,
        to: `₱${groceryFeeFlat.toFixed(2)}`,
      });
    }
    const initPercent = initialRates.groceryFeePercent ?? 10;
    if (groceryFeePercent !== initPercent) {
      deltas.push({
        label: "Groceries Percentage Rate",
        from: `${initPercent}%`,
        to: `${groceryFeePercent}%`,
      });
    }
    const initThresh = initialRates.groceryFeeThreshold ?? 1001;
    if (groceryFeeThreshold !== initThresh) {
      deltas.push({
        label: "Groceries Threshold",
        from: `₱${initThresh.toLocaleString()}`,
        to: `₱${groceryFeeThreshold.toLocaleString()}`,
      });
    }
    const initNonCodThresh = initialRates.nonCodThreshold ?? 3000;
    if (nonCodThreshold !== initNonCodThresh) {
      deltas.push({
        label: "Non-COD Surcharge Threshold",
        from: `₱${initNonCodThresh.toLocaleString()}`,
        to: `₱${nonCodThreshold.toLocaleString()}`,
      });
    }
    const initNonCodHigh = initialRates.nonCodFeeHigh ?? 15;
    if (nonCodFeeHigh !== initNonCodHigh) {
      deltas.push({
        label: "Non-COD High Surcharge",
        from: `₱${initNonCodHigh.toFixed(2)}`,
        to: `₱${nonCodFeeHigh.toFixed(2)}`,
      });
    }
    const initNonCodLow = initialRates.nonCodFeeLow ?? 0;
    if (nonCodFeeLow !== initNonCodLow) {
      deltas.push({
        label: "Non-COD Low Surcharge",
        from: `₱${initNonCodLow.toFixed(2)}`,
        to: `₱${nonCodFeeLow.toFixed(2)}`,
      });
    }

    return deltas;
  };

  const cardDeltas = activeCard
    ? getRateDeltas().filter((delta) => cardDeltaLabels[activeCard].includes(delta.label))
    : [];
  const hasChanges = cardDeltas.length > 0;
  const draftRecord: Record<RateField, number | null> = {
    baseFee,
    perKmRate,
    multiStoreFeePerStore,
    maxAdditionalStores,
    groceryFeeThreshold,
    groceryFeeFlat,
    groceryFeePercent,
    nonCodThreshold,
    nonCodFeeLow,
    nonCodFeeHigh,
  };
  const activeCardErrors = activeCard
    ? validateRateFields(draftRecord, bounds, cardFieldKeys[activeCard])
    : [];

  const handleEditCard = (card: RateCardId) => {
    if (activeCard === card) return;
    if (hasChanges) {
      setPendingCard(card);
      setShowDiscardConfirmModal(true);
      return;
    }
    if (initialRates) resetFormToInitial(initialRates);
    setActiveCard(card);
  };

  const handleCancel = () => {
    if (hasChanges) {
      setPendingCard(null);
      setShowDiscardConfirmModal(true);
      return;
    }
    if (initialRates) resetFormToInitial(initialRates);
    setActiveCard(null);
  };

  const handleConfirmDiscard = () => {
    if (initialRates) {
      resetFormToInitial(initialRates);
    }
    setShowDiscardConfirmModal(false);
    setActiveCard(pendingCard);
    setPendingCard(null);
  };

  const handleFieldChange = (field: RateField, value: number | null) => {
    switch (field) {
      case "baseFee": setBaseFee(value); break;
      case "perKmRate": setPerKmRate(value ?? 0); break;
      case "multiStoreFeePerStore": setMultiStoreFeePerStore(value ?? 0); break;
      case "maxAdditionalStores": setMaxAdditionalStores(value ?? 0); break;
      case "groceryFeeThreshold": setGroceryFeeThreshold(value ?? 0); break;
      case "groceryFeeFlat": setGroceryFeeFlat(value ?? 0); break;
      case "groceryFeePercent": setGroceryFeePercent(value ?? 0); break;
      case "nonCodThreshold": setNonCodThreshold(value ?? 0); break;
      case "nonCodFeeLow": setNonCodFeeLow(value ?? 0); break;
      case "nonCodFeeHigh": setNonCodFeeHigh(value ?? 0); break;
    }
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) {
      toast.error("Rates are still loading. Wait for them before saving.");
      return;
    }
    if (baseFee === null) {
      toast.error("Enter a base delivery fare before saving.");
      return;
    }
    if (loadError) {
      toast.error("These rates were never loaded. Reload them before saving.");
      return;
    }
    if (activeCardErrors.length > 0) {
      toast.error(activeCardErrors[0]);
      return;
    }

    if (!hasChanges) {
      toast.info("No rate changes detected.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    if (baseFee === null) return;
    setIsSaving(true);
    try {
      const saved = await apiService.updateRateConfig({
        baseFee,
        perKmRate,
        multiStoreFeePerStore,
        maxAdditionalStores,
        groceryFeeThreshold,
        groceryFeePercent,
        groceryFeeFlat,
        nonCodThreshold,
        nonCodFeeHigh,
        nonCodFeeLow,
      });
      if (!saved) {
        setShowConfirmModal(false);
        toast.error("The rates were not saved. The server did not accept the change.");
        return;
      }
      setInitialRates(saved);
      resetFormToInitial(saved);
      setShowConfirmModal(false);
      setSavedSuccess(true);
      setActiveCard(null);
      toast.success("Rate configurations saved.");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setShowConfirmModal(false);
      toast.error(err.message || "Failed to save rate configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OwnerPanelShell
      title="Service Rates"
      className="owner-rates-enter"
      controls={loadError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-plate bg-status-act-fill px-4 py-2 text-label text-status-act-ink"
        >
          <AlertTriangle size={15} className="shrink-0" />
          <span className="flex-1">
            {loadError} Saving is switched off until rates load.
          </span>
          <PanelButton
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => void loadConfig()}
          >
            Try again
          </PanelButton>
        </div>
      ) : undefined}
      aside={
        savedSuccess && (
          <span
            role="status"
            className="flex items-center gap-1.5 rounded-trim bg-status-done-fill px-3 py-1.5 text-micro uppercase text-status-done-ink"
          >
            <CheckCircle2 size={15} /> Saved to Database
          </span>
        )
      }
      footer={activeCard && initialRates && !isLoading ? (
        <div className="flex items-center justify-end gap-2 border-t border-hairline bg-board-plate px-4 py-3">
          <PanelButton type="button" variant="secondary" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </PanelButton>
          <PanelButton
            type="submit"
            form="service-rates-active-card"
            variant="primary"
            loading={isSaving}
            disabled={Boolean(loadError) || !hasChanges || activeCardErrors.length > 0}
          >
            Update
          </PanelButton>
        </div>
      ) : undefined}
    >
      {isLoading ? (
        <ServiceRatesSkeleton />
      ) : loadError && !initialRates ? (
        <div className="bg-board-plate border border-edge rounded-plate p-10 flex flex-col items-center justify-center space-y-3 text-center">
          <AlertTriangle size={32} className="text-status-act-ink" />
          <p className="text-body text-ink font-semibold">Service Rates Failed to Load</p>
          <p className="text-label text-ink-muted max-w-md">
            {loadError} Please check your connection to the server and retry.
          </p>
          <PanelButton
            variant="primary"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => void loadConfig()}
          >
            Retry Loading Rates
          </PanelButton>
        </div>
      ) : initialRates ? (
        <>
          <RatesCardsView
            rateConfig={initialRates}
            draft={draftRecord}
            baseFeeDistanceKm={pricingRules.baseFeeDistanceKm}
            bounds={bounds}
            activeCard={activeCard}
            isSaving={isSaving}
            isReadOnly={Boolean(loadError)}
            onEdit={handleEditCard}
            onFieldChange={handleFieldChange}
            onSubmit={handleSaveSubmit}
          />
          <RatesMatrixPolicySection
            rateConfig={initialRates}
            pricingRules={pricingRules}
            bounds={bounds}
          />
        </>
      ) : null}

      {/* CONFIRMATION DIALOG BEFORE SAVING */}
      <ConfirmDialog
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title="Confirm Service Rates Configuration"
        tone="info"
        busy={isSaving}
        confirmLabel="Confirm & Apply Rates"
        cancelLabel="Back to Rates"
        onConfirm={handleConfirmSave}
        consequence="Updated rate configurations take effect immediately for all subsequent customer errand calculations."
        body={
          <div className="space-y-3">
            <p className="text-body text-ink">
              Are you sure you want to save the following updated rate configurations?
            </p>
            <div className="rounded-plate border border-edge bg-board-ground p-3.5 space-y-2 text-label divide-y divide-hairline">
              {cardDeltas.map((delta, idx) => (
                <div key={idx} className={`flex items-start justify-between gap-3 ${idx > 0 ? "pt-2" : ""}`}>
                  <span className="text-ink-muted shrink-0">{delta.label}:</span>
                  <span className="text-ink text-right font-medium">
                    <span className="line-through text-ink-muted mr-1.5">{delta.from}</span>
                    <span className="text-field-ink font-semibold font-mono">→ {delta.to}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        }
      />

      {/* DISCARD CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={showDiscardConfirmModal}
        onOpenChange={setShowDiscardConfirmModal}
        title="Discard Unsaved Changes?"
        tone="danger"
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        onConfirm={handleConfirmDiscard}
        consequence="Your unsaved edits to this rate card will be lost."
        body={
          <p className="text-body text-ink">
            Discard the unsaved changes to this rate card?
          </p>
        }
      />
    </OwnerPanelShell>
  );
};
