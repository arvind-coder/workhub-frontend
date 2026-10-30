// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const req = (path: string, cookies: Record<string, string> = {}) =>
  new NextRequest(`http://localhost:3000${path}`, {
    headers: Object.keys(cookies).length ? { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ") } : undefined,
  });
const location = (res: Response) => res.headers.get("location");

describe("protected route gate", () => {
  it("redirects unauthenticated visitors to /login and remembers the destination", () => {
    const res = proxy(req("/projects/abc?tab=members"));
    expect(res.status).toBe(307);
    expect(location(res)).toBe("http://localhost:3000/login?next=%2Fprojects%2Fabc%3Ftab%3Dmembers");
  });

  it.each(["/overview", "/my-tasks", "/projects", "/team", "/settings"])("protects %s", (path) => {
    expect(location(proxy(req(path)))).toContain("/login?next=");
  });

  it("lets unauthenticated users reach the auth pages (no redirect loop)", () => {
    for (const path of ["/login", "/register"]) {
      const res = proxy(req(path));
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("sends signed-in users away from the auth pages", () => {
    expect(location(proxy(req("/login", { wh_rt: "x" })))).toBe("http://localhost:3000/overview");
    expect(location(proxy(req("/register", { wh_at: "x" })))).toBe("http://localhost:3000/overview");
  });

  it("allows protected pages when a session cookie exists", () => {
    expect(location(proxy(req("/projects", { wh_rt: "x" })))).toBeNull();
  });

  it("routes / according to session state", () => {
    expect(location(proxy(req("/")))).toBe("http://localhost:3000/login");
    expect(location(proxy(req("/", { wh_rt: "x" })))).toBe("http://localhost:3000/overview");
  });
});
