import { expect, test, type Browser, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { choose, withLoginRateLimit } from "./helpers";
import en from "../../src/messages/en.json";
import es from "../../src/messages/es.json";
import ar from "../../src/messages/ar.json";
import ru from "../../src/messages/ru.json";
import uz from "../../src/messages/uz.json";
const origin = "http://127.0.0.1:3200",
  base = origin + "/backend";
const headers = { "X-CampusFix-Request": "1", Origin: origin };
async function report(page: Page) {
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
      title: "Fictional notification " + randomUUID(),
      description: "A fictional water fountain needs inspection beside the door.",
      exactLocation: "Test fountain beside the door",
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
async function staff(page: Page) {
  const response = await withLoginRateLimit(() =>
    page.request.post(base + "/staff/login", {
      headers,
      data: { username: process.env.STAFF_EMAIL, password: process.env.STAFF_PASSWORD },
    }),
  );
  expect(response.status()).toBe(200);
  return (await page.request.get(base + "/staff/me")).json();
}
async function upvote(browser: Browser, id: string) {
  const context = await browser.newContext(),
    page = await context.newPage();
  await page.request.post(base + "/anonymous/session", { headers });
  const profile = await page.request.patch(base + "/anonymous/me", {
    headers,
    data: { displayName: "Alex Fixture", avatarMediaId: null },
  });
  expect(profile.status()).toBe(200);
  const votes = await Promise.all(
    [1, 2].map(() => page.request.post(base + "/reports/" + id + "/vote", { headers, data: {} })),
  );
  expect(votes.map((r) => r.status())).toEqual([200, 200]);
  expect((await (await page.request.get(base + "/notifications")).json()).data).toEqual([]);
  await context.close();
}

test("reporter inbox persists real events, polls, protects identity and keeps actor names plain", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await page.clock.install();
  const created = await report(page);
  await page.goto("/en");
  await expect(page.locator(".notification-empty")).toBeVisible();
  const initialOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.waitForLoadState("networkidle");
  let pollingRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/backend/notifications")) pollingRequests++;
  });
  await page.evaluate(() => {
    window.ReactNativeWebView = { postMessage: () => undefined };
    window.dispatchEvent(new CustomEvent("campus-visibility", { detail: { active: false } }));
  });
  await upvote(browser, created.id);
  await page.clock.fastForward(65000);
  expect(pollingRequests).toBe(0);
  await expect(page.locator(".notification-empty")).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("campus-visibility", { detail: { active: true } })),
  );
  await page.clock.fastForward(31000);
  await expect(page.locator(".notification-actor")).toHaveText("Alex Fixture");
  await expect(page.locator(".nav-unread-badge")).toHaveText("1");
  await expect(page.locator(".notification-actor a")).toHaveCount(0);
  await page.locator(".notification-actor").click();
  await expect(page).toHaveURL(/\/en$/);
  await page.locator(".notification-report").click();
  await expect(page).toHaveURL(new RegExp("/reports/" + created.id));
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(initialOrigin);
  await expect
    .poll(
      async () => (await (await page.request.get(base + "/notifications")).json()).data[0].readAt,
    )
    .toBeTruthy();
  const workerContext = await browser.newContext(),
    worker = await workerContext.newPage();
  const identity = await staff(worker);
  let version = 1;
  for (const status of ["ACCEPTED", "IN_PROGRESS", "RESOLVED"]) {
    expect(
      (
        await worker.request.post(base + "/staff/requests/" + created.id + "/status", {
          headers,
          data: { status, version, note: "Fictional repair verified" },
        })
      ).status(),
    ).toBe(200);
    version++;
  }
  await page.goto("/en/notifications");
  await page.clock.fastForward(31000);
  await expect(page.locator(".notification-row")).toHaveCount(4);
  await expect(page.locator(".notification-actor").first()).toHaveText(identity.displayName);
  await expect(page.locator(".notification-row").first()).toContainText(
    en.app.notificationActions.RESOLVED,
  );
  const inboxOrigin = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole("button", { name: en.app.markAllRead, exact: true }).click();
  await expect(page.locator(".is-unread")).toHaveCount(0);
  expect((await (await page.request.get(base + "/notifications/unread-count")).json()).count).toBe(
    0,
  );
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(inboxOrigin);
  await page.reload();
  await expect(page.locator(".notification-row.is-read")).toHaveCount(4);
  await page.goto("/ar/notifications");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".notification-row").first()).toContainText(
    ar.app.notificationActions.RESOLVED,
  );
  await expect(page.locator(".notification-actor").first()).toHaveText(identity.displayName);
  await workerContext.close();
});

