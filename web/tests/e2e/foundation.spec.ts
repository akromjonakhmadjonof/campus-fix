import { choose } from "./helpers";
import { expect, test } from "@playwright/test";
test("explicit pairing requires source approval and shares ownership", async ({
  page,
  browser,
}) => {
  await page.goto("/en");
  await expect(page.locator(".profile-summary h2")).toHaveText("Guest Reporter");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("Display name", { exact: true }).fill("Linked Reporter");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.goto("/en/settings");
  await page.getByRole("button", { name: "Link browser and app", exact: true }).click();
  await page.getByRole("button", { name: "Get pairing code", exact: true }).click();
  const code = await page.locator(".pairing-code strong").innerText();
  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await other.goto("http://127.0.0.1:3200/en/settings");
    await other.getByRole("button", { name: "Link browser and app", exact: true }).click();
    const before = await other.locator(".profile-summary h2").innerText();
    await other.locator("#pair-code").fill(code);
    await other.getByRole("button", { name: "Link existing profile", exact: true }).click();
    await expect(other.getByText("Waiting for confirmation", { exact: true })).toBeVisible();
    expect(await other.locator(".profile-summary h2").innerText()).toBe(before);
    await page.getByRole("button", { name: "Approve link", exact: true }).click();
    await expect(other.getByText("Profiles linked", { exact: false })).toBeVisible();
    await other.reload();
    expect(await other.locator(".profile-summary h2").innerText()).toBe(
      await page.locator(".profile-summary h2").innerText(),
    );
  } finally {
    await context.close();
  }
});
test("Spanish settings, theme and validation", async ({ page }) => {
  await page.goto("/en/settings");
  await choose(page, page.getByLabel("Language", { exact: true }), "Español");
  await expect(page).toHaveURL(/\/es\/settings/);
  await choose(page, page.getByLabel("Apariencia", { exact: true }), "Oscuro");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.goto("/es/reports");
  await expect(page.getByRole("heading", { name: "Reportes", exact: true })).toBeVisible();
  await page.goto("/es/reports/new");
  await page.locator('button[type="submit"]').click();
  await expect(page.locator(".field-error").filter({ hasText: /.+/ }).first()).toBeVisible();
  await page.goto("/es/staff/login");
  await expect(page.locator("#staff-username")).toBeVisible();
});
