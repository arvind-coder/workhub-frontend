"use client";

import { useState } from "react";
import { ClipboardList, KanbanSquare, List, Plus, SearchX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { usePeople } from "@/features/members/hooks";
import { useProjectAccess } from "@/features/projects/access";
import { useDeleteTask, useTasks, useTaskStatusChange } from "@/features/tasks/hooks";
import { useUrlState } from "@/hooks/use-url-state";
import { getErrorMessage } from "@/lib/api/errors";
import type { Task } from "@/types/api";
import { KanbanBoard } from "./kanban-board";
import { TaskFilterBar, useTaskFilters } from "./task-filters";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskList, type TaskActions } from "./task-list";
import { TaskSheet } from "./task-sheet";

const PAGE_SIZE = 15;
const BOARD_LIMIT = 100;

export function ProjectTasks({ projectId }: { projectId: string }) {
  const { searchParams, set } = useUrlState();
  const view = searchParams.get("view") === "board" ? "board" : "list";
  const openTaskId = searchParams.get("task");

  const access = useProjectAccess(projectId);
  const { people, resolve } = usePeople(projectId);
  const filters = useTaskFilters(view === "board" ? BOARD_LIMIT : PAGE_SIZE);
  const params = view === "board" ? { ...filters.params, page: 1 } : filters.params;
  const query = useTasks(projectId, params);
  const status = useTaskStatusChange();
  const del = useDeleteTask(projectId);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const archived = access.project.data?.status === "archived";
  const hasFilters = Boolean(filters.q.urlValue || filters.status || filters.priority || filters.assignee || filters.overdue);

  const actions: TaskActions = {
    onOpen: (t) => set({ task: t.id }),
    onEdit: setEditing,
    onDelete: setDeleting,
    onStatusChange: (t, s) => void status.change(t, s),
    scopeFor: access.scopeFor,
    canDelete: () => access.isManager,
    resolveAssignee: (t) => resolve(t.assignedTo),
    pendingIds: status.pendingIds,
  };

  const items = query.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Task view">
          <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" aria-pressed={view === "list"} onClick={() => set({ view: "" })}>
            <List aria-hidden /> List
          </Button>
          <Button variant={view === "board" ? "secondary" : "ghost"} size="sm" aria-pressed={view === "board"} onClick={() => set({ view: "board", page: "" })}>
            <KanbanSquare aria-hidden /> Board
          </Button>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden /> New task
        </Button>
      </div>

      {archived && (
        <p role="status" className="rounded-lg border bg-muted/60 p-3 text-sm text-muted-foreground">
          This project is archived. You can still review and update its tasks.
        </p>
      )}

      <TaskFilterBar filters={filters} people={people} />

      {query.isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState title="We couldn't load tasks" error={query.error} onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="No tasks match these filters"
            description="Adjust or reset the filters to see more tasks."
            action={<Button variant="outline" onClick={filters.reset}>Reset filters</Button>}
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No tasks yet"
            description="Break the project into tasks, assign owners and set due dates."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus aria-hidden /> Create the first task
              </Button>
            }
          />
        )
      ) : view === "board" ? (
        <>
          <KanbanBoard tasks={items} actions={actions} />
          {query.data.pagination.total > BOARD_LIMIT && (
            <p className="text-xs text-muted-foreground">
              Showing the first {BOARD_LIMIT} of {query.data.pagination.total} tasks. Use filters to narrow the board.
            </p>
          )}
        </>
      ) : (
        <>
          <TaskList tasks={items} actions={actions} busy={query.isFetching} />
          <PaginationControls
            pagination={query.data.pagination}
            noun="tasks"
            disabled={query.isFetching}
            onPageChange={(p) => set({ page: p === 1 ? "" : p })}
          />
        </>
      )}

      <TaskFormDialog open={creating} onOpenChange={setCreating} projectId={projectId} ownerId={access.project.data?.ownerId} />
      {editing && (
        <TaskFormDialog open onOpenChange={(o) => !o && setEditing(null)} projectId={projectId} ownerId={access.project.data?.ownerId} task={editing} />
      )}
      {openTaskId && <TaskSheet projectId={projectId} taskId={openTaskId} onClose={() => set({ task: "" })} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this task?"
        description={<>“{deleting?.title}” and its comments will be permanently removed. This can&apos;t be undone.</>}
        confirmLabel="Delete task"
        pending={del.isPending}
        onConfirm={() =>
          deleting &&
          del.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Task deleted");
              setDeleting(null);
            },
            onError: (e) => {
              toast.error(getErrorMessage(e, "The task couldn't be deleted"));
              setDeleting(null);
            },
          })
        }
      />
    </div>
  );
}
