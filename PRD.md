# PRD — Consolidated BI Platform (working name: **Confluence BI**)

**Status:** Draft v1, awaiting review
**Author:** drafted with Claude, product owner: Ashwin C
**Last updated:** 2026-08-24

## Locked decisions (answered at intake)

| Decision | Choice | Consequence |
|---|---|---|
| Tenancy model | **Multi-tenant SaaS** | Organizations own all resources; Postgres row-level security; tenant-scoped storage paths and jobs; invites + roles |
| Analytical engine | **DuckDB (embedded) + TypeScript**, Parquet staging | Server-side SQL for every aggregate; no Python service; user's Postgres is read-only and never fully copied |
| Scale ceiling | **~1M rows / 100 MB per file** | Streaming ingest, durable job queue, sampled previews, cached aggregates — no distributed compute |
| First delivery | **Working vertical slice** | Excel → dashboard fully functional before Postgres connector, insights, and exports are built |

## ⚠️ Two constraints that must be resolved before production deploy

**1. DuckDB files are node-local. This caps horizontal scaling.**
DuckDB is an embedded database — a file on a disk attached to one process. A multi-tenant SaaS normally runs several stateless web nodes behind a load balancer, but a request for dataset `X` can only be served by the node holding `X`'s file. This is the single real tension in the chosen architecture. Three viable resolutions, in order of my recommendation:

- **(a) Single long-running Node process + persistent volume.** Fly.io volume, Render disk, Railway volume, or a plain VM. Correct for the first 6–18 months; a 4 vCPU / 8 GB box with a 100 GB volume comfortably serves hundreds of orgs at this data scale. **Recommended.**
- **(b) Object storage as source of truth + local read cache.** Parquet lives in S3/R2; DuckDB reads via `httpfs` with a warm local cache; the `.duckdb` file becomes disposable and rebuildable from Parquet + the transform log. Any node can serve any dataset after a cold-start penalty. This is the right answer at scale and the data model below is designed so it is a migration, not a rewrite.
- **(c) Sticky routing by `datasetId`** with a consistent-hash router. Works, but re-sharding on deploy is painful. Not recommended.

**Serverless (Vercel/Lambda) cannot host this.** Ephemeral filesystems, no persistent volume, and a 250 MB bundle cap versus DuckDB's native binary make it unworkable. The Next.js app must run as a long-lived Node server. This needs your confirmation — see Open Question 1.

**2. "Never copy the user's database" is satisfiable only in a qualified sense.**
Joining an Excel file to a Postgres table requires both sides to be materialized in one engine. What the platform will do: pull **only the schemas, tables, and columns the user explicitly selects**, write them to Parquet, and never mirror the full database, never write back, and never hold a persistent connection. What it cannot do: join across engines without staging. The spec's intent — don't duplicate an entire production database into a second one — is honored. Literal zero-copy is not achievable and is not what the requirement means.

---

## 1. Problem statement

A mid-sized company's business truth is split across two places that cannot talk to each other:

- **Operational systems** — orders, customers, inventory, transactions — sitting in Postgres, reachable only by someone who writes SQL.
- **Everything else** — budgets, targets, commissions, regional mappings, supplier terms, headcount plans — living in Excel files on someone's laptop, owned by the person who understands the business best and writes no SQL at all.

Answering an ordinary question ("did the Northeast hit its Q2 target, and which SKUs carried it?") therefore requires a human to be the join engine. An analyst exports a CSV from Postgres, opens it next to three workbooks, writes VLOOKUPs across mismatched key formats, pivots the result, pastes it into a deck, and formats it by hand. It takes four to eight hours, must be redone every month, and breaks silently when a column moves.

The tools that exist don't close this gap:

- **Power BI / Tableau** solve it, but cost per-seat, need a data engineer to model, and take weeks to stand up. Overkill below ~200 employees.
- **Metabase / Superset** query databases well but treat spreadsheets as second-class and won't consolidate across sources.
- **Excel itself** has Power Query, but it's fragile, single-user, undiscoverable, and produces no shareable dashboard.
- **"Upload a CSV and get charts" tools** produce a chart gallery, not a business report — one file at a time, no joins, no consolidation, and no opinion about what actually matters.

**Who hurts, concretely:** the finance or operations analyst who loses a week a month to manual reconciliation and can't defend a number when challenged in a review, because the calculation lives in a spreadsheet nobody else can audit.

**What "solved" looks like:** point the platform at your files and your database, confirm how they relate, and get a defensible dashboard and a board-ready PDF in under two minutes — with every figure traceable to the rows that produced it.

## 2. Target user + personas

**Primary segment:** companies of 50–500 employees with a real Postgres-backed product or operations system, spreadsheet-driven planning, and no dedicated data team. Buyer is typically a Head of Finance, Head of Ops, or a technical founder.

### Persona A — Priya Raghavan, Senior Finance & Ops Analyst (primary user)

- 31, four years at a 60-person industrial parts distributor. Reports to the CFO.
- **Tooling:** Excel expert (INDEX/MATCH, pivot tables, some Power Query). Reads SQL if handed it; cannot write a join. Has read-only credentials to a Postgres replica that the dev team provisioned for her nine months ago and she has used twice, via a GUI, uncomfortably.
- **Monthly reality:** exports `orders`, `order_items`, `customers` from the replica; combines them with `Targets_FY26.xlsx` (one sheet per region), `Commission_Plan.xlsx`, and a supplier cost workbook; produces a 14-page CFO pack. Six hours minimum. Last quarter a region was double-counted because a join fanned out and nobody caught it until the board meeting.
- **Wants:** stop rebuilding the same thing; be able to answer a follow-up question live in a meeting instead of "let me get back to you."
- **Fears:** a tool that silently gets the number wrong. She will personally own that error.
- **Success for her:** re-run last month's report against this month's files in one click, and click a KPI to see the underlying rows when the CFO asks "where's that from?"

### Persona B — Marcus Oyelaran, Head of Data / Platform (gatekeeper, sometimes admin)

- 38, at a 400-person B2B SaaS company. Owns the data stack and, informally, whether new tools get to touch production.
- **Tooling:** dbt, Postgres, Airflow, a warehouse he's midway through migrating. Deeply competent, chronically over-committed.
- **Why he's in this story:** Priya's equivalent on his team asked for database access. He must decide whether to grant it. He will not approve a tool that stores a plaintext password, can reach internal network addresses, or lets one customer's query touch another's data.
- **Wants:** a read-only, least-privilege connection scoped to named tables; visible audit trail of what was accessed and exported; SSO eventually.
- **Fears:** becoming the on-call owner of someone else's BI tool. Credential leakage. A tool that hammers the primary database.
- **Success for him:** he provisions a scoped read-only role once, sees exactly which tables were read, and never thinks about it again.

**Non-target for v1:** enterprises needing SAML/SCIM on day one; companies whose data is in a warehouse rather than Postgres; teams wanting a self-serve SQL IDE; anyone below ~10k rows total, for whom Excel is genuinely fine.

## 3. Goals and non-goals

### Goals

**G1 — Schema-agnostic by construction.** The platform must produce a useful dashboard for a sales dataset, an HR dataset, and an inventory dataset without a line of dataset-specific code. Every KPI, chart, and insight is derived from a profiled semantic model, never from a hardcoded column name. *Measured by:* onboarding three structurally unrelated datasets during acceptance testing, each yielding ≥4 correct KPIs and ≥5 appropriate charts with zero code changes.

