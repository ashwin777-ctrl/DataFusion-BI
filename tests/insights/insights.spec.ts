import { expect, test } from "@playwright/test";
import { signIn } from "../fixtures/helpers";

test.describe("AI & Statistical Insights Engine", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/app/insights");
    await expect(page.locator("main")).toBeVisible();
  });

  test("insights engine loads without unhandled runtime exceptions", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(
      page.locator("text=/Automated Business Insights|Automated Statistical Insights|No datasets available for analysis/i").first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("insights page displays KPI summary and strategic findings if dataset selected", async ({ page }) => {
    const datasetSelect = page.locator("select").first();
    if (await datasetSelect.isVisible()) {
      const val = await datasetSelect.inputValue();
      if (val) {
        await expect(page.locator("text=/Autonomous Executive Briefing|Core Analytical Findings|Executive Summary|Key Findings/i").first()).toBeVisible({ timeout: 15_000 });
      }
    }
  });
});
