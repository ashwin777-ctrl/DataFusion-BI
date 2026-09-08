import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn } from "../fixtures/helpers";

test.describe("Automated Accessibility Audit (WCAG 2.1)", () => {
  test("public landing page passes critical accessibility rules", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"]) // Often dynamic in 3D WebGL canvases
      .analyze();

    // Critical violations should be zero
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical",
    );
    expect(criticalViolations).toEqual([]);
  });

  test("authentication sign in page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    const scanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const critical = scanResults.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });

  test("authenticated dashboard passes accessibility scan", async ({ page }) => {
    await signIn(page);
    await page.waitForLoadState("domcontentloaded");

    const scanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .disableRules(["color-contrast"]) // 3D WebGL canvas
      .analyze();

    const critical = scanResults.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });
});
