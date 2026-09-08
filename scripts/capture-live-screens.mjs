import { chromium } from "playwright";
import { readFileSync } from "node:fs";

async function main() {
  const token = readFileSync("scripts/.active-session.txt", "utf8").trim();

  console.log("Launching browser using local Chrome/Edge channel...");
  const browser = await chromium.launch({
    channel: "msedge", // uses installed Microsoft Edge on Windows
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Set auth cookie
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

  // 1. Dashboard
  console.log("Navigating to http://localhost:3001/app ...");
  await page.goto("http://localhost:3001/app", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "boston_dashboard_live.png", fullPage: true });
  console.log("✓ Saved boston_dashboard_live.png");

  // 2. Sources Hub
  console.log("Navigating to http://localhost:3001/app/sources ...");
  await page.goto("http://localhost:3001/app/sources", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "boston_sources_live.png", fullPage: true });
  console.log("✓ Saved boston_sources_live.png");

  // 3. Prep & Modeling
  console.log("Navigating to http://localhost:3001/app/prep ...");
  await page.goto("http://localhost:3001/app/prep", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "boston_prep_live.png", fullPage: true });
  console.log("✓ Saved boston_prep_live.png");

  // 4. Insights Hub
  console.log("Navigating to http://localhost:3001/app/insights ...");
  await page.goto("http://localhost:3001/app/insights", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "boston_insights_live.png", fullPage: true });
  console.log("✓ Saved boston_insights_live.png");

  await browser.close();
  console.log("All live screenshots captured successfully!");
}

main().catch(console.error);
