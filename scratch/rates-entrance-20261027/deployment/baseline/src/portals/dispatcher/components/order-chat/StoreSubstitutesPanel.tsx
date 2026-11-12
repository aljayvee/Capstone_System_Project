import { useId, useState } from "react";
import { AlertTriangle, ArrowRight, Check, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { formatItemLabel } from "../../../../utils/format";

export interface SubstituteEntry {
  itemId: number;
  rowIndex: number;
  itemName: string;
  quantity: number;
  size?: string | null;
  loading: boolean;
  substitutes?: string[] | null;
}

interface StoreSubstitutesPanelProps {
  storeName: string;
  customerFirstName: string;
  entries: SubstituteEntry[];
  busy: boolean;
  onRetry: (itemIds: number[]) => void;
  onSwap: (rowIndex: number, itemId: number, name: string) => void;
  onDecline: (itemIds: number[]) => void;
  onSend: (message: string) => void;
}

export function StoreSubstitutesPanel({
  storeName, customerFirstName, entries, busy, onRetry, onSwap, onDecline, onSend,
}: StoreSubstitutesPanelProps) {
  const headingId = useId();
  const messageId = useId();
  const helpId = useId();
  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState<{ signature: string; text: string } | null>(null);
  const [sent, setSent] = useState<{ signature: string; text: string } | null>(null);
  const [confirmDecline, setConfirmDecline] = useState<string | null>(null);

  if (!entries.length) return null;

  const loading = entries.some((entry) => entry.loading);
  const failed = entries.filter((entry) => !entry.loading && !entry.substitutes);
  const ready = !loading && failed.length === 0;
  // A changed group gets a new message, so removed or swapped items cannot be sent again.
  const signature = JSON.stringify([storeName, customerFirstName, entries.map((entry) => [
    entry.itemId, entry.itemName, entry.quantity, entry.size, entry.substitutes,
  ])]);
  const suggestedMessage = [
    `Hi ${customerFirstName}! Out of stock po ang mga sumusunod sa ${storeName}:`,
    ...entries.map((entry, index) => {
      const label = `${entry.quantity} × ${formatItemLabel(entry.itemName, entry.size)}`;
      const options = entry.substitutes?.length
        ? `Puwedeng ipalit: ${entry.substitutes.join(", ")}.`
        : "Wala pa pong available na substitute para dito.";
      return `${index + 1}. ${label}\n${options}`;
    }),
    "Pakisabi po kung aling pamalit ang gusto ninyo para sa bawat item, o kung aalisin na lang sa order. Salamat!",
  ].join("\n\n");
  const message = draft?.signature === signature ? draft.text : suggestedMessage;
  const alreadySent = sent?.signature === signature && sent.text === message.trim();
  const confirming = confirmDecline === signature;
  const itemIds = entries.map((entry) => entry.itemId);

  return (
    <section aria-labelledby={headingId} className="@container border-t border-hairline bg-board-ground" data-substitute-group>
      <header className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h4 id={headingId} className="m-0 flex items-center gap-2 text-body font-semibold text-ink">
            <Sparkles size={15} className="shrink-0 text-ink-muted" />
            Suggested local substitutes
          </h4>
          <p className="mb-0 mt-1 text-label leading-relaxed text-ink-muted">
            {entries.length} out-of-stock {entries.length === 1 ? "item" : "items"} · Review together, send one message.
          </p>
          {busy && <p role="status" className="mb-0 mt-1 text-label text-ink-muted">Updating substitutes…</p>}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          className="min-h-9 shrink-0 cursor-pointer rounded-trim px-2 text-label font-medium text-ink-muted hover:bg-board-plate hover:text-ink"
        >
          {collapsed ? "Show options" : "Hide"}
        </button>
      </header>

      {!collapsed && (
        <div className="grid min-w-0 @min-[640px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0 px-4 pb-4">
            <p className="mb-2 mt-0 text-label text-ink-muted">Swap an item after the customer confirms.</p>
            <div className="max-h-96 space-y-4 overflow-y-auto pr-1" aria-busy={loading}>
              {entries.map((entry) => (
                <div key={entry.itemId} className="space-y-2" data-substitute-item={entry.itemId}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="m-0 min-w-0 break-words text-body font-semibold leading-relaxed text-ink">
                      {entry.quantity} × {formatItemLabel(entry.itemName, entry.size)}
                    </p>
                    <button
                      type="button"
                      onClick={() => onDecline([entry.itemId])}
                      disabled={busy}
                      aria-label={`Customer declined substitutes for ${entry.itemName}`}
                      className="min-h-9 shrink-0 cursor-pointer rounded-trim px-2 text-micro text-ink-muted hover:bg-board-plate hover:text-ink disabled:cursor-not-allowed"
                    >
                      Mark declined
                    </button>
                  </div>
                  {entry.loading ? (
                    <p role="status" className="m-0 flex items-center gap-2 py-2 text-label text-ink-muted">
                      <RefreshCw size={13} className="animate-spin" /> Finding alternatives…
                    </p>
                  ) : !entry.substitutes ? (
                    <p className="m-0 text-label text-status-waiting-ink">Could not load alternatives for this item.</p>
                  ) : !entry.substitutes.length ? (
                    <p className="m-0 text-label text-ink-muted">No local alternatives found. Ask the customer whether to remove this item.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {entry.substitutes.map((name) => (
                        <button
                          key={name}
                          type="button"
                          disabled={busy}
                          onClick={() => onSwap(entry.rowIndex, entry.itemId, name)}
                          aria-label={`Swap ${entry.itemName} with ${name}`}
                          className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-trim border border-edge bg-board-plate px-3 py-2 text-left text-label leading-relaxed text-ink transition-colors hover:border-board-field disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="min-w-0 break-words">{name}</span>
                          <ArrowRight size={14} className="shrink-0 text-ink-muted" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {failed.length > 0 && (
              <DispatcherButton variant="secondary" size="sm" className="mt-3" disabled={busy} icon={<RefreshCw size={13} />} onClick={() => onRetry(failed.map((entry) => entry.itemId))}>
                Retry unavailable suggestions
              </DispatcherButton>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-3 border-t border-hairline bg-board-plate p-4 @min-[640px]:border-l @min-[640px]:border-t-0 @min-[640px]:pt-0" data-substitute-composer>
            <div>
              <label htmlFor={messageId} className="block text-body font-semibold text-ink">Message to {customerFirstName}</label>
              <p id={helpId} className="mb-0 mt-1 text-label leading-relaxed text-ink-muted">All {entries.length} {entries.length === 1 ? "item is" : "items are"} included. You can edit before sending.</p>
            </div>
            <textarea
              id={messageId}
              aria-describedby={helpId}
              value={ready ? message : ""}
              placeholder={loading ? "Preparing the grouped message…" : "Retry suggestions to prepare the complete message."}
              disabled={!ready || busy}
              onChange={(event) => setDraft({ signature, text: event.target.value })}
              rows={9}
              className="min-h-56 w-full min-w-0 flex-1 resize-y rounded-trim border border-edge bg-board-ground p-3 text-body leading-relaxed text-ink placeholder:text-ink-muted focus:border-board-field focus:outline-none disabled:cursor-not-allowed"
            />
            <p className="m-0 flex items-start gap-2 text-micro leading-relaxed text-ink-muted">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              Check availability and details with the store before sending.
            </p>
            <DispatcherButton
              variant="success"
              size="md"
              className="w-full font-semibold"
              disabled={!ready || busy || !message.trim() || alreadySent}
              icon={alreadySent ? <Check size={14} /> : <Send size={14} />}
              onClick={() => {
                onSend(message.trim());
                setSent({ signature, text: message.trim() });
              }}
            >
              {alreadySent ? "Sent to customer chat" : "Send options to customer chat"}
            </DispatcherButton>
            <div aria-live="polite">
              {alreadySent && <p className="mb-2 mt-0 text-label text-status-done-ink">Waiting for {customerFirstName} to choose.</p>}
              {confirming ? (
                <div className="space-y-2">
                  <p className="m-0 text-label leading-relaxed text-ink">Notify the rider that the customer declined substitutes for all {entries.length} {entries.length === 1 ? "item" : "items"}?</p>
                  <div className="flex flex-wrap gap-2">
                    <DispatcherButton variant="secondary" size="sm" disabled={busy} onClick={() => { setConfirmDecline(null); onDecline(itemIds); }}>Confirm decline</DispatcherButton>
                    <DispatcherButton variant="subtle" size="sm" disabled={busy} onClick={() => setConfirmDecline(null)}>Cancel</DispatcherButton>
                  </div>
                </div>
              ) : (
                <DispatcherButton variant="subtle" size="sm" className="w-full" disabled={busy} icon={<X size={13} />} onClick={() => setConfirmDecline(signature)}>
                  Customer declined {entries.length > 1 ? "all substitutes" : "substitutes"}
                </DispatcherButton>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
