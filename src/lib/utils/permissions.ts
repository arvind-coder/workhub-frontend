import type { MemberRole, Project, Task, User } from "@/types/api";

/**
 * UX-level permission hints derived from the documented backend rules. The
 * backend remains the authority and its 403s are always surfaced to the user.
 */

export function canCreateProject(user?: User) {
  return user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER";
}

export function canEditProject(user: User | undefined, project: Project | undefined) {
  if (!user || !project) return false;
  return user.role === "ADMIN" || (user.role === "PROJECT_MANAGER" && project.ownerId === user.id);
}

export function isProjectManager(
  user: User | undefined,
  project: Project | undefined,
  myMembershipRole?: MemberRole,
) {
  if (!user || !project) return false;
  return user.role === "ADMIN" || project.ownerId === user.id || myMembershipRole === "PROJECT_MANAGER";
}

export function canChangeMemberRoles(user: User | undefined, project: Project | undefined) {
  if (!user || !project) return false;
  return user.role === "ADMIN" || project.ownerId === user.id;
}

/** Managers edit any field; the assignee may change status only. */
export function taskEditScope(
  user: User | undefined,
  task: Task,
  manager: boolean,
): "full" | "status" | "none" {
  if (!user) return "none";
  if (manager) return "full";
  if (task.assignedTo === user.id) return "status";
  return "none";
}
