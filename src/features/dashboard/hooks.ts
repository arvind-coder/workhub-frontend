"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/endpoints";
import { keys } from "@/lib/api/keys";
import { useProjects } from "@/features/projects/hooks";
import type { Project, ProjectStats, StatusCounts } from "@/types/api";

/** Per-project stats requests made by the dashboard (rate-limit friendly). */
export const DASHBOARD_PROJECT_CAP = 12;
export const PROJECT_LIST_PARAMS = { limit: 100, sortBy: "updatedAt", sortOrder: "desc" } as const;

export interface DashboardTotals extends StatusCounts {
  highPriority: number;
  overdue: number;
  mine: StatusCounts;
}

const empty = (): StatusCounts => ({ total: 0, completed: 0, inProgress: 0, todo: 0 });

/**
 * The API has no global dashboard endpoint. This composes the real per-project
 * `/stats` responses for the user's most recently updated projects.
 */
export function useDashboard(userId: string | undefined) {
  const projects = useProjects(PROJECT_LIST_PARAMS);
  const covered: Project[] = useMemo(
    () => (projects.data?.items ?? []).slice(0, DASHBOARD_PROJECT_CAP),
    [projects.data],
  );

  const statsQueries = useQueries({
    queries: covered.map((p) => ({
      queryKey: keys.projects.stats(p.id),
      queryFn: ({ signal }: { signal: AbortSignal }) => projectsApi.stats(p.id, { signal }),
    })),
  });

  const loadedStats: Array<{ project: Project; stats: ProjectStats }> = [];
  statsQueries.forEach((q, i) => {
    if (q.data) loadedStats.push({ project: covered[i]!, stats: q.data });
  });

  const statsLoading = statsQueries.some((q) => q.isLoading);
  const statsFailed = statsQueries.filter((q) => q.isError).length;

  const totals = ((): DashboardTotals => {
    const t: DashboardTotals = { ...empty(), highPriority: 0, overdue: 0, mine: empty() };
    for (const { stats } of loadedStats) {
      t.total += stats.summary.total;
      t.completed += stats.summary.completed;
      t.inProgress += stats.summary.inProgress;
      t.todo += stats.summary.todo;
      t.highPriority += stats.summary.highPriority;
      t.overdue += stats.summary.overdue;
      const mine = stats.tasksByAssignee.find((a) => a.assigneeId === userId);
      if (mine) {
        t.mine.total += mine.total;
        t.mine.completed += mine.completed;
        t.mine.inProgress += mine.inProgress;
        t.mine.todo += mine.todo;
      }
    }
    return t;
  })();

  return {
    projects,
    covered,
    loadedStats,
    totals,
    statsLoading,
    statsFailed,
    totalProjects: projects.data?.pagination.total ?? 0,
    truncated: (projects.data?.pagination.total ?? 0) > DASHBOARD_PROJECT_CAP,
    refetch: () => {
      void projects.refetch();
      statsQueries.forEach((q) => void q.refetch());
    },
  };
}
