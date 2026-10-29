import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { choose, withLoginRateLimit } from "./helpers";
import en from "../../src/messages/en.json";
import es from "../../src/messages/es.json";
import ar from "../../src/messages/ar.json";
import ru from "../../src/messages/ru.json";
import uz from "../../src/messages/uz.json";
const base = "http://127.0.0.1:3200/backend";
const headers = { "X-CampusFix-Request": "1", Origin: "http://127.0.0.1:3200" };
const backgrounds = { light: "rgb(251, 250, 247)", dark: "rgb(11, 13, 18)" };
async function setTheme(page: Page, theme: "light" | "dark" | "system") {
  await page.evaluate((theme) => {
    localStorage.setItem("campusfix.preferences", `${theme}|true`);
    window.dispatchEvent(new Event("campus-preferences"));
  }, theme);
}
async function checkBackground(page: Page, mode: "light" | "dark") {
  await expect(page.locator("html")).toHaveCSS("background-color", backgrounds[mode]);
  await expect(page.locator("body")).toHaveCSS("background-color", backgrounds[mode]);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    new RegExp(mode === "dark" ? "0b0d12|11, 13, 18" : "fbfaf7|251, 250, 247"),
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function login(page: Page) {
  const response = await withLoginRateLimit(() =>
    page.request.post(base + "/staff/login", {
      headers,
      data: { username: process.env.STAFF_EMAIL, password: process.env.STAFF_PASSWORD },
    }),
  );
  expect(response.status()).toBe(200);
}

test("persisted theme is applied before hydration and native handshake never sends the SSR fallback", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    localStorage.setItem("campusfix.preferences", "dark|true");
    const messages: { type: string; payload?: { mode: string; colors: { background: string } } }[] =
      [];
    Object.assign(window, { appearanceMessages: messages });
    window.ReactNativeWebView = {
      postMessage(value) {
        const message = JSON.parse(value);
        messages.push(message);
        if (message.type === "web.ready")
          setTimeout(
            () =>
              window.dispatchEvent(
                new CustomEvent("campus-fix:bridge", {
                  detail: JSON.stringify({
                    version: 1,
                    type: "native.platform",
                    payload: { platform: "ios" },
                  }),
                }),
              ),
            0,
          );
      },
    };
  });
  let release!: () => void;
  const scripts = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/_next\/.*\.js(?:\?.*)?$/, async (route) => {
    await scripts;
    await route.continue();
  });
  await page.goto("/en/settings", { waitUntil: "commit" });
  try {
    await checkBackground(page, "dark");
    await expect(page.locator("html")).toHaveAttribute("data-native", "true");
  } finally {
    release();
  }
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("combobox", { name: en.app.appearance, exact: true })).toBeVisible();
  // The server-rendered control can be visible before hydration, especially in WebKit.
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as {
            appearanceMessages: { type: string; payload?: { mode: string } }[];
          }
        ).appearanceMessages
          .filter((m) => m.type === "web.appearance")
          .map((m) => m.payload?.mode),
      ),
    )
    .toContain("dark");
  const modes = await page.evaluate(() =>
    (
      window as unknown as { appearanceMessages: { type: string; payload?: { mode: string } }[] }
    ).appearanceMessages
      .filter((m) => m.type === "web.appearance")
      .map((m) => m.payload?.mode),
  );
  expect(modes.length).toBeGreaterThan(0);
  expect(new Set(modes)).toEqual(new Set(["dark"]));
  await page.addStyleTag({ content: ":root { --safe-area-top: 47px; --safe-area-bottom: 34px; }" });
  const wide = await page.evaluate(() => innerWidth >= 1024);
  await expect(page.locator(".page-container")).toHaveCSS("padding-top", wide ? "40px" : "24px");
  await expect(page.locator(".mobile-tabs")).toHaveCSS("bottom", "10px");
  const count = modes.length;
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("campus-fix:bridge", {
        detail: JSON.stringify({
          version: 1,
          type: "native.platform",
          payload: { platform: "ios" },
        }),
      }),
    ),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as { appearanceMessages: { type: string }[] }
          ).appearanceMessages.filter((m) => m.type === "web.appearance").length,
      ),
    )
    .toBeGreaterThan(count);
  await page.goto("/en/staff/login");
  const compactHeight = await page.evaluate(() => matchMedia("(max-height: 680px)").matches);
  await expect(page.locator(".staff-auth-content")).toHaveCSS(
    "padding-top",
    wide ? "64px" : compactHeight ? "24px" : "36px",
  );
  await checkBackground(page, "dark");
});

test("light, dark and live system changes synchronize without navigation or remounts", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/en/settings");
  const origin = await page.evaluate(() => performance.timeOrigin);
  await page.evaluate(() => {
    Object.assign(window, { appearanceModes: [] });
    window.ReactNativeWebView = {
      postMessage(value) {
        const message = JSON.parse(value);
        if (message.type === "web.appearance")
          (window as unknown as { appearanceModes: string[] }).appearanceModes.push(
            message.payload.mode,
          );
        if (message.type === "web.ready")
          window.dispatchEvent(
            new CustomEvent("campus-fix:bridge", {
              detail: JSON.stringify({
                version: 1,
                type: "native.platform",
                payload: { platform: "android" },
              }),
            }),
          );
      },
    };
  });
  const control = page.getByRole("combobox", { name: en.app.appearance, exact: true });
  for (const theme of ["dark", "light", "system"] as const) {
    await choose(page, control, en.app[theme]);
    await checkBackground(page, theme === "system" ? "light" : theme);
  }
  await page.emulateMedia({ colorScheme: "dark" });
  await checkBackground(page, "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await checkBackground(page, "light");
  await choose(page, control, en.app.dark);
  await page.emulateMedia({ colorScheme: "light" });
  await checkBackground(page, "dark");
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { appearanceModes: string[] }).appearanceModes.at(-1),
      ),
    )
    .toBe("dark");
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  await page.getByRole("link", { name: en.app.exploreTitle, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/reports$/);
  await checkBackground(page, "dark");
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  await page.reload();
  await checkBackground(page, "dark");
});

