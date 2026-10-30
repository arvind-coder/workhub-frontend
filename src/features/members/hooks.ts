"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { membersApi, usersApi } from "@/lib/api/endpoints";
import { keys } from "@/lib/api/keys";
import { useCurrentUser } from "@/features/auth/hooks";
import type { MemberRole } from "@/types/api";

export function useProjectMembers(projectId: string, enabled = true) {
  return useQuery({
    queryKey: keys.projects.members(projectId),
    queryFn: ({ signal }) => membersApi.list(projectId, { signal }),
    enabled,
  });
}

export function useAddMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; role: MemberRole }) => membersApi.add(projectId, vars.userId, vars.role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.projects.members(projectId) }),
  });
}

export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => membersApi.remove(projectId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.projects.members(projectId) });
      return queryClient.invalidateQueries({ queryKey: keys.projects.stats(projectId) });
    },
  });
}

export function useUpdateMemberRole(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; role: MemberRole }) =>
      membersApi.updateRole(projectId, vars.userId, vars.role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.projects.members(projectId) }),
  });
}

export interface Person {
  id: string;
  name: string;
  email?: string;
}

/**
 * Resolves user IDs to names. The API only returns IDs on tasks and comments,
 * so names come from the project's member list plus the signed-in user.
 * The project owner is not part of the member list; their name is only known
 * when the owner is the signed-in user.
 */
export function usePeople(projectId: string) {
  const { data: me } = useCurrentUser();
  const members = useProjectMembers(projectId);

  const directory = useMemo(() => {
    const map = new Map<string, Person>();
    members.data?.forEach((m) => map.set(m.user.id, m.user));
    if (me) map.set(me.id, { id: me.id, name: me.name, email: me.email });
    return map;
  }, [members.data, me]);

  const resolve = useCallback((userId?: string | null) => (userId ? directory.get(userId) : undefined), [directory]);

  return { resolve, people: directory, members, isLoading: members.isLoading };
}

export const MIN_USER_SEARCH_LENGTH = 2;

/** Server-side people search used by the "Add member" picker. */
export function useUserSearch(term: string) {
  const query = term.trim();
  return useQuery({
    queryKey: keys.users.search(query),
    queryFn: ({ signal }) => usersApi.search(query, { signal }),
    enabled: query.length >= MIN_USER_SEARCH_LENGTH,
    staleTime: 30_000,
  });
}
