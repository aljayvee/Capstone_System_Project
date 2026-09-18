import React, { useState } from "react";
import { Errand } from "../../../types/errand";
import { formatErrandId } from "../../../utils/formatErrandId";
import { summarizeEta } from "../../../utils/eta";
import { MapPin, Phone, Bike, Clock, MessageSquare, Copy, Check, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelState } from "@/components/panel/PanelState";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherCard } from "@/components/panel/DispatcherCard";
import { DispatcherSearchField } from "@/components/panel/DispatcherSearchField";
import { StatusChip } from "@/components/panel/DispatcherBadge";
import { RUN_PROGRESSION, progressIndexOf } from "@/lib/statusPresentation";

interface ActiveErrandsPanelProps {
  errands: Errand[];
  onOpenChat: (orderId: string) => void;
  /** Additive, all optional. */
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
}

/**
 * Filters as data. Each of these was a hand-written button, and three carried a
 * decorative emoji in the label (a scooter, a shop, a rocket), which CLAUDE.md
 * bans as structural iconography.
 */
const FILTERS = [
  { id: "ALL", label: "All in motion", match: () => true },
  {
    id: "ASSIGNED",
    label: "Assigned",
    match: (s: string) => s === "ASSIGNED" || s === "ACCEPTED" || s === "PENDING",
  },
  {
    id: "STORE",
    label: "At the store",
    match: (s: string) => s === "TRAVELING" || s === "AT STORE" || s === "PURCHASED",
  },
  {
    id: "EN_ROUTE",
    label: "Out for delivery",
    match: (s: string) => s === "IN ROUTE" || s === "EN ROUTE" || s === "DOING ERRAND",
  },
];

const upper = (s: unknown) => String(s ?? "").toUpperCase();

