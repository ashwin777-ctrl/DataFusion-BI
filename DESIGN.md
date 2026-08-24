# DESIGN.md — Consolidated BI Platform

**Companion to [PRD.md](PRD.md). Follow this file on every UI task.**
**Status:** Draft v1, awaiting review
**Last updated:** 2026-08-24

> **How to use this file.** When implementing any screen or component, the relevant
> section here is the source of truth for tokens, layout, states, and behavior.
> Where this brief and a component library's defaults disagree, this brief wins.
> Every color value below has been **run through the data-viz validator or a WCAG
> contrast computation** — the measured numbers are in the tables. Do not substitute
> "close enough" hexes; re-run the validator if you must change one.

---

## 0. Why this brief exists, and the one hard constraint it inherits

The product's whole claim (PRD G2) is *"never show a number that isn't real."* Design
has a direct role in that promise: **the interface must make computed, trustworthy data
visually distinct from absence, uncertainty, and estimation.** An empty state that looks
like a broken state, a loading skeleton that looks like zero data, an approximate figure
that looks exact — each is a *design* failure that breaks the product's core promise.
This is why the four states (loading / empty / error / populated) are specified per
component below and are not optional polish.

The single hardest visual constraint, inherited from the palette validation:

> **Three light-mode chart hues sit below 3:1 contrast on the light surface** — aqua
> `#1baf7a` (2.74:1), yellow `#eda100` (2.11:1), magenta `#e87ba4` (2.62:1). Measured,
> not estimated. The data-viz **relief rule is therefore mandatory in this product, not
> discretionary**: any chart that can surface these hues MUST ship either visible direct
> labels or an always-available table view. This shapes the chart component contract in §7.

---

## 1. Design principles — the three rules this product's UI obeys

Every design decision below is downstream of these. When a choice is unclear, the
principle it serves is the tiebreaker.

### P1 — The data is the only thing allowed to be loud.

Enterprise BI earns trust by looking calm and precise, not by looking exciting. Chrome
(nav, cards, toolbars, borders) recedes to near-monochrome; saturated color appears
**only** where it encodes data — a chart series, a KPI delta, a status. A colored element
that doesn't encode data is a bug. This is what separates a BI *instrument* from a
"dashboard template," and it's the concrete reason we reject the purple-gradient look:
gradients and accent fills spend the user's color-attention budget on decoration, leaving
nothing to distinguish series 3 from series 4.

*Consequence:* one neutral surface family, one restrained action color, and the validated
categorical palette reserved exclusively for marks. No hero gradients. No colored card
backgrounds. No accent color on non-interactive chrome.

### P2 — Show provenance, not just numbers.

Priya (PRD persona A) will be challenged on every figure in a board meeting. The UI must
let her answer "where's that from?" in one click, always. Therefore: every KPI card and
every chart mark is a path to its underlying rows and the SQL that produced it (PRD
FR-7.8). Approximate values are visually marked as approximate (PRD FR-4.2). A comparison
against an incomplete period is labelled as incomplete (PRD FR-7.4). Trust is a visual
property here, built from affordances, not a footnote.

*Consequence:* a persistent "inspect" affordance on data components; an `≈` treatment for
approximations; an explicit "partial period" chip; a details drawer that shows rows + SQL.

### P3 — Absence is information, and must look deliberate.

Because KPIs and charts are *derived* from whatever data exists (PRD G1), the common case
is that a given metric legitimately cannot be computed. The design must make "this can't
be computed from your data, and here's the column that would enable it" read as a
confident product decision — never as a missing feature, a bug, or a zero. An empty
dashboard region explains *why* it's empty and *what would fill it*.

*Consequence:* empty states are first-class, content-specific, and actionable — never a
generic "No data" centered in a box. Loading never collapses layout. Errors state cause
and offer recovery.

---

## 2. Visual direction

**Mood:** *instrument, not brochure.* The reference points are the tools a analyst
already trusts and reads for hours — the restraint of Linear and Stripe's dashboard, the
data-density discipline of Bloomberg and Datadog, the neutral calm of Vercel's console.
Precise, quiet, dense-but-legible. It should feel like a measuring device.

**References to draw from:**
- **Linear** — neutral surfaces, hairline separation, restraint in color, keyboard-first.
- **Stripe Dashboard** — the gold standard for making dense financial data calm and
  scannable; generous type hierarchy over a near-monochrome chrome.
- **Datadog / Grafana** — legitimate high-density dashboards; proof that many panels can
  coexist without noise if chrome is disciplined.
- **Vercel console** — the light/dark neutral system and the "content on a plane" spacing.

**What to avoid — explicitly:**
- The **purple/indigo gradient SaaS template** look. No hero gradients anywhere.
- **Glassmorphism, neumorphism, heavy shadows, glows.** They add visual weight that
  competes with data (violates P1). Elevation is carried by a hairline border and at most
  a single soft shadow token, never a stack of them.
