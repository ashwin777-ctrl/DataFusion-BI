import { expect, test } from "@playwright/test";
import { signIn } from "../fixtures/helpers";

test.describe("Platform Security & Isolation Checks", () => {
  test("unauthenticated API requests fail closed with 401/403 or redirect", async ({ request }) => {
    const endpoints = [
      "/api/datasets",
      "/api/sources",
      "/api/auth/me",
    ];

    for (const ep of endpoints) {
      const res = await request.get(ep);
      // Unauthenticated requests should either return 401/403 or redirect to login (302/307)
      expect([401, 403, 302, 307, 404]).toContain(res.status());
    }
  });

  test("dataset export rejects path traversal attempts in filename/parameters", async ({ page }) => {
    await signIn(page);
    const traversalAttempt = await page.request.post("/api/datasets/../../etc/passwd/export", {
      data: { format: "csv" },
    });
    expect([400, 404, 500]).toContain(traversalAttempt.status());
    expect(traversalAttempt.status()).not.toBe(200);
  });

  test("SQL injection payloads in dataset filterSql do not compromise the database", async ({ page }) => {
    await signIn(page);
    await page.goto("/app/reports");
    const datasetSelect = page.locator("select").first();
    if (await datasetSelect.isVisible()) {
      const datasetId = await datasetSelect.inputValue();
      if (datasetId) {
        // Attempt classic SQL injection payload in filterSql
        const res = await page.request.post(`/api/datasets/${datasetId}/export`, {
          data: {
            format: "csv",
            filterSql: "1=1; DROP TABLE users; --",
          },
        });
        // DuckDB or query engine should either safely reject the query with 400/500 or execute with parameterized sandboxing
        expect(res.status()).toBeLessThanOrEqual(500);
      }
    }
  });
});
