import { CheckCircle2, Circle, CircleDashed, ChevronsUp, Equal, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/utils/labels";
import type { ProjectStatus, TaskPriority, TaskStatus } from "@/types/api";

const STATUS_STYLE: Record<TaskStatus, string> = {
  TODO: "text-status-todo bg-status-todo/10",
  IN_PROGRESS: "text-status-progress bg-status-progress/10",
  DONE: "text-status-done bg-status-done/10",
};
const STATUS_ICON = { TODO: CircleDashed, IN_PROGRESS: Circle, DONE: CheckCircle2 } as const;

/** Colour is never the only signal: every status has an icon and a text label. */
export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const Icon = STATUS_ICON[status];
  return (
    <Badge variant="secondary" className={cn("gap-1 border-0 font-medium", STATUS_STYLE[status], className)}>
      <Icon aria-hidden className="size-3" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: "text-priority-low bg-priority-low/10",
  MEDIUM: "text-priority-medium bg-priority-medium/10",
  HIGH: "text-priority-high bg-priority-high/10",
};
const PRIORITY_ICON = { LOW: ChevronDown, MEDIUM: Equal, HIGH: ChevronsUp } as const;

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const Icon = PRIORITY_ICON[priority];
  return (
    <Badge variant="secondary" className={cn("gap-1 border-0 font-medium", PRIORITY_STYLE[priority], className)}>
      <Icon aria-hidden className="size-3" />
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-0 font-medium capitalize",
        status === "active" ? "bg-status-done/10 text-status-done" : "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </Badge>
  );
}
