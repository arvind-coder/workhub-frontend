"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function read(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Boolean preference persisted in localStorage; SSR-safe (server snapshot is false). */
export function useLocalFlag(key: string): [boolean, (value: boolean) => void] {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    window.addEventListener("storage", cb);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", cb);
    };
  }, []);

  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false,
  );

  const set = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Preference simply isn't remembered when storage is unavailable.
      }
      listeners.forEach((l) => l());
    },
    [key],
  );

  return [value, set];
}
