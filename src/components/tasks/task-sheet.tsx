"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskActivity } from "@/components/comments/task-activity";
import { TaskComments } from "@/components/comments/task-comments";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SimpleSelect } from "@/components/shared/simple-select";
import { ErrorState } from "@/components/shared/states";
import { useCurrentUser } from "@/features/auth/hooks";
import { usePeople } from "@/features/members/hooks";
import { useProjectAccess } from "@/features/projects/access";
import { useDeleteTask, useTask, useUpdateTask } from "@/features/tasks/hooks";
import { getErrorMessage, isApiError } from "@/lib/api/errors";
import { dueInputToIso, dueIsoToInput, formatDateTime } from "@/lib/utils/dates";
import { PRIORITY_LABEL, PRIORITY_ORDER } from "@/lib/utils/labels";
import type { TaskUpdateInput } from "@/types/api";
import { buildAssigneeOptions, UNASSIGNED } from "./assignee-options";
import { StatusMenu } from "./status-menu";
import { TaskFormDialog } from "./task-form-dialog";

/** Side panel with task fields, comments and the activity timeline. */
export function TaskSheet({ projectId, taskId, onClose }: { projectId: string; taskId: string; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="sr-only">
          <SheetTitle>Task details</SheetTitle>
          <SheetDescription>View and edit the task, read its comments and activity.</SheetDescription>
        </SheetHeader>
        <SheetBody projectId={projectId} taskId={taskId} onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({ projectId, taskId, onClose }: { projectId: string; taskId: string; onClose: () => void }) {
  const task = useTask(projectId, taskId);
  const access = useProjectAccess(projectId);
  const { data: me } = useCurrentUser();
  const { people, resolve } = usePeople(projectId);
  const update = useUpdateTask(projectId, taskId);
  const del = useDeleteTask(projectId);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (task.isPending) {
    return (
      <div className="space-y-4 p-6" aria-busy="true">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (task.isError) {
    const message =
      isApiError(task.error) && task.error.isNotFound
        ? "This task no longer exists. It may have been deleted."
        : isApiError(task.error) && task.error.isForbidden
          ? "You don't have access to this task."
          : undefined;
    return (
      <div className="p-6">
        <ErrorState
          title="We couldn't open this task"
          error={message ? new Error(message) : task.error}
          onRetry={message ? onClose : () => void task.refetch()}
        />
      </div>
    );
  }

  const t = task.data;
  const scope = access.scopeFor(t);
  const patch = (input: TaskUpdateInput, success: string) =>
    update.mutate(input, {
      onSuccess: () => toast.success(success),
      onError: (e) => toast.error(getErrorMessage(e, "The change couldn't be saved")),
    });

  const assigneeOptions = buildAssigneeOptions(people, {
    meId: me?.id,
    ownerId: access.project.data?.ownerId,
    currentAssignee: t.assignedTo,
  });
  const full = scope === "full";

  return (
    <div className="flex flex-col">
      <div className="space-y-4 border-b p-6 pr-14">
        <h2 className="text-xl font-semibold leading-snug break-words">{t.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <StatusMenu
            status={t.status}
            disabled={scope === "none" || update.isPending}
            onChange={(status) => patch({ status }, "Status updated")}
          />
          {scope === "none" && <span className="text-xs text-muted-foreground">You can view this task but not edit it.</span>}
          <div className="ml-auto flex items-center gap-1">
            {full && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil aria-hidden /> Edit
              </Button>
            )}
            {access.isManager && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden /> Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <dl className="grid grid-cols-[110px_1fr] items-center gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Priority</dt>
          <dd className="min-w-0">
            <SimpleSelect
              label="Priority"
              size="sm"
              className="w-40"
              disabled={!full || update.isPending}
              value={t.priority}
              onValueChange={(priority) => patch({ priority }, "Priority updated")}
              options={[...PRIORITY_ORDER].reverse().map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
            />
          </dd>
          <dt className="text-muted-foreground">Assignee</dt>
          <dd className="min-w-0">
            <SimpleSelect
              label="Assignee"
              size="sm"
              className="w-full max-w-60"
              disabled={!full || update.isPending}
              value={t.assignedTo ?? UNASSIGNED}
              onValueChange={(v) => patch({ assignedTo: v === UNASSIGNED ? null : v }, "Assignee updated")}
              options={assigneeOptions}
            />
          </dd>
          <dt className="text-muted-foreground">Due date</dt>
          <dd>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Due date"
                className="h-7 w-40"
                disabled={!full || update.isPending}
                value={dueIsoToInput(t.dueDate)}
                onChange={(e) => {
                  if (e.target.value) patch({ dueDate: dueInputToIso(e.target.value) ?? null }, "Due date updated");
                }}
              />
              {full && t.dueDate && (
                <Button variant="ghost" size="xs" disabled={update.isPending} onClick={() => patch({ dueDate: null }, "Due date cleared")}>
                  Clear
                </Button>
              )}
            </div>
          </dd>
          <dt className="text-muted-foreground">Created by</dt>
          <dd>{resolve(t.createdBy)?.name ?? "Teammate"}</dd>
          <dt className="text-muted-foreground">Created</dt>
          <dd>{formatDateTime(t.createdAt)}</dd>
          <dt className="text-muted-foreground">Updated</dt>
          <dd>{formatDateTime(t.updatedAt)}</dd>
        </dl>

        <section aria-labelledby="task-desc-heading">
          <h3 id="task-desc-heading" className="mb-2 text-sm font-semibold">
            Description
          </h3>
          <p className="text-sm whitespace-pre-wrap break-words text-foreground/90">{t.description}</p>
        </section>

        <Tabs defaultValue="comments">
          <TabsList>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="comments" className="pt-4">
            <TaskComments projectId={projectId} taskId={taskId} resolve={resolve} />
          </TabsContent>
          <TabsContent value="activity" className="pt-4">
            <TaskActivity projectId={projectId} taskId={taskId} resolve={resolve} />
          </TabsContent>
        </Tabs>
      </div>

      {editing && <TaskFormDialog open onOpenChange={setEditing} projectId={projectId} ownerId={access.project.data?.ownerId} task={t} />}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this task?"
        description={
          <>
            “{t.title}” and its comments will be permanently removed. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete task"
        pending={del.isPending}
        onConfirm={() =>
          del.mutate(taskId, {
            onSuccess: () => {
              toast.success("Task deleted");
              setConfirmDelete(false);
              onClose();
            },
            onError: (e) => {
              toast.error(getErrorMessage(e, "The task couldn't be deleted"));
              setConfirmDelete(false);
            },
          })
        }
      />
    </div>
  );
}
