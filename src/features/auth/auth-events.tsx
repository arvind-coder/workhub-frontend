"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { setUnauthorizedHandler } from "@/lib/api/client";

const PUBLIC_PATHS = ["/login", "/register"];

/**
 * Single place that reacts to an expired/revoked session (401 from the proxy).
 * The proxy has already cleared the cookies, so redirecting to /login cannot
 * bounce back into the app.
 */
export function AuthEvents() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const handling = useRef(false);
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
    handling.current = false;
  }, [pathname]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      const current = pathRef.current;
      if (handling.current || PUBLIC_PATHS.includes(current)) return;
      handling.current = true;
      queryClient.clear();
      const next = `${current}${window.location.search}`;
      router.replace(`/login?expired=1&next=${encodeURIComponent(next)}`);
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient, router]);

  return null;
}
