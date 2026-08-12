import { useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";

const POLL_INTERVAL_MS = 15000;

export function useServerStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        await apiClient.get("/health");
        if (!cancelled) setIsOnline(true);
      } catch {
        if (!cancelled) setIsOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}
