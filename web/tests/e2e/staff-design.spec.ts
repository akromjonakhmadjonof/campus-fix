/* Geometry is checked before using the returned coordinates. */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { choose, withLoginRateLimit } from "./helpers";
import en from "../../src/messages/en.json";
import es from "../../src/messages/es.json";
import ar from "../../src/messages/ar.json";
import ru from "../../src/messages/ru.json";
import uz from "../../src/messages/uz.json";
const base = "http://127.0.0.1:3200/backend";
const headers = { "X-CampusFix-Request": "1", Origin: "http://127.0.0.1:3200" };
const credentials = {
  username: process.env.STAFF_EMAIL ?? "",
  password: process.env.STAFF_PASSWORD ?? "",
};
async function login(page: Page, locale = "en") {
  const messages = { en, es, ar, ru, uz }[locale as "en"];
  await page.locator("#staff-username").fill(credentials.username);
  await page.locator("#staff-password").fill(credentials.password);
  const response = await withLoginRateLimit(async () => {
    const pending = page.waitForResponse(
      (response) =>
        response.url().endsWith("/backend/staff/login") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: messages.app.signIn, exact: true }).click();
    return pending;
  });
  expect(response.status()).toBe(200);
}
async function createReport(page: Page) {
  await page.request.post(base + "/anonymous/session", { headers });
  const groups = await (await page.request.get(base + "/issue-groups")).json();
  const group = groups.find((g: { code: string }) => g.code === "plumbing");
  const locations = await (await page.request.get(base + "/locations")).json();
  const media = await page.request.post(base + "/media", {
    headers,
    multipart: {
      photo: {
        name: "fixture.png",
        mimeType: "image/png",
        buffer: await readFile("../backend/seed-assets/fountain.png"),
      },
    },
  });
  expect(media.status()).toBe(200);
  const response = await page.request.post(base + "/reports", {
    headers,
    data: {
      title: "Fictional inspection " + randomUUID(),
      description: "A fictional fountain needs a maintenance inspection beside the entrance.",
      exactLocation: "Fixture by the entrance",
      category: "PLUMBING",
      locationId: locations.find((l: { name: string }) => l.name === "Duck Pond").id,
      issueGroupId: group.id,
      issueTypeId: group.types[0].id,
      attachmentIds: [(await media.json()).id],
      idempotencyKey: randomUUID(),
      duplicateAcknowledged: true,
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

test("staff login, personal workspace, settings and logout preserve reporter identity", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/en");
  await expect(page.locator(".profile-summary h2")).toBeVisible();
  const reporter = await (await page.request.get(base + "/anonymous/me")).json();
  await page.goto("/en/staff/requests?status=REPORTED");
  await expect(page).toHaveURL(/\/staff\/login\?next=/);
  await expect(page.locator(".reports-page")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "CampusFix" })).toHaveCount(0);
  const origin = await page.evaluate(() => performance.timeOrigin);
  await expect(page.locator("#staff-username")).toHaveAttribute("type", "email");
  await expect(page.locator("#staff-password")).toHaveAttribute("autocomplete", "current-password");
  await expect(
    page.getByRole("link").filter({ hasText: /Google|Sign up|Register|Forgot|Guest/i }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: en.app.signIn, exact: true }).click();
  await expect(page.locator("#staff-email-error")).toHaveText(en.app.required);
  await expect(page.locator("#staff-password-error")).toHaveText(en.app.required);
  await page.locator("#staff-username").fill("invalid-email");
  await page.locator("#staff-password").fill("Incorrect demo password");
  await page.getByRole("button", { name: en.app.signIn, exact: true }).click();
  await expect(page.locator("#staff-email-error")).toHaveText(en.app.emailInvalid);
  await page.getByRole("button", { name: en.app.showPassword, exact: true }).click();
  await expect(page.locator("#staff-password")).toHaveAttribute("type", "text");
  await expect(page.locator("#staff-password")).toHaveValue("Incorrect demo password");
  await page.getByRole("button", { name: en.app.hidePassword, exact: true }).click();
  await expect(page.locator("#staff-password")).toHaveAttribute("type", "password");
  await page.locator("#staff-username").fill(credentials.username);
  await page.getByRole("button", { name: en.app.signIn, exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: en.app.loginFailed })).toBeVisible();
  await page.locator("#staff-password").fill(credentials.password);
  let attempts = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/backend/staff/login") && request.method() === "POST") attempts++;
  });
  await page.route(
    "**/backend/staff/login",
    async (route) => {
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({ response });
    },
    { times: 1 },
  );
  await page.locator("form").evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });
  await expect(page.locator(".auth-submit")).toBeDisabled();
  await expect(page).toHaveURL(/\/en\/staff\/requests\?status=REPORTED$/);
  await expect(page.getByRole("heading", { name: en.app.workQueue, exact: true })).toBeVisible();
  expect(attempts).toBe(1);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  const nav = page.getByRole("navigation", { name: "CampusFix" });
  expect(
    await nav
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("aria-label"))),
  ).toEqual([en.app.account, en.app.staffRequests, en.app.dashboard, en.app.settings]);
  await nav.getByRole("link", { name: en.app.account, exact: true }).click();
  const staff = await (await page.request.get(base + "/staff/me")).json();
  await expect(page.locator(".profile-summary h2")).toHaveText(staff.displayName);
  await expect(page.locator(".profile-summary")).not.toContainText(en.app.guest);
  await expect(page.locator(".staff-metric strong").first()).toHaveText(String(staff.resolved));
  await expect(page.locator(".staff-metric strong").nth(1)).toHaveText(String(staff.open));
  await expect(page.locator(".account-recent .recent-row")).toHaveCount(staff.recent.length);
  if (staff.recent.length)
    await expect(page.locator(".account-recent time").first()).toHaveAttribute(
      "datetime",
      staff.recent[0].resolvedAt,
    );
  await page.locator(".staff-metric").first().click();
  await expect(page.getByRole("heading", { name: en.app.myWork, exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: en.app.account, exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await nav.getByRole("link", { name: en.app.settings, exact: true }).click();
  await expect(page.locator(".profile-summary")).toContainText(staff.email);
  await choose(
    page,
    page.getByRole("combobox", { name: en.app.appearance, exact: true }),
    en.app.dark,
  );
  await choose(page, page.getByRole("combobox", { name: en.app.language, exact: true }), "العربية");
  await expect(page).toHaveURL(/\/ar\/staff\/settings$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveClass(/dark/);
  const logoutOrigin = await page.evaluate(() => performance.timeOrigin);
  const preferences = await page.evaluate(() => localStorage.getItem("campusfix.preferences"));
  await page.getByRole("button", { name: ar.app.signOut, exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/staff\/login(?:\?|$)/);
  await expect(page.locator("#staff-username")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "CampusFix" })).toHaveCount(0);
  expect((await page.request.get(base + "/staff/me")).status()).toBe(401);
  expect((await (await page.request.get(base + "/anonymous/me")).json()).alias).toBe(
    reporter.alias,
  );
  expect(await page.evaluate(() => localStorage.getItem("campusfix.preferences"))).toBe(
    preferences,
  );
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(logoutOrigin);
  await page.goBack();
  await expect(page.locator(".staff-account,.reports-page,.staff-sign-out")).toHaveCount(0);
});

test("Arabic rejection requires a reason, records an alternate outcome, and stays out of My Work", async ({
  page,
}, info) => {
  await page.goto("/en");
  const report = await createReport(page);
  await page.goto("/ar/staff/requests/" + report.id);
  await expect(page).toHaveURL(/\/ar\/staff\/login/);
  await login(page, "ar");
  await expect(page.getByRole("heading", { name: report.title, exact: true })).toBeVisible();
  const before = await (await page.request.get(base + "/staff/me")).json();
  const origin = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole("button", { name: ar.app.reject, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: ar.app.rejectConfirmTitle });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: ar.app.rejectConfirmAction, exact: true }),
  ).toBeDisabled();
  await dialog.locator("#reject-note").fill("Fictional report duplicates already scheduled work.");
  await mkdir("../codex/screenshots/update05", { recursive: true });
  await page.screenshot({
    path: `../codex/screenshots/update05/ar-rejection-dialog-${info.project.name}.png`,
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: ar.app.cancel, exact: true }).click();
  expect(
    (await (await page.request.get(base + "/staff/requests/" + report.id)).json()).status,
  ).toBe("REPORTED");
  await page.getByRole("button", { name: ar.app.reject, exact: true }).click();
  await dialog.getByRole("button", { name: ar.app.rejectConfirmAction, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".detail-heading .status-badge")).toHaveText(ar.app.statuses.REJECTED);
  await expect(page.locator(".rejected-banner time")).toBeVisible();
  await expect(page.locator("progress")).toHaveCount(0);
  await expect(page.locator(".timeline-card li.complete")).toHaveCount(1);
  await expect(page.locator(".staff-action")).toHaveCount(0);
  expect((await (await page.request.get(base + "/staff/me")).json()).resolved).toBe(
    before.resolved,
  );
  const final = await (await page.request.get(base + "/staff/requests/" + report.id)).json();
  expect(final.resolvedAt).toBeNull();
  expect(final.history.at(-1).status).toBe("REJECTED");
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
});

