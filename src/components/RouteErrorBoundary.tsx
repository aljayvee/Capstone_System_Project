import React, { useState } from "react";
import { useRouteError, isRouteErrorResponse } from "react-router";
import { AlertTriangle, RefreshCw, Copy, Check, Home } from "lucide-react";
import { isChunkLoadError } from "../utils/lazyWithRetry";

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const [copied, setCopied] = useState(false);
  const [incidentId] = useState(() => `ERR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);

  const isChunkError = isChunkLoadError(error);

  const errorMessage =
    error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : typeof error === "string"
      ? error
      : "Unknown application error";

  const handleCopy = () => {
    const details = `Incident ID: #${incidentId}\nError: ${errorMessage}\nURL: ${window.location.href}\nTimestamp: ${new Date().toISOString()}`;
    navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReload = () => {
    sessionStorage.removeItem("sugo_chunk_reload_done");
    window.location.reload();
  };

  if (isChunkError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-5 select-none font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto text-blue-400">
            <RefreshCw size={26} strokeWidth={2.2} />
          </div>

          <div className="space-y-1.5">
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold tracking-wider uppercase">
              App Update Available
            </div>
            <h1 className="text-xl font-bold text-slate-100">
              New Version Deployed
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
              A newer version of the Sugo portal has been released. Reloading will sync your browser with the latest update.
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home size={14} />
              <span>Return Home</span>
            </button>
            <button
              type="button"
              onClick={handleReload}
              className="flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-500 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Reload Now</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-5 select-none font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 text-center space-y-5 shadow-2xl">
        <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
          <AlertTriangle size={28} strokeWidth={2.2} />
        </div>

        <div className="space-y-1.5">
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold tracking-wider uppercase">
            {isRouteErrorResponse(error) ? `HTTP ${error.status} Route Error` : "Route Exception"}
          </div>
          <h1 className="text-xl font-bold text-slate-100">
            Something unexpected happened
          </h1>
          <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
            {isRouteErrorResponse(error)
              ? error.data?.message || error.statusText
              : "A route error occurred while loading this view. Your session data remains safe."}
          </p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-left">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Support Reference
            </span>
            <span className="font-mono text-xs font-bold text-amber-400">
              #{incidentId}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home size={14} />
            <span>Go to Home</span>
          </button>
          <button
            type="button"
            onClick={handleReload}
            className="flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-500 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Reload Page</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteErrorBoundary;
