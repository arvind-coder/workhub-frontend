import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACCESS, COOKIE_REFRESH, getApiBase } from "@/lib/server/config";
import {
  cacheSessionUser,
  clearSessionCookies,
  dropSessionUser,
  getSessionUser,
  isSecureRequest,
  refreshTokens,
  setSessionCookies,
  type TokenPair,
} from "@/lib/server/session";

/**
 * Backend-for-frontend proxy.
 *
 * The WorkHub API returns JWTs in JSON bodies. Instead of exposing them to
 * browser JavaScript, this route stores them in HttpOnly cookies, attaches the
 * Bearer header server-side, and transparently rotates the refresh token.
 */
export const maxDuration = 60;

// Only paths that exist in the backend's OpenAPI document are forwarded.
const ALLOWED_PATH = /^(auth\/(login|register|logout|me)|projects(\/[a-fA-F0-9]{24}(\/(members|tasks|stats)(\/[a-fA-F0-9]{24}(\/(role|comments|activities))?)?)?)?)$/;

const BODY_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ success: false, message }, { status });
}

/** CSRF defence in depth on top of SameSite=Lax: mutations must be same-origin. */
function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients; cookies are not auto-attached
  return origin === req.nextUrl.origin;
}

async function callBackend(
  req: NextRequest,
  backendPath: string,
  body: string | undefined,
  accessToken: string | undefined,
): Promise<Response> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  return fetch(`${getApiBase()}/api/${backendPath}${req.nextUrl.search}`, {
    method: req.method,
    headers,
    body,
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });
}

async function passthrough(res: Response): Promise<NextResponse> {
  const text = await res.text();
  return new NextResponse(text || null, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

async function handleLogin(req: NextRequest, body: string | undefined): Promise<NextResponse> {
  const res = await callBackend(req, "auth/login", body, undefined);
  if (!res.ok) return passthrough(res);

  const json = (await res.json()) as {
    data?: { user?: unknown; accessToken?: string; refreshToken?: string };
  };
  const { user, accessToken, refreshToken } = json.data ?? {};
  if (!user || !accessToken || !refreshToken) {
    return jsonError(502, "Unexpected response from the authentication service");
  }
  cacheSessionUser(refreshToken, user);
  const out = NextResponse.json({ success: true, data: { user } });
  setSessionCookies(out, { accessToken, refreshToken }, isSecureRequest(req));
  return out;
}

async function handleLogout(req: NextRequest): Promise<NextResponse> {
  const refreshToken = req.cookies.get(COOKIE_REFRESH)?.value;
  if (refreshToken) {
    dropSessionUser(refreshToken);
    try {
      await callBackend(req, "auth/logout", JSON.stringify({ refreshToken }), undefined);
    } catch {
      // Best effort: the local session is cleared regardless.
    }
  }
  const out = NextResponse.json({ success: true, data: { message: "Logged out" } });
  clearSessionCookies(out, isSecureRequest(req));
  return out;
}

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  const backendPath = path.join("/");

  if (!ALLOWED_PATH.test(backendPath)) return jsonError(404, "Not found");
  if (req.method !== "GET" && !isSameOrigin(req)) return jsonError(403, "Cross-origin request blocked");

  const body = BODY_METHODS.has(req.method) ? (await req.text()) || undefined : undefined;

  try {
    if (backendPath === "auth/login") return await handleLogin(req, body);
    if (backendPath === "auth/logout") return await handleLogout(req);
    if (backendPath === "auth/register") return await passthrough(await callBackend(req, backendPath, body, undefined));

    let access = req.cookies.get(COOKIE_ACCESS)?.value;
    const refresh = req.cookies.get(COOKIE_REFRESH)?.value;
    let rotated: TokenPair | undefined;

    const rotate = async (): Promise<"ok" | "rejected" | "unreachable"> => {
      if (!refresh) return "rejected";
      const result = await refreshTokens(refresh);
      if (!result.ok) return result.reason;
      rotated = result.tokens;
      access = result.tokens.accessToken;
      return "ok";
    };

    const expired = (): NextResponse => {
      const out = jsonError(401, "Your session has expired. Please sign in again.");
      clearSessionCookies(out, isSecureRequest(req));
      return out;
    };

    // Access cookie lapses with the 15 minute JWT; renew before calling.
    if (!access) {
      const status = await rotate();
      if (status === "rejected") return expired();
      if (status === "unreachable") return jsonError(503, "Unable to refresh your session. Please try again.");
    }

    const currentRefresh = () => rotated?.refreshToken ?? refresh;

    if (backendPath === "auth/me" && req.method === "GET") {
      const key = currentRefresh();
      const cached = key ? getSessionUser(key) : undefined;
      if (cached) {
        const out = NextResponse.json({ success: true, data: cached });
        if (rotated) setSessionCookies(out, rotated, isSecureRequest(req));
        return out;
      }
    }

    let res = await callBackend(req, backendPath, body, access);

    if (res.status === 401 && !rotated) {
      const status = await rotate();
      if (status === "rejected") return expired();
      if (status === "unreachable") return jsonError(503, "Unable to refresh your session. Please try again.");
      res = await callBackend(req, backendPath, body, access);
    }

    if (res.status === 401) return expired();

    if (backendPath === "auth/me" && res.ok) {
      const key = currentRefresh();
      const clone = (await res.clone().json().catch(() => null)) as { data?: unknown } | null;
      if (key && clone?.data) cacheSessionUser(key, clone.data);
    }

    const out = await passthrough(res);
    if (rotated) setSessionCookies(out, rotated, isSecureRequest(req));
    return out;
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return jsonError(
      timedOut ? 504 : 502,
      timedOut
        ? "The WorkHub API took too long to respond. It may be waking up; please retry."
        : "Unable to reach the WorkHub API.",
    );
  }
}

export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as DELETE,
};
