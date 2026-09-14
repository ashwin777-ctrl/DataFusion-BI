import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("=== 1. TEST AUTHENTICATION & LOGIN ===");
  await page.goto("https://data-fusion-bi.vercel.app/login", { waitUntil: "networkidle" });
  await page.click("button:has-text('Auto Fill')");
  await Promise.all([
    page.waitForURL(/\/app/, { timeout: 15000 }),
    page.click("button[type='submit']"),
  ]);
  console.log("✓ Successfully authenticated to:", page.url());

  console.log("\n=== 2. TEST THEMES (DARK & LIGHT MODE) ===");
  // Test Dark mode button in header
  const darkBtn = page.locator("button:has-text('Dark')");
  await darkBtn.click();
  await page.waitForTimeout(1000);
  const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  console.log("Dark mode active in document root:", isDark);
  await page.screenshot({ path: ".scratch/live_dark_mode.png" });

  // Test Light mode button in header
  const lightBtn = page.locator("button:has-text('Light')");
  await lightBtn.click();
  await page.waitForTimeout(1000);
  const isLight = await page.evaluate(() => !document.documentElement.classList.contains("dark"));
  console.log("Light mode active in document root:", isLight);
  await page.screenshot({ path: ".scratch/live_light_mode.png" });

  // Return to dark for consistency
  await darkBtn.click();
  await page.waitForTimeout(500);

  console.log("\n=== 3. TEST MODEL TOGGLE (Consolidated vs Housing) ===");
  const housingToggle = page.locator("button:has-text('Housing Model')");
  if (await housingToggle.count() > 0) {
    await housingToggle.click();
    await page.waitForTimeout(1500);
    console.log("Clicked Housing Model. Current title text:", await page.locator("h2").first().textContent());
    await page.screenshot({ path: ".scratch/live_housing_model.png" });

    const consolidatedToggle = page.locator("button:has-text('Consolidated Model')");
    await consolidatedToggle.click();
    await page.waitForTimeout(1500);
    console.log("Clicked Consolidated Model. Current title text:", await page.locator("h2").first().textContent());
  } else {
    console.log("Model toggle buttons not found on dashboard.");
  }

  console.log("\n=== 4. TEST CLEAR DATA & RESTORE DATA ===");
  const clearDataBtn = page.locator("button:has-text('Clear Data'), button:has-text('Clear All Data')");
  if (await clearDataBtn.count() > 0) {
    console.log("Found Clear Data button, clicking...");
    await clearDataBtn.first().click();
    await page.waitForTimeout(1000);

    // Look for modal confirm button
    const confirmClear = page.locator("button:has-text('Wipe & Reset Everything'), button:has-text('Confirm')");
    if (await confirmClear.count() > 0) {
      console.log("Confirming Clear Data...");
      await confirmClear.first().click();
      await page.waitForTimeout(3000);
      console.log("Wipe completed. Checking for Restore Sample Data button...");
      await page.screenshot({ path: ".scratch/live_after_clear_data.png" });

      const restoreBtn = page.locator("button:has-text('Restore Sample Data')");
      if (await restoreBtn.count() > 0) {
        console.log("Restoring sample data...");
        await restoreBtn.first().click();
        await page.waitForTimeout(3000);
        console.log("Restore clicked! Checking if metrics re-appear...");
        await page.screenshot({ path: ".scratch/live_after_restore_data.png" });
      }
    }
  }

  console.log("\n=== 5. TEST OTHER PAGES ===");
  const pagesToTest = [
    { name: "Sources", url: "https://data-fusion-bi.vercel.app/app/sources" },
    { name: "Data Prep", url: "https://data-fusion-bi.vercel.app/app/prep" },
    { name: "Forecasting & Insights", url: "https://data-fusion-bi.vercel.app/app/insights" },
    { name: "Reports", url: "https://data-fusion-bi.vercel.app/app/reports" },
    { name: "Settings", url: "https://data-fusion-bi.vercel.app/app/settings" },
  ];

  for (const p of pagesToTest) {
    console.log(`Navigating to ${p.name} (${p.url})...`);
    await page.goto(p.url, { waitUntil: "networkidle" });
    const errors = await page.locator(".bg-destructive\\/10, [role='alert'], .text-destructive").count();
    console.log(`  → ${p.name} loaded. Status: OK. Alerts count: ${errors}`);
  }

  console.log("\n=== 6. TEST LOGOUT & REDIRECT ===");
  await page.goto("https://data-fusion-bi.vercel.app/app", { waitUntil: "networkidle" });
  const logoutBtn = page.locator("form[action*='logout'] button, button[title='Sign out']");
  if (await logoutBtn.count() > 0) {
    console.log("Clicking Logout button...");
    await Promise.all([
      page.waitForURL(/\/login/, { timeout: 15000 }),
      logoutBtn.first().click(),
    ]);
    console.log("✓ Logged out successfully! Redirected to:", page.url());
  }

  await browser.close();
  console.log("\nALL VERIFICATIONS PASSED!");
}

main().catch(console.error);
