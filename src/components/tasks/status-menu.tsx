"use client";

import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/utils/labels";
import type { TaskStatus } from "@/types/api";

/** Status badge that doubles as a quick-change menu when the user may edit. */
export function StatusMenu({
  status,
  onChange,
  disabled,
  className,
}: {
  status: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (disabled) return <StatusBadge status={status} className={className} />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Status: ${STATUS_LABEL[status]}. Change status`}
        className={cn(
          "group inline-flex items-center gap-0.5 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        <StatusBadge status={status} className="cursor-pointer group-hover:brightness-95" />
        <ChevronDown aria-hidden className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-40">
        <DropdownMenuRadioGroup value={status} onValueChange={(v) => v !== status && onChange(v as TaskStatus)}>
          {STATUS_ORDER.map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
