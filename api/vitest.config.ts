import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    // Integration suites share a database; keep independent fixture cohorts stable.
    fileParallelism: process.env.RUN_DB_TESTS !== "1",
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
