import React from "react";
import { CreditCard, ListOrdered, MapPin, Pencil, Route, ShoppingBasket, Store } from "lucide-react";
import type { ApiRateConfig } from "../../../../../services/apiService";

export type RateCardId = "baseFare" | "excessDistance" | "multiStoreFee" | "storeLimit" | "grocery" | "nonCash";
export type RateField = keyof Pick<ApiRateConfig,
  "baseFee" | "perKmRate" | "multiStoreFeePerStore" | "maxAdditionalStores" |
  "groceryFeeThreshold" | "groceryFeeFlat" | "groceryFeePercent" |
  "nonCodThreshold" | "nonCodFeeLow" | "nonCodFeeHigh">;

type Unit = "money" | "percent" | "stops" | "perKm" | "perStore";
type Field = { key: RateField; label: string; viewLabel?: string; unit: Unit; min: number; max?: number; step?: number };

interface RatesCardsViewProps {
  rateConfig: ApiRateConfig;
  draft: Record<RateField, number | null>;
  baseFeeDistanceKm: number;
  activeCard: RateCardId | null;
  isSaving: boolean;
  isReadOnly: boolean;
  onEdit: (card: RateCardId) => void;
  onFieldChange: (field: RateField, value: number | null) => void;
  onSubmit: (event: React.FormEvent) => void;
}

