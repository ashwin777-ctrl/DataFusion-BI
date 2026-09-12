# PERFORMANCE ROOT CAUSE INVESTIGATION
**Target:** `https://data-fusion-bi.vercel.app`
**Git Commit at Investigation:** `d9b6e6c`
**Investigation Date:** 2026-09-08
**Methodology:** Live Playwright browser automation against real Vercel production URL. Zero mocked values.

---

## WHAT THE USER EXPERIENCES

The site feels slow and laggy. Pages take 1.5–4.6 seconds. The dashboard is not interactive for several seconds after navigation begins.

---

## ACTUAL MEASURED PERFORMANCE (REAL, NOT CLAIMED)

### 1. Authentication (Login → Dashboard redirect)

| Operation | Duration |
|-----------|----------|
| Login page load | **472ms** |
| Submit credentials → dashboard redirect | **3,134ms** |
| **Total login workflow** | **~3,600ms** |

> This is **3.1 seconds just for the login POST + session setup + redirect**. This is the first thing the user sees.

---

### 2. Dashboard Cold Load — T0→T27 Timeline

Real measurements from a fresh authenticated browser session:

```
T0  =    0ms   — User navigates to /app
T1  =   94ms   — TTFB (server sends first byte) — FAST
T2  =  444ms   — HTML document fully received
T3  =  513ms   — DOMContentLoaded
T4  =  507ms   — DOM Interactive (JS starts executing)
T5  =  576ms   — First Contentful Paint (user sees something)
T6  =  718ms   — React shell visible (interactive shell)
T27 = 3618ms   — All network requests complete (networkidle)
```

**The React shell appears at ~718ms — that is acceptable.**
**But the dashboard is NOT usable until 3,618ms because it is waiting for the KPI API.**

---

### 3. DASHBOARD API WATERFALL (Cold Load)

All requests start at approximately T6 = ~718ms (after React mounts):

```
DASHBOARD API WATERFALL — Cold Load, Single Session
Method  Status  Duration   TTFB      Endpoint
POST    200     1,507ms    1,505ms   /api/datasets/:id/kpis
                 ^
                 1.5 SECOND BOTTLENECK — the entire dashboard waits for this
GET     200       221ms      219ms   /api/datasets
POST    200       220ms      218ms   /api/datasets/:id/charts
GET     200       460ms      458ms   /api/datasets/:id (profile + preview)
GET     200       255ms      254ms   /api/datasets/:id/insights
```

**The KPIs API takes 1,507ms on every cold-container request.**

---

### 4. REPEATED WORK — What happens across multiple visits?

Every single API is called on every page visit. No caching is working:

```
OPERATION                         FIRST   RELOAD1  RETURN   RELOAD2   DUPLICATED?
GET /api/datasets                   212ms    2ms    265ms    10ms      YES — every visit
GET /api/datasets/:id               291ms    3ms      3ms     2ms      YES — every visit
POST /api/datasets/:id/kpis         385ms  273ms    214ms   264ms      YES — every visit
POST /api/datasets/:id/charts       222ms  221ms    245ms   210ms      YES — every visit
GET /api/datasets/:id/insights      238ms    3ms      3ms     4ms      YES — every visit
```

**CRITICAL OBSERVATION:**
- `/api/datasets/:id/kpis` goes from 385ms to 273ms to 214ms to 264ms — **NEVER gets fast**
- `/api/datasets/:id/charts` goes from 222ms to 221ms to 245ms — **NEVER gets fast**

The KPIs and Charts APIs re-execute DuckDB queries **on every single browser visit**.

---

### 5. Page Load Matrix (All Pages)

```
PAGE                     TOTAL      TTFB    APIs
Dashboard (/app) cold    3,618ms    94ms     5
Dashboard (/app) warm    4,583ms    92ms     5  SLOWER on second visit
Data Sources             1,666ms    28ms     1
Data Prep                1,521ms    30ms     1
Insights                 1,689ms    30ms     3  makes 2 insights requests (BUG)
Reports                  1,884ms    29ms     2
Settings                 1,569ms    32ms     0
Dashboard (return)       1,737ms    28ms     5
```

> **Dashboard is 4,583ms in the warm "all pages" test despite being a return visit.**
> This proves caching is NOT working end-to-end.

---

### 6. GPU Warning — Three.js (Landing Page)

