import { test } from "@playwright/test";
import { signIn, checkNoHorizontalOverflow } from "../fixtures/helpers";

const VIEWPORTS = [
  { name: "Mobile Small (375x812)", width: 375, height: 812 },
  { name: "Mobile Medium (390x844)", width: 390, height: 844 },
  { name: "Tablet Portrait (768x1024)", width: 768, height: 1024 },
  { name: "Desktop Standard (1280x720)", width: 1280, height: 720 },
  { name: "Desktop Large (1440x900)", width: 1440, height: 900 },
  { name: "Desktop Full HD (1920x1080)", width: 1920, height: 1080 },
];

test.describe("Responsive Viewport & Layout Integrity", () => {
  test("public landing page renders without horizontal overflow across viewports", async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      await checkNoHorizontalOverflow(page);
    }
  });

  test("authenticated dashboard renders without horizontal overflow across viewports", async ({ page }) => {
    await signIn(page);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/app");
      await page.waitForLoadState("domcontentloaded");
      await checkNoHorizontalOverflow(page);
    }
  });
});
