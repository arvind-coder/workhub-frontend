import type { ProjectListParams, TaskListParams } from "@/types/api";

/** Query-key factory. Keys nest so invalidating a prefix refreshes a whole area. */
export const keys = {
  me: ["auth", "me"] as const,
  projects: {
    all: ["projects"] as const,
    lists: ["projects", "list"] as const,
    list: (params: ProjectListParams) => ["projects", "list", params] as const,
    detail: (id: string) => ["projects", "detail", id] as const,
    stats: (id: string) => ["projects", "stats", id] as const,
    members: (id: string) => ["projects", "members", id] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    inProject: (projectId: string) => ["tasks", "project", projectId] as const,
    list: (projectId: string, params: TaskListParams) => ["tasks", "project", projectId, "list", params] as const,
    detail: (projectId: string, taskId: string) => ["tasks", "project", projectId, "detail", taskId] as const,
    comments: (projectId: string, taskId: string) => ["tasks", "project", projectId, "comments", taskId] as const,
    activity: (projectId: string, taskId: string) => ["tasks", "project", projectId, "activity", taskId] as const,
    mine: (userId: string, projectIds: string[], params: TaskListParams) =>
      ["tasks", "mine", userId, projectIds, params] as const,
  },
};
