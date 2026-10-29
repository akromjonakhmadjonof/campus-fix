import { type Locator, type Page } from "@playwright/test";
export async function choose(page: Page, trigger: Locator, label: string) {
  await trigger.click();
  await page.getByRole("option", { name: label, exact: true }).click();
}
