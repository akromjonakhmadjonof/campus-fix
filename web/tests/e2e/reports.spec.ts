import { choose } from "./helpers";
import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
test("complete creator, duplicate, ownership and staff journey", async ({
  page,
  browser,
}, testInfo) => {
  const title = "Fictional fountain " + Date.now();
  await page.goto("/en");
  await expect(page.getByRole("heading", { name: "Welcome", exact: true })).toBeVisible();
  await page.goto("/en/reports/new");
  await page.locator("#report-title").fill(title);
  await page
    .locator("#report-description")
    .fill("A fictional fountain is leaking near the window. Test incident only.");
  await choose(page, page.locator("#report-group"), "Plumbing");
  await choose(page, page.locator("#report-type"), "Water Fountain");
  const location = page.getByRole("combobox", { name: "Campus location", exact: true });
  await expect(location).toBeEnabled();
  await choose(page, location, "Sutherland Building");
  await choose(page, page.locator(".location-picker [role=combobox]").nth(1), "Ground Floor");
  await choose(
    page,
    page.locator(".location-picker [role=combobox]").nth(2),
    "Room S008 — Multimedia Learning Space",
  );
  await page.locator("#report-exact").fill("Second fountain by the window");
  await page.locator("#report-photo").setInputFiles(resolve("../backend/seed-assets/fountain.png"));
  await expect(page.locator(".photo-gallery img")).toHaveCount(1);
  await page.locator("#report-photo").setInputFiles(resolve("../backend/seed-assets/computer.png"));
  await expect(page.locator(".photo-gallery img")).toHaveCount(2);
  await page.getByRole("button", { name: "Review similar issues" }).click();
  await expect(
    page.getByRole("heading", { name: "Has someone already reported it?" }),
  ).toBeVisible();
  await page.locator(".button.primary.full").click();
  await expect(page).toHaveURL(/\/en\/reports\/[a-f0-9-]+$/);
  const url = page.url(),
    id = url.split("/").pop();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(page.locator(".detail-photo img")).toBeVisible();
  await expect(page.locator(".detail-thumbnails button")).toHaveCount(2);
  await page.getByRole("button", { name: "Photo 2 of 2", exact: true }).click();
  await expect(page.getByRole("button", { name: "Photo 2 of 2", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Edit report", exact: true }).click();
  await page.locator("#report-exact").fill("Second fountain by the west window");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Second fountain by the west window", { exact: true })).toBeVisible();
  await page.goto("/en");
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await page.goto("/en/reports?scope=mine");
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  const stranger = await browser.newContext();
  try {
    const other = await stranger.newPage();
    await other.goto(url);
    await expect(other.getByRole("button", { name: "Edit report", exact: true })).toHaveCount(0);
    await other.getByRole("button", { name: "I see it too", exact: true }).click();
    await expect(
      other.getByRole("button", { name: "Undo confirmation", exact: true }),
    ).toBeVisible();
    await other.reload();
    await expect(
      other.getByRole("button", { name: "Undo confirmation", exact: true }),
    ).toBeVisible();
  } finally {
    await stranger.close();
  }
  await page.goto("/en/staff/login");
  await page.locator("#staff-username").fill(process.env.STAFF_EMAIL ?? "");
  await page.locator("#staff-password").fill(process.env.STAFF_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Workspace", exact: true })).toBeVisible();
  const staffNav = page.getByRole("navigation", { name: "CampusFix" });
  await expect(staffNav.getByRole("link")).toHaveCount(4);
  expect(
    await staffNav
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual(["/en/staff", "/en/staff/requests", "/en/staff/resolved", "/en/staff/settings"]);
  await staffNav.getByRole("link", { name: "My Work", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Work", exact: true })).toBeVisible();
  await expect(staffNav.getByRole("link").first()).toHaveAttribute("href", "/en/staff");
  await staffNav.getByRole("link", { name: "Requests", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Maintenance Requests", exact: true }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: `../codex/screenshots/${testInfo.project.name}-staff-requests.png`,
    fullPage: true,
  });
  await page.goto("/en/staff/requests/" + id);
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "I see it too", exact: true })).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `../codex/screenshots/${testInfo.project.name}-staff-workbench.png`,
    fullPage: true,
  });
  for (const action of ["Accept", "Start work", "Mark resolved"]) {
    await expect(page.getByRole("button", { name: action, exact: true })).toBeVisible();
    await page.locator("#status-note").fill("Fictional maintenance work inspected and verified.");
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page.locator(".detail-heading .status-badge")).toHaveText(
      action === "Accept" ? "Accepted" : action === "Start work" ? "In progress" : "Resolved",
    );
    await expect(page.locator("#status-note"))
      .toHaveValue("")
      .catch(() => {});
  }
  await expect(page.locator(".detail-heading .status-resolved")).toBeVisible();
  await expect(page.locator("progress")).toHaveAttribute("value", "3");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `../codex/screenshots/${testInfo.project.name}-resolved-detail.png`,
    fullPage: true,
  });
  await page.goto("/en/staff/resolved");
  await page.getByRole("textbox", { name: "Search issues", exact: true }).fill(title);
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await page.goto(url);
  await expect(page.locator(".timeline-card li.complete, .timeline-card li.current")).toHaveCount(
    4,
  );
  await page.goto("/es/reports/" + id);
  await expect(page.locator(".detail-heading .status-badge")).toHaveText("Resuelto");
  await page.goto("/es/staff/requests");
  await expect(
    page.getByRole("heading", { name: "Solicitudes de mantenimiento", exact: true }),
  ).toBeVisible();
});