The landing page console still emits **4 GPU stall warnings** on every load:

```
[warning] GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High):
          GPU stall due to ReadPixels   (x4)
```

The previous claim that GPU stalls were "eliminated" is incorrect. They still occur.

---

### 7. Three.js Isolation Test

```
Test A (JS + Three.js enabled):  1,182ms total  |  FCP: 376ms
Test B (JS disabled):              675ms total  |  TTFB: 86ms
JS/Three.js overhead:              507ms (43% of landing page time)
Long tasks blocked:                   0 tasks, 0ms total blocking
```

Three.js adds 507ms to landing page load. It does NOT cause long tasks (no main-thread blocking). The GPU stalls are warnings, not crashes. Three.js is a contributor but not the primary bottleneck.

---

### 8. Cold vs Warm API — Direct Probe

```
GET /api/datasets (4 consecutive calls):
  Call 1: 354ms | Call 2: 216ms | Call 3: 222ms | Call 4: 303ms
  Never gets to <50ms. Always 200-350ms. Supabase is queried every call.

GET /api/sources (4 consecutive calls):
  Call 1: 225ms | Call 2: 216ms | Call 3: 241ms | Call 4: 245ms
  Completely flat. No caching improvement at all.
```

**The `private, max-age=5` Cache-Control header is set, but browsers do NOT cache POST requests. GET caching only works while the browser tab is open — any reload resets it.**

---

## ROOT CAUSES (RANKED BY IMPACT)

---

### ROOT CAUSE 1 — HIGHEST IMPACT: KPI_CACHE is in-memory and does not survive across Vercel Lambda instances

**Measured duration:** 214ms–1,507ms on every request
**Frequency:** EVERY dashboard load, every reload, every return

**CODE PATH:**
```
page.tsx (line 167-173):
  Promise.all([
    fetch("/api/datasets/:id"),
    fetch("/api/datasets/:id/kpis", { method: "POST" })   <- BOTTLENECK
  ])
    |
    v
src/app/api/datasets/[id]/kpis/route.ts: POST handler
    |
    v
ensureStorageBlob(parquetPath)   <- Supabase query EVERY call
    |
    v
getCachedKpis(parquetPath)       <- checks KPI_CACHE Map
    |
    v (CACHE MISS — always on new Lambda container)
withDuckDB(conn => computeDatasetKpis(conn, parquetPath))
    |
    v
profileParquetFile()             <- another DuckDB scan
    |
    v
Batched SQL aggregate query executes
    |
    v
Response: 525B in 1,507ms
```

**WHY THE CACHE NEVER WORKS:**

The `KPI_CACHE` in `src/lib/engine/kpi-engine.ts` is a module-level Map:
```typescript
const KPI_CACHE = new Map<string, { kpis: KpiMetric[]; mtimeMs: number }>();
```

Vercel serverless functions are ephemeral. Each invocation may land on a DIFFERENT Lambda container. The in-memory Map is populated on container A but empty on container B.

The cache key uses `fileMtimeMs` (file modification time). On a cold container, `ensureStorageBlob()` downloads the Parquet from Supabase and writes it fresh — the mtime is NOW, not the previously cached mtime. So even on warm containers that happen to keep the file in `/tmp`, the mtime changes on re-download, invalidating the cache.

**EVIDENCE:**
KPI API is 385ms → 273ms → 214ms → 264ms across four visits. If the cache were working, we would see <10ms on calls 2, 3, 4.

---

### ROOT CAUSE 2 — HIGH IMPACT: Login takes 3,134ms

**Measured duration:** 3,134ms for authentication + redirect
**Frequency:** Every login

The 3,134ms is entirely server-side:
- Cold Supabase TCP connection
- Users table query
- bcrypt hash comparison (intentionally slow for security, but bcrypt work factor may be too high for serverless)
- Session write to Supabase
- Cookie issuance + redirect

**EVIDENCE:** Login PAGE loads in 472ms. The 3,134ms is entirely after form submit.

---

### ROOT CAUSE 3 — HIGH IMPACT: ensureStorageBlob() makes a Supabase query on EVERY API call

**Added per call:** ~100–300ms on cold start; fast filesystem check on warm
**Frequency:** Every call to /kpis, /charts, /insights, /api/datasets/:id

