import { expect, test } from "@playwright/test";
import en from "../../src/messages/en.json";
import ar from "../../src/messages/ar.json";
test("language popup remains visible with reduced motion in LTR and RTL", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => localStorage.setItem("campusfix.preferences", "dark|true"));
  for (const [locale, copy] of Object.entries({ en, ar })) {
    await page.goto(`/${locale}/settings`);
    await expect(page.locator(".profile-summary h2")).toBeVisible();
    await page.getByRole("combobox", { name: copy.app.language, exact: true }).click();
    const popup = page.getByRole("listbox");
    await expect(popup).toBeInViewport({ ratio: 0.999 });
    await expect(popup).toHaveCSS("opacity", "1");
    await expect(page.getByRole("option")).toHaveCount(5);
    await popup.screenshot({
      path: `../codex/screenshots/refinement/${locale}-language-popup.png`,
      animations: "disabled",
    });
    await page.screenshot({
      path: `../codex/screenshots/refinement/${locale}-language-menu-viewport-375.png`,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
  }
});
