import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Terminal,
  RefreshCw,
  Search,
  ShieldCheck,
  Copy,
  Check,
  ArrowDown,
  AlertCircle,
} from "lucide-react";
import { sysAdminApiService } from "../../../../services/sysAdminApiService";
import type { LogSource, LogTailResult } from "../../../../types/sysAdmin";

const LOG_SOURCES: { key: LogSource; label: string; desc: string }[] = [
  { key: "pm2_out", label: "PM2 Backend (Stdout)", desc: "Standard console log output from Node.js Express cluster" },
  { key: "pm2_error", label: "PM2 Backend (Stderr)", desc: "Uncaught exceptions, rejection warnings, and error logs" },
  { key: "nginx_access", label: "Nginx Access Log", desc: "Edge reverse proxy HTTP request stream & status codes" },
  { key: "nginx_error", label: "Nginx Error Log", desc: "Edge routing failures, upstream timeouts, and SSL diagnostics" },
];

export const LogsTab: React.FC = () => {
  const [selectedSource, setSelectedSource] = useState<LogSource>("pm2_out");
  const [lineCount, setLineCount] = useState<number>(100);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [logData, setLogData] = useState<LogTailResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const terminalRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sysAdminApiService.getLogs(
        selectedSource,
        lineCount,
        searchTerm.trim() || undefined
      );
      setLogData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to stream system logs.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSource, lineCount, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logData, autoScroll]);

  const handleCopy = () => {
    if (!logData || !logData.lines.length) return;
    const text = logData.lines.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatLogLine = (line: string) => {
    if (line.includes("[ERROR]") || line.includes("error") || line.includes("FAILED") || line.includes("500")) {
      return "text-status-act-ink";
    }
    if (line.includes("[WARN]") || line.includes("warn") || line.includes("404") || line.includes("401") || line.includes("403")) {
      return "text-status-waiting-ink";
    }
    if (line.includes("[INFO]") || line.includes("200") || line.includes("201")) {
      return "text-status-done-ink";
    }
    return "text-ink";
  };

  return (
    <div className="space-y-5">
      {/* Log Source Tabs */}
      <div className="flex items-center gap-2 border-b border-edge pb-3 overflow-x-auto scrollbar-none flex-nowrap sm:flex-wrap">
        {LOG_SOURCES.map((s) => (
          <button
            key={s.key}
            onClick={() => setSelectedSource(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              selectedSource === s.key
                ? "bg-signal text-white shadow-sm"
                : "bg-board-plate text-ink-muted hover:text-white hover:bg-board-ground border border-edge"
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Controls Bar */}
      <div className="p-3.5 rounded-xl bg-board-plate border border-edge flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search / Filter log lines..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-board-ground border border-edge text-xs text-ink placeholder-ink-muted focus:outline-none focus:border-status-act-ink/30 w-48 sm:w-64 font-mono"
            />
          </div>

          {/* Line count dropdown */}
          <select
            value={lineCount}
            onChange={(e) => setLineCount(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg bg-board-ground border border-edge text-xs font-mono text-ink focus:outline-none focus:border-status-act-ink/30"
          >
            <option value={50}>50 Lines</option>
            <option value={100}>100 Lines</option>
            <option value={200}>200 Lines</option>
            <option value={500}>500 Lines</option>
          </select>

          {/* Auto scroll toggle */}
          <label className="inline-flex items-center gap-1.5 text-xs text-ink-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-board-ground border-edge text-status-act-ink focus:ring-0"
            />
            <span>Auto-Scroll</span>
          </label>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleCopy}
            disabled={!logData?.lines.length}
            className="px-3 py-1.5 rounded-lg bg-board-ground hover:bg-board-ground border border-edge text-xs text-ink transition-colors flex items-center gap-1.5"
            title="Copy visible lines to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-status-done-ink" />
                <span className="text-status-done-ink font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-ink-muted" />
                <span>Copy Logs</span>
              </>
            )}
          </button>

          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-signal hover:bg-signal-deep disabled:opacity-50 text-xs font-medium text-white transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Security Redaction Active Banner */}
      <div className="px-4 py-2.5 rounded-xl bg-status-done-fill border border-status-done-ink/30 text-[11px] text-status-done-ink font-mono flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-status-done-ink shrink-0" />
          <span>
            Server-Side Credential Redaction Active: Passwords, JWT tokens, database connection strings, and API secrets are automatically sanitized before client streaming.
          </span>
        </div>
        <span className="text-ink-muted shrink-0 hidden sm:inline">
          {logData ? `${logData.totalLines} lines rendered` : ""}
        </span>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-status-act-fill border border-status-act-ink/30 text-xs text-status-act-ink font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-status-act-ink shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Terminal Display Container */}
      <div className="rounded-xl bg-board-ground border border-edge overflow-hidden shadow-2xl flex flex-col">
        {/* Terminal Header */}
        <div className="px-4 py-2 bg-board-ground border-b border-edge flex items-center justify-between text-[11px] font-mono text-ink-muted">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-act-fill" />
            <span className="w-2.5 h-2.5 rounded-full bg-status-waiting-fill" />
            <span className="w-2.5 h-2.5 rounded-full bg-status-done-fill" />
            <span className="text-ink font-semibold ml-2">
              {logData?.filePath || "Streaming..."}
            </span>
          </div>
          <span className="text-[10px] text-ink-muted">Read-Only Tail Stream</span>
        </div>

        {/* Terminal Body */}
        <div
          ref={terminalRef}
          className="p-3 sm:p-4 overflow-x-auto overflow-y-auto max-h-[500px] min-h-[350px] font-mono text-[10px] sm:text-[11px] leading-relaxed space-y-0.5 select-text"
        >
          {isLoading && !logData ? (
            <div className="flex items-center justify-center py-16 text-ink-muted">
              <RefreshCw className="w-4 h-4 animate-spin mr-2 text-status-act-ink" />
              <span>Fetching remote system log stream...</span>
            </div>
          ) : !logData || logData.lines.length === 0 ? (
            <div className="text-center py-16 text-ink-muted">
              No matching log lines found in this stream.
            </div>
          ) : (
            logData.lines.map((line, idx) => (
              <div key={idx} className="flex items-start gap-3 hover:bg-board-ground px-1 py-0.5 rounded">
                <span className="text-ink-muted select-none text-right w-8 shrink-0 tabular-nums">
                  {idx + 1}
                </span>
                <span className={`break-all whitespace-pre-wrap ${formatLogLine(line)}`}>
                  {line}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
