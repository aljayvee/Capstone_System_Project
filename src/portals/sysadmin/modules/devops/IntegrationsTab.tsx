import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, CircleOff, Plug, RefreshCw, XCircle } from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { apiErrorText } from "../../lib/apiErrorText";
import type { IntegrationReport, IntegrationResult, IntegrationStatus } from "../../../../types/sysAdminIntegrations";

const chip = "inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap";
const buttonBase =
  "inline-flex items-center justify-center gap-1.5 px-3 min-h-[40px] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const STATUS: Record<IntegrationStatus, { label: string; tone: string; icon: React.ElementType; iconTone: string }> = {
  ok: { label: "WORKING", tone: "bg-status-done-fill text-status-done-ink border-status-done-ink/30", icon: CheckCircle2, iconTone: "text-status-done-ink" },
  warn: { label: "NEEDS A LOOK", tone: "bg-status-waiting-fill text-status-waiting-ink border-status-waiting-ink/30", icon: AlertTriangle, iconTone: "text-status-waiting-ink" },
  down: { label: "NOT WORKING", tone: "bg-status-act-fill text-status-act-ink border-status-act-ink/30", icon: XCircle, iconTone: "text-status-act-ink" },
  off: { label: "NOT SET UP", tone: "bg-board-ground text-ink-muted border-edge", icon: CircleOff, iconTone: "text-ink-muted" },
  unchecked: { label: "NOT TESTED", tone: "bg-board-ground text-ink-muted border-edge", icon: CircleDashed, iconTone: "text-ink-muted" },
};

const GROUPS: { key: IntegrationResult["group"]; title: string; note: string }[] = [
  { key: "core", title: "Core", note: "If one of these fails, the business is affected right away." },
  { key: "features", title: "Features", note: "These degrade one feature; the rest keeps working." },
];

function Row({ result }: { result: IntegrationResult }) {
  const s = STATUS[result.status];
  const Icon = s.icon;
  return (
    <li className="p-3.5 flex items-start gap-3 min-w-0">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${s.iconTone}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink">{result.label}</span>
          <span className={`${chip} ${s.tone}`}>{s.label}</span>
          {result.status !== "off" && result.status !== "unchecked" && (
            <span className="text-[10px] font-mono text-ink-muted">{result.latencyMs} ms</span>
          )}
        </div>
        <p className="text-xs text-ink break-words">{result.summary}</p>
        <p className="text-[11px] text-ink-muted break-words">{result.purpose}</p>
      </div>
    </li>
  );
}

export const IntegrationsTab: React.FC = () => {
  const [report, setReport] = useState<IntegrationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setReport(await sysAdminApiService.getIntegrations());
    } catch (err: unknown) {
      setError(apiErrorText(err, "Could not check the integrations."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading && !report) {
    return (
      <div className="p-5 rounded-xl bg-board-plate border border-edge animate-pulse space-y-3" aria-busy="true" aria-label="Checking integrations">
        <div className="h-3 w-48 rounded bg-board-ground" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-board-ground" />
        ))}
        <p className="text-[11px] text-ink-muted">Asking each service directly. This can take up to 10 seconds.</p>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="p-4 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
        <button type="button" onClick={load} className={`${buttonBase} bg-board-plate border border-edge text-ink self-start sm:self-auto`}>
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    );
  }

  if (!report) return null;

  const attention = report.results.filter((r) => r.status === "warn" || r.status === "down");
  const downCount = report.results.filter((r) => r.status === "down").length;
  const verdict =
    report.overall === "ok"
      ? { text: "Every configured service answers.", tone: STATUS.ok }
      : report.overall === "warn"
        ? { text: `${attention.length} ${attention.length === 1 ? "service needs" : "services need"} a look.`, tone: STATUS.warn }
        : { text: `${downCount} ${downCount === 1 ? "service is" : "services are"} not working.`, tone: STATUS.down };
  const VerdictIcon = verdict.tone.icon;

  return (
    <section className="space-y-4" aria-labelledby="integrations-heading">
      <div className="p-4 rounded-xl bg-board-plate border border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Plug className="w-5 h-5 text-ink-muted shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <h3 id="integrations-heading" className="text-sm font-semibold text-ink">
              Outside services
            </h3>
            <p className="text-[11px] text-ink-muted">
              Checked {new Date(report.checkedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "medium" })} in{" "}
              {(report.durationMs / 1000).toFixed(1)} s. Services billed per call are judged from their recent real use.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className={`${buttonBase} bg-board-ground border border-edge text-ink hover:bg-board-plate self-start sm:self-auto`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Checking..." : "Check again"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-status-act-ink flex items-start gap-2" role="alert">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error} Showing the previous result.
        </p>
      )}

      {report.results.length > 0 && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2 text-sm font-semibold ${verdict.tone.tone}`} role="status">
          <VerdictIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{verdict.text}</span>
        </div>
      )}

      {report.results.length === 0 ? (
        <p className="text-xs text-ink-muted p-4 rounded-xl bg-board-plate border border-edge">The server returned no services to check.</p>
      ) : (
        GROUPS.map((group) => {
          const rows = report.results.filter((r) => r.group === group.key);
          if (rows.length === 0) return null;
          return (
            <div key={group.key} className="rounded-xl bg-board-plate border border-edge overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-edge">
                <h4 className="text-xs font-semibold text-ink uppercase tracking-wide">{group.title}</h4>
                <p className="text-[11px] text-ink-muted">{group.note}</p>
              </div>
              <ul className="divide-y divide-edge">
                {rows.map((r) => (
                  <Row key={r.key} result={r} />
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
};
