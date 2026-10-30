import { NextResponse, type NextRequest } from "next/server";

const COOKIE_ACCESS = "wh_at";
const COOKIE_REFRESH = "wh_rt";
const AUTH_PAGES = new Set(["/login", "/register"]);

/**
 * Optimistic route gate. It only checks that a session cookie exists so that
 * unauthenticated visitors never reach protected pages. The cookie's validity
 * is enforced by the API proxy; when it is rejected the proxy clears the
 * cookies, which also prevents /login <-> /overview redirect loops.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.has(COOKIE_REFRESH) || req.cookies.has(COOKIE_ACCESS);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/overview" : "/login", req.url));
  }

  if (AUTH_PAGES.has(pathname)) {
    return hasSession ? NextResponse.redirect(new URL("/overview", req.url)) : NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
