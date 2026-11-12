import React, { useState, useEffect, useRef } from "react";
import { X, Send, RotateCcw, Loader2 } from "lucide-react";
import { OwnerCopilotWelcome } from "./OwnerCopilotWelcome";
import { OwnerCopilotMessage } from "./OwnerCopilotMessage";
import type { KuyaSugoAction } from "./KuyaSugoCharacter";
import "../../../styles/kuya-sugo.css";
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
    "Hi, Boss! I'm Kuya Sugo. Ask me about sales, riders, or orders. Let's check them together.",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map((message: CopilotMessage) => message.id?.startsWith("greeting") ? { ...message, content: INITIAL_GREETING.content } : message);
      }
    } catch {
      // Fall through to initial greeting
    }
    return [INITIAL_GREETING];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [animationPaused, setAnimationPaused] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const conversation = messages.filter((message) => !message.id?.startsWith("greeting"));
  let characterAction: KuyaSugoAction = conversation.length ? "ready" : "wave";
  if (input.trim()) characterAction = "listen";
  if (isLoading) characterAction = "think";
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

  useEffect(() => {
    if (!isOpen || !conversation.length) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth" });
  }, [isOpen, messages, isLoading]);

  // Keep keyboard navigation inside the open drawer and return focus to its trigger.
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 100);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const controls = drawerRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), textarea:not(:disabled), [tabindex='0']");
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
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
    } catch {
      const errorMessage: CopilotMessage = {
        id: `err-${Date.now()}`,
        role: "model",
        content: "Sorry, Boss. I couldn't get an answer. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Reset also works without storage. */ }
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

  return (
    <>
      {isOpen && <div className="kuya-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside ref={drawerRef} id="owner-kuya-sugo" role="dialog" aria-modal="true"
        aria-label="Kuya Sugo" aria-hidden={!isOpen} {...(!isOpen ? { inert: "" } : {})}
        className="kuya-drawer" data-open={isOpen} data-paused={animationPaused || !isOpen}>
        <header className="kuya-header">
          <div className="kuya-header__identity">
            <span className="kuya-header__mark" aria-hidden="true">S</span>
            <div><h2>Kuya Sugo</h2><p>Your AI helper</p></div>
          </div>
          <div className="kuya-header__actions">
            <button type="button" onClick={handleClearChat} disabled={isLoading} title="New chat" aria-label="New chat"><RotateCcw size={18} /></button>
            <button type="button" onClick={onClose} title="Close (Esc)" aria-label="Close Kuya Sugo"><X size={20} /></button>
          </div>
        </header>
        <div className="kuya-stream">
          <OwnerCopilotWelcome action={characterAction} hasConversation={!!conversation.length}
            paused={animationPaused} isLoading={isLoading}
            onToggleAnimation={() => setAnimationPaused((paused) => !paused)} onAsk={handleSendMessage} />
          <div className="kuya-conversation" role="log" aria-label="Chat messages" aria-live="polite" aria-relevant="additions text">
            {conversation.map((message, index) => <OwnerCopilotMessage key={message.id || index} message={message} onAction={handleActionLinkClick} />)}
          </div>
          {isLoading && <div className="kuya-thinking" role="status"><Loader2 size={16} /><span>Let me check that, Boss...</span></div>}
          <div ref={messagesEndRef} />
        </div>
        <footer className="kuya-footer">
          <form onSubmit={(event) => { event.preventDefault(); handleSendMessage(); }}>
            <label htmlFor="kuya-question" className="kuya-composer-label">Your question</label>
            <div className="kuya-composer">
              <textarea ref={inputRef} id="kuya-question" value={input} rows={2}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault(); handleSendMessage();
                  }
                }}
                placeholder="What would you like to know?" readOnly={isLoading} aria-busy={isLoading} />
              <button type="submit" disabled={!input.trim() || isLoading} title="Send message" aria-label="Send message"><Send size={18} /></button>
            </div>
            <div className="kuya-footer__hint"><span>Enter to send · Shift+Enter for a new line</span><kbd>Esc to close</kbd></div>
            <p className="kuya-footer__note">AI can make mistakes. Check important details.</p>
          </form>
        </footer>
      </aside>
    </>
  );
};
