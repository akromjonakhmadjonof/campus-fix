import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { parseEnvironment } from "./config/env.js";
describe("API infrastructure", () => {
  it("serves process health without a database", async () => {
    const app = buildApp(parseEnvironment({ NODE_ENV: "test" }));
    try {
      const response = await app.inject({ method: "GET", url: "/api/health" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: "ok" });
    } finally {
      await app.close();
    }
  });
  it("starts even with an unreachable, configured database", async () => {
    const app = buildApp(
      parseEnvironment({ NODE_ENV: "test", DATABASE_URL: "postgresql://localhost:1/not_used" }),
    );
    try {
      expect((await app.inject({ method: "GET", url: "/api/health" })).statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
  it("rejects invalid ports and database schemes", () => {
    expect(() => parseEnvironment({ PORT: "invalid" })).toThrow();
    expect(() => parseEnvironment({ DATABASE_URL: "https://example.com" })).toThrow();
  });
});
