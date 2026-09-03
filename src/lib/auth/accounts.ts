import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { PoolClient } from "pg";
import { unscoped, withOrgTx, schema, type Db } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import { slugify } from "./validation";

/**
 * Account lifecycle (PRD FR-1.2 / FR-1.4). The DB-facing half of auth: create an
 * account, verify credentials, record a login. Session issuance and cookies live in
 * session.ts / the server actions; this module never touches the request.
 *
 * RLS note: `users` and `sessions` carry no org_id (no policy), so they are written
 * unscoped. `organizations` and `memberships` are org-scoped, and their WITH CHECK
 * requires an active org — so account+org creation runs inside withOrgTx(newOrgId),
 * where the freshly-minted org id IS the active org. The whole account is one
 * transaction: a failure leaves neither a stray user nor a half-built org.
 */

export type CreateAccountInput = {
  email: string; // already normalized (lowercased) by the schema
  password: string;
  name: string | null;
  orgName: string;
};

export type CreateAccountResult =
  | { ok: true; userId: string; orgId: string }
  | { ok: false; reason: "email_taken" };

// Sentinel thrown by the friendly pre-check; distinct from the DB's own 23505.
const EMAIL_TAKEN = "EMAIL_TAKEN";
const SLUG_MAX_TRIES = 6;

function pgCode(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null) return undefined;
  if ("code" in e && typeof (e as { code: unknown }).code === "string") {
    return (e as { code: string }).code;
  }
  if (
    "cause" in e &&
    typeof (e as { cause: unknown }).cause === "object" &&
    (e as { cause: unknown }).cause !== null
  ) {
    const cause = (e as { cause: Record<string, unknown> }).cause;
    if ("code" in cause && typeof cause.code === "string") {
      return cause.code;
    }
  }
  return undefined;
}

/**
 * Insert an organization, resolving slug collisions via a savepoint retry. RLS hides
 * other orgs' slugs from bi_app, so we can't pre-check availability — instead we try
 * the clean slug, and on the UNIQUE violation (23505) roll back just that statement
 * and retry with a short random suffix. The savepoint is essential: without it the
 * failed INSERT would poison the whole transaction.
 */
async function insertOrgWithUniqueSlug(
  db: Db,
  raw: PoolClient,
  orgId: string,
  name: string,
): Promise<void> {
  const base = slugify(name);
  for (let attempt = 0; attempt < SLUG_MAX_TRIES; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomUUID().slice(0, 4)}`;
    await raw.query("SAVEPOINT org_slug");
    try {
      await db.insert(schema.organizations).values({ id: orgId, name, slug });
      await raw.query("RELEASE SAVEPOINT org_slug");
      return;
    } catch (e) {
      if (pgCode(e) === "23505") {
        await raw.query("ROLLBACK TO SAVEPOINT org_slug");
        continue; // slug already exists — try another suffix
      }
      throw e;
    }
  }
  throw new Error(`could not allocate a unique slug for "${name}"`);
}

/**
 * Create a user, their first organization, and an owner membership — atomically.
 * Returns { ok:false, reason:"email_taken" } if the email is already registered
 * (checked up front and again via the UNIQUE index, to close the check-then-insert
 * race). The password is hashed BEFORE opening the transaction so the argon2 work
 * never holds a pooled DB connection.
 */
export async function createAccount(
  input: CreateAccountInput,
): Promise<CreateAccountResult> {
  const orgId = randomUUID();
  const passwordHash = await hashPassword(input.password);

  try {
    const userId = await withOrgTx(orgId, async (db, raw) => {
      const existing = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, input.email))
        .limit(1);
      if (existing.length > 0) throw new Error(EMAIL_TAKEN);

      const [user] = await db
        .insert(schema.users)
        .values({ email: input.email, passwordHash, name: input.name })
        .returning({ id: schema.users.id });
      if (!user) throw new Error("user insert returned no row");

      await insertOrgWithUniqueSlug(db, raw, orgId, input.orgName);
      await db
        .insert(schema.memberships)
        .values({ userId: user.id, orgId, role: "owner" });

      return user.id;
    });
    return { ok: true, userId, orgId };
  } catch (e) {
    // Friendly pre-check, or the UNIQUE index catching a concurrent signup.
    if (e instanceof Error && e.message === EMAIL_TAKEN) {
      return { ok: false, reason: "email_taken" };
    }
    if (pgCode(e) === "23505") return { ok: false, reason: "email_taken" };
    throw e;
  }
}

/**
 * Create an additional organization for an existing user (used by onboarding when a
 * user belongs to no org). Same RLS shape as signup, minus the user insert.
 */
export async function createOrganization(params: {
  userId: string;
  name: string;
}): Promise<{ orgId: string }> {
  const orgId = randomUUID();
  await withOrgTx(orgId, async (db, raw) => {
    await insertOrgWithUniqueSlug(db, raw, orgId, params.name);
    await db
      .insert(schema.memberships)
      .values({ userId: params.userId, orgId, role: "owner" });
  });
  return { orgId };
}

export type AuthResult = { ok: true; userId: string } | { ok: false };

// Lazily computed once per process: a real argon2 hash to verify against when no
// user matches, so login timing doesn't reveal whether an email is registered.
let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  return (dummyHashPromise ??= hashPassword("no-such-user-timing-guard"));
}

/**
 * Verify an email + password. Runs a hash verification on every call — against the
 * real hash if the user exists, otherwise a dummy — so a missing account and a wrong
 * password take indistinguishable time. Soft-deleted users always fail.
 */
export async function authenticate(
  email: string,
  password: string,
): Promise<AuthResult> {
  const row = await unscoped(async (db) => {
    const rows = await db
      .select({
        id: schema.users.id,
        passwordHash: schema.users.passwordHash,
        deletedAt: schema.users.deletedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return rows[0] ?? null;
  });

  const hashToCheck = row?.passwordHash ?? (await dummyHash());
  const passwordOk = await verifyPassword(hashToCheck, password);

  if (!row || row.deletedAt || !passwordOk) return { ok: false };
  return { ok: true, userId: row.id };
}

/** Stamp last_login_at after a successful login. Best-effort; never blocks auth. */
export async function markLoggedIn(userId: string): Promise<void> {
  await unscoped((db) =>
    db
      .update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, userId)),
  );
}