- **Colored card backgrounds / accent-tinted panels.** Cards are surface-colored; color
  lives inside the chart, not behind it.
- **Decorative illustration in empty states.** A small monochrome glyph is the ceiling;
  the words do the work (P3).
- **Rounded-everything and oversized radii.** This reads as consumer-playful; BI reads as
  precise. Radii are small and consistent (§3).
- **Dual-axis charts, pie charts above 6 slices, rainbow sequential scales.** Banned by
  the data-viz method and by PRD FR-7.5/7.6; called out here so they never appear in a mock.
- **Animation as decoration.** Motion is functional only (§9): state transitions, hover
  feedback, skeleton shimmer. Nothing eases in for flourish.

**Density posture:** desktop-first and **information-dense** (this is the analyst's
primary workspace, per PRD §10). Comfortable, not cramped — but closer to Datadog's
density than to a marketing site's airiness. Tablet and mobile relax the density (§8).

---

## 3. Design tokens

All tokens are defined once as CSS custom properties and consumed by role. shadcn/ui is
themed by mapping its semantic variables (`--background`, `--foreground`, `--primary`,
`--muted`, `--border`, …) onto these. **Chart tokens are a separate namespace** (`--viz-*`)
and are *never* used for chrome, nor chrome tokens for marks (enforces P1).

### 3.1 Neutrals & surfaces (the chrome)

Warm-neutral gray, matched to the validated chart surfaces so marks sit correctly on cards.

| Role | Light | Dark | Notes |
|---|---|---|---|
| Page plane | `#f9f9f7` | `#0d0d0d` | app background, behind cards |
| Surface-1 (card) | `#fcfcfb` | `#1a1a19` | **the validated chart surface** — cards, panels |
| Surface-2 (raised) | `#ffffff` | `#232322` | popovers, dropdowns, modals |
| Surface-sunken | `#f2f1ee` | `#111110` | table header, code, wells |
| Text-primary (ink) | `#0b0b0b` | `#ffffff` | headings, values — 18.7:1 on plane |
| Text-secondary | `#52514e` | `#c3c2b7` | body, labels — 7.7:1 / 9.7:1 |
| Text-muted | **`#6e6c66`** | `#9a988e` | axis text, captions, placeholders |
| Border-hairline | `#e1e0d9` | `#2c2c2a` | default 1px separators |
| Border-strong | `#c3c2b7` | `#383835` | input borders, emphasized dividers |
| Focus ring | `#2a78d6` | `#3987e5` | 2px, offset 2px |

> **Corrected from the reference palette:** the reference muted ink `#898781` measures
> **3.50:1 on the light surface — a WCAG AA fail for normal-size text** (axis labels,
> captions). Darkened the light-mode muted token to **`#6e6c66` (5.11:1, AA pass)**.
> The dark-mode muted `#9a988e` measures 6.02:1 (pass). Axis tick text uses text-muted,
> so this fix is load-bearing for chart legibility, not cosmetic.

### 3.2 Action & interactive color

One action color. Deliberately **near-neutral ink**, not a brand hue — pushing saturation
out of the chrome and reserving it for data (P1). This is the Linear/Vercel move.

| Role | Light | Dark | Contrast |
|---|---|---|---|
| Action bg (primary button) | `#0b0b0b` | `#fcfcfb` | 19.2:1 vs its fg |
| Action fg | `#fcfcfb` | `#0b0b0b` | — |
| Action hover | `#2c2c2a` | `#e7e6e0` | — |
| Link / interactive accent | `#2056a8` | `#6da7ec` | link text, selected states |
| Selected-row wash | `rgba(42,120,214,0.08)` | `rgba(57,135,229,0.14)` | table/filter selection |

Blue is the *interactive* accent (links, selection, focus) and is also chart series-1;
this is intentional and safe because the two never appear as peers in the same visual
context — one is chrome, one is a mark.

### 3.3 Status colors (fixed, never themed, never reused as a series)

From the validated status palette. Each **always** ships with an icon + text label — never
color alone (PRD accessibility; data-viz non-negotiable). On the light surface, warning and
serious are sub-3:1 *as fills* by design, which is exactly why the icon+label pairing is
mandatory. For status *text* on a surface, use the darkened text variants.

| Role | Fill | Text-on-surface (light / dark) | Meaning in this product |
|---|---|---|---|
| Good / success | `#0ca30c` | `#006300` / `#0ca30c` | job succeeded, connection verified, quality OK |
| Warning | `#fab219` | `#8a5a00` / `#fab219` | approximate value, partial period, quota near |
| Serious | `#ec835a` | `#a2461f` / `#ec835a` | unmatched rows high, inflation risk flagged |
| Critical | `#d03b3b` | `#b3302c` / `#e66767` | job failed, connection error, quota exceeded |

Destructive **buttons** use fill `#b32e2e` (white text, 6.27:1) not the lighter `#d03b3b`
(4.80:1) — both pass, the darker reads as more serious for a destructive action.

