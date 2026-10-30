import { ApiError } from "./errors";
import type { Pagination } from "@/types/api";

const BASE = "/api/proxy";

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  pagination?: Pagination;
  message?: string;
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** The auth provider registers a single handler so 401s are handled uniformly. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

export function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

async function send<T>(path: string, opts: RequestOptions): Promise<Envelope<T>> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${buildQuery(opts.query)}`, {
      method: opts.method ?? "GET",
      headers: opts.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Network error. Check your connection and try again.", 0, true);
  }

  let json: Partial<Envelope<T>> | null = null;
  try {
    json = (await res.json()) as Partial<Envelope<T>>;
  } catch {
    json = null;
  }

  if (!res.ok || json?.success === false) {
    const message = json?.message || `Request failed (${res.status})`;
    // Login/register 401s are bad credentials, not an expired session.
    if (res.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/register")) {
      onUnauthorized?.();
    }
    throw new ApiError(message, res.status);
  }

  return json as Envelope<T>;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  return (await send<T>(path, opts)).data;
}

export async function apiRequestPage<T>(path: string, opts: RequestOptions = {}) {
  const envelope = await send<T[]>(path, opts);
  return {
    items: envelope.data,
    pagination: envelope.pagination ?? { page: 1, limit: envelope.data.length, total: envelope.data.length, totalPages: 1 },
  };
}
