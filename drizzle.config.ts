import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations run as the owner role (can ALTER schema); falls back to app URL.
    url:
      process.env.MIGRATION_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgres://bi_owner:bi_owner_pw@localhost:5433/bi_platform",
  },
  verbose: true,
  strict: true,
});
