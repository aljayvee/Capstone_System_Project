import { useState, useEffect, useRef, useCallback } from "react";

interface UseIdleTimerOptions {
  idleTimeoutMs?: number; // Time before warning starts (default: 28 mins)
  warningDurationMs?: number; // Countdown duration (default: 2 mins)
  onExpired?: () => void;
  enabled?: boolean;
}

export function useIdleTimer({
  idleTimeoutMs = 28 * 60 * 1000,
  warningDurationMs = 2 * 60 * 1000,
  onExpired,
  enabled = true,
}: UseIdleTimerOptions = {}) {
  const [isWarning, setIsWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.round(warningDurationMs / 1000));
  const [isExpired, setIsExpired] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const warningStartRef = useRef<number | null>(null);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningStartRef.current = null;
    setIsWarning(false);
    setIsExpired(false);
    setRemainingSeconds(Math.round(warningDurationMs / 1000));
  }, [warningDurationMs]);

  // When disabled (e.g. user logged out or session ended), immediately reset all states
  useEffect(() => {
    if (!enabled) {
      lastActivityRef.current = Date.now();
      warningStartRef.current = null;
      setIsWarning(false);
      setIsExpired(false);
      setRemainingSeconds(Math.round(warningDurationMs / 1000));
    }
  }, [enabled, warningDurationMs]);

  // Activity listeners to record interactions
  useEffect(() => {
    if (!enabled) return;

    const handleUserActivity = () => {
      // Only refresh activity timestamp if not currently displaying the warning or already expired
      if (!isWarning && !isExpired) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [enabled, isWarning, isExpired]);

  // Inactivity detection interval: periodically checks if user crossed the idle timeout threshold
  useEffect(() => {
    if (!enabled || isWarning || isExpired) return;

    const checkInterval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= idleTimeoutMs) {
        warningStartRef.current = Date.now();
        setRemainingSeconds(Math.round(warningDurationMs / 1000));
        setIsWarning(true);
      }
    }, 1000);

    return () => {
      clearInterval(checkInterval);
    };
  }, [enabled, idleTimeoutMs, warningDurationMs, isWarning, isExpired]);

  // Active countdown timer: runs second-by-second while warning modal is visible
  useEffect(() => {
    if (!enabled || !isWarning || isExpired) return;

    if (!warningStartRef.current) {
      warningStartRef.current = Date.now();
    }

    const tick = () => {
      const start = warningStartRef.current || Date.now();
      const elapsed = Date.now() - start;
      const timeLeft = Math.max(0, Math.ceil((warningDurationMs - elapsed) / 1000));
      setRemainingSeconds(timeLeft);

      if (timeLeft <= 0) {
        setIsWarning(false);
        setIsExpired(true);
        if (onExpiredRef.current) {
          onExpiredRef.current();
        }
      }
    };

    tick();
    const countdownInterval = setInterval(tick, 500);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [enabled, isWarning, isExpired, warningDurationMs]);

  return {
    isWarning,
    remainingSeconds,
    isExpired,
    resetTimer,
  };
}
