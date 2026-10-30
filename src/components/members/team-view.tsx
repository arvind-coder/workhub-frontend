"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { PROJECT_LIST_PARAMS } from "@/features/dashboard/hooks";
import { useProjects } from "@/features/projects/hooks";
import { membersApi } from "@/lib/api/endpoints";
import { keys } from "@/lib/api/keys";
import { ROLE_LABEL } from "@/lib/utils/labels";
import type { MemberRole } from "@/types/api";

const PROJECT_CAP = 12;

interface Person {
  id: string;
  name: string;
  email: string;
  projects: Array<{ id: string; name: string; role: MemberRole }>;
}

/**
 * The API has no organisation-wide user list. This view combines the member
 * lists of your most recent projects, so it shows people you share projects with.
 */
export function TeamView() {
  const projects = useProjects(PROJECT_LIST_PARAMS);
  const covered = useMemo(() => (projects.data?.items ?? []).slice(0, PROJECT_CAP), [projects.data]);
  const [filter, setFilter] = useState("");

  const results = useQueries({
    queries: covered.map((p) => ({
      queryKey: keys.projects.members(p.id),
      queryFn: ({ signal }: { signal: AbortSignal }) => membersApi.list(p.id, { signal }),
    })),
  });

  const loading = projects.isPending || results.some((r) => r.isLoading);
  const failed = results.filter((r) => r.isError).length;

  const people = ((): Person[] => {
    const map = new Map<string, Person>();
    results.forEach((r, i) => {
      const project = covered[i];
      if (!project || !r.data) return;
      for (const m of r.data) {
        const entry = map.get(m.user.id) ?? { ...m.user, projects: [] };
        entry.projects.push({ id: project.id, name: project.name, role: m.role });
        map.set(m.user.id, entry);
      }
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  })();

  const q = filter.trim().toLowerCase();
  const shown = q ? people.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)) : people;

  return (
    <div className="space-y-6">
      <PageHeader title="Team" description="People you share projects with." />

      {projects.isError ? (
        <ErrorState title="We couldn't load your team" error={projects.error} onRetry={() => void projects.refetch()} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <EmptyState icon={Users} title="No teammates yet" description="Add members from a project's Members tab and they'll appear here." />
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" aria-label="Filter people already loaded" placeholder="Filter by name or email…" className="h-9 pl-8" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          {failed > 0 && <p role="alert" className="text-sm text-destructive">Members of {failed} project{failed > 1 ? "s" : ""} couldn&apos;t be loaded.</p>}
          {shown.length === 0 ? (
            <EmptyState icon={Search} title="No one matches" description="Try a different name or email." />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((p) => (
                <li key={p.id} className="rounded-xl border bg-card p-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={p.name} seed={p.id} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                    </div>
                  </div>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {p.projects.map((pr) => (
                      <li key={pr.id}>
                        <Link href={`/projects/${pr.id}?tab=members`} className="inline-flex">
                          <Badge variant="secondary" className="max-w-48 gap-1 hover:bg-secondary/70">
                            <span className="truncate">{pr.name}</span>
                            <span className="text-muted-foreground">· {ROLE_LABEL[pr.role]}</span>
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          {projects.data && projects.data.pagination.total > PROJECT_CAP && (
            <p className="text-xs text-muted-foreground" role="note">
              Based on your {PROJECT_CAP} most recently updated projects.
            </p>
          )}
        </>
      )}
    </div>
  );
}
