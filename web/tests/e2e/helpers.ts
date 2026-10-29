import { test, type Locator, type Page } from "@playwright/test";
export async function choose(page: Page, trigger: Locator, label: string) {
  await trigger.click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

// The expanded suite shares the local demo worker. Respect the real login throttle
// instead of disabling production protection or treating HTTP 429 as an app failure.
export async function withLoginRateLimit<
  T extends { status(): number; headers(): Record<string, string> },
>(send: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await send();
    if (response.status() !== 429 || attempt === 2) return response;
    const seconds = Number(response.headers()["retry-after"]);
    const delay = (Number.isFinite(seconds) && seconds > 0 ? seconds : 60) * 1000 + 100;
    test.setTimeout(test.info().timeout + delay);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
