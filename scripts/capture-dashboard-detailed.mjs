import { chromium } from "playwright";
import { readFileSync } from "node:fs";

async function main() {
  const token = readFileSync("scripts/.active-session.txt", "utf8").trim();

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });

  await context.addCookies([
    {
      name: "bi_session",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  console.log("Navigating to http://localhost:3001/app ...");
  await page.goto("http://localhost:3001/app");
  await page.waitForSelector("select", { timeout: 15000 });
  
  // Explicitly select Boston Housing Dataset
  await page.selectOption("select", "87e7308f-460f-4877-8a85-cbfeeabc2236");
  await page.waitForTimeout(3500);

  // 1. Dashboard Top View
  await page.screenshot({ path: "boston_dashboard_populated.png", fullPage: false });
  console.log("✓ Captured boston_dashboard_populated.png");

  // 2. Scroll down to Visual Chart Builder and interact
  await page.evaluate(() => window.scrollBy(0, 520));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "boston_charts_view.png", fullPage: false });
  console.log("✓ Captured boston_charts_view.png");

  // 3. Switch to 3D Universe / Fabric tab if available
  const tab3d = await page.$("button:has-text('3D Universe')");
  if (tab3d) {
    await tab3d.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "boston_3d_topology.png", fullPage: false });
    console.log("✓ Captured boston_3d_topology.png");
  }

  // 4. Switch to Dark Mode
  const darkModeBtn = await page.$("button:has-text('Dark')");
  if (darkModeBtn) {
    await darkModeBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "boston_dashboard_dark.png", fullPage: false });
    console.log("✓ Captured boston_dashboard_dark.png");
  }

  await browser.close();
  console.log("All detailed dashboard captures completed!");
}

main().catch(console.error);
