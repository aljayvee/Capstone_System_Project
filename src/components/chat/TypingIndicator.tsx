import React from "react";
import { User, Headphones } from "lucide-react";

interface TypingIndicatorProps {
  name?: string;
  role?: "customer" | "dispatcher";
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  name = "Customer",
  role = "customer",
}) => {
  return (
    <div
      className="flex items-end gap-2.5 my-2 max-w-[88%] mr-auto flex-row animate-in fade-in duration-200"
      data-testid="dispatcher-chat-typing-indicator"
    >
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 bg-slate-200 text-slate-700 border border-slate-300/80 shadow-xs"
        title={name}
      >
        {role === "customer" ? (
          <User size={14} className="text-slate-600" />
        ) : (
          <Headphones size={14} className="text-slate-600" />
        )}
      </div>

      <div className="flex flex-col items-start">
        <span className="text-[10px] font-medium text-slate-400 mb-1 px-1">
          {name} is typing...
        </span>

        {/* 3-Dot Animated Bubble */}
        <div className="bg-slate-100 border border-slate-200/90 rounded-2xl rounded-bl-xs px-3.5 py-2.5 flex items-center gap-1.5 shadow-2xs">
          <span
            className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDuration: "1s", animationDelay: "0ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDuration: "1s", animationDelay: "200ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDuration: "1s", animationDelay: "400ms" }}
          />
        </div>
      </div>
    </div>
  );
};
