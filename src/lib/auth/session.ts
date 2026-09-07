import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { unscoped, withUser, schema } from "@/lib/db";
import { newSessionToken, hashToken } from "./tokens";
import { SESSION_TTL_SECONDS } from "./cookies";

/**
 * Session & identity service (PRD FR-1.3).
 *
 * `users` and `sessions` carry no org_id and are accessed unscoped (pre-auth reads).
 * The user's org list is read with withUser(), the only cross-org read the RLS model
 * permits, and only because no org is active (see src/lib/db/migrate.ts policyExprs).
 * No function here trusts a client-supplied org id without checking membership first.
 */

export type MemberRole = "owner" | "admin" | "analyst" | "viewer";

export type SessionUser = { id: string; email: string; name: string | null };
export type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  role: MemberRole;
};
export type ResolvedSession = {
  user: SessionUser;
  sessionId: string;
  activeOrgId: string | null;
  memberships: OrgSummary[];
  activeOrg: OrgSummary | null;
};

/** The orgs a user belongs to, with their role — the switcher's data source. */
export async function listUserOrgs(userId: string): Promise<OrgSummary[]> {
  return withUser(userId, async (db) => {
    const rows = await db
      .select({
        id: schema.organizations.id,
        name: schema.organizations.name,
        slug: schema.organizations.slug,
        role: schema.memberships.role,
      })
      .from(schema.memberships)
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.memberships.orgId),
      )
      .where(
        and(
          eq(schema.memberships.userId, userId),
          isNull(schema.organizations.deletedAt),
        ),
      )
      .orderBy(schema.organizations.name);
    return rows as OrgSummary[];
  });
}

/**
 * Create a session for a user. Returns the raw token (for the cookie) and the
 * expiry; only the token's keyed digest is stored.
 */
export async function createSession(params: {
  userId: string;
  activeOrgId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const { token, tokenHash } = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await unscoped((db) =>
    db.insert(schema.sessions).values({
      userId: params.userId,
      tokenHash,
      activeOrgId: params.activeOrgId ?? null,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      expiresAt,
    }),
  );
  return { token, expiresAt };
}

// Short-lived in-memory cache (15s) to eliminate redundant database roundtrips across rapid parallel API requests
const SESSION_CACHE = new Map<string, { session: ResolvedSession; cachedUntil: number }>();

export function invalidateSessionCache(token: string) {
  const tokenHash = hashToken(token);
  SESSION_CACHE.delete(tokenHash);
}

/**
 * Resolve a raw token to the full session, or null if it is unknown, revoked,
 * expired, or belongs to a soft-deleted user. A stale active_org_id (the user was
 * removed from that org) is treated as "no active org" rather than trusted.
 */
export async function resolveSessionByToken(
  token: string,
): Promise<ResolvedSession | null> {
  const tokenHash = hashToken(token);
  const now = Date.now();

  const cached = SESSION_CACHE.get(tokenHash);
  if (cached && cached.cachedUntil > now) {
    return cached.session;
  }

  const row = await unscoped(async (db) => {
    const rows = await db
      .select({
        sessionId: schema.sessions.id,
        activeOrgId: schema.sessions.activeOrgId,
        expiresAt: schema.sessions.expiresAt,
        revokedAt: schema.sessions.revokedAt,
        userId: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        userDeletedAt: schema.users.deletedAt,
      })
      .from(schema.sessions)
      .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
      .where(eq(schema.sessions.tokenHash, tokenHash))
      .limit(1);
    return rows[0] ?? null;
  });

  if (!row) {
    SESSION_CACHE.delete(tokenHash);
    return null;
  }
  if (row.revokedAt || row.userDeletedAt || row.expiresAt.getTime() <= now) {
    SESSION_CACHE.delete(tokenHash);
    return null;
  }

  const memberships = await listUserOrgs(row.userId);
  const activeOrg =
    (row.activeOrgId && memberships.find((m) => m.id === row.activeOrgId)) ||
    null;

  const session: ResolvedSession = {
    user: { id: row.userId, email: row.email, name: row.name },
    sessionId: row.sessionId,
    activeOrgId: activeOrg ? activeOrg.id : null,
    memberships,
    activeOrg,
  };

  // Cache for 15 seconds (or until cookie expires)
  SESSION_CACHE.set(tokenHash, {
    session,
    cachedUntil: Math.min(now + 15_000, row.expiresAt.getTime()),
  });

  return session;
}

/** Revoke a session by its raw token (logout). Idempotent. */
export async function revokeSessionByToken(token: string): Promise<void> {
  invalidateSessionCache(token);
  const tokenHash = hashToken(token);
  await unscoped((db) =>
    db
      .update(schema.sessions)
      .set({ revokedAt: new Date() })
      .where(eq(schema.sessions.tokenHash, tokenHash)),
  );
}

/**
 * Point a session at a different active org. Verified against the user's real
 * membership list first, so a client cannot set an org it does not belong to.
 * Returns false if the user is not a member of the target org.
 */
export async function setActiveOrg(params: {
  sessionId: string;
  userId: string;
  orgId: string;
}): Promise<boolean> {
  const orgs = await listUserOrgs(params.userId);
  if (!orgs.some((o) => o.id === params.orgId)) return false;

  // Clear in-memory cache so next resolution picks up the new active org
  SESSION_CACHE.clear();

  await unscoped((db) =>
    db
      .update(schema.sessions)
      .set({ activeOrgId: params.orgId })
      .where(
        and(
          eq(schema.sessions.id, params.sessionId),
          eq(schema.sessions.userId, params.userId),
        ),
      ),
  );
  return true;
}
