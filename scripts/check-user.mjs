import pg from "pg";

const client = new pg.Client("postgresql://bi_super:bi_super_pw@127.0.0.1:5434/bi_platform");

async function main() {
  await client.connect();
  const u = await client.query("SELECT id, email, name FROM users WHERE email = 'ashwin@datafusion.io'");
  console.log("User:", u.rows);
  if (u.rows.length > 0) {
    const mems = await client.query(
      "SELECT m.id, m.org_id, m.role, o.name as org_name, o.slug FROM memberships m JOIN organizations o ON o.id = m.org_id WHERE m.user_id = $1",
      [u.rows[0].id]
    );
    console.log("Memberships:", mems.rows);
  }
  await client.end();
}

main().catch(console.error);
