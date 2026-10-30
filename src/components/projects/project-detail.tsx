"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, CheckCircle2, CircleDashed, ListChecks, MoreHorizontal, Pencil, Timer, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/stat-card";
import { MembersPanel } from "@/components/members/members-panel";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/states";
import { ProjectTasks } from "@/components/tasks/project-tasks";
import { useProjectAccess } from "@/features/projects/access";
import { useDeleteProject, useProjectStats, useUpdateProject } from "@/features/projects/hooks";
import { oneOf, useUrlState } from "@/hooks/use-url-state";
import { getErrorMessage, isApiError } from "@/lib/api/errors";
import { formatDate, formatRelative } from "@/lib/utils/dates";
import { objectIdPattern } from "@/lib/validations/schemas";
import { ProjectOverview } from "./project-overview";
import { ProjectFormDialog } from "./project-form-dialog";

const TABS = ["tasks", "members", "overview"] as const;

export function ProjectDetail({ projectId }: { projectId: string }) {
  const validId = objectIdPattern.test(projectId);
  if (!validId) {
    return <ErrorState title="Invalid project link" error={new Error("This project ID isn't valid. Check the link or open the project from the Projects page.")} />;
  }
  return <ProjectDetailInner projectId={projectId} />;
}

function ProjectDetailInner({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { searchParams, set } = useUrlState();
  const tab = oneOf(searchParams.get("tab"), TABS) ?? "tasks";
  const access = useProjectAccess(projectId);
  const { project } = access;
  const stats = useProjectStats(projectId, project.isSuccess);
  const update = useUpdateProject(projectId);
  const del = useDeleteProject();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (project.isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-full max-w-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (project.isError) {
    const err = project.error;
    const text = isApiError(err)
      ? err.isNotFound
        ? "We couldn't find this project. It may have been deleted."
        : err.isForbidden
          ? "You don't have access to this project. Ask its owner to add you."
          : err.status === 400
            ? "This project link isn't valid."
            : undefined
      : undefined;
    const final = isApiError(err) && (err.isNotFound || err.isForbidden || err.status === 400);
    return (
      <ErrorState
        title={isApiError(err) && err.isForbidden ? "Access denied" : final ? "Project unavailable" : "We couldn't load this project"}
        error={text ? new Error(text) : err}
        onRetry={final ? () => router.push("/projects") : () => void project.refetch()}
      />
    );
  }

  const p = project.data;
  const s = stats.data?.summary;
  const archived = p.status === "archived";

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="truncate">{p.name}</span>
            <ProjectStatusBadge status={p.status} />
          </span>
        }
        description={<span className="block max-w-3xl whitespace-pre-wrap">{p.description}</span>}
        actions={
          access.canEdit && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil aria-hidden /> Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="More project actions" />}>
                  <MoreHorizontal aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-auto min-w-48">
                  <DropdownMenuItem
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate(
                        { status: archived ? "active" : "archived" },
                        {
                          onSuccess: () => toast.success(archived ? "Project restored" : "Project archived"),
                          onError: (e) => toast.error(getErrorMessage(e)),
                        },
                      )
                    }
                  >
                    {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
                    {archived ? "Restore project" : "Archive project"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 aria-hidden /> Delete project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )
        }
      />
      <p className="-mt-4 text-xs text-muted-foreground">
        Created {formatDate(p.createdAt)} · Updated {formatRelative(p.updatedAt)}
      </p>

      {stats.isError ? (
        <ErrorState title="Statistics unavailable" error={stats.error} onRetry={() => void stats.refetch()} className="py-8" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total tasks" value={s?.total} icon={ListChecks} loading={stats.isPending} />
          <StatCard label="To do" value={s?.todo} icon={CircleDashed} loading={stats.isPending} />
          <StatCard label="In progress" value={s?.inProgress} icon={Timer} loading={stats.isPending} />
          <StatCard label="Completed" value={s?.completed} icon={CheckCircle2} tone="success" loading={stats.isPending} />
          <StatCard
            label="Overdue"
            value={s?.overdue}
            icon={TriangleAlert}
            tone={s && s.overdue > 0 ? "danger" : "default"}
            hint={s ? `${s.highPriority} high priority` : undefined}
            loading={stats.isPending}
          />
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === "tasks" ? "" : String(v), view: "", page: "", task: "" })}>
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="members">Members{access.members.data ? ` (${access.members.data.length + (access.members.data.some((m) => m.user.id === p.ownerId) ? 0 : 1)})` : ""}</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="pt-4">
          <ProjectTasks projectId={projectId} />
        </TabsContent>
        <TabsContent value="members" className="pt-4">
          <MembersPanel projectId={projectId} />
        </TabsContent>
        <TabsContent value="overview" className="pt-4">
          <ProjectOverview projectId={projectId} stats={stats} />
        </TabsContent>
      </Tabs>

      <ProjectFormDialog open={editing} onOpenChange={setEditing} project={p} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${p.name}”?`}
        description="This permanently deletes the project and its tasks. This can't be undone."
        confirmLabel="Delete project"
        pending={del.isPending}
        onConfirm={() =>
          del.mutate(projectId, {
            onSuccess: () => {
              toast.success("Project deleted");
              router.replace("/projects");
            },
            onError: (e) => {
              toast.error(getErrorMessage(e, "The project couldn't be deleted"));
              setConfirmDelete(false);
            },
          })
        }
      />
    </div>
  );
}
