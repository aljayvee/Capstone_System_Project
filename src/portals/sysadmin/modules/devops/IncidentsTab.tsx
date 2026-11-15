import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { apiErrorText } from "../../lib/apiErrorText";
import { useSysAdminPermissions } from "../../context/SysAdminPermissionsContext";
import type {
  IncidentListResponse,
  IncidentSeverity,
  IncidentStatus,
  IncidentView,
  SysAdminIncident,
  SysAdminIncidentDetail,
  UpdateIncidentPayload,
} from "../../../../types/sysAdmin";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const SEVERITIES: IncidentSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TEXT_MAX = 5000;
const DRAFT_PREFIX = "sysadmin.incidentDraft.";

const SOURCE_LABELS: Record<string, string> = {
  DB_DOWN: "Database",
  DISK: "Disk space",
  BACKEND_CRASH: "Backend crash",
};

const STATUS_LABELS: Record<IncidentStatus, string> = {
  OPEN: "Open",
  MONITORING: "Back to normal, report pending",
  RESOLVED: "Resolved",
};

const errorText = apiErrorText;

/** Drafts are a convenience: storage can be blocked or full, and the page must work without it. */
function loadDraft<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function saveDraft(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the draft just is not kept */
  }
}
function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* nothing to clear */
  }
}

