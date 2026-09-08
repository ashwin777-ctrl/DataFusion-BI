import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE } from "./cookies";
import { resolveSessionByToken, type ResolvedSession } from "./session";

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "No active organization context") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Request-scoped current-user access for Server Components, Server Actions, and
 * Route Handlers. `cache()` dedupes the DB work to once per request even if several
 * components call getSession().
 *
 * These only READ the cookie. Setting/clearing the session cookie happens in the
 * auth Route Handlers (login/logout), where mutating cookies is allowed.
 */

export const getSession = cache(async (): Promise<ResolvedSession | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return resolveSessionByToken(token);
});

/** Require an authenticated user or redirect to /login (or throw UnauthorizedError for API). */
export async function requireUser(): Promise<ResolvedSession> {
  const session = await getSession();
  if (!session) {
    try {
      const h = await headers();
      const accept = h.get("accept") || "";
      const path = h.get("x-url") || h.get("x-invoke-path") || "";
      if (accept.includes("application/json") || path.includes("/api/")) {
        throw new UnauthorizedError();
      }
    } catch (e) {
      if (e instanceof UnauthorizedError) throw e;
    }
    redirect("/login");
  }
  return session;
}

/**
 * Require an authenticated user WITH an active org, returning the org id to scope
 * DB access with. Falls back to the user's first org if the session has no active
 * org set; redirects to onboarding only if the user belongs to no org at all.
 */
export async function requireOrg(): Promise<{
  session: ResolvedSession;
  orgId: string;
}> {
  const session = await requireUser();
  const orgId = session.activeOrg?.id ?? session.memberships[0]?.id ?? null;
  if (!orgId) {
    try {
      const h = await headers();
      const accept = h.get("accept") || "";
      if (accept.includes("application/json")) {
        throw new ForbiddenError();
      }
    } catch (e) {
      if (e instanceof ForbiddenError) throw e;
    }
    redirect("/onboarding");
  }
  return { session, orgId };
}

