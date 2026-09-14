import pg from "pg";
import { verify } from "@node-rs/argon2";

const SUPABASE_URL = "postgresql://postgres.ipeibuxcwsejijkpgjiy:QAZJpO5k66bOv9qb@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";
const client = new pg.Client({ connectionString: SUPABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log("Connected to Supabase!");

  // Check tables
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log("Tables:", tables.rows.map((r) => r.table_name).sort());

  // Check users
  const users = await client.query("SELECT id, email, password_hash FROM users");
  console.log("Users count:", users.rows.length);
  for (const u of users.rows) {
    const v1 = await verify(u.password_hash, "Admin@123456").catch((e) => e.message);
    const v2 = await verify(u.password_hash, "Password123!").catch((e) => e.message);
    console.log("User:", u.email, "Matches Admin@123456:", v1, "Matches Password123!:", v2);
  }

  // Check comparison_jobs table
  const compJobCheck = await client.query("SELECT to_regclass('public.comparison_jobs')");
  console.log("comparison_jobs exists:", compJobCheck.rows[0]);

  await client.end();
}

main().catch(console.error);
