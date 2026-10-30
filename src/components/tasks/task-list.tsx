"use client";

import { CalendarDays, MoreHorizontal, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PriorityBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Person } from "@/features/members/hooks";
import { cn } from "@/lib/utils";
import { formatDue, isOverdue } from "@/lib/utils/dates";
import type { Task, TaskStatus } from "@/types/api";
import { StatusMenu } from "./status-menu";

export type EditScope = "full" | "status" | "none";

export interface TaskActions {
  onOpen: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  scopeFor: (task: Task) => EditScope;
  canDelete: (task: Task) => boolean;
  resolveAssignee: (task: Task) => Person | undefined;
  /** Task ids with a status change in flight. */
  pendingIds?: ReadonlySet<string>;
}

export function DueLabel({ task }: { task: Task }) {
  const label = formatDue(task.dueDate);
  if (!label) return null;
  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", overdue ? "font-medium text-priority-high" : "text-muted-foreground")}>
      <CalendarDays aria-hidden className="size-3.5" />
      <span className="sr-only">{overdue ? "Overdue, due" : "Due"}</span>
      {label}
      {overdue && <span aria-hidden>· Overdue</span>}
    </span>
  );
}

export function AssigneeAvatar({ task, person }: { task: Task; person?: Person }) {
  if (!task.assignedTo) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex size-6 items-center justify-center rounded-full border border-dashed text-[10px] text-muted-foreground" aria-label="Unassigned" />}>
          —
        </TooltipTrigger>
        <TooltipContent>Unassigned</TooltipContent>
      </Tooltip>
    );
  }
  const name = person?.name;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <UserAvatar name={name ?? "?"} seed={task.assignedTo} size="sm" />
      </TooltipTrigger>
      <TooltipContent>{name ?? "Assignee (name unavailable)"}</TooltipContent>
    </Tooltip>
  );
}

export function TaskRowMenu({ task, actions }: { task: Task; actions: TaskActions }) {
  const scope = actions.scopeFor(task);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${task.title}`} />}>
        <MoreHorizontal aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        <DropdownMenuItem onClick={() => actions.onOpen(task)}>
          <ExternalLink aria-hidden /> Open details
        </DropdownMenuItem>
        {scope === "full" && (
          <DropdownMenuItem onClick={() => actions.onEdit(task)}>
            <Pencil aria-hidden /> Edit task
          </DropdownMenuItem>
        )}
        {actions.canDelete(task) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => actions.onDelete(task)}>
              <Trash2 aria-hidden /> Delete task
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TaskList({
  tasks,
  actions,
  projectLabel,
  busy,
}: {
  tasks: Task[];
  actions: TaskActions;
  projectLabel?: (task: Task) => string | undefined;
  busy?: boolean;
}) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card" aria-busy={busy} aria-label="Tasks">
      {tasks.map((task) => {
        const scope = actions.scopeFor(task);
        const pending = actions.pendingIds?.has(task.id);
        const project = projectLabel?.(task);
        return (
          <li key={task.id} className={cn("group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-muted/40", pending && "opacity-70")}>
            <div className="min-w-0 flex-1 basis-56">
              <button
                type="button"
                onClick={() => actions.onOpen(task)}
                className="block max-w-full truncate rounded text-left text-sm font-medium outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {task.title}
              </button>
              <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                {project && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-medium">{project}</span>}
                <span className="truncate">{task.description}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <StatusMenu
                status={task.status}
                disabled={scope === "none" || pending}
                onChange={(s) => actions.onStatusChange(task, s)}
              />
              <PriorityBadge priority={task.priority} />
              <DueLabel task={task} />
              <AssigneeAvatar task={task} person={actions.resolveAssignee(task)} />
              <TaskRowMenu task={task} actions={actions} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
