/**
 * RLS enforcement probe (PRD FR-1.6 — security gate for S0).
 *
 * Proving that policies EXIST is not enough; this proves they ENFORCE. It runs as
 * the real request-time role (bi_app, NOSUPERUSER + NOBYPASSRLS) and uses the exact
 * GUC mechanism the app uses (set_config('app.current_org_id', $1, true) inside a
 * transaction — see src/lib/db/index.ts withOrg), then asserts tenant isolation on
 * every access path:
 *
 *   0. Role sanity      — bi_app is not superuser and cannot bypass RLS.
 *   0b. FORCE RLS       — every org-scoped table has RLS enabled AND forced (so even
 *                          the table owner is filtered — no accidental bypass).
 *   1. Read isolation   — org A sees only org A's rows.
 *   2. Write guard      — INSERT with a foreign org_id is rejected (WITH CHECK).
 *   3. Update isolation — UPDATE targeting another org affects 0 rows (USING hides them).
 *   4. Delete isolation — DELETE targeting another org affects 0 rows.
 *   5. Fail-closed      — with NO org context, queries return 0 rows (never "all rows").
 *
 * Idempotent: uses two fixed test org ids and scrubs them before and after.
 *
 *   node --env-file=.env scripts/verify-rls.mjs
 */
import pg from "pg";
const { Pool } = pg;

const APP_URL = process.env.DATABASE_URL;
if (!APP_URL) {
  console.error("DATABASE_URL is required (run with: node --env-file=.env …).");
  process.exit(1);
}

// Fixed, obviously-synthetic ids so the probe is idempotent and leaves no residue.
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_1 = "11111111-1111-4111-8111-111111111111";
const USER_2 = "22222222-2222-4222-8222-222222222222";

const ORG_SCOPED_TABLES = [
  "organizations", "memberships", "invitations", "pg_connections",
  "source_files", "sources", "column_profiles", "datasets", "dataset_sources",
  "relationships", "transform_steps", "semantic_models", "quality_reports",
  "insights", "reports", "report_exports", "audit_log", "jobs",
];

const pool = new Pool({ connectionString: APP_URL, max: 4 });

let failures = 0;
function check(name, cond, detail = "") {
  const ok = !!cond;
  if (!ok) failures++;
  console.log(`  ${ok ? "✓ PASS" : "✗ FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

/** Mirror of withOrg(): a transaction with app.current_org_id set as a LOCAL GUC. */
async function withOrg(orgId, fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** A raw connection with NO org context set. */
async function withoutContext(fn) {
  const c = await pool.connect();
  try {
    return await fn(c);
  } finally {
    c.release();
  }
}

async function seedOrg(orgId, slug, sha) {
  await withOrg(orgId, async (c) => {
    await c.query(
      "INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3)",
      [orgId, `RLS Test ${slug}`, slug],
    );
    await c.query(
      `INSERT INTO source_files
         (org_id, original_name, storage_path, byte_size, sha256, detected_kind)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orgId, `${slug}.xlsx`, `/dev/null/${slug}`, 1, sha, "xlsx"],
    );
  });
}

async function scrub() {
  // Deletes are themselves RLS-scoped, so remove each org under its own context;
  // memberships/source_files cascade from the org. Users are not org-scoped.
  for (const org of [ORG_A, ORG_B]) {
    await withOrg(org, (c) =>
      c.query("DELETE FROM organizations WHERE id = $1", [org]),
    );
  }
  await withoutContext((c) =>
    c.query("DELETE FROM users WHERE id = ANY($1)", [[USER_1, USER_2]]),
  );
}

/** users carries no org_id (no RLS), so seed it in an unscoped context. */
async function seedUsers() {
  await withoutContext(async (c) => {
    for (const [id, n] of [[USER_1, "1"], [USER_2, "2"]]) {
      await c.query(
        "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)",
        [id, `rls-test-user-${n}@example.test`, "x"],
      );
    }
  });
}

/**
 * Membership graph: U1 belongs to BOTH orgs, U2 only to A. Inserts are org-scoped
 * writes, so each runs under its org context (proving WITH CHECK accepts them).
 */
async function seedMemberships() {
  await withOrg(ORG_A, async (c) => {
    await c.query(
      "INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'owner')",
      [USER_1, ORG_A],
    );
    await c.query(
      "INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'analyst')",
      [USER_2, ORG_A],
    );
  });
  await withOrg(ORG_B, (c) =>
    c.query(
      "INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, 'owner')",
      [USER_1, ORG_B],
    ),
  );
}

/** A transaction with BOTH org and user context set — for the anti-footgun test. */
async function withOrgAndUser(orgId, userId, fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);
    await c.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Mirror of withUser(): a transaction with only app.current_user_id set. */
