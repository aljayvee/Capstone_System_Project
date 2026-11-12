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

/** A lazy screen that can also be fetched ahead of its first render. */
export type PreloadableLazy<T extends React.ComponentType<any>> = React.LazyExoticComponent<T> & {
  /** Downloads the screen's code now. Never throws; the real render still retries. */
  preload: () => Promise<void>;
};

export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): PreloadableLazy<T> {
  const component = React.lazy(async () => {
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
  }) as PreloadableLazy<T>;
  // The same import() the render uses: once it has resolved, the browser holds
  // the module and the first render of the screen has nothing left to fetch.
  component.preload = () =>
    factory().then(
      () => undefined,
      () => undefined
    );
  return component;
}

/**
 * Fetches screens the user has not opened yet, once the page is idle, one at
 * a time so they never compete with the data the open screen is loading.
 *
 * Why (2026-10-25): the portals load each screen on first open. That made the
 * first page faster, but every first tab switch and the first order opened
 * waited 0.3 to 0.55 s for its code from the CDN, and again after every deploy
 * (new file names). Preloading in the background keeps the small first load
 * and makes those switches instant again. Returns a cancel function.
 */
export function preloadWhenIdle(screens: Array<{ preload: () => Promise<void> }>, delayMs = 1500): () => void {
  let cancelled = false;
  const run = async () => {
    for (const screen of screens) {
      if (cancelled) return;
      await screen.preload();
    }
  };
  const idle = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  const timer = window.setTimeout(() => {
    if (cancelled) return;
    if (idle) idle(() => void run(), { timeout: 3000 });
    else void run();
  }, delayMs);
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}