**G2 — Never display a number that isn't real.** No mock data, no placeholder charts, no invented statistics, no KPI shown because it looks good on a dashboard. If revenue cannot be computed from the uploaded columns, the revenue card does not render. Every insight sentence is generated from a computed statistic with a recorded method and sample size. *Measured by:* zero fabricated figures in acceptance review; every insight traceable to reproducible SQL.

**G3 — Correct aggregation across joins.** Joining a fact table to another fact table inflates measures. The platform must detect this and refuse or correct it rather than quietly doubling revenue. *Measured by:* a fan-out test fixture where naive `SUM` is wrong by a known factor; the platform must report the correct total.

**G4 — Under two minutes from upload to dashboard.** For a 100k-row workbook: p50 ≤ 60 s, p95 ≤ 120 s, from upload complete to dashboard interactive.

**G5 — Hard tenant isolation.** No request, query, file path, job, or export can cross an organization boundary. Enforced in three independent layers (session scope, Postgres RLS, filesystem path derivation) so that a single bug is not sufficient to breach.

**G6 — Repeatable, not one-shot.** A saved report stores configuration — sources, mappings, transforms, layout, filters — not a data snapshot. Replacing the underlying file or re-pulling the tables re-runs the identical pipeline and refreshes every visual.

**G7 — Credentials that cannot leak to the browser.** Database passwords are encrypted at rest, decrypted only in the worker process, and never present in any API response, log line, error message, or client bundle.

### Non-goals (v1)

| Not doing | Why |
|---|---|
| Writing back to the user's database | Read-only forever. Removes an entire class of catastrophic risk and is the only defensible posture for a gatekeeper like Marcus. |
| A user-facing SQL editor | Large injection and resource-exhaustion surface for marginal MVP value. The point is that Priya doesn't write SQL. |
| Warehouse connectors (BigQuery, Snowflake, Redshift) | Different auth, cost, and pagination models. Postgres + Excel is the stated wedge. |
| Real-time / streaming data | Batch refresh only. Streaming changes the storage and cache design fundamentally. |
| ML forecasting, predictive models | Deterministic descriptive statistics only. A forecast the user can't audit contradicts G2. |
| Live collaborative editing | Last-write-wins on report config, with an audit trail. Real-time CRDT collaboration is a product in itself. |
| Scheduled email delivery of reports | v2. Needs deliverability infrastructure and adds a background-sending failure surface. |
| White-label embedding / public share links | Later. Anonymous access to tenant data needs its own threat model. |
| Natural-language querying | Later. Requires the semantic layer to be mature and trusted first. |
| Mobile app | Responsive web only. A BI dashboard is a desktop instrument. |
| SAML/SCIM SSO | v2, subject to Open Question 3. Email + password with argon2id for v1. |
| Data residency guarantees / regional hosting | Single region for v1. Flagged in Open Question 5. |

## 4. User stories

**Ingestion**

- As an analyst, I want to upload several Excel workbooks at once and pick which sheets matter, so that I don't have to split files by hand first.
- As an analyst, I want the platform to find the real header row even when the sheet starts with a title and two blank rows, so that my columns aren't named `__EMPTY_1`.
- As an analyst, I want to see a sample of my data with the detected type of each column before anything is processed, so that I can catch a misread column early.
- As an analyst, I want to correct a column the platform typed wrongly, so that a text order number isn't treated as a quantity to sum.
- As an admin, I want to register a Postgres connection by host, port, database, user, password, and SSL mode and have it verified before saving, so that I find out about a firewall rule immediately rather than during a refresh.
- As an admin, I want to browse schemas and tables and select only the columns needed, so that I minimize what leaves my database.
- As a gatekeeper, I want the platform to refuse to connect to internal or link-local addresses, so that it can't be used to reach our metadata service or internal network.

**Consolidation**

- As an analyst, I want the platform to propose how my sheets and tables relate, with a confidence score and the actual key-overlap percentage, so that I can accept or reject the proposal on evidence rather than faith.
- As an analyst, I want to define a join manually when detection fails, including composite keys and a type cast, so that a `customer_id` stored as text still matches an integer key.
- As an analyst, I want to be warned before a join that would inflate my totals, in plain language with the multiplication factor, so that I never present a doubled revenue figure.
- As an analyst, I want to see how many rows matched and how many didn't, and inspect the unmatched ones, so that I can tell whether a mapping is actually right.
- As an analyst, I want to choose how nulls are handled per column, so that a missing discount becomes 0 while a missing region stays "Unknown" instead of being dropped.
- As an analyst, I want to add a calculated column such as `margin = (revenue - cost) / revenue`, so that I get a metric my source data doesn't contain.

**Analysis and dashboard**

- As an analyst, I want KPIs chosen automatically from what my data actually supports, so that I'm not configuring a dashboard from an empty canvas.
- As an analyst, I want to never see a KPI card that can't be computed, so that the dashboard doesn't show me "Profit: —".
- As an analyst, I want charts picked to suit each field's role and cardinality, so that a 4,000-category column doesn't become an unreadable pie chart.
- As an analyst, I want one set of global filters that drives every visual at once, so that I don't reconfigure eight charts to look at one region.
- As an analyst, I want to drill from year to quarter to month to day, and from category to product to individual transaction, so that I can find the cause of a number rather than just observe it.
- As an analyst, I want to click any KPI or chart segment and see the underlying rows, so that I can defend the figure when challenged.
- As an executive, I want a written summary of what changed and why, with real percentages, so that I can read the story in thirty seconds.
- As an analyst, I want anomalies and outliers surfaced with the method used and the sample size, so that I can judge whether a spike is a signal or a data-entry error.

**Reports and lifecycle**

- As an analyst, I want to save a dashboard with a name and reopen it later, so that next month is a refresh instead of a rebuild.
- As an analyst, I want to replace an uploaded file with the new month's version and have everything re-run, so that my mappings and layout survive.
- As an analyst, I want a PDF that looks like a business report, not a screenshot dump, so that I can send it to the board unedited.
- As an analyst, I want Excel and CSV exports of the consolidated dataset and each aggregate, so that I can do further ad-hoc work.

**Administration**

- As an org owner, I want to invite colleagues with a role of admin, analyst, or viewer, so that a viewer cannot delete a report or see a connection.
- As an org owner, I want an audit log of connections created, datasets accessed, and reports exported, so that I can answer a security question.
- As a user in two organizations, I want to switch between them cleanly, so that I never act in the wrong context.

## 5. Feature list — MVP / v2 / later

The build proceeds in **vertical slices**. Each slice ends with something runnable and genuinely functional against real data. No slice ships placeholder UI.

### MVP

