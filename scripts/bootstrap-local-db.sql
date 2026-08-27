-- Bootstrap the BI platform's app-metadata database on a LOCAL PostgreSQL server
-- (used when Docker is unavailable). Mirrors docker/postgres-init/01-roles.sql but
-- also creates the database, since a local server has no POSTGRES_DB bootstrap.
--
-- Run as a superuser (e.g. `postgres`); it is idempotent and safe to re-run:
--
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" \
--       -U postgres -h localhost -p 5432 -d postgres \
--       -f scripts/bootstrap-local-db.sql
--
-- Two roles by design (PRD FR-1.6):
--   bi_owner — owns the schema, runs migrations. NOT used at request time.
--   bi_app   — request-time role. NOSUPERUSER and NOBYPASSRLS, so RLS is enforced.
-- These are dev-local app-role passwords, distinct from your superuser password.

\set ON_ERROR_STOP on

-- ── Roles (idempotent) ───────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bi_owner') THEN
    CREATE ROLE bi_owner WITH LOGIN PASSWORD 'bi_owner_pw' NOSUPERUSER CREATEDB;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bi_app') THEN
    CREATE ROLE bi_app WITH LOGIN PASSWORD 'bi_app_pw' NOSUPERUSER NOCREATEDB NOBYPASSRLS;
  END IF;
END
$$;

-- ── Database (idempotent via \gexec — CREATE DATABASE cannot be conditional) ──
SELECT 'CREATE DATABASE bi_platform OWNER bi_owner'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bi_platform')\gexec

-- ── Grants must be applied inside the target database ────────────────────────
\connect bi_platform

-- bi_owner controls the public schema (PG15+ no longer grants CREATE to PUBLIC).
ALTER SCHEMA public OWNER TO bi_owner;
GRANT ALL ON SCHEMA public TO bi_owner;

-- bi_app may use the schema and operate on its objects, but never bypass RLS.
GRANT USAGE ON SCHEMA public TO bi_app;

-- Future tables/sequences created by bi_owner are usable by bi_app by default.
ALTER DEFAULT PRIVILEGES FOR ROLE bi_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bi_app;
ALTER DEFAULT PRIVILEGES FOR ROLE bi_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO bi_app;

\echo 'Bootstrap complete: database bi_platform, roles bi_owner + bi_app ready.'