const formatRate = (value: number, unit: Unit) => {
  if (unit === "percent") return `${value}%`;
  if (unit === "stops") return `${value} stops`;
  const amount = `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return unit === "perKm" ? `${amount} / km` : unit === "perStore" ? `${amount} / store` : amount;
};

export const RatesCardsView: React.FC<RatesCardsViewProps> = ({
  rateConfig, draft, baseFeeDistanceKm, activeCard, isSaving, isReadOnly,
  onEdit, onFieldChange, onSubmit,
}) => {
  const [emptyFields, setEmptyFields] = React.useState<Partial<Record<RateField, boolean>>>({});
  React.useEffect(() => setEmptyFields({}), [activeCard]);

  const cards: Array<{ id: RateCardId; title: string; icon: typeof MapPin; fields: Field[] }> = [
    { id: "baseFare", title: "Base Delivery Fare", icon: MapPin, fields: [
      { key: "baseFee", label: `Base Delivery Fare (0 - ${baseFeeDistanceKm.toFixed(1)} km)`, viewLabel: `0 - ${baseFeeDistanceKm.toFixed(1)} km`, unit: "money", min: 0, step: 0.01 },
    ] },
    { id: "excessDistance", title: "Excess Distance Rate", icon: Route, fields: [
      { key: "perKmRate", label: "Excess Distance Rate", viewLabel: "Per 1 km", unit: "perKm", min: 0, step: 0.01 },
    ] },
    { id: "multiStoreFee", title: "Multi-Store Errand Surcharge", icon: Store, fields: [
      { key: "multiStoreFeePerStore", label: "Fee Per Additional Store", viewLabel: "Per additional store", unit: "perStore", min: 0, step: 0.01 },
    ] },
    { id: "storeLimit", title: "Max Additional Stores Allowed", icon: ListOrdered, fields: [
      { key: "maxAdditionalStores", label: "Max Additional Stores Allowed", viewLabel: "Additional stops", unit: "stops", min: 1, max: 5 },
    ] },
    { id: "grocery", title: "Grocery & Pabili Subtotal Surcharge", icon: ShoppingBasket, fields: [
      { key: "groceryFeeThreshold", label: "Order Threshold", unit: "money", min: 1000 },
      { key: "groceryFeeFlat", label: "Under Threshold", unit: "money", min: 0, step: 0.01 },
      { key: "groceryFeePercent", label: "At or Above", unit: "percent", min: 0, max: 100, step: 0.01 },
    ] },
    { id: "nonCash", title: "Non-Cash Payment Surcharge", icon: CreditCard, fields: [
      { key: "nonCodThreshold", label: "Purchase Threshold", unit: "money", min: 0 },
      { key: "nonCodFeeLow", label: "Under Threshold", unit: "money", min: 0, step: 0.01 },
      { key: "nonCodFeeHigh", label: "At or Above", unit: "money", min: 0, step: 0.01 },
    ] },
  ];
  const current: Record<RateField, number> = {
    baseFee: rateConfig.baseFee,
    perKmRate: rateConfig.perKmRate,
    multiStoreFeePerStore: rateConfig.multiStoreFeePerStore ?? 30,
    maxAdditionalStores: rateConfig.maxAdditionalStores ?? 2,
    groceryFeeThreshold: rateConfig.groceryFeeThreshold ?? 1001,
    groceryFeeFlat: rateConfig.groceryFeeFlat ?? 50,
    groceryFeePercent: rateConfig.groceryFeePercent ?? 10,
    nonCodThreshold: rateConfig.nonCodThreshold ?? 3000,
    nonCodFeeLow: rateConfig.nonCodFeeLow ?? 0,
    nonCodFeeHigh: rateConfig.nonCodFeeHigh ?? 15,
  };

  return (
    <div className="grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2">
      {cards.map(({ id, title, icon: Icon, fields }) => {
        const editing = activeCard === id;
        const inverted = id === "nonCash" && (draft.nonCodFeeHigh ?? 0) < (draft.nonCodFeeLow ?? 0);
        const lowThreshold = id === "grocery" && (draft.groceryFeeThreshold ?? 0) < 1000;
        return (
          <section key={id} aria-label={title} className="min-w-0 rounded-plate border border-edge bg-board-plate p-4 sm:p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-trim bg-board-ground text-ink-muted"><Icon size={16} /></span>
                <h2 className="text-label font-semibold text-ink">{title}</h2>
              </div>
              <button type="button" aria-label={`Edit ${title}`} title={`Edit ${title}`}
                onClick={() => onEdit(id)} disabled={isReadOnly || isSaving || editing}
                className="flex size-9 shrink-0 items-center justify-center rounded-trim text-ink-muted transition-colors hover:bg-board-ground hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field-ink disabled:cursor-not-allowed disabled:opacity-40">
                <Pencil size={16} />
              </button>
            </div>
            {editing ? (
              <form id="service-rates-active-card" onSubmit={onSubmit} className="space-y-4">
                <div className={`grid grid-cols-1 gap-4 ${fields.length > 1 ? "sm:grid-cols-2" : ""}`}>
                  {fields.map((field) => (
                    <label key={field.key} className="block min-w-0 space-y-1.5 text-body text-ink-muted">
                      <span>{field.label}</span>
                      <span className="flex items-center gap-2">
                        {field.unit !== "percent" && field.unit !== "stops" && <span className="text-ink">₱</span>}
                        <input type="number" required min={field.min} max={field.max} step={field.step ?? 1}
                          value={emptyFields[field.key] ? "" : draft[field.key] ?? ""}
                          disabled={isReadOnly || isSaving}
                          onChange={(event) => {
                            const empty = event.target.value === "";
                            setEmptyFields((previous) => ({ ...previous, [field.key]: empty }));
                            onFieldChange(field.key, empty ? null : Number(event.target.value));
                          }}
                          className="min-w-0 w-full rounded-trim border border-edge bg-board-ground px-3 py-2 text-panel tabular-nums text-ink outline-none focus:ring-2 focus:ring-field-ink" />
                        {field.unit === "percent" && <span className="text-ink">%</span>}
                        {field.unit === "stops" && <span className="text-label text-ink-muted">stops</span>}
                        {field.unit === "perKm" && <span className="text-label text-ink-muted">/ km</span>}
                        {field.unit === "perStore" && <span className="text-label text-ink-muted">/ store</span>}
                      </span>
                    </label>
                  ))}
                </div>
                {lowThreshold && <p role="alert" className="text-label text-status-act-ink">Order threshold must be at least ₱1,000.</p>}
                {inverted && <p role="alert" className="text-label text-status-act-ink">At or Above cannot be lower than Under Threshold.</p>}
              </form>
            ) : (
              <dl className={`grid grid-cols-1 gap-x-5 gap-y-4 ${fields.length > 1 ? "sm:grid-cols-2" : ""}`}>
                {fields.map((field) => (
                  <div key={field.key} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-hairline pb-2.5">
                    <dt className="text-body text-ink-muted">{field.viewLabel ?? field.label}</dt>
                    <dd className={`${fields.length === 1 ? "text-title" : "text-panel"} font-bold tabular-nums text-ink`}>{formatRate(current[field.key], field.unit)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        );
      })}
    </div>
  );
};
