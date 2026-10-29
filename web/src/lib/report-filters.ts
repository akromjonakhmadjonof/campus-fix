import { categories, type Status } from "./campus-api";
export const filterKeys = [
  "q",
  "scope",
  "category",
  "group",
  "type",
  "locationId",
  "status",
  "sort",
  "page",
] as const;
export type FilterKey = (typeof filterKeys)[number];
const statuses: Status[] = ["REPORTED", "ACCEPTED", "IN_PROGRESS", "RESOLVED", "REJECTED"];
export function readReportFilters(params: Pick<URLSearchParams, "get">, defaultSort = "newest") {
  const value = (key: string) => params.get(key) ?? "";
  const id = (key: string) =>
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value(key))
      ? value(key)
      : "";
  return {
    q: value("q").slice(0, 120),
    scope: value("scope") === "mine" ? "mine" : "all",
    category: categories.find((c) => c === value("category")) ?? "",
    group: id("group"),
    type: id("type"),
    locationId: id("locationId"),
    status: statuses.find((s) => s === value("status")) ?? "",
    sort: ["newest", "oldest", "confirmed", "status"].includes(value("sort"))
      ? value("sort")
      : defaultSort,
    page: /^[1-9]\d{0,5}$/.test(value("page")) ? Number(value("page")) : 1,
  };
}
export function updateReportUrl(
  patch: Partial<Record<FilterKey, string | number>>,
  replace = false,
) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(patch)) {
    if (
      value === "" ||
      (key === "scope" && value === "all") ||
      (key === "page" && Number(value) === 1)
    )
      url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  const next = url.pathname + url.search + url.hash;
  if (next === window.location.pathname + window.location.search + window.location.hash) return;
  // Next's supported History API integration updates useSearchParams without a document/RSC refresh.
  window.history[replace ? "replaceState" : "pushState"](null, "", next);
}
export function reportReturnPath(value: string | null, staff = false) {
  const fallback = staff ? "/staff/requests" : "/reports";
  if (!value) return fallback;
  const path = value.split("?")[0];
  return ["/reports", "/staff/requests", "/staff/resolved", "/issues"].includes(path) &&
    !/[\r\n#]/.test(value)
    ? value
    : fallback;
}
