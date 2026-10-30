"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/endpoints";
import { keys } from "@/lib/api/keys";
import type { ProjectInput, ProjectListParams, ProjectUpdateInput } from "@/types/api";

export function useProjects(params: ProjectListParams) {
  return useQuery({
    queryKey: keys.projects.list(params),
    queryFn: ({ signal }) => projectsApi.list(params, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useProject(id: string, enabled = true) {
  return useQuery({
    queryKey: keys.projects.detail(id),
    queryFn: ({ signal }) => projectsApi.get(id, { signal }),
    enabled,
  });
}

export function useProjectStats(id: string, enabled = true) {
  return useQuery({
    queryKey: keys.projects.stats(id),
    queryFn: ({ signal }) => projectsApi.stats(id, { signal }),
    enabled,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => projectsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.projects.all }),
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectUpdateInput) => projectsApi.update(id, input),
    onSuccess: (project) => {
      queryClient.setQueryData(keys.projects.detail(id), project);
      return queryClient.invalidateQueries({ queryKey: keys.projects.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: (_data, id) => {
      // Drop everything cached for the deleted project instead of refetching (it would 404).
      queryClient.removeQueries({ queryKey: keys.projects.detail(id) });
      queryClient.removeQueries({ queryKey: keys.projects.stats(id) });
      queryClient.removeQueries({ queryKey: keys.projects.members(id) });
      queryClient.removeQueries({ queryKey: keys.tasks.inProject(id) });
      return queryClient.invalidateQueries({ queryKey: keys.projects.lists });
    },
  });
}
