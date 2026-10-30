"use client";

import { useState } from "react";
import { CheckSquare, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { useCurrentUser } from "@/features/auth/hooks";
import { PROJECT_LIST_PARAMS } from "@/features/dashboard/hooks";
import { useProjects } from "@/features/projects/hooks";
import { useMyTasks, useTaskStatusChange } from "@/features/tasks/hooks";
import { useUrlState } from "@/hooks/use-url-state";
import type { Task, TaskListParams } from "@/types/api";
import { TaskFilterBar, useTaskFilters } from "./task-filters";
import { TaskList, type TaskActions } from "./task-list";
import { TaskSheet } from "./task-sheet";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** No cross-project task endpoint exists, so My Tasks queries each project. */
const PROJECT_CAP = 25;
const PAGE_STEP = 25;

function compare(a: Task, b: Task, sortBy: string | undefined, order: string | undefined) {
  const dir = order === "asc" ? 1 : -1;
  const key = (sortBy ?? "createdAt") as "createdAt" | "updatedAt" | "title";
  return a[key].localeCompare(b[key]) * dir;
}

export function MyTasks() {
  const { data: me } = useCurrentUser();
  const { searchParams, set } = useUrlState();
  const projects = useProjects(PROJECT_LIST_PARAMS);
  const covered = (projects.data?.items ?? []).slice(0, PROJECT_CAP);
  const filters = useTaskFilters(100);
  // Filters are applied by the API per project; paging happens after merging.
  const serverParams: TaskListParams = { ...filters.params, page: undefined, limit: undefined };
  const query = useMyTasks(me?.id, projects.isSuccess ? covered : undefined, serverParams);
  const status = useTaskStatusChange();
  const [visible, setVisible] = useState(PAGE_STEP);

  const projectName = new Map(covered.map((p) => [p.id, p.name]));
  const openId = searchParams.get("task");
  const openProject = searchParams.get("project");

  const tasks = [...(query.data?.tasks ?? [])].sort((a, b) => compare(a, b, serverParams.sortBy, serverParams.sortOrder));
  const hasFilters = Boolean(filters.q.urlValue || filters.status || filters.priority || filters.overdue);

  const actions: TaskActions = {
    onOpen: (t) => set({ task: t.id, project: t.projectId }),
    onEdit: (t) => set({ task: t.id, project: t.projectId }),
    onDelete: (t) => set({ task: t.id, project: t.projectId }),
    onStatusChange: (t, s) => void status.change(t, s),
    // Every task here is assigned to the viewer, so they may always change status.
    scopeFor: () => "status",
    canDelete: () => false,
    resolveAssignee: () => (me ? { id: me.id, name: me.name } : undefined),
    pendingIds: status.pendingIds,
  };

  const loading = projects.isPending || (projects.isSuccess && query.isPending);
  const error = projects.error ?? query.error;

  return (
    <div className="space-y-6">
      <PageHeader title="My Tasks" description="Everything assigned to you across your projects." />

      <TaskFilterBar filters={filters} people={new Map()} showAssignee={false} />

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="We couldn't load your tasks" error={error} onRetry={() => { void projects.refetch(); void query.refetch(); }} />
      ) : (
        <>
          {(query.data?.failedProjects.length ?? 0) > 0 && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              Tasks from {query.data?.failedProjects.length} project{query.data?.failedProjects.length === 1 ? "" : "s"} couldn&apos;t be loaded.{" "}
              <button className="font-medium underline" onClick={() => void query.refetch()}>
                Retry
              </button>
            </p>
          )}
          {projects.data && projects.data.pagination.total > PROJECT_CAP && (
            <p className="text-xs text-muted-foreground" role="note">
              Showing tasks from your {PROJECT_CAP} most recently updated projects.
            </p>
          )}
          {tasks.length === 0 ? (
            hasFilters ? (
              <EmptyState icon={SearchX} title="No tasks match these filters" description="Adjust or reset the filters to see more." action={<Button variant="outline" onClick={filters.reset}>Reset filters</Button>} />
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="You're all caught up"
                description="Tasks assigned to you will show up here. Browse your projects to find something to pick up."
                action={<Link href="/projects" className={buttonVariants()}>Browse projects</Link>}
              />
            )
          ) : (
            <>
              <TaskList tasks={tasks.slice(0, visible)} actions={actions} projectLabel={(t) => projectName.get(t.projectId)} busy={query.isFetching} />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span aria-live="polite">
                  Showing {Math.min(visible, tasks.length)} of {tasks.length} tasks
                </span>
                {visible < tasks.length && (
                  <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE_STEP)}>
                    Show more
                  </Button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {openId && openProject && <TaskSheet projectId={openProject} taskId={openId} onClose={() => set({ task: "", project: "" })} />}
    </div>
  );
}
