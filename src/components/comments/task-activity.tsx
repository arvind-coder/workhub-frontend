"use client";

import { ArrowRightLeft, History, Loader2, Pencil, PlusCircle, Trash2, UserRoundCog, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { useTaskActivity } from "@/features/comments/hooks";
import type { Person } from "@/features/members/hooks";
import { formatDateTime, formatRelative } from "@/lib/utils/dates";
import type { TaskActivityAction } from "@/types/api";

const ICONS: Record<TaskActivityAction, LucideIcon> = {
  TASK_CREATED: PlusCircle,
  TASK_UPDATED: Pencil,
  STATUS_CHANGED: ArrowRightLeft,
  ASSIGNEE_CHANGED: UserRoundCog,
  TASK_DELETED: Trash2,
};

export function TaskActivity({
  projectId,
  taskId,
  resolve,
}: {
  projectId: string;
  taskId: string;
  resolve: (id?: string | null) => Person | undefined;
}) {
  const activity = useTaskActivity(projectId, taskId);

  if (activity.isPending) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }
  if (activity.isError) {
    return <ErrorState title="Activity unavailable" error={activity.error} onRetry={() => void activity.refetch()} className="py-8" />;
  }

  const entries = activity.data.pages.flatMap((p) => p.activities);
  if (entries.length === 0) {
    return <EmptyState icon={History} title="No activity recorded" description="Changes to this task will appear here." className="py-8" />;
  }

  return (
    <div>
      <ol className="relative space-y-5 border-l pl-6">
        {entries.map((entry) => {
          const Icon = ICONS[entry.action] ?? History;
          const actor = resolve(entry.userId);
          return (
            <li key={entry.id} className="relative">
              <span className="absolute top-0.5 -left-[34px] flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground">
                <Icon aria-hidden className="size-3" />
              </span>
              <p className="text-sm">{entry.message}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {actor?.name ?? "A teammate"} ·{" "}
                <time dateTime={entry.createdAt} title={formatDateTime(entry.createdAt)}>
                  {formatRelative(entry.createdAt)}
                </time>
              </p>
            </li>
          );
        })}
      </ol>
      {activity.hasNextPage && (
        <Button variant="outline" size="sm" className="mt-5" disabled={activity.isFetchingNextPage} onClick={() => void activity.fetchNextPage()}>
          {activity.isFetchingNextPage && <Loader2 aria-hidden className="animate-spin" />}
          Load older activity
        </Button>
      )}
    </div>
  );
}
