import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { formatDate, formatRelative } from "@/lib/utils/dates";
import type { Project } from "@/types/api";

export function ProjectCard({ project, layout }: { project: Project; layout: "grid" | "list" }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        "group block rounded-xl border bg-card p-4 shadow-xs outline-none transition-all hover:border-primary/40 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50",
        layout === "list" && "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6",
      )}
    >
      <div className={cn("min-w-0", layout === "list" && "sm:flex-1")}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate font-semibold group-hover:text-primary">{project.name}</h3>
          {layout === "grid" && <ProjectStatusBadge status={project.status} />}
        </div>
        <p className={cn("mt-1.5 text-sm text-muted-foreground", layout === "grid" ? "line-clamp-2 min-h-10" : "line-clamp-1")}>
          {project.description}
        </p>
      </div>
      <div className={cn("flex items-center gap-3 text-xs text-muted-foreground", layout === "grid" && "mt-4 border-t pt-3")}>
        {layout === "list" && <ProjectStatusBadge status={project.status} />}
        <span className="inline-flex items-center gap-1" title={`Created ${formatDate(project.createdAt)}`}>
          <CalendarClock aria-hidden className="size-3.5" />
          Updated {formatRelative(project.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