### 3.4 Chart palette (`--viz-*`) — validated, do not edit without re-running the validator

The full parameter set lives in **`references/palette.md`** in the repo (copied from the
data-viz skill). Summary of what's validated and the rules it imposes:

**Categorical (identity) — 8 slots, assigned in fixed order, never cycled:**

| Slot | Hue | Light | Dark |
|---|---|---|---|
| 1 | blue | `#2a78d6` | `#3987e5` |
| 2 | orange | `#eb6834` | `#d95926` |
| 3 | aqua | `#1baf7a` | `#199e70` |
| 4 | yellow | `#eda100` | `#c98500` |
| 5 | magenta | `#e87ba4` | `#d55181` |
| 6 | green | `#008300` | `#008300` |
| 7 | violet | `#4a3aa7` | `#9085e9` |
| 8 | red | `#e34948` | `#e66767` |

Validator result (both modes, adjacent pairlist — bars/lines/stacks): **ALL PASS**. Worst
adjacent CVD ΔE 9.1 light / 8.4 dark; worst normal-vision ΔE 19.6 light / 19.3 dark.

**Hard rules this imposes on every chart (from the validator output):**
1. **Relief rule (light mode):** slots 3/4/5 (aqua/yellow/magenta) are sub-3:1 on the
   light surface → any chart using them MUST have visible direct labels or a table view.
   Since we can't predict which series a dynamic dataset assigns, **every categorical
   chart ships with a table-view toggle** — this is the general mitigation (§7).
2. **All-pairs cap (scatter / bubble / choropleth / small-multiples):** only the **first
   3 slots** clear the all-pairs separation floors. Past three series in these forms,
   fold to "Other," facet into small multiples, or **add shape encoding** — hue alone is
   insufficient. Dark-mode 3-slot tritan separation is only 4.0, so **scatter marks carry
   distinct shapes (circle/triangle/square) in addition to hue** regardless of mode.
3. **9th category never gets a generated hue** — it folds to "Other," always.

**Sequential (magnitude — heatmaps, choropleths):** single blue hue, light→dark, steps
100→700 in `references/palette.md`. Never a rainbow.

**Diverging (polarity — variance vs target, growth ±):** blue ↔ red, neutral gray midpoint
(`#f0efec` light / `#383835` dark). Equal steps per arm. Midpoint is never a hue.

**Texture (the CVD/print/forced-colors backup channel):** one hand-drawn "Lines" fill at
45°/135°, opt-in via the accessibility setting (§10), print, or `forced-colors`.

### 3.5 Typography

**One typeface, system sans** — no display or serif face anywhere (data-viz rule; a serif
hero number reads as off-brand decoration). This also means zero webfont payload and native
rendering on every OS.

```
--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", Menlo, monospace;
```
Mono is used **only** for: SQL in the inspect drawer, connection strings, code, and raw
identifier names during mapping. Never for data values.

**Type scale** (1.20 minor-third, rem @ 16px base):

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `text-hero` | 48px / 1.0 | 600 | the single hero figure on a report cover only |
| `text-kpi` | 30px / 1.1 | 600 | KPI card values |
| `text-h1` | 24px / 1.25 | 600 | page title |
| `text-h2` | 20px / 1.3 | 600 | section headers |
| `text-h3` | 16px / 1.4 | 600 | card titles |
| `text-body` | 14px / 1.5 | 400 | default body, table cells |
| `text-sm` | 13px / 1.45 | 400 | secondary labels, KPI labels |
| `text-xs` | 12px / 1.4 | 500 | axis ticks, captions, chips, table headers (uppercase, +0.02em) |

**Numeric figures (data-viz rule):** big standalone numbers (hero, KPI value) use
**proportional** figures — the default. `font-variant-numeric: tabular-nums` is reserved
for **columns that align vertically**: table numeric cells, axis ticks, the inspect grid.
Applying tabular to a 30px KPI value makes `121` look loose — don't.

**Value formatting (consistent everywhere):** compact for display (`1,284` / `12.9K` /
`$4.2M` / `18.4%`), full precision in tooltips and the table view. Currency uses the
detected symbol from the source number format (PRD FR-3.4). Locale-aware thousands
separators.

### 3.6 Spacing, radius, elevation

