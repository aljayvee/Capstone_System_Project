import { useEffect, useSyncExternalStore } from "react";
import { apiService } from "../../../services/apiService";

/**
 * Whether the Help Desk shows the AI reason suggestions: the "Generate
 * suggestion" button, the Tab shortcut and the AI notes beside them.
 *
 * A sysadmin decides this for every dispatcher at once, in the SysAdmin
 * portal's Service Controls. It used to be a switch in each dispatcher's own
 * profile, kept in that browser's localStorage, which no sysadmin could reach.
 *
 * The value lives in this module rather than in each hook, so one request
 * serves every open reason box instead of one request per row.
 *
 * Off until the server says otherwise, and off when it cannot be read: a failed
 * read must not show a button the server would refuse.
 */
const STALE_AFTER_MS = 60_000;

let enabled = false;
let lastReadAt = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function refresh(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = apiService
    .getDispatcherAiSuggestionsEnabled()
    .then((value) => {
      lastReadAt = Date.now();
      const next = value === true;
      if (next !== enabled) {
        enabled = next;
        listeners.forEach((notify) => notify());
      }
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function refreshIfStale() {
  if (Date.now() - lastReadAt > STALE_AFTER_MS) void refresh();
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

/**
 * Hook to read the sysadmin's Help Desk AI suggestions setting. Re-reads it
 * when a reason box opens or the window regains focus, at most once a minute.
 */
export function useDispatcherAiSettings() {
  const aiSuggestionsEnabled = useSyncExternalStore(
    subscribe,
    () => enabled,
    () => false
  );

  useEffect(() => {
    refreshIfStale();
    window.addEventListener("focus", refreshIfStale);
    return () => window.removeEventListener("focus", refreshIfStale);
  }, []);

  return { aiSuggestionsEnabled };
}
