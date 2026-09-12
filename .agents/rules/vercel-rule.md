# Workspace Instructions & Rules

## Deployment & Hosting: Vercel Configuration Rules
- **Always update `vercel.json`** whenever routing, API endpoints, function limits, memory, execution duration, or environment configs change.
- In Next.js App Router projects on Vercel:
  - Both `"src/app/api/**/*"` and `"api/**/*"` function patterns must be declared under `"functions"` with adequate `memory` (at least 1024 MB for analytical / DuckDB / Excel processing) and `maxDuration` (at least 60s).
  - Ensure heavy or native server dependencies (`@duckdb/node-api`, `exceljs`, `pdfkit`, `pg`, `@node-rs/argon2`) are listed under `serverExternalPackages` in `next.config.ts`.
  - When assets like fonts or PDF data are used by serverless functions, ensure `outputFileTracingIncludes` includes the necessary paths.
