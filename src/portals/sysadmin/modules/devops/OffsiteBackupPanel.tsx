import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Cloud, CloudOff, FlaskConical, Lock, RefreshCw, X } from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { apiErrorText } from "../../lib/apiErrorText";
import type { BackupRestoreCheckRecord, DatabaseBackupRecord, OffsiteBackupStatus } from "../../../../types/sysAdmin";

/** Matches the server's FRESHNESS_HOURS: older than this and the copy is overdue. */
const FRESH_HOURS = 26;
const POLL_MS = 10000;

const chip = "inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap";
const tones = {
  ok: "bg-status-done-fill text-status-done-ink border-status-done-ink/30",
  warn: "bg-status-waiting-fill text-status-waiting-ink border-status-waiting-ink/30",
  bad: "bg-status-act-fill text-status-act-ink border-status-act-ink/30",
  muted: "bg-board-ground text-ink-muted border-edge",
};
const buttonBase =
  "inline-flex items-center justify-center gap-1.5 px-3 min-h-[40px] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

function formatWhen(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Never";
}

function ageHours(iso: string | null): number | null {
  return iso ? (Date.now() - new Date(iso).getTime()) / 3600000 : null;
}

/** Per-backup chip for the inventory table. */
export function OffsiteChip({ backup }: { backup: DatabaseBackupRecord }) {
  switch (backup.offsiteStatus) {
    case "UPLOADED":
      return (
        <span className={`${chip} ${tones.ok}`} title={`Encrypted copy in R2 since ${formatWhen(backup.offsiteAt ?? null)}`}>
          <Cloud className="w-3 h-3" /> OFF-SITE
        </span>
      );
    case "FAILED":
      return (
        <span className={`${chip} ${tones.bad}`} title={backup.offsiteError ?? "Upload failed"}>
          <CloudOff className="w-3 h-3" /> NOT OFF-SITE
        </span>
      );
    case "SKIPPED":
      return (
        <span className={`${chip} ${tones.muted}`} title={backup.offsiteError ?? "Off-site is not configured"}>
          <CloudOff className="w-3 h-3" /> LOCAL ONLY
        </span>
      );
    default:
      return null;
  }
}

