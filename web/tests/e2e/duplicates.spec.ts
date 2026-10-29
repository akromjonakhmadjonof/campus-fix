import { choose } from "./helpers";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

test("duplicate confirmation does not create a second report", async ({ page, browser }) => {
  const fixture = await browser.newContext();
  try {
    const base = "http://127.0.0.1:3200/backend";
    const headers = { "X-CampusFix-Request": "1", Origin: "http://127.0.0.1:3200" };
    await fixture.request.post(base + "/anonymous/session", { headers });
    const locations: { id: string; name: string; path: string }[] = await (
      await fixture.request.get(base + "/locations")
    ).json();
    const groups: { id: string; code: string; types: { id: string; labelEn: string }[] }[] = await (
      await fixture.request.get(base + "/issue-groups")
    ).json();
    const location = locations.find((row) => row.name === "Room S008 — Multimedia Learning Space");
    const type = groups
      .find((row) => row.code === "plumbing")
      ?.types.find((row) => row.labelEn === "Water Fountain");
    expect(location).toBeDefined();
    expect(type).toBeDefined();
    const title = "Fictional duplicate " + randomUUID();
    const description = "This fictional fountain has a small leak beside the window.";
    const exactLocation = "Second fountain by the east window";
    const media = await fixture.request.post(base + "/media", {
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
    const response = await fixture.request.post(base + "/reports", {
      headers,
      data: {
        title,
        description,
        exactLocation,
        locationId: location?.id,
        issueTypeId: type?.id,
        issueGroupId: groups.find((row) => row.code === "plumbing")?.id,
        category: "PLUMBING",
        attachmentIds: [(await media.json()).id],
        idempotencyKey: randomUUID(),
        duplicateAcknowledged: true,
      },
    });
    expect(response.status()).toBe(201);
    const report = await response.json();
    const before = await (await fixture.request.get(base + "/reports")).json();
    await page.goto("/en/reports/new");
    await page.locator("#report-title").fill(title);
    await page.locator("#report-description").fill(description);
    await choose(page, page.locator("#report-group"), "Plumbing");
    await choose(page, page.locator("#report-type"), "Water Fountain");
    await choose(
      page,
      page.locator(".location-picker [role=combobox]").nth(0),
      "Sutherland Building",
    );
    await choose(page, page.locator(".location-picker [role=combobox]").nth(1), "Ground Floor");
    await choose(
      page,
      page.locator(".location-picker [role=combobox]").nth(2),
      "Room S008 — Multimedia Learning Space",
    );
    await page.locator("#report-exact").fill(exactLocation);
    await expect(
      page.locator(".duplicate-panel").getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    // Preliminary matching happens while no image has been selected.
    await expect(page.locator(".photo-gallery img")).toHaveCount(0);
    await page
      .locator("#report-photo")
      .setInputFiles(resolve("../backend/seed-assets/fountain.png"));
    await expect(page.locator(".photo-gallery img")).toHaveCount(1);
    await page.getByRole("button", { name: "Review similar issues", exact: true }).click();
    const card = page
      .locator(".review-grid article")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await card.getByRole("button", { name: "I see it too", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await (await fixture.request.get(base + "/reports/" + report.id)).json())
            .confirmationCount,
      )
      .toBe(1);
    const after = await (await fixture.request.get(base + "/reports")).json();
    expect(after.total).toBe(before.total);
    const mine = await (await page.request.get(base + "/reports?scope=mine")).json();
    expect(mine.total).toBe(0);
    await expect(page).toHaveURL(/\/en\/reports\/new$/);
    await expect(page.locator(".button.primary.full")).toBeEnabled();
  } finally {
    await fixture.close();
  }
});
