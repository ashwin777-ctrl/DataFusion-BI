# Consolidated BI Platform

Upload Excel + connect PostgreSQL → consolidate → analyze → interactive dashboard →
insights → professional report. Multi-tenant SaaS, DuckDB + TypeScript analytical engine.

**Planning artifacts (read these first):**
- [PRD.md](PRD.md) — full product requirements, data model, edge cases, open questions
- [DESIGN.md](DESIGN.md) — design system, tokens, components, accessibility (follow on every UI task)
- [references/palette.md](references/palette.md) — validated chart palette (do not edit without re-running the validator)

## Status

Planning complete. Build not yet started — pending answers to the open questions in
[PRD.md](PRD.md) §10.

## Locked decisions

| Decision | Choice |
|---|---|
| Tenancy | Multi-tenant SaaS (orgs, roles, Postgres RLS) |
| Engine | DuckDB (embedded) + TypeScript, Parquet staging — no full DB copy |
| Scale | ~1M rows / 100 MB per file |
| Delivery | Working vertical slice first (Excel → dashboard), then breadth |
| Stack | Next.js 15 + TS strict · Tailwind · shadcn/ui · Recharts · Drizzle · Postgres · pg-boss |

## Core promise

No mock data, no placeholder charts, no invented statistics. Every figure is computed from
the user's real data and traceable to the rows that produced it.
