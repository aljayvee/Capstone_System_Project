import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Copy, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Errand } from "../../../../types/errand";
import { apiService, type ApiDeclineReason } from "../../../../services/apiService";
import { formatErrandId } from "../../../../utils/formatErrandId";
import { formatPeso } from "../../../../utils/format";
import { DispatcherBadge, StatusChip } from "@/components/panel/DispatcherBadge";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  distanceKmOf,
  etaOf,
  formatClosedAt,
  formatKm,
  isDistanceEstimated,
  itemSections,
  outcomeOf,
} from "./historyModel";
import {
  HANDOVER_PROOF_KINDS,
  ProofPhotoGrid,
  STORE_PROOF_KINDS,
  useProofPhotos,
} from "./HistoryProofPhotos";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-hairline px-5 py-4">
      <h3 className="mb-2.5 text-micro uppercase text-ink-muted">{title}</h3>
      {children}
    </section>
  );
}

function MoneyRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 py-1",
        emphasis && "mt-1 border-t border-hairline pt-2"
      )}
    >
      <dt className={emphasis ? "text-label text-ink" : "text-body text-ink-muted"}>{label}</dt>
      <dd
        data-figure
        className={cn("font-mono tabular-nums text-ink", emphasis ? "text-data" : "text-body")}
      >
        {value}
      </dd>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-micro uppercase text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-body text-ink">{children}</dd>
    </div>
  );
}

type ReasonState =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; reasons: ApiDeclineReason[] };

/** Asked only for a cancelled order, and asked again only on Try again. */
function useDeclineReasons(errandId: string, enabled: boolean) {
  const [state, setState] = useState<ReasonState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState({ status: "loading" });
    void apiService.getDeclineReasons(errandId).then((reasons) => {
      if (cancelled) return;
      setState(reasons === null ? { status: "failed" } : { status: "ready", reasons });
    });
    return () => {
      cancelled = true;
    };
  }, [errandId, enabled, attempt]);

  return { state, retry: () => setAttempt((n) => n + 1) };
}

interface HistoryErrandDetailProps {
  errand: Errand;
  onOpenChat: (errandId: string) => void;
}

/**
 * One finished order in full: who it was for, what was bought where, what was
 * photographed, and what the money came to. Keyed by errand id by its parent,
 * so every fetch and toggle here starts fresh for each order.
 */
