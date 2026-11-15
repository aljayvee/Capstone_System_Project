import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, User, X } from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { apiErrorText } from "../../lib/apiErrorText";
import { AUDIT_SOURCE_LABELS, type AuditEvent, type AuditEventDetail } from "../../../../types/sysAdminAuditTimeline";
import { SeverityChip, formatWhen } from "./auditTimelineUi";

interface Props {
  event: AuditEvent;
  onClose: () => void;
  onOpen: (e: AuditEvent) => void;
  onFilterActor: (e: AuditEvent) => void;
  onFilterIp: (ip: string) => void;
}

function rawValue(v: unknown): string {
  if (v === null || v === undefined) return "(empty)";
  if (typeof v === "object") return JSON.stringify(v, null, 1);
  return String(v);
}

export const AuditEventDrawer: React.FC<Props> = ({ event, onClose, onOpen, onFilterActor, onFilterIp }) => {
  const [detail, setDetail] = useState<AuditEventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await sysAdminApiService.getAuditEvent(event.source, event.rowId));
    } catch (err: unknown) {
      setError(apiErrorText(err, "Could not load this entry."));
    } finally {
      setLoading(false);
    }
  }, [event.source, event.rowId]);

  useEffect(() => {
    setDetail(null);
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = detail?.event ?? event;
  const person = shown.actor && shown.actor.kind !== "system" && shown.actor.id !== null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-event-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="h-full w-full sm:max-w-xl bg-board-plate sm:border-l border-edge overflow-y-auto"
      >
        <div className="sticky top-0 bg-board-plate border-b border-edge px-4 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityChip severity={shown.severity} />
              <span className="text-[11px] text-ink-muted">{AUDIT_SOURCE_LABELS[shown.source]}</span>
            </div>
            <h3 id="audit-event-title" className="text-sm font-semibold text-ink break-words">
              {shown.action}
            </h3>
            <p className="text-[11px] text-ink-muted">{formatWhen(shown.at)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-board-ground text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <section className="space-y-2">
            <p className="text-xs text-ink break-words">{shown.summary || "No further details."}</p>
            <div className="flex flex-wrap gap-2">
              {person && (
                <button
                  type="button"
                  onClick={() => onFilterActor(shown)}
                  className="inline-flex items-center gap-1.5 px-2.5 min-h-[36px] rounded-lg border border-edge bg-board-ground text-xs text-ink hover:bg-board-plate"
                >
                  <User className="w-3.5 h-3.5" /> All activity by {shown.actor!.name}
                </button>
              )}
              {shown.ip && (
                <button
                  type="button"
                  onClick={() => onFilterIp(shown.ip!)}
                  className="inline-flex items-center gap-1.5 px-2.5 min-h-[36px] rounded-lg border border-edge bg-board-ground text-xs font-mono text-ink hover:bg-board-plate"
                >
                  All activity from {shown.ip}
                </button>
              )}
            </div>
          </section>

          {loading && !detail && (
            <div className="space-y-2 animate-pulse" aria-busy="true" aria-label="Loading entry">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-6 rounded bg-board-ground" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex items-start justify-between gap-3">
              <span className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </span>
              <button type="button" onClick={load} className="inline-flex items-center gap-1 underline shrink-0">
                <RefreshCw className="w-3 h-3" /> Try again
              </button>
            </div>
          )}

          {detail && (
            <>
              <section>
                <h4 className="text-[11px] font-semibold text-ink uppercase tracking-wide mb-2">Recorded fields</h4>
                <dl className="rounded-lg border border-edge divide-y divide-edge text-xs">
                  {Object.entries(detail.raw).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 px-3 py-1.5">
                      <dt className="text-ink-muted font-mono truncate">{k}</dt>
                      <dd className="text-ink font-mono break-all whitespace-pre-wrap">{rawValue(v)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-[10px] text-ink-muted mt-1.5">Password, token and hash fields are never sent to this page.</p>
              </section>

              <section>
                <h4 className="text-[11px] font-semibold text-ink uppercase tracking-wide mb-2">
                  Same person or IP, within an hour ({detail.related.length})
                </h4>
                {detail.related.length === 0 ? (
                  <p className="text-xs text-ink-muted">Nothing else recorded in that hour.</p>
                ) : (
                  <ul className="rounded-lg border border-edge divide-y divide-edge">
                    {detail.related.map((r) => (
                      <li key={r.key}>
                        <button type="button" onClick={() => onOpen(r)} className="w-full text-left px-3 py-2 hover:bg-board-ground">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-mono text-ink-muted">{formatWhen(r.at)}</span>
                            <SeverityChip severity={r.severity} />
                          </div>
                          <p className="text-xs text-ink break-words">{r.action}</p>
                          <p className="text-[11px] text-ink-muted break-words">{r.actor?.name ?? "System"}{r.ip ? ` · ${r.ip}` : ""}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