**Spacing** — 4px base scale: `0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Card padding
20px desktop / 16px tablet. Dashboard grid gap 16px. Section gap 32px.

**Radius** — small and consistent (precise, not playful): `--radius-sm: 4px` (chips,
inputs, buttons), `--radius-md: 8px` (cards, panels, popovers), `--radius-lg: 12px`
(modals). Data-end bar corners are 4px (data-viz mark spec), independent of these.

**Elevation** — carried by hairline border first, shadow second. Exactly three levels:
- `elev-0` — flat on plane, hairline border. (cards, panels — the default)
- `elev-1` — `0 1px 2px rgba(11,11,11,0.06)` + hairline. (dropdowns, hover-lift)
- `elev-2` — `0 8px 24px rgba(11,11,11,0.12)` + hairline. (modals, command palette)

Dark mode uses border definition over shadow (shadows read poorly on dark); shadow opacity
halved. No glows, no stacked shadows (P1).

### 3.7 Iconography

One icon set: **Lucide** (ships with shadcn/ui). Stroke 1.5–2px, sized 16/20/24. Icons are
`--text-secondary` unless they carry status (then the status color + always a text label).
Monochrome only. No filled/duotone decorative icons.

---

## 4. Screen inventory

Sidebar-navigated app shell. Every screen lists its purpose and its primary action.

| # | Screen | Route | Purpose | Primary action |
|---|---|---|---|---|
| 1 | **Sign in / Sign up** | `/login`, `/signup` | Auth; signup creates the org | Sign in |
| 2 | **Accept invite** | `/invite/:token` | Join an existing org | Accept & set password |
| 3 | **Dashboard list (Home)** | `/` | Saved reports grid; entry point | New report |
| 4 | **New report — Wizard** | `/reports/new` | The 8-step ingestion→dashboard flow (§6) | Next / Continue |
| 5 | **Report dashboard** | `/reports/:id` | The live interactive BI dashboard | Refresh / Export |
| 6 | **Data sources** | `/sources` | All uploaded files + PG connections | Add source |
| 7 | **Source detail** | `/sources/:id` | Profile, quality, column overrides for one source | Edit mapping |
| 8 | **PG connections** | `/connections` | Manage Postgres connections | New connection |
| 9 | **Data processing** | `/reports/:id/pipeline` | Inspect/edit transforms, joins, quality for a report | Re-run |
| 10 | **Insights** | `/reports/:id/insights` | Ranked computed insights, anomalies, outliers | Add to report |
| 11 | **Report builder / export** | `/reports/:id/export` | Compose & export the 12-section report | Generate PDF |
| 12 | **Members** | `/settings/members` | Invite, roles, remove (admin+) | Invite member |
| 13 | **Settings** | `/settings` | Org profile, quotas, theme, LLM toggle, appearance | Save |
| 14 | **Audit log** | `/settings/audit` | Security/compliance event trail (admin+) | Export log |
| 15 | **Account** | `/account` | Profile, password, sessions, org switch | — |
| 16 | **Job center** | overlay / `/jobs` | All running/failed background jobs + progress | Retry |
| 17 | **404 / 403 / 500** | — | Error boundaries | Go home |

Screens 5, 9, 10 share the report context; a secondary tab bar under the report title
switches between Dashboard / Pipeline / Insights / Export without leaving the report.

---

## 5. User flows (core journeys, step by step)

### Flow A — First run: signup → first dashboard (the activation path)
1. `/signup` → email + password (argon2id, 12-char min) → org auto-created, user is owner.
2. Land on `/` (empty state P3: "Create your first report" with the two source types).
3. **New report wizard** (Flow C) → produces a live dashboard.
4. Dashboard renders with real KPIs; a one-time coach-mark points at Refresh and Inspect.
5. Save → named report appears on `/`. **Activation = reached a saved report** (PRD metric).

### Flow B — Add a Postgres connection (gatekeeper-safe, PRD FR-9)
1. `/connections` → New connection → form (host/port/db/user/password/SSL, `verify-full`
   default with inline explanation of why).
2. **Test** (server-side, SSRF-guarded, 10s timeout) → inline result: green "Verified,
   read-only confirmed" or sanitized error with guidance. Password never echoed back.
3. Save (encrypted server-side; UI shows only `hasPassword: true`).
4. Connection is now selectable as a source in the wizard.

### Flow C — The 8-step wizard (§6 details each step's UI)
`Upload/Connect → Preview → Map → Clean → Consolidate → Analyze → Dashboard → Report`.
A persistent top **stepper** shows all 8, current highlighted, completed checked, future
muted. Back is always allowed and non-destructive (config persists per step). "Continue"
is disabled with an inline reason until the step's minimum is satisfied. Long steps
(parse, consolidate, analyze) run as jobs with live progress (§7 job states) and the user
may navigate away and return.

### Flow D — Monthly refresh (the repeatability promise, PRD G6)
1. Open saved report → **Refresh** (or Replace source file / Reconnect PG).
2. Confirm dialog states what will re-run and that layout/mappings are preserved.
3. Job runs (progress); on schema-compatible data, dashboard updates in place,
   `data_version` increments.
4. On schema drift: a **diff panel** shows added/removed/changed columns and which
   overrides/joins are affected; the previous version stays live until the user resolves
   (PRD FR-11.3). Nothing is silently dropped.

### Flow E — Inspect a number (the trust path, P2)
Any KPI value or chart segment → click → **inspect drawer** slides from the right: the
figure, its formula in plain language, the exact SQL (mono), the filter context applied,
and a paginated grid of the underlying rows. "Export these rows" available. This is the
same drawer everywhere, so it's learned once.

### Flow F — Generate the report (PRD FR-11.4)
1. `/reports/:id/export` → live preview of the 12 sections; sections whose data doesn't
   exist are **absent** (P3), listed in a "not included, because…" note so their absence
   is explained, not mysterious.
2. Choose format (PDF / Excel / CSV) → job → download when ready (Job center + toast).

---

## 6. Per-screen layout — the wizard (steps 1–8) and the dashboard

Layout notation is desktop-first; §8 covers reflow. Every step's chrome: stepper on top,
step title + one-line purpose, content, sticky footer with Back / Continue(+reason).

### Step 1 — Upload / Connect
- Two-choice segmented control: **Upload files** | **Connect database**.
- *Upload:* large drop zone (drag or browse), accepted types + limits stated up front
  (100MB, 10 files). Each file becomes a row with name, size, type-detected badge, remove.
  Client-side pre-check (extension + size) is a courtesy; the real validation is
  server-side (PRD FR-2.1) and its result replaces the optimistic badge.
- *Connect:* pick an existing connection or add one (Flow B). Then schema → table tree
  with row-count and column-count per table; checkbox selection; per-table column
  multiselect. A running "selected: N tables, M columns, ~R rows" summary.
- Empty state: which types are supported and one line on what happens next.
- Primary: Continue (enabled once ≥1 source is selected).

### Step 2 — Preview
- One panel per selected source (tabs if many). Header: detected sheet/table name,
  row/column count.
- **Header-row control** (Excel): a small preview of the first ~8 rows with the detected
  header row highlighted; a stepper to move the header row / set skip-rows; live re-parse
  of the preview (PRD FR-2.6).
- **Column type strip:** each detected column shows name + a **role badge** (dimension /
  measure / date / identifier / geo) + subtype, with confidence shown as a subtle bar. A
  low-confidence badge is visually flagged for attention (not alarm).
- Paginated sample grid (server-paginated, ~50 rows) with type-aware cell rendering.
- Inline override: click a badge → change role/subtype/date-pattern (PRD FR-3.9). The
  **identifier-vs-measure** case gets a specific hint ("Looks like an ID, so it won't be
  summed — change if this is a quantity").
- Primary: Continue.

### Step 3 — Data mapping (relationships)
- **Relationship canvas:** each source is a node (name, row count, key columns listed);
  detected relationships are edges labelled with cardinality (1:N etc.) and a **confidence
  chip** (color = confidence band). FK-derived edges carry a "from database keys" badge and
  outrank guesses (PRD FR-9.6).
- Each edge, on select, opens a panel: the two key columns, **measured overlap %** and
  matched/unmatched counts (not a guess — PRD FR-5.2), join-type selector
  (INNER/LEFT/RIGHT/FULL/UNION), and cast control.
- **Inflation warning** (PRD FR-5.6, satisfies G3) is the visually loudest thing on this
  screen when present: a serious-status banner on the edge — *"This join turns 12,480 order
  rows into 41,300 — Revenue would be overstated ~3.3×."* — blocking auto-apply, requiring
  explicit confirm, offering the grain-corrected option.
- **Manual join builder** for undetected relationships (composite keys, cast, live
  match-rate preview on a sample).
- Empty/none-detected state: explains no relationship was found and offers the manual
  builder or "keep sources independent."
- Primary: Continue (enabled when every source is either joined or explicitly independent).

### Step 4 — Data cleaning
- **Data Quality Summary** panel (PRD FR-4.1): a row of stat tiles — records, columns,
  missing %, duplicate rows, invalid values, unmatched — each computed over the full
  dataset (approximations badged `≈`, P2). Click any tile → the offending rows in the
  inspect grid.
- **Issues list:** each detected issue is a card with the count, an example, and a
  remediation control (per PRD FR-6.2 step types) that **previews its row-count effect
  before apply** (PRD FR-6.3). Applied steps become entries in the transform log.
- **Transform log** (side rail): ordered, reorderable, each step toggleable — making the
  replayable pipeline (PRD FR-6.1) visible and editable.
- Primary: Continue.

### Step 5 — Consolidation
- Progress view while the unified dataset materializes (job + SSE). On completion: a
  before/after summary — sources in, rows per source, merged row count, unmatched per side
  (PRD FR-5.10) — as a small sankey-ish flow or a plain summary table (no fake chart).
- Primary: Continue.

### Step 6 — Analysis
- Progress while KPIs/insights compute. On completion: a compact summary of **what was
  derived** — "8 KPIs, 6 charts, 11 insights" — with the chance to preview and toggle
  which KPIs/charts carry to the dashboard.
- This is where P3 is most visible: a short, non-apologetic list of **what could not be
  computed and the column that would enable it** ("No profit KPI — needs a cost measure").
- Primary: Go to dashboard.

### Step 7 — The dashboard (the product's centerpiece)
Layout, top to bottom:
1. **Report header bar:** report name (editable inline), data-version + last-refreshed
   timestamp, primary date-column indicator, and actions: Refresh, Export, Save,
   context-tab bar (Dashboard / Pipeline / Insights / Export).
2. **Global filter row** (data-viz rule: one row, above content): date-range picker first
   (presets as rows + custom), then dimension filters (comboboxes) for eligible dimensions
   (PRD FR-3.7), then key-measure range filters. Active filters show as removable chips.
   Filter state is URL-encoded (PRD FR-8.3). Refetch **keeps the frame** — charts hold
   previous render at reduced opacity, no skeleton flash (data-viz rule).
3. **KPI card row:** the computable KPIs (PRD FR-7.3 — uncomputable ones are *absent*).
   Each card §7.1.
4. **Chart grid:** responsive 12-col grid, charts auto-composed and auto-placed
   deterministically (PRD FR-8.1). Time series span wider; categorical bars half-width;
   distributions and part-of-whole quarter/third. Each chart §7.2.
5. **Insight strip / rail:** top-ranked computed insights as readable sentences with their
   method + sample size available on hover (PRD FR-10). "See all" → Insights screen.

Nothing on this screen is placeholder. If the dataset yields two KPIs and three charts,
that's what renders — the grid reflows, it doesn't pad with fakes (PRD §16, P3).

### Step 8 — Report
Covered by Flow F / §7.6.

### Dashboard grid — responsive column spans

| Chart form | Desktop (12-col) | Tablet (8-col) | Mobile (4-col) |
|---|---|---|---|
| Time series (line/area) | 8 | 8 | 4 |
| Categorical bar | 6 | 4 | 4 |
| Part-of-whole (donut) | 4 | 4 | 4 |
| Distribution (histogram) | 6 | 4 | 4 |
| Scatter | 6 | 8 | 4 |
| Heatmap / treemap | 8 | 8 | 4 |
| Geo (choropleth) | 8 | 8 | 4 |
| Data table | 12 | 8 | 4 |

---

## 7. Component library — every reusable component, with variants and states

Built on **shadcn/ui** (Radix primitives + Tailwind), themed via §3 tokens. Charts are
**Recharts** wrapped in a house `<Chart>` shell that enforces the data-viz mark specs,
the relief rule, and the four states. Every data component implements **loading / empty /
error / populated** — this is a hard contract, per P3 and PRD FR-8.7.

### 7.1 KPI card (`<StatTile>`)
- **Contract (data-viz stat-tile):** `label` (sentence case, no trailing colon,
  `text-sm` secondary) · `value` (`text-kpi`, semibold, proportional figures, auto-compact)
  · optional `delta` (signed, vs a *named* period, color = direction × up-is-good, with ▲/▼
  icon — never color alone) · optional `sparkline` (12-point, de-emphasis hue, current
  period accented).
- **Provenance (P2):** whole card is clickable → inspect drawer (Flow E). A small inspect
  glyph appears on hover.
- **Approximation (P2):** if the value is approximate, an `≈` prefix + a tooltip stating
  why. If the delta compares against a partial period, a "partial" chip (warning status).
- **States:** *loading* — skeleton of label + value bar, fixed height (no layout shift).
  *empty* — never rendered (an uncomputable KPI is absent, P3/FR-7.3). *error* — if this
  KPI's query fails while siblings succeed, the card shows a compact "couldn't compute"
  with retry, rather than removing itself (distinguish failure from absence).
- **Variants:** default · with-sparkline · with-delta · compact (report PDF).

### 7.2 Chart shell (`<Chart>`)
Wraps every Recharts chart. Enforced features (data-viz method, PRD FR-7.7):
- **Header:** title (`text-h3`), optional subtitle, and a right-aligned control cluster:
  sort toggle, **table-view toggle** (the relief-rule mitigation — always present on
  categorical charts), download (PNG/CSV of that chart's data), and inspect (→ SQL + rows).
- **Marks:** thin marks; bars ≤24px with 4px rounded data-end square at baseline; 2px
  lines; ≥8px markers with 2px surface ring; area fill ~10% opacity; 2px surface gap
  between touching bars/segments; hairline solid gridlines; recessive axes. (All from
  marks-and-anatomy; the shell sets these so individual charts can't drift.)
- **Legend:** present for ≥2 series (rect key for bar/area, line key for line); **absent
  for a single series** (title names it). ≤4 series may also be direct-labeled; never a
  label on every point.
- **Color:** categorical hues assigned in fixed order by entity, **never by rank**, never
  cycled; a filter that drops series never repaints survivors (data-viz non-negotiable).
  9th+ category → "Other."
- **Text tokens, never series color, for labels/values/legend text** (data-viz rule).
- **Hover layer (default, not optional):** crosshair + one-tooltip-all-series on
  line/area; per-mark hover tooltip on bar/dot/cell with the mark lifting on hover; hit
  target ≥24px; tooltip inserts untrusted category/series names via `textContent` only
  (data-viz + XSS safety); values lead, labels follow.
- **Drill-down:** where the semantic model supports it, a click drills (date hierarchy /
  categorical containment) with a breadcrumb to return (PRD FR-8.4/8.5).
- **Four states:** *loading* — axis frame + shimmer, no collapse. *empty* — states whether
  it's "no data for this field" or "filtered to nothing" + a clear-filters action (P3).
  *error* — plain cause + retry. *populated* — the chart.
- **Chart types** (chosen by the engine per PRD FR-7.5, not by the user): line, area,
  vertical bar, horizontal bar (top-N + Other), multi-series line (≤6), donut (≤6, shares
  ~100%), scatter (**shape + hue**, ≤3 hues then facet), histogram (Freedman–Diaconis
  bins), heatmap (sequential), treemap, choropleth (bundled TopoJSON, sequential), and the
  ranked **data table with inline bars** for high-cardinality dimensions.

### 7.3 Data table (`<DataGrid>`)
Server-paginated (keyset), used for previews, unmatched-row inspection, the inspect grid,
and the high-cardinality chart fallback.
- Sticky header (`text-xs` uppercase, sunken surface), tabular-nums numeric cells,
  right-aligned numbers, type-aware rendering (dates formatted, currency with symbol,
  nulls as a muted "—" that is visually distinct from empty string, booleans as ✓/·).
- Column sort, column show/hide, per-column filter where cheap. Row-count + "showing X–Y
  of Z". Loading = row skeletons; empty = content-specific; error = retry.
- **Never loads the full dataset** (PRD FR-8.6) — always paginated from the server.

### 7.4 App shell
- **Sidebar** (collapsible to icons): org switcher at top (avatar + name + chevron →
  membership list, PRD FR-1.4), primary nav (Home, Sources, Connections, Reports),
  secondary (Insights, Settings, Audit), user menu at bottom. Active item: strong text +
  a 2px left accent bar (the one place the interactive accent touches chrome, as a
  wayfinding aid).
- **Top bar** (contextual): breadcrumb, screen primary action, job-center bell (badge =
  active jobs), theme toggle, command palette trigger (⌘K).
- **Command palette:** navigate, search reports/sources, run actions. Keyboard-first (P: instrument).

### 7.5 Wizard stepper, relationship canvas, transform log, quality tiles, connection form
Specified inline in §6; each follows the token system and the four-state contract. The
**connection form** additionally: password field is write-only (never populated from
server), SSL mode defaults to `verify-full` with an inline "why", and the Test result is
an inline status row (never a raw driver error — PRD FR-9.5).

### 7.6 Report export preview (`<ReportComposer>`)
- Left: section list (the 12, with absent ones greyed and annotated "not included:
  needs X"). Right: live paginated preview matching the PDF.
- The **PDF is server-rendered React → print CSS → headless Chromium** (PRD FR-11.5), so
  this same component, under a `print` stylesheet, *is* the PDF — the preview cannot drift
  from the output. Cover page (org, report name, period, generated-at), TOC with page
  numbers, running header/footer, vector charts, print typography (larger base, black ink,
  page-break control between sections).
- Export buttons per format; each spawns a job → Job center + toast → download.

### 7.7 Feedback components
- **Toasts** (success / info / warning / error) — top-right, auto-dismiss success/info,
  persist errors until dismissed, each with icon + label (never color alone). Used for job
  completion, save, export ready (PRD success-notification requirement).
- **Job center** — a panel listing active/failed jobs with stage + % (SSE-driven, PRD
  FR-12.3), retry on failed (PRD FR-12.6), and a link to the resulting artifact.
- **Confirm dialogs** — destructive actions (delete report/source/connection, discard) use
  a modal naming the exact consequence and the destructive-fill button (§3.3). Delete is a
  30-day soft delete (PRD FR-11.2), stated in the dialog.
- **Inline validation** — form errors appear under the field, `text-xs` critical, with the
  field border in border-strong+critical; never only a toast.

---

## 8. Responsive behavior

Desktop-first (the analyst's workspace), with genuine — not merely shrunk — tablet and
mobile layouts.

**Breakpoints:** `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Dashboard grid is
12-col ≥xl, 8-col md–lg, 4-col <md (spans in §6 table).

