"use client";

import Link from "next/link";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Logo } from "@/components/shared/logo";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/utils/labels";
import type { User } from "@/types/api";
import { NavLinks } from "./nav-links";
import { useSignOut } from "./user-menu";

export function SidebarContent({
  user,
  collapsed,
  onNavigate,
  onToggle,
}: {
  user?: User;
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
}) {
  const { signOut, pending } = useSignOut();

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className={cn("flex h-10 items-center", collapsed ? "justify-center" : "justify-between px-1")}>
        <Link href="/overview" aria-label="WorkHub home" onClick={onNavigate} className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Logo collapsed={collapsed} />
        </Link>
        {onToggle && !collapsed && (
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Collapse sidebar" onClick={onToggle} />}>
              <PanelLeftClose aria-hidden />
            </TooltipTrigger>
            <TooltipContent>Collapse sidebar</TooltipContent>
          </Tooltip>
        )}
      </div>

      <NavLinks collapsed={collapsed} onNavigate={onNavigate} />

      <div className="mt-auto flex flex-col gap-2">
        {onToggle && collapsed && (
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" className="mx-auto" aria-label="Expand sidebar" onClick={onToggle} />}>
              <PanelLeftOpen aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        )}
        {user && (
          <div className={cn("flex items-center gap-2.5 rounded-lg border bg-card p-2", collapsed && "justify-center border-0 bg-transparent p-0")}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <UserAvatar name={user.name} seed={user.id} />
                </TooltipTrigger>
                <TooltipContent side="right">{user.name}</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <UserAvatar name={user.name} seed={user.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
                </div>
              </>
            )}
          </div>
        )}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" className="mx-auto" aria-label="Sign out" disabled={pending} onClick={signOut} />}>
              <LogOut aria-hidden />
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        ) : (
          <Button variant="ghost" className="justify-start text-muted-foreground" disabled={pending} onClick={signOut}>
            <LogOut aria-hidden /> Sign out
          </Button>
        )}
      </div>
    </div>
  );
}
