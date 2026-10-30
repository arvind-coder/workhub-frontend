"use client";

import { useState } from "react";
import { toast } from "sonner";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/endpoints";
import { keys } from "@/lib/api/keys";
import { getErrorMessage } from "@/lib/api/errors";
import { STATUS_LABEL } from "@/lib/utils/labels";
import type { Paginated, Project, Task, TaskCreateInput, TaskListParams, TaskStatus, TaskUpdateInput } from "@/types/api";

export function useTasks(projectId: string, params: TaskListParams) {
  return useQuery({
    queryKey: keys.tasks.list(projectId, params),
    queryFn: ({ signal }) => tasksApi.list(projectId, params, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useTask(projectId: string, taskId: string, enabled = true) {
  return useQuery({
    queryKey: keys.tasks.detail(projectId, taskId),
    queryFn: ({ signal }) => tasksApi.get(projectId, taskId, { signal }),
    enabled,
  });
}

/** Refresh everything derived from a project's tasks (lists, stats, dashboard). */
export function invalidateTaskData(queryClient: QueryClient, projectId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.tasks.all }),
    queryClient.invalidateQueries({ queryKey: keys.projects.stats(projectId) }),
  ]);
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskCreateInput) => tasksApi.create(projectId, input),
    onSuccess: () => invalidateTaskData(queryClient, projectId),
  });
}

export function useUpdateTask(projectId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskUpdateInput) => tasksApi.update(projectId, taskId, input),
    onSuccess: (task) => {
      queryClient.setQueryData(keys.tasks.detail(projectId, taskId), task);
      void queryClient.invalidateQueries({ queryKey: keys.tasks.activity(projectId, taskId) });
      return invalidateTaskData(queryClient, projectId);
    },
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksApi.remove(projectId, taskId),
    onSuccess: (_d, taskId) => {
      queryClient.removeQueries({ queryKey: keys.tasks.detail(projectId, taskId) });
      return invalidateTaskData(queryClient, projectId);
    },
  });
}

type Snapshot = Array<[readonly unknown[], unknown]>;

function isPage(value: unknown): value is Paginated<Task> {
  return typeof value === "object" && value !== null && Array.isArray((value as Paginated<Task>).items);
}
function isTask(value: unknown): value is Task {
  return typeof value === "object" && value !== null && "status" in value && "projectId" in value;
}

/**
 * Status change used by the row menu and the Kanban board. Updates every
 * cached copy of the task immediately, rolls all of them back if the backend
 * rejects the change, and refetches afterwards so the cache matches the server.
 */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, { task: Task; status: TaskStatus }, { snapshot: Snapshot }>({
    mutationFn: ({ task, status }) => tasksApi.update(task.projectId, task.id, { status }),
    onMutate: async ({ task, status }) => {
      await queryClient.cancelQueries({ queryKey: keys.tasks.all });
      const snapshot = queryClient.getQueriesData<unknown>({ queryKey: keys.tasks.all }) as Snapshot;

      queryClient.setQueriesData<unknown>({ queryKey: keys.tasks.all }, (data: unknown) => {
        if (isPage(data)) {
          return { ...data, items: data.items.map((t) => (t.id === task.id ? { ...t, status } : t)) };
        }
        if (isTask(data) && data.id === task.id) return { ...data, status };
        if (Array.isArray(data) && data.every(isTask)) {
          return data.map((t) => (t.id === task.id ? { ...t, status } : t));
        }
        return data;
      });
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_data, _error, { task }) => {
      void queryClient.invalidateQueries({ queryKey: keys.tasks.activity(task.projectId, task.id) });
      return invalidateTaskData(queryClient, task.projectId);
    },
  });
}

export interface MyTasksResult {
  tasks: Task[];
  /** Projects whose tasks could not be loaded. */
  failedProjects: string[];
}

/**
 * The API has no cross-project task endpoint, so "My tasks" queries each of the
 * user's projects with `assignedTo=<me>`. Failures are isolated per project.
 */
export function useMyTasks(userId: string | undefined, projects: Project[] | undefined, params: TaskListParams) {
  const projectIds = (projects ?? []).map((p) => p.id);
  return useQuery<MyTasksResult>({
    queryKey: keys.tasks.mine(userId ?? "", projectIds, params),
    enabled: Boolean(userId) && projects !== undefined,
    queryFn: async ({ signal }) => {
      const results = await Promise.allSettled(
        projectIds.map((id) => tasksApi.list(id, { ...params, assignedTo: userId, limit: 100 }, { signal })),
      );
      const tasks: Task[] = [];
      const failedProjects: string[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") tasks.push(...result.value.items);
        else failedProjects.push(projectIds[index]!);
      });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      return { tasks, failedProjects };
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Wraps the optimistic status mutation with per-task in-flight tracking so the
 * same task can't be submitted twice (e.g. a second drag before the first
 * request returns).
 */
export function useTaskStatusChange() {
  const mutation = useUpdateTaskStatus();
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  const change = async (task: Task, status: TaskStatus) => {
    if (pendingIds.has(task.id) || task.status === status) return;
    setPendingIds((prev) => new Set(prev).add(task.id));
    try {
      await mutation.mutateAsync({ task, status });
      toast.success(`Moved to ${STATUS_LABEL[status]}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "The status couldn't be updated. It has been restored."));
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  return { change, pendingIds };
}