| Region | Desktop (≥xl) | Tablet (md–lg) | Mobile (<md) |
|---|---|---|---|
| Sidebar | expanded, pinned | collapsed to icons, expand on hover | off-canvas drawer via hamburger |
| Filter row | single inline row | inline, wraps to 2 rows | collapses into a "Filters (N)" sheet |
| KPI cards | 4–6 across | 2–3 across | 1–2 across, horizontal scroll-snap |
| Chart grid | 12-col, multi-per-row | 8-col, ~2 per row | 1 per row, full width |
| Data table | all columns | priority columns + horizontal scroll | card-per-row or 2–3 key columns |
| Wizard stepper | full labels | numbers + current label | current step + "N of 8" |
| Inspect drawer | right side panel | right side panel | full-screen sheet |
| Report preview | two-pane | stacked | single column, section nav |

**Rules:** charts keep a minimum legible height (never squash below ~200px — reflow to one
column instead); tap targets ≥44px on touch; hover-only affordances (inspect glyph, sort)
get a persistent tap equivalent on touch; density relaxes one notch on touch (padding
16→20, larger controls). Mobile is for *reading* a dashboard and reports, not building the
pipeline — the wizard's heavy steps (mapping canvas) show a "best on a larger screen"
notice but remain viewable.

---

## 9. Motion

