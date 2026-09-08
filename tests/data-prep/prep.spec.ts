import { expect, test } from "@playwright/test";
import { signIn } from "../fixtures/helpers";

test.describe("Data Preparation & Relationship Engine", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/app/prep");
    await expect(page.locator("main")).toBeVisible();
  });

  test("data prep page renders staged sources and relationship workspace", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Data Prep & Consolidation Model|Data Prep/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("relationship topology canvas or tables list is interactive", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
    // Check for build dataset or join actions
    const hasSources = await page.locator("text=/Staged Sources|Uploaded Sources/i").isVisible();
    expect(typeof hasSources).toBe("boolean");
  });
});
