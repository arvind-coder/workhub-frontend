"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FilterChips, type Chip } from "@/components/shared/filter-chips";
import { SimpleSelect } from "@/components/shared/simple-select";
import { useCurrentUser } from "@/features/auth/hooks";
import { oneOf, parsePage, useSearchParam, useUrlState } from "@/hooks/use-url-state";
import { PRIORITY_LABEL, PRIORITY_ORDER, STATUS_LABEL, STATUS_ORDER } from "@/lib/utils/labels";
import { objectIdPattern } from "@/lib/validations/schemas";
import type { Person } from "@/features/members/hooks";
import type { TaskListParams, TaskPriority, TaskStatus } from "@/types/api";

const SORTS = {
  "created-desc": { sortBy: "createdAt", sortOrder: "desc", label: "Newest" },
  "created-asc": { sortBy: "createdAt", sortOrder: "asc", label: "Oldest" },
  "updated-desc": { sortBy: "updatedAt", sortOrder: "desc", label: "Recently updated" },
  "title-asc": { sortBy: "title", sortOrder: "asc", label: "Title A–Z" },
  "title-desc": { sortBy: "title", sortOrder: "desc", label: "Title Z–A" },
} as const;
type SortKey = keyof typeof SORTS;
const SORT_KEYS = Object.keys(SORTS) as SortKey[];

/**
 * Task filters live in the URL. Every filter here maps to a documented
 * server-side query parameter of GET /projects/{id}/tasks, so results are
 * filtered and paginated by the API, not in the browser.
 */
export function useTaskFilters(limit: number) {
  const { searchParams, set } = useUrlState();
  const q = useSearchParam("q");

  const status = oneOf<TaskStatus>(searchParams.get("status"), STATUS_ORDER);
  const priority = oneOf<TaskPriority>(searchParams.get("priority"), PRIORITY_ORDER);
  const rawAssignee = searchParams.get("assignee");
  const assignee = rawAssignee && objectIdPattern.test(rawAssignee) ? rawAssignee : undefined;
  const overdue = searchParams.get("overdue") === "1";
  const sortKey = oneOf(searchParams.get("sort"), SORT_KEYS) ?? "created-desc";
  const page = parsePage(searchParams.get("page"));

  const params: TaskListParams = {
    page,
    limit,
    search: q.urlValue || undefined,
    status,
    priority,
    assignedTo: assignee,
    overdue: overdue || undefined,
    sortBy: SORTS[sortKey].sortBy,
    sortOrder: SORTS[sortKey].sortOrder,
  };

  const reset = () => {
    q.clear();
    set({ q: "", status: "", priority: "", assignee: "", overdue: "", sort: "" }, { resetPage: true });
  };

  return { params, q, status, priority, assignee, overdue, sortKey, page, set, reset };
}

export type TaskFilters = ReturnType<typeof useTaskFilters>;

export function TaskFilterBar({
  filters,
  people,
  showAssignee = true,
  hideStatusPriority,
}: {
  filters: TaskFilters;
  people: Map<string, Person>;
  showAssignee?: boolean;
  hideStatusPriority?: boolean;
}) {
  const { data: me } = useCurrentUser();
  const { q, set } = filters;
  const sorted = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));

  const chips: Chip[] = [];
  if (q.urlValue) chips.push({ key: "q", label: `Search: ${q.urlValue}`, onRemove: q.clear });
  if (filters.status) chips.push({ key: "status", label: `Status: ${STATUS_LABEL[filters.status]}`, onRemove: () => set({ status: "" }, { resetPage: true }) });
  if (filters.priority) chips.push({ key: "priority", label: `Priority: ${PRIORITY_LABEL[filters.priority]}`, onRemove: () => set({ priority: "" }, { resetPage: true }) });
  if (filters.assignee) {
    const name = people.get(filters.assignee)?.name ?? "Selected user";
    chips.push({ key: "assignee", label: `Assignee: ${filters.assignee === me?.id ? "You" : name}`, onRemove: () => set({ assignee: "" }, { resetPage: true }) });
  }
  if (filters.overdue) chips.push({ key: "overdue", label: "Overdue only", onRemove: () => set({ overdue: "" }, { resetPage: true }) });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search tasks"
            placeholder="Search tasks by title…"
            maxLength={100}
            className="h-9 pl-8"
            value={q.value}
            onChange={(e) => q.onChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!hideStatusPriority && (
            <>
              <SimpleSelect
                label="Filter by status"
                className="w-36"
                value={filters.status ?? "all"}
                onValueChange={(v) => set({ status: v === "all" ? "" : v }, { resetPage: true })}
                options={[{ value: "all", label: "All statuses" }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
              />
              <SimpleSelect
                label="Filter by priority"
                className="w-36"
                value={filters.priority ?? "all"}
                onValueChange={(v) => set({ priority: v === "all" ? "" : v }, { resetPage: true })}
                options={[{ value: "all", label: "All priorities" }, ...PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))]}
              />
            </>
          )}
          {showAssignee && (
            <SimpleSelect
              label="Filter by assignee"
              className="w-40"
              value={filters.assignee ?? "all"}
              onValueChange={(v) => set({ assignee: v === "all" ? "" : v }, { resetPage: true })}
              options={[
                { value: "all", label: "All assignees" },
                ...sorted.map((p) => ({ value: p.id, label: p.id === me?.id ? `${p.name} (you)` : p.name })),
              ]}
            />
          )}
          <SimpleSelect
            label="Sort tasks"
            className="w-44"
            value={filters.sortKey}
            onValueChange={(v) => set({ sort: v === "created-desc" ? "" : v }, { resetPage: true })}
            options={SORT_KEYS.map((k) => ({ value: k, label: SORTS[k].label }))}
          />
          <div className="flex items-center gap-2 px-1">
            <Switch id="overdue-only" checked={filters.overdue} onCheckedChange={(c) => set({ overdue: c ? "1" : "" }, { resetPage: true })} />
            <Label htmlFor="overdue-only" className="text-sm font-normal">
              Overdue
            </Label>
          </div>
        </div>
      </div>
      <FilterChips chips={chips} onClear={filters.reset} />
    </div>
  );
}
