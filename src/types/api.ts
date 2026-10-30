/** Types mirror the backend OpenAPI document (GET /api/docs/openapi.json). */

export type UserRole = "ADMIN" | "PROJECT_MANAGER" | "MEMBER";
export type ProjectStatus = "active" | "archived";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type MemberRole = "MEMBER" | "PROJECT_MANAGER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  /** Omitted when unassigned. */
  assignedTo?: string;
  createdBy: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Omitted when not set. */
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  projectId: string;
  taskId: string;
  userId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskActivityAction =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "STATUS_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "TASK_DELETED";

export interface TaskActivity {
  id: string;
  projectId: string;
  taskId: string;
  userId: string;
  action: TaskActivityAction;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  user: { id: string; name: string; email: string };
  role: MemberRole;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface ActivityPage {
  activities: TaskActivity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StatusCounts {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
}

export interface ProjectStats {
  projectId: string;
  summary: StatusCounts & { highPriority: number; overdue: number };
  tasksByAssignee: Array<StatusCounts & { assigneeId: string; assigneeName: string | null }>;
  unassigned: StatusCounts;
}

/* ---------- Requests ---------- */

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}
export interface LoginInput {
  email: string;
  password: string;
}
export interface ProjectInput {
  name: string;
  description: string;
}
export interface ProjectUpdateInput extends Partial<ProjectInput> {
  status?: ProjectStatus;
}
export interface TaskCreateInput {
  title: string;
  description: string;
  assignedTo?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
}
export interface TaskUpdateInput {
  title?: string;
  description?: string;
  /** null unassigns the task. */
  assignedTo?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  /** null clears the due date. */
  dueDate?: string | null;
}

export interface ProjectListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface TaskListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  overdue?: boolean;
  sortBy?: "createdAt" | "updatedAt" | "title";
  sortOrder?: "asc" | "desc";
}