| Slice | Contents | Runnable outcome |
|---|---|---|
| **S0 · Foundation** | Next.js 15 + TypeScript strict, Tailwind, shadcn/ui, Drizzle + migrations, Zod-validated env, structured logging, error taxonomy, Docker Compose for Postgres | `npm run dev` boots; health check green; migrations apply |
| **S1 · Auth & tenancy** | Signup creates org, argon2id, revocable Postgres-backed sessions, org switcher, roles (owner/admin/analyst/viewer), RLS on every org table, protected routes, invitations, audit log | Two orgs exist and provably cannot see each other |
| **S2 · Excel ingest** | Multi-file upload with magic-byte + zip-bomb validation, sheet enumeration, header-row detection with override, streaming parse → Parquet, per-source row counts | Upload a real workbook; Parquet lands on disk; rows counted |
| **S3 · Profiling & semantic layer** | Per-column storage type, semantic role (dimension/measure/date/identifier/geo/boolean/text), subtype (currency/percent/count/ratio/email/postal/country/region/city/id), cardinality, null rate, distribution, confidence, user override | Every column correctly classified on three unrelated fixtures |
| **S4 · Preview & data quality** | Paginated sample grid, DuckDB `SUMMARIZE`, full Data Quality Summary (records, columns, missing, duplicates, invalid, type issues, merged, unmatched) | Quality report renders from real computed numbers |
| **S5 · Single-source dataset** | Dataset assembly from one source, `data_version`, storage accounting | A one-file dataset is queryable |
| **S6 · KPI & chart derivation** | Declarative KPI registry with role requirements, computability gate, chart-suitability rules, date-grain detection | Only computable KPIs appear; charts match field roles |
| **S7 · Dashboard** | KPI cards, auto-composed charts, global filter bar, drill-down (date hierarchy + categorical), row-level inspect, light/dark, loading/empty/error states, toasts | **First end-to-end milestone: Excel → live interactive dashboard** |
| **S8 · Multi-source consolidation** | Relationship inference by name similarity + sampled key-overlap, cardinality classification, star-schema assembly, fan-out detection and measure-inflation guard, manual join builder, INNER/LEFT/RIGHT/UNION, match statistics | Two sources joined correctly; fan-out test passes |
| **S9 · Cleaning & transforms** | Ordered replayable transform log: dedupe, null strategy per column, type coercion, trim/case normalize, date parsing incl. Excel serials, calculated columns, filters, grouping | Transforms replay deterministically on refresh |
| **S10 · Postgres connector** | Encrypted credential storage (AES-256-GCM), SSRF/DNS-rebinding guard, connection test, schema/table/column browse, sampled preview, catalog-validated identifier quoting, statement timeouts, selective import to Parquet | Real Postgres table imported and joined to Excel |
| **S11 · Insights engine** | Period-over-period, OLS trend with significance, seasonal-naive + MAD anomaly detection, IQR/modified-z outliers, Pareto concentration, seasonality index, contribution-to-change decomposition — each with method, n, and confidence | Insights are real, reproducible, and cite their method |
| **S12 · Saved reports & exports** | Save/rename/reopen/refresh/replace-source/re-run/delete, 12-section PDF via headless Chromium print, styled Excel via ExcelJS, streaming CSV | Board-quality PDF from live data |
| **S13 · Jobs & performance** | pg-boss durable queue, SSE progress, query-result cache keyed on `data_version`, pagination, result-size caps, retry/recovery, org quotas | 1M-row ingest completes with live progress |
| **S14 · Hardening** | Prompt 03 security audit, Playwright E2E (prompt 05), dead-code cleanup (prompt 06), conventional commit history (prompt 07) | Audit clean; suite green in CI |

### v2

Scheduled auto-refresh · email report delivery · sandboxed read-only SQL editor with row caps · formula-language measure builder · lat/lng point maps and custom region mapping · MySQL, Google Sheets, and CSV-over-URL connectors · shareable internal report links · SAML/OIDC SSO and SCIM · report templates and cloning · comment threads on visuals · column-level lineage view · incremental/delta Postgres import via watermark · anomaly alerting

### Later

White-label embedding · natural-language query over the semantic layer · ML forecasting and what-if scenarios · dbt manifest import for metric definitions · KPI-pack marketplace by vertical · warehouse connectors · multi-region residency · public API + webhooks

## 6. Functional requirements per MVP feature

Notation: **MUST** / **SHOULD** / **MUST NOT** carry RFC-2119 force. `FR-x.y` identifiers are referenced by the test plan.

### 6.1 Authentication, organizations, and access control (S1)

- **FR-1.1** Signup MUST create a `user` and an `organization` atomically, with the creator as `owner`. Email is normalized (lowercased, trimmed) and unique.
- **FR-1.2** Passwords MUST be hashed with argon2id (m=19456 KiB, t=2, p=1 minimum). Minimum length 12, checked against a common-password list. Plaintext MUST NOT be logged.
- **FR-1.3** Sessions MUST be server-side records in Postgres referenced by an opaque 256-bit token in an `HttpOnly; Secure; SameSite=Lax` cookie. Only the SHA-256 of the token is stored. Sliding expiry 7 days, absolute cap 30 days. Sessions MUST be individually revocable. **Rationale for sessions over JWT:** immediate revocation matters more than statelessness at this scale, and a stateless token cannot be invalidated when a member is removed from an org.
- **FR-1.4** Every session carries an `active_org_id`. Switching orgs MUST re-validate membership and write an audit entry.
- **FR-1.5** Roles: `owner` (all, incl. delete org, billing), `admin` (manage members and connections), `analyst` (create/edit datasets and reports), `viewer` (read dashboards and export only). Every mutating route MUST assert a minimum role server-side. Client-side gating is presentational only.
- **FR-1.6** Every org-scoped table MUST have RLS enabled with a policy on `org_id = current_setting('app.current_org_id')::uuid`. The application MUST connect as a non-superuser role without `BYPASSRLS`, and MUST set `app.current_org_id` via `SET LOCAL` inside the request transaction.
- **FR-1.7** Invitations MUST use a single-use token (SHA-256 stored), expire in 7 days, and be bound to the invited email.
- **FR-1.8** Login MUST be rate-limited to 10 attempts per 15 min per IP and 5 per account, with constant-time comparison and identical error text for unknown-email and wrong-password.
- **FR-1.9** Audit log MUST record: login success/failure, org switch, member/role change, connection create/update/delete/test, dataset create/refresh/delete, report export. Fields: actor, org, action, resource, IP, user agent, timestamp.

### 6.2 Excel ingestion (S2)

- **FR-2.1** Accept `.xlsx`, `.xlsm`, `.xls`, `.csv`, `.tsv`. Type MUST be determined by magic bytes (`PK\x03\x04` for OOXML, `\xD0\xCF\x11\xE0` for BIFF8) plus successful parse — **never** by extension or client-supplied MIME type.
- **FR-2.2** Limits: 100 MB per file, 10 files per upload batch, org storage quota enforced before write. Requests exceeding the limit MUST be rejected during streaming, not after buffering.
- **FR-2.3** OOXML files are ZIP archives and MUST be guarded against decompression bombs: reject if total uncompressed size > 1 GB, compression ratio > 200:1, or entry count > 2,000. The XML parser MUST have DTD and external-entity resolution disabled (XXE).
- **FR-2.4** Files MUST be stored outside the web root at a path derived server-side from `org_id` and a generated `file_id`. The original filename is metadata only and MUST NOT influence the storage path. SHA-256 recorded for dedupe and integrity.
- **FR-2.5** Sheet enumeration MUST list every sheet with used range, non-empty row count, and a merged-cell flag.
- **FR-2.6** Header detection MUST score the first 25 rows on: proportion of non-empty cells, proportion of string cells, uniqueness, absence of numeric-only content, and type consistency of the rows beneath. The winning row is proposed; the user MAY override header row index and skip-rows count. Duplicate headers get `_2`, `_3` suffixes; blank headers become `column_{ordinal}`.
- **FR-2.7** Parsing MUST stream row-by-row and write Parquet incrementally. Peak memory MUST remain bounded and independent of file size (target < 512 MB RSS for a 100 MB file).
- **FR-2.8** Formula cells MUST use the cached computed value. If a workbook has no cached values, the affected columns MUST be flagged in the quality report rather than silently zeroed.
- **FR-2.9** Excel serial dates MUST be converted using the workbook's epoch (1900 with the intentional leap-year bug, or 1904), and the source `numFmt` MUST be read to distinguish a date from a plain number and to detect currency and percentage formats. This is the single largest source of silent corruption in spreadsheet ingest and MUST be tested explicitly.
- **FR-2.10** CSV ingest MUST sniff delimiter, quote char, and encoding (UTF-8, UTF-16LE/BE with BOM, Windows-1252 fallback), and MUST handle embedded newlines inside quoted fields.
- **FR-2.11** Merged cells MUST be unmerged by forward-filling the value into every covered cell, and the occurrence flagged in the quality report.
- **FR-2.12** Progress MUST be reported as a percentage over the job lifecycle. A failed parse MUST leave no partial Parquet and MUST surface the sheet, row, and column at fault.

