-- Role setup for the BI platform (PRD FR-1.6).
-- Runs once on first container init.
--
-- Two roles by design:
--   bi_owner — owns the schema, runs migrations, may alter tables. NOT used at request time.
--   bi_app   — the request-time role. NOSUPERUSER and (critically) does NOT have
--              BYPASSRLS, so row-level security policies are actually enforced on it.
--
-- RLS policies themselves are created by Drizzle migrations (see src/lib/db/rls.sql),
-- because they must track the schema. This file only establishes the roles + grants.

\set ON_ERROR_STOP on

CREATE ROLE bi_owner WITH LOGIN PASSWORD 'bi_owner_pw' NOSUPERUSER CREATEDB;
CREATE ROLE bi_app   WITH LOGIN PASSWORD 'bi_app_pw'   NOSUPERUSER NOCREATEDB NOBYPASSRLS;

-- bi_owner owns the database's public schema.
ALTER DATABASE bi_platform OWNER TO bi_owner;
GRANT ALL ON SCHEMA public TO bi_owner;

-- bi_app may use the schema and operate on its objects, but never bypass RLS.
GRANT USAGE ON SCHEMA public TO bi_app;

-- Future tables/sequences created by bi_owner are usable by bi_app by default.
ALTER DEFAULT PRIVILEGES FOR ROLE bi_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bi_app;
ALTER DEFAULT PRIVILEGES FOR ROLE bi_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO bi_app;

-- A GUC namespace `app.*` is used to carry the current org id into RLS policies
-- via SET LOCAL app.current_org_id inside each request transaction.
