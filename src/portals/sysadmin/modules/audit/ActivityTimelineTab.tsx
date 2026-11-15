import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, Filter, RefreshCw, Search, ShieldAlert, X } from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { apiErrorText } from "../../lib/apiErrorText";
import {
  AUDIT_SOURCE_LABELS,
  type AuditEvent,
  type AuditInsights,
  type AuditSeverity,
  type AuditSourceKey,
  type AuditTimelineQuery,
} from "../../../../types/sysAdminAuditTimeline";
import { AuditEventDrawer } from "./AuditEventDrawer";
import { SeverityChip, formatWhen } from "./auditTimelineUi";

type Range = "24h" | "7d" | "30d" | "all" | "custom";
const RANGE_LABELS: Record<Range, string> = { "24h": "Last 24 h", "7d": "7 days", "30d": "30 days", all: "All time", custom: "Custom" };
const SOURCES = Object.keys(AUDIT_SOURCE_LABELS) as AuditSourceKey[];
const btn = "inline-flex items-center justify-center gap-1.5 px-3 min-h-[36px] rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

function rangeFrom(range: Range): string | undefined {
  const day = 24 * 3600_000;
  const span = range === "24h" ? day : range === "7d" ? 7 * day : range === "30d" ? 30 * day : 0;
  return span ? new Date(Date.now() - span).toISOString() : undefined;
}

