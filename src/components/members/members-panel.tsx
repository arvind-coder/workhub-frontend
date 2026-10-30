"use client";

import { useState } from "react";
import { Crown, MoreHorizontal, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SimpleSelect } from "@/components/shared/simple-select";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useProjectAccess } from "@/features/projects/access";
import { useRemoveMember, useUpdateMemberRole } from "@/features/members/hooks";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils/dates";
import { ROLE_LABEL } from "@/lib/utils/labels";
import type { MemberRole, ProjectMember } from "@/types/api";
import { AddMemberDialog } from "./add-member-dialog";

const ROLE_OPTIONS: Array<{ value: MemberRole; label: string }> = [
  { value: "MEMBER", label: ROLE_LABEL.MEMBER },
  { value: "PROJECT_MANAGER", label: ROLE_LABEL.PROJECT_MANAGER },
];

export function MembersPanel({ projectId }: { projectId: string }) {
  const access = useProjectAccess(projectId);
  const { members, me } = access;
  const project = access.project.data;
  const updateRole = useUpdateMemberRole(projectId);
  const remove = useRemoveMember(projectId);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ProjectMember | null>(null);

  const addButton = access.canManageMembers && (
    <Button onClick={() => setAdding(true)}>
      <UserPlus aria-hidden /> Add member
    </Button>
  );

  const ownerIsMe = project && me && project.ownerId === me.id;
  const ownerMember = members.data?.find((m) => m.user.id === project?.ownerId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">People with access to this project and its tasks.</p>
        {addButton}
      </div>

      {members.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : members.isError ? (
        <ErrorState title="We couldn't load members" error={members.error} onRetry={() => void members.refetch()} />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {project && !ownerMember && (
            <li className="flex items-center gap-3 px-4 py-3">
              <UserAvatar name={ownerIsMe ? me.name : "Owner"} seed={project.ownerId} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ownerIsMe ? `${me.name} (you)` : "Project owner"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {ownerIsMe ? me.email : "Name unavailable: the API lists only invited members"}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Crown aria-hidden className="size-3" /> Owner
              </Badge>
            </li>
          )}
          {members.data.map((m) => {
            const isMe = m.user.id === me?.id;
            const isOwner = m.user.id === project?.ownerId;
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <UserAvatar name={m.user.name} seed={m.user.id} />
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-medium">
                    {m.user.name} {isMe && <span className="font-normal text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.user.email} · Joined {formatDate(m.createdAt)}
                  </p>
                </div>
                {isOwner && (
                  <Badge variant="secondary" className="gap-1">
                    <Crown aria-hidden className="size-3" /> Owner
                  </Badge>
                )}
                {access.canChangeRoles && !isOwner ? (
                  <SimpleSelect
                    label={`Role for ${m.user.name}`}
                    size="sm"
                    className="w-44"
                    value={m.role}
                    disabled={updateRole.isPending}
                    options={ROLE_OPTIONS}
                    onValueChange={(role) =>
                      role !== m.role &&
                      updateRole.mutate(
                        { userId: m.user.id, role },
                        {
                          onSuccess: () => toast.success(`${m.user.name} is now ${ROLE_LABEL[role].toLowerCase()}`),
                          onError: (e) => toast.error(getErrorMessage(e, "The role couldn't be changed")),
                        },
                      )
                    }
                  />
                ) : (
                  <Badge variant="outline">{ROLE_LABEL[m.role]}</Badge>
                )}
                {access.canManageMembers && !isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${m.user.name}`} />}>
                      <MoreHorizontal aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-auto min-w-40">
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setRemoving(m)}>
                        <UserMinus aria-hidden /> Remove from project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            );
          })}
          {members.data.length === 0 && !project && (
            <li>
              <EmptyState icon={UserPlus} title="No members yet" className="border-0" />
            </li>
          )}
        </ul>
      )}

      {access.canManageMembers && members.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">Add teammates so they can be assigned tasks.</p>
      )}

      <AddMemberDialog open={adding} onOpenChange={setAdding} projectId={projectId} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove this member?"
        description={
          <>
            {removing?.user.name} will lose access to this project. Their assigned tasks stay in the project.
          </>
        }
        confirmLabel="Remove member"
        pending={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.user.id, {
            onSuccess: () => {
              toast.success(`${removing.user.name} removed`);
              setRemoving(null);
            },
            onError: (e) => {
              toast.error(getErrorMessage(e, "The member couldn't be removed"));
              setRemoving(null);
            },
          })
        }
      />
    </div>
  );
}