### 6.3 Profiling and the semantic layer (S3)

The semantic model is the mechanism that satisfies G1 (schema-agnostic). It is computed per source and cached against `data_version`.

- **FR-3.1** For each column, compute: storage type, non-null count, null rate, distinct count, cardinality ratio, min, max, mean, median, p05/p25/p75/p95, stddev, top-20 values by frequency, and 10 sampled values.
- **FR-3.2** Assign exactly one **semantic role**: `date`, `measure`, `dimension`, `identifier`, `geo`, `boolean`, or `text`. Each carries a confidence in [0,1] from combined signals: column name pattern, value pattern, statistical shape, and source number format.
- **FR-3.3** **Identifier-versus-measure disambiguation is mandatory.** A numeric column MUST be classified `identifier`, not `measure`, when cardinality ratio > 0.95 **and** it is integral **and** (name matches `/(^|_)(id|key|code|no|num|number|ref|sku|ean|upc|isbn)$/i` **or** values are zero-padded or monotonically increasing). Summing `OrderID` is the most common way an auto-BI tool produces a confidently wrong dashboard, and it MUST NOT happen.
- **FR-3.4** Measure subtype detection: `currency` (source numFmt has a currency symbol, or name matches `/revenue|sales|price|cost|amount|profit|margin|total|value|fee|charge|salary|spend|budget/i`), `percent` (numFmt is a percentage, or values in [0,1] with a `rate|pct|percent|ratio|share` name), `count` (integral, non-negative, name matches `/qty|quantity|count|units|volume|headcount/i`), `duration`, `ratio`, else `generic`.
- **FR-3.5** Date detection MUST cover native date/time/timestamp types, ISO 8601 strings, common regional formats with an ambiguity flag for DD/MM versus MM/DD, Excel serials, and Unix epoch seconds/milliseconds. Ambiguous formats MUST prompt rather than guess. Detected timezone handling MUST be explicit: values are stored as `TIMESTAMP` in UTC with the assumed source zone recorded.
- **FR-3.6** Geo detection: ISO 3166-1 alpha-2/alpha-3 codes, country names, US/CA/AU/IN state and province names and codes, postal-code patterns per country, city names against a bundled gazetteer, and latitude/longitude by name plus range check ([-90,90] / [-180,180]). Geo columns get subtype `country`, `region`, `city`, `postal`, or `latlng`.
- **FR-3.7** Dimension eligibility: `distinct_count` between 2 and 5,000 **and** cardinality ratio < 0.6. Columns above that are `text` and are excluded from grouping and filtering — but remain visible in row-level detail.
- **FR-3.8** Date-grain availability MUST be derived from actual span and density: a grain is offered only if it produces ≥2 and ≤2,000 buckets. Drill path is the ordered subset of `year → quarter → month → week → day` that qualifies.
- **FR-3.9** Users MUST be able to override role, subtype, display name, format, and date-parse pattern per column. Overrides MUST persist across refreshes, keyed by normalized column name, and MUST take precedence over inference.
- **FR-3.10** The semantic model MUST be recomputed on refresh, and any override whose column has disappeared MUST be reported rather than silently dropped.

### 6.4 Data quality summary (S4)

- **FR-4.1** Compute and display, per source and for the consolidated dataset: record count, column count, missing values (count and % per column), exact duplicate rows, duplicate rows on inferred key columns, invalid values per column (type-coercion failures with examples), type-inconsistency warnings, successfully merged record count, and unmatched record count per join side.
- **FR-4.2** Every figure MUST be computed in DuckDB over the full dataset — **not** estimated from the preview sample. Where an approximation is used for performance (e.g. `approx_count_distinct`), it MUST be labelled as approximate in the UI.
- **FR-4.3** Each issue MUST offer a concrete remediation with a preview of its effect on row count before it is applied.
- **FR-4.4** Unmatched rows MUST be inspectable in a paginated grid, with the join key value shown, so the user can diagnose the mismatch.
- **FR-4.5** The quality report MUST be persisted per `data_version` so month-over-month quality drift is visible.

### 6.5 Consolidation and relationship inference (S8)

- **FR-5.1** Candidate key pairs are generated by normalizing column names (lowercase, strip non-alphanumerics, strip `id|key|code|no|num|ref` suffixes, singularize) and pairing across sources where normalized names match or have Jaro-Winkler similarity ≥ 0.85, and storage types are compatible or safely castable.
- **FR-5.2** Every candidate MUST be **validated against the data**, not accepted on name alone. Compute in DuckDB: distinct counts each side, intersection size, overlap coefficient `|A∩B| / min(|A|,|B|)`, and null rates. Name similarity alone MUST NOT produce a join.
- **FR-5.3** Cardinality MUST be classified `1:1`, `1:N`, `N:1`, or `N:M` from distinct-versus-total counts on each side.
- **FR-5.4** Confidence = weighted combination of overlap coefficient (0.5), name similarity (0.2), type exactness (0.15), and cardinality cleanliness (0.15). Auto-apply ≥ 0.90; suggest 0.60–0.89 requiring confirmation; hide < 0.60 but keep available in the manual builder.
- **FR-5.5** **Star-schema assembly.** One source is designated the **fact** source (heuristic: most rows, most measures, presence of a date column). Other sources join to it as dimensions on `N:1` or `1:1` only. This makes measure aggregation safe by construction.
- **FR-5.6** **Measure-inflation guard (satisfies G3).** Any join that is `1:N` from the fact side, or `N:M`, duplicates fact rows and inflates every fact measure. The platform MUST: (a) detect it before execution by comparing the pre- and post-join fact row counts, (b) block auto-apply and require explicit confirmation, (c) state the inflation factor in plain language — *"this join turns 12,480 order rows into 41,300, so Revenue would be overstated roughly 3.3×"* — and (d) when the user proceeds, compute affected measures at their native grain via a de-duplicating subquery (`SUM` over `DISTINCT fact_pk, measure`) and mark them `grain-corrected` in the UI. A wrong total MUST NOT be reachable through the default path.
- **FR-5.7** Manual join builder MUST support choosing both sources, composite multi-column keys, an explicit cast per key pair, join type (`INNER`, `LEFT`, `RIGHT`, `FULL`), and a live match-rate preview computed on a sample before commit.
- **FR-5.8** `UNION` MUST be supported for same-shape sources (e.g. twelve monthly sheets), with column alignment by name, a reconciliation UI for near-misses, and a `source_name` provenance column added automatically.
- **FR-5.9** All identifiers in generated SQL MUST come from the introspected catalog and be quoted with the engine's identifier quoting. User input MUST NOT be string-interpolated into SQL. All literals MUST be parameterized.
- **FR-5.10** After consolidation, report per join: rows in, rows out, matched, unmatched left, unmatched right, and the inflation factor.

### 6.6 Cleaning and transforms (S9)

