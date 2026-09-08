import { chromium } from '@playwright/test';

const PROD_URL = 'https://data-fusion-bi.vercel.app';
const USERNAME = 'ashwin@datafusion.io';
const PASSWORD = 'Admin@123456';

async function runDeepMeasurement() {
  console.log(`\n======================================================`);
  console.log(`[DEEP PROD AUDIT] Testing live production website: ${PROD_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const results = [];
  const allApiRequests = [];
  const consoleMessages = [];

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/api/')) {
      const timing = res.request().timing();
      const status = res.status();
      const method = res.request().method();
      let size = 0;
      try {
        const body = await res.body();
        size = body.length;
      } catch (e) {}

      allApiRequests.push({
        url: url.replace(PROD_URL, ''),
        method,
        status,
        duration: timing.responseEnd > 0 ? (timing.responseEnd - timing.requestStart) : -1,
        size,
        cacheControl: res.headers()['cache-control'] || 'none'
      });
    }
  });

  // Helper to measure a step
  async function measureStep(stepName, actionFn) {
    const startReqCount = allApiRequests.length;
    const t0 = Date.now();
    await actionFn();
    const tTotal = Date.now() - t0;
    const stepReqs = allApiRequests.slice(startReqCount);

    let slowestApi = 'None';
    let slowestTime = 0;
    for (const r of stepReqs) {
      if (r.duration > slowestTime) {
        slowestTime = r.duration;
        slowestApi = `${r.method} ${r.url}`;
      }
    }

    results.push({
      page: stepName,
      total: tTotal,
      apiCount: stepReqs.length,
      slowestApi,
      slowestTime: Math.round(slowestTime),
      reqs: stepReqs
    });

    console.log(`[STEP] ${stepName}: ${tTotal}ms | APIs: ${stepReqs.length} | Slowest: ${slowestApi} (${Math.round(slowestTime)}ms)`);
  }

  // 1. Landing page
  await measureStep('Landing Page', async () => {
    await page.goto(PROD_URL, { waitUntil: 'networkidle' });
  });

  // 2. Login
  await measureStep('Login Workflow', async () => {
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', USERNAME);
    await page.fill('input[type="password"]', PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
  });

  // 3. Dashboard Detailed Breakdown
  console.log('\n--- DETAILED DASHBOARD TIMELINE BREAKDOWN ---');
  const dStart = Date.now();
  const dNavPromise = page.goto(`${PROD_URL}/app`, { waitUntil: 'commit' });
  await dNavPromise;
  const t1_html = Date.now() - dStart;
  console.log(`T0 -> T1 (HTML received): ${t1_html}ms`);

  // Wait for react hydration / visual readiness
  await page.waitForSelector('main', { timeout: 15000 });
  const t2_react = Date.now() - dStart;
  console.log(`T0 -> T2 (React Root mounted): ${t2_react}ms`);

  // Wait for network idle on dashboard
  await page.waitForLoadState('networkidle');
  const t9_done = Date.now() - dStart;
  console.log(`T0 -> T9 (All dashboard requests complete): ${t9_done}ms`);

  results.push({
    page: 'Dashboard (/app)',
    total: t9_done,
    apiCount: allApiRequests.filter(r => r.url.startsWith('/api/')).length,
    slowestApi: 'See Breakdown',
    slowestTime: 0,
    reqs: []
  });

  // 4. Data Sources
  await measureStep('Data Sources (/app/sources)', async () => {
    await page.goto(`${PROD_URL}/app/sources`, { waitUntil: 'networkidle' });
  });

  // 5. Data Prep & Model
  await measureStep('Data Prep (/app/prep)', async () => {
    await page.goto(`${PROD_URL}/app/prep`, { waitUntil: 'networkidle' });
  });

  // 6. Insights
  await measureStep('Insights (/app/insights)', async () => {
    await page.goto(`${PROD_URL}/app/insights`, { waitUntil: 'networkidle' });
  });

  // 7. Reports
  await measureStep('Reports (/app/reports)', async () => {
    await page.goto(`${PROD_URL}/app/reports`, { waitUntil: 'networkidle' });
  });

  // 8. Settings
  await measureStep('Settings (/app/settings)', async () => {
    await page.goto(`${PROD_URL}/app/settings`, { waitUntil: 'networkidle' });
  });

  // 9. Return to Dashboard
  await measureStep('Dashboard Return (/app)', async () => {
    await page.goto(`${PROD_URL}/app`, { waitUntil: 'networkidle' });
  });

  // 10. Dashboard Refresh
  await measureStep('Dashboard Hard Reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
  });

  console.log('\n======================================================');
  console.log('SUMMARY TABLE:');
  console.log('PAGE | TOTAL | API COUNT | SLOWEST API | SLOWEST TIME');
  console.log('------------------------------------------------------');
  for (const r of results) {
    console.log(`${r.page.padEnd(25)} | ${(r.total + 'ms').padEnd(8)} | ${(r.apiCount + '').padEnd(9)} | ${r.slowestApi.padEnd(30)} | ${r.slowestTime}ms`);
  }
  console.log('======================================================\n');

  console.log('\n--- ALL CAPTURED API REQUESTS ---');
  for (const a of allApiRequests) {
    console.log(`${a.method.padEnd(5)} ${a.url.padEnd(45)} -> ${a.status} (${a.duration}ms, ${a.size} bytes, cache: ${a.cacheControl})`);
  }

  console.log('\n--- CONSOLE ERRORS & WARNINGS ---');
  const errs = consoleMessages.filter(c => c.type === 'error' || c.type === 'warning');
  console.log(`Found ${errs.length} issues in console.`);
  for (const e of errs) {
    console.log(`[${e.type}] ${e.text}`);
  }

  await browser.close();
}

runDeepMeasurement().catch(err => {
  console.error('Measurement failed:', err);
  process.exit(1);
});
