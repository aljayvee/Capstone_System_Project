import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Activity,
  Server,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  Monitor,
  CheckCircle2,
  XCircle,
  Maximize2,
  Layers,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import { useSysAdminLanguage } from "../../context/SysAdminLanguageContext";
import type { TrafficSummary } from "../../../../types/sysAdmin";

type TrafficViewMode = "native" | "terminal";

export const TrafficMonitoringModule: React.FC = () => {
  const { t } = useSysAdminLanguage();
  const [viewMode, setViewMode] = useState<TrafficViewMode>("native");
  const [data, setData] = useState<TrafficSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const fetchTraffic = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await sysAdminApiService.getTrafficSummary();
      setData(summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load traffic metrics.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTraffic();
  }, [fetchTraffic]);

  const reportUrl = sysAdminApiService.getGoAccessReportUrl();

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink tracking-wide">{t("trafficHeaderTitle")}</h2>
          <p className="text-xs text-ink-muted">
            {t("trafficHeaderSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-board-ground p-1 rounded-xl border border-edge">
            <button
              onClick={() => setViewMode("native")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                viewMode === "native"
                  ? "bg-board-plate text-ink border border-edge shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t("trafficTabOverview")}
            </button>
            <button
              onClick={() => {
                setViewMode("terminal");
                setIframeKey((k) => k + 1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                viewMode === "terminal"
                  ? "bg-board-plate text-ink border border-edge shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t("trafficTabLiveTerminal")}
            </button>
          </div>

          <button
            onClick={fetchTraffic}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-board-plate hover:bg-board-ground border border-edge text-xs font-medium text-ink transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-status-act-ink" : "text-ink-muted"}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Environment & Log Path Banner */}
      {data && (
        <div className="p-3.5 rounded-xl bg-board-ground border border-edge flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-status-moving-ink" />
            <span className="text-ink-muted">Log Source:</span>
            <span className="font-mono text-ink">{data.logPath}</span>
          </div>

          <div className="flex items-center gap-2">
            {data.isLiveVps ? (
              <span className="inline-flex items-center gap-1.5 text-status-done-ink font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-status-done-fill animate-pulse" />
                Live Contabo VPS Linux Stream
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-status-waiting-ink font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-status-waiting-fill" />
                Local Dev Telemetry (Simulated Engine)
              </span>
            )}
            <span className="text-ink-muted">&bull;</span>
            <span className="text-[11px] font-mono text-ink-muted">
              Synced: {new Date(data.generatedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-act-ink shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchTraffic} className="underline text-status-act-ink hover:text-status-act-ink">
            Retry
          </button>
        </div>
      )}

      {/* View Mode 1: Native Metrics Dashboard */}
      {viewMode === "native" && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-board-plate border border-edge">
              <div className="text-xs font-medium text-ink-muted mb-1">Total HTTP Hits</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-ink">
                {data ? data.totalRequests.toLocaleString() : "--"}
              </div>
              <div className="text-[11px] text-status-done-ink font-mono mt-1">
                {data ? `${((data.validRequests / data.totalRequests) * 100).toFixed(1)}% Valid Requests` : "Loading..."}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-board-plate border border-edge">
              <div className="text-xs font-medium text-ink-muted mb-1">Unique Visitors</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-status-moving-ink">
                {data ? data.uniqueVisitors.toLocaleString() : "--"}
              </div>
              <div className="text-[11px] text-ink-muted font-mono mt-1">
                {data ? `${data.uniqueVisitorsPercentage}% of Total Hits` : "Loading..."}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-board-plate border border-edge">
              <div className="text-xs font-medium text-ink-muted mb-1">Total Bandwidth</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-ink">
                {data ? data.bandwidthFormatted : "--"}
              </div>
              <div className="text-[11px] text-ink-muted font-mono mt-1">Outbound &amp; Cache Data</div>
            </div>

            <div className="p-4 rounded-xl bg-board-plate border border-edge">
              <div className="text-xs font-medium text-ink-muted mb-1">Failed Requests (4xx / 5xx)</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-status-act-ink">
                {data ? data.failedRequests.toLocaleString() : "--"}
              </div>
              <div className="text-[11px] text-status-act-ink font-mono mt-1">
                {data ? `${((data.failedRequests / data.totalRequests) * 100).toFixed(2)}% Failure Rate` : "Loading..."}
              </div>
            </div>
          </div>

          {/* Top Requested Endpoints */}
          <div className="rounded-xl bg-board-plate border border-edge overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-board-ground border-b border-edge flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase text-ink">
                Top Requested Endpoints &amp; API Routes
              </h3>
              <span className="text-[11px] font-mono text-ink-muted">Sorted by Hit Volume</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-edge text-ink-muted font-mono text-[11px] uppercase">
                    <th className="py-2.5 px-4">Endpoint URI</th>
                    <th className="py-2.5 px-4 text-right">Hits</th>
                    <th className="py-2.5 px-4 text-center">Traffic Share</th>
                    <th className="py-2.5 px-4 text-right">Bandwidth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-ink-muted font-mono text-xs">
                        <div className="w-5 h-5 border-2 border-status-act-ink/30 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Analyzing web access logs...
                      </td>
                    </tr>
                  ) : !data || data.topEndpoints.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-ink-muted">
                        No endpoint records found
                      </td>
                    </tr>
                  ) : (
                    data.topEndpoints.map((ep, idx) => (
                      <tr key={idx} className="hover:bg-board-ground transition-colors font-mono">
                        <td className="py-2.5 px-4 text-ink">
                          <span className="text-status-done-ink font-semibold">{ep.url.split(" ")[0]} </span>
                          <span>{ep.url.split(" ").slice(1).join(" ")}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-ink tabular-nums">
                          {ep.hits.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 h-1.5 rounded-full bg-board-ground overflow-hidden">
                              <div
                                className="h-full bg-signal rounded-full"
                                style={{ width: `${Math.min(100, ep.percent)}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-ink-muted tabular-nums w-10 text-right">
                              {ep.percent}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right text-ink tabular-nums">{ep.bandwidth}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Client Ecosystem: OS, Browsers, Status Codes, Geo Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Operating Systems */}
            <div className="p-4 rounded-xl bg-board-plate border border-edge space-y-3">
              <div className="text-xs font-bold font-mono text-ink uppercase flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-status-moving-ink" />
                <span>Client Operating Systems</span>
              </div>
              <div className="space-y-2.5">
                {data?.visitorOs.map((os, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-ink">{os.name}</span>
                      <span className="text-ink font-bold tabular-nums">{os.percent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-board-ground overflow-hidden">
                      <div
                        className="h-full bg-status-moving-ink rounded-full"
                        style={{ width: `${os.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Client Browsers */}
            <div className="p-4 rounded-xl bg-board-plate border border-edge space-y-3">
              <div className="text-xs font-bold font-mono text-ink uppercase flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-status-done-ink" />
                <span>Browsers &amp; User-Agents</span>
              </div>
              <div className="space-y-2.5">
                {data?.visitorBrowsers.map((br, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-ink truncate max-w-[130px]">{br.name}</span>
                      <span className="text-ink font-bold tabular-nums">{br.percent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-board-ground overflow-hidden">
                      <div
                        className="h-full bg-go rounded-full"
                        style={{ width: `${br.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Codes */}
            <div className="p-4 rounded-xl bg-board-plate border border-edge space-y-3">
              <div className="text-xs font-bold font-mono text-ink uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-status-waiting-ink" />
                <span>HTTP Response Status</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                {data?.statusCodes.map((sc, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-edge">
                    <span className={sc.code < 400 ? "text-status-done-ink font-semibold" : "text-status-act-ink font-semibold"}>
                      {sc.label}
                    </span>
                    <span className="text-ink tabular-nums">{sc.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Geo Locations */}
            <div className="p-4 rounded-xl bg-board-plate border border-edge space-y-3">
              <div className="text-xs font-bold font-mono text-ink uppercase flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                <span>Regional Visitor Origins</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                {data?.geoLocations.map((geo, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-edge">
                    <span className="text-ink">{geo.city}</span>
                    <span className="text-ink font-bold tabular-nums">{geo.hits.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Mode 2: Live GoAccess Terminal HTML Report */}
      {viewMode === "terminal" && (
        <div className="rounded-xl bg-board-plate border border-edge overflow-hidden shadow-sm flex flex-col h-[750px]">
          <div className="px-4 py-2.5 bg-board-ground border-b border-edge flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-signal" />
              <div className="w-2.5 h-2.5 rounded-full bg-status-waiting-ink" />
              <div className="w-2.5 h-2.5 rounded-full bg-go" />
              <span className="text-xs font-mono text-ink-muted ml-2">
                goaccess /var/log/nginx/access.log -o html --log-format=COMBINED
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIframeKey((k) => k + 1)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-board-ground transition-colors"
                title="Reload report frame"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <a
                href={reportUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-board-plate hover:bg-board-ground text-xs font-mono text-ink border border-edge"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Open in Tab</span>
              </a>
            </div>
          </div>

          <div className="flex-1 w-full bg-board-ground">
            <iframe
              key={iframeKey}
              src={reportUrl}
              title="GoAccess Terminal Report"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
};
