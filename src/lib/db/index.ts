import "server-only";
import { Pool, type PoolClient } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * App database access (PRD FR-1.6). Connects as the non-superuser `bi_app` role
 * so RLS is enforced. Two entry points:
 *
 *   withOrg(orgId, fn)  — runs fn inside a transaction with app.current_org_id set,
 *                          so every org-scoped query is filtered by RLS. THE DEFAULT.
 *   unscoped(fn)        — for auth flows that must read across orgs (login, session
 *                          lookup) BEFORE an org context exists. Tables touched here
 *                          (users, sessions) are deliberately not org-scoped.
 *
 * There is no ambient/global db handle that skips the org context — that absence is
 * intentional. Getting a scoped handle requires choosing withOrg or unscoped.
 */

declare global {
  // Reuse the pool across HMR reloads in dev.
  var __biPool: Pool | undefined;
}

const pool =
  global.__biPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
if (env.NODE_ENV !== "production") global.__biPool = pool;

export type Db = NodePgDatabase<typeof schema>;

/**
 * Run `fn` in a transaction scoped to one organization. Sets
 * `app.current_org_id` as a LOCAL (transaction-lifetime) setting via set_config
 * so RLS policies filter every statement. The value is passed as a bound
 * parameter — never string-interpolated.
 */
export async function withOrg<T>(
  orgId: string,
  fn: (db: Db) => Promise<T>,
): Promise<T> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    // set_config(..., is_local => true) scopes the GUC to this transaction.
    await client.query("SELECT set_config('app.current_org_id', $1, true)", [
      orgId,
    ]);
    const db = drizzle(client, { schema });
    const result = await fn(db);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Unscoped access for pre-auth reads (login, session resolution). Restricted by
 * convention to tables that carry no org_id. Still runs on the bi_app role.
 */
export async function unscoped<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    const db = drizzle(client, { schema });
    return await fn(db);
  } finally {
    client.release();
  }
}

/**
 * Run `fn` in a transaction scoped to one USER (not an org). Sets
 * `app.current_user_id` as a LOCAL setting so the `memberships` policy exposes that
 * user's own rows across all their orgs — the only cross-org read the model allows,
 * and only because no org is active (see migrate.ts policyExprs). Use this to
 * enumerate a user's orgs at login and for the org switcher. It deliberately does
 * NOT set an org context, so no other org-scoped table is readable here.
 */
export async function withUser<T>(
  userId: string,
  fn: (db: Db) => Promise<T>,
): Promise<T> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [
      userId,
    ]);
    const db = drizzle(client, { schema });
    const result = await fn(db);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** A single scoped transaction that also exposes raw SQL, for multi-statement ops. */
export async function withOrgTx<T>(
  orgId: string,
  fn: (db: Db, raw: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_org_id', $1, true)", [
      orgId,
    ]);
    const db = drizzle(client, { schema });
    const result = await fn(db, client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function pingDb(): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    return true;
  } finally {
    client.release();
  }
}

export { schema, sql, pool };
