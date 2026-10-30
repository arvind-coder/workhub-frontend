import "server-only";

const DEFAULT_API_BASE = "https://workhub-backend-9r7x.onrender.com";

/**
 * Backend origin. Routes are mounted under `/api/...`, so a trailing `/api`
 * (a common misconfiguration) is stripped to avoid `/api/api/...`.
 */
export function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE;
  return raw.replace(/\/+$/, "").replace(/\/api$/, "");
}

export const COOKIE_ACCESS = "wh_at";
export const COOKIE_REFRESH = "wh_rt";
