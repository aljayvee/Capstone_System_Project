import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  RotateCcw,
  Bot,
  TrendingUp,
  Bike,
  AlertTriangle,
  Store,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  ownerCopilotApiService,
  type CopilotMessage,
  type CopilotActionLink,
} from "../../../services/ownerCopilotApiService";
import type { ReportTab } from "../modules/reports/FinancialReportsModule";

interface OwnerCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule?: string;
  onNavigateToModule?: (module: string) => void;
  onNavigateToReport?: (tab: ReportTab) => void;
}

const STORAGE_KEY = "sugo_owner_copilot_history";

const INITIAL_GREETING: CopilotMessage = {
  id: "greeting-0",
  role: "model",
  content:
    "Magandang araw, Boss! Ako si **Kuya Sugo**, your operational co-pilot for Tacurong City. I am connected directly to our live system database.\n\nYou can ask me natural questions about today's sales, rider fleet movements, store bottlenecks, cancellations, or merchant categories. How can I help you today?",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const QUICK_ACTIONS = [
  {
    label: "Today's Sales Pulse",
    icon: TrendingUp,
    query: "What is our sales pulse today?",
  },
  {
    label: "Active Fleet & Delays",
    icon: Bike,
    query: "How is our rider fleet doing right now? Are there any store delays or bottlenecks?",
  },
  {
    label: "Cancellation Recap",
    icon: AlertTriangle,
    query: "Give me a recap of recent cancellations and operational exceptions.",
  },
  {
    label: "Top Categories",
    icon: Store,
    query: "Which merchant categories have the highest sales volume?",
  },
];

export const OwnerCopilotDrawer: React.FC<OwnerCopilotDrawerProps> = ({
  isOpen,
  onClose,
  activeModule,
  onNavigateToModule,
  onNavigateToReport,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fall through to initial greeting
    }
    return [INITIAL_GREETING];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Synchronize conversation to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Storage quota or private browsing safeguard
    }
  }, [messages]);

  // Scroll to bottom on new message or drawer open
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  // Global Escape key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    const userMessage: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    if (!textToSend) {
      setInput("");
    }
    setIsLoading(true);

    try {
      // Map history for API payload (strip greetings, window to recent 20 messages, guarantee starts with user)
      const nonGreetingHistory = newHistory.filter(
        (m) => !m.id?.startsWith("greeting") && m.id !== "greeting-0"
      );
      const recentHistory = nonGreetingHistory.slice(-20);
      const firstUserIdx = recentHistory.findIndex((m) => m.role === "user");
      const validHistory = firstUserIdx >= 0 ? recentHistory.slice(firstUserIdx) : [userMessage];

      const payloadMessages = validHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await ownerCopilotApiService.sendMessage(payloadMessages, {
        activeModule,
      });

      const assistantMessage: CopilotMessage = {
        id: `model-${Date.now()}`,
        role: "model",
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionLinks: res.actionLinks,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: CopilotMessage = {
        id: `err-${Date.now()}`,
        role: "model",
        content: "Pasensya na, Boss. A communication error occurred while querying the server.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setMessages([
      {
        ...INITIAL_GREETING,
        id: `greeting-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const handleActionLinkClick = (link: CopilotActionLink) => {
    if (link.action === "open_report" && onNavigateToReport) {
      onNavigateToReport(link.target as ReportTab);
      if (onNavigateToModule) onNavigateToModule("reports");
    } else if (link.action === "open_module" && onNavigateToModule) {
      onNavigateToModule(link.target);
    }
    onClose();
  };

  /**
   * High-speed, dependency-free Markdown parser for structured bullet points,
   * bold headers, and key-value metrics without AI-slop or heavy bundles.
   */
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      // Headers (### or ##)
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="font-bold text-sm text-slate-100 mt-2 mb-1">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="font-bold text-base text-slate-100 mt-3 mb-1.5">
            {line.replace("## ", "")}
          </h3>
        );
      }

      // Bullet points (* or -)
      if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
        const text = line.trim().replace(/^[\*\-]\s+/, "");
        return (
          <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300 my-0.5 leading-relaxed">
            <span className="text-red-500 font-bold select-none leading-tight mt-0.5">•</span>
            <div>{formatInlineSpans(text)}</div>
          </div>
        );
      }

      // Standard paragraph
      return (
        <p key={idx} className="text-xs sm:text-sm text-slate-300 my-1 leading-relaxed">
          {formatInlineSpans(line)}
        </p>
      );
    });
  };

  /**
   * Formats inline spans like **bold text** and `code tags`
   */
  const formatInlineSpans = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px] border border-slate-700">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 z-50 transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Slide-over Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Kuya Sugo AI Executive Copilot"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] md:w-[480px] bg-[#0B132B] border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
        }`}
      >
        {/* Header */}
        <header className="p-3.5 sm:p-4 border-b border-slate-800/90 flex items-center justify-between bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-base shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-white tracking-tight">Kuya Sugo</h2>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Operational
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Executive Operations Co-pilot</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearChat}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear Conversation"
              aria-label="Clear Conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Drawer (Esc)"
              aria-label="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 1-Tap Quick Actions Bar */}
        <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800/70 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max">
            {QUICK_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(action.query)}
                  disabled={isLoading}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Icon className="w-3.5 h-3.5 text-red-500" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id || index}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                <div
                  className={`rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 transition-colors ${
                    isUser
                      ? "bg-slate-800/95 text-slate-100 border border-slate-700/80 rounded-tr-xs max-w-[85%]"
                      : "bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-xs max-w-[92%]"
                  }`}
                >
                  {/* Message body */}
                  <div className="space-y-0.5">{renderFormattedContent(msg.content)}</div>

                  {/* Deep link action badges */}
                  {!isUser && msg.actionLinks && msg.actionLinks.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap gap-1.5">
                      {msg.actionLinks.map((link, lIdx) => (
                        <button
                          key={lIdx}
                          type="button"
                          onClick={() => handleActionLinkClick(link)}
                          className="px-2.5 py-1 rounded-md bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{link.label}</span>
                          <ExternalLink className="w-3 h-3 text-red-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`mt-1.5 text-[10px] text-slate-500 ${isUser ? "text-right" : "text-left"}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Thinking / Shimmer Indicator */}
          {isLoading && (
            <div className="flex flex-col items-start animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2.5 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                <span>Kuya Sugo is querying live database...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer Dock */}
        <footer className="p-3 bg-slate-950 border-t border-slate-800/90">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex flex-col gap-1.5"
          >
            <div className="relative flex items-center">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask Kuya Sugo about sales, riders, delays, or categories..."
                rows={2}
                disabled={isLoading}
                className="w-full bg-slate-900 border border-slate-800 focus:border-red-500/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden resize-none pr-11 transition-colors leading-relaxed"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-2 w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Send query"
                aria-label="Send query"
              >
                <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 select-none">
              <span>Press Enter to send, Shift+Enter for newline</span>
              <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400 font-mono">
                Ctrl+J to toggle
              </kbd>
            </div>
          </form>
        </footer>
      </aside>
    </>
  );
};
