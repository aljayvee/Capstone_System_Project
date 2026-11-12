import React from "react";
import { ArrowUpRight, Pause, Play, TrendingUp, Bike, AlertTriangle, Store } from "lucide-react";
import type { KuyaSugoAction } from "./KuyaSugoCharacter";
import { KuyaSugoScene } from "./KuyaSugoScene";

const QUICK_ACTIONS = [
  { label: "How are today's sales?", icon: TrendingUp, query: "How much are our sales today?" },
  { label: "Any riders or orders delayed?", icon: Bike, query: "How are our riders doing? Are any orders delayed?" },
  { label: "Why were orders cancelled?", icon: AlertTriangle, query: "Which orders were cancelled recently, and why?" },
  { label: "Which categories sell the most?", icon: Store, query: "Which store categories have the most sales?" },
];

interface OwnerCopilotWelcomeProps {
  action: KuyaSugoAction;
  hasConversation: boolean;
  paused: boolean;
  isLoading: boolean;
  onToggleAnimation: () => void;
  onAsk: (query: string) => void;
}

export function OwnerCopilotWelcome({ action, hasConversation, paused, isLoading, onToggleAnimation, onAsk }: OwnerCopilotWelcomeProps) {
  return (
    <div className="kuya-welcome" data-compact={hasConversation}>
      <div className="kuya-welcome__intro">
        <div className="kuya-welcome__art">
          <div className="kuya-welcome__disc" />
          <KuyaSugoScene action={action} paused={paused} />
        </div>
        <div className="kuya-welcome__copy">
          <h3>{hasConversation ? "I'm here to help, Boss." : "Hi, Boss! Need a hand?"}</h3>
          <p>Ask me about sales, riders, or orders. Let's check them together.</p>
          <button type="button" className="kuya-motion-button" onClick={onToggleAnimation} aria-pressed={paused}>
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? "Play animation" : "Pause animation"}
          </button>
        </div>
      </div>
      <p className="kuya-welcome__prompt">{hasConversation ? "Ask another question" : "Try asking about"}</p>
      <div className="kuya-questions">
        {QUICK_ACTIONS.map(({ label, icon: Icon, query }) => (
          <button key={label} type="button" className="kuya-question" disabled={isLoading} onClick={() => onAsk(query)}>
            <Icon size={18} className="kuya-question__icon" />
            <span>{label}</span>
            <ArrowUpRight size={14} className="kuya-question__arrow" />
          </button>
        ))}
      </div>
    </div>
  );
}
