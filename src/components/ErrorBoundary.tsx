import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy, Check, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  incidentId: string;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    incidentId: "",
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const generatedId = `ERR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    return { hasError: true, error, incidentId: generatedId };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if ((import.meta as any).env?.DEV) {
      console.error("[ErrorBoundary Caught]", error, errorInfo);
    }
  }

  private handleCopyIncident = () => {
    const details = `Incident ID: #${this.state.incidentId}\nError: ${this.state.error?.message || "Unknown error"}\nURL: ${window.location.href}\nTimestamp: ${new Date().toISOString()}`;
    navigator.clipboard.writeText(details);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  private handleReload = () => {
    if (this.props.onReset) {
      this.setState({ hasError: false, error: undefined });
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-5 select-none font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 text-center space-y-5 shadow-2xl">
            {/* Alert Icon Badge */}
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle size={28} strokeWidth={2.2} />
            </div>

            {/* Typography Hierarchy */}
            <div className="space-y-1.5">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold tracking-wider uppercase">
                HTTP 500 / Runtime Exception
              </div>
              <h1 className="text-xl font-bold text-slate-100">
                {this.props.fallbackTitle || "Something unexpected happened"}
              </h1>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                {this.props.fallbackDescription ||
                  "A defensive boundary caught a render exception. Your session data remains safe."}
              </p>
            </div>

            {/* Incident Metadata Bar */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-left">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Support Reference
                </span>
                <span className="font-mono text-xs font-bold text-amber-400">
                  #{this.state.incidentId}
                </span>
              </div>
              <button
                type="button"
                onClick={this.handleCopyIncident}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
              >
                {this.state.copied ? (
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

            {/* Actions */}
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
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-500 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