test("staff dashboard uses database metrics, filters without reloads and refreshes stale actions", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await page.goto("/en/staff/dashboard");
  await expect(page).toHaveURL(/\/staff\/login/);
  await expect(page.locator(".analytics-page")).toHaveCount(0);
  await staff(page);
  await page.goto("/en/staff/dashboard");
  const data = await (await page.request.get(base + "/staff/analytics?days=30")).json();
  await expect(page.locator('[data-metric="currentOpen"] strong')).toHaveText(
    new Intl.NumberFormat("en").format(data.currentOpen),
  );
  await expect(page.locator('[data-metric="resolvedRequests"] strong')).toHaveText(
    new Intl.NumberFormat("en").format(data.resolved),
  );
  await expect(page.locator('[data-metric="totalUpvotes"] strong')).toHaveText(
    new Intl.NumberFormat("en").format(data.totalUpvotes),
  );
  await expect(page.locator('[data-slot="chart"]')).toHaveCount(3);
  const navigation = page.getByRole("navigation", { name: "CampusFix" });
  await expect(navigation.getByRole("link")).toHaveCount(4);
  await expect(
    navigation.getByRole("link", { name: en.app.dashboard, exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const initialOrigin = await page.evaluate(() => performance.timeOrigin);
  await choose(
    page,
    page.getByRole("combobox", { name: en.app.reportingPeriod, exact: true }),
    "Last 7 days",
  );
  await expect(page).toHaveURL(/days=7$/);
  await expect(page.locator(".trend-chart .recharts-line")).toHaveCount(2);
  await choose(
    page,
    page.getByRole("combobox", { name: en.app.reportingPeriod, exact: true }),
    "Last 90 days",
  );
  await expect(page).toHaveURL(/days=90$/);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(initialOrigin);
  await page.locator(".trend-card summary").click();
  await expect(page.locator(".trend-card tbody tr")).toHaveCount(90);
  await navigation.getByRole("link", { name: en.app.account, exact: true }).click();
  await page.locator(".account-recent .section-heading a").click();
  await expect(page).toHaveURL(/\/staff\/resolved$/);
  await expect(page.getByRole("heading", { name: en.app.myWork, exact: true })).toBeVisible();
  const ownerContext = await browser.newContext(),
    owner = await ownerContext.newPage(),
    created = await report(owner);
  await page.goto("/en/staff/requests/" + created.id);
  await expect(page.locator("#status-note")).toBeVisible();
  expect(
    (
      await page.request.post(base + "/staff/requests/" + created.id + "/status", {
        headers,
        data: { status: "ACCEPTED", version: 1, note: "Concurrent test change" },
      })
    ).status(),
  ).toBe(200);
  await page.locator("#status-note").fill("Attempt from an older page");
  await page.getByRole("button", { name: en.app.accept, exact: true }).click();
  await expect(page.getByText(en.app.staffConflict, { exact: true })).toBeVisible();
  await expect(page.locator(".detail-heading .status-badge")).toHaveText(en.app.statuses.ACCEPTED);
  await expect(page.locator(".timeline-actor")).toHaveCount(1);
  await ownerContext.close();
});

test("finishing a request today updates API totals, the cached dashboard and another open dashboard", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const created = await report(owner);
  await staff(page);
  const snapshots = await Promise.all(
    [7, 30, 90].map(async (days) =>
      (await page.request.get(base + "/staff/analytics?days=" + days)).json(),
    ),
  );
  await page.goto("/en/staff/dashboard");
  const watcher = await page.context().newPage();
  await watcher.clock.install();
  await watcher.goto("/en/staff/dashboard");
  const resolved = (surface: Page) => surface.locator('[data-metric="resolvedRequests"] strong');
  const number = (value: number) => new Intl.NumberFormat("en").format(value);
  await expect(resolved(page)).toHaveText(number(snapshots[1].resolved));
  await expect(resolved(watcher)).toHaveText(number(snapshots[1].resolved));
  const originBefore = await page.evaluate(() => performance.timeOrigin);
  const watcherOrigin = await watcher.evaluate(() => performance.timeOrigin);
  const nav = page.getByRole("navigation", { name: "CampusFix" });
  await nav.getByRole("link", { name: en.app.staffRequests, exact: true }).click();
  await page.locator(".search-box input").fill(created.title);
  await page.getByText(created.title, { exact: true }).click();
  for (const [action, status] of [
    [en.app.accept, "ACCEPTED"],
    [en.app.startWork, "IN_PROGRESS"],
    [en.app.resolve, "RESOLVED"],
  ] as const) {
    await page
      .locator("#status-note")
      .fill("Fictional repair completed for live analytics verification.");
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page.locator(".detail-heading .status-badge")).toHaveText(en.app.statuses[status]);
  }
  await nav.getByRole("link", { name: en.app.dashboard, exact: true }).click();
  await expect(resolved(page)).toHaveText(number(snapshots[1].resolved + 1));
  await expect(page.locator('[data-metric="currentOpen"] strong')).toHaveText(
    number(snapshots[1].currentOpen - 1),
  );
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(originBefore);
  await watcher.clock.fastForward(31000);
  await expect(resolved(watcher)).toHaveText(number(snapshots[1].resolved + 1));
  expect(await watcher.evaluate(() => performance.timeOrigin)).toBe(watcherOrigin);
  for (const [index, days] of [7, 30, 90].entries()) {
    const response = await page.request.get(base + "/staff/analytics?days=" + days);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const after = await response.json();
    expect(after.resolved).toBe(snapshots[index].resolved + 1);
    expect(after.currentOpen).toBe(snapshots[index].currentOpen - 1);
    expect(after.trends.at(-1).resolutions).toBe(snapshots[index].trends.at(-1).resolutions + 1);
    expect(
      after.trends.reduce((sum: number, day: { resolutions: number }) => sum + day.resolutions, 0),
    ).toBe(after.resolved);
  }
  await watcher.close();
  await ownerContext.close();
});