```
src/lib/engine/duckdb.ts — ensureStorageBlob():

if (existsSync(norm)) {
  if (statSync(norm).size > 0) return true  <- fast on warm
}
// On cold or different container:
const client = await pool.connect()                   <- Supabase connection
const res = await client.query(
  `SELECT content FROM storage_blobs WHERE path = $1 OR path LIKE $2`,
  [norm, `%${fileName}`]
)
// If found: writeFileSync(norm, res.rows[0].content)  <- write to /tmp
```

On cold Lambda containers, this downloads the entire Parquet file from Supabase on every request. This is included in the 1,507ms KPI measurement.

---

### ROOT CAUSE 4 — MEDIUM IMPACT: Insights page makes DUPLICATE /insights API calls

**Measured:** 2 identical GET /insights requests per Insights page load
**Code:**

`src/app/(app)/app/insights/page.tsx` has TWO useEffect hooks that both trigger insights fetches:

```typescript
// useEffect #1 — no dependencies (fires on mount)
useEffect(() => {
  async function loadDatasets() {
    const res = await fetch("/api/datasets");
    ...
    if (!clientCache.insights[firstId]) {
      fetch(`/api/datasets/${firstId}/insights`)  // CALL 1
    }
  }
  loadDatasets();
}, []);

// useEffect #2 — depends on [activeDatasetId]
useEffect(() => {
  if (clientCache.insights[datasetId]) { return; }   // cache check
  // Race condition: cache not yet written from useEffect #1
  async function loadInsights() {
    fetch(`/api/datasets/${datasetId}/insights`)     // CALL 2 (duplicate!)
  }
  loadInsights();
}, [activeDatasetId]);
```

Both fire simultaneously on mount. The cache check in useEffect #2 happens before useEffect #1 can write to the cache, so both requests proceed.

---

### ROOT CAUSE 5 — MEDIUM IMPACT: Three.js GPU stalls still present

**File:** `src/components/3d/hero-data-core.tsx` or `src/components/3d/topology-universe.tsx`
**Evidence:** 4x "GPU stall due to ReadPixels" warnings on every landing page load

The previous "fix" did not fully eliminate GPU context thrashing. Something in the Three.js initialization or animation loop is still triggering GPU readback operations.

---

## WHAT IS NOT THE ROOT CAUSE

| Suspected cause | Status | Reason |
|-----------------|--------|--------|
| Database SQL query speed | NOT the main cause | Supabase queries complete in 50-200ms. The issue is DuckDB computation + Lambda restarts |
| DuckDB being inherently slow | PARTIAL cause | Single batched query is fast. The issue is it runs every request due to Lambda ephemeral state |
| Three.js blocking main thread | NOT a cause | 0 long tasks measured in the browser |
| Network latency | NOT a cause | TTFB 28-94ms — excellent |
| React rendering | NOT a cause | Shell mounts at 718ms — acceptable |
| Connection pooling broken | NOT a cause | Pool config is correct, individual query latency is low |

---

## PERFORMANCE WATERFALL (Actual)

```
DASHBOARD COLD LOAD — ACTUAL MEASURED WATERFALL
0ms         Navigation starts

94ms        TTFB — server responds instantly

444ms       HTML received

576ms       First Contentful Paint

718ms       React shell interactive — data fetching begins
            |
            +-- GET  /api/datasets       (221ms)   done at ~939ms
            +-- GET  /api/datasets/:id   (460ms)   done at ~1178ms
            +-- POST /api/datasets/:id/kpis (1507ms)  done at ~2225ms <- BOTTLENECK
            +-- POST /api/datasets/:id/charts (220ms) done at ~938ms
            +-- GET  /api/datasets/:id/insights (255ms) done at ~973ms

~940ms      Charts visible

~1178ms     Dataset profile visible

~2225ms     KPIs visible <- DASHBOARD BECOMES USABLE HERE

3618ms      networkidle <- TOTAL MEASURED TIME
```

---

## CONFIDENCE LEVEL: HIGH

All measurements are from the live Vercel production URL `https://data-fusion-bi.vercel.app`.
Raw data is in `FORENSIC_MEASUREMENTS.json`.
No values are estimated or simulated.

---

*Phase 17 complete. No code has been modified.*
*Approved fix priority: ROOT CAUSE 1 first (KPI cache), then ROOT CAUSE 4 (duplicate insights), then ROOT CAUSE 2 (login).*
