import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Bike, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { apiErrorText } from "../../lib/apiErrorText";
import type { RiderActivityResponse, RiderDay } from "../../../../types/sysAdminAuditTimeline";
import { formatClock, formatMinutes } from "./auditTimelineUi";

const MANILA_OFFSET_MS = 8 * 3600_000;
const todayManila = () => new Date(Date.now() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
const SEGMENT = { ONLINE: "bg-status-done-ink", OFFLINE: "bg-board-ground", NO_DATA: "bg-status-waiting-ink/40" } as const;
const LABEL = { ONLINE: "Online", OFFLINE: "Offline", NO_DATA: "Nothing recorded" } as const;

function DayBar({ rider, start, end }: { rider: RiderDay; start: number; end: number }) {
  const span = end - start;
  return (
    <div className="relative h-3 w-full rounded bg-board-ground border border-edge overflow-hidden" role="img" aria-label={`${rider.name}: ${formatMinutes(rider.onlineMinutes)} online`}>
      {rider.periods.map((p, i) => {
        const left = ((Date.parse(p.start) - start) / span) * 100;
        const width = Math.max(0.3, ((Date.parse(p.end) - Date.parse(p.start)) / span) * 100);
        return (
          <span
            key={i}
            className={`absolute top-0 h-full ${SEGMENT[p.status]}`}
            style={{ left: `${left}%`, width: `${width}%` }}
            title={`${LABEL[p.status]} ${formatClock(p.start)}–${formatClock(p.end)} (${formatMinutes(p.minutes)})`}
          />
        );
      })}
    </div>
  );
}

function RiderRow({ rider, start, end }: { rider: RiderDay; start: number; end: number }) {
  const [open, setOpen] = useState(false);
  const online = rider.periods.filter((p) => p.status === "ONLINE");
  const gaps = rider.periods.filter((p) => p.status === "NO_DATA");
  return (
    <li className="p-3 space-y-2">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full text-left space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0">
            {open ? <ChevronDown className="w-4 h-4 text-ink-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-ink-muted shrink-0" />}
            <span className="text-sm font-semibold text-ink truncate">{rider.name}</span>
            <span className="text-[11px] text-ink-muted">@{rider.username}</span>
            {rider.accountStatus !== "Active" && <span className="text-[10px] px-1.5 py-0.5 rounded border border-edge text-ink-muted">{rider.accountStatus}</span>}
          </span>
          <span className="text-xs text-ink tabular-nums">
            {rider.samples === 0 ? <span className="text-ink-muted">No samples this day</span> : <>{formatMinutes(rider.onlineMinutes)} online</>}
            {rider.connectionDrops.length > 0 && <span className="text-status-waiting-ink"> · {rider.connectionDrops.length} drop{rider.connectionDrops.length > 1 ? "s" : ""}</span>}
          </span>
        </div>
        {rider.samples > 0 && <DayBar rider={rider} start={start} end={end} />}
      </button>

      {open && (
        <div className="grid sm:grid-cols-3 gap-3 pl-6 text-xs">
          <div>
            <h5 className="text-[11px] font-semibold text-ink mb-1">Online periods ({online.length})</h5>
            {online.length === 0 ? <p className="text-ink-muted">None</p> : (
              <ul className="space-y-0.5 max-h-48 overflow-y-auto">
                {online.map((p) => <li key={p.start} className="font-mono text-ink">{formatClock(p.start)}–{formatClock(p.end)} <span className="text-ink-muted">({formatMinutes(p.minutes)})</span></li>)}
              </ul>
            )}
            {gaps.length > 0 && <p className="text-ink-muted mt-1">{gaps.length} stretch{gaps.length > 1 ? "es" : ""} with nothing recorded ({formatMinutes(rider.noDataMinutes)}): the server was not taking samples.</p>}
          </div>
          <div>
            <h5 className="text-[11px] font-semibold text-ink mb-1">App sign-ins ({rider.sessions.length})</h5>
            {rider.sessions.length === 0 ? <p className="text-ink-muted">None</p> : (
              <ul className="space-y-0.5 max-h-48 overflow-y-auto">
                {rider.sessions.map((s) => <li key={s.id} className="font-mono text-ink">{formatClock(s.loginAt)}–{s.logoutAt ? formatClock(s.logoutAt) : "open"}</li>)}
              </ul>
            )}
          </div>
          <div>
            <h5 className="text-[11px] font-semibold text-ink mb-1">Connection drops ({rider.connectionDrops.length})</h5>
            {rider.connectionDrops.length === 0 ? <p className="text-ink-muted">None</p> : (
              <ul className="space-y-0.5 max-h-48 overflow-y-auto">
                {rider.connectionDrops.map((d) => (
                  <li key={d.id} className="text-ink">
                    <span className="font-mono">{formatClock(d.disconnectedAt)}–{d.reconnectedAt ? formatClock(d.reconnectedAt) : "no reconnect"}</span>
                    {d.errandRef && <span className="text-ink-muted"> · {d.errandRef}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export const RiderActivityTab: React.FC = () => {
  const [date, setDate] = useState(todayManila());
  const [data, setData] = useState<RiderActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await sysAdminApiService.getRiderActivity(date));
    } catch (err: unknown) {
      setError(apiErrorText(err, "Could not load rider activity."));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const start = data ? Date.parse(data.dayStart) : 0;
  const end = data ? Date.parse(data.dayEnd) : 0;
  const active = data?.riders.filter((r) => r.onlineMinutes > 0).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2"><Bike className="w-4 h-4 text-ink-muted" /> Rider day</h3>
          <p className="text-[11px] text-ink-muted">Built from the online/offline sample the server records for every rider every {data?.sampleMinutes ?? 2} minutes. Times are Manila time.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} max={todayManila()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Day" className="px-2 min-h-[36px] rounded-lg bg-board-plate border border-edge text-xs text-ink" />
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg border border-edge bg-board-plate text-xs text-ink hover:bg-board-ground disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex items-center justify-between gap-2">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</span>
          <button type="button" onClick={load} className="underline shrink-0">Try again</button>
        </div>
      )}

      {loading && !data ? (
        <div className="rounded-xl bg-board-plate border border-edge p-3 space-y-3 animate-pulse" aria-busy="true" aria-label="Loading rider activity">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 rounded bg-board-ground" />)}
        </div>
      ) : data && data.riders.length === 0 ? (
        <p className="p-6 text-center text-sm text-ink-muted rounded-xl bg-board-plate border border-edge">No rider accounts exist yet.</p>
      ) : data ? (
        <div className={`rounded-xl bg-board-plate border border-edge ${loading ? "opacity-60" : ""}`}>
          <div className="px-3 py-2 border-b border-edge flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-muted">
            <span>{active} of {data.riders.length} riders were online this day.</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className={`inline-block w-3 h-2 rounded-sm ${SEGMENT.ONLINE}`} /> Online</span>
              <span className="flex items-center gap-1"><span className={`inline-block w-3 h-2 rounded-sm border border-edge ${SEGMENT.OFFLINE}`} /> Offline</span>
              <span className="flex items-center gap-1"><span className={`inline-block w-3 h-2 rounded-sm ${SEGMENT.NO_DATA}`} /> Nothing recorded</span>
            </span>
          </div>
          <div className="hidden sm:flex justify-between px-3 pt-2 text-[10px] font-mono text-ink-muted" aria-hidden="true">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
          </div>
          <ul className="divide-y divide-edge">
            {data.riders.map((r) => <RiderRow key={r.riderId} rider={r} start={start} end={end} />)}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
