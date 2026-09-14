import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("1. Navigating to https://data-fusion-bi.vercel.app/login ...");
  await page.goto("https://data-fusion-bi.vercel.app/login", { waitUntil: "networkidle" });

  console.log("Current URL:", page.url());
  const title = await page.title();
  console.log("Page title:", title);

  // Check if Auto Fill button exists
  const autoFillBtn = page.locator("button:has-text('Auto Fill')");
  if (await autoFillBtn.count() > 0) {
    console.log("Auto Fill button found, clicking...");
    await autoFillBtn.click();
  } else {
    console.log("Filling inputs manually...");
    await page.fill("input#email", "ashwin@datafusion.io");
    await page.fill("input#password", "Admin@123456");
  }

  const emailVal = await page.inputValue("input#email");
  console.log("Email value:", emailVal);

  console.log("Submitting login form...");
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }).catch(e => console.log("Navigation timeout:", e.message)),
    page.click("button[type='submit']"),
  ]);

  console.log("URL after login submit:", page.url());

  // Check if there is an error alert
  const alert = page.locator("[role='alert']");
  if (await alert.count() > 0) {
    console.log("Alert visible:", await alert.textContent());
  }

  const cookies = await context.cookies();
  console.log("Cookies after login:", cookies.map(c => ({ name: c.name, domain: c.domain, path: c.path })));

  await browser.close();
}

main().catch(console.error);
