import { expect, test } from "@playwright/test";
import { signIn } from "../fixtures/helpers";

test.describe("Authentication Workflows", () => {
  test("unauthenticated user accessing protected /app is redirected to /login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("invalid credentials show error message without exposing system internals", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nonexistent@example.com");
    await page.getByLabel("Password").fill("WrongPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    const errorAlert = page.getByRole("alert").filter({ hasText: /Incorrect email or password/i });
    await expect(errorAlert).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("empty required fields prevent submission with client validation", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("valid user logs in successfully and reaches the workspace dashboard", async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.locator("text=/Dynamic analytical model verified by embedded DuckDB engine|Welcome to Confluence BI|Connect Data Source/i").first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("logout clears session and blocks access to workspace", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /Sign out/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Direct navigation to protected app must redirect back to login
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login$/);
  });
});
