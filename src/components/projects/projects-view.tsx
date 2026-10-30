"use client";

import { useState } from "react";
import { FolderKanban, LayoutGrid, List, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterChips, type Chip } from "@/components/shared/filter-chips";
import { PageHeader } from "@/components/shared/page-header";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { SimpleSelect } from "@/components/shared/simple-select";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { useCurrentUser } from "@/features/auth/hooks";
import { useProjects } from "@/features/projects/hooks";
import { oneOf, parsePage, useSearchParam, useUrlState } from "@/hooks/use-url-state";
import { useLocalFlag } from "@/hooks/use-local-flag";
import { canCreateProject } from "@/lib/utils/permissions";
import type { ProjectListParams, ProjectStatus } from "@/types/api";
import { ProjectCard } from "./project-card";
import { ProjectFormDialog } from "./project-form-dialog";

const SORTS = {
  "updated-desc": { sortBy: "updatedAt", sortOrder: "desc", label: "Recently updated" },
  "created-desc": { sortBy: "createdAt", sortOrder: "desc", label: "Newest" },
  "created-asc": { sortBy: "createdAt", sortOrder: "asc", label: "Oldest" },
  "name-asc": { sortBy: "name", sortOrder: "asc", label: "Name A–Z" },
  "name-desc": { sortBy: "name", sortOrder: "desc", label: "Name Z–A" },
} as const;
type SortKey = keyof typeof SORTS;
const SORT_KEYS = Object.keys(SORTS) as SortKey[];
const PAGE_SIZE = 12;

export function ProjectsView() {
  const router = useRouter();
  const { data: me } = useCurrentUser();
  const { searchParams, set } = useUrlState();
  const [listLayout, setListLayout] = useLocalFlag("workhub:projects-list-layout");
  const [creating, setCreating] = useState(false);

  const q = useSearchParam("q");
  const urlQuery = q.urlValue;

  const status = oneOf<ProjectStatus>(searchParams.get("status"), ["active", "archived"]);
  const sortKey = oneOf(searchParams.get("sort"), SORT_KEYS) ?? "updated-desc";
  const page = parsePage(searchParams.get("page"));

  const params: ProjectListParams = {
    page,
    limit: PAGE_SIZE,
    search: urlQuery.trim() || undefined,
    status,
    sortBy: SORTS[sortKey].sortBy,
    sortOrder: SORTS[sortKey].sortOrder,
  };
  const query = useProjects(params);
  const allowCreate = canCreateProject(me);
  const resetAll = () => {
    q.clear();
    set({ q: "", status: "" }, { resetPage: true });
  };

  const chips: Chip[] = [];
  if (urlQuery.trim()) chips.push({ key: "q", label: `Search: ${urlQuery.trim()}`, onRemove: q.clear });
  if (status) chips.push({ key: "status", label: `Status: ${status}`, onRemove: () => set({ status: "" }, { resetPage: true }) });

  const newButton = allowCreate && (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden /> New project
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Everything your team is building, in one place." actions={newButton} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search projects"
            placeholder="Search projects by name…"
            maxLength={100}
            className="h-9 pl-8"
            value={q.value}
            onChange={(e) => q.onChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SimpleSelect
            label="Filter by status"
            className="w-36"
            value={status ?? "all"}
            onValueChange={(v) => set({ status: v === "all" ? "" : v }, { resetPage: true })}
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
          />
          <SimpleSelect
            label="Sort projects"
            className="w-44"
            value={sortKey}
            onValueChange={(v) => set({ sort: v === "updated-desc" ? "" : v }, { resetPage: true })}
            options={SORT_KEYS.map((k) => ({ value: k, label: SORTS[k].label }))}
          />
          <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Layout">
            <Button variant={listLayout ? "ghost" : "secondary"} size="icon-sm" aria-label="Grid layout" aria-pressed={!listLayout} onClick={() => setListLayout(false)}>
              <LayoutGrid aria-hidden />
            </Button>
            <Button variant={listLayout ? "secondary" : "ghost"} size="icon-sm" aria-label="List layout" aria-pressed={listLayout} onClick={() => setListLayout(true)}>
              <List aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      <FilterChips chips={chips} onClear={resetAll} />

      {query.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState title="We couldn't load projects" error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        chips.length > 0 ? (
          <EmptyState
            icon={Search}
            title="No projects match your filters"
            description="Try a different search term or clear the filters."
            action={<Button variant="outline" onClick={resetAll}>Reset filters</Button>}
          />
        ) : (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description={
              allowCreate
                ? "Create your first project to start planning and assigning tasks."
                : "You haven't been added to any projects yet. Ask a project manager to add you."
            }
            action={newButton || undefined}
          />
        )
      ) : (
        <>
          <ul className={listLayout ? "grid gap-3" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"} aria-busy={query.isFetching}>
            {query.data.items.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} layout={listLayout ? "list" : "grid"} />
              </li>
            ))}
          </ul>
          <PaginationControls
            pagination={query.data.pagination}
            noun="projects"
            disabled={query.isFetching}
            onPageChange={(p) => set({ page: p === 1 ? "" : p })}
          />
        </>
      )}

      <ProjectFormDialog open={creating} onOpenChange={setCreating} onCreated={(p) => router.push(`/projects/${p.id}`)} />
    </div>
  );
}
