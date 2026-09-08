import { expect, test } from "@playwright/test";
import { signIn } from "../fixtures/helpers";

test.describe("Reports & Multi-Format Export Engine", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/app/reports");
    await expect(page.locator("main")).toBeVisible();
  });

  test("reports center loads executive report view without errors", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.getByText(/Executive Reports & Export Center|No datasets configured/)).toBeVisible({ timeout: 15_000 });
  });

  test("dataset export API generates valid binary CSV", async ({ page }) => {
    const datasetSelect = page.locator("select").first();
    if (await datasetSelect.isVisible()) {
      const datasetId = await datasetSelect.inputValue();
      if (datasetId) {
        const response = await page.request.post(`/api/datasets/${datasetId}/export`, {
          data: { format: "csv" },
        });
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toContain("text/csv");
        const body = await response.text();
        expect(body.length).toBeGreaterThan(0);
      }
    }
  });

  test("dataset export API generates valid binary Excel (.xlsx)", async ({ page }) => {
    const datasetSelect = page.locator("select").first();
    if (await datasetSelect.isVisible()) {
      const datasetId = await datasetSelect.inputValue();
      if (datasetId) {
        const response = await page.request.post(`/api/datasets/${datasetId}/export`, {
          data: { format: "xlsx" },
        });
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        const body = await response.body();
        expect(body.subarray(0, 2).toString("utf8")).toBe("PK"); // ZIP/XLSX magic bytes
      }
    }
  });

  test("dataset export API generates valid binary PDF with standard %PDF- header", async ({ page }) => {
    const datasetSelect = page.locator("select").first();
    if (await datasetSelect.isVisible()) {
      const datasetId = await datasetSelect.inputValue();
      if (datasetId) {
        const response = await page.request.post(`/api/datasets/${datasetId}/export`, {
          data: { format: "pdf" },
        });
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toContain("application/pdf");
        const body = await response.body();
        expect(body.subarray(0, 5).toString("utf8")).toBe("%PDF-");
      }
    }
  });
});
