import React, { useState, useEffect } from "react";
import {
  Save,
  Pencil,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiService, type ApiRateConfig } from "../../../../services/apiService";
import { OwnerPanelShell } from "../../components/OwnerPanelShell";
import { PanelButton, ConfirmDialog } from "@/components/panel";
import { RatesOverviewView } from "./components/RatesOverviewView";
import { RatesEditView } from "./components/RatesEditView";

export const ServiceRatesModule: React.FC = () => {
  const [activeMode, setActiveMode] = useState<"view" | "edit">("view");
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
        setPricingRules(config.pricingRules);
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

  const hasChanges = getRateDeltas().length > 0;

  const handleModeChange = (mode: "view" | "edit") => {
    if (mode === activeMode) return;

    if (mode === "view" && hasChanges) {
      setShowDiscardConfirmModal(true);
      return;
    }

    setActiveMode(mode);
  };

  const handleConfirmDiscard = () => {
    if (initialRates) {
      resetFormToInitial(initialRates);
    }
    setShowDiscardConfirmModal(false);
    setActiveMode("view");
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
    if (nonCodFeeHigh < nonCodFeeLow) {
      toast.error("The non-COD fee at or above threshold cannot be lower than the fee below it.");
      return;
    }
    if (groceryFeeThreshold < 1000) {
      toast.error("The grocery order threshold must be at least ₱1,000.");
      return;
    }

    const deltas = getRateDeltas();
    if (deltas.length === 0) {
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
      setActiveMode("view");
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
      controls={
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Segmented Mode Switcher */}
          <div className="inline-flex rounded-plate border border-edge bg-board-plate p-0.5">
            <button
              type="button"
              onClick={() => handleModeChange("view")}
              className={cn(
                "px-3.5 py-1.5 text-micro uppercase font-semibold rounded-trim transition-colors",
                activeMode === "view"
                  ? "bg-board-field text-board-plate"
                  : "text-ink-muted hover:bg-board-ground hover:text-ink"
              )}
            >
              View Rates
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("edit")}
              className={cn(
                "px-3.5 py-1.5 text-micro uppercase font-semibold rounded-trim transition-colors",
                activeMode === "edit"
                  ? "bg-board-field text-board-plate"
                  : "text-ink-muted hover:bg-board-ground hover:text-ink"
              )}
            >
              Edit Rates
            </button>
          </div>

          {loadError && (
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
          )}
        </div>
      }
      action={
        activeMode === "view" ? (
          <PanelButton
            variant="primary"
            size="sm"
            icon={<Pencil size={14} />}
            onClick={() => handleModeChange("edit")}
            disabled={isLoading || Boolean(loadError)}
          >
            Edit Rates
          </PanelButton>
        ) : (
          <div className="flex items-center gap-2">
            <PanelButton
              variant="secondary"
              size="sm"
              onClick={() => handleModeChange("view")}
              disabled={isSaving}
            >
              Cancel
            </PanelButton>
            <PanelButton
              variant="primary"
              size="sm"
              icon={isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              onClick={handleSaveSubmit}
              disabled={
                isSaving ||
                !hasChanges ||
                Boolean(loadError) ||
                nonCodFeeHigh < nonCodFeeLow ||
                groceryFeeThreshold < 1000
              }
            >
              Save Rates
            </PanelButton>
          </div>
        )
      }
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
    >
      {isLoading ? (
        <div className="bg-board-plate border border-edge rounded-plate p-10 flex flex-col items-center justify-center space-y-3">
          <Loader2 size={24} className="animate-spin text-ink-muted" />
          <p className="text-body text-ink-muted">Loading service rates configuration...</p>
        </div>
      ) : activeMode === "view" && initialRates ? (
        <RatesOverviewView
          rateConfig={initialRates}
          pricingRules={pricingRules}
        />
      ) : (
        <RatesEditView
          baseFee={baseFee}
          setBaseFee={setBaseFee}
          perKmRate={perKmRate}
          setPerKmRate={setPerKmRate}
          multiStoreFeePerStore={multiStoreFeePerStore}
          setMultiStoreFeePerStore={setMultiStoreFeePerStore}
          maxAdditionalStores={maxAdditionalStores}
          setMaxAdditionalStores={setMaxAdditionalStores}
          groceryFeeThreshold={groceryFeeThreshold}
          setGroceryFeeThreshold={setGroceryFeeThreshold}
          groceryFeePercent={groceryFeePercent}
          setGroceryFeePercent={setGroceryFeePercent}
          groceryFeeFlat={groceryFeeFlat}
          setGroceryFeeFlat={setGroceryFeeFlat}
          nonCodThreshold={nonCodThreshold}
          setNonCodThreshold={setNonCodThreshold}
          nonCodFeeHigh={nonCodFeeHigh}
          setNonCodFeeHigh={setNonCodFeeHigh}
          nonCodFeeLow={nonCodFeeLow}
          setNonCodFeeLow={setNonCodFeeLow}
          pricingRules={pricingRules}
          isLoading={isLoading}
          isSaving={isSaving}
          loadError={loadError}
          hasChanges={hasChanges}
          onCancel={() => handleModeChange("view")}
          onSubmit={handleSaveSubmit}
        />
      )}

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
              {getRateDeltas().map((delta, idx) => (
                <div key={idx} className={`flex items-start justify-between gap-3 ${idx > 0 ? "pt-2" : ""}`}>
                  <span className="text-ink-muted shrink-0">{delta.label}:</span>
                  <span className="text-ink text-right font-medium">
                    <span className="line-through text-ink-muted mr-1.5">{delta.from}</span>
                    <span className="text-board-field font-semibold font-mono">→ {delta.to}</span>
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
        consequence="Any modifications made in Edit mode will be lost and reverted back to live database rates."
        body={
          <p className="text-body text-ink">
            You have unsaved changes to your rate schedule. Are you sure you want to discard them and return to View mode?
          </p>
        }
      />
    </OwnerPanelShell>
  );
};
