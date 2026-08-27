import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE } from "./cookies";
import { resolveSessionByToken, type ResolvedSession } from "./session";

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

/** Require an authenticated user or redirect to /login. */
export async function requireUser(): Promise<ResolvedSession> {
  const session = await getSession();
  if (!session) redirect("/login");
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
  if (!orgId) redirect("/onboarding");
  return { session, orgId };
}