- **FR-6.1** Transforms MUST be an **ordered, persisted, replayable log** of typed steps, not destructive edits. Refresh replays the log against new data. Steps MUST be reorderable and individually disableable.
- **FR-6.2** Step types: `drop_duplicates` (all columns or a key subset, keep first/last by an order column), `handle_nulls` (drop row, fill constant, fill 0, forward-fill, mean/median, or "Unknown" for dimensions — per column), `coerce_type`, `parse_date` (explicit pattern), `trim_whitespace`, `normalize_case`, `find_replace`, `derive_column` (arithmetic, date part extraction, string concat, conditional CASE), `filter_rows`, `rename_column`, `drop_column`, `split_column`, `bin_numeric`.
- **FR-6.3** Every step MUST preview its effect — rows affected, rows removed, before/after sample — before commit.
- **FR-6.4** `derive_column` expressions MUST be parsed into a validated AST over a closed function whitelist and compiled to SQL. Raw SQL MUST NOT be accepted. Division MUST be null-safe (`NULLIF` denominator).
- **FR-6.5** Transform replay MUST be deterministic: identical input plus identical log yields identical output. Non-deterministic functions (`random`, `now`) are excluded from the whitelist.

### 6.7 KPI and chart derivation (S6)

- **FR-7.1** KPIs MUST come from a **declarative registry**. Each entry: id, label, required semantic roles/subtypes, SQL template, format, unit, and comparison behavior. Adding a KPI MUST NOT require touching the dashboard code.
- **FR-7.2** A KPI is emitted **only if** its requirements resolve against the semantic model. Illustrative bindings:

  | KPI | Requires | Computation |
  |---|---|---|
  | Total Revenue | measure with subtype `currency` and revenue-ish name | `SUM` (grain-corrected) |
  | Total Orders | identifier with order-ish name | `COUNT(DISTINCT)` |
  | Total Customers | identifier with customer-ish name | `COUNT(DISTINCT)` |
  | Avg Order Value | revenue KPI **and** order-count KPI | ratio |
  | Profit | `profit` measure, **or** both revenue and cost measures | direct or derived difference |
  | Profit Margin | profit **and** revenue | ratio, null-safe |
  | Growth Rate | date column **and** a measure **and** ≥2 complete comparable periods | period-over-period |
  | Customer Retention | customer identifier **and** date **and** ≥2 periods | cohort return rate |
  | Conversion Rate | a status/stage dimension with recognizable funnel values, **or** two count measures | ratio |
  | Units Sold | measure with subtype `count` | `SUM` |
  | Headcount | employee identifier | `COUNT(DISTINCT)` |
  | Inventory Value | quantity measure **and** unit-cost measure | `SUM(product)` |

- **FR-7.3** A KPI whose requirements are unmet MUST NOT render — not as an empty card, not as `—`, not greyed out. It is absent. An affordance MAY explain which column would enable it.
- **FR-7.4** Comparison deltas MUST only appear when a genuinely comparable prior period of equal length and completeness exists. A partial current period MUST be labelled as such, and MUST NOT be compared against a complete prior period without that label.
- **FR-7.5** Chart selection MUST follow field role and cardinality:

  | Shape | Chart |
  |---|---|
  | measure over date | line (area if a single cumulative series) |
  | measure by dimension, ≤ 12 distinct | vertical bar |
  | measure by dimension, 13–30 | horizontal bar, sorted, top-N with "other" |
  | measure by dimension, > 30 | ranked table with inline bars |
  | part-of-whole, ≤ 6 and shares sum to ~100% | donut |
  | two measures | scatter, optional third measure as size |
  | one measure distribution | histogram with auto bin width (Freedman–Diaconis) |
  | measure by two dimensions | heatmap |
  | hierarchical part-of-whole | treemap |
  | measure by geo dimension | choropleth (bundled TopoJSON; no external tile service) |
  | measure over date by dimension, ≤ 6 series | multi-series line |

- **FR-7.6** Pie/donut MUST be suppressed above 6 categories or when shares don't sum to a whole — a stated rule, not a preference.
- **FR-7.7** Every chart MUST have tooltip, legend when multi-series, axis labels with units, sort control, and drill-down where the hierarchy supports it. Line and scatter MUST support zoom and brush.
- **FR-7.8** Every visual MUST be able to reveal its underlying rows and the SQL that produced it. This is the mechanism by which Priya defends a number.

### 6.8 Dashboard, filters, and drill-down (S7)

- **FR-8.1** Layout: KPI card row, then charts in a responsive grid. Order is deterministic from the semantic model, so the same dataset always produces the same dashboard.
- **FR-8.2** The global filter bar MUST be generated from the semantic model: a date-range picker with presets for the primary date column, plus filters for eligible dimensions (per FR-3.7), and numeric range filters for key measures.
- **FR-8.3** Filter state MUST apply to every visual in one round trip, be URL-encoded for sharing and reload, and be restorable from a saved report.
- **FR-8.4** Date drill-down MUST follow the qualifying subset of `year → quarter → month → week → day` with breadcrumbs and a one-click return to any level.
- **FR-8.5** Categorical drill-down MUST follow inferred hierarchies (e.g. `category → subcategory → product → transaction`), inferred by containment: A contains B if each B value maps to exactly one A value.
- **FR-8.6** All aggregation MUST happen in DuckDB. Responses MUST be aggregated results, capped at 5,000 points per series. Raw row data reaches the browser only in the paginated detail grid. Per G4 and section 15 of the brief, the browser MUST NOT receive the full dataset.
- **FR-8.7** Every visual MUST implement four states: loading (skeleton, no layout shift), empty (explains *why* — no data, or filtered to nothing, with a clear-filters action), error (plain-language cause and a retry), and populated.
- **FR-8.8** Light and dark themes MUST both meet WCAG 2.1 AA contrast, including chart series colors against their background.
- **FR-8.9** Filter interaction target: p95 < 400 ms on a 1M-row dataset via cached aggregates.

### 6.9 Postgres connector (S10)

- **FR-9.1** Fields: name, host, port, database, username, password, SSL mode (`disable`/`require`/`verify-ca`/`verify-full`), optional CA certificate. `verify-full` is the default and recommended in the UI.
- **FR-9.2** Passwords and CA certs MUST be encrypted at rest with AES-256-GCM using a key from the environment (or KMS — Open Question 2), with a per-record nonce and the connection id as additional authenticated data. Ciphertext MUST be decrypted **only** inside the worker process at connection time.
- **FR-9.3** No API response MAY contain the password, ciphertext, nonce, or key — in any field, error, or log. The read model exposes `hasPassword: boolean`. The password field is write-only. This MUST be covered by an explicit test asserting the absence of the secret in serialized responses.
- **FR-9.4** **SSRF protection is mandatory.** Before connecting, resolve the hostname and reject any result in a private, loopback, link-local, or reserved range — notably `127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16` (including `169.254.169.254`), `::1`, `fc00::/7`, `fe80::/10` — unless the deployment sets an explicit allowlist for self-hosting. To defeat DNS rebinding, the platform MUST pin and connect to the **validated resolved IP** rather than re-resolving the hostname, with TLS SNI/hostname verification preserved.
- **FR-9.5** Connection test MUST run on save, be rate-limited (10/hour/org), enforce a 10 s timeout, and return a sanitized error. Raw driver errors MUST NOT be forwarded — they leak host, port, and version detail.
- **FR-9.6** Introspection MUST read `information_schema` / `pg_catalog` for schemas, tables, views, materialized views, columns with types and nullability, primary keys, and foreign keys. **Discovered foreign keys MUST seed relationship inference** — they are ground truth and outrank name-similarity guesses.
- **FR-9.7** Preview MUST use `SELECT` on user-selected, catalog-validated columns with `LIMIT 100` and a `statement_timeout`. Table and column names MUST be quoted from catalog values, never interpolated from raw input.
- **FR-9.8** Import MUST select only chosen columns, stream with a server-side cursor in batches, enforce a row cap with clear notification when hit, apply `statement_timeout` and `idle_in_transaction_session_timeout`, and use a small bounded pool. The platform MUST NOT run unbounded `SELECT *`.
- **FR-9.9** All access MUST be read-only: the driver session MUST be set to `default_transaction_read_only = on`, and the UI MUST instruct the user to provision a `SELECT`-only role. Any `INSERT`/`UPDATE`/`DELETE`/DDL path MUST be absent from the code, not merely unused.
- **FR-9.10** Reasonable citizenship: no persistent idle connections, connections closed after import, concurrent imports per connection capped at 2.

