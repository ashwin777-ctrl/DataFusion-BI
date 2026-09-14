import { NextResponse, type NextRequest } from "next/server";

/**
 * Session cookie name. Inlined rather than imported from "@/lib/auth/cookies"
 * because that module is marked "server-only" and middleware runs on the edge
 * runtime, which can't load Node-only code. Keep this in sync with SESSION_COOKIE.
 */
const SESSION_COOKIE = "bi_session";

/**
 * Coarse auth gate at the edge. On a protected route with no session cookie, bounce
 * to /login before any rendering happens — cheap and keeps unauthenticated traffic
 * off the DB.
 *
 * This is a PRESENCE check only. It does NOT validate the token: a forged or expired
 * cookie still passes here and is authoritatively rejected server-side in
 * requireUser() -> resolveSessionByToken(), which clears it and redirects. The two
 * layers are intentional — the edge check is for speed, the server check is for trust.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE);

  // Set request headers so downstream Server Components & Route Handlers know the exact pathname
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  // Public health probe
  if (pathname.startsWith("/api/health")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // API protection: if calling protected API routes without session cookie, return 401
  if (pathname.startsWith("/api/")) {
    if (!hasSession) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // App page protection: if accessing /app/* or /onboarding without session cookie, redirect to /login
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Guard /app, /onboarding, and protected /api routes
  matcher: ["/app/:path*", "/onboarding", "/api/:path*"],
};
