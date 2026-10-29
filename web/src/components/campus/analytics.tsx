"use client";
import { useId, useState } from "react";
import { categoryColors } from "@/lib/chart-colors";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ChartNoAxesCombined,
  CheckCheck,
  Clock3,
  ClipboardList,
  Hourglass,
  LoaderCircle,
  ThumbsUp,
} from "lucide-react";
import { NavigationLink as Link } from "@/components/navigation-link";
import { analytics, type AnalyticsDays } from "@/lib/insights-api";
import { Choice } from "./choice";
import { useTaxonomyLabel } from "./taxonomy-label";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "./shared";

function ExternalLegend({
  host,
  items,
}: {
  host: HTMLDivElement | null;
  items: { key: string; color: string }[];
}) {
  if (!host) return null;
  return (
    <ChartLegend
      portal={host}
      wrapperStyle={{ width: "100%" }}
      content={() => (
        <ChartLegendContent
          className="analytics-legend"
          payload={items.map((item) => ({
            dataKey: item.key,
            value: item.key,
            color: item.color,
            type: "square" as const,
          }))}
        />
      )}
    />
  );
}
function LegendLabel({ name, value }: { name: string; value: string }) {
  return (
    <>
      <span className="chart-legend-label">{name}</span>
      <strong className="chart-legend-value">{value}</strong>
    </>
  );
}
function RankChart({
  title,
  description,
  rows,
  colors,
}: {
  title: string;
  description: string;
  rows: { id: string; name: string; count: number }[];
  colors: Record<string, string>;
}) {
  const t = useTranslations("app"),
    format = useFormatter(),
    rtl = useLocale() === "ar";
  const legendId = useId();
  const [legendHost, setLegendHost] = useState<HTMLDivElement | null>(null);
  const bars = rows.map((row, index) => ({
    ...row,
    key: `category${index}`,
    fill: colors[row.id],
  }));
  const config = Object.fromEntries(
    bars.map((row) => [
      row.key,
      {
        label: <LegendLabel name={row.name} value={format.number(row.count)} />,
        color: row.fill,
      },
    ]),
  );
  return (
    <section className="surface analytics-chart">
      <h2>{title}</h2>
      <p className="analytics-caption">{description}</p>
      {rows.length ? (
        <>
          <ChartContainer
            config={config}
            className="rank-chart"
            aria-label={title}
            aria-describedby={legendId}
            role="img"
          >
            <BarChart
              accessibilityLayer
              data={bars}
              layout="vertical"
              margin={{ left: 6, right: 8 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                reversed={rtl}
                tickFormatter={(value) => format.number(value)}
              />
              <YAxis dataKey="key" type="category" hide />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, _name, item) => (
                      <>
                        <span>{item.payload.name}</span>
                        <strong>{format.number(Number(value))}</strong>
                      </>
                    )}
                  />
                }
              />
              <Bar dataKey="count" radius={4} isAnimationActive={false} maxBarSize={24} />
              <ExternalLegend
                host={legendHost}
                items={bars.map((row) => ({ key: row.key, color: row.fill }))}
              />
            </BarChart>
          </ChartContainer>
          <div
            id={legendId}
            ref={setLegendHost}
            className="chart-legend-host"
            role="group"
            aria-label={title}
          />
          <details className="chart-data">
            <summary>{t("viewChartData")}</summary>
            <table>
              <thead>
                <tr>
                  <th>{title}</th>
                  <th>{t("reportsCountLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{format.number(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <div className="chart-empty">{t("analyticsEmpty")}</div>
      )}
    </section>
  );
}
export function AnalyticsScreen() {
  const t = useTranslations("app"),
    format = useFormatter(),
    locale = useLocale(),
    label = useTaxonomyLabel();
  const trendLegendId = useId();
  const [trendLegendHost, setTrendLegendHost] = useState<HTMLDivElement | null>(null);
  const params = useSearchParams(),
    now = useNow({ updateInterval: 60000 });
  const requested = Number(params.get("days") ?? 30);
  const days = ([7, 30, 90].includes(requested) ? requested : 30) as AnalyticsDays;
  const query = useQuery({
    queryKey: ["campus", "staff-analytics", days],
    queryFn: ({ signal }) => analytics(days, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const duration = (ms: number | null) => {
    if (ms === null) return t("durationUnavailable");
    const minutes = Math.floor(ms / 60000),
      hours = Math.floor(minutes / 60),
      day = Math.floor(hours / 24);
    const unit = (value: number, name: "day" | "hour" | "minute") =>
      format.number(value, { style: "unit", unit: name, unitDisplay: "short" });
    if (day)
      return [unit(day, "day"), hours % 24 ? unit(hours % 24, "hour") : ""]
        .filter(Boolean)
        .join(" ");
    if (hours)
      return [unit(hours, "hour"), minutes % 60 ? unit(minutes % 60, "minute") : ""]
        .filter(Boolean)
        .join(" ");
    return minutes ? unit(minutes, "minute") : t("lessThanMinute");
  };
  const dateLabel = (value: string) =>
    format.dateTime(new Date(value + "T12:00:00Z"), { month: "short", day: "numeric" });
  const data = query.data;
  const locationColors = categoryColors([
    ...(data?.locations ?? []).map((row) => row.id),
    ...(data?.hotspots ?? []).map((row) => row.id),
  ]);
  const issueColors = categoryColors((data?.issues ?? []).map((row) => row.id));
  const metrics = data
    ? ([
        {
          key: "currentOpen",
          value: format.number(data.currentOpen),
          hint: t("currentSnapshot"),
          Icon: ClipboardList,
        },
        {
          key: "reportsReceived",
          value: format.number(data.totalReports),
          hint: t("selectedPeriod"),
          Icon: ChartNoAxesCombined,
        },
        {
          key: "resolvedRequests",
          value: format.number(data.resolved),
          hint: t("uniqueResolutions"),
          Icon: CheckCheck,
        },
        {
          key: "averageResolution",
          value: duration(data.averageResolutionMs),
          hint: t("resolutionDurationHint", { count: data.resolutionSamples }),
          Icon: Clock3,
        },
        {
          key: "averageWaiting",
          value: duration(data.averageWaitingMs),
          hint: t("waitingDurationHint", { count: data.waitingSamples }),
          Icon: Hourglass,
        },
        {
          key: "totalUpvotes",
          value: format.number(data.totalUpvotes),
          hint: t("upvoteEventsHint"),
          Icon: ThumbsUp,
        },
      ] as const)
    : [];
  return (
    <div className="analytics-page">
      <PageHeader title={t("dashboard")} subtitle={t("dashboardSubtitle")} />
      <div className="analytics-toolbar">
        <Choice
          label={t("reportingPeriod")}
          value={String(days)}
          onValueChange={(value) => {
            const url = new URL(window.location.href);
            url.searchParams.set("days", value);
            window.history.pushState(null, "", url.pathname + url.search);
          }}
          options={[7, 30, 90].map((value) => ({
            value: String(value),
            label: t("lastDays", { count: value }),
          }))}
        />
        {query.isFetching && !query.isPending && (
          <span className="results-pending" role="status">
            <LoaderCircle size={15} />
            {t("updatingResults")}
          </span>
        )}
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState retry={query.refetch} />
      ) : (
        data && (
          <>
            <p className="analytics-period">
              {t("analyticsDateRange", {
                start: format.dateTime(new Date(data.period.start), { dateStyle: "medium" }),
                end: format.dateTime(new Date(data.period.end), {
                  dateStyle: "medium",
                }),
              })}
            </p>
            <div className="analytics-metrics">
              {metrics.map(({ key, value, hint, Icon }) => (
                <section key={key} className="surface analytics-metric" data-metric={key}>
                  <Icon size={19} />
                  <h2>{t(key)}</h2>
                  <strong>{value}</strong>
                  <p>{hint}</p>
                </section>
              ))}
            </div>
            <section className="surface analytics-chart trend-card">
              <h2>{t("reportsVsResolutions")}</h2>
              <p className="analytics-caption">{t("trendHint")}</p>
              {!data.totalReports && !data.resolved && (
                <p className="analytics-no-data">{t("analyticsEmpty")}</p>
              )}
              <ChartContainer
                config={{
                  reports: {
                    label: (
                      <LegendLabel
                        name={t("reportsCreated")}
                        value={format.number(data.totalReports)}
                      />
                    ),
                    color: "var(--chart-1)",
                  },
                  resolutions: {
                    label: (
                      <LegendLabel
                        name={t("reportsResolved")}
                        value={format.number(data.resolved)}
                      />
                    ),
                    color: "var(--chart-2)",
                  },
                }}
                className="trend-chart"
                role="img"
                aria-label={t("reportsVsResolutions")}
                aria-describedby={trendLegendId}
              >
                <LineChart accessibilityLayer data={data.trends} margin={{ left: 0, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                    tickFormatter={dateLabel}
                    reversed={locale === "ar"}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    tickFormatter={(value) => format.number(value)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => dateLabel(String(value))}
                        formatter={(value, name) => (
                          <span>
                            {name === "reports" ? t("reportsCreated") : t("reportsResolved")}:{" "}
                            {format.number(Number(value))}
                          </span>
                        )}
                      />
                    }
                  />
                  <ExternalLegend
                    host={trendLegendHost}
                    items={[
                      { key: "reports", color: "var(--chart-1)" },
                      { key: "resolutions", color: "var(--chart-2)" },
                    ]}
                  />
                  <Line
                    type="linear"
                    dataKey="reports"
                    stroke="var(--color-reports)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="linear"
                    dataKey="resolutions"
                    stroke="var(--color-resolutions)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
              <div
                id={trendLegendId}
                ref={setTrendLegendHost}
                className="chart-legend-host trend-legend-host"
                role="group"
                aria-label={t("reportsVsResolutions")}
              />
              <details className="chart-data">
                <summary>{t("viewChartData")}</summary>
                <table>
                  <thead>
                    <tr>
                      <th>{t("date")}</th>
                      <th>{t("reportsCreated")}</th>
                      <th>{t("reportsResolved")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trends.map((day) => (
                      <tr key={day.date}>
                        <td>{dateLabel(day.date)}</td>
                        <td>{format.number(day.reports)}</td>
                        <td>{format.number(day.resolutions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
            <div className="analytics-chart-pair">
              <RankChart
                title={t("mostReportedLocations")}
                description={t("locationRollupHint")}
                rows={data.locations}
                colors={locationColors}
              />
              <RankChart
                title={t("commonIssues")}
                description={t("selectedPeriod")}
                rows={data.issues.map((issue) => ({ ...issue, name: label(issue) }))}
                colors={issueColors}
              />
            </div>
            <section className="analytics-hotspots">
              <div className="section-heading">
                <h2>{t("problemHotspots")}</h2>
              </div>
              <p className="analytics-caption">{t("hotspotHint")}</p>
              {data.hotspots.length ? (
                <div className="hotspot-grid">
                  {data.hotspots.map((spot, index) => (
                    <article className="surface hotspot-card" key={spot.id}>
                      <span className="hotspot-rank">{format.number(index + 1)}</span>
                      <div>
                        <h3 className="hotspot-label">
                          <span
                            className="chart-category-dot"
                            style={{ backgroundColor: locationColors[spot.id] }}
                            aria-hidden="true"
                          />
                          {spot.name}
                        </h3>
                        <strong>{t("results", { count: spot.count })}</strong>
                        <p>
                          {t("leadingIssue", {
                            issue: label(spot.leadingGroup),
                            count: spot.leadingGroup.count,
                          })}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="surface chart-empty">{t("analyticsEmpty")}</div>
              )}
            </section>
            <section className="analytics-attention">
              <div className="section-heading">
                <h2>{t("needsAttention")}</h2>
              </div>
              <p className="analytics-caption">{t("attentionHint")}</p>
              {data.attention.length ? (
                <div className="attention-grid">
                  {data.attention.map((report) => (
                    <Link
                      key={report.id}
                      href={`/staff/requests/${report.id}?from=${encodeURIComponent("/staff/dashboard?days=" + days)}`}
                      className="surface attention-card"
                    >
                      <div>
                        <StatusBadge status={report.status} />
                        <h3>{report.title}</h3>
                        <p>{report.location}</p>
                      </div>
                      <div className="attention-meta">
                        <time dateTime={report.createdAt}>
                          {format.relativeTime(new Date(report.createdAt), now)}
                        </time>
                        <span>
                          <ThumbsUp size={14} />
                          {format.number(report.confirmationCount)}
                        </span>
                      </div>
                      <ul>
                        {report.reasons.map((reason) => (
                          <li key={reason}>
                            {t(`attentionReasons.${reason}`, { count: report.confirmationCount })}
                          </li>
                        ))}
                      </ul>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState message={t("noAttention")} hint={t("noAttentionHint")} />
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
