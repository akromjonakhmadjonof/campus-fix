import { describe, expect, it } from "vitest";
import { readReportFilters, reportReturnPath } from "./report-filters";
describe("report filter URLs", () => {
  it("restores meaningful filters and rejects malformed values", () => {
    const id = "a1a1a1a1-1234-4567-8901-b2b2b2b2b2b2";
    const state = readReportFilters(
      new URLSearchParams({
        q: "monitor",
        scope: "mine",
        group: id,
        type: id,
        locationId: id,
        category: "IT",
        status: "IN_PROGRESS",
        sort: "confirmed",
        page: "3",
      }),
    );
    expect(state).toEqual({
      q: "monitor",
      scope: "mine",
      group: id,
      type: id,
      locationId: id,
      category: "IT",
      status: "IN_PROGRESS",
      sort: "confirmed",
      page: 3,
    });
    const invalid = readReportFilters(
      new URLSearchParams(
        "page=-2&category=bad&group=x&type=x&locationId=x&sort=bad&status=bad&scope=bad",
      ),
      "confirmed",
    );
    expect(invalid).toEqual({
      q: "",
      scope: "all",
      group: "",
      type: "",
      locationId: "",
      category: "",
      status: "",
      sort: "confirmed",
      page: 1,
    });
  });
  it("only returns to local report lists", () => {
    expect(reportReturnPath("/reports?status=ACCEPTED&q=monitor")).toBe(
      "/reports?status=ACCEPTED&q=monitor",
    );
    expect(reportReturnPath("/staff/resolved?sort=newest", true)).toBe(
      "/staff/resolved?sort=newest",
    );
    for (const value of [
      null,
      "https://example.com",
      "//example.com",
      "/reports/new",
      "/reports#outside",
      "/reports\n",
    ])
      expect(reportReturnPath(value)).toBe("/reports");
  });
});
