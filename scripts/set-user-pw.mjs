import pg from 'pg';
const { Client } = pg;
import { hash, verify } from '@node-rs/argon2';

async function main() {
  const c = new Client('postgresql://bi_super:bi_super_pw@127.0.0.1:5434/bi_platform');
  await c.connect();
  const pwHash = await hash('Admin@123456', {
    algorithm: 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  await c.query('UPDATE users SET password_hash = $1 WHERE email = $2', [pwHash, 'ashwin@datafusion.io']);
  console.log('Password hash updated for ashwin@datafusion.io!');
  const ok = await verify(pwHash, 'Admin@123456');
  console.log('Verified:', ok);
  await c.end();
}

main().catch(console.error);
