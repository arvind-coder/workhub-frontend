"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, CheckSquare, FolderKanban, ListTodo, Plus, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { useCurrentUser } from "@/features/auth/hooks";
import { DASHBOARD_PROJECT_CAP, useDashboard } from "@/features/dashboard/hooks";

import { formatRelative } from "@/lib/utils/dates";
import { canCreateProject } from "@/lib/utils/permissions";
import { StatCard } from "./stat-card";

const ChartSkeleton = () => <Skeleton className="h-56 rounded-lg" />;
const StatusDonut = dynamic(() => import("./charts").then((m) => m.StatusDonut), { ssr: false, loading: ChartSkeleton });
const ProjectsBar = dynamic(() => import("./charts").then((m) => m.ProjectsBar), { ssr: false, loading: ChartSkeleton });

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Overview() {
  const router = useRouter();
  const { data: me } = useCurrentUser();
  const d = useDashboard(me?.id);
  const [creating, setCreating] = useState(false);
  const allowCreate = canCreateProject(me);

  const firstName = me?.name.split(/\s+/)[0];
  const t = d.totals;
  const loading = d.projects.isPending || d.statsLoading;

  if (d.projects.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Welcome back${firstName ? `, ${firstName}` : ""}`} />
        <ErrorState title="We couldn't load your dashboard" error={d.projects.error} onRetry={d.refetch} />
      </div>
    );
  }

  const noProjects = d.projects.isSuccess && d.totalProjects === 0;
  const pending = t.todo + t.inProgress;

  const slices = [
    { name: "To do", value: t.todo, color: "var(--status-todo)" },
    { name: "In progress", value: t.inProgress, color: "var(--status-progress)" },
    { name: "Done", value: t.completed, color: "var(--status-done)" },
  ];
  const barData = d.loadedStats
    .filter(({ stats }) => stats.summary.total > 0)
    .sort((a, b) => b.stats.summary.total - a.stats.summary.total)
    .slice(0, 8)
    .map(({ project, stats }) => ({
      name: project.name,
      todo: stats.summary.todo,
      inProgress: stats.summary.inProgress,
      done: stats.summary.completed,
    }));
  const attention = d.loadedStats
    .filter(({ stats }) => stats.summary.overdue > 0)
    .sort((a, b) => b.stats.summary.overdue - a.stats.summary.overdue);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back${firstName ? `, ${firstName}` : ""}`}
        description="Here's where your projects and tasks stand today."
        actions={
          <>
            <Link href="/my-tasks" className={buttonVariants({ variant: "outline" })}>
              <CheckSquare aria-hidden /> My tasks
            </Link>
            {allowCreate && (
              <Button onClick={() => setCreating(true)}>
                <Plus aria-hidden /> New project
              </Button>
            )}
          </>
        }
      />

      {noProjects ? (
        <EmptyState
          icon={FolderKanban}
          title="Your workspace is empty"
          description={allowCreate ? "Create a project to start tracking tasks and progress." : "Once a project manager adds you to a project, your tasks and progress show up here."}
          action={
            allowCreate ? (
              <Button onClick={() => setCreating(true)}>
                <Plus aria-hidden /> Create a project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Projects" value={d.totalProjects} icon={FolderKanban} href="/projects" loading={d.projects.isPending} />
            <StatCard label="Total tasks" value={t.total} icon={ListTodo} loading={loading} />
            <StatCard label="Completed" value={t.completed} icon={CheckCircle2} tone="success" loading={loading} hint={t.total ? `${Math.round((t.completed / t.total) * 100)}% of all tasks` : undefined} />
            <StatCard label="Pending" value={pending} icon={BarChart3} loading={loading} hint={`${t.inProgress} in progress`} />
          </div>

          {d.statsFailed > 0 && (
            <ErrorState title={`Statistics failed for ${d.statsFailed} project${d.statsFailed > 1 ? "s" : ""}`} error={new Error("Totals below exclude those projects.")} onRetry={d.refetch} className="py-6" />
          )}
          {d.truncated && (
            <p className="text-xs text-muted-foreground" role="note">
              Task statistics cover your {DASHBOARD_PROJECT_CAP} most recently updated projects (of {d.totalProjects}).
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Panel title="Task status">
                {loading ? (
                  <ChartSkeleton />
                ) : t.total === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">No tasks yet. Create one inside a project.</p>
                ) : (
                  <figure aria-label={`Task status: ${t.todo} to do, ${t.inProgress} in progress, ${t.completed} done`}>
                    <StatusDonut data={slices} />
                    <figcaption>
                      <ul className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        {slices.map((s) => (
                          <li key={s.name}>
                            <span className="flex items-center justify-center gap-1.5 text-muted-foreground">
                              <span aria-hidden className="size-2 rounded-full" style={{ background: s.color }} />
                              {s.name}
                            </span>
                            <span className="text-base font-semibold tabular-nums">{s.value}</span>
                          </li>
                        ))}
                      </ul>
                    </figcaption>
                  </figure>
                )}
              </Panel>
            </div>
            <div className="lg:col-span-3">
              <Panel title="Tasks by project" action={<Link href="/projects" className="text-xs font-medium text-primary hover:underline">All projects</Link>}>
                {loading ? (
                  <ChartSkeleton />
                ) : barData.length === 0 ? (
                  <p className="py-16 text-center text-sm text-muted-foreground">Nothing to chart yet.</p>
                ) : (
                  <figure aria-label="Task counts by project and status">
                    <ProjectsBar data={barData} />
                  </figure>
                )}
              </Panel>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <Panel title="Recent projects" action={<Link href="/projects" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all <ArrowRight aria-hidden className="size-3" /></Link>}>
                {d.projects.isPending ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-14" />
                    ))}
                  </div>
                ) : (
                  <ul className="-mx-2 divide-y">
                    {(d.projects.data?.items ?? []).slice(0, 5).map((p) => {
                      const s = d.loadedStats.find((x) => x.project.id === p.id)?.stats.summary;
                      const pct = s && s.total ? Math.round((s.completed / s.total) * 100) : 0;
                      return (
                        <li key={p.id}>
                          <Link href={`/projects/${p.id}`} className="flex items-center gap-4 rounded-lg px-2 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">Updated {formatRelative(p.updatedAt)}</p>
                            </div>
                            {s && (
                              <div className="hidden w-32 sm:block" title={`${s.completed} of ${s.total} tasks done`}>
                                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="mt-1 text-right text-[11px] text-muted-foreground tabular-nums">{s.completed}/{s.total} done</p>
                              </div>
                            )}
                            <ProjectStatusBadge status={p.status} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </div>
            <div className="space-y-4 lg:col-span-2">
              <Panel title="Needs attention">
                {loading ? (
                  <Skeleton className="h-20" />
                ) : attention.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 aria-hidden className="size-4 text-status-done" /> No overdue tasks. Nice work.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {attention.slice(0, 5).map(({ project, stats }) => (
                      <li key={project.id}>
                        <Link href={`/projects/${project.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50">
                          <span className="truncate">{project.name}</span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-priority-high">
                            <TriangleAlert aria-hidden className="size-3.5" />
                            {stats.summary.overdue} overdue
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel title="Assigned to you" action={<Link href="/my-tasks" className="text-xs font-medium text-primary hover:underline">Open My Tasks</Link>}>
                {loading ? (
                  <Skeleton className="h-16" />
                ) : (
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-semibold tabular-nums">{t.mine.todo + t.mine.inProgress}</p>
                      <p className="text-xs text-muted-foreground">open tasks</p>
                    </div>
                    <p className="text-right text-xs text-muted-foreground">
                      {t.mine.inProgress} in progress
                      <br />
                      {t.mine.completed} completed
                    </p>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}

      <ProjectFormDialog open={creating} onOpenChange={setCreating} onCreated={(p) => router.push(`/projects/${p.id}`)} />
    </div>
  );
}

