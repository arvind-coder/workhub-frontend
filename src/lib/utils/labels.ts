import type { MemberRole, TaskPriority, TaskStatus, UserRole } from "@/types/api";

export const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
export const PRIORITY_ORDER: TaskPriority[] = ["HIGH", "MEDIUM", "LOW"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const ROLE_LABEL: Record<UserRole | MemberRole, string> = {
  ADMIN: "Admin",
  PROJECT_MANAGER: "Project manager",
  MEMBER: "Member",
};

export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? "" : "";
  return (first + last).toUpperCase();
}