function formatWhen(iso: string | null): string {
  if (!iso) return "Not yet";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatDuration(fromIso: string, toIso: string | null): string {
  const end = toIso ? new Date(toIso).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - new Date(fromIso).getTime()) / 60000));
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} days`;
}

/** <input type="datetime-local"> wants local wall time without a zone. */
function toLocalInput(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const chip = "inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap";

function SeverityChip({ severity }: { severity: IncidentSeverity }) {
  const tone =
    severity === "CRITICAL"
      ? "bg-status-act-fill text-status-act-ink border-status-act-ink/30"
      : severity === "HIGH"
      ? "bg-status-waiting-fill text-status-waiting-ink border-status-waiting-ink/30"
      : "bg-status-moving-fill text-status-moving-ink border-status-moving-ink/30";
  return <span className={`${chip} ${tone}`}>{severity}</span>;
}

function StatusChip({ status }: { status: IncidentStatus }) {
  const tone =
    status === "OPEN"
      ? "bg-status-act-fill text-status-act-ink border-status-act-ink/30"
      : status === "MONITORING"
      ? "bg-status-waiting-fill text-status-waiting-ink border-status-waiting-ink/30"
      : "bg-status-done-fill text-status-done-ink border-status-done-ink/30";
  return <span className={`${chip} ${tone}`}>{status === "MONITORING" ? "REPORT PENDING" : status}</span>;
}

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 px-3 min-h-[40px] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const buttonPrimary = `${buttonBase} bg-signal hover:bg-signal-deep text-white`;
const buttonSecondary = `${buttonBase} bg-board-plate hover:bg-board-ground border border-edge text-ink`;
const fieldClass =
  "w-full rounded-lg bg-board-ground border border-edge px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-signal/40";
const labelClass = "block text-[11px] font-semibold text-ink mb-1";

/* ------------------------------------------------------------------ */
/* Tab                                                                 */
/* ------------------------------------------------------------------ */

export const IncidentsTab: React.FC = () => {
  const { can } = useSysAdminPermissions();
  const canManageIncidents = can("incidents.manage");
  const [view, setView] = useState<IncidentView>("active");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<IncidentListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await sysAdminApiService.listIncidents(view, page));
    } catch (err: unknown) {
      setError(errorText(err, "Could not load incidents."));
    } finally {
      setIsLoading(false);
    }
  }, [view, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const changeView = (next: IncidentView) => {
    setView(next);
    setPage(1);
  };

  const incidents = data?.incidents ?? [];
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      {/* Intro and actions */}
      <div className="p-5 rounded-xl bg-board-plate border border-edge space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-status-moving-ink shrink-0" />
              <span>Incident records</span>
            </h3>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed max-w-2xl">
              One record per outage. The health watch opens one when the database stops answering, the disk fills
              up or the backend crashes. Log anything else by hand. An incident can only be resolved once its cause
              and fix are written down.
            </p>
          </div>
          {canManageIncidents && (
            <button type="button" onClick={() => setIsCreating(true)} className={`${buttonPrimary} self-start shrink-0`}>
              <Plus className="w-4 h-4" />
              <span>Log incident</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Incident filter">
          {(["active", "resolved", "all"] as IncidentView[]).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => changeView(v)}
              className={`px-3 min-h-[36px] rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1.5 ${
                view === v
                  ? "bg-signal text-white border-signal font-semibold"
                  : "bg-board-ground text-ink-muted border-edge hover:text-ink"
              }`}
            >
              <span>{v === "active" ? "Active" : v === "resolved" ? "Resolved" : "All"}</span>
              {v === "active" && data && data.activeCount > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 rounded-full ${
                    view === v ? "bg-white/20 text-white" : "bg-status-act-fill text-status-act-ink"
                  }`}
                >
                  {data.activeCount}
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchList}
            disabled={isLoading}
            aria-label="Refresh incidents"
            className="ml-auto p-2 rounded-lg bg-board-ground border border-edge text-ink hover:text-ink transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-status-act-ink" : ""}`} />
          </button>
        </div>
      </div>

      {/* List: loading, error, empty, ideal */}
      {isLoading && !data ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading incidents">
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-board-plate border border-edge animate-pulse space-y-2.5">
              <div className="h-3 w-24 rounded bg-board-ground" />
              <div className="h-3.5 w-2/3 rounded bg-board-ground" />
              <div className="h-3 w-1/3 rounded bg-board-ground" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
          </div>
          <button type="button" onClick={fetchList} className={`${buttonSecondary} self-start sm:self-auto`}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
        </div>
      ) : incidents.length === 0 ? (
        <div className="p-8 rounded-xl bg-board-plate border border-edge text-center space-y-3">
          <CheckCircle2 className="w-6 h-6 text-status-done-ink mx-auto" />
          <div>
            <p className="text-sm font-semibold text-ink">
              {view === "active" ? "No active incidents" : view === "resolved" ? "No resolved incidents yet" : "No incidents recorded yet"}
            </p>
            <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto leading-relaxed">
              {view === "active"
                ? "Everything the health watch checks is working. If customers report a problem it cannot see, log it here."
                : "Resolved incidents and their reports will be listed here."}
            </p>
          </div>
          {view === "active" && canManageIncidents && (
            <button type="button" onClick={() => setIsCreating(true)} className={buttonSecondary}>
              <Plus className="w-4 h-4" />
              <span>Log incident</span>
            </button>
          )}
        </div>
      ) : (
        <div className={`space-y-3 transition-opacity ${isLoading ? "opacity-60" : ""}`}>
          <ul className="space-y-3">
            {incidents.map((inc) => (
              <li key={inc.id}>
                <IncidentCard incident={inc} onOpen={() => setOpenId(inc.id)} />
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
              <span>
                Page {page} of {pageCount} ({data?.total} incidents)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className={buttonSecondary}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount || isLoading}
                  className={buttonSecondary}
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {openId !== null && (
        <IncidentDetailPanel id={openId} onClose={() => setOpenId(null)} onChanged={fetchList} />
      )}

      {isCreating && (
        <NewIncidentDialog
          onClose={() => setIsCreating(false)}
          onCreated={(created) => {
            setIsCreating(false);
            setView("active");
            setPage(1);
            fetchList();
            setOpenId(created.id);
          }}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* List card                                                           */
/* ------------------------------------------------------------------ */

function IncidentCard({ incident: inc, onOpen }: { incident: SysAdminIncident; onOpen: () => void }) {
  const source = inc.sourceKey ? `Automatic: ${SOURCE_LABELS[inc.sourceKey] ?? inc.sourceKey}` : `Logged by @${inc.openedBy ?? "admin"}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left p-4 rounded-xl bg-board-plate border border-edge hover:border-signal/40 transition-colors focus:outline-none focus:ring-2 focus:ring-signal/40"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusChip status={inc.status} />
        <SeverityChip severity={inc.severity} />
        <span className="text-[10px] font-mono text-ink-muted">#{inc.id}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-ink break-words line-clamp-2" title={inc.title}>
        {inc.title}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span>Started {formatWhen(inc.startedAt)}</span>
        <span>
          {inc.recoveredAt ? "Down for " : "Ongoing for "}
          {formatDuration(inc.startedAt, inc.recoveredAt)}
        </span>
        <span>{source}</span>
        {inc.alertCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Bell className="w-3 h-3" />
            {inc.alertCount} alert{inc.alertCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {inc.status === "MONITORING" && (
        <p className="mt-2 text-[11px] text-status-waiting-ink">Working again. Write the cause and fix to resolve it.</p>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Shared dialog frame                                                 */
/* ------------------------------------------------------------------ */

function DialogFrame({
  titleId,
  onClose,
  children,
  wide,
}: {
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        className={`h-full w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} bg-board-plate sm:border-l border-edge overflow-y-auto`}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail panel                                                        */
/* ------------------------------------------------------------------ */

interface ReportFields {
  impact: string;
  cause: string;
  fix: string;
  prevention: string;
}

const fromIncident = (inc: SysAdminIncident): ReportFields => ({
  impact: inc.impact ?? "",
  cause: inc.cause ?? "",
  fix: inc.fix ?? "",
  prevention: inc.prevention ?? "",
});

const sameReport = (a: ReportFields, b: ReportFields) =>
  a.impact === b.impact && a.cause === b.cause && a.fix === b.fix && a.prevention === b.prevention;

function IncidentDetailPanel({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const { can } = useSysAdminPermissions();
  const canManageIncidents = can("incidents.manage");
  const [incident, setIncident] = useState<SysAdminIncidentDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fields, setFields] = useState<ReportFields>({ impact: "", cause: "", fix: "", prevention: "" });
  const [draftRestored, setDraftRestored] = useState(false);
  const [saving, setSaving] = useState<null | "save" | IncidentStatus>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const draftKey = String(id);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const inc = await sysAdminApiService.getIncident(id);
      setIncident(inc);
      const server = fromIncident(inc);
      const draft = loadDraft<ReportFields>(draftKey);
      if (draft && !sameReport(draft, server)) {
        setFields(draft);
        setDraftRestored(true);
      } else {
        setFields(server);
        setDraftRestored(false);
        clearDraft(draftKey);
      }
    } catch (err: unknown) {
      setLoadError(errorText(err, "Could not load this incident."));
    }
  }, [id, draftKey]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key: keyof ReportFields, value: string) => {
    setSavedNote(null);
    setFields((prev) => {
      const next = { ...prev, [key]: value };
      saveDraft(draftKey, next);
      return next;
    });
  };

  const discardDraft = () => {
    if (!incident) return;
    clearDraft(draftKey);
    setFields(fromIncident(incident));
    setDraftRestored(false);
  };

  const dirty = incident ? !sameReport(fields, fromIncident(incident)) : false;
  const canResolve = fields.cause.trim() !== "" && fields.fix.trim() !== "";

  const submit = async (status?: IncidentStatus) => {
    if (!incident) return;
    setSaving(status ?? "save");
    setSaveError(null);
    setSavedNote(null);
    const payload: UpdateIncidentPayload = {
      impact: fields.impact,
      cause: fields.cause,
      fix: fields.fix,
      prevention: fields.prevention,
      ...(status ? { status } : {}),
    };
    try {
      await sysAdminApiService.updateIncident(incident.id, payload);
      clearDraft(draftKey);
      setDraftRestored(false);
      await load();
      onChanged();
      setSavedNote(
        status === "RESOLVED"
          ? "Incident resolved. The report is saved with it."
          : status === "MONITORING"
          ? "Marked as back to normal. Finish the report to resolve it."
          : status === "OPEN"
          ? "Incident reopened."
          : "Report saved."
      );
    } catch (err: unknown) {
      // The draft stays in storage and on screen, so nothing typed is lost.
      setSaveError(errorText(err, "Could not save the incident. Your text is kept; try again."));
    } finally {
      setSaving(null);
    }
  };

  const titleId = `incident-${id}-title`;

  return (
    <DialogFrame titleId={titleId} onClose={onClose} wide>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 p-4 border-b border-edge bg-board-plate">
        <div className="min-w-0">
          {incident && (
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <StatusChip status={incident.status} />
              <SeverityChip severity={incident.severity} />
              <span className="text-[10px] font-mono text-ink-muted">#{incident.id}</span>
            </div>
          )}
          <h2 id={titleId} className="text-sm font-bold text-ink break-words">
            {incident ? incident.title : loadError ? "Incident" : "Loading incident..."}
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-board-ground text-ink-muted shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {loadError ? (
          <div className="p-4 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-words">{loadError}</span>
            </div>
            <button type="button" onClick={load} className={buttonSecondary}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </button>
          </div>
        ) : !incident ? (
          <div className="space-y-3 animate-pulse" aria-busy="true">
            <div className="h-20 rounded-xl bg-board-ground" />
            <div className="h-28 rounded-xl bg-board-ground" />
            <div className="h-28 rounded-xl bg-board-ground" />
          </div>
        ) : (
          <>
            {/* Timeline */}
            <section className="rounded-xl bg-board-ground border border-edge p-4">
              <h3 className="text-[11px] font-mono uppercase text-ink-muted mb-3">Timeline</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                <div>
                  <dt className="text-ink-muted">Started</dt>
                  <dd className="text-ink font-medium">{formatWhen(incident.startedAt)}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Detected</dt>
                  <dd className="text-ink font-medium">{formatWhen(incident.detectedAt)}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Back to normal</dt>
                  <dd className="text-ink font-medium">
                    {formatWhen(incident.recoveredAt)}
                    {incident.recoveredAt && (
                      <span className="text-ink-muted font-normal"> (after {formatDuration(incident.startedAt, incident.recoveredAt)})</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Resolved</dt>
                  <dd className="text-ink font-medium">
                    {incident.resolvedAt ? `${formatWhen(incident.resolvedAt)} by @${incident.resolvedBy ?? "admin"}` : "Not yet"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-ink-muted">Opened</dt>
                  <dd className="text-ink font-medium">
                    {incident.sourceKey
                      ? `Automatically by the health watch (${SOURCE_LABELS[incident.sourceKey] ?? incident.sourceKey})`
                      : `By @${incident.openedBy ?? "admin"}`}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Report */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-mono uppercase text-ink-muted">Incident report</h3>
                <span className="text-[11px] text-ink-muted">{STATUS_LABELS[incident.status]}</span>
              </div>

              {draftRestored && (
                <div className="p-3 rounded-lg bg-status-moving-fill border border-status-moving-ink/30 text-[11px] text-status-moving-ink flex flex-wrap items-center justify-between gap-2">
                  <span>Your unsaved text from last time was restored.</span>
                  <button type="button" onClick={discardDraft} className="underline font-semibold">
                    Discard it
                  </button>
                </div>
              )}

              <fieldset disabled={!canManageIncidents} className="space-y-3 disabled:opacity-85">
              <ReportField
                id={`inc-${id}-impact`}
                label="Impact"
                hint="Who was affected and how. For example: customers could not place orders for 40 minutes."
                value={fields.impact}
                onChange={(v) => setField("impact", v)}
              />
              <ReportField
                id={`inc-${id}-cause`}
                label="Cause"
                required
                hint="What actually broke, as far as you know."
                value={fields.cause}
                onChange={(v) => setField("cause", v)}
              />
              <ReportField
                id={`inc-${id}-fix`}
                label="Fix"
                required
                hint="What you did to get it working again."
                value={fields.fix}
                onChange={(v) => setField("fix", v)}
              />
              <ReportField
                id={`inc-${id}-prevention`}
                label="Prevention"
                hint="What stops it happening again, or what you will watch for."
                value={fields.prevention}
                onChange={(v) => setField("prevention", v)}
              />
              </fieldset>

              {saveError && (
                <div role="alert" className="p-3 rounded-lg bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="break-words">{saveError}</span>
                </div>
              )}
              {savedNote && !saveError && (
                <div role="status" className="p-3 rounded-lg bg-status-done-fill border border-status-done-ink/30 text-xs text-status-done-ink flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{savedNote}</span>
                </div>
              )}

              {canManageIncidents ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button type="button" onClick={() => submit()} disabled={!dirty || saving !== null} className={buttonSecondary}>
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving === "save" ? "Saving..." : "Save report"}</span>
                    </button>

                    {incident.status === "OPEN" && (
                      <button type="button" onClick={() => submit("MONITORING")} disabled={saving !== null} className={buttonSecondary}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{saving === "MONITORING" ? "Saving..." : "Mark back to normal"}</span>
                      </button>
                    )}

                    {incident.status !== "RESOLVED" ? (
                      <button
                        type="button"
                        onClick={() => submit("RESOLVED")}
                        disabled={!canResolve || saving !== null}
                        className={buttonPrimary}
                        aria-describedby={!canResolve ? `inc-${id}-resolve-hint` : undefined}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{saving === "RESOLVED" ? "Resolving..." : "Resolve incident"}</span>
                      </button>
                    ) : (
                      <button type="button" onClick={() => submit("OPEN")} disabled={saving !== null} className={buttonSecondary}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{saving === "OPEN" ? "Reopening..." : "Reopen"}</span>
                      </button>
                    )}
                  </div>
                  {incident.status !== "RESOLVED" && !canResolve && (
                    <p id={`inc-${id}-resolve-hint`} className="text-[11px] text-ink-muted">
                      Write the cause and the fix to resolve this incident.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[11px] font-mono text-ink-muted">
                  Read-only: editing or resolving incidents requires Manage Incidents permission.
                </p>
              )}
            </section>

            {/* Linked alerts */}
            <section className="space-y-2">
              <h3 className="text-[11px] font-mono uppercase text-ink-muted">Alerts in this incident</h3>
              {incident.alerts.length === 0 ? (
                <p className="text-xs text-ink-muted">
                  No alerts are linked. Alerts raised while the database was down could not be recorded.
                </p>
              ) : (
                <ul className="divide-y divide-hairline rounded-xl border border-edge bg-board-ground">
                  {incident.alerts.map((a) => (
                    <li key={a.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="text-ink font-medium break-words">{a.title}</p>
                        <p className="text-[10px] font-mono text-ink-muted mt-0.5">
                          {a.alertType} · {formatWhen(a.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`${chip} ${
                          a.status === "SENT"
                            ? "bg-status-done-fill text-status-done-ink border-status-done-ink/30"
                            : a.status === "SUPPRESSED"
                            ? "bg-board-plate text-ink-muted border-edge"
                            : "bg-status-act-fill text-status-act-ink border-status-act-ink/30"
                        }`}
                      >
                        {a.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {incident.alertCount > incident.alerts.length && (
                <p className="text-[11px] text-ink-muted">
                  Showing the first {incident.alerts.length} of {incident.alertCount} alerts.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </DialogFrame>
  );
}

function ReportField({
  id,
  label,
  hint,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && <span className="text-ink-muted font-normal"> (needed to resolve)</span>}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={TEXT_MAX}
        rows={3}
        placeholder={hint}
        className={`${fieldClass} resize-y min-h-[72px] break-words`}
      />
      {value.length > TEXT_MAX - 200 && (
        <p className="text-[10px] text-status-waiting-ink mt-0.5 text-right">
          {value.length} / {TEXT_MAX}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New incident                                                        */
/* ------------------------------------------------------------------ */

interface NewIncidentDraft {
  title: string;
  severity: IncidentSeverity;
  startedAt: string;
  impact: string;
}

function NewIncidentDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (created: SysAdminIncident) => void }) {
  const initial = useMemo<NewIncidentDraft>(
    () =>
      loadDraft<NewIncidentDraft>("new") ?? {
        title: "",
        severity: "HIGH",
        startedAt: toLocalInput(new Date()),
        impact: "",
      },
    []
  );
  const [form, setForm] = useState<NewIncidentDraft>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const update = <K extends keyof NewIncidentDraft>(key: K, value: NewIncidentDraft[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      saveDraft("new", next);
      return next;
    });
  };

  const titleOk = form.title.trim().length >= 3;
  const startDate = form.startedAt ? new Date(form.startedAt) : null;
  const startOk = !!startDate && !Number.isNaN(startDate.getTime()) && startDate.getTime() <= Date.now() + 5 * 60000;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleOk || !startOk || !startDate) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await sysAdminApiService.createIncident({
        title: form.title.trim(),
        severity: form.severity,
        startedAt: startDate.toISOString(),
        impact: form.impact.trim() || null,
      });
      clearDraft("new");
      onCreated(created);
    } catch (err: unknown) {
      setError(errorText(err, "Could not open the incident. Your text is kept; try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogFrame titleId="new-incident-title" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 p-4 border-b border-edge bg-board-plate">
          <h2 id="new-incident-title" className="text-sm font-bold text-ink">
            Log an incident
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-board-ground text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-ink-muted leading-relaxed">
            For problems the health watch cannot see: the outside monitor reporting the site down, a payment
            provider failing, or customers reporting something broken.
          </p>

          <div>
            <label htmlFor="new-incident-title-input" className={labelClass}>
              Title
            </label>
            <input
              id="new-incident-title-input"
              ref={titleRef}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              maxLength={255}
              placeholder="For example: Portal not loading for customers"
              className={fieldClass}
              aria-invalid={form.title !== "" && !titleOk}
            />
            {form.title !== "" && !titleOk && (
              <p className="text-[11px] text-status-act-ink mt-1">Use at least 3 characters.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-incident-severity" className={labelClass}>
                Severity
              </label>
              <select
                id="new-incident-severity"
                value={form.severity}
                onChange={(e) => update("severity", e.target.value as IncidentSeverity)}
                className={fieldClass}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="new-incident-started" className={labelClass}>
                Started
              </label>
              <input
                id="new-incident-started"
                type="datetime-local"
                value={form.startedAt}
                max={toLocalInput(new Date())}
                onChange={(e) => update("startedAt", e.target.value)}
                className={fieldClass}
                aria-invalid={!startOk}
              />
              {!startOk && <p className="text-[11px] text-status-act-ink mt-1">Pick a time that is not in the future.</p>}
            </div>
          </div>

          <ReportField
            id="new-incident-impact"
            label="Impact"
            hint="Who is affected and how, if you know yet."
            value={form.impact}
            onChange={(v) => update("impact", v)}
          />

          {error && (
            <div role="alert" className="p-3 rounded-lg bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className={buttonSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={!titleOk || !startOk || submitting} className={buttonPrimary}>
              <Plus className="w-4 h-4" />
              <span>{submitting ? "Opening..." : "Open incident"}</span>
            </button>
          </div>
        </div>
      </form>
    </DialogFrame>
  );
}
