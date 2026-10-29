"use client";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { CheckCheck, ClipboardList } from "lucide-react";
import { NavigationLink as Link } from "@/components/navigation-link";
import { campus } from "@/lib/campus-api";
import { SettingsScreen } from "./settings";
import { ExploreScreen } from "./explore";
import { StaffProfile } from "./staff-profile";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  RecentReport,
  SectionHeader,
} from "./shared";
export function StaffScreen({
  view = "home",
}: {
  view?: "home" | "queue" | "resolved" | "settings";
}) {
  return view === "queue" ? (
    <ExploreScreen staff />
  ) : view === "resolved" ? (
    <ExploreScreen staff resolved />
  ) : view === "settings" ? (
    <SettingsScreen staff />
  ) : (
    <StaffOverview />
  );
}
function StaffOverview() {
  const t = useTranslations("app"),
    info = useQuery({ queryKey: ["campus", "staff-overview"], queryFn: campus.staffMe });
  return (
    <div className="account-page staff-account">
      <PageHeader title={t("staffAccount")} subtitle={t("staffAccountSubtitle")} />
      {info.isPending ? (
        <LoadingState />
      ) : info.isError ? (
        <ErrorState retry={info.refetch} />
      ) : (
        <>
          <StaffProfile staff={info.data} />
          <div className="staff-metrics">
            <Link href="/staff/resolved" className="surface staff-metric">
              <CheckCheck size={20} />
              <span>{t("resolvedByMe")}</span>
              <strong>{info.data.resolved}</strong>
              <small>{t("personalResolvedHint")}</small>
            </Link>
            <Link href="/staff/requests" className="surface staff-metric">
              <ClipboardList size={20} />
              <span>{t("openRequests")}</span>
              <strong>{info.data.open}</strong>
              <small>{t("campusOpenHint")}</small>
            </Link>
          </div>
          <section className="account-recent">
            <SectionHeader title={t("recentResolved")} href="/staff/resolved" />
            <p className="section-context">{t("recentResolvedHint")}</p>
            {info.data.recent.length ? (
              <div className="recent-list">
                {info.data.recent.map((report) => (
                  <RecentReport
                    key={report.id}
                    report={report}
                    href={`/staff/requests/${report.id}?from=%2Fstaff%2Fresolved`}
                    resolved
                  />
                ))}
              </div>
            ) : (
              <EmptyState message={t("resolvedEmptyTitle")} hint={t("resolvedEmptyHint")} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
