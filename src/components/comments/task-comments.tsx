"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAddComment, useComments } from "@/features/comments/hooks";
import type { Person } from "@/features/members/hooks";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDateTime, formatRelative } from "@/lib/utils/dates";
import { commentSchema, type CommentValues } from "@/lib/validations/schemas";

export function TaskComments({
  projectId,
  taskId,
  resolve,
}: {
  projectId: string;
  taskId: string;
  resolve: (id?: string | null) => Person | undefined;
}) {
  const comments = useComments(projectId, taskId);
  const add = useAddComment(projectId, taskId);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CommentValues>({ resolver: zodResolver(commentSchema), defaultValues: { message: "" } });
  const length = useWatch({ control, name: "message" }).length;

  const onSubmit = handleSubmit((values) => {
    add.mutate(values.message, {
      onSuccess: () => reset({ message: "" }),
      onError: (e) => toast.error(getErrorMessage(e, "Your comment couldn't be posted")),
    });
  });

  const sorted = [...(comments.data ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="space-y-5">
      {comments.isPending ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-16 flex-1" />
            </div>
          ))}
        </div>
      ) : comments.isError ? (
        <ErrorState title="Comments unavailable" error={comments.error} onRetry={() => void comments.refetch()} className="py-8" />
      ) : sorted.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No comments yet" description="Start the conversation about this task." className="py-8" />
      ) : (
        <ul className="space-y-4">
          {sorted.map((c) => {
            const author = resolve(c.userId);
            return (
              <li key={c.id} className="flex gap-3">
                <UserAvatar name={author?.name ?? "?"} seed={c.userId} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-medium">{author?.name ?? "Teammate"}</span>
                    <time dateTime={c.createdAt} title={formatDateTime(c.createdAt)} className="text-xs text-muted-foreground">
                      {formatRelative(c.createdAt)}
                    </time>
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap break-words text-foreground/90">{c.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-2 border-t pt-4">
        <label htmlFor="comment-message" className="sr-only">
          Add a comment
        </label>
        <Textarea
          id="comment-message"
          rows={3}
          placeholder="Write a comment…"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "comment-error" : undefined}
          {...register("message")}
        />
        <div className="flex items-center justify-between gap-3">
          <p id="comment-error" role={errors.message ? "alert" : undefined} className="text-xs font-medium text-destructive">
            {errors.message?.message ?? (length > 1800 ? <span className="text-muted-foreground">{length}/2000</span> : null)}
          </p>
          <Button type="submit" size="sm" disabled={add.isPending}>
            {add.isPending ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
            {add.isPending ? "Posting…" : "Comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