function Insights({ data, onPick }: { data: AuditInsights | null; onPick: (q: AuditTimelineQuery) => void }) {
  if (!data) return <div className="h-[74px] rounded-xl bg-board-plate border border-edge animate-pulse" aria-hidden="true" />;
  const tiles: { label: string; value: number; tone: "bad" | "warn" | "plain"; q?: AuditTimelineQuery }[] = [
    { label: "Failed sign-ins", value: data.failedSignins, tone: data.failedSignins ? "bad" : "plain", q: { sources: ["signin"], minSeverity: "warning" } },
    { label: "Rejected resets", value: data.resetRejected, tone: data.resetRejected ? "warn" : "plain", q: { sources: ["password_reset"], minSeverity: "notice" } },
    { label: "New IP bans", value: data.newBans, tone: data.newBans ? "warn" : "plain", q: { sources: ["ip_block"] } },
    { label: "Bans active now", value: data.activeBans, tone: "plain" },
    { label: "New devices", value: data.newDevices, tone: "plain" },
    { label: "New sessions", value: data.newSessions, tone: "plain", q: { sources: ["staff_session"] } },
  ];
  const tone = { bad: "text-status-act-ink", warn: "text-status-waiting-ink", plain: "text-ink" };
  return (
    <section aria-label="Last 24 hours" className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {tiles.map((t) => {
          const body = (
            <>
              <span className={`block text-lg font-semibold tabular-nums ${tone[t.tone]}`}>{t.value}</span>
              <span className="block text-[11px] text-ink-muted">{t.label}</span>
            </>
          );
          return t.q ? (
            <button key={t.label} type="button" onClick={() => onPick(t.q!)} className="text-left p-3 rounded-xl bg-board-plate border border-edge hover:bg-board-ground" title="Show these entries">
              {body}
            </button>
          ) : (
            <div key={t.label} className="p-3 rounded-xl bg-board-plate border border-edge">
              {body}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-ink-muted">
        Last 24 hours.{" "}
        {data.topFailingIps.length > 0 && (
          <>
            Most failed sign-ins from:{" "}
            {data.topFailingIps.map((r, i) => (
              <button key={r.ip} type="button" className="font-mono underline" onClick={() => onPick({ ip: r.ip })}>
                {r.ip} ({r.count}){i < data.topFailingIps.length - 1 ? ", " : ""}
              </button>
            ))}
          </>
        )}
      </p>
    </section>
  );
}

export const ActivityTimelineTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sources, setSources] = useState<AuditSourceKey[]>([]);
  const [minSeverity, setMinSeverity] = useState<AuditSeverity>("info");
  const [range, setRange] = useState<Range>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [ip, setIp] = useState("");
  const [actor, setActor] = useState<{ key: string; name: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<AuditInsights | null>(null);
  const [open, setOpen] = useState<AuditEvent | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const query = useMemo<AuditTimelineQuery>(() => {
    const q: AuditTimelineQuery = { sources: sources.length ? sources : undefined, minSeverity: minSeverity === "info" ? undefined : minSeverity };
    if (debounced) q.q = debounced;
    if (ip.trim()) q.ip = ip.trim();
    if (actor) q.actor = actor.key;
    if (range === "custom") {
      if (customFrom) q.from = new Date(`${customFrom}T00:00:00`).toISOString();
      if (customTo) q.to = new Date(`${customTo}T23:59:59.999`).toISOString();
    } else q.from = rangeFrom(range);
    return q;
  }, [sources, minSeverity, debounced, ip, actor, range, customFrom, customTo]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const page = await sysAdminApiService.getAuditTimeline(query, null, 50);
      if (id !== requestId.current) return;
      setEvents(page.events);
      setCursor(page.nextCursor);
    } catch (err: unknown) {
      if (id === requestId.current) setError(apiErrorText(err, "Could not load the activity timeline."));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadInsights = useCallback(async () => {
    try {
      setInsights(await sysAdminApiService.getAuditInsights());
    } catch {
      setInsights(null);
    }
  }, []);
  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await sysAdminApiService.getAuditTimeline(query, cursor, 50);
      setEvents((prev) => [...prev, ...page.events.filter((e) => !prev.some((p) => p.key === e.key))]);
      setCursor(page.nextCursor);
    } catch (err: unknown) {
      setError(apiErrorText(err, "Could not load more entries."));
    } finally {
      setLoadingMore(false);
    }
  };

  const doExport = async () => {
    setExporting(true);
    setExportNote(null);
    try {
      const rows = await sysAdminApiService.exportAuditTimeline(query);
      setExportNote(rows >= 20000 ? `Downloaded the newest 20,000 entries (the export limit). Narrow the filters for the rest.` : `Downloaded ${rows} entries. This export is recorded in IT alerts.`);
    } catch (err: unknown) {
      setExportNote(apiErrorText(err, "The export did not complete."));
    } finally {
      setExporting(false);
    }
  };

  const toggleSource = (s: AuditSourceKey) => setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const pick = (q: AuditTimelineQuery) => {
    setSources(q.sources ?? []);
    setMinSeverity(q.minSeverity ?? "info");
    setIp(q.ip ?? "");
    setActor(null);
    setSearch("");
    setRange("24h");
  };
  const clearAll = () => {
    setSources([]);
    setMinSeverity("info");
    setIp("");
    setActor(null);
    setSearch("");
    setRange("7d");
  };
  const filtered = sources.length > 0 || minSeverity !== "info" || !!ip || !!actor || !!debounced || range !== "7d";

  return (
    <div className="space-y-4">
      <Insights data={insights} onPick={pick} />

      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
            placeholder="Search people, usernames, IPs, errand numbers, actions"
            aria-label="Search the activity timeline"
            className="w-full pl-9 pr-3 min-h-[36px] rounded-lg bg-board-plate border border-edge text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-status-act-ink/40"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={range} onChange={(e) => setRange(e.target.value as Range)} aria-label="Time range" className="px-2 min-h-[36px] rounded-lg bg-board-plate border border-edge text-xs text-ink">
            {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
              <option key={r} value={r}>{RANGE_LABELS[r]}</option>
            ))}
          </select>
          <select value={minSeverity} onChange={(e) => setMinSeverity(e.target.value as AuditSeverity)} aria-label="Lowest severity" className="px-2 min-h-[36px] rounded-lg bg-board-plate border border-edge text-xs text-ink">
            <option value="info">All severities</option>
            <option value="notice">Notice and above</option>
            <option value="warning">Warning and above</option>
            <option value="critical">Critical only</option>
          </select>
          <button type="button" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} className={`${btn} border-edge bg-board-plate text-ink hover:bg-board-ground`}>
            <Filter className="w-3.5 h-3.5" /> Sources{sources.length ? ` (${sources.length})` : ""}
          </button>
          <button type="button" onClick={() => { void load(); void loadInsights(); }} disabled={loading} className={`${btn} border-edge bg-board-plate text-ink hover:bg-board-ground`}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button type="button" onClick={doExport} disabled={exporting} className={`${btn} border-edge bg-board-plate text-ink hover:bg-board-ground`}>
            <Download className="w-3.5 h-3.5" /> {exporting ? "Exporting..." : "Export all matching"}
          </button>
        </div>
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <label className="flex items-center gap-1.5">From <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-2 min-h-[36px] rounded-lg bg-board-plate border border-edge text-ink" /></label>
          <label className="flex items-center gap-1.5">To <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-2 min-h-[36px] rounded-lg bg-board-plate border border-edge text-ink" /></label>
        </div>
      )}

      {showFilters && (
        <div className="p-3 rounded-xl bg-board-plate border border-edge space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {SOURCES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSource(s)}
                aria-pressed={sources.includes(s)}
                className={`px-2.5 min-h-[32px] rounded-full border text-[11px] ${sources.includes(s) ? "bg-signal text-white border-transparent" : "bg-board-ground text-ink-muted border-edge hover:text-ink"}`}
              >
                {AUDIT_SOURCE_LABELS[s]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            IP address
            <input value={ip} onChange={(e) => setIp(e.target.value.replace(/[^0-9a-fA-F:.]/g, ""))} placeholder="e.g. 203.0.113.5" maxLength={64} className="px-2 min-h-[32px] rounded-lg bg-board-ground border border-edge font-mono text-ink w-48" />
          </label>
        </div>
      )}

      {(actor || filtered) && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {actor && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-edge bg-board-plate text-ink">
              Person: {actor.name}
              <button type="button" aria-label="Remove person filter" onClick={() => setActor(null)}><X className="w-3 h-3" /></button>
            </span>
          )}
          {ip && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-edge bg-board-plate text-ink font-mono">
              IP: {ip}
              <button type="button" aria-label="Remove IP filter" onClick={() => setIp("")}><X className="w-3 h-3" /></button>
            </span>
          )}
          {filtered && (
            <button type="button" onClick={clearAll} className="underline text-ink-muted hover:text-ink">Clear all filters</button>
          )}
        </div>
      )}

      {exportNote && <p className="text-xs text-ink-muted" role="status">{exportNote}</p>}

      {error && (
        <div className="p-3 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</span>
          <button type="button" onClick={load} className={`${btn} border-edge bg-board-plate text-ink self-start`}><RefreshCw className="w-3.5 h-3.5" /> Try again</button>
        </div>
      )}

      <div className="rounded-xl bg-board-plate border border-edge overflow-hidden">
        {loading && events.length === 0 ? (
          <ul aria-busy="true" aria-label="Loading activity" className="divide-y divide-edge">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="p-3 space-y-2 animate-pulse">
                <div className="h-3 w-40 rounded bg-board-ground" />
                <div className="h-3 w-2/3 rounded bg-board-ground" />
              </li>
            ))}
          </ul>
        ) : events.length === 0 && !error ? (
          <div className="p-8 text-center space-y-2">
            <ShieldAlert className="w-6 h-6 text-ink-muted mx-auto" />
            <p className="text-sm text-ink">Nothing matches these filters.</p>
            {filtered && <button type="button" onClick={clearAll} className="text-xs underline text-ink-muted">Clear all filters</button>}
          </div>
        ) : (
          <ul className={`divide-y divide-edge ${loading ? "opacity-60" : ""}`}>
            {events.map((e) => (
              <li key={e.key}>
                <button type="button" onClick={() => setOpen(e)} className="w-full text-left px-3 py-2.5 hover:bg-board-ground focus:outline-none focus-visible:bg-board-ground">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[11px] font-mono text-ink-muted tabular-nums">{formatWhen(e.at)}</span>
                    <SeverityChip severity={e.severity} />
                    <span className="text-[11px] text-ink-muted">{AUDIT_SOURCE_LABELS[e.source]}</span>
                  </div>
                  <p className="text-sm text-ink break-words mt-0.5">{e.action}</p>
                  <p className="text-xs text-ink-muted break-words">
                    {e.actor?.name ?? "System"}
                    {e.ip ? <span className="font-mono"> · {e.ip}</span> : null}
                    {e.summary ? ` · ${e.summary}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cursor && events.length > 0 && (
        <div className="flex justify-center">
          <button type="button" onClick={loadMore} disabled={loadingMore} className={`${btn} border-edge bg-board-plate text-ink hover:bg-board-ground`}>
            {loadingMore ? "Loading..." : "Load older entries"}
          </button>
        </div>
      )}
      {!cursor && events.length > 0 && <p className="text-center text-[11px] text-ink-muted">End of the log for these filters ({events.length} entries).</p>}

      {open && (
        <AuditEventDrawer
          event={open}
          onClose={() => setOpen(null)}
          onOpen={setOpen}
          onFilterActor={(e) => {
            if (e.actor && e.actor.id !== null && e.actor.kind !== "system") setActor({ key: `${e.actor.kind}:${e.actor.id}`, name: e.actor.name });
            setOpen(null);
          }}
          onFilterIp={(v) => {
            setIp(v);
            setOpen(null);
          }}
        />
      )}
    </div>
  );
};
