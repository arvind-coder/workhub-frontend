// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const BACKEND = "https://workhub-backend-9r7x.onrender.com";
const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ctx = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
const call = (method: "GET" | "POST", path: string, opts: { cookie?: string; body?: unknown; origin?: string } = {}) =>
  new NextRequest(`http://localhost:3000/api/proxy/${path}`, {
    method,
    headers: { ...(opts.cookie ? { cookie: opts.cookie } : {}), ...(opts.origin ? { origin: opts.origin } : {}), "content-type": "application/json" },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
const setCookies = (res: Response) => res.headers.getSetCookie();

// A syntactically valid JWT with a given exp (unsigned: the proxy only decodes it to size the cookie).
const jwt = (expInS: number) =>
  `h.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expInS })).toString("base64url")}.s`;

describe("BFF proxy: login", () => {
  it("stores tokens in HttpOnly cookies and never returns them to the browser", async () => {
    const access = jwt(900), refresh = jwt(604800);
    fetchMock.mockResolvedValue(json({ success: true, data: { user: { id: "u1", name: "P" }, accessToken: access, refreshToken: refresh } }));
    const res = await POST(call("POST", "auth/login", { body: { email: "a@b.co", password: "x" } }), ctx("auth/login"));

    const body = await res.text();
    expect(JSON.parse(body)).toEqual({ success: true, data: { user: { id: "u1", name: "P" } } });
    expect(body).not.toContain(access);
    expect(body).not.toContain(refresh);

    const cookies = setCookies(res);
    expect(cookies).toHaveLength(2);
    for (const c of cookies) {
      expect(c).toMatch(/HttpOnly/i);
      expect(c).toMatch(/SameSite=lax/i);
    }
    expect(cookies.find((c) => c.startsWith("wh_at="))).toMatch(/Max-Age=(89\d|900)/);
    expect(cookies.find((c) => c.startsWith("wh_rt="))).toMatch(/Max-Age=60[34]\d{3}/);
    expect(fetchMock.mock.calls[0]![0]).toBe(`${BACKEND}/api/auth/login`);
  });

  it("passes a bad-credentials 401 through without touching cookies", async () => {
    fetchMock.mockResolvedValue(json({ success: false, message: "Invalid email or password" }, 401));
    const res = await POST(call("POST", "auth/login", { body: {} }), ctx("auth/login"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ success: false, message: "Invalid email or password" });
    expect(setCookies(res)).toHaveLength(0);
  });
});

describe("BFF proxy: authenticated calls", () => {
  it("attaches the Bearer token from the cookie", async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: [] }));
    const res = await GET(call("GET", "projects", { cookie: "wh_at=ACCESS; wh_rt=REFRESH" }), ctx("projects"));
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0]![1].headers.authorization).toBe("Bearer ACCESS");
  });

  it("returns 401 and clears cookies when there is no session", async () => {
    const res = await GET(call("GET", "projects"), ctx("projects"));
    expect(res.status).toBe(401);
    expect(setCookies(res).every((c) => /Max-Age=0/.test(c))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes an expired access token once, retries, and sets rotated cookies", async () => {
    const newAccess = jwt(900), newRefresh = jwt(604800);
    fetchMock
      .mockResolvedValueOnce(json({ success: false, message: "expired" }, 401)) // original call
      .mockResolvedValueOnce(json({ success: true, data: { accessToken: newAccess, refreshToken: newRefresh } })) // refresh
      .mockResolvedValueOnce(json({ success: true, data: [{ id: "p1" }] })); // retry
    const res = await GET(call("GET", "projects", { cookie: "wh_at=OLD; wh_rt=ROTATE-ME-1" }), ctx("projects"));

    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[1]![0]).toBe(`${BACKEND}/api/auth/refresh`);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ refreshToken: "ROTATE-ME-1" });
    expect(fetchMock.mock.calls[2]![1].headers.authorization).toBe(`Bearer ${newAccess}`);
    expect(setCookies(res).some((c) => c.startsWith(`wh_rt=${newRefresh}`))).toBe(true);
  });

  it("shares ONE refresh between parallel requests (refresh tokens are single-use)", async () => {
    const newAccess = jwt(900), newRefresh = jwt(604800);
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/api/auth/refresh")
        ? json({ success: true, data: { accessToken: newAccess, refreshToken: newRefresh } })
        : json({ success: true, data: [] }),
    );
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => GET(call("GET", "projects", { cookie: "wh_rt=PARALLEL-RT" }), ctx("projects"))),
    );
    expect(responses.every((r) => r.status === 200)).toBe(true);
    const refreshCalls = fetchMock.mock.calls.filter(([u]) => String(u).endsWith("/api/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("clears the session when the refresh token is rejected", async () => {
    fetchMock.mockResolvedValue(json({ success: false, message: "Invalid refresh token" }, 401));
    const res = await GET(call("GET", "projects", { cookie: "wh_rt=REVOKED-RT" }), ctx("projects"));
    expect(res.status).toBe(401);
    expect(setCookies(res).every((c) => /Max-Age=0/.test(c))).toBe(true);
  });

  it("keeps the session (503) if the refresh endpoint is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const res = await GET(call("GET", "projects", { cookie: "wh_rt=OFFLINE-RT" }), ctx("projects"));
    expect(res.status).toBe(503);
    expect(setCookies(res)).toHaveLength(0);
  });

  it("maps a backend outage to a 502 JSON error", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const res = await GET(call("GET", "projects", { cookie: "wh_at=A; wh_rt=B" }), ctx("projects"));
    expect(res.status).toBe(502);
    expect((await res.json()).message).toMatch(/unable to reach/i);
  });
});

describe("BFF proxy: hardening", () => {
  it("only forwards documented backend paths", async () => {
    for (const path of ["auth/refresh", "health", "docs", "projects/not-an-id", "users/64b0f1a2c3d4e5f6a7b8c9d0", "users/me"]) {
      const res = await GET(call("GET", path, { cookie: "wh_at=A" }), ctx(path));
      expect(res.status).toBe(404);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards nested project routes", async () => {
    fetchMock.mockImplementation(async () => json({ success: true, data: [] }));
    const id = "64b0f1a2c3d4e5f6a7b8c9d0";
    for (const path of ["users", `projects/${id}`, `projects/${id}/members`, `projects/${id}/tasks/${id}/comments`, `projects/${id}/tasks/${id}/activities`, `projects/${id}/stats`, `projects/${id}/members/${id}/role`]) {
      expect((await GET(call("GET", path, { cookie: "wh_at=A" }), ctx(path))).status).toBe(200);
    }
  });

  it("blocks cross-origin mutations", async () => {
    const res = await POST(call("POST", "projects", { cookie: "wh_at=A", origin: "https://evil.example", body: {} }), ctx("projects"));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logout revokes the refresh token upstream and clears cookies", async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: { message: "ok" } }));
    const res = await POST(call("POST", "auth/logout", { cookie: "wh_at=A; wh_rt=LOGOUT-RT" }), ctx("auth/logout"));
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0]![0]).toBe(`${BACKEND}/api/auth/logout`);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ refreshToken: "LOGOUT-RT" });
    expect(setCookies(res).every((c) => /Max-Age=0/.test(c))).toBe(true);
  });
});
