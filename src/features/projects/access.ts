"use client";

import { useCurrentUser } from "@/features/auth/hooks";
import { useProjectMembers } from "@/features/members/hooks";
import { useProject } from "@/features/projects/hooks";
import { canChangeMemberRoles, canEditProject, isProjectManager, taskEditScope } from "@/lib/utils/permissions";
import type { Task } from "@/types/api";

/** UI-level permission hints for one project. The API stays the authority. */
export function useProjectAccess(projectId: string) {
  const { data: me } = useCurrentUser();
  const project = useProject(projectId);
  const members = useProjectMembers(projectId, project.isSuccess);
  const myMembership = members.data?.find((m) => m.user.id === me?.id);
  const manager = isProjectManager(me, project.data, myMembership?.role);

  return {
    me,
    project,
    members,
    isManager: manager,
    canEdit: canEditProject(me, project.data),
    canManageMembers: manager,
    canChangeRoles: canChangeMemberRoles(me, project.data),
    scopeFor: (task: Task) => taskEditScope(me, task, manager),
  };
}