### 6.10 Insights engine (S11)

Every insight is a computed statistic. Each MUST carry `method`, `sample_size`, and `confidence`, and MUST be reproducible from stored SQL. No insight is emitted below its minimum-n threshold.

- **FR-10.1 Period-over-period** — current window versus the immediately preceding equal-length window at the primary grain. Requires both windows complete. Reports absolute change, percent change, and direction.
- **FR-10.2 Trend** — ordinary least squares on the measure over time. Reported only when n ≥ 8 and the slope is significant at p < 0.05. Output includes slope per period, R², and p.
- **FR-10.3 Anomaly detection** — for time series with n ≥ 12: fit a seasonal-naive baseline (or moving median where no seasonality is detected), then flag residuals with a MAD-based modified z-score |M| > 3.5. **Median/MAD rather than mean/stddev**, because a single extreme month otherwise inflates the standard deviation and masks the very anomaly being sought.
- **FR-10.4 Outliers** — for non-temporal measures: Tukey IQR fence (1.5×) and modified z-score, agreement required for a high-confidence flag. Requires n ≥ 20.
- **FR-10.5 Concentration** — Pareto ("top 7 of 214 products generate 61% of revenue") plus a Herfindahl–Hirschman index for concentration risk. Requires ≥ 10 members.
- **FR-10.6 Seasonality** — index each period-of-cycle (month-of-year, day-of-week) against the overall mean. Requires ≥ 2 complete cycles, and MUST state how many cycles support the claim.
- **FR-10.7 Contribution to change** — decompose a measure's change between periods into per-member contributions, in percentage points, so the output is *"the −12% regional decline is −7.2pp Northeast and −3.1pp Midwest"* rather than a bare aggregate.
- **FR-10.8 Segment performance** — best and worst performers by measure per dimension, with the significance of the gap and explicit small-sample suppression.
- **FR-10.9 Data-integrity insights** — surface suspicious patterns that are probably data problems rather than business events: sudden distribution shifts, a spike of nulls in a recent period, duplicate-key growth, values pinned at a boundary.
- **FR-10.10** Insights MUST be ranked by a combination of effect size, statistical confidence, and business materiality, with a cap on how many surface at once. A wall of weak findings is a failure mode.
- **FR-10.11 LLM usage is optional, phrasing-only, and off by default.** If enabled, the model receives a **JSON fact object of already-computed values** and returns prose. All numerals in the output MUST be validated to appear in the fact object; any output containing an unsourced number MUST be discarded in favor of the deterministic template. The model MUST NOT be given raw data rows and MUST NOT compute anything. Enabling it means data leaves the deployment, which MUST be disclosed in the UI.

### 6.11 Saved reports and export (S12)

- **FR-11.1** A saved report MUST persist configuration only: source references, relationships, transform log, semantic overrides, layout, and filter state. It MUST NOT duplicate the dataset.
- **FR-11.2** Operations: save, rename, duplicate, reopen, refresh, replace an uploaded file, reconnect/re-import Postgres, re-run analysis, delete (soft delete with 30-day recovery).
- **FR-11.3** Refresh MUST replay ingest → transforms → consolidation → analysis and increment `data_version`, invalidating caches. If the new data's schema is incompatible with saved config, refresh MUST fail cleanly with a diff of what changed and MUST NOT destroy the previous working version.
- **FR-11.4** PDF export MUST render the 12 required sections — Executive Summary, Data Sources, Data Quality, Key KPIs, Sales/Revenue Analysis, Product Analysis, Customer Analysis, Regional Analysis, Trend Analysis, Anomaly Detection, Key Business Insights, Recommendations. Sections whose data doesn't exist MUST be omitted, not left empty.
- **FR-11.5** The PDF MUST be a typeset business document: cover page with org and period, table of contents with page numbers, running header/footer, page numbers, vector charts, print-appropriate typography and margins. **Implementation:** server-rendered React → print stylesheet → headless Chromium `page.pdf()`. This reuses the Playwright/Chromium dependency added for E2E testing and yields real vector charts and correct typography, which a PDF-primitive library cannot.
- **FR-11.6** Excel export MUST use ExcelJS with a formatted summary sheet, one sheet per aggregate, native number/currency/date formats, frozen headers, and autofilters. Not a CSV with an `.xlsx` extension.
- **FR-11.7** CSV export MUST stream and MUST neutralize formula injection: any cell beginning `=`, `+`, `-`, `@`, TAB, CR, or LF MUST be prefixed with `'`. An exported CSV that executes a formula in the recipient's Excel is a vulnerability the exporting tool owns.
- **FR-11.8** Exports MUST run as background jobs with progress, produce a time-limited download, and expire (default 7 days).

### 6.12 Jobs, caching, and performance (S13)

- **FR-12.1** All long-running work — parse, profile, consolidate, analyze, export — MUST run as durable queued jobs. **pg-boss** on the existing Postgres, chosen deliberately over BullMQ to avoid adding Redis to a single-deployable architecture.
- **FR-12.2** Jobs MUST be tenant-scoped, resumable, idempotent by key, and bounded by per-org concurrency limits so one large upload cannot starve other tenants.
- **FR-12.3** Progress MUST stream to the client over Server-Sent Events with stage name and percentage. SSE over WebSockets: progress is one-directional, and SSE reconnects natively.
- **FR-12.4** Aggregate query results MUST be cached keyed on `(dataset_id, data_version, normalized_query_hash, filter_hash)` and invalidated by `data_version` increment. Cache is in-process LRU with a bounded memory budget for v1.
- **FR-12.5** Every list endpoint MUST paginate (keyset preferred). Every aggregate endpoint MUST enforce a hard result cap and MUST return a truncation flag rather than silently trimming.
- **FR-12.6** Failed jobs MUST retry with exponential backoff (3 attempts), then move to a dead-letter state with a user-visible, actionable error and a retry action. Partial writes MUST be cleaned up.
- **FR-12.7** Org quotas MUST be enforced: total storage bytes, dataset count, rows per dataset, concurrent jobs. Quota rejection MUST be a clear message stating the limit and current usage.

## 7. Data model sketch

Two stores with a strict division of responsibility.

**Application Postgres — metadata and configuration only. Never user row data.**