export const ActiveErrandsPanel: React.FC<ActiveErrandsPanelProps> = ({
  errands,
  onOpenChat,
  isLoading = false,
  loadError = null,
  onRetry,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeErrands = errands.filter((e) => {
    const s = upper(e.status);
    return (
      s !== "AVAILABLE" &&
      s !== "CANCELLED" &&
      s !== "COMPLETED" &&
      s !== "DELIVERED" &&
      s !== "PASSING BY"
    );
  });

  const filteredErrands = activeErrands.filter((e) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      String(e.id).toLowerCase().includes(query) ||
      String(e.customerName || "").toLowerCase().includes(query) ||
      String(e.customerPhone || "").toLowerCase().includes(query) ||
      String(e.riderName || "").toLowerCase().includes(query) ||
      String(e.category || "").toLowerCase().includes(query) ||
      String(e.deliveryAddress || "").toLowerCase().includes(query) ||
      String(e.description || "").toLowerCase().includes(query);

    const filter = FILTERS.find((f) => f.id === statusFilter) ?? FILTERS[0];
    return matchesSearch && filter.match(upper(e.status));
  });

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(formatErrandId(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasFilters = statusFilter !== "ALL" || search.trim().length > 0;

  return (
    <PanelShell
      title="Active errands"
      figure={{
        label: "On the road",
        value: isLoading || loadError ? "--" : String(activeErrands.length),
      }}
      detail={`${activeErrands.length} run${activeErrands.length === 1 ? "" : "s"} on the road`}
      aside={
        <div className="w-full sm:w-80">
          <DispatcherSearchField
            aria-label="Search active runs by customer, rider, route number or stop"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, rider or stop"
          />
        </div>
      }
      controls={
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => {
            const isActive = statusFilter === f.id;
            const count =
              f.id === "ALL"
                ? activeErrands.length
                : activeErrands.filter((e) => f.match(upper(e.status))).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                aria-pressed={isActive}
                className={cn(
                  "flex min-h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-trim px-3 text-micro uppercase transition-colors",
                  isActive
                    ? "bg-board-field text-board-plate"
                    : "bg-board-plate text-ink-muted hover:text-ink"
                )}
              >
                <span>{f.label}</span>
                <span data-figure className="tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      }
    >
      <PanelState
        isLoading={isLoading}
        error={loadError}
        onRetry={onRetry}
        isEmpty={filteredErrands.length === 0}
        hasFilters={hasFilters}
        onResetFilters={() => {
          setStatusFilter("ALL");
          setSearch("");
        }}
        emptyTitle="Nothing in motion"
        emptyBody="A run appears here once it is claimed and a rider is on it."
        errorTitle="The active runs did not load"
        loadingRows={3}
      >
        <div className="space-y-3">
          {filteredErrands.map((e) => {
            const progressIndex = progressIndexOf(e.status);
            const eta = summarizeEta(e.etaLowAt, e.etaHighAt);
            const items =
              e.pabiliDetails && e.pabiliDetails.length > 0
                ? e.pabiliDetails
                : e.pabiliItemRequests && e.pabiliItemRequests.length > 0
                  ? e.pabiliItemRequests
                  : [];

            return (
              <DispatcherCard key={e.id} padding="sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span data-figure className="font-mono text-data text-ink">
                        {formatErrandId(e.id)}
                      </span>
                      <DispatcherButton
                        variant="subtle"
                        size="sm"
                        iconOnly
                        aria-label="Copy this run's number"
                        icon={copiedId === e.id ? <Check size={14} /> : <Copy size={14} />}
                        onClick={() => handleCopyId(e.id)}
                      />
                      {/* Was the raw status in an ad-hoc blue pill with a
                          pulsing dot. */}
                      <StatusChip status={e.status} />
                      {eta ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-micro uppercase",
                            eta.isLate
                              ? "bg-status-act-fill text-status-act-ink"
                              : "bg-board-ground text-ink-muted"
                          )}
                        >
                          <Clock size={11} />
                          <span data-figure>{eta.label}</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-body text-ink">{e.customerName || "Customer"}</span>
                      <span className="inline-flex items-center gap-1.5 text-label text-ink-muted">
                        <Phone size={12} />
                        <span data-figure>{e.customerPhone || "No number on file"}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-label text-ink-muted">
                        <Bike size={13} />
                        {e.riderName || "No rider assigned yet"}
                      </span>
                    </div>

                    <div className="flex items-start gap-1.5">
                      <MapPin size={13} className="mt-0.5 shrink-0 text-ink-muted" />
                      <span className="min-w-0 text-label text-ink">
                        {e.deliveryAddress || "Tacurong City"}
                        {e.description ? `: "${e.description}"` : ""}
                      </span>
                    </div>

                    {items.length > 0 ? (
                      <DispatcherCard.Region padding="none" className="flex items-center gap-2 px-3 py-2">
                        <ShoppingBag size={13} className="shrink-0 text-ink-muted" />
                        <span className="shrink-0 text-micro uppercase text-ink-muted">
                          {items.length} item{items.length === 1 ? "" : "s"}
                        </span>
                        <span className="min-w-0 truncate text-label text-ink">
                          {items
                            .map((it) => `${it.itemName}${it.quantity ? ` x${it.quantity}` : ""}`)
                            .join(", ")}
                        </span>
                      </DispatcherCard.Region>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 md:flex-col md:items-end">
                    <div className="text-right">
                      <p className="text-micro uppercase text-ink-muted">Delivery fee</p>
                      <p data-figure className="font-mono text-data text-ink">
                        {e.deliveryFee ? `₱${Math.round(e.deliveryFee)}` : "Not set"}
                      </p>
                    </div>

                    <DispatcherButton
                      variant="field"
                      size="md"
                      icon={<MessageSquare size={14} />}
                      onClick={() => onOpenChat(e.id)}
                    >
                      Open chat
                    </DispatcherButton>
                  </div>
                </div>

                {/* The progression, drawn as the same detent rail the inspector
                    uses and read from the same shared table. This panel used to
                    keep its own TRACKING_STEPS list and its own status mapping,
                    so the two screens could disagree about where a run was. It
                    also drew an absolutely positioned progress line whose width
                    was a percentage of the whole container while its track was
                    inset by 24px on each side, so at 100% the line overshot the
                    track it was meant to fill. */}
                {progressIndex >= 0 ? (
                  <ol className="mt-4 flex items-stretch border-t border-hairline pt-3">
                    {RUN_PROGRESSION.map((stage, idx) => {
                      const isDone = idx <= progressIndex;
                      const isCurrent = idx === progressIndex;
                      return (
                        <li
                          key={stage.label}
                          aria-current={isCurrent ? "step" : undefined}
                          className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-1"
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "size-2.5 rounded-full",
                              isCurrent
                                ? "bg-signal"
                                : isDone
                                  ? "bg-board-field"
                                  : "border-[1.5px] border-board-trim"
                            )}
                          />
                          <span
                            className={cn(
                              "w-full truncate text-center text-micro uppercase",
                              isCurrent ? "text-ink" : isDone ? "text-ink-muted" : "text-board-trim"
                            )}
                          >
                            {stage.label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-hairline pt-2.5">
                  <span className="text-label text-ink-muted">
                    Dispatcher: <span className="text-ink">{e.dispatcherName || "Unassigned"}</span>
                  </span>
                  <span data-figure className="font-mono text-label text-ink-muted">
                    Updated{" "}
                    {new Date(e.updatedAt || e.createdAt || Date.now()).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </DispatcherCard>
            );
          })}
        </div>
      </PanelState>
    </PanelShell>
  );
};
