import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:3200",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: [
    {
      command: "pnpm --filter @campus-fix/api start",
      cwd: "..",
      url: "http://127.0.0.1:4000/api/health",
      reuseExistingServer: false,
      timeout: 30_000,
      env: { NODE_ENV: "test", PORT: "4000" },
    },
    {
      command: "pnpm exec next start --hostname 127.0.0.1 --port 3200",
      url: "http://127.0.0.1:3200/en",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