```
organizations       id, name, slug(unique), plan, quota_storage_bytes, quota_datasets,
                    quota_rows_per_dataset, created_at, deleted_at

users               id, email(unique, normalized), password_hash, name,
                    email_verified_at, last_login_at, created_at, deleted_at

memberships         id, user_id→users, org_id→organizations,
                    role(owner|admin|analyst|viewer), created_at
                    UNIQUE(user_id, org_id)

invitations         id, org_id, email, role, token_hash, invited_by→users,
                    expires_at, accepted_at, revoked_at

sessions            id, user_id, active_org_id→organizations, token_hash(unique),
                    ip, user_agent, created_at, last_seen_at, expires_at, revoked_at

pg_connections      id, org_id, name, host, port, database, username,
                    password_ciphertext, password_nonce, ssl_mode, ca_cert_ciphertext,
                    created_by, last_tested_at, last_test_status, last_test_error

source_files        id, org_id, original_name, storage_path, byte_size, sha256,
                    detected_kind(xlsx|xls|csv|tsv), uploaded_by, status, created_at

sources             id, org_id, kind(excel_sheet|pg_table), alias,
                    source_file_id→source_files NULL, sheet_name NULL,
                    pg_connection_id→pg_connections NULL, schema_name NULL, table_name NULL,
                    header_row_index, skip_rows, selected_columns jsonb,
                    row_count, parquet_path, parquet_bytes, profiled_at

column_profiles     id, source_id→sources, ordinal, raw_name, normalized_name,
                    storage_type, semantic_role, semantic_subtype, confidence,
                    null_count, distinct_count, cardinality_ratio,
                    min_value, max_value, stats jsonb, sample_values jsonb,
                    user_override jsonb NULL          -- role/subtype/format/date pattern
                    UNIQUE(source_id, ordinal)

datasets            id, org_id, name, status(draft|building|ready|failed),
                    fact_source_id→sources NULL, duckdb_path, storage_bytes,
                    row_count, data_version(int), last_refreshed_at,
                    created_by, created_at, deleted_at

dataset_sources     id, dataset_id→datasets, source_id→sources, alias, role(fact|dimension)

relationships       id, dataset_id, left_source_id, left_columns text[],
                    right_source_id, right_columns text[],
                    join_type(inner|left|right|full|union),
                    cardinality(1:1|1:N|N:1|N:M), overlap_ratio, name_similarity,
                    confidence, origin(inferred|foreign_key|manual),
                    inflation_factor, is_enabled, user_confirmed_at

transform_steps     id, dataset_id, ordinal, kind, config jsonb, is_enabled, created_by
                    UNIQUE(dataset_id, ordinal)          -- ordered, replayable log

semantic_models     id, dataset_id, data_version, dimensions jsonb, measures jsonb,
                    date_columns jsonb, available_grains jsonb, hierarchies jsonb,
                    kpi_bindings jsonb, chart_suggestions jsonb, computed_at
                    UNIQUE(dataset_id, data_version)

quality_reports     id, dataset_id, data_version, scope(source|dataset), source_id NULL,
                    payload jsonb, created_at

insights            id, dataset_id, data_version, kind, severity, rank,
                    payload jsonb,          -- computed facts, the numbers themselves
                    method, sample_size, confidence, sql_fingerprint,
                    user_feedback(useful|not_useful|NULL), created_at

reports             id, org_id, dataset_id→datasets, name, description,
                    layout jsonb, filter_state jsonb,
                    created_by, updated_by, updated_at, deleted_at

report_exports      id, report_id→reports, org_id, format(pdf|xlsx|csv),
                    status, storage_path, byte_size, requested_by,
                    created_at, expires_at

audit_log           id, org_id, actor_user_id, action, resource_type, resource_id,
                    ip, user_agent, metadata jsonb, created_at

-- pg-boss owns its own `pgboss` schema for the job queue.
```

RLS is enabled on every table carrying `org_id`, with the policy `org_id = current_setting('app.current_org_id')::uuid`. `users` is reachable only through `memberships`.

**Analytical store — per-dataset, on the persistent volume.**

```
storage/{org_id}/
  files/{source_file_id}/original.{ext}          -- uploaded bytes, path derived server-side
  sources/{source_id}/data.parquet               -- normalized columnar staging
  datasets/{dataset_id}/analysis.duckdb          -- views over Parquet + materialized consolidation
  exports/{export_id}/report.{pdf|xlsx|csv}
```

`analysis.duckdb` holds a view per source over its Parquet file, a materialized `consolidated` table produced by the transform log plus relationships, and small materialized rollups for hot aggregates. **It is fully rebuildable** from Parquet plus `transform_steps` plus `relationships` — which is what makes resolution (b) in the constraints section a migration rather than a rewrite.

**Key invariant:** every filesystem path is *derived* from `org_id` and a UUID resolved through an RLS-protected Postgres query. No user-supplied string ever reaches a path. Path traversal and cross-tenant file access are structurally impossible, not merely filtered.

## 8. Edge cases and failure states

**Excel**

| Case | Handling |
|---|---|
| Header not in row 1 (title rows, blank rows) | Scored detection over 25 rows, user-overridable (FR-2.6) |
| Multi-row / merged headers | Unmerge by forward-fill, flag; user may pick a single header row |
| Two tables in one sheet | Detect the blank-row gap, warn, import the first block; splitting is v2 |
| Duplicate / blank column names | Suffix `_2`; blanks become `column_{n}` |
| Excel serial dates, 1900 vs 1904 epoch | Epoch read from workbook; explicit test fixture (FR-2.9) |
| DD/MM vs MM/DD ambiguity | Detected and **prompted** — never guessed |
| Numbers stored as text, thousands separators, `(1,234)` negatives, trailing `%`, currency symbols | Coercion with a per-column failure count surfaced in quality |
| Formulas with no cached value | Flagged, not zeroed (FR-2.8) |
| `#REF!`, `#N/A`, `#DIV/0!` | Treated as null, counted as invalid |
| Password-protected / corrupt workbook | Rejected with a specific message; no partial state |
| Zip bomb, XXE payload | Rejected pre-parse (FR-2.3) |
| Empty sheet, or only a header row | Importable, flagged; dataset build blocked with an explanation |
| Mixed types within one column | Majority type wins; minority values counted as invalid with examples |
| 1,048,576-row sheet (Excel max) | Streams within memory bound; hits row cap with clear notice |
| Right-to-left / CJK / emoji in headers | Preserved; normalized name used internally for matching |
| Trailing whitespace making two "identical" values distinct | Detected, remediation offered |

**Postgres**

| Case | Handling |
|---|---|
| Wrong credentials, host unreachable, timeout | Sanitized, actionable error; never the raw driver string (FR-9.5) |
| SSL required but not configured, or cert verification fails | Explicit guidance on `sslmode` and CA upload |
| Host resolves to a private or metadata IP | Rejected; connect to the pinned validated IP to defeat rebinding (FR-9.4) |
| Permission denied on a selected table | Reported per table; other tables still import |
| Table dropped or renamed between mapping and refresh | Refresh fails cleanly with a schema diff; prior version preserved (FR-11.3) |
| Column type changed since mapping | Diff shown; override reconciliation offered |
| Postgres types with no Parquet analogue (`json`, arrays, `geometry`, custom enums, `interval`) | Enums → string; `json`/arrays → text with a flag; unsupported types unselectable with a reason |
| Very wide table (500+ columns) | Column selection required before import |
| Materialized view / partitioned table / inherited table | Supported for read; partition parents read as a whole |
| Replica lag, or read against primary | Warning recommending a replica; concurrency capped (FR-9.10) |
| Import exceeds row cap mid-stream | Stops at the cap, marks the source truncated, states the count — never silently partial |
| Connection drops mid-import | Job retries with backoff; partial Parquet discarded |

