import { describe, expect, it } from "vitest";
import { addMemberSchema, commentSchema, loginSchema, projectSchema, registerSchema, taskSchema } from "./schemas";

const firstError = (r: { success: boolean; error?: { issues: Array<{ message: string }> } }) => r.error?.issues[0]?.message;

describe("loginSchema", () => {
  it("requires a valid email and a password", () => {
    expect(firstError(loginSchema.safeParse({ email: "", password: "x" }))).toBe("Email is required");
    expect(firstError(loginSchema.safeParse({ email: "nope", password: "x" }))).toBe("Enter a valid email address");
    expect(firstError(loginSchema.safeParse({ email: "a@b.co", password: "" }))).toBe("Password is required");
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
});

describe("registerSchema (mirrors backend limits)", () => {
  const ok = { name: "Priya", email: "p@x.io", password: "secret1" };
  it("accepts valid input", () => expect(registerSchema.safeParse(ok).success).toBe(true));
  it("enforces password 6–72", () => {
    expect(registerSchema.safeParse({ ...ok, password: "12345" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, password: "x".repeat(73) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, password: "x".repeat(72) }).success).toBe(true);
  });
  it("enforces name ≤ 100 and email ≤ 254", () => {
    expect(registerSchema.safeParse({ ...ok, name: "n".repeat(101) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, email: `${"a".repeat(250)}@b.co` }).success).toBe(false);
  });
});

describe("projectSchema", () => {
  it("requires name and description (both required by the API)", () => {
    expect(projectSchema.safeParse({ name: "", description: "d", status: "active" }).success).toBe(false);
    expect(projectSchema.safeParse({ name: "n", description: "  ", status: "active" }).success).toBe(false);
    expect(projectSchema.safeParse({ name: "n".repeat(151), description: "d", status: "active" }).success).toBe(false);
    expect(projectSchema.safeParse({ name: "n", description: "d", status: "active" }).success).toBe(true);
  });
  it("only allows the documented statuses", () => {
    expect(projectSchema.safeParse({ name: "n", description: "d", status: "paused" }).success).toBe(false);
  });
});

describe("taskSchema", () => {
  const base = { title: "Write docs", description: "d", status: "TODO", priority: "MEDIUM", assignedTo: "", dueDate: "" };
  it("title needs ≥ 3 characters", () => {
    expect(firstError(taskSchema.safeParse({ ...base, title: "ab" }))).toBe("Title must be at least 3 characters");
    expect(taskSchema.safeParse(base).success).toBe(true);
  });
  it("assignee must be empty or a 24-char hex id", () => {
    expect(taskSchema.safeParse({ ...base, assignedTo: "123" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...base, assignedTo: "64b0f1a2c3d4e5f6a7b8c9d0" }).success).toBe(true);
  });
  it("due date is empty or yyyy-MM-dd", () => {
    expect(taskSchema.safeParse({ ...base, dueDate: "2030-01-31" }).success).toBe(true);
    expect(taskSchema.safeParse({ ...base, dueDate: "31/01/2030" }).success).toBe(false);
  });
  it("rejects unknown status / priority", () => {
    expect(taskSchema.safeParse({ ...base, status: "BLOCKED" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...base, priority: "URGENT" }).success).toBe(false);
  });
});

describe("commentSchema / addMemberSchema", () => {
  it("rejects empty and whitespace-only comments, caps at 2000", () => {
    expect(firstError(commentSchema.safeParse({ message: "   " }))).toBe("Write a comment before posting");
    expect(commentSchema.safeParse({ message: "x".repeat(2001) }).success).toBe(false);
    expect(commentSchema.safeParse({ message: "Looks good" }).success).toBe(true);
  });
  it("member user id must be a 24-char hex id and role a known role", () => {
    expect(addMemberSchema.safeParse({ userId: "bad", role: "MEMBER" }).success).toBe(false);
    expect(addMemberSchema.safeParse({ userId: "64b0f1a2c3d4e5f6a7b8c9d0", role: "OWNER" }).success).toBe(false);
    expect(addMemberSchema.safeParse({ userId: " 64b0f1a2c3d4e5f6a7b8c9d0 ", role: "PROJECT_MANAGER" }).success).toBe(true);
  });
});
