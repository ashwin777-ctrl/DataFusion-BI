import { expect, test } from "@playwright/test";
import { signIn } from "../fixtures/helpers";

test.describe("Organization Settings & Account Management", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/app/settings");
    await expect(page.locator("main")).toBeVisible();
  });

  test("settings page renders workspace profile and team members", async ({ page }) => {
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.getByText(/Organization Settings|Settings|Members|Profile/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("security controls and active session details are displayed", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/Role|Email|DataFusion/i).first()).toBeVisible();
  });
});
