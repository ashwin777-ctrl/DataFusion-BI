import { hash, verify } from "@node-rs/argon2";
import pg from "pg";

const client = new pg.Client("postgresql://bi_super:bi_super_pw@127.0.0.1:5434/bi_platform");

async function main() {
  await client.connect();
  const password = "Admin@123456";
  const h = await hash(password, {
    algorithm: 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const verified = await verify(h, password);
  console.log("Generated hash for Admin@123456 verified:", verified);

  const res = await client.query(
    "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email",
    [h, "ashwin@datafusion.io"]
  );
  console.log("Updated rows:", res.rows);
  await client.end();
}

main().catch(console.error);