**Consolidation**

| Case | Handling |
|---|---|
| No relationship detectable between sources | Manual builder, or keep as independent datasets — never a silent cross join |
| Cartesian product risk | Cross joins blocked; the manual builder requires at least one key pair |
| N:M join inflating measures | Blocked from auto-apply; inflation factor stated; grain-corrected aggregation on override (FR-5.6) |
| Zero overlap on a name-matched key | Rejected with the observed overlap shown, so the user sees *why* |
| Key type mismatch (`'00123'` vs `123`) | Explicit cast offered with a match-rate preview |
| Key case/whitespace mismatch | Normalization offered as a transform step, with the resulting match rate |
| Null keys | Excluded from matching, counted separately, reported |
| Circular relationships | Detected; the assembly graph is required to be acyclic |
| Timezone mismatch across date columns | Assumed source zone recorded per column; user-settable |
| Currency mismatch across sources | Detected via numFmt/symbol; flagged as un-summable without a stated conversion. **No exchange rate is invented.** |
| Duplicate keys on the intended "1" side | Cardinality reclassified, inflation warning raised before execution |

**Analysis and dashboard**

| Case | Handling |
|---|---|
| No date column | Time-series visuals, growth, seasonality, and trend all omitted; the rest works |
| No measure at all (purely categorical) | Count-based analysis only; measure KPIs absent |
| Single row, or a single distinct value | Charts requiring variance suppressed with an explanation |
| Only one time period | Growth and comparison omitted; no delta shown |
| Partial current period | Labelled "month to date"; not compared to a full prior period (FR-7.4) |
| All-negative or zero-crossing measure | Part-of-whole charts suppressed (percentages are meaningless); bar/line used |
| Extreme outlier flattening a chart | Auto-detected; log scale or outlier isolation offered — data never silently clipped |
| Division by zero in a ratio KPI | `NULLIF`; the KPI is absent rather than `Infinity` |
| Very high cardinality dimension | Top-N + "Other"; excluded from filters per FR-3.7 |
| Filter combination yielding zero rows | Empty state naming the responsible filters, with a clear action |
| Sparse time series (gaps) | Gaps shown as gaps, not interpolated; density stated |
| Insight sample below threshold | Insight suppressed entirely rather than shown with a caveat |
| Tie for "best performer" | Reported as a tie |

**System**

| Case | Handling |
|---|---|
| Browser closed mid-processing | Job continues; progress resumes on return |
| Two users editing one report | Last-write-wins with a stale-version warning and an audit entry |
| Job worker crash | pg-boss redelivery; idempotent steps; partial artifacts cleaned |
| Disk full | Pre-flight size estimate; quota rejection before write; alerting threshold |
| Storage quota exceeded | Blocked with current usage versus limit |
| Session expired mid-flow | Re-auth without losing in-progress configuration |
| Member removed from an org mid-session | Session's org access revoked on the next request |
| Deleting a source used by a report | Blocked, listing the dependent reports |
| Concurrent refresh of one dataset | Second request coalesces onto the running job |
| Export of a dataset that changed mid-render | Export pinned to the `data_version` it started from |
| Clock skew / DST boundary in date bucketing | UTC internally; bucketing in a declared display timezone |

## 9. Success metrics

**Correctness — non-negotiable, all are release gates**

| Metric | Target |
|---|---|
| Cross-tenant data exposure incidents | **0**, absolutely |
| Fabricated or non-reproducible figures in acceptance review | **0** |
| Measure-inflation regression tests passing | **100%** |
| Secrets present in any API response, log, or client bundle | **0**, asserted by test |
| Datasets producing a numerically wrong KPI in acceptance | **0** |

**Adaptivity (G1)**

| Metric | Target |
|---|---|
| Structurally unrelated fixtures (sales, HR, inventory) yielding ≥4 correct KPIs, no code changes | 3 of 3 |
| Columns correctly role-classified across fixtures | ≥ 95% |
| Identifier columns misclassified as measures | 0 |
| Auto-detected relationships accepted by the user without edit | ≥ 70% |
| Datasets needing zero manual mapping to reach a dashboard | ≥ 60% |

**Speed (G4)**

| Metric | Target |
|---|---|
| Upload → interactive dashboard, 100k rows | p50 ≤ 60 s, p95 ≤ 120 s |
| Same, 1M rows | p95 ≤ 6 min |
| Filter/drill interaction latency | p95 < 400 ms |
| Dashboard initial paint | p95 < 2.5 s |
| PDF generation, 12 sections | p95 < 30 s |

**Product value**

| Metric | Target |
|---|---|
| New org reaching a saved report in its first session | ≥ 50% |
| Reports refreshed at least once (the repeatability promise, G6) | ≥ 40% within 60 days |
| Insights marked useful, of those rated | ≥ 60% |
| Self-reported hours saved per reporting cycle | ≥ 4 |
| PDF exports sent onward unedited | ≥ 50% |

**Engineering health**

| Metric | Target |
|---|---|
| Job success rate | ≥ 99% excluding user data errors |
| Unhandled server errors per 1,000 requests | < 1 |
| E2E suite pass rate on main | 100% |
| Critical/high findings open after the prompt-03 audit | 0 |

## 10. Open questions

These need your answers. I will not invent them.

1. **Deployment target — blocking before S13.** The architecture requires a long-running Node process with a persistent volume; serverless will not work. Fly.io with a volume, Render with a disk, Railway, or a plain VM with Docker Compose? This determines the storage abstraction and CI/CD. My recommendation: **Fly.io with a volume** for managed simplicity, or Docker Compose on a VM if you want zero platform lock-in. *Needed by S0 for CI, but S0–S12 can be built and run locally without it.*

2. **Encryption key management.** Database-credential encryption needs a 256-bit key. Environment variable (simple, key sits in the platform's secret store) or a cloud KMS with envelope encryption (auditable, rotatable, more setup)? Recommendation: **env var with an interface designed for KMS**, so migration is a provider swap. Also: do you want a key-rotation path in v1?

3. **SSO scope.** You chose multi-tenant SaaS, which usually implies enterprise buyers asking for SAML. Is email + password sufficient for v1, with SSO in v2? Google OAuth is a cheap middle option that removes password handling for most users. *Affects S1 sizing.*

4. **Billing and quota enforcement.** Should plans and quotas be real (Stripe, metered storage, enforced limits) or stubbed as configurable per-org values with no payment path in v1? Recommendation: **stub the values, enforce the limits, skip payments** — you get the safety without the integration.

5. **Data retention and residency.** How long are uploaded files kept after a dataset is deleted? Is a single region acceptable, or do you need EU data residency for target customers? This affects the storage layer and the deletion job, and is a question enterprise buyers will ask.

6. **LLM phrasing layer.** Enable it at all? It sends computed aggregate facts — not raw rows — to an external API. Recommendation: **build the deterministic templates first and ship with the LLM disabled**, then enable per-org with explicit consent. Which provider and model if enabled?

7. **Sample data for development.** Do you have a representative Excel workbook and a Postgres schema I should build against? This materially changes quality: real data exposes header quirks, encoding issues, and key mismatches that synthetic fixtures never will. If you'd rather not share real business data, anonymized or structurally-identical dummy data is fine — but the *structure* should be yours. **This is the single highest-leverage thing you can give me.**

8. **Product name and branding.** "Confluence BI" is a placeholder and collides with Atlassian Confluence — it should change. Do you have a name, or should I propose options? Affects DESIGN.md and any public copy.
