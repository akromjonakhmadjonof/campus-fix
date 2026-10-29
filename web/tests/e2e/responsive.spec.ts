import { expect, test } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { choose } from "./helpers";
import ar from "../../src/messages/ar.json";

test("actual refinement screenshots at five sizes, dark theme and Arabic RTL", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Viewport matrix explicitly covers phones and desktop",
  );
  test.setTimeout(240000);
  await mkdir("../codex/screenshots/refinement", { recursive: true });
  await page.goto("/en");
  await expect(page.locator(".profile-summary h2")).toBeVisible();
  const headers = { "X-CampusFix-Request": "1", Origin: "http://127.0.0.1:3200" };
  const base = "http://127.0.0.1:3200/backend";
  const locations: { id: string; name: string }[] = await (
    await page.request.get(base + "/locations")
  ).json();
  const groups: { id: string; code: string; types: { id: string; labelEn: string }[] }[] = await (
    await page.request.get(base + "/issue-groups")
  ).json();
  const location = locations.find((row) => row.name === "Room S008 — Multimedia Learning Space");
  const type = groups
    .find((row) => row.code === "plumbing")
    ?.types.find((row) => row.labelEn === "Water Fountain");
  let detail = "";
  for (const title of [
    "Water fountain needs attention",
    "Dripping faucet by the window",
    "Drain needs inspection",
  ]) {
    const media = await page.request.post(base + "/media", {
      headers,
      multipart: {
        photo: {
          name: "fountain.png",
          mimeType: "image/png",
          buffer: await readFile("../backend/seed-assets/fountain.png"),
        },
      },
    });
    expect(media.status()).toBe(200);
    const report = await page.request.post(base + "/reports", {
      headers,
      data: {
        title,
        description:
          "Water collects beneath the fountain. Please inspect the fixture when possible.",
        exactLocation: "Fountain beside the classroom entrance",
        locationId: location?.id,
        issueTypeId: type?.id,
        issueGroupId: groups.find((row) => row.code === "plumbing")?.id,
        category: "PLUMBING",
        attachmentIds: [(await media.json()).id],
        idempotencyKey: randomUUID(),
        duplicateAcknowledged: true,
      },
    });
    expect(report.status()).toBe(201);
    detail = (await report.json()).id;
  }
  for (const [width, height] of [
    [375, 812],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [locale, route, name, theme] of [
      ["en", "", "account", "light"],
      ["en", "reports?scope=mine", "reports", "light"],
      ["en", "reports/new", "create", "light"],
      ["en", "reports/" + detail, "detail", "light"],
      ["en", "settings", "settings", "light"],
      ["en", "reports?scope=mine", "reports", "dark"],
      ["ar", "", "account", "light"],
      ["ar", "reports/new", "create", "light"],
      ["ar", "settings", "settings", "dark"],
    ]) {
      await page.goto(`/${locale}/${route}`);
      await page.evaluate((theme) => {
        localStorage.setItem("campusfix.preferences", `${theme}|true`);
        window.dispatchEvent(new Event("campus-preferences"));
      }, theme);
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".page-heading")).toHaveCount(1);
      await expect(page.locator(".page-heading .brand-shield")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `../codex/screenshots/refinement/${locale}-${name}-${theme}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/ar/settings");
  await page.getByRole("button", { name: ar.app.editProfile, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({
    path: "../codex/screenshots/refinement/ar-profile-dialog-375.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: ar.app.language, exact: true }).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.screenshot({
    path: "../codex/screenshots/refinement/ar-language-menu-375.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await choose(page, page.getByLabel(ar.app.language, { exact: true }), "Русский");
  await expect(page).toHaveURL(/\/ru\/settings/);
  await page.screenshot({
    path: "../codex/screenshots/refinement/ru-settings-375.png",
    fullPage: true,
  });
});