Functional only (P1 — nothing eases in for flourish). Durations short, easing standard.

| Motion | Duration / easing | Purpose |
|---|---|---|
| Hover feedback (lift, wash) | 100ms ease-out | responsiveness |
| State change (loading→populated) | 150ms cross-fade | avoid flash |
| Drawer / sheet / modal | 200ms ease-out (in), 150ms (out) | spatial continuity |
| Filter refetch | frame held at 60% opacity, no reflow | data-viz rule — no skeleton flash |
| Skeleton shimmer | 1.2s linear loop | loading affordance |
| Chart draw-in | ≤300ms, once, on first mount only | orientation, not decoration |
| Drill-down transition | 200ms | show hierarchy movement |
| Toast enter/exit | 150ms slide+fade | — |

**`prefers-reduced-motion`:** all of the above collapse to instant or a ≤80ms opacity
change; the chart draw-in and shimmer are disabled entirely. Non-negotiable.

---

## 10. Accessibility

Target **WCAG 2.1 AA**, verified by computation, not judgment. This section is a checklist
the E2E/axe suite (PRD S14) asserts against.

**Contrast (all measured — §3 tables):**
- Text-primary/secondary/muted all ≥4.5:1 on their surfaces in both modes (muted fixed to
  `#6e6c66` = 5.11:1 light; the reference `#898781` failed at 3.50:1 and is not used for
  light-mode text).
