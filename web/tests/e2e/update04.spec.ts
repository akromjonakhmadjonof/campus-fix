/* Fixture geometry is checked for null immediately before reading coordinates. */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { choose } from "./helpers";
import en from "../../src/messages/en.json";
import es from "../../src/messages/es.json";
import ar from "../../src/messages/ar.json";
import ru from "../../src/messages/ru.json";
import uz from "../../src/messages/uz.json";

test("four accessible icon destinations navigate without reloading", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator(".profile-summary h2")).toBeVisible();
  await expect(page.locator(".account-menu")).toHaveCount(0);
  const initial = await page.evaluate(() => performance.timeOrigin);
  const nav = page.getByRole("navigation", { name: "CampusFix" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  expect(
    await nav
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("aria-label"))),
  ).toEqual([en.app.account, en.app.exploreTitle, en.app.report, en.app.settings]);
  await expect(nav.locator("small")).toHaveCount(0);
  for (const [label, route] of [
    [en.app.exploreTitle, "/en/reports"],
    [en.app.report, "/en/reports/new"],
    [en.app.settings, "/en/settings"],
    [en.app.account, "/en"],
  ]) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(route + "$"));
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(initial);
  }
  await page.goBack();
  await expect(nav.getByRole("link", { name: en.app.settings, exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.goForward();
  await expect(nav.getByRole("link", { name: en.app.account, exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("all seven fields validate, dependent type preserves other input and an image is required", async ({
  page,
}) => {
  await page.goto("/en/reports/new");
  const submit = page.getByRole("button", { name: "Review similar issues", exact: true });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.locator(".field-error").filter({ hasText: /.+/ })).toHaveCount(7);
  await expect(page.locator("#report-title")).toBeFocused();
  await page.locator("#report-title").fill("Monitor in second row stays black");
  await page
    .locator("#report-description")
    .fill("The computer turns on but the screen stays black after checking the cables.");
  await page.locator("#report-exact").fill("Third computer in the second row");
  await choose(page, page.locator("#report-group"), "Plumbing");
  await choose(page, page.locator("#report-type"), "Water Fountain");
  await choose(page, page.locator("#report-location"), "Duck Pond");
  await choose(page, page.locator("#report-group"), "IT & Computing");
  await expect(page.locator("#report-type")).not.toContainText("Water Fountain");
  await expect(page.locator("#report-title")).toHaveValue("Monitor in second row stays black");
  await expect(page.locator("#report-description")).toHaveValue(/computer turns on/);
  await expect(page.locator("#report-location")).toContainText("Duck Pond");
  await expect(page.locator("#report-exact")).toHaveValue("Third computer in the second row");
  await choose(page, page.locator("#report-type"), "Monitor");
  await submit.click();
  await expect(page.locator("#report-photo-error")).toHaveText(en.app.photoRequired);
  await expect(page.locator(".review-grid")).toHaveCount(0);
  await expect(page.locator('input[capture="environment"]')).toHaveCount(1);
  await page
    .locator("#report-photo")
    .setInputFiles({ name: "bad.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await expect(page.locator("#report-photo-error")).toHaveText(en.app.photoError);
  await page.locator("#report-photo").setInputFiles(resolve("../backend/seed-assets/computer.png"));
  await expect(page.locator(".photo-gallery img")).toHaveCount(1);
  await submit.click();
  await expect(page.getByRole("heading", { name: en.app.similarTitle, exact: true })).toBeVisible();
});

test("debounced filters retain previous results, browser history and detail return state", async ({
  page,
}) => {
  await page.goto("/en/reports");
  await expect(page.locator(".issue-card").first()).toBeVisible();
  const initial = await page.evaluate(() => performance.timeOrigin);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/backend/reports?")) requests.push(request.url());
  });
  const firstTitle = await page.locator(".issue-card h3").first().innerText();
  await page.route(
    "**/backend/reports?**",
    async (route) => {
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ response });
    },
    { times: 1 },
  );
  await choose(
    page,
    page.getByRole("combobox", { name: en.app.category, exact: true }),
    en.app.categories.IT,
  );
  await expect(page).toHaveURL(/category=IT/);
  await expect(page.locator(".results-pending")).toBeVisible();
  await expect(page.locator(".issue-card h3").first()).toHaveText(firstTitle);
  await expect(page.locator(".results-pending")).toHaveCount(0);
  await page.getByRole("button", { name: en.app.filters, exact: true }).click();
  await choose(page, page.getByRole("combobox", { name: en.app.sort, exact: true }), en.app.oldest);
  await expect(page).toHaveURL(/sort=oldest/);
  await expect(page.locator(".results-pending")).toHaveCount(0);
  requests.length = 0;
  await page
    .getByRole("textbox", { name: en.app.search, exact: true })
    .pressSequentially("monitor", { delay: 35 });
  await expect(page).toHaveURL(/q=monitor/);
  await expect(page.locator(".results-pending")).toHaveCount(0);
  expect(requests.filter((url) => new URL(url).searchParams.has("q"))).toHaveLength(1);
  await expect(page.locator(".issue-card")).toHaveCount(1);
  const vote = page
    .locator(".issue-card")
    .getByRole("button", { name: en.app.confirm, exact: true });
  await vote.click();
  await expect(
    page.locator(".issue-card").getByRole("button", { name: en.app.undoVote, exact: true }),
  ).toBeVisible();
  await page
    .locator(".issue-card")
    .getByRole("button", { name: en.app.undoVote, exact: true })
    .click();
  await expect(vote).toBeVisible();
  const filtered = page.url();
  await page.locator(".issue-card h3 a").click();
  await expect(page).toHaveURL(/\/reports\/[a-f0-9-]+\?from=/);
  await page.locator(".back-control").click();
  await expect(page).toHaveURL(filtered);
  await expect(page.getByRole("textbox", { name: en.app.search, exact: true })).toHaveValue(
    "monitor",
  );
  await page.goBack();
  await page.goBack();
  await page.goBack();
  await expect(page.getByRole("textbox", { name: en.app.search, exact: true })).toHaveValue("");
  await page.goForward();
  await expect(page.getByRole("textbox", { name: en.app.search, exact: true })).toHaveValue(
    "monitor",
  );
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(initial);
});

test("localized validation and icon navigation in every language", async ({ page }) => {
  for (const [locale, messages] of Object.entries({ en, es, ar, ru, uz })) {
    await page.goto(`/${locale}/reports/new`);
    await expect(
      page.getByRole("button", { name: messages.app.review, exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: messages.app.review, exact: true }).click();
    await expect(page.locator("#report-group-error")).toHaveText(messages.app.groupRequired);
    await expect(page.locator("#report-photo-error")).toHaveText(messages.app.photoRequired);
    const nav = page.getByRole("navigation", { name: "CampusFix" });
    expect(
      await nav
        .getByRole("link")
        .evaluateAll((links) => links.map((link) => link.getAttribute("aria-label"))),
    ).toEqual([
      messages.app.account,
      messages.app.exploreTitle,
      messages.app.report,
      messages.app.settings,
    ]);
    await expect(nav.locator('[aria-current="page"]')).toHaveAttribute(
      "aria-label",
      messages.app.report,
    );
    if (locale === "ar") await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  }
});

test("updated navigation and form visuals at required viewports", async ({ page }, info) => {
  test.skip(
    info.project.name !== "desktop",
    "This test contains its own mobile and desktop matrix",
  );
  test.setTimeout(180000);
  await mkdir("../codex/screenshots/update04", { recursive: true });
  for (const [width, height] of [
    [375, 812],
    [390, 844],
    [430, 932],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [locale, route, theme, name] of [
      ["en", "", "light", "account"],
      ["en", "reports", "light", "reports"],
      ["en", "reports/new", "light", "create"],
      ["en", "settings", "dark", "settings"],
      ["ar", "reports/new", "dark", "create"],
    ]) {
      await page.goto(`/${locale}/${route}`);
      await page.evaluate((theme) => {
        localStorage.setItem("campusfix.preferences", `${theme}|true`);
        window.dispatchEvent(new Event("campus-preferences"));
      }, theme);
      await page.waitForLoadState("networkidle");
      const nav = page.getByRole("navigation", { name: "CampusFix" });
      await expect(nav).toBeVisible();
      await expect(nav.getByRole("link")).toHaveCount(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      for (const link of await nav.getByRole("link").all()) {
        const box = await link.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: `../codex/screenshots/update04/${locale}-${name}-${theme}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
      if (route === "reports/new" || route === "settings") {
        const submit =
          route === "reports/new"
            ? page.locator('button[type="submit"]')
            : page.locator(".settings-footer a");
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const button = await submit.boundingBox();
        const bar = await nav.boundingBox();
        expect(button).not.toBeNull();
        expect(bar).not.toBeNull();
        expect(button!.y + button!.height).toBeLessThanOrEqual(bar!.y);
        await page.screenshot({
          path: `../codex/screenshots/update04/${locale}-${name}-${theme}-${width}-bottom.png`,
          animations: "disabled",
        });
      }
    }
  }
});

test("group, type, location, status, scope and pagination stay in the URL", async ({ page }) => {
  await page.goto("/en/reports");
  await expect(page.locator(".issue-card").first()).toBeVisible();
  const initial = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole("button", { name: en.app.next, exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("button", { name: en.app.filters, exact: true }).click();
  await choose(
    page,
    page.getByRole("combobox", { name: en.app.issueGroup, exact: true }),
    "IT & Computing",
  );
  await expect(page).not.toHaveURL(/page=2/);
  await choose(
    page,
    page.getByRole("combobox", { name: en.app.issueType, exact: true }),
    "Monitor",
  );
  await choose(
    page,
    page.getByRole("combobox", { name: en.app.location, exact: true }),
    "Sutherland Building",
  );
  await choose(
    page,
    page.getByRole("combobox", { name: en.app.allStatuses, exact: true }),
    en.app.statuses.REPORTED,
  );
  await expect(page.locator(".results-pending")).toHaveCount(0);
  const url = new URL(page.url());
  for (const key of ["group", "type", "locationId"])
    expect(url.searchParams.get(key)).toMatch(/^[a-f0-9-]{36}$/);
  expect(url.searchParams.get("status")).toBe("REPORTED");
  await expect(page.locator(".issue-card")).toHaveCount(1);
  await expect(page.locator(".issue-card h3")).toHaveText("Monitor stays black");
  await choose(
    page,
    page.getByRole("combobox", { name: en.app.issueGroup, exact: true }),
    "Plumbing",
  );
  expect(new URL(page.url()).searchParams.has("type")).toBe(false);
  await expect(page.getByRole("combobox", { name: en.app.issueType, exact: true })).toHaveText(
    en.app.all,
  );
  await page.getByRole("button", { name: en.app.clearFilters, exact: true }).first().click();
  await page.getByRole("button", { name: en.app.myReports, exact: true }).click();
  await expect(page).toHaveURL(/scope=mine/);
  await expect(page.locator(".issue-card")).toHaveCount(0);
  await page.getByRole("button", { name: en.app.all, exact: true }).click();
  await expect(page).not.toHaveURL(/scope=mine/);
  await expect(page.locator(".issue-card").first()).toBeVisible();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(initial);
});
