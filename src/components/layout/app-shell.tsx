"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/states";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useCurrentUser } from "@/features/auth/hooks";
import { useLocalFlag } from "@/hooks/use-local-flag";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "./breadcrumbs";
import { SidebarContent } from "./sidebar";
import { UserMenu } from "./user-menu";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useLocalFlag("workhub:sidebar-collapsed");
  const [mobileOpen, setMobileOpen] = useState(false);
  const me = useCurrentUser();

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r bg-sidebar transition-[width] duration-200 md:block",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <SidebarContent user={me.data} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-64 gap-0 bg-sidebar p-0 sm:max-w-64">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation for WorkHub</SheetDescription>
          <SidebarContent user={me.data} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
            <Menu aria-hidden />
          </Button>
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
          </div>
          <ThemeToggle />
          {me.data && <UserMenu user={me.data} />}
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none sm:px-6 lg:py-8">
          {me.isPending ? (
            <ShellSkeleton />
          ) : me.isError ? (
            <ErrorState title="We couldn't load your account" error={me.error} onRetry={() => void me.refetch()} />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
