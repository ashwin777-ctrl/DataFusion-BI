import pg from "pg";

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const users = await c.query("SELECT id, email, name FROM users");
console.log("Users:", users.rows);
const orgs = await c.query("SELECT id, name FROM organizations");
console.log("Orgs:", orgs.rows);
await c.end();
