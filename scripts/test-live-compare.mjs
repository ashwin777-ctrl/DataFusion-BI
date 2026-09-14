import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("[BROWSER ERROR]", msg.text());
    }
  });

  console.log("1. Logging in...");
  await page.goto("https://data-fusion-bi.vercel.app/login", { waitUntil: "networkidle" });
  await page.click("button:has-text('Auto Fill')");
  await Promise.all([
    page.waitForURL(/\/app/, { timeout: 15000 }),
    page.click("button[type='submit']"),
  ]);
  console.log("Logged in! Current URL:", page.url());

  console.log("2. Navigating to /app/compare...");
  await page.goto("https://data-fusion-bi.vercel.app/app/compare", { waitUntil: "networkidle" });
  console.log("At compare page:", page.url());

  // Click Load Sample Enterprise Dataset
  const sampleBtn = page.locator("button:has-text('Load Sample Enterprise Dataset')");
  console.log("Sample button count:", await sampleBtn.count());
  await sampleBtn.click();
  console.log("Waiting for sample to load...");
  await page.waitForTimeout(4000);

  // Check if Source 1 and Source 2 are loaded
  const s1Ready = await page.locator("text=Status: Ready").count();
  console.log("Source status ready count:", s1Ready);

  // Next: Profile
  const nextToProfile = page.locator("button:has-text('Next: Data Profiling'), button:has-text('Proceed to Profiling')");
  console.log("Next to profile button count:", await nextToProfile.count());
  if (await nextToProfile.count() > 0) {
    await nextToProfile.first().click();
    await page.waitForTimeout(2000);
  }

  // Next: Column Mapping
  const nextToMapping = page.locator("button:has-text('Next: Column Mapping'), button:has-text('Proceed to Mapping')");
  console.log("Next to mapping button count:", await nextToMapping.count());
  if (await nextToMapping.count() > 0) {
    await nextToMapping.first().click();
    await page.waitForTimeout(2000);
  }

  // Next: Rules / Configure
  const nextToConfigure = page.locator("button:has-text('Next: Matching Rules'), button:has-text('Proceed to Configure')");
  console.log("Next to configure button count:", await nextToConfigure.count());
  if (await nextToConfigure.count() > 0) {
    await nextToConfigure.first().click();
    await page.waitForTimeout(2000);
  }

  // Now we are at Step 4: Configure!
  console.log("At Step 4 Configure! Checking Run Comparison button...");
  const runBtn = page.locator("button:has-text('Run Comparison'), button:has-text('Execute Comparison')");
  console.log("Run comparison button count:", await runBtn.count());

  // Click Run Comparison
  console.log("Clicking Run Comparison...");
  await runBtn.first().click();
  await page.waitForTimeout(6000);

  // Check for any error banner
  const errorBanner = page.locator(".bg-destructive\\/10, [role='alert'], .text-destructive");
  const alertCount = await errorBanner.count();
  console.log("Error alerts found:", alertCount);
  if (alertCount > 0) {
    for (let i = 0; i < alertCount; i++) {
      const txt = await errorBanner.nth(i).textContent();
      if (txt && txt.trim()) console.log(`Alert [${i}]:`, txt.trim());
    }
  }

  await page.screenshot({ path: ".scratch/compare_live_after_run.png" });
  console.log("Finished! Screenshot saved to .scratch/compare_live_after_run.png");

  await browser.close();
}

main().catch(console.error);
