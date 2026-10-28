import { expect, test } from "@playwright/test";
test("locale negotiation, switching and browser fallback", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { name: "CampusFix" })).toBeVisible();
  await expect(page.getByTestId("platform")).toHaveText("Platform: web");
  await expect(page.locator("body")).toHaveCSS("font-family", /nunito/i);
  expect(
    await page.evaluate(async () => {
      await document.fonts.ready;
      return Array.from(document.fonts).some(
        (font) => /nunito/i.test(font.family) && font.status === "loaded",
      );
    }),
  ).toBe(true);
  await expect(page.locator("main")).toHaveCSS("display", "flex");
  await page.goto("/en?source=smoke#content");
  let resume = () => {};
  const pendingNavigation = new Promise<void>((resolve) => {
    resume = resolve;
  });
  await page.route("**/es?**", async (route) => {
    await pendingNavigation;
    await route.continue();
  });
  await page.getByRole("combobox", { name: "Language" }).selectOption("es");
  try {
    await expect(page.locator("#nprogress .bar")).toBeVisible();
  } finally {
    resume();
  }
  await expect(page).toHaveURL(/\/es\?source=smoke#content$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator("#nprogress .bar")).toHaveCount(0);
  await expect(page.getByText("La base de la aplicación está lista.")).toBeVisible();
  await page.getByRole("combobox", { name: "Idioma" }).selectOption("en");
  await expect(page).toHaveURL(/\/en\?source=smoke#content$/);
});
test("server proxy bypasses locale rewriting", async ({ request }) => {
  const response = await request.get("/backend/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});
test("browser language is negotiated and unsupported language falls back", async ({ browser }) => {
  for (const [language, expected] of [
    ["es-MX", "es"],
    ["fr-FR", "en"],
  ]) {
    const context = await browser.newContext({ locale: language });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3200/");
    await expect(page).toHaveURL(new RegExp(`/${expected}$`));
    await context.close();
  }
});
test("bridge handles a late native identity and rejects unknown messages", async ({ page }) => {
  await page.addInitScript(() => {
    window.ReactNativeWebView = { postMessage() {} };
  });
  await page.goto("/en");
  await expect(page.getByText("Native connection: connecting")).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("campus-fix:bridge", {
        detail: JSON.stringify({
          version: 2,
          type: "native.platform",
          payload: { platform: "ios" },
        }),
      }),
    );
  });
  await expect(page.getByTestId("platform")).toHaveText("Platform: web");
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("campus-fix:bridge", {
        detail: JSON.stringify({
          version: 1,
          type: "native.platform",
          payload: { platform: "ios" },
        }),
      }),
    );
  });
  await expect(page.getByTestId("platform")).toHaveText("Platform: ios");
  await expect(page.getByText("Native connection: connected")).toBeVisible();
});
