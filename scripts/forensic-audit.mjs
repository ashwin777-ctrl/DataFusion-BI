import { chromium } from "playwright";

const BASE_URL = "https://data-fusion-bi.vercel.app";
const EMAIL = "ashwin@datafusion.io";
const PASSWORD = "Password123!";

function formatMs(ms) {
  return `${ms.toFixed(1)}ms`;
}

async function loginAndGetCookies(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await Promise.all([
    page.waitForURL(/\/app/, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  const cookies = await ctx.cookies();
  await ctx.close();
  return cookies;
}

async function measurePage(context, url, name) {
  const page = await context.newPage();
  const apiCalls = [];

  page.on("response", async (res) => {
    const u = res.url();
    if (u.includes("/api/")) {
      const timing = res.request().timing();
      let size = 0;
      try { size = (await res.body()).length; } catch {}
      apiCalls.push({
        method: res.request().method(),
        url: u.replace(BASE_URL, ""),
        status: res.status(),
        startMs: timing.requestStart,
        durationMs: timing.responseEnd - timing.requestStart,
        size,
      });
    }
  });

  const t0 = performance.now();
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  const total = performance.now() - t0;

  const navTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find(p => p.name === "first-contentful-paint");
    return {
      ttfb: nav.responseStart,
      domInteractive: nav.domInteractive,
      domComplete: nav.domComplete,
      fcp: fcp ? fcp.startTime : null,
    };
  });

  const consoleErrors = [];
  page.on("console", msg => {
    if (msg.type() === "error" || (msg.type() === "warning" && msg.text().toLowerCase().includes("gpu"))) {
      consoleErrors.push(`[${msg.type()}] ${msg.text().substring(0, 120)}`);
    }
  });

  await page.close();

  return { name, url, total, navTiming, apiCalls, consoleErrors };
}

async function measureApiDirect(context, url, method = "GET", body = null) {
  const t0 = performance.now();
  let res;
  if (method === "POST") {
    res = await context.request.post(url, { data: body || {} });
  } else {
    res = await context.request.get(url);
  }
  const duration = performance.now() - t0;
  let responseBody = null;
  try { responseBody = await res.json(); } catch {}
  return {
    url: url.replace(BASE_URL, ""),
    method,
    status: res.status(),
    duration,
    bodySize: JSON.stringify(responseBody || {}).length,
    body: responseBody,
  };
}

async function runForensicAudit() {
  console.log("========================================================");
  console.log("FORENSIC PERFORMANCE INVESTIGATION — LIVE VERCEL PRODUCTION");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("========================================================\n");

  const browser = await chromium.launch({ headless: true });

  // ─────────────────────────────────────────────────────────
  // PHASE 0 — Get auth cookies (login once, reuse)
  // ─────────────────────────────────────────────────────────
  console.log("[PHASE 0] Authenticating once to get session cookies...");
  let cookies;
  try {
    cookies = await loginAndGetCookies(browser);
    console.log(`  ✓ Logged in. ${cookies.length} cookies obtained.\n`);
  } catch (e) {
    console.error("  ✗ Login failed:", e.message);
    await browser.close();
    return;
  }

  // ─────────────────────────────────────────────────────────
  // PHASE 1 — Landing Page (No auth)
  // ─────────────────────────────────────────────────────────
  console.log("[PHASE 1.1] Landing Page (unauthenticated fresh browser)...");
  const freshCtx = await browser.newContext();
  const landingResult = await measurePage(freshCtx, BASE_URL, "Landing Page");
  await freshCtx.close();

  console.log(`  Total: ${formatMs(landingResult.total)}`);
  console.log(`  TTFB (server response): ${formatMs(landingResult.navTiming.ttfb)}`);
  console.log(`  DOM Interactive: ${formatMs(landingResult.navTiming.domInteractive)}`);
  console.log(`  DOM Complete: ${formatMs(landingResult.navTiming.domComplete)}`);
  console.log(`  FCP: ${landingResult.navTiming.fcp ? formatMs(landingResult.navTiming.fcp) : "N/A"}`);

  // ─────────────────────────────────────────────────────────
  // PHASE 2 — Login measurement
  // ─────────────────────────────────────────────────────────
  console.log("\n[PHASE 1.2] Login Page Timing...");
  const loginCtx = await browser.newContext();
  const loginPageResult = await measurePage(loginCtx, `${BASE_URL}/login`, "Login Page");
  console.log(`  Login page load: ${formatMs(loginPageResult.total)}`);
  console.log(`  TTFB: ${formatMs(loginPageResult.navTiming.ttfb)}`);
  console.log(`  FCP: ${loginPageResult.navTiming.fcp ? formatMs(loginPageResult.navTiming.fcp) : "N/A"}`);
  await loginCtx.close();

  // ─────────────────────────────────────────────────────────
  // PHASE 3 — Dashboard (with auth cookies)
  // ─────────────────────────────────────────────────────────
  console.log("\n[PHASE 2] EXACT DASHBOARD TIMELINE (T0 - T27)...");
  const authCtx1 = await browser.newContext();
  await authCtx1.addCookies(cookies);

  const dashPage = await authCtx1.newPage();
  const dashApiCalls = [];
  const dashConsole = [];

  dashPage.on("response", async (res) => {
    const u = res.url();
    if (u.includes("/api/")) {
      const timing = res.request().timing();
      let size = 0;
      try { size = (await res.body()).length; } catch {}
      dashApiCalls.push({
        method: res.request().method(),
        urlShort: u.replace(BASE_URL, ""),
        status: res.status(),
        requestStart: timing.requestStart,
        responseStart: timing.responseStart,
        responseEnd: timing.responseEnd,
        duration: timing.responseEnd - timing.requestStart,
        ttfb: timing.responseStart - timing.requestStart,
        size,
      });
    }
  });

  dashPage.on("console", msg => {
    if (msg.type() === "error" || msg.type() === "warning") {
      dashConsole.push(`[${msg.type()}] ${msg.text().substring(0, 150)}`);
    }
  });

  const T0 = performance.now();
  const dashResponse = await dashPage.goto(`${BASE_URL}/app`, { waitUntil: "domcontentloaded" });
  const T3 = performance.now(); // HTML received (domcontentloaded)

  // Wait for React hydration by looking for interactive elements
  try {
    await dashPage.waitForSelector("[data-testid], h1, h2, nav, main", { timeout: 15000 });
  } catch {}
  const T6 = performance.now(); // React hydration / shell visible

  await dashPage.waitForLoadState("networkidle", { timeout: 30000 });
  const T27 = performance.now(); // All requests finished

  const dashNavTiming = await dashPage.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find(p => p.name === "first-contentful-paint");
    const lcp = performance.getEntriesByType("largest-contentful-paint")?.[0];
    return {
      ttfb: nav.responseStart,
      domInteractive: nav.domInteractive,
      domComplete: nav.domComplete,
      loadEvent: nav.loadEventEnd,
      fcp: fcp ? fcp.startTime : null,
      lcp: lcp ? lcp.startTime : null,
    };
  });

  console.log("\n  DETAILED TIMELINE:");
  console.log(`  T0  = 0ms               — Navigation initiated`);
  console.log(`  T1  = ${formatMs(dashNavTiming.ttfb)}     — TTFB (server starts sending HTML)`);
  console.log(`  T3  = ${formatMs(T3 - T0)}    — HTML fully received (domcontentloaded)`);
  console.log(`  T4  = ${formatMs(dashNavTiming.domInteractive)} — DOM interactive (JS starts executing)`);
  console.log(`  T5  = ${formatMs(dashNavTiming.fcp || 0)}     — First Contentful Paint`);
  console.log(`  T6  = ${formatMs(T6 - T0)}    — React shell visible`);
  console.log(`  T27 = ${formatMs(T27 - T0)}   — All network requests complete`);
  console.log(`  LCP = ${formatMs(dashNavTiming.lcp || 0)}     — Largest Contentful Paint`);

  // Sort API calls by requestStart
  dashApiCalls.sort((a, b) => a.requestStart - b.requestStart);

  console.log("\n  DASHBOARD API WATERFALL:");
  console.log("  ─────────────────────────────────────────────────────────────────────────────");
  console.log("  Method  Status  Duration  TTFB    Size    Endpoint");
  console.log("  ─────────────────────────────────────────────────────────────────────────────");
  for (const call of dashApiCalls) {
    const method = (call.method || "GET").padEnd(6);
    const status = String(call.status).padEnd(6);
    const dur = formatMs(call.duration).padEnd(10);
    const ttfb = formatMs(call.ttfb).padEnd(8);
    const size = `${call.size}B`.padEnd(8);
    console.log(`  ${method}  ${status}  ${dur}  ${ttfb}  ${size}  ${call.urlShort}`);
  }

  const slowestApi = dashApiCalls.reduce((max, c) => c.duration > max.duration ? c : max, { duration: 0, urlShort: "none" });
  console.log(`\n  ⚠ SLOWEST API: ${slowestApi.urlShort} → ${formatMs(slowestApi.duration)}`);

  if (dashConsole.length > 0) {
    console.log(`\n  CONSOLE ISSUES DURING DASHBOARD LOAD:`);
    dashConsole.slice(0, 10).forEach(msg => console.log(`    ${msg}`));
  }

  await dashPage.close();

  // ─────────────────────────────────────────────────────────
  // PHASE 6 — Repeated Work: Refresh, Navigate Away, Return
  // ─────────────────────────────────────────────────────────
  console.log("\n[PHASE 6] REPEATED WORK CHECK — Refresh, Return, Refresh...");

  const authCtx2 = await browser.newContext();
  await authCtx2.addCookies(cookies);

  // First load
  const p2 = await authCtx2.newPage();
  const apis_first = [];
  p2.on("response", async (res) => {
    if (res.url().includes("/api/")) {
      let size = 0;
      try { size = (await res.body()).length; } catch {}
      apis_first.push({ url: res.url().replace(BASE_URL, ""), method: res.request().method(), status: res.status(), dur: res.request().timing().responseEnd - res.request().timing().requestStart, size });
    }
  });
  const tFirst = performance.now();
  await p2.goto(`${BASE_URL}/app`, { waitUntil: "networkidle", timeout: 30000 });
  const tFirstEnd = performance.now();
  console.log(`\n  FIRST LOAD: ${formatMs(tFirstEnd - tFirst)} | ${apis_first.length} API calls`);
  apis_first.forEach(a => console.log(`    [${a.method}] ${a.status} ${a.url} ${formatMs(a.dur)}`));

  // Refresh
  const apis_refresh = [];
  p2.on("response", async (res) => {
    if (res.url().includes("/api/")) {
      let size = 0;
      try { size = (await res.body()).length; } catch {}
      apis_refresh.push({ url: res.url().replace(BASE_URL, ""), method: res.request().method(), status: res.status(), dur: res.request().timing().responseEnd - res.request().timing().requestStart });
    }
  });
  const tRef = performance.now();
  await p2.reload({ waitUntil: "networkidle", timeout: 30000 });
  const tRefEnd = performance.now();
  console.log(`\n  REFRESH: ${formatMs(tRefEnd - tRef)} | ${apis_refresh.length} API calls`);
  apis_refresh.forEach(a => console.log(`    [${a.method}] ${a.status} ${a.url} ${formatMs(a.dur)}`));

  // Navigate away to sources
  const apis_sources = [];
  p2.on("response", async (res) => {
    if (res.url().includes("/api/")) {
      let size = 0;
      try { size = (await res.body()).length; } catch {}
      apis_sources.push({ url: res.url().replace(BASE_URL, ""), method: res.request().method(), status: res.status(), dur: res.request().timing().responseEnd - res.request().timing().requestStart });
    }
  });
  const tSources = performance.now();
  await p2.goto(`${BASE_URL}/app/sources`, { waitUntil: "networkidle", timeout: 30000 });
  const tSourcesEnd = performance.now();
  console.log(`\n  NAV TO /app/sources: ${formatMs(tSourcesEnd - tSources)} | ${apis_sources.length} API calls`);
  apis_sources.forEach(a => console.log(`    [${a.method}] ${a.status} ${a.url} ${formatMs(a.dur)}`));

  // Return to dashboard
  const apis_return = [];
  p2.on("response", async (res) => {
    if (res.url().includes("/api/")) {
      let size = 0;
      try { size = (await res.body()).length; } catch {}
      apis_return.push({ url: res.url().replace(BASE_URL, ""), method: res.request().method(), status: res.status(), dur: res.request().timing().responseEnd - res.request().timing().requestStart });
    }
  });
  const tReturn = performance.now();
  await p2.goto(`${BASE_URL}/app`, { waitUntil: "networkidle", timeout: 30000 });
  const tReturnEnd = performance.now();
  console.log(`\n  RETURN TO /app: ${formatMs(tReturnEnd - tReturn)} | ${apis_return.length} API calls`);
  apis_return.forEach(a => console.log(`    [${a.method}] ${a.status} ${a.url} ${formatMs(a.dur)}`));

  // Final refresh
  const apis_refresh2 = [];
  p2.on("response", async (res) => {
    if (res.url().includes("/api/")) {
      let size = 0;
      try { size = (await res.body()).length; } catch {}
      apis_refresh2.push({ url: res.url().replace(BASE_URL, ""), method: res.request().method(), status: res.status(), dur: res.request().timing().responseEnd - res.request().timing().requestStart });
    }
  });
  const tRef2 = performance.now();
  await p2.reload({ waitUntil: "networkidle", timeout: 30000 });
  const tRef2End = performance.now();
  console.log(`\n  REFRESH 2: ${formatMs(tRef2End - tRef2)} | ${apis_refresh2.length} API calls`);
  apis_refresh2.forEach(a => console.log(`    [${a.method}] ${a.status} ${a.url} ${formatMs(a.dur)}`));

  await p2.close();
  await authCtx2.close();

  // ─────────────────────────────────────────────────────────
  // PHASE 8/9/11 — Direct API-level Cold vs Warm measurements
  // ─────────────────────────────────────────────────────────
  console.log("\n[PHASE 8/9/11/16] DIRECT API COLD vs WARM MEASUREMENTS...");
  const apiCtx = await browser.newContext();
  await apiCtx.addCookies(cookies);

  // Datasets list
  const ds1 = await measureApiDirect(apiCtx, `${BASE_URL}/api/datasets`);
  const ds2 = await measureApiDirect(apiCtx, `${BASE_URL}/api/datasets`);
  console.log(`\n  GET /api/datasets`);
  console.log(`    Call 1 (cold-warm): ${formatMs(ds1.duration)} | Status: ${ds1.status} | ${ds1.bodySize}B`);
  console.log(`    Call 2 (immediate repeat): ${formatMs(ds2.duration)} | Status: ${ds2.status}`);
  console.log(`    Cold/Warm ratio: ${(ds1.duration / ds2.duration).toFixed(2)}x`);

  // Sources
  const src1 = await measureApiDirect(apiCtx, `${BASE_URL}/api/sources`);
  const src2 = await measureApiDirect(apiCtx, `${BASE_URL}/api/sources`);
  console.log(`\n  GET /api/sources`);
  console.log(`    Call 1: ${formatMs(src1.duration)} | Status: ${src1.status} | ${src1.bodySize}B`);
  console.log(`    Call 2: ${formatMs(src2.duration)} | Status: ${src2.status}`);
  console.log(`    Cold/Warm ratio: ${(src1.duration / src2.duration).toFixed(2)}x`);

  const datasets = ds1.body || [];
  if (Array.isArray(datasets) && datasets.length > 0) {
    const dsId = datasets[0].id;
    const dsName = datasets[0].name;
    console.log(`\n  Testing Dataset: "${dsName}" (${dsId})`);

    // Dataset detail
    const dd1 = await measureApiDirect(apiCtx, `${BASE_URL}/api/datasets/${dsId}`);
    const dd2 = await measureApiDirect(apiCtx, `${BASE_URL}/api/datasets/${dsId}`);
    console.log(`\n  GET /api/datasets/:id`);
    console.log(`    Call 1: ${formatMs(dd1.duration)} | Status: ${dd1.status} | ${dd1.bodySize}B`);
    console.log(`    Call 2: ${formatMs(dd2.duration)} | Status: ${dd2.status}`);
    console.log(`    Cold/Warm ratio: ${(dd1.duration / dd2.duration).toFixed(2)}x`);

    // KPIs — THIS IS THE PRIMARY DUCKDB TEST
    console.log(`\n  POST /api/datasets/:id/kpis  ← PRIMARY DUCKDB TEST`);
    const kpi1 = await measureApiDirect(apiCtx, `${BASE_URL}/api/datasets/${dsId}/kpis`, "POST", {});
    const kpi2 = await measureApiDirect(apiCtx, `${BASE_URL}/api/datasets/${dsId}/kpis`, "POST", {});
    const kpi3 = await measureApiDirect(apiCtx, `${BASE_URL}/api/datasets/${dsId}/kpis`, "POST", {});
    console.log(`    Call 1 (cold container or parquet fetch): ${formatMs(kpi1.duration)} | Status: ${kpi1.status}`);
    console.log(`    Call 2 (warm/cached): ${formatMs(kpi2.duration)} | Status: ${kpi2.status}`);
    console.log(`    Call 3 (warm/cached): ${formatMs(kpi3.duration)} | Status: ${kpi3.status}`);
    console.log(`    Cold/Warm ratio: ${(kpi1.duration / kpi2.duration).toFixed(2)}x`);
    const kpiBody = kpi1.body;
    if (kpiBody) console.log(`    KPI Response: ${JSON.stringify(kpiBody).substring(0, 200)}`);

    // Charts
    const chartPayload = { chartType: "bar", xAxis: null, yAxis: null, aggregation: "count" };
    const ch1 = await measureApiDirect(apiCtx, `${BASE_URL}/api/datasets/${dsId}/charts`, "POST", chartPayload);
    const ch2 = await measureApiDirect(apiCtx, `${BASE_URL}/api/datasets/${dsId}/charts`, "POST", chartPayload);
    console.log(`\n  POST /api/datasets/:id/charts`);
    console.log(`    Call 1: ${formatMs(ch1.duration)} | Status: ${ch1.status}`);
    console.log(`    Call 2: ${formatMs(ch2.duration)} | Status: ${ch2.status}`);
    console.log(`    Cold/Warm ratio: ${(ch1.duration / ch2.duration).toFixed(2)}x`);

    // Insights
    const ins1 = await measureApiDirect(apiCtx, `${BASE_URL}/api/datasets/${dsId}/insights`);
    const ins2 = await measureApiDirect(apiCtx, `${BASE_URL}/api/datasets/${dsId}/insights`);
    console.log(`\n  GET /api/datasets/:id/insights`);
    console.log(`    Call 1: ${formatMs(ins1.duration)} | Status: ${ins1.status} | ${ins1.bodySize}B`);
    console.log(`    Call 2: ${formatMs(ins2.duration)} | Status: ${ins2.status}`);
    console.log(`    Cold/Warm ratio: ${(ins1.duration / ins2.duration).toFixed(2)}x`);

    // Export HTML
    const exp1 = await measureApiDirect(apiCtx, `${BASE_URL}/api/datasets/${dsId}/export`, "POST", { format: "html" });
    console.log(`\n  POST /api/datasets/:id/export (html)`);
    console.log(`    Call 1: ${formatMs(exp1.duration)} | Status: ${exp1.status} | ${exp1.bodySize}B`);
  } else {
    console.log("  ⚠ No datasets found — cannot test DuckDB endpoints");
  }

  await apiCtx.close();

  // ─────────────────────────────────────────────────────────
  // PHASE 12 — Other Pages
  // ─────────────────────────────────────────────────────────
  console.log("\n[PHASE 12] OTHER PAGE TIMING...");
  const pagesCtx = await browser.newContext();
  await pagesCtx.addCookies(cookies);

  const pages = [
    { name: "Dashboard (/app)", url: `${BASE_URL}/app` },
    { name: "Data Sources", url: `${BASE_URL}/app/sources` },
    { name: "Data Prep", url: `${BASE_URL}/app/prep` },
    { name: "Insights", url: `${BASE_URL}/app/insights` },
    { name: "Reports", url: `${BASE_URL}/app/reports` },
    { name: "Settings", url: `${BASE_URL}/app/settings` },
  ];

  for (const pg of pages) {
    const result = await measurePage(pagesCtx, pg.url, pg.name);
    const slowestApi = result.apiCalls.reduce((mx, c) => c.durationMs > mx.durationMs ? c : mx, { durationMs: 0, urlShort: "none" });
    console.log(`  ${pg.name.padEnd(22)} Total: ${formatMs(result.total).padEnd(12)} TTFB: ${formatMs(result.navTiming.ttfb).padEnd(10)} APIs: ${result.apiCalls.length}  Slowest: ${slowestApi.urlShort?.split("/").slice(-2).join("/") || "-"} (${formatMs(slowestApi.durationMs || 0)})`);
  }
  await pagesCtx.close();

  await browser.close();

  console.log("\n========================================================");
  console.log("FORENSIC INVESTIGATION DATA COLLECTION COMPLETE");
  console.log("Proceed to PERFORMANCE_ROOT_CAUSE.md analysis.");
  console.log("========================================================");
}

runForensicAudit().catch(console.error);
