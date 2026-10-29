import type { QueryClient } from "@tanstack/react-query";
import type { Report, ReportPage } from "./campus-api";
const lists = ["reports", "recent-own", "staff-reports", "staff-resolved"];
export function updateReportCache(client: QueryClient, report: Report) {
  client.setQueriesData<Report>(
    {
      predicate: (query) =>
        query.queryKey[0] === "campus" &&
        query.queryKey[1] === "report" &&
        query.queryKey[2] === report.id,
    },
    (old) => (old ? { ...old, ...report } : old),
  );
  client.setQueriesData<ReportPage>(
    {
      predicate: (query) =>
        query.queryKey[0] === "campus" && lists.includes(String(query.queryKey[1])),
    },
    (old) =>
      old?.data
        ? {
            ...old,
            data: old.data.map((row) => (row.id === report.id ? { ...row, ...report } : row)),
          }
        : old,
  );
  void client.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === "campus" &&
      [...lists, "staff-overview", "staff-analytics", "notifications", "summary"].includes(
        String(query.queryKey[1]),
      ),
  });
}