async function withUser(userId, fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

async function main() {
  console.log("RLS enforcement probe — role, forcing, and per-path isolation\n");

  // ── 0. Role sanity ─────────────────────────────────────────────────────────
  const role = await withoutContext((c) =>
    c.query(
      `SELECT current_user AS who,
              rolsuper      AS super,
              rolbypassrls  AS bypass
         FROM pg_roles WHERE rolname = current_user`,
    ),
  );
  const r0 = role.rows[0];
  check("connected as bi_app", r0.who === "bi_app", `current_user=${r0.who}`);
  check("role is NOT superuser", r0.super === false, `rolsuper=${r0.super}`);
  check("role CANNOT bypass RLS", r0.bypass === false, `rolbypassrls=${r0.bypass}`);

  // ── 0b. RLS enabled AND forced on every org-scoped table ─────────────────────
  const rls = await withoutContext((c) =>
    c.query(
      `SELECT relname, relrowsecurity AS enabled, relforcerowsecurity AS forced
         FROM pg_class
        WHERE relkind = 'r' AND relname = ANY($1)`,
      [ORG_SCOPED_TABLES],
    ),
  );
  const missing = ORG_SCOPED_TABLES.filter(
    (t) => !rls.rows.some((r) => r.relname === t && r.enabled && r.forced),
  );
  check(
    `RLS enabled + forced on all ${ORG_SCOPED_TABLES.length} org-scoped tables`,
    missing.length === 0,
    missing.length ? `missing/unforced: ${missing.join(", ")}` : "all forced",
  );

  // ── Seed two isolated tenants + a shared user graph ──────────────────────────
  await scrub();
  await seedOrg(ORG_A, "org-a", "a".repeat(64));
  await seedOrg(ORG_B, "org-b", "b".repeat(64));
  await seedUsers();
  await seedMemberships();

  // ── 1. Read isolation ────────────────────────────────────────────────────────
  for (const [org, other] of [[ORG_A, ORG_B], [ORG_B, ORG_A]]) {
    const res = await withOrg(org, (c) =>
      c.query(
        `SELECT
           (SELECT count(*)::int FROM organizations)                        AS orgs,
           (SELECT count(*)::int FROM source_files)                         AS files,
           (SELECT count(*)::int FROM source_files WHERE org_id = $1)       AS leaked`,
        [other],
      ),
    );
    const { orgs, files, leaked } = res.rows[0];
    const tag = org === ORG_A ? "A" : "B";
    check(
      `org ${tag} sees exactly its own org + file, none of the other`,
      orgs === 1 && files === 1 && leaked === 0,
      `orgs=${orgs} files=${files} leaked=${leaked}`,
    );
  }

  // ── 2. Cross-org INSERT is rejected by WITH CHECK ────────────────────────────
  let insertBlocked = false;
  let insertCode = null;
  try {
    await withOrg(ORG_A, (c) =>
      c.query(
        `INSERT INTO source_files
           (org_id, original_name, storage_path, byte_size, sha256, detected_kind)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [ORG_B, "evil.xlsx", "/x", 1, "c".repeat(64), "xlsx"],
      ),
    );
  } catch (e) {
    insertBlocked = true;
    insertCode = e.code; // 42501 = RLS WITH CHECK violation
  }
  check(
    "cross-org INSERT (org_id=B while scoped to A) is rejected",
    insertBlocked && insertCode === "42501",
    `blocked=${insertBlocked} code=${insertCode}`,
  );

  // ── 3. Cross-org UPDATE affects nothing (other org invisible) ────────────────
  const upd = await withOrg(ORG_A, (c) =>
    c.query("UPDATE source_files SET status = 'tampered' WHERE org_id = $1", [ORG_B]),
  );
  check("cross-org UPDATE affects 0 rows", upd.rowCount === 0, `rowCount=${upd.rowCount}`);

  // ── 4. Cross-org DELETE affects nothing ──────────────────────────────────────
  const del = await withOrg(ORG_A, (c) =>
    c.query("DELETE FROM source_files WHERE org_id = $1", [ORG_B]),
  );
  check("cross-org DELETE affects 0 rows", del.rowCount === 0, `rowCount=${del.rowCount}`);

  // Confirm B's row is genuinely intact (not silently mutated) — read it as B.
  const bIntact = await withOrg(ORG_B, (c) =>
    c.query("SELECT status FROM source_files WHERE org_id = $1", [ORG_B]),
  );
  check(
    "org B's row is untouched by A's update/delete attempts",
    bIntact.rows.length === 1 && bIntact.rows[0].status === "uploaded",
    `rows=${bIntact.rows.length} status=${bIntact.rows[0]?.status}`,
  );

  // ── 4b. memberships dual-GUC: org-context stays org-isolated ─────────────────
  const mOrgA = await withOrg(ORG_A, (c) =>
    c.query(
      `SELECT count(*)::int AS n,
              coalesce(bool_or(org_id <> $1), false) AS leak
         FROM memberships`,
      [ORG_A],
    ),
  );
  check(
    "org context A: sees exactly org A's 2 memberships, no other org's",
    mOrgA.rows[0].n === 2 && mOrgA.rows[0].leak === false,
    `n=${mOrgA.rows[0].n} leak=${mOrgA.rows[0].leak}`,
  );

  // User context: a user sees only THEIR OWN memberships, across all their orgs.
  const mU1 = await withUser(USER_1, (c) =>
    c.query(
      `SELECT count(*)::int AS n,
              coalesce(bool_or(user_id <> $1), false) AS leak
         FROM memberships`,
      [USER_1],
    ),
  );
  check(
    "user context U1: sees own 2 memberships (both orgs), no one else's",
    mU1.rows[0].n === 2 && mU1.rows[0].leak === false,
    `n=${mU1.rows[0].n} leak=${mU1.rows[0].leak}`,
  );
  const mU2 = await withUser(USER_2, (c) =>
    c.query("SELECT count(*)::int AS n FROM memberships"),
  );
  check(
    "user context U2: sees only its single membership",
    mU2.rows[0].n === 1,
    `n=${mU2.rows[0].n}`,
  );

  // Anti-footgun: with BOTH org A and user U1 set, the user clause is suppressed
  // (it is gated on org IS NULL), so U1's org-B membership must NOT appear.
  const mBoth = await withOrgAndUser(ORG_A, USER_1, (c) =>
    c.query(
      `SELECT count(*)::int AS n,
              coalesce(bool_or(org_id = $1), false) AS leaked_b
         FROM memberships`,
      [ORG_B],
    ),
  );
  check(
    "org A + user U1: still org-isolated — U1's org-B membership is NOT leaked",
    mBoth.rows[0].n === 2 && mBoth.rows[0].leaked_b === false,
    `n=${mBoth.rows[0].n} leaked_b=${mBoth.rows[0].leaked_b}`,
  );

  // organizations readable in user context = exactly the orgs the user belongs to,
  // so the switcher can join memberships → organizations for names. U1 ∈ {A,B}, U2 ∈ {A}.
  const oU1 = await withUser(USER_1, (c) =>
    c.query(
      `SELECT count(*)::int AS n,
              coalesce(bool_and(id = ANY($1)), false) AS all_mine
         FROM organizations`,
      [[ORG_A, ORG_B]],
    ),
  );
  check(
    "user context U1: reads exactly its 2 member orgs (for the switcher join)",
    oU1.rows[0].n === 2 && oU1.rows[0].all_mine === true,
    `n=${oU1.rows[0].n} all_mine=${oU1.rows[0].all_mine}`,
  );
  const oU2 = await withUser(USER_2, (c) =>
    c.query(
      `SELECT count(*)::int AS n,
              coalesce(bool_or(id = $1), false) AS sees_b
         FROM organizations`,
      [ORG_B],
    ),
  );
  check(
    "user context U2: reads only org A, never org B (not a member)",
    oU2.rows[0].n === 1 && oU2.rows[0].sees_b === false,
    `n=${oU2.rows[0].n} sees_b=${oU2.rows[0].sees_b}`,
  );

  // The switcher's real query: join memberships → organizations under user context.
  const switcher = await withUser(USER_1, (c) =>
    c.query(
      `SELECT o.slug, m.role
         FROM memberships m
         JOIN organizations o ON o.id = m.org_id
        ORDER BY o.slug`,
    ),
  );
  check(
    "user context U1: memberships⋈organizations join yields both orgs with roles",
    switcher.rows.length === 2 &&
      switcher.rows[0].slug === "org-a" &&
      switcher.rows[0].role === "owner" &&
      switcher.rows[1].slug === "org-b",
    `rows=${switcher.rows.map((r) => `${r.slug}:${r.role}`).join(",")}`,
  );

  // ── 5. Fail-closed: no org context returns 0 rows, never everything ──────────
  // Deterministically exercises the dangerous path: a connection that just ran a
  // scoped tx (so its LOCAL GUC reverted to '' — see the NULLIF note in migrate.ts)
  // then gets reused with NO context. Must yield 0 rows — not an error, not all rows.
  const failClosed = await (async () => {
    const c = await pool.connect();
    try {
      // Prime the connection so the GUC reverts to '' (the historically crashing case).
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.current_org_id', $1, true)", [ORG_A]);
      await c.query("COMMIT");
      // Reuse the SAME connection with no context.
      const g = await c.query(
        "SELECT current_setting('app.current_org_id', true) AS v",
      );
      const s = await c.query("SELECT count(*)::int AS n FROM source_files");
      return { guc: g.rows[0].v, n: s.rows[0].n, errored: false };
    } catch (e) {
      return { errored: true, code: e.code };
    } finally {
      c.release();
    }
  })();
  check(
    "reused connection with empty GUC does not error (NULLIF guard holds)",
    failClosed.errored === false,
    failClosed.errored ? `threw ${failClosed.code}` : `guc=${JSON.stringify(failClosed.guc)}`,
  );
  check(
    "no org context ⇒ 0 rows visible (fail-closed, not fail-open)",
    failClosed.n === 0,
    `visible rows=${failClosed.n}`,
  );

  // ── Clean up ─────────────────────────────────────────────────────────────────
  await scrub();
  await pool.end();

  console.log(
    `\n${failures === 0 ? "✓ ALL RLS CHECKS PASSED" : `✗ ${failures} RLS CHECK(S) FAILED`}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("\nRLS probe crashed:", e);
  await pool.end().catch(() => {});
  process.exit(1);
});
