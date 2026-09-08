import pg from "pg";

const SUPABASE_URL = "postgresql://postgres.ipeibuxcwsejijkpgjiy:QAZJpO5k66bOv9qb@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";
const LOCAL_URL = "postgresql://bi_super:bi_super_pw@127.0.0.1:5434/bi_platform";

async function seed() {
  const cLocal = new pg.Client(LOCAL_URL);
  const cSupa = new pg.Client({
    connectionString: SUPABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await cLocal.connect();
  await cSupa.connect();

  console.log("Connected to both databases.");

  // Copy users
  const users = await cLocal.query("SELECT * FROM users");
  for (const u of users.rows) {
    await cSupa.query(
      `INSERT INTO users (id, email, password_hash, name, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [u.id, u.email, u.password_hash, u.name, u.created_at]
    );
  }
  console.log(`Copied ${users.rows.length} users.`);

  // Copy organizations
  const orgs = await cLocal.query("SELECT * FROM organizations");
  for (const o of orgs.rows) {
    await cSupa.query(
      `INSERT INTO organizations (id, name, slug, plan, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [o.id, o.name, o.slug, o.plan || 'free', o.created_at]
    );
  }
  console.log(`Copied ${orgs.rows.length} organizations.`);

  // Copy memberships
  const mems = await cLocal.query("SELECT * FROM memberships");
  for (const m of mems.rows) {
    await cSupa.query(
      `INSERT INTO memberships (id, user_id, org_id, role, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.user_id, m.org_id, m.role, m.created_at]
    );
  }
  console.log(`Copied ${mems.rows.length} memberships.`);

  const check = await cSupa.query("SELECT u.email, o.name as org_name, m.role FROM users u JOIN memberships m ON m.user_id = u.id JOIN organizations o ON o.id = m.org_id");
  console.log("Supabase active accounts:", check.rows);

  await cLocal.end();
  await cSupa.end();
  console.log("Seeding complete!");
}

seed().catch(console.error);
