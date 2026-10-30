"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { usePeople } from "@/features/members/hooks";
import type { ProjectStats } from "@/types/api";

function Segment({ value, total, className, label }: { value: number; total: number; className: string; label: string }) {
  if (!value) return null;
  return <div className={className} style={{ width: `${(value / total) * 100}%` }} title={`${label}: ${value}`} />;
}

export function ProjectOverview({ projectId, stats }: { projectId: string; stats: UseQueryResult<ProjectStats> }) {
  const { resolve } = usePeople(projectId);

  if (stats.isPending) return <Skeleton className="h-56 rounded-xl" />;
  if (stats.isError) return <ErrorState title="Statistics unavailable" error={stats.error} onRetry={() => void stats.refetch()} />;

  const { summary, tasksByAssignee, unassigned } = stats.data;
  const pct = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-5" aria-labelledby="progress-h">
        <h3 id="progress-h" className="text-sm font-semibold">
          Progress
        </h3>
        <p className="mt-3 text-3xl font-semibold tabular-nums">{pct}%</p>
        <p className="text-sm text-muted-foreground">
          {summary.completed} of {summary.total} tasks completed
        </p>
        <div
          role="img"
          aria-label={`${summary.todo} to do, ${summary.inProgress} in progress, ${summary.completed} done`}
          className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <Segment value={summary.completed} total={summary.total} className="bg-status-done" label="Done" />
          <Segment value={summary.inProgress} total={summary.total} className="bg-status-progress" label="In progress" />
          <Segment value={summary.todo} total={summary.total} className="bg-status-todo/60" label="To do" />
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-status-done" />Done {summary.completed}</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-status-progress" />In progress {summary.inProgress}</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-status-todo/60" />To do {summary.todo}</li>
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-5" aria-labelledby="workload-h">
        <h3 id="workload-h" className="text-sm font-semibold">
          Workload by assignee
        </h3>
        {tasksByAssignee.length === 0 && unassigned.total === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No tasks have been assigned yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {tasksByAssignee.map((a) => {
              const name = a.assigneeName ?? resolve(a.assigneeId)?.name ?? "Unknown user";
              return (
                <li key={a.assigneeId} className="flex items-center gap-3">
                  <UserAvatar name={name} seed={a.assigneeId} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {a.completed}/{a.total} done · {a.inProgress} in progress
                  </span>
                </li>
              );
            })}
            {unassigned.total > 0 && (
              <li className="flex items-center gap-3 border-t pt-3">
                <span className="inline-flex size-6 items-center justify-center rounded-full border border-dashed text-[10px] text-muted-foreground">—</span>
                <span className="flex-1 text-sm">Unassigned</span>
                <span className="text-xs text-muted-foreground tabular-nums">{unassigned.total} tasks</span>
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
