import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
const ORG_SCOPED_TABLES = [
  "organizations",
  "memberships",
  "invitations",
  "pg_connections",
  "source_files",
  "sources",
  "column_profiles",
  "datasets",
  "dataset_sources",
  "relationships",
  "transform_steps",
  "semantic_models",
  "quality_reports",
  "insights",
  "reports",
  "report_exports",
  "audit_log",
  "jobs",
];

const SUPABASE_URL = "postgresql://postgres.ipeibuxcwsejijkpgjiy:QAZJpO5k66bOv9qb@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";

async function run() {
  console.log("Connecting to Supabase...");
  const pool = new pg.Pool({
    connectionString: SUPABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  const client = await pool.connect();
  console.log("Connected successfully!");

  // Ensure bi_app role exists if needed or check role
  try {
    const roles = await client.query("SELECT rolname FROM pg_roles WHERE rolname = 'bi_app'");
    if (roles.rows.length === 0) {
      console.log("Creating bi_app role in Supabase...");
      await client.query("CREATE ROLE bi_app WITH LOGIN PASSWORD 'bi_app_pw' NOSUPERUSER NOCREATEDB NOBYPASSRLS");
    }
  } catch (err) {
    console.warn("Notice about bi_app role:", err.message);
  }

  client.release();

  console.log("Running Drizzle migrations on Supabase...");
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./src/lib/db/migrations" });
  console.log("Migrations applied successfully!");

  console.log("Applying RLS...");
  const ORG_GUC = "NULLIF(current_setting('app.current_org_id', true), '')::uuid";
  const ORG_GUC_RAW = "NULLIF(current_setting('app.current_org_id', true), '')";
  const USER_GUC = "NULLIF(current_setting('app.current_user_id', true), '')::uuid";
  const ORG_KEY = { organizations: "id" };

  function policyExprs(table) {
    const key = ORG_KEY[table] ?? "org_id";
    const org = `"${key}" = ${ORG_GUC}`;
    if (table === "memberships") {
      return {
        using: `(${org}) OR (${ORG_GUC_RAW} IS NULL AND "user_id" = ${USER_GUC})`,
        check: org,
      };
    }
    if (table === "organizations") {
      return {
        using:
          `(${org}) OR (${ORG_GUC_RAW} IS NULL AND "id" IN ` +
          `(SELECT m.org_id FROM memberships m WHERE m.user_id = ${USER_GUC}))`,
        check: org,
      };
    }
    return { using: org, check: org };
  }

  for (const table of ORG_SCOPED_TABLES) {
    const policy = `${table}_org_isolation`;
    const { using, check } = policyExprs(table);
    await pool.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
    await pool.query(`DROP POLICY IF EXISTS "${policy}" ON "${table}";`);
    await pool.query(
      `CREATE POLICY "${policy}" ON "${table}"
         USING (${using})
         WITH CHECK (${check});`,
    );
    try {
      await pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "${table}" TO bi_app;`);
    } catch (e) {
      console.warn("Grant to bi_app warning:", e.message);
    }
    console.log(`  RLS on ${table}`);
  }

  console.log("Migration complete on Supabase!");
  await pool.end();
}

run().catch(console.error);
