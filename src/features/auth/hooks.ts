"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/endpoints";
import { keys } from "@/lib/api/keys";
import type { LoginInput, RegisterInput } from "@/types/api";

export function useCurrentUser() {
  return useQuery({
    queryKey: keys.me,
    queryFn: ({ signal }) => authApi.me({ signal }),
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: ({ user }) => {
      queryClient.clear();
      queryClient.setQueryData(keys.me, user);
    },
  });
}

export function useRegister() {
  return useMutation({ mutationFn: (input: RegisterInput) => authApi.register(input) });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => queryClient.clear(),
  });
}