- Interactive/UI elements and focus ring ≥3:1.
- **Chart series are never identity-by-color-alone:** legend always present for ≥2 series;
  ≤4 also direct-labeled; scatter carries shape; the **relief rule** (visible labels or
  table view) covers the three sub-3:1 light hues; **texture channel** available for full
  CVD/print/forced-colors. Color-blindness safety is *validated* (§3.4), not asserted.
- Status is icon **+ label + color**, never color alone (§3.3).

**Keyboard & focus (P: instrument — keyboard-first anyway):**
- Every interactive element reachable and operable by keyboard; logical tab order
  following visual order; visible 2px focus ring with 2px offset on every focusable.
- Command palette (⌘K) and skip-to-content link.
- Charts: keyboard-navigable data points (arrow keys move the crosshair / move between
  bars), focus shows the same tooltip content as hover (data-viz rule); the table view is
  the guaranteed-accessible equivalent of every chart.
- Modals/drawers trap focus and restore it on close; Esc closes; Radix handles the ARIA.

**Semantics:**
- Landmark regions (`header/nav/main/aside`), one `h1` per page, ordered headings.
- Data tables use real `<th scope>`; sortable headers announce sort state.
- Live regions: job progress and toasts announced politely; errors assertively.
- Form fields have associated `<label>`, `aria-describedby` for errors/hints, `aria-invalid`.
- Icon-only buttons carry `aria-label`.
- Images/charts have text alternatives (chart alt = its title + a one-line computed
  summary, e.g. "Line chart, revenue by month, trending up 18% over the period").