test("notification and dashboard visual matrix uses real records, themes and five translations", async ({
  page,
  browser,
}, info) => {
  test.skip(info.project.name !== "desktop", "Includes its own mobile/desktop viewport matrix");
  test.setTimeout(240000);
  await mkdir("../codex/screenshots/update06", { recursive: true });
  const created = await report(page);
  await upvote(browser, created.id);
  const workerContext = await browser.newContext(),
    worker = await workerContext.newPage();
  await staff(worker);
  for (const [status, version] of [
    ["ACCEPTED", 1],
    ["IN_PROGRESS", 2],
  ] as const)
    expect(
      (
        await worker.request.post(base + "/staff/requests/" + created.id + "/status", {
          headers,
          data: { status, version, note: "Fictional inspection in progress" },
        })
      ).status(),
    ).toBe(200);
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
    for (const [locale, theme] of [
      ["en", "light"],
      ["ar", "dark"],
    ]) {
      for (const [surface, path, name] of [
        [page, "", "account"],
        [page, "/notifications", "inbox"],
        [worker, "/staff/dashboard", "dashboard"],
      ] as const) {
        await surface.goto(`/${locale}${path}`);
        await surface.evaluate((theme) => {
          localStorage.setItem("campusfix.preferences", `${theme}|true`);
          window.dispatchEvent(new Event("campus-preferences"));
        }, theme);
        await surface.waitForLoadState("networkidle");
        await expect(surface.locator(".page-heading .brand-shield")).toHaveCount(1);
        await expect(
          surface.getByRole("navigation", { name: "CampusFix" }).getByRole("link"),
        ).toHaveCount(4);
        expect(
          await surface.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        ).toBe(true);
        if (name === "dashboard") {
          await expect(surface.locator('[data-slot="chart"]')).toHaveCount(3);
          for (const chart of await surface.locator('[data-slot="chart"]').all()) {
            const rect = await chart.boundingBox();
            expect(rect?.height).toBeGreaterThanOrEqual(200);
            expect(rect?.width).toBeGreaterThan(200);
          }
        }
        await surface.screenshot({
          path: `../codex/screenshots/update06/${locale}-${name}-${theme}-${width}.png`,
          fullPage: true,
          animations: "disabled",
        });
      }
    }
  }
  for (const [locale, messages] of Object.entries({ en, es, ar, ru, uz })) {
    await worker.setViewportSize({ width: 390, height: 844 });
    await worker.goto(`/${locale}/staff/dashboard`);
    await expect(
      worker.getByRole("heading", { name: messages.app.dashboard, exact: true }),
    ).toBeVisible();
    await expect(
      worker.getByRole("combobox", { name: messages.app.reportingPeriod, exact: true }),
    ).toBeVisible();
    await page.goto(`/${locale}/notifications`);
    await expect(page.locator(".notification-row").first()).toContainText(
      messages.app.notificationActions.IN_PROGRESS,
    );
    await worker.screenshot({
      path: `../codex/screenshots/update06/${locale}-dashboard-390.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  expect(errors).toEqual([]);
  await workerContext.close();
});

test("empty notification and analytics states remain usable", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "One explicit mobile empty-state capture");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/notifications");
  await expect(page.getByText(en.app.notificationsEmpty, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: en.app.markAllRead, exact: true })).toBeDisabled();
  await page.screenshot({
    path: "../codex/screenshots/update06/en-inbox-empty-390.png",
    fullPage: true,
  });
  await staff(page);
  // Presentation-only fixture; empty SQL aggregation is tested against PostgreSQL in analytics.test.ts.
  const live = await (await page.request.get(base + "/staff/analytics?days=7")).json();
  await page.route("**/backend/staff/analytics?days=7", async (route) =>
    route.fulfill({
      json: {
        ...live,
        currentOpen: 0,
        resolved: 0,
        totalReports: 0,
        totalUpvotes: 0,
        averageResolutionMs: null,
        averageWaitingMs: null,
        resolutionSamples: 0,
        waitingSamples: 0,
        trends: live.trends.map((day: { date: string }) => ({
          date: day.date,
          reports: 0,
          resolutions: 0,
        })),
        locations: [],
        issues: [],
        hotspots: [],
        attention: [],
      },
    }),
  );
  await page.goto("/en/staff/dashboard?days=7");
  await expect(page.locator('[data-metric="averageResolution"] strong')).toHaveText(
    en.app.durationUnavailable,
  );
  await expect(page.locator('[data-metric="currentOpen"] strong')).toHaveText("0");
  await expect(page.locator(".analytics-chart-pair .chart-empty")).toHaveCount(2);
  await page.screenshot({
    path: "../codex/screenshots/update06/en-dashboard-empty-fixture-390.png",
    fullPage: true,
  });
});