export const OffsiteBackupPanel: React.FC = () => {
  const [status, setStatus] = useState<OffsiteBackupStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [askPassword, setAskPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setStatus(await sysAdminApiService.getOffsiteBackupStatus());
    } catch (err: unknown) {
      setLoadError(apiErrorText(err, "Could not load the off-site backup status."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const running = status?.restoreChecks.find((c) => c.status === "RUNNING") ?? null;

  // Poll only while a restore test is running.
  useEffect(() => {
    if (!running) return;
    pollRef.current = window.setInterval(load, POLL_MS);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [running, load]);

  const startCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setStarting(true);
    setStartError(null);
    try {
      await sysAdminApiService.startRestoreCheck(password);
      setAskPassword(false);
      setPassword("");
      await load();
    } catch (err: unknown) {
      setStartError(apiErrorText(err, "Could not start the restore test."));
    } finally {
      setStarting(false);
    }
  };

  if (isLoading && !status) {
    return (
      <div className="p-5 rounded-xl bg-board-plate border border-edge animate-pulse space-y-3" aria-busy="true" aria-label="Loading off-site backup status">
        <div className="h-3 w-40 rounded bg-board-ground" />
        <div className="h-12 rounded-lg bg-board-ground" />
      </div>
    );
  }

  if (loadError && !status) {
    return (
      <div className="p-4 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="break-words">{loadError}</span>
        </div>
        <button type="button" onClick={load} className={`${buttonBase} bg-board-plate border border-edge text-ink self-start sm:self-auto`}>
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    );
  }

  if (!status) return null;

  const age = ageHours(status.lastUploadedAt);
  const copyTone = age === null ? "bad" : age > FRESH_HOURS ? "warn" : "ok";
  const failedSinceLastCopy =
    status.lastFailedAt && (!status.lastUploadedAt || new Date(status.lastFailedAt) > new Date(status.lastUploadedAt));
  const lastFinished = status.restoreChecks.find((c) => c.status !== "RUNNING") ?? null;

  return (
    <section className="p-5 rounded-xl bg-board-plate border border-edge space-y-4" aria-labelledby="offsite-heading">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="offsite-heading" className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <Cloud className="w-4 h-4 text-status-moving-ink shrink-0" />
            <span>Off-site copies (Cloudflare R2)</span>
          </h3>
          <p className="text-xs text-ink-muted mt-1 leading-relaxed max-w-2xl">
            Each backup is encrypted on the server and copied to R2, so the data survives losing this server. Kept 31
            days, plus one copy per month for a year. A restore test downloads the newest copy and loads it into a
            throwaway database to prove it works.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          aria-label="Refresh off-site status"
          className="p-2 rounded-lg bg-board-ground border border-edge text-ink self-start shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!status.configured ? (
        <div className="p-4 rounded-lg bg-status-waiting-fill border border-status-waiting-ink/30 text-xs text-status-waiting-ink space-y-1.5">
          <p className="font-semibold flex items-center gap-2">
            <CloudOff className="w-4 h-4 shrink-0" /> Not set up yet: every backup is on this server only.
          </p>
          <p className="leading-relaxed">
            Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BACKUP_BUCKET to the server .env and
            restart the API. The steps are in RESTORE.md in the server repository.
          </p>
        </div>
      ) : (
        <>
          {status.keyFileOk === false && (
            <div role="alert" className="p-3 rounded-lg bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex items-start gap-2">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-words">{status.keyFileProblem}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg bg-board-ground border border-edge space-y-1.5 min-w-0">
              <div className="text-[10px] uppercase font-mono text-ink-muted">Newest verified copy</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${chip} ${tones[copyTone]}`}>
                  {copyTone === "ok" ? "UP TO DATE" : copyTone === "warn" ? "OVERDUE" : "NONE YET"}
                </span>
                <span className="text-xs font-semibold text-ink">{formatWhen(status.lastUploadedAt)}</span>
              </div>
              {status.lastUploadedFile && (
                <p className="text-[11px] font-mono text-ink-muted truncate" title={status.lastUploadedFile}>
                  {status.bucket}/{status.lastUploadedFile}
                </p>
              )}
              {failedSinceLastCopy && status.lastError && (
                <p className="text-[11px] text-status-act-ink break-words line-clamp-3" title={status.lastError}>
                  Last upload failed {formatWhen(status.lastFailedAt)}: {status.lastError}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-lg bg-board-ground border border-edge space-y-1.5 min-w-0">
              <div className="text-[10px] uppercase font-mono text-ink-muted">Last restore test</div>
              {running ? (
                <p className="text-xs text-ink flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-status-moving-ink" />
                  Running since {formatWhen(running.startedAt)}. Usually 5 to 15 minutes.
                </p>
              ) : lastFinished ? (
                <RestoreResult check={lastFinished} />
              ) : (
                <p className="text-xs text-ink-muted">Never run. The first automatic test runs at 03:00 on the 1st.</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setStartError(null);
                  setAskPassword(true);
                }}
                disabled={!!running || status.keyFileOk === false}
                className={`${buttonBase} bg-board-plate hover:bg-board-ground border border-edge text-ink mt-1`}
              >
                <FlaskConical className="w-3.5 h-3.5" /> Test restore now
              </button>
            </div>
          </div>

          {status.restoreChecks.length > 1 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-ink-muted hover:text-ink">Restore test history ({status.restoreChecks.length})</summary>
              <ul className="mt-2 divide-y divide-hairline rounded-lg border border-edge bg-board-ground">
                {status.restoreChecks.map((c) => (
                  <li key={c.id} className="p-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-ink">{formatWhen(c.startedAt)}</span>
                    <span className="text-ink-muted">{c.trigger === "MANUAL" ? `by @${c.triggeredBy ?? "admin"}` : "monthly"}</span>
                    <span className={`${chip} ${c.status === "PASSED" ? tones.ok : c.status === "FAILED" ? tones.bad : tones.muted}`}>{c.status}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {askPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => setAskPassword(false)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-dialog-title"
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={startCheck}
            onKeyDown={(e) => e.key === "Escape" && setAskPassword(false)}
            className="w-full max-w-md rounded-xl bg-board-plate border border-edge p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h4 id="restore-dialog-title" className="text-sm font-bold text-ink">Run a restore test</h4>
              <button type="button" onClick={() => setAskPassword(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-board-ground text-ink-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Downloads the newest copy from R2, decrypts it and loads it into a temporary database on the server for
              5 to 15 minutes. The live database is not touched. Confirm with your password.
            </p>
            <div>
              <label htmlFor="restore-step-up" className="block text-[11px] font-semibold text-ink mb-1">Your password</label>
              <input
                id="restore-step-up"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-board-ground border border-edge px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-signal/40"
              />
            </div>
            {startError && (
              <p role="alert" className="text-xs text-status-act-ink break-words flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {startError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAskPassword(false)} className={`${buttonBase} bg-board-plate border border-edge text-ink`}>
                Cancel
              </button>
              <button type="submit" disabled={!password || starting} className={`${buttonBase} bg-signal hover:bg-signal-deep text-white`}>
                <FlaskConical className="w-3.5 h-3.5" /> {starting ? "Starting..." : "Start test"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};

function RestoreResult({ check }: { check: BackupRestoreCheckRecord }) {
  const minutes = check.durationMs ? Math.max(1, Math.round(check.durationMs / 60000)) : null;
  if (check.status === "PASSED") {
    return (
      <div className="space-y-1">
        <p className="text-xs text-status-done-ink font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Passed {formatWhen(check.finishedAt)}
        </p>
        <p className="text-[11px] text-ink-muted">
          {check.tablesRestored} tables, {check.rowsRestored?.toLocaleString()} rows restored{minutes ? ` in ${minutes} min` : ""}.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-xs text-status-act-ink font-semibold flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5" /> Failed {formatWhen(check.finishedAt)}
      </p>
      {check.error && (
        <p className="text-[11px] text-status-act-ink break-words line-clamp-3" title={check.error}>
          {check.error}
        </p>
      )}
    </div>
  );
}
