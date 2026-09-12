/**
 * FORENSIC LIVE PERFORMANCE PROBE
 * ================================
 * Real browser instrumentation against https://data-fusion-bi.vercel.app
 * Phase 0–17 of the forensic investigation.
 *
 * DO NOT MODIFY THE APP CODE.
 * This script only measures. It makes no changes to production.
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE_URL = "https://data-fusion-bi.vercel.app";
const EMAIL = "ashwin@datafusion.io";
const PASSWORD = "Admin@123456";
const OUTPUT_FILE = "FORENSIC_MEASUREMENTS.json";

const t = () => performance.now();
const ms = (n) => `${Math.round(n)}ms`;
const dur = (a, b) => Math.round(b - a);

function banner(msg) {
  const line = "=".repeat(60);
  console.log(`\n${line}`);
  console.log(msg);
  console.log(line);
}

function section(msg) {
  console.log(`\n── ${msg}`);
}

// ──────────────────────────────────────────────────────────────
// STEP 0: Git commit hash (freeze the state)
// ──────────────────────────────────────────────────────────────
let gitHash = "unknown";
try {
  const { execSync } = await import("node:child_process");
  gitHash = execSync("git rev-parse --short HEAD", { cwd: process.cwd() }).toString().trim();
} catch {}

const measurements = {
  gitHash,
  timestamp: new Date().toISOString(),
  targetUrl: BASE_URL,
  phases: {},
};

banner("FORENSIC PERFORMANCE INVESTIGATION — LIVE VERCEL PRODUCTION");
console.log(`Target: ${BASE_URL}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log(`Git commit: ${gitHash}`);

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

// ──────────────────────────────────────────────────────────────
// PHASE 0: Authenticate once, get cookies
// ──────────────────────────────────────────────────────────────
banner("PHASE 0 — AUTHENTICATION");
let cookies = [];
try {
  const authCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const authPage = await authCtx.newPage();

  const loginStart = t();
  await authPage.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const loginPageLoad = dur(loginStart, t());
  console.log(`Login page load: ${ms(loginPageLoad)}`);

  await authPage.fill("input#email", EMAIL);
  await authPage.fill("input#password", PASSWORD);
  const submitStart = t();
  await Promise.all([
    authPage.waitForURL(/\/app/, { timeout: 30000 }),
    authPage.click('button[type="submit"]'),
  ]);
  const loginDuration = dur(submitStart, t());
  console.log(`Login submission → dashboard redirect: ${ms(loginDuration)}`);

  cookies = await authCtx.cookies();
  await authCtx.close();
  console.log(`✓ Auth succeeded. ${cookies.length} cookies obtained.`);
  measurements.phases.auth = { loginPageLoad, loginDuration, cookieCount: cookies.length };
} catch (err) {
  console.error("✗ Login FAILED:", err.message);
  await browser.close();
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────
// PHASE 1: Landing page (unauthenticated, clean context)
// ──────────────────────────────────────────────────────────────
banner("PHASE 1 — LANDING PAGE (clean context, no auth)");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const apiCalls = [];

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleErrors.push(`[${msg.type()}] ${msg.text().substring(0, 200)}`);
    }
  });
  page.on("response", async (res) => {
    if (res.url().includes("/api/")) {
      const timing = res.request().timing();
      apiCalls.push({ url: res.url().replace(BASE_URL, ""), status: res.status(), dur: Math.round(timing.responseEnd - timing.requestStart) });
    }
  });

  const T0 = t();
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
  const totalLanding = dur(T0, t());

  const navTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((p) => p.name === "first-contentful-paint");
    const lcp = performance.getEntriesByType("largest-contentful-paint")?.[0];
    const longTasks = performance.getEntriesByType("longtask") ?? [];
    return {
      ttfb: Math.round(nav.responseStart),
      domInteractive: Math.round(nav.domInteractive),
      domComplete: Math.round(nav.domComplete),
      fcp: fcp ? Math.round(fcp.startTime) : null,
      lcp: lcp ? Math.round(lcp.startTime) : null,
      longTaskCount: longTasks.length,
      longTaskTotal: Math.round(longTasks.reduce((s, t) => s + t.duration, 0)),
    };
  });

  console.log(`Total: ${ms(totalLanding)}`);
  console.log(`TTFB: ${ms(navTiming.ttfb)}`);
  console.log(`FCP: ${navTiming.fcp ? ms(navTiming.fcp) : "N/A"}`);
  console.log(`LCP: ${navTiming.lcp ? ms(navTiming.lcp) : "N/A"}`);
  console.log(`DOM Interactive: ${ms(navTiming.domInteractive)}`);
  console.log(`Long Tasks: ${navTiming.longTaskCount} (total blocking: ${ms(navTiming.longTaskTotal)})`);
  if (consoleErrors.length) {
    console.log(`Console errors/warnings: ${consoleErrors.length}`);
    consoleErrors.slice(0, 5).forEach((e) => console.log(`  ${e}`));
  }

  measurements.phases.landing = { totalLanding, navTiming, apiCalls, consoleErrors };
  await ctx.close();
}

// ──────────────────────────────────────────────────────────────
// PHASE 2 & 3: DASHBOARD — DETAILED T0→T27 TIMELINE
// ──────────────────────────────────────────────────────────────
banner("PHASE 2+3 — DASHBOARD DETAILED TIMELINE (COLD, authenticated)");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  const dashApiCalls = [];
  const dashConsole = [];

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      dashConsole.push(`[${msg.type()}] ${msg.text().substring(0, 200)}`);
    }
  });

  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("/api/")) {
      const timing = res.request().timing();
      let size = 0;
      try { size = (await res.body()).length; } catch {}
      dashApiCalls.push({
        method: res.request().method(),
        url: url.replace(BASE_URL, ""),
        status: res.status(),
        requestStart: timing.requestStart,
        responseStart: timing.responseStart,
        responseEnd: timing.responseEnd,
        duration: Math.round(timing.responseEnd - timing.requestStart),
        ttfb: Math.round(timing.responseStart - timing.requestStart),
        size,
        headers: {
          cacheControl: res.headers()["cache-control"] || "none",
          xResponseTime: res.headers()["x-response-time"] || null,
        }
      });
    }
  });

  const T0 = t();
  // T1: navigation starts → HTML begins
  const _navResponse = await page.goto(`${BASE_URL}/app`, { waitUntil: "commit", timeout: 30000 });
  const T2 = t(); // HTML/document response started

  // T3: domcontentloaded (HTML fully received)
  await page.waitForLoadState("domcontentloaded");
  const T3 = t();

  // T6: React hydration — wait for interactive element
  let T6 = T3;
  try {
    await page.waitForSelector("main, [data-testid], h1", { timeout: 15000 });
    T6 = t();
  } catch {}

  // Wait for all network activity to settle
  await page.waitForLoadState("networkidle", { timeout: 45000 });
  const T27 = t();

  const navTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((p) => p.name === "first-contentful-paint");
    const lcp = performance.getEntriesByType("largest-contentful-paint")?.[0];
    const longTasks = performance.getEntriesByType("longtask") ?? [];
    // Resources
    const resources = performance.getEntriesByType("resource");
    const jsResources = resources.filter((r) => r.initiatorType === "script");
    const jsTotal = jsResources.reduce((s, r) => s + r.duration, 0);
    return {
      ttfb: Math.round(nav.responseStart),
      domInteractive: Math.round(nav.domInteractive),
      domComplete: Math.round(nav.domComplete),
      loadEventEnd: Math.round(nav.loadEventEnd),
      fcp: fcp ? Math.round(fcp.startTime) : null,
      lcp: lcp ? Math.round(lcp.startTime) : null,
      longTaskCount: longTasks.length,
      longTaskTotal: Math.round(longTasks.reduce((s, t) => s + t.duration, 0)),
      jsResourceCount: jsResources.length,
      jsTotalDuration: Math.round(jsTotal),
    };
  });

  dashApiCalls.sort((a, b) => a.requestStart - b.requestStart);

  console.log("\n  T0  = 0ms                    — User navigates to /app");
  console.log(`  T1  = ${ms(navTiming.ttfb).padEnd(10)}               — TTFB (first byte from server)`);
  console.log(`  T2  = ${ms(dur(T0, T2)).padEnd(10)}               — HTML document response received`);
  console.log(`  T3  = ${ms(dur(T0, T3)).padEnd(10)}               — DOMContentLoaded`);
  console.log(`  T4  = ${ms(navTiming.domInteractive).padEnd(10)}               — DOM Interactive (JS executing)`);
  console.log(`  T5  = ${navTiming.fcp ? ms(navTiming.fcp) : "N/A".padEnd(10)}               — First Contentful Paint`);
  console.log(`  T6  = ${ms(dur(T0, T6)).padEnd(10)}               — React shell visible`);
  console.log(`  T27 = ${ms(dur(T0, T27)).padEnd(10)}               — All requests complete (networkidle)`);
  console.log(`  LCP = ${navTiming.lcp ? ms(navTiming.lcp) : "N/A"}`);
  console.log(`  Long Tasks: ${navTiming.longTaskCount} tasks (${ms(navTiming.longTaskTotal)} total blocking)`);
  console.log(`  JS resources: ${navTiming.jsResourceCount} scripts (${ms(navTiming.jsTotalDuration)} total)`);

  section("DASHBOARD API WATERFALL");
  console.log("  Method  Status  Duration   TTFB       Size     Cache-Control             Endpoint");
  console.log("  " + "─".repeat(110));
  for (const call of dashApiCalls) {
    const m = (call.method || "GET").padEnd(6);
    const s = String(call.status).padEnd(6);
    const d = ms(call.duration).padEnd(11);
    const tfb = ms(call.ttfb).padEnd(11);
    const sz = `${call.size}B`.padEnd(9);
    const cc = (call.headers.cacheControl || "none").substring(0, 25).padEnd(26);
    console.log(`  ${m}  ${s}  ${d}  ${tfb}  ${sz}  ${cc}  ${call.url}`);
  }

  const slowestApi = dashApiCalls.reduce((mx, c) => c.duration > mx.duration ? c : mx, { duration: 0, url: "none" });
  console.log(`\n  ⚠ SLOWEST API CALL: ${slowestApi.url} → ${ms(slowestApi.duration)}`);

  if (dashConsole.length > 0) {
    section("BROWSER CONSOLE ISSUES");
    dashConsole.slice(0, 10).forEach((m) => console.log(`  ${m}`));
  }

  measurements.phases.dashboardCold = {
    timeline: {
      T0: 0,
      T1_ttfb: navTiming.ttfb,
      T2_htmlReceived: dur(T0, T2),
      T3_domContentLoaded: dur(T0, T3),
      T4_domInteractive: navTiming.domInteractive,
      T5_fcp: navTiming.fcp,
      T6_reactShell: dur(T0, T6),
      T27_networkIdle: dur(T0, T27),
      lcp: navTiming.lcp,
      longTaskCount: navTiming.longTaskCount,
      longTaskTotal: navTiming.longTaskTotal,
    },
    apiWaterfall: dashApiCalls,
    consoleIssues: dashConsole,
    slowestApi: { url: slowestApi.url, duration: slowestApi.duration },
  };

  await ctx.close();
}

// ──────────────────────────────────────────────────────────────
// PHASE 6: REPEATED WORK — First load, Refresh, Navigate, Return
// ──────────────────────────────────────────────────────────────
banner("PHASE 6 — REPEATED WORK CHECK");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  const _repeatedWork = {};

  async function captureApis(_label) {
    const apis = [];
    const handler = async (res) => {
      if (res.url().includes("/api/")) {
        const timing = res.request().timing();
        let size = 0;
        try { size = (await res.body()).length; } catch {}
        apis.push({
          method: res.request().method(),
          url: res.url().replace(BASE_URL, ""),
          status: res.status(),
          duration: Math.round(timing.responseEnd - timing.requestStart),
          size,
        });
      }
    };
    page.on("response", handler);
    return { apis, cleanup: () => page.off("response", handler) };
  }

  // 1. First load
  const { apis: apis1, cleanup: c1 } = await captureApis("first");
  const t1Start = t();
  await page.goto(`${BASE_URL}/app`, { waitUntil: "networkidle", timeout: 45000 });
  const t1End = dur(t1Start, t());
  c1();
  console.log(`\n  FIRST LOAD: ${ms(t1End)} | ${apis1.length} API calls`);
  apis1.forEach((a) => console.log(`    [${a.method}] ${a.status} ${ms(a.duration).padStart(8)}  ${a.url}`));

  // 2. Immediate reload (same tab)
  const { apis: apis2, cleanup: c2 } = await captureApis("reload1");
  const t2Start = t();
  await page.reload({ waitUntil: "networkidle", timeout: 45000 });
  const t2End = dur(t2Start, t());
  c2();
  console.log(`\n  RELOAD #1:  ${ms(t2End)} | ${apis2.length} API calls`);
  apis2.forEach((a) => console.log(`    [${a.method}] ${a.status} ${ms(a.duration).padStart(8)}  ${a.url}`));

  // 3. Navigate away
  const { apis: apis3, cleanup: c3 } = await captureApis("sources");
  const t3Start = t();
  await page.goto(`${BASE_URL}/app/sources`, { waitUntil: "networkidle", timeout: 30000 });
  const t3End = dur(t3Start, t());
  c3();
  console.log(`\n  NAV → /sources: ${ms(t3End)} | ${apis3.length} API calls`);
  apis3.forEach((a) => console.log(`    [${a.method}] ${a.status} ${ms(a.duration).padStart(8)}  ${a.url}`));

  // 4. Return to dashboard
  const { apis: apis4, cleanup: c4 } = await captureApis("return");
  const t4Start = t();
  await page.goto(`${BASE_URL}/app`, { waitUntil: "networkidle", timeout: 45000 });
  const t4End = dur(t4Start, t());
  c4();
  console.log(`\n  RETURN → /app: ${ms(t4End)} | ${apis4.length} API calls`);
  apis4.forEach((a) => console.log(`    [${a.method}] ${a.status} ${ms(a.duration).padStart(8)}  ${a.url}`));

  // 5. Second reload
  const { apis: apis5, cleanup: c5 } = await captureApis("reload2");
  const t5Start = t();
  await page.reload({ waitUntil: "networkidle", timeout: 45000 });
  const t5End = dur(t5Start, t());
  c5();
  console.log(`\n  RELOAD #2:  ${ms(t5End)} | ${apis5.length} API calls`);
  apis5.forEach((a) => console.log(`    [${a.method}] ${a.status} ${ms(a.duration).padStart(8)}  ${a.url}`));

  // Detect duplicate calls
  section("DUPLICATE WORK ANALYSIS");
  const allUrls = [
    ...apis1.map((a) => ({ pass: "first", url: a.url, dur: a.duration })),
    ...apis2.map((a) => ({ pass: "reload1", url: a.url, dur: a.duration })),
    ...apis4.map((a) => ({ pass: "return", url: a.url, dur: a.duration })),
    ...apis5.map((a) => ({ pass: "reload2", url: a.url, dur: a.duration })),
  ];
  const urlMap = {};
  for (const item of allUrls) {
    if (!urlMap[item.url]) urlMap[item.url] = [];
    urlMap[item.url].push({ pass: item.pass, dur: item.dur });
  }
  for (const [url, calls] of Object.entries(urlMap)) {
    const passes = [...new Set(calls.map((c) => c.pass))];
    const isDuplicated = passes.length > 1;
    const avgDur = Math.round(calls.reduce((s, c) => s + c.dur, 0) / calls.length);
    console.log(`  ${isDuplicated ? "⚠ DUP" : "  OK "}  ${url.substring(0, 60).padEnd(60)}  seen in: [${passes.join(", ")}]  avg: ${ms(avgDur)}`);
  }

  measurements.phases.repeatedWork = {
    firstLoad: { duration: t1End, apiCount: apis1.length, apis: apis1 },
    reload1: { duration: t2End, apiCount: apis2.length, apis: apis2 },
    navToSources: { duration: t3End, apiCount: apis3.length, apis: apis3 },
    returnToDash: { duration: t4End, apiCount: apis4.length, apis: apis4 },
    reload2: { duration: t5End, apiCount: apis5.length, apis: apis5 },
  };

  await ctx.close();
}

// ──────────────────────────────────────────────────────────────
// PHASE 8/9/11/16: DIRECT API — COLD vs WARM
// ──────────────────────────────────────────────────────────────
banner("PHASE 8+9+11+16 — DIRECT API: COLD vs WARM MEASUREMENTS");
{
  const ctx = await browser.newContext();
  await ctx.addCookies(cookies);

  async function probe(label, url, method = "GET", body = null, repeat = 4) {
    const results = [];
    for (let i = 0; i < repeat; i++) {
      const start = t();
      let res;
      if (method === "POST") {
        res = await ctx.request.post(url, { data: body || {}, timeout: 60000 });
      } else {
        res = await ctx.request.get(url, { timeout: 60000 });
      }
      const elapsed = dur(start, t());
      let respBody = null;
      try { respBody = await res.json(); } catch {}
      results.push({ call: i + 1, status: res.status(), duration: elapsed, bodySize: JSON.stringify(respBody || {}).length });
      // Small pause to avoid connection pool exhaustion
      await new Promise((r) => setTimeout(r, 50));
    }
    const [c1, _c2, _c3, _c4] = results;
    const shortest = Math.min(...results.map((r) => r.duration));
    const ratio = c1.duration > 0 && shortest > 0 ? (c1.duration / shortest).toFixed(2) : "N/A";
    console.log(`  ${label}`);
    results.forEach((r) => console.log(`    Call ${r.call}: ${ms(r.duration)} | status ${r.status} | ${r.bodySize}B`));
    console.log(`    Cold/Warm ratio: ${ratio}x`);
    return { label, results, ratio };
  }

  // List datasets first
  const dsResult = await probe("GET /api/datasets", `${BASE_URL}/api/datasets`);
  let dsId = null;
  let dsName = null;
  try {
    const resp = await ctx.request.get(`${BASE_URL}/api/datasets`, { timeout: 30000 });
    const json = await resp.json();
    if (Array.isArray(json) && json.length > 0) {
      dsId = json[0].id;
      dsName = json[0].name;
      console.log(`\n  Found dataset: "${dsName}" (${dsId})`);
    }
  } catch {}

  const apiProbes = [dsResult];

  if (dsId) {
    apiProbes.push(await probe(`GET /api/datasets/${dsId}`, `${BASE_URL}/api/datasets/${dsId}`));
    apiProbes.push(await probe(`POST /api/datasets/${dsId}/kpis [PRIMARY DUCKDB TEST]`, `${BASE_URL}/api/datasets/${dsId}/kpis`, "POST", {}));
    apiProbes.push(await probe(`POST /api/datasets/${dsId}/charts`, `${BASE_URL}/api/datasets/${dsId}/charts`, "POST", { chartType: "bar", xAxis: null, yAxis: null, aggregation: "count" }));
    apiProbes.push(await probe(`GET /api/datasets/${dsId}/insights`, `${BASE_URL}/api/datasets/${dsId}/insights`));
  }

  apiProbes.push(await probe("GET /api/sources", `${BASE_URL}/api/sources`));

  measurements.phases.apiProbes = { dsId, dsName, probes: apiProbes };
  await ctx.close();
}

// ──────────────────────────────────────────────────────────────
// PHASE 12: ALL OTHER PAGES
// ──────────────────────────────────────────────────────────────
banner("PHASE 12 — ALL PAGES TIMING MATRIX");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  const allPageResults = [];

  const pages = [
    { name: "Dashboard (/app)", url: `${BASE_URL}/app` },
    { name: "Data Sources", url: `${BASE_URL}/app/sources` },
    { name: "Data Prep", url: `${BASE_URL}/app/prep` },
    { name: "Insights", url: `${BASE_URL}/app/insights` },
    { name: "Reports", url: `${BASE_URL}/app/reports` },
    { name: "Settings", url: `${BASE_URL}/app/settings` },
    { name: "Dashboard (return)", url: `${BASE_URL}/app` },
  ];

  for (const pg of pages) {
    const apis = [];
    const consoleIssues = [];
    const aHandler = async (res) => {
      if (res.url().includes("/api/")) {
        const timing = res.request().timing();
        apis.push({ url: res.url().replace(BASE_URL, ""), status: res.status(), dur: Math.round(timing.responseEnd - timing.requestStart) });
      }
    };
    const cHandler = (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") consoleIssues.push(`[${msg.type()}] ${msg.text().substring(0, 120)}`);
    };
    page.on("response", aHandler);
    page.on("console", cHandler);

    const start = t();
    try {
      await page.goto(pg.url, { waitUntil: "networkidle", timeout: 45000 });
    } catch (err) {
      console.log(`  ✗ ${pg.name}: TIMEOUT/ERROR — ${err.message.substring(0, 80)}`);
    }
    const total = dur(start, t());

    page.off("response", aHandler);
    page.off("console", cHandler);

    const navTiming = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const paint = performance.getEntriesByType("paint");
      const fcp = paint.find((p) => p.name === "first-contentful-paint");
      return { ttfb: Math.round(nav?.responseStart ?? 0), fcp: fcp ? Math.round(fcp.startTime) : null };
    }).catch(() => ({ ttfb: 0, fcp: null }));

    const slowest = apis.reduce((mx, a) => a.dur > mx.dur ? a : mx, { dur: 0, url: "-" });
    console.log(
      `  ${pg.name.padEnd(22)}  Total: ${ms(total).padEnd(10)}  TTFB: ${ms(navTiming.ttfb).padEnd(9)}  APIs: ${String(apis.length).padEnd(3)}  Slowest: ${slowest.url.split("/").slice(-3).join("/") || "-"} (${ms(slowest.dur)})`
    );

    allPageResults.push({ name: pg.name, url: pg.url, total, navTiming, apis, consoleIssues, slowestApi: slowest });
  }

  measurements.phases.allPages = allPageResults;
  await ctx.close();
}

// ──────────────────────────────────────────────────────────────
// PHASE 13: THREE.JS ISOLATION TEST
// ──────────────────────────────────────────────────────────────
banner("PHASE 13 — THREE.JS ISOLATION (landing page comparison)");
{
  // We cannot disable Three.js without code changes, but we CAN measure:
  // A) full landing with JS
  // B) same page with JS disabled (measures pure HTML/CSS without any JS)
  // This tells us how much JS is adding to total time

  // Test A: Normal
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageA = await ctxA.newPage();
  const tA0 = t();
  await pageA.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
  const tA_total = dur(tA0, t());
  const tA_timing = await pageA.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find((p) => p.name === "first-contentful-paint");
    const lcp = performance.getEntriesByType("largest-contentful-paint")?.[0];
    const longTasks = performance.getEntriesByType("longtask") ?? [];
    const resources = performance.getEntriesByType("resource");
    const scripts = resources.filter((r) => r.initiatorType === "script");
    return {
      ttfb: Math.round(nav.responseStart),
      fcp: fcp ? Math.round(fcp.startTime) : null,
      lcp: lcp ? Math.round(lcp.startTime) : null,
      longTaskCount: longTasks.length,
      longTaskTotal: Math.round(longTasks.reduce((s, lt) => s + lt.duration, 0)),
      scriptCount: scripts.length,
      scriptDuration: Math.round(scripts.reduce((s, r) => s + r.duration, 0)),
    };
  });
  await pageA.close();
  await ctxA.close();

  // Test B: JS disabled (measures network + HTML only, no Three.js)
  const ctxB = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    javaScriptEnabled: false,
  });
  const pageB = await ctxB.newPage();
  const tB0 = t();
  await pageB.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
  const tB_total = dur(tB0, t());
  const tB_ttfb = await pageB.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    return Math.round(nav?.responseStart ?? 0);
  }).catch(() => 0);
  await pageB.close();
  await ctxB.close();

  console.log(`  Test A (JS+Three.js enabled): Total = ${ms(tA_total)}, FCP = ${tA_timing.fcp ? ms(tA_timing.fcp) : "N/A"}, LCP = ${tA_timing.lcp ? ms(tA_timing.lcp) : "N/A"}`);
  console.log(`  Test B (JS disabled):         Total = ${ms(tB_total)}, TTFB = ${ms(tB_ttfb)}`);
  console.log(`  JS overhead: ${ms(tA_total - tB_total)} (${Math.round((tA_total - tB_total) / tA_total * 100)}% of total time)`);
  console.log(`  Long Tasks (with JS): ${tA_timing.longTaskCount} tasks, ${ms(tA_timing.longTaskTotal)} total blocking time`);
  console.log(`  Scripts: ${tA_timing.scriptCount} scripts, ${ms(tA_timing.scriptDuration)} combined load duration`);
  console.log(tA_timing.longTaskTotal > 500 ? "  ⚠ SIGNIFICANT JS blocking detected!" : "  ✓ JS blocking within acceptable range");

  measurements.phases.threejsIsolation = {
    withJs: { total: tA_total, ...tA_timing },
    withoutJs: { total: tB_total, ttfb: tB_ttfb },
    jsOverhead: tA_total - tB_total,
    jsOverheadPercent: Math.round((tA_total - tB_total) / tA_total * 100),
  };
}

// ──────────────────────────────────────────────────────────────
// DONE — Write output
// ──────────────────────────────────────────────────────────────
await browser.close();

writeFileSync(OUTPUT_FILE, JSON.stringify(measurements, null, 2));

banner("FORENSIC DATA COLLECTION COMPLETE");
console.log(`Raw measurements written to: ${OUTPUT_FILE}`);
console.log("Proceed to PERFORMANCE_ROOT_CAUSE.md analysis.");
console.log("\nSUMMARY:");

const dash = measurements.phases.dashboardCold;
if (dash) {
  console.log(`\nDASHBOARD COLD LOAD:`);
  console.log(`  TTFB:              ${ms(dash.timeline.T1_ttfb)}`);
  console.log(`  React shell:       ${ms(dash.timeline.T6_reactShell)}`);
  console.log(`  All APIs done:     ${ms(dash.timeline.T27_networkIdle)}`);
  console.log(`  FCP:               ${dash.timeline.T5_fcp ? ms(dash.timeline.T5_fcp) : "N/A"}`);
  console.log(`  LCP:               ${dash.timeline.lcp ? ms(dash.timeline.lcp) : "N/A"}`);
  if (dash.slowestApi) {
    console.log(`  SLOWEST API:       ${dash.slowestApi.url} (${ms(dash.slowestApi.duration)})`);
  }
}

const rw = measurements.phases.repeatedWork;
if (rw) {
  console.log(`\nREPEATED WORK:`);
  console.log(`  First load:     ${ms(rw.firstLoad.duration)}`);
  console.log(`  Reload #1:      ${ms(rw.reload1.duration)}`);
  console.log(`  Return to /app: ${ms(rw.returnToDash.duration)}`);
  console.log(`  Reload #2:      ${ms(rw.reload2.duration)}`);
}
