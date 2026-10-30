import type { Person } from "@/features/members/hooks";
import type { Option } from "@/components/shared/simple-select";

export const UNASSIGNED = "__unassigned__";

/**
 * Selectable assignees. The API accepts only the project owner or a member, and
 * it has no user directory, so the choices are the people we can actually name.
 * A current assignee we cannot name (e.g. the owner) is kept so editing a task
 * never silently drops them.
 */
export function buildAssigneeOptions(
  people: Map<string, Person>,
  opts: { meId?: string; ownerId?: string; currentAssignee?: string },
): Option<string>[] {
  const list: Option<string>[] = [{ value: UNASSIGNED, label: "Unassigned" }];
  const sorted = [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const p of sorted) list.push({ value: p.id, label: p.id === opts.meId ? `${p.name} (you)` : p.name });
  const { currentAssignee } = opts;
  if (currentAssignee && !people.has(currentAssignee)) {
    list.push({ value: currentAssignee, label: currentAssignee === opts.ownerId ? "Project owner" : "Unknown user" });
  }
  return list;
}
