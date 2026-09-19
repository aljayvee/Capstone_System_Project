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
  const countdownIntervalRef = useRef<any>(null);
  const checkIntervalRef = useRef<any>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsWarning(false);
    setIsExpired(false);
    setRemainingSeconds(Math.round(warningDurationMs / 1000));
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [warningDurationMs]);

  // Activity listeners
  useEffect(() => {
    if (!enabled) return;

    const handleUserActivity = () => {
      // Only reset if not already in the countdown warning modal
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

  // Periodic check for idle threshold
  useEffect(() => {
    if (!enabled) return;

    checkIntervalRef.current = setInterval(() => {
      if (isWarning || isExpired) return;

      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= idleTimeoutMs) {
        setIsWarning(true);
        const warningStart = Date.now();

        countdownIntervalRef.current = setInterval(() => {
          const elapsedInWarning = Date.now() - warningStart;
          const timeLeft = Math.max(0, Math.ceil((warningDurationMs - elapsedInWarning) / 1000));
          setRemainingSeconds(timeLeft);

          if (timeLeft <= 0) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
            setIsWarning(false);
            setIsExpired(true);
            if (onExpired) {
              onExpired();
            }
          }
        }, 1000);
      }
    }, 5000);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [enabled, idleTimeoutMs, warningDurationMs, isWarning, isExpired, onExpired]);

  return {
    isWarning,
    remainingSeconds,
    isExpired,
    resetTimer,
  };
}
