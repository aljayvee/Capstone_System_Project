import React from "react";

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : (error as any)?.message || "";
  const name = error instanceof Error ? error.name : (error as any)?.name || "";
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("Unable to preload CSS") ||
    name === "ChunkLoadError"
  );
}

const CHUNK_RETRY_KEY = "sugo_chunk_reload_done";

export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const alreadyReloaded = sessionStorage.getItem(CHUNK_RETRY_KEY);

    try {
      const module = await factory();
      sessionStorage.removeItem(CHUNK_RETRY_KEY);
      return module;
    } catch (error: any) {
      if (isChunkLoadError(error) && !alreadyReloaded) {
        sessionStorage.setItem(CHUNK_RETRY_KEY, "true");
        window.location.reload();
        // Return a promise that never resolves so React doesn't render an error screen while page reloads
        return new Promise<{ default: T }>(() => {});
      }

      sessionStorage.removeItem(CHUNK_RETRY_KEY);
      throw error;
    }
  });
}
