import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { ORG_SCOPED_TABLES } from "./schema";

// `pg` is CommonJS; named ESM imports fail under raw tsx. Destructure the default.
const { Pool } = pg;

/**
 * Migration runner (PRD FR-1.6). Runs as the OWNER role, then applies RLS.
 *
 * Steps:
 *   1. Apply Drizzle SQL migrations.
 *   2. Enable + FORCE row-level security on every org-scoped table.
 *   3. Create the org-isolation policy on each. `organizations` keys on `id`;
 *      every other table keys on `org_id`. Policies are generated from the
 *      schema's table list so they cannot drift from the tables that exist.
 *   4. Ensure the app role has table privileges (default-privileges cover future
 *      tables; this covers the ones just created).
 *
 * Idempotent: safe to run repeatedly.
 */

const OWNER_URL =
  process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
const APP_ROLE = process.env.APP_DB_ROLE ?? "bi_app";

if (!OWNER_URL) {
  console.error("MIGRATION_DATABASE_URL or DATABASE_URL is required.");
  process.exit(1);
}

// GUC expressions used inside the policies.
//
// NULLIF(..., '') is load-bearing: on a POOLED connection that previously ran a
// scoped transaction, the LOCAL set_config reverts at COMMIT — and a custom `app.*`
// placeholder reverts to '' (empty string), not NULL. A bare ''::uuid would throw
// 22P02 instead of filtering. NULLIF collapses both "never set" (NULL) and "reset
// to empty" ('') to NULL, so `col = NULL` yields zero rows: deterministic
// fail-closed with no error, regardless of pool reuse.
const ORG_GUC = "NULLIF(current_setting('app.current_org_id', true), '')::uuid";
const ORG_GUC_RAW = "NULLIF(current_setting('app.current_org_id', true), '')";
const USER_GUC = "NULLIF(current_setting('app.current_user_id', true), '')::uuid";

// The column each table keys its org isolation on (organizations keys on its own id).
const ORG_KEY: Record<string, string> = { organizations: "id" };

/**
 * Per-table RLS predicates. Default: reads and writes both require the row's org to
 * equal the active org (app.current_org_id).
 *
 * Two tables relax READS in a *pure user context* (no active org) so login / the org
 * switcher can enumerate a user's own tenants — a read that is otherwise cross-org:
 *   - memberships:  a user may read their own membership rows across orgs.
 *   - organizations: a user may read the org records they are a member of.
 * Both relaxations are gated on `current_org_id IS NULL`, so when an org IS active
 * the query stays strictly org-isolated and cannot leak the user's other tenants.
 * WITH CHECK stays org-only on both, so writes always require an active org (a user
 * can neither insert themselves into an arbitrary org nor create an org out of context).
 */
function policyExprs(table: string): { using: string; check: string } {
  const key = ORG_KEY[table] ?? "org_id";
  const org = `"${key}" = ${ORG_GUC}`;
  if (table === "memberships") {
    return {
      using: `(${org}) OR (${ORG_GUC_RAW} IS NULL AND "user_id" = ${USER_GUC})`,
      check: org,
    };
  }
  if (table === "organizations") {
    // "orgs I belong to" — the membership subquery runs under memberships' own RLS,
    // which in a user context returns exactly this user's rows (no cycle: memberships'
    // policy references only GUCs, never organizations).
    return {
      using:
        `(${org}) OR (${ORG_GUC_RAW} IS NULL AND "id" IN ` +
        `(SELECT m.org_id FROM memberships m WHERE m.user_id = ${USER_GUC}))`,
      check: org,
    };
  }
  return { using: org, check: org };
}

async function main() {
  const pool = new Pool({ connectionString: OWNER_URL, max: 1 });
  const db = drizzle(pool);

  console.log("→ Applying Drizzle migrations…");
  await migrate(db, { migrationsFolder: "./src/lib/db/migrations" });
  console.log("  migrations applied.");

  console.log("→ Applying row-level security policies…");
  for (const table of ORG_SCOPED_TABLES) {
    const policy = `${table}_org_isolation`;
    const { using, check } = policyExprs(table);
    // Enable + force so RLS applies even to the table owner.
    await pool.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
    await pool.query(`DROP POLICY IF EXISTS "${policy}" ON "${table}";`);
    // USING filters reads; WITH CHECK filters writes. See policyExprs() for the rules.
    await pool.query(
      `CREATE POLICY "${policy}" ON "${table}"
         USING (${using})
         WITH CHECK (${check});`,
    );
    // Make sure the app role can operate on the table (default privs cover the
    // future; this covers tables that already existed at grant time).
    await pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON "${table}" TO ${APP_ROLE};`,
    );
    console.log(`  RLS on ${table}`);
  }

  // Grant sequence usage (uuid PKs don't need it, but bigint identity elsewhere might).
  await pool.query(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE};`,
  );

  console.log("✓ Migration + RLS complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