**Other:** respects `prefers-reduced-motion` (§9) and `prefers-color-scheme` (theme
follows OS unless the user toggles); `forced-colors` mode falls back to system colors +
the texture channel; target size ≥24px (≥44px on touch); no meaning conveyed by color,
shape, or position alone.

**The accessibility setting** (Settings, PRD §10): a per-user toggle that turns on the
**texture channel** for all charts and increases direct-labeling density — for users who
need CVD-safe encoding beyond the validated hues.

---

## 11. What "done" looks like for a UI task (the checklist)

Before any screen or component is considered complete:

1. Uses **only** §3 tokens — no raw hex, no off-scale spacing, no second typeface.
2. Chrome carries no saturated color; saturated color encodes data only (P1).
3. All four states implemented and distinct: loading (no layout shift) / empty (explains
   why + action) / error (cause + retry) / populated (P3, FR-8.7).
4. Every data figure has a provenance path to rows + SQL; approximations and partial
   periods are visibly marked (P2).
5. Charts pass the data-viz method: correct form for the data's job, validated palette in
   fixed order, relief rule satisfied (table view present), hover layer present, legend
   rules followed, no banned forms (dual-axis, >6-slice pie, rainbow).
6. Keyboard-operable, visible focus, AA contrast (re-run the check if a color changed),
   `prefers-reduced-motion` honored.
7. Responsive per §8 at sm/md/xl; touch targets ≥44px.
8. Verified in **both light and dark** — dark is a selected palette, not an auto-invert.
9. No mock/placeholder data anywhere in the shipped path (PRD §16).
```
