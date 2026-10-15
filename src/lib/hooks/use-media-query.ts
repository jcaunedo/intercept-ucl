import * as React from "react";

/**
 * Tracks whether a CSS media query currently matches, via `useSyncExternalStore` so it stays correct across SSR
 * (the server snapshot is always `false`, so nothing touches `window`/`matchMedia` on the server) and concurrent
 * rendering. Re-subscribes if `query` changes. Build `query` with `mediaAbove` from `@/lib/breakpoints`.
 */
function useMediaQuery(query: string): boolean {
  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query]);

  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onStoreChange);
      return () => mediaQueryList.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export { useMediaQuery };
