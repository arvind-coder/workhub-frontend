"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activityApi, commentsApi } from "@/lib/api/endpoints";
import { keys } from "@/lib/api/keys";

export function useComments(projectId: string, taskId: string, enabled = true) {
  return useQuery({
    queryKey: keys.tasks.comments(projectId, taskId),
    queryFn: ({ signal }) => commentsApi.list(projectId, taskId, { signal }),
    enabled,
  });
}

export function useAddComment(projectId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => commentsApi.create(projectId, taskId, message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.tasks.comments(projectId, taskId) }),
  });
}

export function useTaskActivity(projectId: string, taskId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: keys.tasks.activity(projectId, taskId),
    queryFn: ({ pageParam, signal }) => activityApi.list(projectId, taskId, pageParam, { signal }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled,
  });
}
