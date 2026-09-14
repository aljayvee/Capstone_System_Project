import React, { useEffect, useState } from "react";
import { AlertCircle, ShieldAlert, Smartphone, Info, RefreshCw, X } from "lucide-react";

export type AlertVariant = "error" | "security_cooldown" | "role_notice" | "info";

export interface LoginAlertBannerProps {
  variant: AlertVariant;
  title: string;
  message: string;
  cooldownSeconds?: number;
  onCooldownExpire?: () => void;
  actionText?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  autoDismissMs?: number;
  className?: string;
}

function formatCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export const LoginAlertBanner: React.FC<LoginAlertBannerProps> = ({
  variant,
  title,
  message,
  cooldownSeconds = 0,
  onCooldownExpire,
  actionText,
  onAction,
  onDismiss,
  autoDismissMs,
  className = "",
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(cooldownSeconds);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Auto-dismiss countdown timer (e.g. 1500ms to disappear)
  useEffect(() => {
    setIsVisible(true);
    if (!autoDismissMs || autoDismissMs <= 0) return;

    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
    }, Math.max(0, autoDismissMs - 200));

    const dismissTimer = setTimeout(() => {
      onDismissRef.current?.();
    }, autoDismissMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [autoDismissMs, title, message]);

  // Security cooldown ticker (for 429 rate limits)
  useEffect(() => {
    setRemainingTime(cooldownSeconds);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (variant !== "security_cooldown" || remainingTime <= 0) return;

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onCooldownExpire) onCooldownExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [variant, remainingTime, onCooldownExpire]);

  // Variant-specific styling configuration
  const config = {
    error: {
      container: "bg-rose-500/10 border-rose-500/30 text-rose-100",
      titleColor: "text-rose-200",
      textColor: "text-rose-200/90",
      icon: AlertCircle,
      iconColor: "text-rose-400",
      buttonBg: "bg-rose-600 hover:bg-rose-700 text-white",
    },
    security_cooldown: {
      container: "bg-amber-500/10 border-amber-500/30 text-amber-100",
      titleColor: "text-amber-200",
      textColor: "text-amber-200/90",
      icon: ShieldAlert,
      iconColor: "text-amber-400",
      buttonBg: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    role_notice: {
      container: "bg-sky-500/10 border-sky-500/30 text-sky-100",
      titleColor: "text-sky-200",
      textColor: "text-sky-200/90",
      icon: Smartphone,
      iconColor: "text-sky-400",
      buttonBg: "bg-sky-600 hover:bg-sky-700 text-white",
    },
    info: {
      container: "bg-slate-800/70 border-slate-700 text-slate-200",
      titleColor: "text-slate-100",
      textColor: "text-slate-300",
      icon: Info,
      iconColor: "text-slate-400",
      buttonBg: "bg-slate-700 hover:bg-slate-600 text-white",
    },
  }[variant];

  const IconComponent = config.icon;

  return (
    <div
      role="alert"
      className={`relative w-full p-4 rounded-xl border backdrop-blur-md transition-all duration-200 ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
      } ${config.container} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <IconComponent size={18} className={config.iconColor} />
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`text-sm font-bold tracking-tight ${config.titleColor}`}>
              {title}
            </h4>

            {variant === "security_cooldown" && remainingTime > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <RefreshCw size={10} className="animate-spin" />
                Wait {formatCountdown(remainingTime)}
              </span>
            )}
          </div>

          <p className={`mt-1 text-xs leading-relaxed ${config.textColor}`}>
            {message}
          </p>

          {actionText && onAction && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onAction}
                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer ${config.buttonBg}`}
              >
                {actionText}
              </button>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className="shrink-0 p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
export default LoginAlertBanner;
