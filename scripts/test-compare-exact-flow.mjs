import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("[CONSOLE ERROR]", msg.text());
    }
  });

  console.log("1. Logging in...");
  await page.goto("https://data-fusion-bi.vercel.app/login", { waitUntil: "networkidle" });
  await page.click("button:has-text('Auto Fill')");
  await Promise.all([
    page.waitForURL(/\/app/, { timeout: 15000 }),
    page.click("button[type='submit']"),
  ]);
  console.log("Logged in! URL:", page.url());

  console.log("2. Navigating to /app/compare...");
  await page.goto("https://data-fusion-bi.vercel.app/app/compare", { waitUntil: "networkidle" });

  console.log("3. Loading Sample Enterprise Dataset...");
  const sampleBtn = page.locator("button:has-text('Load Sample Enterprise Dataset')");
  await sampleBtn.click();
  await page.waitForTimeout(4000);

  console.log("4. Step 1 -> Step 2: Continue to Data Profiling");
  const step1Btn = page.locator("button:has-text('Continue to Data Profiling')");
  await step1Btn.click();
  await page.waitForTimeout(2000);

  console.log("5. Step 2 -> Step 3: Proceed to Column Mapping");
  const step2Btn = page.locator("button:has-text('Proceed to Column Mapping')");
  await step2Btn.click();
  await page.waitForTimeout(2000);

  console.log("6. Step 3 -> Step 4: Configure Matching Rules");
  const step3Btn = page.locator("button:has-text('Configure Matching Rules')");
  await step3Btn.click();
  await page.waitForTimeout(2000);

  console.log("7. Step 4 -> Step 5: Run Comparison");
  const runBtn = page.locator("button:has-text('Run Comparison')");
  await runBtn.click();
  console.log("Clicked Run Comparison! Waiting for execution (10s)...");
  await page.waitForTimeout(10000);

  // Check for any error alert
  const alert = page.locator(".bg-destructive\\/10, [role='alert'], .text-destructive");
  const alertCount = await alert.count();
  if (alertCount > 0) {
    for (let i = 0; i < alertCount; i++) {
      const txt = await alert.nth(i).textContent();
      if (txt && txt.trim()) console.log("ALERT DETECTED:", txt.trim());
    }
  } else {
    console.log("NO ALERT DETECTED - SUCCESS!");
  }

  // Check if we reached Step 6 (Results)
  const matchRate = page.locator("text=Match Rate");
  if (await matchRate.count() > 0) {
    console.log("✓ SUCCESS: Comparison completed, Results & Match Rate rendered!");
  }

  await page.screenshot({ path: ".scratch/compare_after_migration_success.png" });
  console.log("Saved screenshot to .scratch/compare_after_migration_success.png");

  await browser.close();
}

main().catch(console.error);
