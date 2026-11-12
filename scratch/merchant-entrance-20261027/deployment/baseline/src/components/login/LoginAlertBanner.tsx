import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ShieldAlert, Smartphone, Info, Clock, X } from "lucide-react";

export type AlertVariant = "error" | "security_cooldown" | "role_notice" | "info" | "success";

export interface LoginAlertBannerProps {
  variant: AlertVariant;
  title: string;
  message: string;
  // security_cooldown only: when the pause ends, as a Date.now() timestamp.
  // The countdown is read off the clock on every tick rather than decremented,
  // so a tab the browser throttled in the background is still right when it
  // comes back.
  cooldownEndsAt?: number;
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
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function secondsUntil(endsAt: number): number {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

export const LoginAlertBanner: React.FC<LoginAlertBannerProps> = ({
  variant,
  title,
  message,
  cooldownEndsAt,
  onCooldownExpire,
  actionText,
  onAction,
  onDismiss,
  autoDismissMs,
  className = "",
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(() =>
    cooldownEndsAt ? secondsUntil(cooldownEndsAt) : 0
  );
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const onCooldownExpireRef = React.useRef(onCooldownExpire);
  onCooldownExpireRef.current = onCooldownExpire;

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

  // Security cooldown ticker (for 429 rate limits). Expiry is reported once.
  useEffect(() => {
    if (variant !== "security_cooldown" || !cooldownEndsAt) {
      setRemainingTime(0);
      return;
    }

    let expired = false;
    const tick = () => {
      if (expired) return;
      const left = secondsUntil(cooldownEndsAt);
      setRemainingTime(left);
      if (left <= 0) {
        expired = true;
        clearInterval(timer);
        onCooldownExpireRef.current?.();
      }
    };
    const timer = setInterval(tick, 1000);
    tick();
    // A tab brought back to the front catches up at once, not on the next tick.
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [variant, cooldownEndsAt]);

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
      // amber-700, not 600: white 12px text on amber-600 is only about 3.2:1.
      buttonBg: "bg-amber-700 hover:bg-amber-800 text-white",
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
    success: {
      container: "bg-emerald-500/10 border-emerald-500/30 text-emerald-100",
      titleColor: "text-emerald-200",
      textColor: "text-emerald-200/90",
      icon: CheckCircle2,
      iconColor: "text-emerald-400",
      buttonBg: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
  }[variant];

  const IconComponent = config.icon;

  return (
    <div
      role="alert"
      className={`relative w-full p-4 rounded-xl border transition-opacity duration-150 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
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

            {/* Hidden from screen readers: inside role="alert", a value that
                changes every second would be read out every second. The
                message states the end time once instead. */}
            {variant === "security_cooldown" && remainingTime > 0 && (
              <span
                aria-hidden="true"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold tabular-nums bg-amber-500/20 text-amber-300 border border-amber-500/30"
              >
                <Clock size={11} />
                {formatCountdown(remainingTime)} left
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
                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${config.buttonBg}`}
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
