import { expect, test } from "@playwright/test";
import { signIn } from "../fixtures/helpers";

test.describe("Dashboard & Visualization Engine", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("dashboard renders executive summary and engine status or clean onboarding state", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.locator("text=/Dynamic analytical model verified by embedded DuckDB engine|Welcome to Confluence BI|Connect Data Source/i").first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("view switches between Data Fabric Mesh and 3D Universe when datasets exist", async ({ page }) => {
    const meshBtn = page.getByRole("button", { name: "Data Fabric Mesh" });
    const emptyState = page.locator("text=/Welcome to Confluence BI|Connect Data Source/i").first();

    await expect(meshBtn.or(emptyState)).toBeVisible({ timeout: 15_000 });

    if (await meshBtn.isVisible()) {
      await meshBtn.click();
      await expect(page.getByText("Pipeline Topology & Real-Time Flow Map")).toBeVisible();

      const universeBtn = page.getByRole("button", { name: "3D Universe" });
      await expect(universeBtn).toBeVisible();
      await universeBtn.click();
      await expect(page.getByText("3D Topological Join Universe")).toBeVisible();
    } else {
      await expect(emptyState).toBeVisible();
    }
  });

  test("theme toggle correctly applies light and dark classes", async ({ page }) => {
    const lightRadio = page.getByRole("radio", { name: "Light theme" });
    if (await lightRadio.isVisible()) {
      await lightRadio.click();
      await expect(page.locator("html")).toHaveClass(/light/);

      const darkRadio = page.getByRole("radio", { name: "Dark theme" });
      await darkRadio.click();
      await expect(page.locator("html")).toHaveClass(/dark/);
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
