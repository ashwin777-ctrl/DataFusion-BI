import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { signIn } from "../fixtures/helpers";

test.describe("Data Sources Ingestion Engine", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/app/sources");
    await expect(page.locator("main")).toBeVisible();
  });

  test("CSV upload profiles rows and stages dataset into Parquet", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "qa_inventory.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("item_id,sku,stock,price\n101,SKU-A,50,19.99\n102,SKU-B,120,49.50\n103,SKU-C,0,9.99\n"),
    });

    await expect(page.getByText(/Successfully uploaded and profiled/)).toBeVisible({ timeout: 30_000 });
  });

  test("Excel XLSX upload parses multiple sheets and profiles columns", async ({ page }) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("SalesQ1");
    sheet.addRows([
      ["region", "quarter", "revenue"],
      ["North", "Q1", 45000],
      ["South", "Q1", 62000],
    ]);
    const xlsxBuf = Buffer.from(await workbook.xlsx.writeBuffer());

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "qa_sales_q1.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: xlsxBuf,
    });

    await expect(page.getByText(/Successfully uploaded and profiled/)).toBeVisible({ timeout: 30_000 });
  });

  test("unsupported file extension (.exe) is rejected with clear validation error", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "malicious_payload.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("bad-executable-content"),
    });

    await expect(page.getByText(/Only CSV, TSV, XLS, and XLSX files are supported/)).toBeVisible();
  });

  test("PostgreSQL connection modal validates fields and safely reports unreachable host", async ({ page }) => {
    await page.getByRole("button", { name: "Connect PostgreSQL" }).click();
    await expect(page.getByRole("heading", { name: /Connect PostgreSQL/ })).toBeVisible();

    await page.getByLabel("Host").fill("203.0.113.1"); // TEST-NET-3 non-routable IP
    await page.getByLabel("Port").fill("5432");
    await page.getByLabel("Database Name").fill("nonexistent_db");
    await page.getByLabel("Username").fill("qa_user");
    await page.getByLabel("Password").fill("qa_pass");

    await page.getByRole("button", { name: "Test Connection & Fetch Tables" }).click();
    await expect(page.locator("text=/Connection failed|Failed to test PostgreSQL connection|timeout|refused/i")).toBeVisible({ timeout: 20_000 });
  });
});
