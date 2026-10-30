import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Everything under (app) is per-user and fetched client-side behind auth, so
 * there is no meaningful static shell to validate for instant navigation.
 */
export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
