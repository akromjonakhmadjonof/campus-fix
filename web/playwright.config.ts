import { defineConfig, devices } from "@playwright/test";
const chromiumChannel = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3200",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...chromiumChannel } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", ...chromiumChannel },
    },
    ...(process.env.PW_WEBKIT === "1"
      ? [
          {
            name: "webkit",
            use: { ...devices["iPhone 13"], browserName: "webkit" as const },
          },
        ]
      : []),
  ],
  webServer: [
    {
      command: "pnpm --filter @campus-fix/api start",
      cwd: "..",
      url: "http://127.0.0.1:4000/api/health",
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        NODE_ENV: "test",
        HOST: "127.0.0.1",
        PORT: "4000",
        CORS_ORIGINS: "http://127.0.0.1:3200,http://localhost:3000",
      },
    },
    {
      command: "pnpm exec next start --hostname 127.0.0.1 --port 3200",
      url: "http://127.0.0.1:3200/en",
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
