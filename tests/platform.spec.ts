import { expect, test, type Page } from "@playwright/test";
import ExcelJS from "exceljs";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ashwin@datafusion.io");
  await page.getByLabel("Password").fill("Admin@123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });
}

test("public landing page is the default entry point and requires login for portal", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/BI Platform|DataFusion/);
  await expect(page.getByRole("heading", { name: /Ship faster|Intelligent Analytics/i, level: 1 })).toBeVisible();
  const portalLink = page.locator('a[href="/login"]').first();
  await expect(portalLink).toBeVisible();
  await portalLink.click();
  await expect(page).toHaveURL(/\/login$/);
});

test("protected dashboard and APIs reject unauthenticated requests", async ({ page }) => {
  // Direct app route access bounces to login
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  // Direct API calls reject unauthenticated requests with 401
  const apiResp = await page.request.get("/api/datasets");
  expect(apiResp.status()).toBe(401);

  const compareJobsResp = await page.request.get("/api/compare/jobs");
  expect(compareJobsResp.status()).toBe(401);
});

test("invalid login rejected and valid login succeeds", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ashwin@datafusion.io");
  await page.getByLabel("Password").fill("WrongPassword999!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/Incorrect email or password|Invalid email or password|Invalid credentials/i)).toBeVisible({ timeout: 10_000 });

  // Now valid credentials
  await page.getByLabel("Password").fill("Admin@123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });
});

test("login loads dashboard and all primary routes", async ({ page }) => {
  await signIn(page);
  for (const route of ["/app/sources", "/app/prep", "/app/compare", "/app/insights", "/app/reports", "/app/settings"]) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
    await expect(page.locator("main")).toBeVisible();
  }
});

test("dashboard controls and theme switching work", async ({ page }) => {
  await signIn(page);
  await expect(page.locator("text=/Dynamic analytical model|SalesOps Intelligence Hub|Overview/i").first()).toBeVisible();

  // Theme switcher buttons in header
  const lightBtn = page.locator("button:has-text('Light')");
  if (await lightBtn.count() > 0) {
    await lightBtn.first().click();
    await page.waitForTimeout(500);
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark).toBe(false);
  }

  const darkBtn = page.locator("button:has-text('Dark')");
  if (await darkBtn.count() > 0) {
    await darkBtn.first().click();
    await page.waitForTimeout(500);
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark).toBe(true);
  }
});

test("Data Compare workflow executes and displays reconciliation results", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/compare");
  await expect(page).toHaveURL(/\/app\/compare$/);

  // Load sample dataset
  const sampleBtn = page.locator("button:has-text('Load Sample Enterprise Dataset')");
  await expect(sampleBtn).toBeVisible();
  await sampleBtn.click();
  await expect(page.locator("text=PostgreSQL Staged ✓").first()).toBeVisible({ timeout: 25_000 });

  // Step 1 -> Step 2
  const continueBtn = page.locator("button:has-text('Continue to Data Profiling')");
  await expect(continueBtn).toBeEnabled({ timeout: 10_000 });
  await continueBtn.click();

  // Step 2 -> Step 3
  const proceedBtn = page.locator("button:has-text('Proceed to Column Mapping')");
  await expect(proceedBtn).toBeVisible({ timeout: 10_000 });
  await proceedBtn.click();

  // Step 3 -> Step 4
  const rulesBtn = page.locator("button:has-text('Configure Matching Rules')");
  await expect(rulesBtn).toBeVisible({ timeout: 10_000 });
  await rulesBtn.click();

  // Step 4 -> Step 5
  const runBtn = page.locator("button:has-text('Run Comparison')");
  await expect(runBtn).toBeVisible({ timeout: 10_000 });
  await runBtn.click();

  // Verify results rendered
  await expect(page.locator("text=Match Rate")).toBeVisible({ timeout: 25_000 });
});

test("CSV and XLSX uploads are accepted and invalid files show an error", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/sources");
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "qa-upload.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("id,name\n1,Ada\n2,Grace\n"),
  });
  await expect(page.getByText(/Successfully uploaded and profiled/i)).toBeVisible({ timeout: 35_000 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data");
  sheet.addRows([["id", "name"], [1, "Ada"]]);
  const xlsx = Buffer.from(await workbook.xlsx.writeBuffer());
  await fileInput.setInputFiles({ name: "qa-upload.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: xlsx });
  await expect(page.getByText(/Successfully uploaded and profiled/i)).toBeVisible({ timeout: 35_000 });

  await fileInput.setInputFiles({ name: "qa-upload.exe", mimeType: "application/octet-stream", buffer: Buffer.from("bad") });
  await expect(page.getByText(/Only CSV, TSV, XLS, and XLSX files are supported/i)).toBeVisible();
});

test("PostgreSQL connector reports invalid connection safely", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/sources");
  await page.getByRole("button", { name: "Connect PostgreSQL" }).click();
  await page.locator("#pgHost").fill("203.0.113.1");
  await page.locator("#pgDatabase").fill("invalid");
  await page.locator("#pgUser").fill("invalid");
  const testBtn = page.getByRole("button", { name: /Test Connection & Fetch Tables/i });
  await testBtn.scrollIntoViewIfNeeded();
  await testBtn.click({ force: true });
  await expect(page.locator("text=/Connection failed|Failed to test PostgreSQL connection|timeout|refused|ETIMEDOUT/i")).toBeVisible({ timeout: 20_000 });
});

test("reports, analytics, insights, empty state and responsive layout render", async ({ page }) => {
  await signIn(page);
  for (const route of ["/app/insights", "/app/reports"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Application error");
  }
  await page.goto("/app/reports");
  await expect(page.getByText(/Executive Reports & Export Center|No Datasets Configured/i)).toBeVisible({ timeout: 15_000 });
  const selectLocator = page.locator("select");
  if (await selectLocator.count() > 0) {
    const datasetId = await selectLocator.first().inputValue();
    if (datasetId) {
      const pdfResponse = await page.request.post(`/api/datasets/${datasetId}/export`, {
        data: { format: "pdf" },
      });
      expect(pdfResponse.status()).toBe(200);
      expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
      expect((await pdfResponse.body()).subarray(0, 5).toString()).toBe("%PDF-");
    }
  }
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
  }
});

test("logout revokes access to the protected dashboard", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: /Sign out/i }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});