import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { choose } from "./helpers";
import en from "../../src/messages/en.json";
import es from "../../src/messages/es.json";
import ar from "../../src/messages/ar.json";
import ru from "../../src/messages/ru.json";
import uz from "../../src/messages/uz.json";

test("profile name and avatar save, cancel, validation, reload and keyboard focus", async ({
  page,
}) => {
  await page.goto("/en");
  const edit = page.getByRole("button", { name: "Edit profile", exact: true });
  await expect(page.locator(".profile-summary h2")).toHaveText("Guest Reporter");
  await edit.click();
  await page.getByLabel("Display name", { exact: true }).fill("Cancelled name");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(edit).toBeFocused();
  await expect(page.locator(".profile-summary h2")).toHaveText("Guest Reporter");
  await edit.click();
  await page.getByLabel("Display name", { exact: true }).fill(" ");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator("#profile-name")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Choose avatar", { exact: true }).setInputFiles({
    name: "script.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(page.getByText(en.app.avatarError, { exact: true })).toBeVisible();
  await page.getByLabel("Display name", { exact: true }).fill("Campus Neighbor");
  await page
    .getByLabel("Choose avatar", { exact: true })
    .setInputFiles(resolve("../backend/seed-assets/computer.png"));
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".profile-summary h2")).toHaveText("Campus Neighbor");
  await expect(page.locator(".profile-summary img")).toBeVisible();
  await page.goto("/en/settings");
  await expect(page.locator(".profile-summary h2")).toHaveText("Campus Neighbor");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByRole("button", { name: "Remove avatar", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".profile-summary img")).toHaveCount(0);
});

test("all five locales preserve routes, render translated forms, and respect RTL and keyboard controls", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [locale, messages] of Object.entries({ en, es, ar, ru, uz })) {
    await page.goto(`/${locale}/settings?source=account#language`);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await expect(page.locator(".page-heading h1")).toHaveText(messages.app.settings);
    const language = page.getByRole("combobox", { name: messages.app.language, exact: true });
    await language.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(5);
    await page.keyboard.press("Escape");
    await expect(language).toBeFocused();
    await page.goto(`/${locale}/reports/new`);
    await expect(page.locator(".page-heading h1")).toHaveText(messages.app.newReport);
    await choose(page, page.locator("#report-group"), messages.app.taxonomy.plumbing);
    await expect(page.locator("#report-type")).toBeEnabled();
    await choose(page, page.locator("#report-type"), messages.app.taxonomy.plumbing_water_fountain);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(messages.app.titleInvalid, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto("/en/settings?source=account#language");
  await choose(page, page.getByLabel("Language", { exact: true }), "العربية");
  await expect(page).toHaveURL(/\/ar\/settings\?source=account#language$/);
  await choose(page, page.getByLabel(ar.app.appearance, { exact: true }), ar.app.dark);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(errors).toEqual([]);
});