test("dashboard uses external, localized legends with exact values and distinct category colors", async ({
  page,
}) => {
  test.setTimeout(120000);
  await login(page);
  const data = await (await page.request.get(base + "/staff/analytics?days=30")).json();
  for (const [locale, messages] of Object.entries({ en, es, ar, ru, uz })) {
    await page.goto(`/${locale}/staff/dashboard`);
    await setTheme(page, locale === "en" ? "light" : "dark");
    await expect(page.locator(".chart-legend-host .analytics-legend")).toHaveCount(3);
    await expect(page.locator(".trend-legend-host")).toContainText(messages.app.reportsCreated);
    const locations = page.locator(".analytics-chart-pair .analytics-chart").first();
    await expect(locations.locator(".chart-legend-label")).toHaveText(
      data.locations.map((row: { name: string }) => row.name),
    );
    await expect(locations.locator(".chart-legend-value")).toHaveText(
      data.locations.map((row: { count: number }) =>
        new Intl.NumberFormat(locale).format(row.count),
      ),
    );
    const numericAxis = (await locations.locator("svg text").allTextContents()).join(" ");
    for (const row of data.locations) expect(numericAxis).not.toContain(row.name);
    const rectangles = locations.locator(".recharts-bar-rectangle .recharts-rectangle");
    await expect(rectangles).toHaveCount(data.locations.length);
    const fills = await rectangles.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).fill),
    );
    expect(new Set(fills).size).toBe(data.locations.length);
    const chart = await locations.locator('[data-slot="chart"]').boundingBox();
    const legend = await locations.locator(".chart-legend-host").boundingBox();
    if (!legend || !chart) throw new Error("Chart and legend must be visible");
    expect(legend.y).toBeGreaterThanOrEqual(chart.y + chart.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await rectangles.first().hover();
    await expect(locations.locator(".recharts-tooltip-wrapper")).toContainText(
      data.locations[0].name,
    );
  }
});

test("theme visual matrix covers student and staff surfaces, overlays, and RTL", async ({
  page,
  browser,
}, info) => {
  test.skip(info.project.name !== "desktop", "Includes four mobile/desktop viewports itself");
  test.setTimeout(240000);
  await mkdir("../codex/screenshots/update07", { recursive: true });
  await page.request.post(base + "/anonymous/session", { headers });
  const report = (await (await page.request.get(base + "/reports?limit=1")).json()).data[0];
  expect(report?.id).toBeTruthy();
  const workerContext = await browser.newContext(),
    worker = await workerContext.newPage();
  await login(worker);
  const errors: string[] = [];
  for (const surface of [page, worker])
    surface.on("pageerror", (error) => errors.push(error.message));
  for (const [width, height] of [
    [375, 812],
    [390, 844],
    [430, 932],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await worker.setViewportSize({ width, height });
    for (const mode of ["light", "dark"] as const) {
      for (const [surface, path, name] of [
        [page, "/en", "account"],
        [page, "/en/reports", "reports"],
        [page, "/en/reports/new", "create"],
        [page, "/en/reports/" + report.id, "detail"],
        [page, "/en/settings", "settings"],
        [page, "/en/staff/login", "login"],
        [worker, "/en/staff/dashboard", "dashboard"],
      ] as const) {
        await surface.goto(path);
        await setTheme(surface, mode);
        await surface.waitForLoadState("networkidle");
        await checkBackground(surface, mode);
        await surface.screenshot({
          path: `../codex/screenshots/update07/en-${name}-${mode}-${width}.png`,
          fullPage: true,
          animations: "disabled",
        });
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await worker.setViewportSize({ width: 390, height: 844 });
  for (const [surface, path, name] of [
    [page, "/ar/settings", "settings"],
    [worker, "/ar/staff/dashboard", "dashboard"],
  ] as const) {
    await surface.goto(path);
    await setTheme(surface, "dark");
    await surface.waitForLoadState("networkidle");
    await checkBackground(surface, "dark");
    await surface.screenshot({
      path: `../codex/screenshots/update07/ar-${name}-dark-390.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.getByRole("button", { name: ar.app.editProfile, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCSS("background-color", "rgb(17, 20, 25)");
  await page.screenshot({
    path: "../codex/screenshots/update07/ar-dialog-dark-390.png",
    fullPage: false,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: ar.app.appearance, exact: true }).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(page.getByRole("listbox")).toHaveCSS("background-color", "rgb(17, 20, 25)");
  await expect(page.getByRole("listbox")).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: "../codex/screenshots/update07/ar-select-dark-390.png",
    fullPage: false,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
  await workerContext.close();
});
