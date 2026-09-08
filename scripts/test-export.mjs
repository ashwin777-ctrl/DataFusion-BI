import { chromium } from '@playwright/test';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://data-fusion-bi.vercel.app/login');
  await page.fill('input[type="email"]', 'ashwin@datafusion.io');
  await page.fill('input[type="password"]', 'Admin@123456');
  await Promise.all([
    page.waitForURL('**/app**'),
    page.click('button[type="submit"]')
  ]);
  console.log('Logged in! URL:', page.url());

  const res = await page.evaluate(async () => {
    const dsRes = await fetch('/api/datasets');
    const dsData = await dsRes.json();
    const id = dsData.datasets[0].id;
    const expRes = await fetch(`/api/datasets/${id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'pdf' })
    });
    return {
      status: expRes.status,
      contentType: expRes.headers.get('content-type'),
      text: (await expRes.text()).slice(0, 100)
    };
  });
  console.log('Export evaluation result:', res);
  await browser.close();
}

test().catch(console.error);
