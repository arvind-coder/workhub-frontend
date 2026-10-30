/** Only same-origin absolute paths are allowed as post-login destinations. */
export function safeNextPath(next: string | null | undefined, fallback = "/overview") {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.startsWith("/login") || next.startsWith("/register") || next.startsWith("/api")) return fallback;
  return next;
}
