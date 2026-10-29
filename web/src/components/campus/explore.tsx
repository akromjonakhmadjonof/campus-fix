"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, LoaderCircle } from "lucide-react";
import { campus, categories, type Status } from "@/lib/campus-api";
import { EmptyState, ErrorState, IssueCard, LoadingState, PageHeader } from "./shared";
import {
  readReportFilters,
  updateReportUrl,
  filterKeys,
  type FilterKey,
} from "@/lib/report-filters";
import { usePathname } from "@/i18n/navigation";
import { Choice } from "./choice";
import { useTaxonomyLabel } from "./taxonomy-label";
export function ExploreScreen({
  activity,
  staff = false,
  resolved = false,
}: {
  activity?: "mine" | "confirmed";
  staff?: boolean;
  resolved?: boolean;
}) {
  const t = useTranslations("app"),
    label = useTaxonomyLabel(),
    params = useSearchParams();
  const groups = useQuery({ queryKey: ["campus", "groups"], queryFn: campus.groups });
  const locations = useQuery({
    queryKey: ["campus", "locations"],
    queryFn: campus.locations,
    staleTime: 3600000,
  });
  const pathname = usePathname();
  const defaultSort = staff && !resolved ? "confirmed" : "newest";
  const state = readReportFilters(params, defaultSort);
  const { group, type, scope, status, category, locationId, sort, page } = state;
  const [draft, setDraft] = useState<{ source: string; value: string } | null>(null);
  const q = draft?.source === state.q ? draft.value : state.q;
  const search = state.q;
  const emptyPersonalHistory =
    resolved &&
    page === 1 &&
    !search.trim() &&
    !category &&
    !group &&
    !type &&
    !locationId &&
    !status;
  const [filters, setFilters] = useState(
    !!(group || type || locationId || status || params.get("sort")),
  );
  useEffect(() => {
    if (q === state.q) return;
    const timer = setTimeout(() => {
      updateReportUrl({ q: q.trim(), page: 1 }, true);
      setDraft(null);
    }, 350);
    return () => clearTimeout(timer);
  }, [q, state.q]);
  useEffect(() => {
    const sync = () => setDraft(null);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const query = {
    page,
    ...(scope === "mine" ? { scope } : {}),
    sort,
    ...(search.trim() ? { q: search.trim() } : {}),
    ...(category ? { category } : {}),
    ...(group ? { group } : {}),
    ...(type ? { type } : {}),
    ...(locationId ? { locationId } : {}),
    ...(status ? { status } : {}),
    ...(activity ? { activity } : {}),
  };
  const reports = useQuery({
    queryKey: ["campus", staff ? "staff-reports" : "reports", resolved, query],
    queryFn: ({ signal }) =>
      staff ? campus.queue(query, resolved, signal) : campus.reports(query, signal),
    placeholderData: keepPreviousData,
  });
  const clear = () => {
    setDraft(null);
    updateReportUrl(
      Object.fromEntries(filterKeys.filter((key) => key !== "scope").map((key) => [key, ""])),
    );
  };
  const filter = (key: FilterKey) => (value: string) => updateReportUrl({ [key]: value, page: 1 });
  const returnTo = pathname + (params.size ? "?" + params.toString() : "");
  return (
    <div className="reports-page">
      <PageHeader
        title={
          activity
            ? t(activity === "mine" ? "myReports" : "confirmedIssues")
            : t(resolved ? "myWork" : staff ? "workQueue" : "exploreTitle")
        }
        subtitle={t(staff ? (resolved ? "myWorkSubtitle" : "queueSubtitle") : "exploreSubtitle")}
      />
      <div className="report-toolbar">
        <div className="search-box">
          <Search size={17} />
          <input
            aria-label={t("search")}
            placeholder={t("search")}
            value={q}
            maxLength={120}
            onChange={(e) => setDraft({ source: state.q, value: e.target.value })}
          />
        </div>
        <div className="feed-controls">
          {!staff && (
            <div className="scope-switch">
              {["all", "mine"].map((value) => (
                <button
                  key={value}
                  className={scope === value ? "active" : ""}
                  aria-pressed={scope === value}
                  onClick={() => filter("scope")(value)}
                >
                  {t(value === "mine" ? "myReports" : "all")}
                </button>
              ))}
            </div>
          )}
          <Choice
            label={t("category")}
            value={category}
            onValueChange={filter("category")}
            options={[
              { value: "", label: t("category") },
              ...categories.map((value) => ({ value, label: t(`categories.${value}`) })),
            ]}
          />
          <button
            className={`button secondary filters-toggle ${filters ? "selected" : ""}`}
            aria-label={t("filters")}
            aria-expanded={filters}
            onClick={() => setFilters(!filters)}
          >
            <SlidersHorizontal size={16} />
            <span>{t("filters")}</span>
          </button>
        </div>
      </div>
      {filters && (
        <div className="surface filters-panel">
          <label>
            {t("issueGroup")}
            <Choice
              label={t("issueGroup")}
              value={group}
              onValueChange={(value) => {
                updateReportUrl({ group: value, type: "", page: 1 });
              }}
              options={[
                { value: "", label: t("all") },
                ...(groups.data ?? []).map((g) => ({ value: g.id, label: label(g) })),
              ]}
            />
          </label>
          <label>
            {t("issueType")}
            <Choice
              label={t("issueType")}
              value={type}
              onValueChange={filter("type")}
              options={[
                { value: "", label: t("all") },
                ...(groups.data ?? [])
                  .filter((g) => !group || g.id === group)
                  .flatMap((g) => g.types)
                  .map((item) => ({ value: item.id, label: label(item) })),
              ]}
            />
          </label>
          <label>
            {t("location")}
            <Choice
              label={t("location")}
              value={locationId}
              onValueChange={filter("locationId")}
              options={[
                { value: "", label: t("allLocations") },
                ...(locations.data ?? []).map((l) => ({ value: l.id, label: l.path })),
              ]}
            />
          </label>
          <label>
            {t("allStatuses")}
            <Choice
              label={t("allStatuses")}
              value={status}
              onValueChange={filter("status")}
              options={[
                { value: "", label: t("allStatuses") },
                ...(
                  ["REPORTED", "ACCEPTED", "IN_PROGRESS", "RESOLVED", "REJECTED"] as Status[]
                ).map((value) => ({ value, label: t(`statuses.${value}`) })),
              ]}
            />
          </label>
          <label>
            {t("sort")}
            <Choice
              label={t("sort")}
              value={sort}
              onValueChange={filter("sort")}
              options={[
                { value: "oldest", label: t("oldest") },
                { value: "newest", label: t("newest") },
                { value: "confirmed", label: t("popular") },
                { value: "status", label: t("statusSort") },
              ]}
            />
          </label>
          <button className="text-button" onClick={clear}>
            {t("clearFilters")}
          </button>
        </div>
      )}
      {reports.isPending ? (
        <LoadingState />
      ) : reports.isError ? (
        <ErrorState retry={reports.refetch} />
      ) : (
        <>
          <div className="results-heading">
            <span>{t("results", { count: reports.data.total })}</span>
            {(reports.isFetching || q !== state.q) && (
              <span role="status" className="results-pending">
                <LoaderCircle size={14} />
                {t("updatingResults")}
              </span>
            )}
            {status && (
              <button className="text-button" onClick={() => filter("status")("")}>
                {t(`statuses.${status as Status}`)} ×
              </button>
            )}
          </div>
          {reports.data.data.length ? (
            <div className="issue-grid">
              {reports.data.data.map((report) => (
                <IssueCard
                  key={report.id}
                  report={report}
                  returnTo={returnTo}
                  resolved={resolved}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              message={t(emptyPersonalHistory ? "resolvedEmptyTitle" : "noResults")}
              hint={emptyPersonalHistory ? t("resolvedEmptyHint") : undefined}
              action={
                <button className="text-button" onClick={clear}>
                  {t("clearFilters")}
                </button>
              }
            />
          )}
          <div className="pagination">
            <button
              className="button secondary compact"
              disabled={page === 1 || reports.isPlaceholderData}
              onClick={() => updateReportUrl({ page: page - 1 })}
            >
              {t("previous")}
            </button>
            <span>{t("page", { page })}</span>
            <button
              className="button secondary compact"
              disabled={
                reports.isPlaceholderData || page * reports.data.limit >= reports.data.total
              }
              onClick={() => updateReportUrl({ page: page + 1 })}
            >
              {t("next")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
