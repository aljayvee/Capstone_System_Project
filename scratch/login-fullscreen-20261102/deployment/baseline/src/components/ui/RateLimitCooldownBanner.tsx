import React, { useState, useEffect } from "react";
import { Clock, ShieldAlert } from "lucide-react";

interface RateLimitCooldownBannerProps {
  retryAfterSeconds?: number;
  message?: string;
  onCooldownComplete?: () => void;
  className?: string;
}

export const RateLimitCooldownBanner: React.FC<RateLimitCooldownBannerProps> = ({
  retryAfterSeconds = 30,
  message = "Too many requests submitted. Rate limiting safeguards are active.",
  onCooldownComplete,
  className = "",
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(retryAfterSeconds);

  useEffect(() => {
    setSecondsRemaining(retryAfterSeconds);
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      onCooldownComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onCooldownComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, onCooldownComplete]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    if (mins > 0) {
      return `${mins}:${remainder < 10 ? "0" : ""}${remainder}s`;
    }
    return `${remainder}s`;
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`bg-slate-900 text-white rounded-2xl p-4 sm:p-4.5 border border-slate-800 shadow-md space-y-2 select-none ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <ShieldAlert size={14} />
          <span>Throttling Active</span>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-amber-300">
          <Clock size={12} />
          <span>{formatTime(secondsRemaining)}</span>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">{message}</p>

      {secondsRemaining > 0 && (
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-amber-500 h-full transition-all duration-1000 ease-linear rounded-full"
            style={{
              width: `${Math.max(0, Math.min(100, ((retryAfterSeconds - secondsRemaining) / retryAfterSeconds) * 100))}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default RateLimitCooldownBanner;
