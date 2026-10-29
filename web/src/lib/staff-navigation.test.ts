import { describe, expect, it } from "vitest";
import { safeStaffDestination } from "./staff-navigation";
describe("staff login destinations", () => {
  it("preserves local staff routes and useful filters", () => {
    for (const route of [
      "/staff",
      "/staff/settings",
      "/staff/resolved?q=monitor",
      "/staff/requests?sort=confirmed",
      "/staff/requests/a1a1a1a1-1234-4567-8901-b2b2b2b2b2b2",
    ])
      expect(safeStaffDestination(route)).toBe(route);
  });
  it("rejects external redirects, login loops and unrecognized paths", () => {
    for (const route of [
      null,
      "//evil.invalid",
      "https://evil.invalid",
      "/staff/login",
      "/staff/../reports",
      "/reports",
      "/staff\\evil",
      "/staff#hidden",
      "/staff\n",
    ])
      expect(safeStaffDestination(route)).toBe("/staff");
  });
});
