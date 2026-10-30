"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Read/write query-string state. Writes use `replace` so filter tweaks do not
 * flood the history stack. Setting a value to "" / undefined removes the param.
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = useCallback(
    (updates: Record<string, string | number | undefined | null>, opts: { resetPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      if (opts.resetPage) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { searchParams, set };
}

export function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

/**
 * Search box bound to a URL param. Typing updates the input instantly; the URL
 * (and therefore the server query) updates after a short pause.
 */
export function useSearchParam(name = "q", delay = 350) {
  const { searchParams, set } = useUrlState();
  const urlValue = (searchParams.get(name) ?? "").trim();
  const [value, setValue] = useState(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onChange = (next: string) => {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => set({ [name]: next.trim() }, { resetPage: true }), delay);
  };

  const clear = () => {
    clearTimeout(timer.current);
    setValue("");
    set({ [name]: "" }, { resetPage: true });
  };

  return { value, urlValue, onChange, clear };
}
