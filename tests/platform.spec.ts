import { expect, test, type Page } from "@playwright/test";
import ExcelJS from "exceljs";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ashwin@datafusion.io");
  await page.getByLabel("Password").fill("Admin@123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });
}

test("public landing page is the default entry point", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/BI Platform/);
  await expect(page.getByRole("heading", { name: /Intelligent Analytics/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In to Workspace" }).first()).toBeVisible();
  await page.locator('a[href="/login"]').first().click();
  await expect(page).toHaveURL(/\/login$/);
});

test("protected dashboard redirects unauthenticated users", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("login loads dashboard and all primary routes", async ({ page }) => {
  await signIn(page);
  for (const route of ["/app/sources", "/app/prep", "/app/insights", "/app/reports", "/app/settings"]) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
    await expect(page.locator("main")).toBeVisible();
  }
});

test("dashboard controls and theme switching work", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("Dynamic analytical model verified by embedded DuckDB engine.")).toBeVisible();
  await page.getByRole("button", { name: "Data Fabric Mesh" }).click();
  await expect(page.getByText("Pipeline Topology & Real-Time Flow Map")).toBeVisible();
  await page.getByRole("button", { name: "3D Universe" }).click();
  await expect(page.getByText("3D Topological Join Universe")).toBeVisible();
  await page.getByRole("radio", { name: "Light theme" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await page.getByRole("radio", { name: "Dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
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
  await expect(page.getByText(/Successfully uploaded and profiled/)).toBeVisible({ timeout: 30_000 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data");
  sheet.addRows([["id", "name"], [1, "Ada"]]);
  const xlsx = Buffer.from(await workbook.xlsx.writeBuffer());
  await fileInput.setInputFiles({ name: "qa-upload.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: xlsx });
  await expect(page.getByText(/Successfully uploaded and profiled/)).toBeVisible({ timeout: 30_000 });

  await fileInput.setInputFiles({ name: "qa-upload.exe", mimeType: "application/octet-stream", buffer: Buffer.from("bad") });
  await expect(page.getByText(/Only CSV, TSV, XLS, and XLSX files are supported/)).toBeVisible();
});

test("PostgreSQL connector reports invalid connection safely", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/sources");
  await page.getByRole("button", { name: "Connect PostgreSQL" }).click();
  await page.getByLabel("Host").fill("203.0.113.1");
  await page.getByLabel("Database Name").fill("invalid");
  await page.getByLabel("Username").fill("invalid");
  await page.getByRole("button", { name: "Test Connection & Fetch Tables" }).click();
  await expect(page.locator("text=/Connection failed|Failed to test PostgreSQL connection|timeout|refused/i")).toBeVisible({ timeout: 15_000 });
});

test("reports, analytics, insights, empty state and responsive layout render", async ({ page }) => {
  await signIn(page);
  for (const route of ["/app/insights", "/app/reports"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Application error");
  }
  await page.goto("/app/reports");
  await expect(page.getByText(/Executive Reports & Export Center|No datasets configured/)).toBeVisible({ timeout: 15_000 });
  const datasetId = await page.locator("select").first().inputValue();
  if (datasetId) {
    const pdfResponse = await page.request.post(`/api/datasets/${datasetId}/export`, {
      data: { format: "pdf" },
    });
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
    expect((await pdfResponse.body()).subarray(0, 5).toString()).toBe("%PDF-");
  }
  for (const width of [320, 375, 414, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true);
  }
});

test("logout revokes access to the protected dashboard", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: /Sign out/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});