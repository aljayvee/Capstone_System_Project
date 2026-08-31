import React, { useState } from "react";
import { AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { type ApiErrandException, type ExceptionKind } from "../../../services/apiService";
import { type OpenExceptions } from "../hooks/useOpenExceptions";
import { ExceptionEvidence } from "./ExceptionEvidence";
import { formatPeso } from "../../../utils/format";

/** Plain names, so a reader never needs the enum to read the queue. */
const KIND_LABEL: Record<ExceptionKind, string> = {
  CASH_VARIANCE: "Cash variance",
  RECEIPT_DIVERGENCE: "Receipt divergence",
  UNVERIFIED_PURCHASE: "Unverified purchase",
  WRONG_BRANCH: "Wrong branch",
  MISSING_RECEIPT: "No receipt at a stop",
  STALLED_STOP: "Long stop",
};

/**
 * Errands that did not reconcile and nobody has decided on yet.
 *
 * Clearing one demands a reason. That is the difference between a control and a
 * list: an exception cleared with nothing said is weak evidence later, which is
 * exactly when it gets read.
 */
export const ExceptionQueuePanel: React.FC<{ queue: OpenExceptions }> = ({ queue }) => {
  const { exceptions, totalAtRisk, isLoading, reload, resolve } = queue;
  const [resolving, setResolving] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keyOf = (e: ApiErrandException) => `${e.errandId}:${e.kind}`;

  const handleResolve = async (e: ApiErrandException) => {
    if (reason.trim().length < 3) {
      setError("Say why this is being cleared.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resolve(e.errandId, e.kind, reason.trim(), e.amountAtRisk);
      setResolving(null);
      setReason("");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not record that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">Needs a decision</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalAtRisk > 0 && (
            <span className="font-mono text-xs font-bold text-amber-700 tabular-nums">
              {formatPeso(totalAtRisk)} at risk
            </span>
          )}
          <button
            onClick={() => void reload()}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
            aria-label="Refresh the queue"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {isLoading && <p className="px-5 py-6 text-xs text-slate-400">Checking recent errands…</p>}

      {!isLoading && exceptions.length === 0 && (
        <div className="px-5 py-8 flex items-center gap-2.5 text-sm" data-testid="queue-all-clear">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <span className="font-medium text-emerald-900">
            Everything reconciles. Nothing is waiting on you.
          </span>
        </div>
      )}

      {!isLoading && exceptions.length > 0 && (
        <ul className="divide-y divide-slate-100" data-testid="exception-queue">
          {exceptions.map((e) => {
            const key = keyOf(e);
            const isResolving = resolving === key;

            return (
              <li key={key} className="px-5 py-3.5 space-y-2.5" data-testid={`exception-${key}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-800">
                        {KIND_LABEL[e.kind]}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {e.errandId.slice(0, 8)}
                      </span>
                      {e.riderName && (
                        <span className="text-[11px] text-slate-500">· {e.riderName}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{e.detail}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(e.occurredAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {e.amountAtRisk > 0 && (
                      <span className="font-mono text-sm font-bold text-amber-700 tabular-nums">
                        {formatPeso(e.amountAtRisk)}
                      </span>
                    )}
                    {!isResolving && (
                      <button
                        onClick={() => {
                          setResolving(key);
                          setReason("");
                          setError(null);
                        }}
                        className="text-[11px] font-bold text-[#1E3A5F] hover:underline"
                        data-testid={`resolve-${key}`}
                      >
                        Clear this
                      </button>
                    )}
                  </div>
                </div>

                {/* The evidence, beside the claim about it — a variance nobody can
                    see the receipt for is a number, not a finding. */}
                <ExceptionEvidence errandId={e.errandId} kind={e.kind} />

                {isResolving && (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        autoFocus
                        value={reason}
                        onChange={(ev) => setReason(ev.target.value)}
                        placeholder="Why is this being cleared?"
                        maxLength={500}
                        className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
                        data-testid="resolve-reason"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={busy}
                          onClick={() => void handleResolve(e)}
                          className="text-xs font-bold text-white bg-[#1E3A5F] rounded-lg px-3.5 py-2 hover:bg-[#16304f] disabled:opacity-50 transition"
                          data-testid="resolve-confirm"
                        >
                          {busy ? "Recording…" : "Record"}
                        </button>
                        <button
                          onClick={() => {
                            setResolving(null);
                            setError(null);
                          }}
                          className="text-xs font-semibold text-slate-500 rounded-lg px-3 py-2 hover:bg-slate-50 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    {error && <p className="text-[11px] text-rose-600">{error}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
