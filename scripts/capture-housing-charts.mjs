import { chromium } from "playwright";
import { readFileSync } from "node:fs";

async function main() {
  const token = readFileSync("scripts/.active-session.txt", "utf8").trim();

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
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
  await page.selectOption("select", "87e7308f-460f-4877-8a85-cbfeeabc2236");
  await page.waitForTimeout(3000);

  // Scroll directly into the Visual Analytics & Chart Builder
  await page.evaluate(() => {
    const el = document.querySelector("h2, .recharts-responsive-container");
    window.scrollTo(0, 1100);
  });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "boston_housing_chart_detail.png", fullPage: false });
  console.log("✓ Captured boston_housing_chart_detail.png");

  // Also capture Data Table view at the bottom of the dashboard
  await page.evaluate(() => window.scrollTo(0, 1800));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "boston_housing_table_view.png", fullPage: false });
  console.log("✓ Captured boston_housing_table_view.png");

  await browser.close();
}

main().catch(console.error);