test("staff visual audit: five sizes, five languages, shared headers and dark RTL", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Contains its own five-viewport matrix");
  test.setTimeout(240000);
  await mkdir("../codex/screenshots/update05", { recursive: true });
  for (const [locale, messages] of Object.entries({ en, es, ar, ru, uz })) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${locale}/staff/login`);
    await expect(page.locator(".staff-auth-form h1")).toHaveText(messages.app.staffLoginWelcome);
    await page.getByRole("button", { name: messages.app.signIn, exact: true }).click();
    await expect(page.locator("#staff-email-error")).toHaveText(messages.app.required);
    await expect(page.locator("#staff-password-error")).toHaveText(messages.app.required);
    await page.screenshot({
      path: `../codex/screenshots/update05/${locale}-login-validation-390.png`,
      animations: "disabled",
    });
  }
  for (const [width, height] of [
    [375, 812],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [locale, theme] of [
      ["en", "light"],
      ["ar", "dark"],
    ]) {
      await page.goto(`/${locale}/staff/login`);
      await page.evaluate((theme) => {
        localStorage.setItem("campusfix.preferences", `${theme}|true`);
        window.dispatchEvent(new Event("campus-preferences"));
      }, theme);
      await expect(page.locator("#staff-username")).toBeVisible();
      await expect(page.getByRole("navigation", { name: "CampusFix" })).toHaveCount(0);
      await expect(page.locator(".staff-auth-brand"))[
        width >= 1024 ? "toBeVisible" : "toBeHidden"
      ]();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `../codex/screenshots/update05/${locale}-login-${theme}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
  }
  const signedIn = await page.request.post(base + "/staff/login", { headers, data: credentials });
  expect(signedIn.status()).toBe(200);
  const queue = await (await page.request.get(base + "/staff/requests?sort=confirmed")).json();
  const detail = queue.data.find((r: { status: string }) => r.status === "REPORTED").id;
  await page.goto("/en");
  const studentFont = await page
    .locator(".page-heading h1")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  for (const [width, height] of [
    [375, 812],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [locale, route, name, theme] of [
      ["en", "staff", "account", "light"],
      ["en", "staff/requests", "requests", "light"],
      ["en", "staff/requests/" + detail, "details", "light"],
      ["en", "staff/resolved", "my-work", "light"],
      ["en", "staff/settings", "settings", "light"],
      ["ar", "staff", "account", "dark"],
      ["ar", "staff/requests/" + detail, "details", "dark"],
      ["ar", "staff/settings", "settings", "dark"],
    ]) {
      await page.goto(`/${locale}/${route}`);
      await page.evaluate((theme) => {
        localStorage.setItem("campusfix.preferences", `${theme}|true`);
        window.dispatchEvent(new Event("campus-preferences"));
      }, theme);
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".page-heading .brand-shield")).toHaveCount(1);
      await expect(page.locator(".staff-welcome")).toHaveCount(0);
      const nav = page.getByRole("navigation", { name: "CampusFix" });
      await expect(nav.getByRole("link")).toHaveCount(4);
      await expect(nav.locator("small")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (locale === "en")
        expect(
          await page.locator(".page-heading h1").evaluate((el) => getComputedStyle(el).fontFamily),
        ).toBe(studentFont);
      await page.screenshot({
        path: `../codex/screenshots/update05/${locale}-${name}-${theme}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
      if (name === "settings") {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const logout = await page.locator(".staff-sign-out").boundingBox();
        const bar = await nav.boundingBox();
        expect(logout!.y + logout!.height).toBeLessThanOrEqual(bar!.y);
      }
    }
  }
  await page.route("**/backend/staff/me", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ response, json: { ...data, resolved: 0, recent: [] } });
  });
  await page.goto("/en/staff");
  await expect(
    page.getByRole("heading", { name: en.app.resolvedEmptyTitle, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".recent-row")).toHaveCount(0);
  await page.screenshot({
    path: "../codex/screenshots/update05/en-staff-empty-state.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.unrouteAll({ behavior: "wait" });
});
