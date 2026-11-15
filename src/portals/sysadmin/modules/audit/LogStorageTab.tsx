import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, HardDrive, Lock, Pencil, Play, RefreshCw, ShieldCheck, X } from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { apiErrorText } from "../../lib/apiErrorText";
import type { LogRetentionStatus, RetentionPolicyKey, RetentionRunResult } from "../../../../types/sysAdminAuditTimeline";
import { formatWhen } from "./auditTimelineUi";

const btn = "inline-flex items-center justify-center gap-1.5 px-3 min-h-[36px] rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const fmt = (n: number) => n.toLocaleString();
const days = (d: number) => (d % 365 === 0 ? `${d / 365} year${d === 365 ? "" : "s"}` : `${d} days`);

type Pending = { kind: "save"; changes: Partial<Record<RetentionPolicyKey, number>> } | { kind: "run" };

function PasswordPrompt({ pending, busy, error, onCancel, onConfirm }: { pending: Pending; busy: boolean; error: string | null; onCancel: () => void; onConfirm: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onCancel}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="retention-confirm-title"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (pw) onConfirm(pw);
        }}
        className="w-full max-w-sm rounded-xl bg-board-plate border border-edge p-4 space-y-3"
      >
        <h3 id="retention-confirm-title" className="text-sm font-semibold text-ink flex items-center gap-2">
          <Lock className="w-4 h-4 text-ink-muted" /> {pending.kind === "run" ? "Run the cleanup now" : "Save new retention"}
        </h3>
        <p className="text-xs text-ink-muted">
          {pending.kind === "run"
            ? "Removes every row past its retention, only if a backup from the last 24 hours reached off-site storage. Removed rows stay in the off-site backups."
            : "Applies from the next cleanup. The change is recorded with your name."}
        </p>
        <label className="block text-xs text-ink-muted">
          Your administrator password
          <input type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 w-full px-3 min-h-[40px] rounded-lg bg-board-ground border border-edge text-sm text-ink" />
        </label>
        {error && <p className="text-xs text-status-act-ink" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={`${btn} border-edge bg-board-ground text-ink`}>Cancel</button>
          <button type="submit" disabled={!pw || busy} className={`${btn} border-transparent bg-signal text-white`}>{busy ? "Working..." : "Confirm"}</button>
        </div>
      </form>
    </div>
  );
}

function RunSummary({ run, labels }: { run: RetentionRunResult; labels: Record<string, string> }) {
  const tone = run.error ? "border-status-act-ink/30 bg-status-act-fill text-status-act-ink" : run.ran ? "border-edge bg-board-plate text-ink" : "border-status-waiting-ink/30 bg-status-waiting-fill text-status-waiting-ink";
  return (
    <div className={`p-3 rounded-xl border text-xs space-y-1 ${tone}`}>
      <p className="font-semibold">
        Last cleanup {formatWhen(run.ranAt)} ({run.trigger.toLowerCase()}):{" "}
        {run.error ? "failed" : run.ran ? `${fmt(run.totalRemoved)} rows removed` : "skipped"}
      </p>
      {run.error && <p className="break-words">{run.error}</p>}
      {!run.ran && run.skippedReason && <p className="break-words">{run.skippedReason}</p>}
      {run.ran && run.totalRemoved > 0 && (
        <p className="text-ink-muted break-words">
          {Object.entries(run.removed).filter(([, n]) => (n ?? 0) > 0).map(([k, n]) => `${labels[k] ?? k}: ${fmt(n ?? 0)}`).join(" · ")}
        </p>
      )}
      {run.capped.length > 0 && <p>Stopped at the per-run limit for some logs; the rest goes next night.</p>}
    </div>
  );
}

