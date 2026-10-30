import { apiRequest, apiRequestPage } from "./client";
import type {
  ActivityPage,
  LoginInput,
  MemberRole,
  Project,
  ProjectInput,
  ProjectListParams,
  ProjectMember,
  ProjectStats,
  ProjectUpdateInput,
  RegisterInput,
  Task,
  TaskComment,
  TaskCreateInput,
  TaskListParams,
  TaskUpdateInput,
  User,
  UserSummary,
} from "@/types/api";

type Signal = { signal?: AbortSignal };

export const authApi = {
  login: (input: LoginInput) => apiRequest<{ user: User }>("/auth/login", { method: "POST", body: input }),
  register: (input: RegisterInput) => apiRequest<User>("/auth/register", { method: "POST", body: input }),
  logout: () => apiRequest<{ message: string }>("/auth/logout", { method: "POST" }),
  me: ({ signal }: Signal = {}) => apiRequest<User>("/auth/me", { signal }),
};

export const usersApi = {
  search: (search: string, { signal }: Signal = {}) =>
    apiRequest<UserSummary[]>("/users", { query: { search, limit: 8 }, signal }),
};

export const projectsApi = {
  list: (params: ProjectListParams = {}, { signal }: Signal = {}) =>
    apiRequestPage<Project>("/projects", { query: { ...params }, signal }),
  get: (id: string, { signal }: Signal = {}) => apiRequest<Project>(`/projects/${id}`, { signal }),
  create: (input: ProjectInput) => apiRequest<Project>("/projects", { method: "POST", body: input }),
  update: (id: string, input: ProjectUpdateInput) =>
    apiRequest<Project>(`/projects/${id}`, { method: "PATCH", body: input }),
  remove: (id: string) => apiRequest<{ message: string }>(`/projects/${id}`, { method: "DELETE" }),
  stats: (id: string, { signal }: Signal = {}) => apiRequest<ProjectStats>(`/projects/${id}/stats`, { signal }),
};

export const tasksApi = {
  list: (projectId: string, params: TaskListParams = {}, { signal }: Signal = {}) =>
    apiRequestPage<Task>(`/projects/${projectId}/tasks`, { query: { ...params }, signal }),
  get: (projectId: string, taskId: string, { signal }: Signal = {}) =>
    apiRequest<Task>(`/projects/${projectId}/tasks/${taskId}`, { signal }),
  create: (projectId: string, input: TaskCreateInput) =>
    apiRequest<Task>(`/projects/${projectId}/tasks`, { method: "POST", body: input }),
  update: (projectId: string, taskId: string, input: TaskUpdateInput) =>
    apiRequest<Task>(`/projects/${projectId}/tasks/${taskId}`, { method: "PATCH", body: input }),
  remove: (projectId: string, taskId: string) =>
    apiRequest<{ message: string }>(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" }),
};

export const commentsApi = {
  list: (projectId: string, taskId: string, { signal }: Signal = {}) =>
    apiRequest<TaskComment[]>(`/projects/${projectId}/tasks/${taskId}/comments`, { signal }),
  create: (projectId: string, taskId: string, message: string) =>
    apiRequest<TaskComment>(`/projects/${projectId}/tasks/${taskId}/comments`, {
      method: "POST",
      body: { message },
    }),
};

export const activityApi = {
  list: (projectId: string, taskId: string, page: number, { signal }: Signal = {}) =>
    apiRequest<ActivityPage>(`/projects/${projectId}/tasks/${taskId}/activities`, {
      query: { page, limit: 10 },
      signal,
    }),
};

export const membersApi = {
  list: (projectId: string, { signal }: Signal = {}) =>
    apiRequest<ProjectMember[]>(`/projects/${projectId}/members`, { signal }),
  add: (projectId: string, userId: string, role: MemberRole) =>
    apiRequest<{ _id: string; userId: string; role: MemberRole }>(`/projects/${projectId}/members`, {
      method: "POST",
      body: { userId, role },
    }),
  remove: (projectId: string, userId: string) =>
    apiRequest<{ message: string }>(`/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
  updateRole: (projectId: string, userId: string, role: MemberRole) =>
    apiRequest<{ id: string; userId: string; role: MemberRole }>(
      `/projects/${projectId}/members/${userId}/role`,
      { method: "PATCH", body: { role } },
    ),
};
