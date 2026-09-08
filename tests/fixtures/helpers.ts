import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const TEST_USER = {
  email: "ashwin@datafusion.io",
  password: "Admin@123456",
  name: "Ashwin",
  orgName: "DataFusion BI",
};

export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_USER.email);
  await page.getByLabel("Password").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });
  await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
}

export async function checkNoHorizontalOverflow(page: Page) {
  const isContained = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= window.innerWidth + 2;
  });
  expect(isContained).toBe(true);
}

export async function runAxeAudit(page: Page, options: { contextName: string; disableRules?: string[] }) {
  let builder = new AxeBuilder({ page });
  if (options.disableRules && options.disableRules.length > 0) {
    builder = builder.disableRules(options.disableRules);
  }
  const results = await builder.analyze();
  return results;
}
