import "server-only";

import { createHash } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { COOKIE_ACCESS, COOKIE_REFRESH, getApiBase } from "./config";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const FALLBACK_REFRESH_TTL_S = 60 * 60 * 24 * 7;
const FALLBACK_ACCESS_TTL_S = 60 * 15;
const REFRESH_REUSE_WINDOW_MS = 30_000;

/** Seconds until a JWT expires. Unverified decode: used only to size cookies. */
function secondsUntilExpiry(token: string, fallback: number): number {
  try {
    const payload = token.split(".")[1];
    if (!payload) return fallback;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: unknown;
    };
    if (typeof json.exp !== "number") return fallback;
    const ttl = Math.floor(json.exp - Date.now() / 1000);
    return ttl > 0 ? ttl : fallback;
  } catch {
    return fallback;
  }
}

/** `Secure` whenever the browser reached us over HTTPS (also behind a TLS-terminating proxy). */
export function isSecureRequest(req: NextRequest): boolean {
  const forwarded = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwarded ?? req.nextUrl.protocol.replace(":", "")) === "https";
}

const baseCookie = (secure: boolean) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure,
  path: "/",
});

export function setSessionCookies(res: NextResponse, tokens: TokenPair, secure: boolean): void {
  res.cookies.set(COOKIE_ACCESS, tokens.accessToken, {
    ...baseCookie(secure),
    maxAge: secondsUntilExpiry(tokens.accessToken, FALLBACK_ACCESS_TTL_S),
  });
  res.cookies.set(COOKIE_REFRESH, tokens.refreshToken, {
    ...baseCookie(secure),
    maxAge: secondsUntilExpiry(tokens.refreshToken, FALLBACK_REFRESH_TTL_S),
  });
}

export function clearSessionCookies(res: NextResponse, secure: boolean): void {
  res.cookies.set(COOKIE_ACCESS, "", { ...baseCookie(secure), maxAge: 0 });
  res.cookies.set(COOKIE_REFRESH, "", { ...baseCookie(secure), maxAge: 0 });
}

/**
 * The backend applies its strict auth rate limit (10 / 15 min per IP) to
 * /auth/me as well as login and refresh, and every user of this proxy shares
 * one egress IP. Login already returns the user, so the profile is cached
 * per session (keyed by a hash of the secret refresh token) and /auth/me is
 * answered from it. The entry moves along when the refresh token rotates.
 * Cache misses simply fall back to the real endpoint.
 */
const USER_TTL_MS = 10 * 60_000;
const USER_CACHE_MAX = 1000;
const userCache = new Map<string, { user: unknown; expires: number }>();
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function cacheSessionUser(refreshToken: string, user: unknown): void {
  if (userCache.size >= USER_CACHE_MAX) {
    const oldest = userCache.keys().next().value;
    if (oldest !== undefined) userCache.delete(oldest);
  }
  userCache.set(hashToken(refreshToken), { user, expires: Date.now() + USER_TTL_MS });
}

export function getSessionUser(refreshToken: string): unknown {
  const key = hashToken(refreshToken);
  const entry = userCache.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    userCache.delete(key);
    return undefined;
  }
  return entry.user;
}

export function dropSessionUser(refreshToken: string): void {
  userCache.delete(hashToken(refreshToken));
}

function moveSessionUser(from: string, to: string): void {
  const entry = userCache.get(hashToken(from));
  if (!entry) return;
  userCache.delete(hashToken(from));
  userCache.set(hashToken(to), entry);
}

export type RefreshResult =
  | { ok: true; tokens: TokenPair }
  | { ok: false; reason: "rejected" | "unreachable" };

/**
 * Backend refresh tokens rotate and are single-use. Parallel requests that all
 * carry the same expired session would otherwise race: the first succeeds and
 * the rest are rejected, logging the user out. Concurrent callers share one
 * in-flight request, and a successful result is reused briefly for requests
 * that were already in flight with the old cookie.
 *
 * Note: this is per server instance. On multi-instance serverless deployments
 * a cross-instance race is still possible (documented in the README).
 */
const refreshCache = new Map<string, Promise<RefreshResult>>();

export function refreshTokens(refreshToken: string): Promise<RefreshResult> {
  const existing = refreshCache.get(refreshToken);
  if (existing) return existing;

  const attempt = (async (): Promise<RefreshResult> => {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(60_000),
        cache: "no-store",
      });
      if (!res.ok) {
        // 4xx = token revoked/expired/reused. 429/5xx = transient, keep session.
        return { ok: false, reason: res.status >= 500 || res.status === 429 ? "unreachable" : "rejected" };
      }
      const json = (await res.json()) as { data?: Partial<TokenPair> };
      const { accessToken, refreshToken: next } = json.data ?? {};
      if (!accessToken || !next) return { ok: false, reason: "rejected" };
      moveSessionUser(refreshToken, next);
      return { ok: true, tokens: { accessToken, refreshToken: next } };
    } catch {
      return { ok: false, reason: "unreachable" };
    }
  })();

  refreshCache.set(refreshToken, attempt);
  const timer = setTimeout(() => refreshCache.delete(refreshToken), REFRESH_REUSE_WINDOW_MS);
  timer.unref?.();
  void attempt.then((r) => {
    if (!r.ok) refreshCache.delete(refreshToken);
  });
  return attempt;
}
