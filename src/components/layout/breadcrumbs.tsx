"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useProject } from "@/features/projects/hooks";
import { objectIdPattern } from "@/lib/validations/schemas";

const TITLES: Record<string, string> = {
  overview: "Overview",
  "my-tasks": "My Tasks",
  projects: "Projects",
  team: "Team",
  settings: "Settings",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const [root, projectId] = pathname.split("/").filter(Boolean);
  const isProjectPage = root === "projects" && Boolean(projectId);
  const validId = objectIdPattern.test(projectId ?? "");
  const project = useProject(projectId ?? "", isProjectPage && validId);

  const crumbs: Array<{ label: string; href?: string }> = [{ label: TITLES[root ?? ""] ?? "WorkHub", href: isProjectPage ? "/projects" : undefined }];
  if (isProjectPage) crumbs.push({ label: project.data?.name ?? (project.isError || !validId ? "Project" : "Loading…") });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.label + i}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem className="min-w-0">
              {crumb.href ? (
                <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="max-w-[40vw] truncate sm:max-w-xs">{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
