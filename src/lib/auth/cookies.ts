import "server-only";
import { env } from "@/env";

/**
 * Session cookie configuration (PRD FR-1.3, §12).
 *
 * httpOnly  — never readable by JS (XSS can't exfiltrate the session).
 * secure    — HTTPS-only in production (the env guard forbids http:// origins there).
 * sameSite  — "lax": sent on top-level navigations, blocked on cross-site POST (CSRF
 *             defense-in-depth alongside the origin check on mutations).
 * path "/"  — available to the whole app.
 * maxAge    — client-side hint; the authoritative expiry is sessions.expires_at,
 *             checked server-side on every resolve.
 */
export const SESSION_COOKIE = "bi_session";

/** Session lifetime, shared by the cookie maxAge and the DB expires_at. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type CookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge?: number;
};

export function sessionCookieOptions(maxAgeSeconds = SESSION_TTL_SECONDS): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Options for clearing the cookie (maxAge 0 expires it immediately). */
export function clearCookieOptions(): CookieOptions {
  return { httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/", maxAge: 0 };
}
