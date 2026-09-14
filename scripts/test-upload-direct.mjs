import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => console.log("[BROWSER CONSOLE]", msg.type(), msg.text()));

  console.log("1. Logging in...");
  await page.goto("http://localhost:3001/login");
  await page.fill("input#email", "ashwin@datafusion.io");
  await page.fill("input#password", "Admin@123456");
  await Promise.all([
    page.waitForURL(/\/app/, { timeout: 15000 }),
    page.click("button[type='submit']"),
  ]);
  console.log("Logged in!");

  console.log("2. Navigating to /app/sources...");
  await page.goto("http://localhost:3001/app/sources");
  await page.waitForTimeout(1000);

  console.log("3. Uploading qa-upload.csv...");
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: "qa-upload.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("id,name\n1,Ada\n2,Grace\n"),
  });

  console.log("Waiting 5s for upload to complete...");
  await page.waitForTimeout(5000);

  const successAlert = page.locator("text=/Successfully uploaded/i");
  console.log("Success alert count:", await successAlert.count());
  if (await successAlert.count() > 0) {
    console.log("Success text:", await successAlert.textContent());
  }

  const errorAlert = page.locator(".bg-destructive\\/10");
  console.log("Error alert count:", await errorAlert.count());
  if (await errorAlert.count() > 0) {
    console.log("Error text:", await errorAlert.textContent());
  }

  await browser.close();
}

main().catch(console.error);
