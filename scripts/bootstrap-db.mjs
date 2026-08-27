/**
 * Idempotent database bootstrap for LOCAL development (PRD FR-1.6).
 *
 * Creates the two application roles and the app database on a Postgres server we
 * connect to as a superuser. Used for the self-contained dev cluster when Docker
 * is unavailable; the Docker path does the same work via docker/postgres-init.
 *
 *   bi_owner — owns the schema, runs migrations. NOT used at request time.
 *   bi_app   — request-time role. NOSUPERUSER + NOBYPASSRLS, so RLS is enforced.
 *
 * Superuser connection + target names come from env (with dev defaults for the
 * embedded cluster on 5434). Never stores superuser credentials in .env.
 *
 *   node scripts/bootstrap-db.mjs
 */
import pg from "pg";

const SUPERUSER_URL =
  process.env.SUPERUSER_URL ??
  "postgres://bi_super:bi_super_pw@127.0.0.1:5434/postgres";
const APP_DB = process.env.APP_DB ?? "bi_platform";
const OWNER_ROLE = process.env.OWNER_ROLE ?? "bi_owner";
const OWNER_PW = process.env.OWNER_PW ?? "bi_owner_pw";
const APP_ROLE = process.env.APP_ROLE ?? "bi_app";
const APP_PW = process.env.APP_PW ?? "bi_app_pw";

// Identifiers are our own constants (never user input), but quote defensively.
const q = (id) => '"' + String(id).replace(/"/g, '""') + '"';
const lit = (s) => "'" + String(s).replace(/'/g, "''") + "'";

async function main() {
  const admin = new pg.Client({ connectionString: SUPERUSER_URL });
  await admin.connect();
  try {
    // ── Roles (idempotent) ────────────────────────────────────────────────
    for (const [role, pw, extra] of [
      [OWNER_ROLE, OWNER_PW, "NOSUPERUSER CREATEDB"],
      [APP_ROLE, APP_PW, "NOSUPERUSER NOCREATEDB NOBYPASSRLS"],
    ]) {
      const { rowCount } = await admin.query(
        "select 1 from pg_roles where rolname = $1",
        [role],
      );
      if (rowCount === 0) {
        await admin.query(
          `CREATE ROLE ${q(role)} WITH LOGIN PASSWORD ${lit(pw)} ${extra}`,
        );
        console.log(`created role ${role}`);
      } else {
        // Keep the password in sync with the dev defaults on re-run.
        await admin.query(`ALTER ROLE ${q(role)} WITH LOGIN PASSWORD ${lit(pw)}`);
        console.log(`role ${role} exists (password synced)`);
      }
    }

    // ── Database (idempotent; CREATE DATABASE cannot run in a transaction) ──
    const { rowCount: dbExists } = await admin.query(
      "select 1 from pg_database where datname = $1",
      [APP_DB],
    );
    if (dbExists === 0) {
      await admin.query(`CREATE DATABASE ${q(APP_DB)} OWNER ${q(OWNER_ROLE)}`);
      console.log(`created database ${APP_DB}`);
    } else {
      console.log(`database ${APP_DB} exists`);
    }
  } finally {
    await admin.end();
  }

  // ── Schema grants must be applied inside the target database ─────────────
  const dbUrl = new URL(SUPERUSER_URL);
  dbUrl.pathname = "/" + APP_DB;
  const inDb = new pg.Client({ connectionString: dbUrl.toString() });
  await inDb.connect();
  try {
    await inDb.query(`ALTER SCHEMA public OWNER TO ${q(OWNER_ROLE)}`);
    await inDb.query(`GRANT ALL ON SCHEMA public TO ${q(OWNER_ROLE)}`);
    await inDb.query(`GRANT USAGE ON SCHEMA public TO ${q(APP_ROLE)}`);
    await inDb.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${q(OWNER_ROLE)} IN SCHEMA public ` +
        `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${q(APP_ROLE)}`,
    );
    await inDb.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${q(OWNER_ROLE)} IN SCHEMA public ` +
        `GRANT USAGE, SELECT ON SEQUENCES TO ${q(APP_ROLE)}`,
    );
    console.log(`grants applied in ${APP_DB}`);
  } finally {
    await inDb.end();
  }

  console.log(`\nBootstrap complete: database ${APP_DB}, roles ${OWNER_ROLE} + ${APP_ROLE} ready.`);
}

main().catch((e) => {
  console.error("bootstrap failed:", e.message);
  process.exit(1);
});