export const LogStorageTab: React.FC = () => {
  const [data, setData] = useState<LogRetentionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Record<RetentionPolicyKey, string>>>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await sysAdminApiService.getLogRetention());
    } catch (err: unknown) {
      setError(apiErrorText(err, "Could not load the log storage status."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Loading log storage">
        <div className="h-16 rounded-xl bg-board-plate border border-edge" />
        <div className="h-64 rounded-xl bg-board-plate border border-edge" />
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="p-3 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex items-center justify-between gap-2">
        <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</span>
        <button type="button" onClick={load} className="underline shrink-0">Try again</button>
      </div>
    );
  }
  if (!data) return null;

  const labels = Object.fromEntries(data.policies.map((p) => [p.key, p.label]));
  const { minDays, maxDays } = data.limits;
  const changes: Partial<Record<RetentionPolicyKey, number>> = {};
  const invalid: string[] = [];
  for (const p of data.policies) {
    const raw = draft[p.key];
    if (raw === undefined || raw === String(p.days)) continue;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < minDays || n > maxDays) invalid.push(p.label);
    else changes[p.key] = n;
  }
  const totalDue = data.policies.reduce((a, p) => a + p.dueForRemoval, 0);
  const totalRows = data.policies.reduce((a, p) => a + p.rows, 0);

  const confirm = async (pw: string) => {
    if (!pending) return;
    setBusy(true);
    setActionError(null);
    try {
      if (pending.kind === "save") {
        setData(await sysAdminApiService.updateLogRetention(pending.changes, pw));
        setEditing(false);
        setDraft({});
        setNotice("Retention saved. It applies from the next cleanup.");
      } else {
        const r = await sysAdminApiService.runLogRetention(pw);
        setNotice(r.ran ? `Cleanup removed ${fmt(r.totalRemoved)} rows.` : r.error ? `Cleanup failed: ${r.error}` : `Cleanup skipped: ${r.skippedReason}`);
        await load();
      }
      setPending(null);
    } catch (err: unknown) {
      setActionError(apiErrorText(err, "That did not go through."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2"><HardDrive className="w-4 h-4 text-ink-muted" /> Log storage and retention</h3>
          <p className="text-[11px] text-ink-muted">{data.schedule} Removed rows stay recoverable from the off-site backups (monthly copies are kept a year).</p>
          {data.updatedBy && <p className="text-[11px] text-ink-muted">Last changed by {data.updatedBy}{data.updatedAt ? ` on ${formatWhen(data.updatedAt)}` : ""}.</p>}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button type="button" onClick={load} disabled={loading} className={`${btn} border-edge bg-board-plate text-ink hover:bg-board-ground`}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          {!editing ? (
            <button type="button" onClick={() => { setEditing(true); setNotice(null); }} className={`${btn} border-edge bg-board-plate text-ink hover:bg-board-ground`}>
              <Pencil className="w-3.5 h-3.5" /> Change retention
            </button>
          ) : (
            <>
              <button type="button" onClick={() => { setEditing(false); setDraft({}); }} className={`${btn} border-edge bg-board-plate text-ink`}><X className="w-3.5 h-3.5" /> Cancel</button>
              <button
                type="button"
                disabled={invalid.length > 0 || Object.keys(changes).length === 0}
                onClick={() => { setActionError(null); setPending({ kind: "save", changes }); }}
                className={`${btn} border-transparent bg-signal text-white`}
              >
                Save changes
              </button>
            </>
          )}
          <button type="button" onClick={() => { setActionError(null); setPending({ kind: "run" }); }} disabled={editing} className={`${btn} border-edge bg-board-plate text-ink hover:bg-board-ground`}>
            <Play className="w-3.5 h-3.5" /> Run cleanup now
          </button>
        </div>
      </div>

      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${data.backupGate.ok ? "border-edge bg-board-plate text-ink" : "border-status-waiting-ink/30 bg-status-waiting-fill text-status-waiting-ink"}`}>
        {data.backupGate.ok ? <ShieldCheck className="w-4 h-4 text-status-done-ink shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
        <span>{data.backupGate.ok ? `A backup from the last 24 hours is safely off-site (backup #${data.backupGate.backupId}), so a cleanup may run.` : data.backupGate.reason}</span>
      </div>

      {notice && <p className="text-xs text-ink flex items-center gap-1.5" role="status"><CheckCircle2 className="w-3.5 h-3.5 text-status-done-ink" /> {notice}</p>}
      {data.lastRun ? <RunSummary run={data.lastRun} labels={labels} /> : <p className="text-xs text-ink-muted">No cleanup has run yet.</p>}
      {editing && invalid.length > 0 && <p className="text-xs text-status-act-ink" role="alert">Keep between {minDays} and {maxDays} whole days: {invalid.join(", ")}.</p>}

      <div className="rounded-xl bg-board-plate border border-edge overflow-hidden">
        <div className="px-3 py-2 border-b border-edge text-[11px] text-ink-muted">
          {fmt(totalRows)} rows under retention; the next cleanup would remove {fmt(totalDue)}.
        </div>
        <ul className="divide-y divide-edge">
          {data.policies.map((p) => (
            <li key={p.key} className="p-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-ink">{p.label}</p>
                <p className="text-[11px] text-ink-muted break-words">{p.why}</p>
                <p className="text-[11px] text-ink-muted tabular-nums">
                  {fmt(p.rows)} rows · +{fmt(p.addedLast7Days)} last 7 days{p.tableSizeMb !== null ? ` · table ${p.tableSizeMb} MB` : ""}{p.oldest ? ` · oldest ${formatWhen(p.oldest)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                {editing ? (
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    Keep
                    <input
                      type="number"
                      inputMode="numeric"
                      min={minDays}
                      max={maxDays}
                      value={draft[p.key] ?? String(p.days)}
                      onChange={(e) => setDraft((d) => ({ ...d, [p.key]: e.target.value }))}
                      aria-label={`Days to keep ${p.label}`}
                      className="w-20 px-2 min-h-[36px] rounded-lg bg-board-ground border border-edge text-ink text-right tabular-nums"
                    />
                    days
                  </label>
                ) : (
                  <span className="text-xs text-ink">Keep {days(p.days)}{p.days !== p.defaultDays && <span className="text-ink-muted"> (default {days(p.defaultDays)})</span>}</span>
                )}
                <span className={`text-xs tabular-nums whitespace-nowrap ${p.dueForRemoval ? "text-status-waiting-ink" : "text-ink-muted"}`}>
                  {p.dueForRemoval ? `${fmt(p.dueForRemoval)} due` : "nothing due"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <section className="rounded-xl bg-board-plate border border-edge">
        <h4 className="px-3 py-2 border-b border-edge text-xs font-semibold text-ink">Kept forever (never removed by this cleanup)</h4>
        <ul className="divide-y divide-edge">
          {data.kept.map((k) => (
            <li key={k.table} className="px-3 py-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
              <span className="text-ink">{k.label} <span className="text-ink-muted">· {k.why}</span></span>
              <span className="text-ink-muted tabular-nums">{fmt(k.rows)} rows{k.tableSizeMb !== null ? ` · ${k.tableSizeMb} MB` : ""}</span>
            </li>
          ))}
        </ul>
      </section>

      {pending && <PasswordPrompt pending={pending} busy={busy} error={actionError} onCancel={() => setPending(null)} onConfirm={confirm} />}
    </div>
  );
};
