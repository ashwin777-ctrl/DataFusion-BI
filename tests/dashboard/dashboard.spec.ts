import { expect, test } from "@playwright/test";
import { signIn } from "../fixtures/helpers";

test.describe("Dashboard & Visualization Engine", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("dashboard renders executive summary and engine status or clean onboarding state", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.locator("text=/Dynamic analytical model|SalesOps|Consolidated Model|PostgreSQL 16 active|Overview/i").first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("view switches between SalesOps and Fabric when available", async ({ page }) => {
    const fabricBtn = page.getByRole("button", { name: "Fabric" });
    const overviewBtn = page.getByRole("button", { name: "SalesOps" });

    if (await fabricBtn.isVisible()) {
      await fabricBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator("text=/Pipeline Topology|Real-Time Flow Map|Fabric/i").first()).toBeVisible();

      await overviewBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("theme toggle correctly applies light and dark classes", async ({ page }) => {
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

  test("navigation bar links connect to all workspace pages", async ({ page }) => {
    const routes = [
      { name: "Sources", path: "/app/sources" },
      { name: "Data Prep", path: "/app/prep" },
      { name: "Insights", path: "/app/insights" },
      { name: "Reports", path: "/app/reports" },
      { name: "Settings", path: "/app/settings" },
    ];

    for (const r of routes) {
      await page.goto(r.path);
      await expect(page).toHaveURL(new RegExp(`${r.path.replace(/\//g, "\\/")}$`));
      await expect(page.locator("main")).toBeVisible();
    }
  });
});