export function HistoryErrandDetail({ errand, onOpenChat }: HistoryErrandDetailProps) {
  const outcome = outcomeOf(errand);
  const isCancelled = outcome === "cancelled";
  const sections = useMemo(() => itemSections(errand), [errand]);
  const storeNames = useMemo(
    () => Object.fromEntries((errand.pinpoints ?? []).map((stop) => [stop.id, stop.storeName])),
    [errand.pinpoints]
  );
  const photos = useProofPhotos(errand.id);
  const decline = useDeclineReasons(errand.id, isCancelled);
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(formatErrandId(errand.id));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Said out loud: the reader is about to paste something they believe
      // is on their clipboard.
      toast.error("Could not copy the errand ID. Select it and copy by hand.");
    }
  };

  const distanceKm = distanceKmOf(errand);
  const eta = etaOf(errand);
  const breakdown = errand.feeBreakdown;
  const earnings = errand.riderEarnings;
  const amountPaid = errand.paymentPlan?.amountPaid ?? 0;

  return (
    <article className="flex flex-col" aria-label={`Order ${formatErrandId(errand.id)}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 data-figure className="font-mono text-panel text-ink">
              {formatErrandId(errand.id)}
            </h3>
            <DispatcherButton
              variant="subtle"
              size="sm"
              iconOnly
              aria-label={copied ? "Copied the errand ID" : "Copy the errand ID"}
              icon={copied ? <Check size={14} /> : <Copy size={14} />}
              onClick={() => void copyId()}
            />
            {/* The board's own "close without an order" write reads as
                PASSING BY until the next refresh; it is a cancellation. */}
            <StatusChip status={isCancelled ? "CANCELLED" : errand.status} />
          </div>
          <p data-figure className="mt-1 text-label text-ink-muted">
            {isCancelled ? "Closed" : "Delivered"} {formatClosedAt(errand)}
          </p>
        </div>
        <DispatcherButton
          variant="secondary"
          size="sm"
          icon={<MessageCircle size={14} />}
          onClick={() => onOpenChat(errand.id)}
        >
          Open the conversation
        </DispatcherButton>
      </header>

      <Section title="Overview">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Fact label="Customer">{errand.customerName || "Customer"}</Fact>
          <Fact label="Phone">
            {errand.customerPhone ? (
              <span data-figure className="font-mono">
                {errand.customerPhone}
              </span>
            ) : (
              <span className="text-ink-muted">Not on file</span>
            )}
          </Fact>
          <div className="sm:col-span-2">
            <Fact label="Deliver to">{errand.deliveryAddress || "No address recorded"}</Fact>
          </div>
          <Fact label="Rider">
            {errand.riderName || <span className="text-ink-muted">No rider assigned</span>}
          </Fact>
          <Fact label="Payment">
            {errand.paymentSelection?.paymentMode?.name || (
              <span className="text-ink-muted">Not chosen</span>
            )}
          </Fact>
          <Fact label="Distance">
            {distanceKm != null ? (
              <>
                <span data-figure className="font-mono">
                  {formatKm(distanceKm)}
                </span>
                <span className="block text-label text-ink-muted">
                  {isDistanceEstimated(errand)
                    ? "Estimated, no road route was found"
                    : "Road distance the fee was billed on"}
                </span>
              </>
            ) : (
              <span className="text-ink-muted">Not measured</span>
            )}
          </Fact>
          <Fact label="ETA">
            {eta ? (
              <>
                <span data-figure>{eta.window}</span>
                <span className="block text-label text-ink-muted">
                  {[
                    "Last estimate shown",
                    eta.degraded ? "rough, without a live route" : null,
                    eta.verdict,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </>
            ) : (
              <span className="text-ink-muted">
                {isCancelled ? "Never estimated" : "No estimate was recorded"}
              </span>
            )}
          </Fact>
        </dl>
      </Section>

      {isCancelled ? (
        <Section title="Why it was cancelled">
          {decline.state.status === "loading" ? (
            <Skeleton className="h-10 w-full rounded-trim bg-hairline" />
          ) : decline.state.status === "failed" ? (
            <div role="alert" className="flex flex-wrap items-center gap-3">
              <p className="text-label text-status-act-ink">The reason did not load.</p>
              <DispatcherButton
                variant="secondary"
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={decline.retry}
              >
                Try again
              </DispatcherButton>
            </div>
          ) : decline.state.reasons.length === 0 ? (
            <p className="text-body text-ink-muted">
              No reason was recorded. Orders closed without an order carry none.
            </p>
          ) : (
            <ul className="space-y-2">
              {decline.state.reasons.map((entry) => (
                <li key={entry.id} className="rounded-trim bg-board-ground px-3 py-2">
                  <p className="text-body text-ink">{entry.reason}</p>
                  <p data-figure className="mt-0.5 text-label text-ink-muted">
                    {new Date(entry.createdAt).toLocaleString("en-PH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {entry.isCustom ? " · written by the dispatcher" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      <Section title="What was bought">
        {sections.length === 0 ? (
          <p className="text-body text-ink-muted">No item list was filed for this order.</p>
        ) : (
          <div className="space-y-3">
            {sections.map((section) => (
              <div key={section.key}>
                <p className="text-label text-ink">{section.title}</p>
                {section.storeCategory ? (
                  <p className="text-micro uppercase text-ink-muted">{section.storeCategory}</p>
                ) : null}
                <ul className="mt-1 space-y-1">
                  {section.lines.map((line) => (
                    <li key={line.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-body text-ink">{line.label}</span>
                      {line.outOfStock ? <DispatcherBadge tone="closed">Out of stock</DispatcherBadge> : null}
                      {line.notes ? (
                        <span className="basis-full text-label text-ink-muted">"{line.notes}"</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Store receipts">
        <ProofPhotoGrid
          errandId={errand.id}
          state={photos.state}
          onRetry={photos.retry}
          kinds={STORE_PROOF_KINDS}
          emptyText="No store receipts filed."
          storeNames={storeNames}
        />
      </Section>

      <Section title="Handover and payment proof">
        <ProofPhotoGrid
          errandId={errand.id}
          state={photos.state}
          onRetry={photos.retry}
          kinds={HANDOVER_PROOF_KINDS}
          emptyText="No handover or payment photos captured."
        />
      </Section>

      <Section title={isCancelled ? "What was quoted" : "Money"}>
        {breakdown ? (
          <>
            <dl>
              <MoneyRow label="Items" value={formatPeso(breakdown.itemsSubtotal)} />
              <MoneyRow label="Delivery fees" value={formatPeso(breakdown.fees.subtotal)} />
              {breakdown.tip > 0 ? <MoneyRow label="Tip" value={formatPeso(breakdown.tip)} /> : null}
              <MoneyRow
                label={isCancelled ? "Total quoted" : "Customer paid"}
                value={formatPeso(breakdown.grandTotal)}
                emphasis
              />
              {isCancelled && amountPaid > 0 ? (
                <MoneyRow label="Paid before it was cancelled" value={formatPeso(amountPaid)} />
              ) : null}
            </dl>
            {!breakdown.isFinal ? (
              <p className="mt-2 text-label text-ink-muted">
                Estimate. The fee was never finalised on a routed trip, so these figures may differ
                from what was collected.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-body text-ink-muted">Not priced. The server sent no figures for this order.</p>
        )}

        {!isCancelled ? (
          <div className="mt-4 rounded-trim bg-board-ground px-3 py-2.5">
            <p className="text-label text-ink">
              Delivered by {errand.riderName || "a rider whose name was not recorded"}
            </p>
            {earnings ? (
              <>
                <dl className="mt-1">
                  <MoneyRow
                    label={`Rider's share (${Math.round(earnings.commissionRate * 100)}%)`}
                    value={formatPeso(earnings.deliveryFee * earnings.commissionRate)}
                  />
                  {earnings.tip > 0 ? (
                    <MoneyRow label="Tip (the rider keeps all of it)" value={formatPeso(earnings.tip)} />
                  ) : null}
                  <MoneyRow label="Rider earned" value={formatPeso(earnings.riderShare)} emphasis />
                </dl>
                {!earnings.isFinal ? (
                  <p className="mt-1 text-label text-ink-muted">
                    Projected from the commission rate. No commission was recorded for this order yet.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-body text-ink-muted">Earnings for this order are not available.</p>
            )}
          </div>
        ) : null}
      </Section>
    </article>
  );
}
