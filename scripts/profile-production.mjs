import { chromium } from '@playwright/test';

const PROD_URL = 'https://data-fusion-bi.vercel.app';
const USERNAME = 'ashwin@datafusion.io';
const PASSWORD = 'Admin@123456';

async function auditProduction() {
  console.log(`\n======================================================`);
  console.log(`[PROD AUDIT] Profiling live Vercel deployment: ${PROD_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const networkRequests = [];
  const consoleMessages = [];

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('request', req => {
    req._startTime = Date.now();
  });

  page.on('response', async res => {
    const endTime = Date.now();
    const req = res.request();
    const duration = req._startTime ? endTime - req._startTime : 0;
    networkRequests.push({
      url: req.url(),
      method: req.method(),
      status: res.status(),
      duration,
      contentType: res.headers()['content-type'] || '',
      cache: res.headers()['x-vercel-cache'] || 'MISS/NONE'
    });
  });

  // 1. Measure Landing / Login Page Load
  console.log('Step 1: Measuring Landing / Login page...');
  const t0 = Date.now();
  const resLogin = await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' });
  const ttfbLogin = Date.now() - t0;
  console.log(`  Login Page Status: ${resLogin.status()} in ${ttfbLogin}ms`);

  const loginMetrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    return {
      dns: nav ? nav.domainLookupEnd - nav.domainLookupStart : 0,
      tcp: nav ? nav.connectEnd - nav.connectStart : 0,
      ttfb: nav ? nav.responseStart - nav.requestStart : 0,
      domLoad: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
      fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
    };
  });
  console.log('  Login Browser Metrics:', loginMetrics);

  // 2. Measure Authentication / Login API
  console.log('\nStep 2: Submitting login credentials...');
  await page.fill('input#email', USERNAME);
  await page.fill('input#password', PASSWORD);

  const tAuthStart = Date.now();
  await Promise.all([
    page.waitForURL('**/app', { timeout: 20000 }),
    page.click('button[type="submit"]')
  ]);
  const authDuration = Date.now() - tAuthStart;
  console.log(`  Authentication + Navigation to /app took: ${authDuration}ms`);
  console.log(`  Current URL: ${page.url()}`);

  // 3. Measure Dashboard /app rendering & API waterfall
  console.log('\nStep 3: Analyzing /app dashboard and API calls...');
  await page.waitForTimeout(2000);

  const dashMetrics = await page.evaluate(() => {
    const paint = performance.getEntriesByType('paint');
    return {
      fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
    };
  });
  console.log('  Dashboard FCP:', dashMetrics.fcp);

  // Filter API requests on dashboard
  const apiRequests = networkRequests.filter(r => r.url.includes('/api/'));
  console.log(`\n--- Detected ${apiRequests.length} API requests so far ---`);
  for (const req of apiRequests) {
    console.log(`  [${req.method}] ${req.url.replace(PROD_URL, '')} -> ${req.status} (${req.duration}ms, cache: ${req.cache})`);
  }

  // 4. Measure Navigation to /app/insights
  console.log('\nStep 4: Navigating to /app/insights...');
  const tInsights = Date.now();
  await Promise.all([
    page.waitForURL('**/app/insights'),
    page.click('a[href="/app/insights"]')
  ]);
  const insightsDuration = Date.now() - tInsights;
  console.log(`  Navigation to /app/insights took: ${insightsDuration}ms`);
  await page.waitForTimeout(1000);

  // 5. Measure Navigation to /app/sources
  console.log('\nStep 5: Navigating to /app/sources...');
  const tSources = Date.now();
  await Promise.all([
    page.waitForURL('**/app/sources'),
    page.click('a[href="/app/sources"]')
  ]);
  const sourcesDuration = Date.now() - tSources;
  console.log(`  Navigation to /app/sources took: ${sourcesDuration}ms`);
  await page.waitForTimeout(1000);

  // 6. Measure Navigation to /app/prep
  console.log('\nStep 6: Navigating to /app/prep...');
  const tPrep = Date.now();
  await Promise.all([
    page.waitForURL('**/app/prep'),
    page.click('a[href="/app/prep"]')
  ]);
  const prepDuration = Date.now() - tPrep;
  console.log(`  Navigation to /app/prep took: ${prepDuration}ms`);

  // 7. Check Console Errors
  console.log('\n--- Console Messages During Production Session ---');
  const errors = consoleMessages.filter(m => m.type === 'error' || m.text.toLowerCase().includes('error'));
  console.log(`Found ${errors.length} errors in console:`);
  for (const err of errors) {
    console.log(`  [${err.type}] ${err.text}`);
  }

  await browser.close();
  console.log('\n======================================================');
  console.log('[PROD AUDIT] Completed initial measurement!');
  console.log('======================================================\n');
}

auditProduction().catch(console.error);
