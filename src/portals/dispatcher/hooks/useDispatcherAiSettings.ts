import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sugo_dispatcher_ai_suggestions";
const CHANGE_EVENT = "sugo-ai-settings-change";

/**
 * Returns whether AI suggestions are enabled for Conflict Management.
 * Defaults to true if no preference is stored.
 */
export function getAiSuggestionsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(STORAGE_KEY);
  return val === null ? true : val === "true";
}

/**
 * Persists the AI suggestions preference and notifies all listeners.
 */
export function setAiSuggestionsEnabledStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { enabled } }));
}

/**
 * Hook to read and toggle the Dispatcher Conflict Management AI assistance setting.
 */
export function useDispatcherAiSettings() {
  const [aiSuggestionsEnabled, setEnabledState] = useState<boolean>(getAiSuggestionsEnabled);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ enabled?: boolean }>;
      if (custom.detail && typeof custom.detail.enabled === "boolean") {
        setEnabledState(custom.detail.enabled);
      } else {
        setEnabledState(getAiSuggestionsEnabled());
      }
    };

    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setAiSuggestionsEnabled = useCallback((enabled: boolean) => {
    setEnabledState(enabled);
    setAiSuggestionsEnabledStorage(enabled);
  }, []);

  return {
    aiSuggestionsEnabled,
    setAiSuggestionsEnabled,
  };
}
