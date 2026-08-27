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
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // `/app/:path*` matches /app and everything beneath it; /onboarding is guarded too.
  matcher: ["/app/:path*", "/onboarding"],
};
