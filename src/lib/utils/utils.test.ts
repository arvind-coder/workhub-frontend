import { describe, expect, it } from "vitest";
import { dueInputToIso, dueIsoToInput, formatDue, isOverdue } from "./dates";
import { initials } from "./labels";
import { safeNextPath } from "./navigation";
import { canChangeMemberRoles, canCreateProject, canEditProject, isProjectManager, taskEditScope } from "./permissions";
import { buildQuery } from "@/lib/api/client";
import type { Project, Task, User } from "@/types/api";

const user = (role: User["role"], id = "u1"): User => ({ id, name: "N", email: "n@x.io", role, createdAt: "", updatedAt: "" });
const project = (ownerId = "u1"): Project => ({ id: "p1", name: "P", description: "d", ownerId, status: "active", createdAt: "", updatedAt: "" });
const task = (assignedTo?: string): Task => ({ id: "t1", title: "T", description: "d", projectId: "p1", assignedTo, createdBy: "u1", status: "TODO", priority: "LOW", createdAt: "", updatedAt: "" });

describe("safeNextPath (open-redirect guard)", () => {
  it("allows same-origin app paths", () => expect(safeNextPath("/projects/abc?tab=members")).toBe("/projects/abc?tab=members"));
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", null, undefined])("rejects %s", (v) => {
    expect(safeNextPath(v as string | null | undefined)).toBe("/overview");
  });
  it("never bounces back into auth pages or the API", () => {
    expect(safeNextPath("/login?next=/x")).toBe("/overview");
    expect(safeNextPath("/api/proxy/projects")).toBe("/overview");
  });
});

describe("due dates", () => {
  it("round-trips a calendar day through the API timestamp", () => {
    const iso = dueInputToIso("2030-06-30");
    expect(iso).toBe("2030-06-30T12:00:00.000Z");
    expect(dueIsoToInput(iso)).toBe("2030-06-30");
    expect(dueInputToIso("")).toBeUndefined();
  });
  it("renders the same calendar day regardless of timezone", () => {
    expect(formatDue("2030-06-30T12:00:00.000Z")).toBe("Jun 30");
    expect(formatDue(undefined)).toBeNull();
  });
  it("overdue = past due date and not done (no date is never overdue)", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    expect(isOverdue("2026-01-01T12:00:00.000Z", "TODO", now)).toBe(true);
    expect(isOverdue("2026-01-01T12:00:00.000Z", "DONE", now)).toBe(false);
    expect(isOverdue("2026-02-01T12:00:00.000Z", "IN_PROGRESS", now)).toBe(false);
    expect(isOverdue(undefined, "TODO", now)).toBe(false);
  });
});

describe("initials / buildQuery", () => {
  it("initials", () => {
    expect(initials("Priya Sharma")).toBe("PS");
    expect(initials("  madonna ")).toBe("M");
    expect(initials("Ana Maria Lopez")).toBe("AL");
    expect(initials(undefined)).toBe("?");
  });
  it("buildQuery drops empty values and encodes the rest", () => {
    expect(buildQuery({ page: 2, q: "a b", status: undefined, x: "", overdue: true })).toBe("?page=2&q=a+b&overdue=true");
    expect(buildQuery({})).toBe("");
  });
});

describe("permission hints", () => {
  it("only admins and project managers can create projects", () => {
    expect(canCreateProject(user("MEMBER"))).toBe(false);
    expect(canCreateProject(user("PROJECT_MANAGER"))).toBe(true);
    expect(canCreateProject(user("ADMIN"))).toBe(true);
  });
  it("project edit: admin, or a PM who owns it", () => {
    expect(canEditProject(user("PROJECT_MANAGER", "u1"), project("u1"))).toBe(true);
    expect(canEditProject(user("PROJECT_MANAGER", "u2"), project("u1"))).toBe(false);
    expect(canEditProject(user("MEMBER", "u1"), project("u1"))).toBe(false);
    expect(canEditProject(user("ADMIN", "u9"), project("u1"))).toBe(true);
  });
  it("manager = admin, owner, or PM membership", () => {
    expect(isProjectManager(user("MEMBER", "u2"), project("u1"))).toBe(false);
    expect(isProjectManager(user("MEMBER", "u2"), project("u1"), "PROJECT_MANAGER")).toBe(true);
    expect(isProjectManager(user("MEMBER", "u1"), project("u1"))).toBe(true);
  });
  it("only owner/admin change roles", () => {
    expect(canChangeMemberRoles(user("PROJECT_MANAGER", "u2"), project("u1"))).toBe(false);
    expect(canChangeMemberRoles(user("MEMBER", "u1"), project("u1"))).toBe(true);
  });
  it("task edit scope: managers full, assignee status-only, others none", () => {
    expect(taskEditScope(user("MEMBER", "u2"), task("u3"), true)).toBe("full");
    expect(taskEditScope(user("MEMBER", "u2"), task("u2"), false)).toBe("status");
    expect(taskEditScope(user("MEMBER", "u2"), task("u3"), false)).toBe("none");
    expect(taskEditScope(user("MEMBER", "u2"), task(undefined), false)).toBe("none");
  });
});
